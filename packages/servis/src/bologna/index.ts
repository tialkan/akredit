// Bologna ders paketi otomasyonu (İP-15). Uçtan uca akış:
//
//   1. okumaKaydet: programın Bologna sayfaları (bağlayıcıyla okunur ya da CLI çıktısı yüklenir) kanıt olur:
//      SHA-256 özetli dosya + bölüm bölüm atıf parçaları. Değiştirilmez; her okuma yeni kanıttır.
//   2. programDenetimi: son okumanın toplu denetimi ve bir önceki okumayla ders ders önce/sonra karşılaştırması.
//   3. taslakUret: hocanın birkaç cümlelik beyanı da kanıt olur; YZ görevi (`bologna-taslagi`) atıflı tam taslak
//      yazar, K1-K12 hatası kalmayana kadar onarır. Sonuç onay kutusuna `bologna_taslagi` önerisi olarak düşer.
//   4. yazmaPlaniOner: onaylı (ya da düzeltilerek onaylanmış) ve hatasız taslaktan OBS yazma planı önerisi açılır
//      (`yazma_plani`, yüksek risk: toplu onaylanamaz, politikayla otomatik onaylanamaz).
//   5. yazmaPlaniAl / yazmaPlaniUygula: yalnız bir kişinin doğrudan onayladığı ve süresi dolmamış plan çalışır.
//      Tarayıcı ajanı alanları doldurur; Kaydet ve son gönderim insandadır. Giriş bilgisi alanı plana giremez.
//
// Model çağrısı veritabanı işleminin dışında yapılır (uzun süren işlem kilit tutmasın).

import {
  type BolognaTaslagi,
  type BolognaVerisi,
  type Bulgu,
  bolognaDenetle,
  kanonikJson,
  okunamadiMi,
} from "@akredit/cekirdek";
import { type Islem, sema } from "@akredit/vt";
import { type AtifKaynagi, bolognaTaslagiUret, politikaUygula, type Saglayici, YzHatasi } from "@akredit/yz";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, type Hedef, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { kurumSaglayicisi, YzAnahtariYokHatasi } from "../yz-fabrika.ts";
import {
  type AlanDegisikligi,
  dersBazinda,
  GIRIS_ALANI,
  GirisAlaniHatasi,
  girisAlaniVarMi,
  type Karsilastirma,
  karsiDersler,
  kopyalanabilirCikti,
  okumaParcalari,
  okunanDers,
  onceSonra,
  tamDenetim,
  taslakFarki,
  type YazmaAlani,
  yazmaPlaniKur,
} from "./saf.ts";

export * from "./eksik-giderme.ts";
export * from "./saf.ts";

// ---------- Dış bağlantılar ----------

export interface BolognaDeposu {
  koy(kurumId: string, veri: Uint8Array, secenek?: { mime?: string }): Promise<{ ozet: string; anahtar: string }>;
}

export interface BolognaKoprusu {
  /** Programın Bologna sayfalarını okur (`@akredit/baglayicilar` programiOku). */
  oku: ((adres: string) => Promise<BolognaVerisi>) | null;
  /** Kanıt nesne deposu (`@akredit/depo`). */
  depo: BolognaDeposu | null;
  /** Kurumun YZ sağlayıcısı. */
  saglayici: Saglayici | null;
}

const kuresel = globalThis as unknown as { __akreditBolognaKoprusu?: BolognaKoprusu };

/** Sunucu açılışında bağlanır. Bağlanmamış parça, ilgili uçta ne yapılacağını söyleyen hata verir. */
export function bolognaKoprusuAyarla(k: Partial<BolognaKoprusu>): void {
  kuresel.__akreditBolognaKoprusu = { ...bolognaKoprusu(), ...k };
}

export function bolognaKoprusu(): BolognaKoprusu {
  return kuresel.__akreditBolognaKoprusu ?? { oku: null, depo: null, saglayici: null };
}

/** Onaylı yazma planının geçerlilik süresi (CLI `yazma-onay --sure 90` ile aynı). */
export const PLAN_GECERLILIK_DAKIKA = 90;

// ---------- Şemalar ----------

const Kimlik = z.string().uuid("Geçersiz kimlik.");
const Metin = z.string().max(20_000);
const SayiYaDaBos = z.number().nullable();

const OkunanDersSemasi = z.object({
  kod: z.string().max(40),
  zorunlu: z.boolean(),
  bos: z.boolean(),
  kaynak: z.string().max(2000),
  yariyil: SayiYaDaBos,
  ad: z.string().max(300).optional(),
  tul: z.string().max(20).optional(),
  kredi: SayiYaDaBos,
  akts: SayiYaDaBos,
  guncelleme: z.string().max(40).optional(),
  bilgiler: z.record(z.string().max(200), Metin),
  degerlendirme: z.array(z.object({ ad: z.string().max(200), sayi: SayiYaDaBos, katki: SayiYaDaBos })).max(50),
  isyuku: z
    .array(z.object({ ad: z.string().max(200), sayi: SayiYaDaBos, sure: SayiYaDaBos, toplam: SayiYaDaBos }))
    .max(50),
  dersYapisi: z.array(z.object({ alan: z.string().max(200), yuzde: SayiYaDaBos })).max(30),
  ciktilar: z.array(z.object({ kod: z.string().max(20), metin: Metin })).max(40),
  haftalar: z.number().int().min(0).max(30),
  katki: z.record(z.string(), z.record(z.string(), z.string().max(5))),
});

