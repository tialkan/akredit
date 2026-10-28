// Kuruma göre yapay zekâ sağlayıcısı kuran tek fabrika (İP-35).
//
// Sıra: (1) kurumun kayıtlı OpenRouter anahtarı varsa OpenRouter bağdaştırıcısı; (2) yoksa kurum içi
// model ayarı (sunucu açılışında verilen yerel sağlayıcı) varsa o; (3) hiçbiri yoksa YZ gerektiren iş
// "Yapay zekâ anahtarı tanımlı değil" diye durur ve kurum yöneticilerine bildirim düşer (hocaya değil).
//
// Güvenceler:
// - Anahtar iş yüküne (job payload) girmez. İşçi yalnız kurum kimliğini taşır; anahtar iş anında, bu
//   işlevin içinde kasadan çözülür ve yalnız bağdaştırıcının kapanışında yaşar.
// - Anahtar hiçbir hata iletisine ve günlüğe girmez: sağlayıcı hataları `anahtarsizHata` ile ayıklanır.
// - Yurt dışı izni ve maskeleme politikası korunur: dönen sağlayıcı her zaman `politikaUygula`dan geçer.

import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import {
  type FetchIslevi,
  type KurumYzAyari,
  type MaskeSecenegi,
  openaiUyumlu,
  ortamdanAnahtarKasasi,
  politikaUygula,
  type Saglayici,
  type SaglayiciAnahtarKasasi,
  YzHatasi,
} from "@akredit/yz";
import { and, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";

export const ANAHTAR_YOK_ILETISI =
  "Yapay zekâ anahtarı tanımlı değil. Kurum yöneticisi Ayarlar sayfasından OpenRouter anahtarını girmeli.";
export const ANAHTAR_YOK_BILDIRIMI = "yz.anahtar_tanimli_degil";

/** YZ gerektiren iş, kurumda anahtar ya da kurum içi model yoksa bu hatayla durur. */
export class YzAnahtariYokHatasi extends Error {
  readonly kod = "yz_anahtari_yok";
  constructor() {
    super(ANAHTAR_YOK_ILETISI);
    this.name = "YzAnahtariYokHatasi";
  }
}

const Ayar = z
  .object({
    yz: z
      .object({
        yurtDisiIzin: z.boolean().optional(),
        adlar: z.array(z.string()).optional(),
        ogrenciNoDesenleri: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
    yzAnahtar: z
      .object({ saglayici: z.literal("openrouter"), sifreli: z.string(), model: z.string() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export interface FabrikaSecenegi {
  /** Anahtar kasası. Verilmezse ortamdan (`AKREDIT_ANAHTAR_KASASI`) kurulur. */
  kasa?: SaglayiciAnahtarKasasi | null;
  /** Kurum içi kurulumun yerel model sağlayıcısı (ör. `infra/kurum-ici/yz-ayari.ts`). */
  kurumIci?: Saglayici | null;
  fetch?: FetchIslevi;
  /** Ek maskeleme (ör. işteki kişinin adı). */
  ekMaske?: MaskeSecenegi;
  simdi?: () => Date;
  /** false ise anahtar yokken bildirim yazılmaz (yalnız durum sorgusu). */
  bildir?: boolean;
}

export interface KurumSaglayicisi {
  saglayici: Saglayici;
  ayar: KurumYzAyari;
  kaynak: "kurum_anahtari" | "kurum_ici";
}

/** Bir metinden anahtarı ve anahtar biçimindeki her diziyi ayıklar. */
export function anahtariAyikla(metin: string, anahtar?: string): string {
  let m = metin;
  if (anahtar && anahtar.length >= 6) m = m.split(anahtar).join("[gizli]");
  return m.replace(/sk-or-[A-Za-z0-9_-]+/gu, "[gizli]").replace(/Bearer\s+\S+/giu, "Bearer [gizli]");
}

/** Sağlayıcıyı sarar: atılan hiçbir hata iletisinde anahtar yer almaz. */
function anahtarsizHata(s: Saglayici, anahtar: string): Saglayici {
  const temizle = (e: unknown): never => {
    if (e instanceof YzHatasi) throw new YzHatasi(e.tur, anahtariAyikla(e.message, anahtar));
    if (e instanceof Error) throw new YzHatasi("ag", anahtariAyikla(e.message, anahtar));
    throw new YzHatasi("ag", "Yapay zekâ hizmetine ulaşılamadı.");
  };
  const sarili: Saglayici = {
    ad: s.ad,
    model: s.model,
    yurtIci: s.yurtIci,
    sohbet: (i) => s.sohbet(i).catch(temizle),
  };
  if (s.gomme) {
    const g = s.gomme.bind(s);
    sarili.gomme = (m) => g(m).catch(temizle);
  }
  if (s.yapilandirilmisCikti !== undefined) sarili.yapilandirilmisCikti = s.yapilandirilmisCikti;
  return sarili;
}

/** Kurumun YZ ayarını (izin, maske) okur; eksik ya da bozuk ayar en güvenli değere (izin yok) düşer. */
export function yzAyariniCoz(ham: unknown, ek?: MaskeSecenegi): KurumYzAyari {
  const a = Ayar.safeParse(ham ?? {});
  const yz = a.success ? a.data.yz : undefined;
  const maske: MaskeSecenegi = { ...(ek ?? {}) };
  const adlar = [...(yz?.adlar ?? []), ...(ek?.adlar ?? [])];
  if (adlar.length) maske.adlar = adlar;
  if (yz?.ogrenciNoDesenleri)
    maske.ogrenciNoDesenleri = [
      ...(ek?.ogrenciNoDesenleri ?? []),
      ...yz.ogrenciNoDesenleri.map((d) => new RegExp(d, "gu")),
    ];
  return { yurtDisiIzin: yz?.yurtDisiIzin === true, maske };
}

/**
 * Kurum için sağlayıcıyı kurar. Anahtar da kurum içi model de yoksa `YzAnahtariYokHatasi` atar ve
 * (bildir !== false ise) kurum yöneticilerine bildirim yazar. Yurt dışı izni yoksa `YzHatasi("politika")`.
 */
export async function kurumSaglayicisi(db: Vt, kurumId: string, s: FabrikaSecenegi = {}): Promise<KurumSaglayicisi> {
  const ham = await kiraciIslemi(db, kurumId, async (tx) => {
    const [k] = await tx.select({ ayarlar: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
    return k?.ayarlar ?? {};
  });
  const a = Ayar.safeParse(ham);
  const ayar = yzAyariniCoz(ham, s.ekMaske);
  const kayit = a.success ? a.data.yzAnahtar : undefined;
  const kasa = s.kasa === undefined ? ortamdanAnahtarKasasi(process.env) : s.kasa;

  if (kayit && kasa) {
    const anahtar = kasa.coz(kayit.sifreli, kurumId);
    const ham = openaiUyumlu({
      hazir: "openrouter",
      anahtar,
      model: kayit.model,
      ...(s.fetch ? { fetch: s.fetch } : {}),
    });
    return { saglayici: politikaUygula(anahtarsizHata(ham, anahtar), ayar), ayar, kaynak: "kurum_anahtari" };
  }
  if (s.kurumIci) return { saglayici: politikaUygula(s.kurumIci, ayar), ayar, kaynak: "kurum_ici" };

  if (s.bildir !== false) await anahtarYokBildir(db, kurumId, s.simdi?.() ?? new Date());
  throw new YzAnahtariYokHatasi();
}

/**
 * Kurum yöneticilerine (kurum kapsamında, süresi geçmemiş `kurum_yoneticisi` rolü) "anahtar tanımlı değil"
 * bildirimi yazar. Son 24 saatte okunmamış aynı bildirim varsa yenisini eklemez. Hocaya bildirim gitmez.
 */
export async function anahtarYokBildir(db: Vt, kurumId: string, simdi: Date): Promise<number> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const yoneticiler = await tx
      .select({ kisiId: sema.rolAtamasi.kisiId })
      .from(sema.rolAtamasi)
      .where(
        and(
          eq(sema.rolAtamasi.rol, "kurum_yoneticisi"),
          eq(sema.rolAtamasi.kapsamTuru, "kurum"),
          or(isNull(sema.rolAtamasi.bitis), gte(sema.rolAtamasi.bitis, simdi)),
        ),
      );
    const kisiler = [...new Set(yoneticiler.map((y) => y.kisiId))];
    const esik = new Date(simdi.getTime() - 24 * 3600_000);
    let eklenen = 0;
    for (const kisiId of kisiler) {
      const var_ = await tx
        .select({ id: sema.bildirim.id })
        .from(sema.bildirim)
        .where(
          and(
            eq(sema.bildirim.kisiId, kisiId),
            eq(sema.bildirim.tur, ANAHTAR_YOK_BILDIRIMI),
            isNull(sema.bildirim.okundu),
            gte(sema.bildirim.olusturma, esik),
          ),
        );
      if (var_.length) continue;
      await tx.insert(sema.bildirim).values({
        kurumId,
        kisiId,
        tur: ANAHTAR_YOK_BILDIRIMI,
        icerik: { ileti: ANAHTAR_YOK_ILETISI, baglanti: "/panel/ayarlar" },
      });
      eklenen++;
    }
    return eklenen;
  });
}
