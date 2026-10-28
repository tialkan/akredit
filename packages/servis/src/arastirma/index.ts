// Araştırma servisi (İP-37): kurum sitesi taraması → kanıt; kanıt avcısı → kurum içi `kanit_etiketi` önerisi ve
// başka kurumdan örnek (`dis_ornek`).
//
// Kesin kurallar:
// - Kurum içi aday bir öneridir; kanıt-ölçüt bağlantısı ancak insan onayıyla kurulur.
// - Başka kurumdan örnek KANIT DEĞİLDİR. Kanıt tablosuna girmez, kanıta atıf taşımaz, kanıt-ölçüt bağlantısının
//   dayanağı olamaz (0011 göçü tetikleyicileri) ve rapora kanıt olarak giremez (`raporKanitiDenetle`).
// - Web araması yalnız kurumun yurt dışı YZ izni ve web araması ayarı açıkken yapılır; sonuç sayısı kurum
//   tavanıyla sınırlıdır. Model çağrıları veritabanı işleminin dışındadır.

import { ILK_CERCEVELER, type Olcut } from "@akredit/cerceveler";
import { type Islem, type SorguSonucu, satirlar, sema } from "@akredit/vt";
import {
  type DisOrnek,
  disOrnekBul,
  type FetchIslevi,
  type KanitAdayi,
  type KurumIciEslesme,
  kuralIleAdayBul,
  kurumIciAdayBul,
  kurumSonucTavani,
  type OlcutBilgisi,
  openrouterWebArayici,
  ortamdanAnahtarKasasi,
  politikaUygula,
  type Saglayici,
  type SaglayiciAnahtarKasasi,
  type WebArayici,
  webAramaMaliyeti,
  webAramaPolitikasi,
  YzHatasi,
} from "@akredit/yz";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, type Hedef, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { kurumSaglayicisi, YzAnahtariYokHatasi } from "../yz-fabrika.ts";

// ---------- Dış bağlantılar ----------

export interface ArastirmaDeposu {
  koy(kurumId: string, veri: Uint8Array, secenek?: { mime?: string }): Promise<{ ozet: string; anahtar: string }>;
}

/** Tarayıcı çıktısının bu servisin kullandığı kısmı (`@akredit/baglayicilar` `TaranmisBelge`). */
export interface TaranmisBelgeGirdisi {
  veri: Uint8Array;
  dosyaAdi: string;
  mime?: string;
  adres: string;
  erisim: string;
  ozet: string;
  kaynakAyrinti: Record<string, unknown>;
}

export interface ArastirmaKoprusu {
  /** Kurum sitesi tarayıcısı (`siteTara(gercekBaglam(), ayar)`). */
  tara:
    | ((ayar: { baslangic: string; alanAdi: string; derinlik: number; enCokSayfa: number }) => Promise<{
        belgeler: TaranmisBelgeGirdisi[];
        atlanan: { adres: string; neden: string }[];
      }>)
    | null;
  /** Belgeden metin (`@akredit/belge` metinCikar + parcala). */
  metin: ((veri: Uint8Array, ad: string) => Promise<{ capa: Record<string, unknown>; metin: string }[]>) | null;
  depo: ArastirmaDeposu | null;
  /** Sabit sağlayıcı (testte); yoksa kurumun anahtarıyla kurulur. */
  saglayici: Saglayici | null;
  /** Sabit web arayıcısı (testte); yoksa kurumun OpenRouter anahtarıyla kurulur. */
  arayici: WebArayici | null;
  kasa?: SaglayiciAnahtarKasasi | null;
  fetch?: FetchIslevi;
}

const kuresel = globalThis as unknown as { __akreditArastirmaKoprusu?: ArastirmaKoprusu };

export function arastirmaKoprusu(): ArastirmaKoprusu {
  return kuresel.__akreditArastirmaKoprusu ?? { tara: null, metin: null, depo: null, saglayici: null, arayici: null };
}

export function arastirmaKoprusuAyarla(k: Partial<ArastirmaKoprusu>): void {
  kuresel.__akreditArastirmaKoprusu = { ...arastirmaKoprusu(), ...k };
}