export const BolognaVerisiSemasi = z.object({
  adres: z.string().max(2000),
  okundu: z.string().max(40),
  programCiktilari: z.array(z.object({ kod: z.string().max(20), metin: Metin })).max(60),
  matris: z.object({
    pkodlar: z.array(z.string().max(20)).max(60),
    dersler: z
      .array(
        z.object({
          kod: z.string().max(40),
          ad: z.string().max(300),
          zorunlu: z.boolean(),
          grup: z.string().max(200).nullable(),
          yariyil: SayiYaDaBos,
          grupBasligi: z.boolean(),
          degerler: z.record(z.string(), z.string().max(5)),
        }),
      )
      .max(500),
  }),
  tyycIsaret: SayiYaDaBos,
  dersler: z
    .array(z.union([OkunanDersSemasi, z.object({ kod: z.string().max(40), hata: z.string().max(2000) })]))
    .max(500),
});

export const OkumaGirdisi = z
  .object({
    /** Verilmezse programın kayıtlı Bologna adresi kullanılır. */
    adres: z.string().url("Bologna adresi geçersiz.").max(2000).optional(),
    /** Önceden okunmuş veri (ör. `akreddit bologna-al` çıktısı). Verilirse ağdan okunmaz. */
    veri: BolognaVerisiSemasi.optional(),
  })
  .strict();

export const TaslakGirdisi = z
  .object({
    dersId: Kimlik,
    /** Hocanın birkaç cümlelik bilgisi; kanıt olarak saklanır. */
    beyan: z.string().trim().max(4000).optional(),
  })
  .strict();

export const YazmaPlaniGirdisi = z
  .object({
    /** OBS'de dersin düzenleme ekranının adresi. */
    adres: z.string().url("Ders düzenleme adresi geçersiz.").max(2000),
  })
  .strict();

export const YazmaBitisGirdisi = z
  .object({
    sonuc: z.enum(["tamamlandi", "yarim_kaldi", "vazgecildi"]),
    not: z.string().trim().max(1000).optional(),
  })
  .strict();

// ---------- Çıktı şemaları (OpenAPI) ----------

const BulguSemasi = z.object({
  duzey: z.enum(["hata", "uyari", "bilgi"]),
  kural: z.string(),
  konu: z.string().optional(),
  aciklama: z.string(),
});

export const OkumaSonucu = z.object({
  kanitId: z.string(),
  ozet: z.string(),
  yeni: z.boolean(),
  dersSayisi: z.number(),
  okunamayan: z.array(z.string()),
});
export type OkumaSonucu = z.infer<typeof OkumaSonucu>;

const SayiCifti = z.object({ hata: z.number(), uyari: z.number() });
export const ProgramDenetimi = z.object({
  programId: z.string(),
  okuma: z.object({ kanitId: z.string(), okundu: z.string() }).nullable(),
  oncekiOkuma: z.object({ kanitId: z.string(), okundu: z.string() }).nullable(),
  bulgular: z.array(BulguSemasi),
  dersler: z.array(
    z.object({
      kod: z.string(),
      once: SayiCifti.nullable(),
      sonra: SayiCifti,
      degisim: z.enum(["iyilesti", "kotulesti", "ayni", "yeni"]),
    }),
  ),
});
export type ProgramDenetimi = z.infer<typeof ProgramDenetimi>;

const Denetim = z.object({
  bulgular: z.array(BulguSemasi),
  hata: z.number(),
  uyari: z.number(),
  isToplam: z.number(),
  hedef: z.number(),
});
const Fark = z.array(z.object({ alan: z.string(), neden: z.array(z.string()) }));

export const TaslakSonucu = z.object({
  oneriId: z.string(),
  taslak: z.record(z.string(), z.unknown()),
  denetim: Denetim,
  fark: Fark,
  tur: z.number(),
  atifSorunlari: z.array(z.object({ alan: z.string(), aciklama: z.string() })),
});
export type TaslakSonucu = z.infer<typeof TaslakSonucu>;

export const GecmisKaydi = z.object({
  oneriId: z.string(),
  zaman: z.string(),
  karar: z.enum(["onaylandi", "duzeltildi", "reddedildi"]).nullable(),
  kararZamani: z.string().nullable(),
  hata: z.number(),
  uyari: z.number(),
  fark: Fark,
  yazmaPlaniId: z.string().nullable(),
});
export type GecmisKaydi = z.infer<typeof GecmisKaydi>;

const AlanSemasi = z.object({ sekme: z.string(), alan: z.string(), deger: z.string(), kaynak: z.string() });
export const YazmaPlaniSonucu = z.object({ oneriId: z.string(), alanSayisi: z.number() });
export const OnayliPlan = z.object({
  oneriId: z.string(),
  dersKodu: z.string(),
  adres: z.string(),
  alanlar: z.array(AlanSemasi),
  kopyalanabilir: z.string(),
  onaylayan: z.string(),
  onayZamani: z.string(),
  gecerlilikSonu: z.string(),
  sonAdim: z.string(),
});
export type OnayliPlan = z.infer<typeof OnayliPlan>;