// ---------- Şemalar ----------

const Kimlik = z.string().uuid("Geçersiz kimlik.");

export const KanitAramaGirdisi = z
  .object({
    olcutId: Kimlik,
    /** Ders sayfasından çağrıldıysa: öneriler ve dış örnekler bu dersin onay kutusuna düşer. */
    dersId: Kimlik.optional(),
    /** Başka kurumların örneklerini de ara (kurum ayarı açıksa). */
    webArama: z.boolean().optional(),
  })
  .strict();

export const SiteTaramaGirdisi = z
  .object({
    /** Verilmezse kurumun alan adının ana sayfası. */
    baslangic: z.string().url("Adres geçersiz.").max(2000).optional(),
    derinlik: z.number().int().min(0).max(4).optional(),
    enCokSayfa: z.number().int().min(1).max(500).optional(),
  })
  .strict();

export const KanitAramaSonucu = z.object({
  olcut: z.object({ id: z.string(), kod: z.string(), baslik: z.string() }),
  kurumIci: z.array(
    z.object({
      oneriId: z.string(),
      kanitId: z.string(),
      dosyaAdi: z.string(),
      adres: z.string().nullable(),
      alinti: z.string(),
      guven: z.number(),
      yontem: z.enum(["yz", "kural"]),
    }),
  ),
  disOrnekler: z.array(
    z.object({ oneriId: z.string(), adres: z.string(), baslik: z.string(), alinti: z.string(), erisim: z.string() }),
  ),
  webArama: z.object({
    yapildi: z.boolean(),
    neden: z.string().nullable(),
    sonucTavani: z.number().nullable(),
    tahminiMaliyetUsd: z.number().nullable(),
  }),
  /** Model yoksa kural eşlemesi kullanıldı mı? */
  yontem: z.enum(["yz", "kural"]),
});
export type KanitAramaSonucu = z.infer<typeof KanitAramaSonucu>;

export const SiteTaramaSonucu = z.object({
  bulunan: z.number(),
  yeniKanit: z.number(),
  zatenVardi: z.number(),
  atlanan: z.array(z.object({ adres: z.string(), neden: z.string() })),
});
export type SiteTaramaSonucu = z.infer<typeof SiteTaramaSonucu>;

export const DisOrnekGorunumu = z.object({
  oneriId: z.string(),
  olcutKod: z.string(),
  adres: z.string(),
  baslik: z.string(),
  alinti: z.string(),
  erisim: z.string(),
});
export type DisOrnekGorunumu = z.infer<typeof DisOrnekGorunumu>;

// ---------- Kurum ayarı ----------

const KurumAyari = z
  .object({
    yz: z
      .object({
        yurtDisiIzin: z.boolean().optional(),
        webArama: z
          .object({ acik: z.boolean().optional(), enCokSonuc: z.number().int().min(1).max(10).optional() })
          .optional(),
      })
      .passthrough()
      .optional(),
    yzAnahtar: z.object({ saglayici: z.literal("openrouter"), sifreli: z.string(), model: z.string() }).optional(),
  })
  .passthrough();

function ayarOku(ham: unknown) {
  const a = KurumAyari.safeParse(ham ?? {});
  return a.success ? a.data : {};
}

// ---------- Yardımcılar ----------

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

function olcutAgaci(kod: string): Olcut | null {
  const ara = (liste: readonly Olcut[]): Olcut | null => {
    for (const o of liste) {
      if (o.kod === kod) return o;
      const a = ara(o.altOlcutler);
      if (a) return a;
    }
    return null;
  };
  for (const c of ILK_CERCEVELER) {
    const o = ara(c.olcutler);
    if (o) return o;
  }
  return null;
}

/** Ölçütün kanıt gereksinimleri: çerçeve kütüphanesinden (kod eşleşirse), yoksa boş. */
export function gereksinimler(kod: string): string[] {
  return olcutAgaci(kod)?.kanitGereksinimleri.map((g) => g.aciklama) ?? [];
}