// ---------- Yardımcılar ----------

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;
const metinBaytlari = (s: string) => new TextEncoder().encode(s);

const OkumaAyrintisi = z.object({ tur: z.literal("bologna"), programId: z.string(), okundu: z.string() });

export interface Okuma {
  kanitId: string;
  ozet: string;
  okundu: string;
  veri: BolognaVerisi;
  parcalar: { capa: { bolum: string }; metin: string }[];
}

/** Programın okumaları (en yeni önce). */
export async function okumalar(tx: Islem, programId: string, sinir = 2): Promise<Okuma[]> {
  const satirlar = await tx
    .select()
    .from(sema.kanit)
    .where(
      and(
        sql`${sema.kanit.kaynakAyrinti} ->> 'tur' = 'bologna'`,
        sql`${sema.kanit.kaynakAyrinti} ->> 'programId' = ${programId}`,
      ),
    )
    .orderBy(desc(sema.kanit.olusturma), desc(sema.kanit.id))
    .limit(sinir);
  const sonuc: Okuma[] = [];
  for (const k of satirlar) {
    const a = OkumaAyrintisi.safeParse(k.kaynakAyrinti);
    if (!a.success) continue;
    const parcalar = await tx
      .select({ capa: sema.kanitParcasi.capa, metin: sema.kanitParcasi.metin })
      .from(sema.kanitParcasi)
      .where(eq(sema.kanitParcasi.kanitId, k.id))
      .orderBy(sema.kanitParcasi.sira);
    const ham = parcalar.find((p) => (p.capa as { bolum?: string }).bolum === "ham");
    const veri = ham ? BolognaVerisiSemasi.safeParse(JSON.parse(ham.metin)) : null;
    if (!veri?.success) continue;
    sonuc.push({
      kanitId: k.id,
      ozet: k.ozet,
      okundu: a.data.okundu,
      veri: veri.data as BolognaVerisi,
      parcalar: parcalar
        .filter((p) => (p.capa as { bolum?: string }).bolum !== "ham")
        .map((p) => ({ capa: p.capa as { bolum: string }, metin: p.metin })),
    });
  }
  return sonuc;
}

/** Önerinin yetki hedefi; ders, program ve birim dışındaki hedefler kurum düzeyinde sayılır. */
function hedefi(o: { hedefTuru: string; hedefId: string }, kurumId: string): Hedef {
  return ["ders", "program", "birim"].includes(o.hedefTuru)
    ? { tur: o.hedefTuru as Hedef["tur"], id: o.hedefId }
    : { tur: "kurum", id: kurumId };
}

async function programYukle(tx: Islem, programId: string) {
  const [p] = await tx.select().from(sema.program).where(eq(sema.program.id, programId));
  if (!p) throw bulunamadi();
  return p;
}

async function dersYukle(tx: Islem, dersId: string) {
  const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.id, dersId));
  if (!d) throw bulunamadi();
  return d;
}

function depoGerekli(): BolognaDeposu {
  const d = bolognaKoprusu().depo;
  if (!d)
    throw new ServisHatasi("gecersiz_istek", "Kanıt deposu bu sunucuda henüz bağlı değil. Yöneticinize bildirin.");
  return d;
}

// ---------- 1. Okuma ----------

/** Programın Bologna sayfalarını okur (ya da verilen okumayı alır) ve kanıt olarak kaydeder. */
export async function okumaKaydet(b: ServisBaglami, programId: string, girdi: unknown): Promise<OkumaSonucu> {
  const id = Kimlik.parse(programId);
  const g = OkumaGirdisi.parse(girdi);
  const adres = await islem(b, async (tx, gerekli) => {
    await gerekli("kanit.yukle", { tur: "program", id });
    return g.adres ?? (await programYukle(tx, id)).bolognaAdresi;
  });
  let veri: BolognaVerisi;
  if (g.veri) veri = g.veri as BolognaVerisi;
  else {
    const oku = bolognaKoprusu().oku;
    if (!oku)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Bologna sayfaları bu sunucudan okunamıyor. Okumayı komut satırı aracıyla yapıp dosyasını yükleyin.",
      );
    if (!adres) throw new ServisHatasi("gecersiz_istek", "Programın Bologna adresi kayıtlı değil. Adresi girin.");
    veri = await oku(adres);
  }
  const ham = kanonikJson(veri);
  const nesne = await depoGerekli().koy(b.aktor.kurumId, metinBaytlari(ham), { mime: "application/json" });
  return islem(b, async (tx, gerekli) => {
    await gerekli("kanit.yukle", { tur: "program", id });
    const okunamayan = veri.dersler.filter(okunamadiMi).map((d) => d.kod);
    const dersSayisi = veri.dersler.length - okunamayan.length;
    const [varolan] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.ozet, nesne.ozet));
    if (varolan) return { kanitId: varolan.id, ozet: nesne.ozet, yeni: false, dersSayisi, okunamayan };
    const [k] = await tx
      .insert(sema.kanit)
      .values({
        kurumId: b.aktor.kurumId,
        ozet: nesne.ozet,
        dosyaAdi: `bologna-${veri.okundu.slice(0, 10)}.json`,
        mime: "application/json",
        boyut: metinBaytlari(ham).byteLength,
        depoAnahtari: nesne.anahtar,
        kaynakTuru: "baglayici",
        kaynakAyrinti: { tur: "bologna", programId: id, okundu: veri.okundu, adres: veri.adres },
        belgeTarihi: veri.okundu.slice(0, 10),
        kapsamlar: [{ tur: "program", id }],
        yukleyenKisiId: b.aktor.kisiId,
        // Bologna sayfası öğretim elemanı adlarını taşır; atıf parçalarına bu alanlar alınmaz.
        kisiselVeri: "var",
      })
      .returning({ id: sema.kanit.id });
    if (!k) throw new Error("Kanıt eklenemedi.");
    const parcalar = [{ capa: { bolum: "ham" }, metin: ham }, ...okumaParcalari(veri)];
    await tx.insert(sema.kanitParcasi).values(
      parcalar.map((p, sira) => ({
        kurumId: b.aktor.kurumId,
        kanitId: k.id,
        sira,
        capa: p.capa,
        metin: p.metin,
      })),
    );
    await tx
      .insert(sema.kanitIsleme)
      .values({ kurumId: b.aktor.kurumId, kanitId: k.id, durum: "metin_cikarildi", ayrinti: { asama: "bologna" } });
    await gunluge(tx, b, "bologna.okundu", { tur: "kanit", id: k.id }, { program: id, ders: dersSayisi });
    return { kanitId: k.id, ozet: nesne.ozet, yeni: true, dersSayisi, okunamayan };
  });
}

// ---------- 2. Toplu denetim, önce / sonra ----------

export async function programDenetimi(b: ServisBaglami, programId: string): Promise<ProgramDenetimi> {
  const id = Kimlik.parse(programId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.oku", { tur: "program", id });
    const [son, onceki] = await okumalar(tx, id, 2);
    if (!son) return { programId: id, okuma: null, oncekiOkuma: null, bulgular: [], dersler: [] };
    const simdi = b.simdi().getTime();
    const kodlar = (v: BolognaVerisi) => v.dersler.map((d) => d.kod);
    const bulgular = bolognaDenetle(son.veri, { simdi });
    const sonra = dersBazinda(bulgular, kodlar(son.veri));
    const once = onceki ? dersBazinda(bolognaDenetle(onceki.veri, { simdi }), kodlar(onceki.veri)) : null;
    const dersler: Karsilastirma[] = onceSonra(once, sonra);
    return {
      programId: id,
      okuma: { kanitId: son.kanitId, okundu: son.okundu },
      oncekiOkuma: onceki ? { kanitId: onceki.kanitId, okundu: onceki.okundu } : null,
      bulgular: bulgular as Bulgu[],
      dersler,
    };
  });
}

// ---------- 3. YZ taslağı ----------

const TaslakIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  dersKodu: z.string(),
  taslak: z.custom<BolognaTaslagi>((v) => typeof v === "object" && v !== null && "ciktilar" in v),
  okumaKanitId: z.string(),
  beyanKanitId: z.string().nullable(),
  fark: Fark,
});

/** Önerinin geçerli taslağı: düzeltme kararında insanın JSON olarak verdiği taslak, yoksa önerinin kendisi. */
function gecerliTaslak(icerik: z.infer<typeof TaslakIcerigi>, karar: { sonuc: string; duzeltme: unknown } | null) {
  if (karar?.sonuc !== "duzeltildi") return icerik.taslak;
  const metin = (karar.duzeltme as { metin?: string } | null)?.metin ?? "";
  try {
    const t = JSON.parse(metin) as BolognaTaslagi;
    if (typeof t === "object" && t && Array.isArray(t.ciktilar)) return { ...t, kod: icerik.taslak.kod };
  } catch {
    // Düzeltme JSON değilse aşağıda reddedilir.
  }
  throw new ServisHatasi(
    "kural_ihlali",
    "Düzeltilmiş taslak okunamadı. Taslağı yeniden üretin ya da düzeltmeyi taslak biçiminde verin.",
  );
}

async function dersTaslaklari(tx: Islem, dersId: string) {
  return tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(and(eq(sema.oneri.tur, "bologna_taslagi"), eq(sema.oneri.hedefTuru, "ders"), eq(sema.oneri.hedefId, dersId)))
    .orderBy(sema.oneri.olusturma, sema.oneri.id);
}