/** Tam metin sorgusu için ölçüt kelimeleri (yalnız harf; en az 4 harf; en çok 12). */
export function aramaKelimeleri(o: OlcutBilgisi): string[] {
  const k = [o.baslik, ...o.gereksinimler]
    .join(" ")
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}]+/u)
    .filter((x) => x.length >= 4 && !["için", "ilgili", "yönelik", "olarak"].includes(x));
  return [...new Set(k)].slice(0, 12);
}

interface AdaySatiri {
  kanit_id: string;
  ozet: string;
  dosya_adi: string;
  kaynak_ayrinti: Record<string, unknown> | null;
  capa: Record<string, unknown>;
  metin: string;
  puan: number;
}

/** Kanıt havuzunda tam metin arama (Türkçe kök bulucu, İP-36 dizini). Bologna iç kayıtları hariç. */
async function havuzAra(tx: Islem, kelimeler: string[], enCokKanit = 12): Promise<KanitAdayi[]> {
  if (!kelimeler.length) return [];
  const sorgu = kelimeler.join(" | ");
  const r = satirlar(
    (await tx.execute(sql`
      select p.kanit_id, k.ozet, k.dosya_adi, k.kaynak_ayrinti, p.capa, p.metin,
             ts_rank(to_tsvector('turkish', p.metin), to_tsquery('turkish', ${sorgu})) as puan
      from kanit_parcasi p join kanit k on k.id = p.kanit_id
      where to_tsvector('turkish', p.metin) @@ to_tsquery('turkish', ${sorgu})
        and coalesce(k.kaynak_ayrinti ->> 'tur', '') not in ('bologna', 'bologna_beyani')
      order by puan desc, p.kanit_id, p.sira
      limit 80`)) as unknown as SorguSonucu<AdaySatiri>,
  );
  const harita = new Map<string, KanitAdayi>();
  for (const s of r) {
    let a = harita.get(s.kanit_id);
    if (!a) {
      if (harita.size >= enCokKanit) continue;
      const adres = typeof s.kaynak_ayrinti?.adres === "string" ? s.kaynak_ayrinti.adres : null;
      a = { kanitId: s.kanit_id, dosyaAdi: s.dosya_adi, adres, kaynak: { ozet: s.ozet, parcalar: [] } };
      harita.set(s.kanit_id, a);
    }
    if (a.kaynak.parcalar.length < 3) a.kaynak.parcalar.push({ capa: s.capa, metin: s.metin.slice(0, 2000) });
  }
  return [...harita.values()];
}

async function olcutYukle(tx: Islem, olcutId: string) {
  const [o] = await tx.select().from(sema.olcut).where(eq(sema.olcut.id, olcutId));
  if (!o) throw bulunamadi();
  return o;
}

/** Aynı kanıt ve ölçüt için zaten açılmış kanıt etiketi önerisi var mı? */
async function oneriVarMi(tx: Islem, kanitId: string, olcutKod: string): Promise<boolean> {
  const r = await tx
    .select({ id: sema.oneri.id })
    .from(sema.oneri)
    .where(
      and(
        eq(sema.oneri.tur, "kanit_etiketi"),
        eq(sema.oneri.hedefTuru, "kanit"),
        eq(sema.oneri.hedefId, kanitId),
        sql`${sema.oneri.icerik} -> 'olcutOnerileri' @> ${JSON.stringify([{ olcutKod }])}::jsonb`,
      ),
    );
  return r.length > 0;
}

async function disOrnekVarMi(tx: Islem, adres: string, olcutKod: string, hedef: Hedef): Promise<boolean> {
  const r = await tx
    .select({ id: sema.oneri.id })
    .from(sema.oneri)
    .where(
      and(
        sql`${sema.oneri.tur}::text = 'dis_ornek'`,
        eq(sema.oneri.hedefTuru, hedef.tur),
        eq(sema.oneri.hedefId, hedef.id),
        sql`${sema.oneri.icerik} ->> 'adres' = ${adres}`,
        sql`${sema.oneri.icerik} ->> 'olcutKod' = ${olcutKod}`,
      ),
    );
  return r.length > 0;
}