async function beyanKaydet(
  tx: Islem,
  b: ServisBaglami,
  dersId: string,
  metin: string,
  nesne: { ozet: string; anahtar: string },
): Promise<{ id: string; ozet: string }> {
  const [varolan] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.ozet, nesne.ozet));
  if (varolan) return { id: varolan.id, ozet: nesne.ozet };
  const [k] = await tx
    .insert(sema.kanit)
    .values({
      kurumId: b.aktor.kurumId,
      ozet: nesne.ozet,
      dosyaAdi: "hoca-beyani.txt",
      mime: "text/plain",
      boyut: metinBaytlari(metin).byteLength,
      depoAnahtari: nesne.anahtar,
      kaynakTuru: "yukleme",
      kaynakAyrinti: { tur: "bologna_beyani", dersId },
      kapsamlar: [{ tur: "ders", id: dersId }],
      yukleyenKisiId: b.aktor.kisiId,
    })
    .returning({ id: sema.kanit.id });
  if (!k) throw new Error("Kanıt eklenemedi.");
  await tx
    .insert(sema.kanitParcasi)
    .values({ kurumId: b.aktor.kurumId, kanitId: k.id, sira: 0, capa: { bolum: "beyan" }, metin });
  await tx
    .insert(sema.kanitIsleme)
    .values({ kurumId: b.aktor.kurumId, kanitId: k.id, durum: "metin_cikarildi", ayrinti: { asama: "beyan" } });
  await gunluge(tx, b, "kanit.eklendi", { tur: "kanit", id: k.id }, { ozet: nesne.ozet, tur: "bologna_beyani" });
  return { id: k.id, ozet: nesne.ozet };
}

async function kurumSaglayicisiCoz(b: ServisBaglami, maske: { adlar?: string[] }): Promise<Saglayici> {
  try {
    return (await kurumSaglayicisi(b.db, b.aktor.kurumId, { ekMaske: maske, simdi: b.simdi })).saglayici;
  } catch (e) {
    if (e instanceof YzAnahtariYokHatasi)
      throw new ServisHatasi(
        "kural_ihlali",
        "Yapay zekâ anahtarı tanımlı değil. Kurum yöneticinize bildirildi; anahtar girilince yeniden deneyin.",
      );
    if (e instanceof YzHatasi) throw new ServisHatasi("kural_ihlali", e.message);
    throw e;
  }
}

/**
 * Hocanın beyanı ve son Bologna okumasından atıflı tam taslak üretir; onay kutusuna öneri olarak düşer.
 * Kod, ad, AKTS, T+U+L ve yetkililer sistemden (ders kaydı ve oturumdaki hoca) gelir.
 */
/** Taslak üretimine başka akışların (İP-37 eksik giderme) eklediği girdi, içerik ve denetimler. */
export interface TaslakEki {
  giderilecek?: { bulgular: { kural: string; aciklama: string }[]; hesaplar: { ad: string; deger: string }[] };
  /** Öneri içeriğine eklenecek alanlar (ör. kaynakça). */
  icerik?: Record<string, unknown>;
  /** Taslağa uygulanacak ek denetim (uyarı) bulguları. */
  ekBulgular?: (t: BolognaTaslagi) => Bulgu[];
  /** Günlük olayı; varsayılan `bologna.taslak_uretildi`. */
  olay?: string;
}