async function saglayiciCoz(b: ServisBaglami): Promise<Saglayici | null> {
  const k = arastirmaKoprusu();
  try {
    if (k.saglayici) {
      const ayar = await kurumAyari(b);
      return politikaUygula(k.saglayici, { yurtDisiIzin: ayar.yz?.yurtDisiIzin === true });
    }
    return (await kurumSaglayicisi(b.db, b.aktor.kurumId, { simdi: b.simdi, bildir: false })).saglayici;
  } catch (e) {
    // Anahtar yoksa ya da kurum yurt dışına izin vermiyorsa model kullanılmaz; kural eşlemesi çalışır.
    if (e instanceof YzAnahtariYokHatasi || e instanceof YzHatasi) return null;
    throw e;
  }
}

async function kurumAyari(b: ServisBaglami) {
  return islem(b, async (tx) => {
    const [k] = await tx.select({ ayarlar: sema.kurum.ayarlar, alanAdi: sema.kurum.alanAdi }).from(sema.kurum);
    return { ...ayarOku(k?.ayarlar), alanAdi: k?.alanAdi ?? null };
  });
}

/** Kurumun OpenRouter anahtarıyla web arayıcısı; anahtar yoksa null. Politika ayrıca uygulanır. */
async function arayiciCoz(b: ServisBaglami, ayar: Awaited<ReturnType<typeof kurumAyari>>): Promise<WebArayici | null> {
  const k = arastirmaKoprusu();
  if (k.arayici) return k.arayici;
  const kasa = k.kasa === undefined ? ortamdanAnahtarKasasi(process.env) : k.kasa;
  if (!ayar.yzAnahtar || !kasa) return null;
  return openrouterWebArayici({
    anahtar: kasa.coz(ayar.yzAnahtar.sifreli, b.aktor.kurumId),
    model: ayar.yzAnahtar.model,
    ...(k.fetch ? { fetch: k.fetch } : {}),
    simdi: b.simdi,
  });
}

// ---------- Kanıt avcısı ----------

/**
 * Ölçütün kanıt gereksinimine göre kurum içi kanıt adaylarını (`kanit_etiketi`, onay bekler) ve istenirse başka
 * kurumların örneklerini (`dis_ornek`, kanıt değildir) bulur.
 */
export async function kanitAra(b: ServisBaglami, girdi: unknown): Promise<KanitAramaSonucu> {
  const g = KanitAramaGirdisi.parse(girdi);
  const hedef: Hedef = g.dersId ? { tur: "ders", id: g.dersId } : { tur: "kurum", id: b.aktor.kurumId };

  // Aşama 1: bağlam ve adaylar (işlem içinde).
  const bag = await islem(b, async (tx, gerekli) => {
    await gerekli("kanit.oku", hedef);
    if (g.dersId) {
      const [d] = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.id, g.dersId));
      if (!d) throw bulunamadi();
    }
    const o = await olcutYukle(tx, g.olcutId);
    const olcut: OlcutBilgisi = { kod: o.kod, baslik: o.baslik, gereksinimler: gereksinimler(o.kod) };
    const adaylar = await havuzAra(tx, aramaKelimeleri(olcut));
    return { o, olcut, adaylar };
  });
  const ayar = await kurumAyari(b);

  // Aşama 2: model ya da kural (işlem dışında).
  const saglayici = await saglayiciCoz(b);
  let eslesmeler: KurumIciEslesme[];
  let yontem: "yz" | "kural" = "kural";
  if (saglayici && bag.adaylar.length) {
    try {
      eslesmeler = (await kurumIciAdayBul({ olcut: bag.olcut, adaylar: bag.adaylar }, saglayici)).eslesmeler;
      yontem = "yz";
    } catch {
      eslesmeler = kuralIleAdayBul({ olcut: bag.olcut, adaylar: bag.adaylar });
    }
  } else eslesmeler = kuralIleAdayBul({ olcut: bag.olcut, adaylar: bag.adaylar });

  let disOrnekler: DisOrnek[] = [];
  const web: KanitAramaSonucu["webArama"] = {
    yapildi: false,
    neden: null,
    sonucTavani: null,
    tahminiMaliyetUsd: null,
  };
  if (g.webArama) {
    try {
      const ham = await arayiciCoz(b, ayar);
      if (!ham) throw new YzHatasi("anahtar", "Web araması için kurumun yapay zekâ anahtarı tanımlı değil.");
      const kurumAyar = { yurtDisiIzin: ayar.yz?.yurtDisiIzin === true, webArama: ayar.yz?.webArama };
      const arayici = webAramaPolitikasi(ham, kurumAyar);
      web.sonucTavani = kurumSonucTavani(kurumAyar);
      disOrnekler = await disOrnekBul(arayici, bag.olcut, {
        kurumAlanlari: ayar.alanAdi ? [ayar.alanAdi] : [],
        enCokSonuc: web.sonucTavani,
      });
      web.yapildi = true;
      web.tahminiMaliyetUsd = webAramaMaliyeti(arayici.motor, 1, disOrnekler.length);
    } catch (e) {
      if (!(e instanceof YzHatasi)) throw e;
      web.neden = e.message;
    }
  }

  // Aşama 3: öneriler (işlem içinde).
  return islem(b, async (tx, gerekli) => {
    await gerekli("kanit.oku", hedef);
    const kurumIci: KanitAramaSonucu["kurumIci"] = [];
    for (const e of eslesmeler) {
      if (await oneriVarMi(tx, e.kanitId, bag.olcut.kod)) continue;
      const aday = bag.adaylar.find((a) => a.kanitId === e.kanitId);
      const adres = aday?.adres ?? null;
      const [o] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: b.aktor.kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: e.kanitId,
          icerik: json({
            baslik: `Kanıt adayı: ${bag.olcut.kod} ${bag.olcut.baslik}`,
            metin: `"${e.alinti}"\n${aday?.dosyaAdi ?? ""}${adres ? ` (${adres})` : ""}`,
            olcutOnerileri: [{ olcutKod: bag.olcut.kod, olcutId: bag.o.id }],
            alinti: e.alinti,
            kaynakAdresi: adres,
            dersId: g.dersId ?? null,
            yontem: e.yontem,
          }),
          gerekce: e.gerekce || "Ölçütün kanıt gereksinimine uyan parça.",
          atiflar: json([{ kanitId: e.kanitId, atif: e.atif, alinti: e.alinti }]),
          guven: e.guven,
          ureticiTuru: e.yontem === "yz" ? "yz" : "kural",
          uretici:
            e.yontem === "yz"
              ? { gorev: "kanit-avcisi", saglayici: saglayici?.ad ?? "", model: saglayici?.model ?? "" }
              : { kural: "kanit-avcisi-anahtar-kelime", surum: "1" },
          risk: "dusuk",
        })
        .returning({ id: sema.oneri.id });
      if (!o) throw new Error("Öneri eklenemedi.");
      kurumIci.push({
        oneriId: o.id,
        kanitId: e.kanitId,
        dosyaAdi: aday?.dosyaAdi ?? "",
        adres,
        alinti: e.alinti,
        guven: e.guven,
        yontem: e.yontem,
      });
    }
    const disSonuc: KanitAramaSonucu["disOrnekler"] = [];
    const disHedef: Hedef = g.dersId ? hedef : { tur: "kurum", id: b.aktor.kurumId };
    for (const d of disOrnekler) {
      if (await disOrnekVarMi(tx, d.adres, d.olcutKod, disHedef)) continue;
      const [o] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: b.aktor.kurumId,
          tur: "dis_ornek",
          hedefTuru: disHedef.tur,
          hedefId: disHedef.id,
          icerik: json({
            baslik: `Başka kurumdan örnek: ${d.baslik}`,
            metin: `Kanıt değildir; yalnız örnek uygulama kaynağıdır.\n${d.adres}${d.alinti ? `\n"${d.alinti}"` : ""}`,
            kanitDegildir: true,
            olcutKod: d.olcutKod,
            adres: d.adres,
            kaynakBaslik: d.baslik,
            alinti: d.alinti,
            erisim: d.erisim,
          }),
          gerekce: `${bag.olcut.kod} için başka bir kurumun uygulaması. Kurumunuzun kanıtı yerine geçmez.`,
          atiflar: [],
          guven: null,
          ureticiTuru: "yz",
          uretici: { gorev: "kanit-avcisi", arayici: "web", motor: web.yapildi ? "openrouter" : "" },
          risk: "orta",
        })
        .returning({ id: sema.oneri.id });
      if (!o) throw new Error("Öneri eklenemedi.");
      disSonuc.push({ oneriId: o.id, adres: d.adres, baslik: d.baslik, alinti: d.alinti, erisim: d.erisim });
    }
    await gunluge(
      tx,
      b,
      "arastirma.kanit_arandi",
      { tur: "olcut", id: bag.o.id },
      {
        ders: g.dersId ?? null,
        aday: bag.adaylar.length,
        kurumIci: kurumIci.length,
        disOrnek: disSonuc.length,
        webArama: web.yapildi,
        tahminiMaliyetUsd: web.tahminiMaliyetUsd,
        yontem,
      },
    );
    return {
      olcut: { id: bag.o.id, kod: bag.olcut.kod, baslik: bag.olcut.baslik },
      kurumIci,
      disOrnekler: disSonuc,
      webArama: web,
      yontem,
    };
  });
}