export async function taslakUret(b: ServisBaglami, girdi: unknown, ek: TaslakEki = {}): Promise<TaslakSonucu> {
  const g = TaslakGirdisi.parse(girdi);
  await islem(b, async (tx, gerekli) => {
    await gerekli("olcme.veri_gir", { tur: "ders", id: (await dersYukle(tx, g.dersId)).id });
  });
  const k = bolognaKoprusu();
  // Anahtar yoksa beyan saklanmadan önce durulur; bildirim kurum yöneticisine düşer.
  if (!k.saglayici) await kurumSaglayicisiCoz(b, {});
  const beyan = g.beyan?.length ? g.beyan : null;
  const nesne = beyan ? await depoGerekli().koy(b.aktor.kurumId, metinBaytlari(beyan), { mime: "text/plain" }) : null;

  // Aşama 1: bağlam (işlem içinde).
  const baglam = await islem(b, async (tx, gerekli) => {
    const d = await dersYukle(tx, g.dersId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
    const [okuma] = await okumalar(tx, d.programId, 1);
    if (!okuma)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Bu programın Bologna sayfaları henüz okunmadı. Önce program sayfasından okumayı başlatın.",
      );
    const [hoca] = await tx.select().from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    const [kurum] = await tx.select({ ayarlar: sema.kurum.ayarlar }).from(sema.kurum);
    const beyanKaniti = beyan && nesne ? await beyanKaydet(tx, b, d.id, beyan, nesne) : null;
    const onceki = (await dersTaslaklari(tx, d.id)).filter((r) => r.k?.sonuc !== "reddedildi").at(-1) ?? null;
    let oncekiTaslak: BolognaTaslagi | null = null;
    if (onceki) {
      const ic = TaslakIcerigi.safeParse(onceki.o.icerik);
      if (ic.success)
        try {
          oncekiTaslak = gecerliTaslak(ic.data, onceki.k);
        } catch {
          oncekiTaslak = ic.data.taslak;
        }
    }
    return { d, okuma, hoca, kurum, beyanKaniti, oncekiTaslak };
  });
  const { d, okuma, hoca, beyanKaniti } = baglam;
  const dersParcalari = okuma.parcalar.filter(
    (p) => p.capa.bolum.startsWith(`${d.kod}.`) || p.capa.bolum.startsWith("program."),
  );
  const yetkiliAdi = [hoca?.unvan, hoca?.adSoyad].filter(Boolean).join(" ");
  const yetkili = {
    ad: yetkiliAdi,
    eposta: hoca?.eposta ?? "",
    ...(hoca?.avesisAdresi ? { avesis: hoca.avesisAdresi } : {}),
  };
  const yzAyari = (baglam.kurum?.ayarlar as { yz?: { yurtDisiIzin?: boolean } } | undefined)?.yz;
  const maske = { adlar: hoca?.adSoyad ? [hoca.adSoyad] : [] };
  // Sağlayıcı: köprüde sabit sağlayıcı varsa o; yoksa kurumun kayıtlı anahtarıyla iş anında kurulur (İP-35).
  let saglayici: Saglayici;
  if (k.saglayici) saglayici = politikaUygula(k.saglayici, { yurtDisiIzin: yzAyari?.yurtDisiIzin === true, maske });
  else saglayici = await kurumSaglayicisiCoz(b, maske);
  const okumaKaynagi: AtifKaynagi = { ozet: okuma.ozet, parcalar: dersParcalari };
  const beyanKaynagi: AtifKaynagi | null = beyanKaniti
    ? { ozet: beyanKaniti.ozet, parcalar: [{ capa: { bolum: "beyan" }, metin: beyan as string }] }
    : null;

  // Aşama 2: model (işlem dışında).
  const s = await bolognaTaslagiUret(
    {
      sabit: {
        kod: d.kod,
        ad: d.ad,
        akts: d.akts,
        tul: `${d.teorik}+${d.uygulama}+${d.laboratuvar}`,
        programCiktilari: okuma.veri.programCiktilari.map((c) => c.kod),
        yetkililer: [
          { rol: "Ders Koordinatörü", ...yetkili },
          { rol: "Dersi Veren", ...yetkili },
        ],
      },
      okuma: okumaKaynagi,
      beyan: beyanKaynagi,
      ...(ek.giderilecek ? { giderilecek: ek.giderilecek } : {}),
    },
    saglayici,
  );
  const temelDenetim = tamDenetim(s.taslak, karsiDersler(okuma.veri, d.kod));
  const ekB = ek.ekBulgular?.(s.taslak) ?? [];
  const denetim = {
    ...temelDenetim,
    bulgular: [...temelDenetim.bulgular, ...ekB],
    hata: temelDenetim.hata + ekB.filter((x) => x.duzey === "hata").length,
    uyari: temelDenetim.uyari + ekB.filter((x) => x.duzey === "uyari").length,
  };
  const atifSorunlari = s.sorunlar.filter(
    (x) => !/^K\d|^Temel|^Değerlendirme|^Ders akışı|^Kaynaklar$|^Türkçe/u.test(x.alan),
  );
  const fark: AlanDegisikligi[] = taslakFarki(baglam.oncekiTaslak, s.taslak);

  // Aşama 3: öneri (işlem içinde).
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
    const ozetMetni =
      denetim.hata === 0
        ? `K1-K12 denetiminden hatasız geçti; ${denetim.uyari} uyarı. ${s.tur} turda hazırlandı.`
        : `${denetim.hata} hata kaldı (${s.tur} tur onarım sonrası). Onaylanırsa bile OBS'ye yazılamaz; düzeltin.`;
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "bologna_taslagi",
        hedefTuru: "ders",
        hedefId: d.id,
        icerik: json({
          baslik: `Bologna taslağı: ${d.kod} ${d.ad}`,
          metin: `${ozetMetni}\nDeğişen alanlar: ${fark.map((f) => f.alan).join(", ") || "yok"}.`,
          dersKodu: d.kod,
          taslak: s.taslak,
          denetim,
          fark,
          okumaKanitId: okuma.kanitId,
          beyanKanitId: beyanKaniti?.id ?? null,
          dayanaklar: s.veri.dayanaklar,
          ...(ek.icerik ?? {}),
        }),
        gerekce: ozetMetni,
        atiflar: json([
          ...s.veri.dayanaklar.map((x) => ({
            kanitId: x.atif.includes(okuma.ozet.slice(0, 8)) ? okuma.kanitId : (beyanKaniti?.id ?? okuma.kanitId),
            atif: x.atif,
            bolum: x.bolum,
          })),
        ]),
        ureticiTuru: "yz",
        uretici: { gorev: "bologna-taslagi", saglayici: saglayici.ad, model: saglayici.model, tur: s.tur },
        risk: "orta",
      })
      .returning({ id: sema.oneri.id });
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunluge(
      tx,
      b,
      ek.olay ?? "bologna.taslak_uretildi",
      { tur: "oneri", id: o.id },
      { ders: d.id, hata: denetim.hata, uyari: denetim.uyari, tur: s.tur },
    );
    return {
      oneriId: o.id,
      taslak: s.taslak as unknown as Record<string, unknown>,
      denetim,
      fark,
      tur: s.tur,
      atifSorunlari,
    };
  });
}

// ---------- Taslak geçmişi ----------