/** Dersin (ya da kurumun) başka kurum örnekleri; reddedilenler hariç. */
export async function disOrnekleri(b: ServisBaglami, dersId: string): Promise<DisOrnekGorunumu[]> {
  const id = Kimlik.parse(dersId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur: "ders", id });
    return disOrnekleriOku(tx, id);
  });
}

export async function disOrnekleriOku(tx: Islem, dersId: string): Promise<DisOrnekGorunumu[]> {
  const r = await tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(
      and(sql`${sema.oneri.tur}::text = 'dis_ornek'`, eq(sema.oneri.hedefTuru, "ders"), eq(sema.oneri.hedefId, dersId)),
    )
    .orderBy(sema.oneri.olusturma, sema.oneri.id);
  return r
    .filter((x) => x.k?.sonuc !== "reddedildi")
    .map(({ o }) => {
      const i = o.icerik as Record<string, string>;
      return {
        oneriId: o.id,
        olcutKod: i.olcutKod ?? "",
        adres: i.adres ?? "",
        baslik: i.kaynakBaslik ?? "",
        alinti: i.alinti ?? "",
        erisim: i.erisim ?? "",
      };
    });
}

/**
 * Rapora, matrise ya da ders dosyasına KANIT olarak girecek kaydın denetimi. Yalnız kurumun kanıt havuzundaki
 * kanıt geçer; öneri kimliği verilirse ve bu bir dış örnekse reddedilir.
 */
export async function raporKanitiDenetle(tx: Islem, kimlik: string): Promise<{ kanitId: string; ozet: string }> {
  const [k] = await tx
    .select({ id: sema.kanit.id, ozet: sema.kanit.ozet })
    .from(sema.kanit)
    .where(eq(sema.kanit.id, kimlik));
  if (k) return { kanitId: k.id, ozet: k.ozet };
  const [o] = await tx.select({ tur: sema.oneri.tur }).from(sema.oneri).where(eq(sema.oneri.id, kimlik));
  if (o && String(o.tur) === "dis_ornek")
    throw new ServisHatasi(
      "kural_ihlali",
      "Başka kurumdan örnek kanıt değildir; rapora kanıt olarak eklenemez. Kaynakça olarak gösterilebilir.",
    );
  throw bulunamadi();
}

// ---------- Kurum sitesi taraması ----------

/** Kurumun kendi sitesini tarar; bulunan sayfa ve belgeleri adres + erişim zamanı + SHA-256 ile kanıt yapar. */
export async function siteTaramasi(b: ServisBaglami, girdi: unknown): Promise<SiteTaramaSonucu> {
  const g = SiteTaramaGirdisi.parse(girdi);
  const k = arastirmaKoprusu();
  const alanAdi = await islem(b, async (tx, gerekli) => {
    await gerekli("kanit.yukle", { tur: "kurum", id: b.aktor.kurumId });
    const [kurum] = await tx.select({ alanAdi: sema.kurum.alanAdi }).from(sema.kurum);
    return kurum?.alanAdi ?? null;
  });
  if (!alanAdi)
    throw new ServisHatasi("gecersiz_istek", "Kurumun alan adı kayıtlı değil. Kurum ayarlarından alan adını girin.");
  if (!k.tara || !k.depo || !k.metin)
    throw new ServisHatasi("gecersiz_istek", "Site taraması bu sunucuda henüz bağlı değil. Yöneticinize bildirin.");
  const sonuc = await k.tara({
    baslangic: g.baslangic ?? `https://www.${alanAdi}/`,
    alanAdi,
    derinlik: g.derinlik ?? 2,
    enCokSayfa: g.enCokSayfa ?? 50,
  });
  // Depoya yazma ve metin çıkarma işlem dışında.
  const hazir: { belge: TaranmisBelgeGirdisi; anahtar: string; parcalar: { capa: unknown; metin: string }[] }[] = [];
  for (const belge of sonuc.belgeler) {
    const nesne = await k.depo.koy(b.aktor.kurumId, belge.veri, belge.mime ? { mime: belge.mime } : {});
    if (nesne.ozet !== belge.ozet) throw new Error("Depo özeti tarayıcı özetiyle uyuşmuyor.");
    hazir.push({ belge, anahtar: nesne.anahtar, parcalar: await k.metin(belge.veri, belge.dosyaAdi) });
  }
  return islem(b, async (tx, gerekli) => {
    await gerekli("kanit.yukle", { tur: "kurum", id: b.aktor.kurumId });
    let yeni = 0;
    let vardi = 0;
    for (const h of hazir) {
      const [var_] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.ozet, h.belge.ozet));
      if (var_) {
        vardi++;
        continue;
      }
      const [kn] = await tx
        .insert(sema.kanit)
        .values({
          kurumId: b.aktor.kurumId,
          ozet: h.belge.ozet,
          dosyaAdi: h.belge.dosyaAdi,
          mime: h.belge.mime ?? "application/octet-stream",
          boyut: h.belge.veri.byteLength,
          depoAnahtari: h.anahtar,
          kaynakTuru: "baglayici",
          kaynakAyrinti: json({ ...h.belge.kaynakAyrinti, adres: h.belge.adres, erisim: h.belge.erisim }),
          kapsamlar: [],
          yukleyenKisiId: b.aktor.kisiId,
        })
        .returning({ id: sema.kanit.id });
      if (!kn) throw new Error("Kanıt eklenemedi.");
      if (h.parcalar.length)
        await tx
          .insert(sema.kanitParcasi)
          .values(
            h.parcalar.map((p, i) => ({
              kurumId: b.aktor.kurumId,
              kanitId: kn.id,
              sira: i,
              capa: p.capa,
              metin: p.metin,
            })),
          );
      await tx.insert(sema.kanitIsleme).values({
        kurumId: b.aktor.kurumId,
        kanitId: kn.id,
        durum: "metin_cikarildi",
        ayrinti: { asama: "web_tarama" },
      });
      await gunluge(
        tx,
        b,
        "kanit.eklendi",
        { tur: "kanit", id: kn.id },
        { ozet: h.belge.ozet, tur: "web_tarama", adres: h.belge.adres, erisim: h.belge.erisim },
      );
      yeni++;
    }
    await gunluge(
      tx,
      b,
      "arastirma.site_tarandi",
      { tur: "kurum", id: b.aktor.kurumId },
      { bulunan: sonuc.belgeler.length, yeni, atlanan: sonuc.atlanan.length },
    );
    return { bulunan: sonuc.belgeler.length, yeniKanit: yeni, zatenVardi: vardi, atlanan: sonuc.atlanan };
  });
}