export async function taslakGecmisi(b: ServisBaglami, dersId: string): Promise<GecmisKaydi[]> {
  const id = Kimlik.parse(dersId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur: "ders", id });
    await dersYukle(tx, id);
    const planlar = await tx
      .select({ id: sema.oneri.id, icerik: sema.oneri.icerik })
      .from(sema.oneri)
      .where(and(eq(sema.oneri.tur, "yazma_plani"), eq(sema.oneri.hedefId, id)));
    return (await dersTaslaklari(tx, id)).flatMap((r) => {
      const ic = TaslakIcerigi.safeParse(r.o.icerik);
      if (!ic.success) return [];
      const den = (r.o.icerik as { denetim?: { hata?: number; uyari?: number } }).denetim;
      const plan = planlar.find((p) => (p.icerik as { taslakOneriId?: string }).taslakOneriId === r.o.id);
      return [
        {
          oneriId: r.o.id,
          zaman: r.o.olusturma.toISOString(),
          karar: r.k?.sonuc ?? null,
          kararZamani: r.k?.zaman.toISOString() ?? null,
          hata: den?.hata ?? 0,
          uyari: den?.uyari ?? 0,
          fark: ic.data.fark,
          yazmaPlaniId: plan?.id ?? null,
        },
      ];
    });
  });
}

// ---------- 4. Yazma planı önerisi ----------

const PlanIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  sistem: z.literal("OBS"),
  adres: z.string(),
  dersKodu: z.string(),
  taslakOneriId: z.string(),
  alanlar: z.array(AlanSemasi),
});

/** Onaylı ve hatasız taslaktan OBS yazma planı önerisi açar. Plan da ayrıca insan onayı ister. */
export async function yazmaPlaniOner(
  b: ServisBaglami,
  taslakOneriId: string,
  girdi: unknown,
): Promise<z.infer<typeof YazmaPlaniSonucu>> {
  const id = Kimlik.parse(taslakOneriId);
  const g = YazmaPlaniGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const [r] = await tx
      .select({ o: sema.oneri, k: sema.karar })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(eq(sema.oneri.id, id));
    if (!r) throw bulunamadi();
    await gerekli("olcme.veri_gir", hedefi(r.o, b.aktor.kurumId));
    if (r.o.tur !== "bologna_taslagi") throw bulunamadi();
    const ic = TaslakIcerigi.safeParse(r.o.icerik);
    if (!ic.success) throw bulunamadi();
    if (!r.k || r.k.sonuc === "reddedildi")
      throw new ServisHatasi("kural_ihlali", "Taslak onaylanmadan yazma planı açılmaz. Önce taslağı onaylayın.");
    const taslak = gecerliTaslak(ic.data, r.k);
    const d = await dersYukle(tx, r.o.hedefId);
    const [okuma] = await okumalar(tx, d.programId, 1);
    const den = tamDenetim(taslak, okuma ? karsiDersler(okuma.veri, d.kod) : []);
    if (den.hata > 0)
      throw new ServisHatasi(
        "kural_ihlali",
        `Taslakta ${den.hata} denetim hatası var; hatalı taslak OBS'ye yazılmaz. Düzeltip yeniden onaylayın.`,
      );
    const varolan = await tx
      .select({ id: sema.oneri.id })
      .from(sema.oneri)
      .where(and(eq(sema.oneri.tur, "yazma_plani"), sql`${sema.oneri.icerik} ->> 'taslakOneriId' = ${id}`));
    if (varolan.length) throw new ServisHatasi("cakisma", "Bu taslak için yazma planı zaten açıldı.");
    let alanlar: YazmaAlani[];
    try {
      alanlar = yazmaPlaniKur(taslak, `onaylı taslak ${id}`);
    } catch (e) {
      if (e instanceof GirisAlaniHatasi) throw new ServisHatasi("kural_ihlali", e.message);
      throw e;
    }
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "yazma_plani",
        hedefTuru: "ders",
        hedefId: d.id,
        icerik: json({
          baslik: `OBS yazma planı: ${d.kod} ${d.ad}`,
          metin: `${alanlar.length} alan OBS'ye yazılacak. Onaydan sonra ${PLAN_GECERLILIK_DAKIKA} dakika geçerlidir; Kaydet ve son gönderim sizdedir.`,
          sistem: "OBS",
          adres: g.adres,
          dersKodu: d.kod,
          taslakOneriId: id,
          alanlar,
        }),
        gerekce: `Onaylı taslak (karar ${r.k.id}) K1-K12 denetiminden hatasız geçti.`,
        atiflar: json([{ oneriId: id }]),
        ureticiTuru: "kural",
        uretici: { kural: "bologna-yazma-plani", surum: "1" },
        // Dış sisteme yazma: tek tek, kişinin kendisi onaylar.
        risk: "yuksek",
      })
      .returning({ id: sema.oneri.id });
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunluge(
      tx,
      b,
      "bologna.yazma_plani_acildi",
      { tur: "oneri", id: o.id },
      { taslak: id, alan: alanlar.length },
    );
    return { oneriId: o.id, alanSayisi: alanlar.length };
  });
}

// ---------- 5. Onaylı planı alma ve uygulama ----------

/**
 * Onaylı planı döndürür ve yazmanın başladığını günlüğe yazar. Onaysız, reddedilmiş, düzeltilmiş, politikayla
 * verilmiş ya da süresi dolmuş onayla çalışmaz; plan içinde giriş bilgisi alanı varsa reddedilir.
 */
export async function yazmaPlaniAl(b: ServisBaglami, planOneriId: string): Promise<OnayliPlan> {
  const id = Kimlik.parse(planOneriId);
  return islem(b, async (tx, gerekli) => {
    const [r] = await tx
      .select({ o: sema.oneri, k: sema.karar })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(eq(sema.oneri.id, id));
    if (!r) throw bulunamadi();
    await gerekli("olcme.veri_gir", hedefi(r.o, b.aktor.kurumId));
    if (r.o.tur !== "yazma_plani") throw bulunamadi();
    const ic = PlanIcerigi.safeParse(r.o.icerik);
    if (!ic.success) throw bulunamadi();
    if (!r.k) throw new ServisHatasi("kural_ihlali", "Yazma planı onaylanmadan çalışmaz. Önce planı onaylayın.");
    if (r.k.sonuc !== "onaylandi")
      throw new ServisHatasi(
        "kural_ihlali",
        "Yazma planı onaylanmadı ya da düzeltildi. Değişiklik gerekiyorsa taslağı düzeltip yeni plan açın.",
      );
    if (r.k.dayanak !== "dogrudan")
      throw new ServisHatasi("kural_ihlali", "Dış sisteme yazma yalnız kişinin kendi onayıyla çalışır.");
    const sonu = new Date(r.k.zaman.getTime() + PLAN_GECERLILIK_DAKIKA * 60_000);
    if (b.simdi() > sonu)
      throw new ServisHatasi("kural_ihlali", "Onayın süresi doldu. Taslağı yeniden onaylayıp yeni plan açın.");
    const giris = girisAlaniVarMi(ic.data.alanlar);
    if (giris.length) throw new ServisHatasi("kural_ihlali", `Plana giriş bilgisi alanı giremez: ${giris.join(", ")}.`);
    const [onaylayan] = await tx
      .select({ ad: sema.kisi.adSoyad })
      .from(sema.kisi)
      .where(eq(sema.kisi.id, r.k.kararVerenKisiId));
    await gunluge(
      tx,
      b,
      "bologna.yazma_basladi",
      { tur: "oneri", id },
      { karar: r.k.id, onaylayan: r.k.kararVerenKisiId, alan: ic.data.alanlar.length },
    );
    return {
      oneriId: id,
      dersKodu: ic.data.dersKodu,
      adres: ic.data.adres,
      alanlar: ic.data.alanlar,
      kopyalanabilir: kopyalanabilirCikti(ic.data.dersKodu, ic.data.alanlar),
      onaylayan: onaylayan?.ad ?? r.k.kararVerenKisiId,
      onayZamani: r.k.zaman.toISOString(),
      gecerlilikSonu: sonu.toISOString(),
      sonAdim: "Alanlar dolduruldu. Her sekmede Kaydet'e ve son gönderime siz basın.",
    };
  });
}

/** Tarayıcı ajanı (Claude Code eklentisi ya da kurum içi Playwright). Kaydet ya da gönder yöntemi yoktur. */
export interface BolognaYazici {
  doldur(alan: YazmaAlani): Promise<void>;
}

export interface UygulamaSonucu {
  doldurulan: number;
  atlanan: string[];
  sonAdim: string;
}

/** Onaylı planı yazıcıyla uygular. Giriş bilgisi alanına hiçbir koşulda yazılmaz; kaydetme insandadır. */
export async function yazmaPlaniUygula(
  b: ServisBaglami,
  planOneriId: string,
  yazici: BolognaYazici,
): Promise<UygulamaSonucu> {
  const plan = await yazmaPlaniAl(b, planOneriId);
  const atlanan: string[] = [];
  let doldurulan = 0;
  for (const a of plan.alanlar) {
    if (GIRIS_ALANI.test(a.alan) || GIRIS_ALANI.test(a.sekme)) {
      atlanan.push(a.alan);
      continue;
    }
    await yazici.doldur(a);
    doldurulan++;
  }
  return { doldurulan, atlanan, sonAdim: plan.sonAdim };
}

/** Yazmanın sonucunu günlüğe yazar (kayıt yalnız eklenir). */
export async function yazmaBitir(b: ServisBaglami, planOneriId: string, girdi: unknown): Promise<{ tamam: true }> {
  const id = Kimlik.parse(planOneriId);
  const g = YazmaBitisGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const [o] = await tx.select().from(sema.oneri).where(eq(sema.oneri.id, id));
    if (!o) throw bulunamadi();
    await gerekli("olcme.veri_gir", hedefi(o, b.aktor.kurumId));
    if (o.tur !== "yazma_plani") throw bulunamadi();
    await gunluge(tx, b, "bologna.yazma_bitti", { tur: "oneri", id }, { sonuc: g.sonuc, not: g.not ?? null });
    return { tamam: true as const };
  });
}
