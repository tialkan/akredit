// ÖDR program tabloları servisi (İP-47). Akış:
//   1. Programın son Bologna okuması (kanıt) ve kurumun onayladığı eşlemeler okunur.
//   2. `@akredit/cerceveler` `tabloUret` ile çerçevenin her tablosu üretilir. Saf, modelsiz; verisi olmayan
//      hücre EKSİK çıkar ve kaynağını taşır.
//   3. Eşlemeler (ders kategorisi ya da türü, PÇ ile kurul çıktısı, seçmeli yer sayısı) `program_esleme`
//      tablosunda yalnız eklenir. Öneriyi YZ ya da kişi yazabilir, tabloya girmez. Kararı yalnız oturum
//      açmış kurum kullanıcısı verir; adı, zamanı ve dayanağı kayda ve günlüğe yazılır. Son karar geçerlidir.
//   4. Word ve Excel çıktısı `@akredit/belge` ile üretilir.

import { tabloSablonuDocx, tabloSablonuXlsx } from "@akredit/belge";
import { ozetHesapla } from "@akredit/cekirdek";
import {
  type Cerceve,
  kurulCiktilari,
  PROGRAM_CERCEVELERI,
  type ProgramBolognaVerisi,
  sablonTablosu,
  TABLO_TANIMLARI,
  type TabloTanimi,
  tabloUret,
  type UretilenTablo,
} from "@akredit/cerceveler";
import { type Islem, sema } from "@akredit/vt";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../../baglam.ts";
import { okumalar } from "../../bologna/index.ts";
import { bulunamadi, ServisHatasi } from "../../hata.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");

export const EslemeTuru = z.enum(["ders_kategorisi", "pc_kurul", "secmeli_yer"]);
export type EslemeTuru = z.infer<typeof EslemeTuru>;

// ---------------------------------------------------------------------------------------------------------
// Çerçeveler

export interface TabloCercevesi {
  kod: string;
  ad: string;
  tablolar: { kod: string; baslik: string }[];
  /** Ders eşlemesinde seçilebilecek kodlar (kategori ya da SABAK ders türü). */
  dersKodlari: string[];
  /** "kategori" ya da "tür": panelde ve iletilerde kullanılır. */
  dersEslemeAdi: "kategori" | "tür";
  kurulCiktilari: { kod: string; etiket: string }[];
}

function tanimlar(cerceveKod: string): TabloTanimi[] {
  return TABLO_TANIMLARI.filter((t) => t.cerceveKod === cerceveKod);
}

/** Tablo tanımı olan program çerçeveleri (resmî ÖDR şablonu alınmış olanlar). */
export function tabloCerceveleri(): TabloCercevesi[] {
  return PROGRAM_CERCEVELERI.filter((c) => tanimlar(c.kod).length).map((c) => cerceveOzeti(c));
}

function cerceveOzeti(c: Cerceve): TabloCercevesi {
  const t = tanimlar(c.kod);
  const kategoriler = [...new Set(t.flatMap((x) => x.kategoriler))];
  const turler = [...new Set(t.flatMap((x) => x.turler))];
  return {
    kod: c.kod,
    ad: c.ad,
    tablolar: t.map((x) => ({ kod: x.kod, baslik: x.baslik })),
    dersKodlari: kategoriler.length ? kategoriler : turler,
    dersEslemeAdi: kategoriler.length ? "kategori" : "tür",
    kurulCiktilari: t.some((x) => x.duzen === "pc-kurul") ? kurulCiktilari(c) : [],
  };
}

export function cerceveGerekli(kod: string): Cerceve {
  const c = PROGRAM_CERCEVELERI.find((x) => x.kod === kod);
  if (!c || !tanimlar(kod).length)
    throw new ServisHatasi(
      "gecersiz_istek",
      "Bu çerçevenin tablo şablonu alınmadı. Listeden tablosu olan bir çerçeve seçin.",
    );
  return c;
}

// ---------------------------------------------------------------------------------------------------------
// Eşleme kayıtları

export interface EslemeKarari {
  deger: string | string[] | number;
  kararVeren: string;
  zaman: string;
  dayanak: string;
}
export interface EslemeOnerisi {
  deger: string | string[] | number;
  uretici: "yz" | "kisi";
  zaman: string;
}
export interface EslemeSatiri {
  anahtar: string;
  etiket: string;
  karar: EslemeKarari | null;
  /** Son karardan sonra yazılmış en yeni öneri; tabloya girmez. */
  oneri: EslemeOnerisi | null;
}

/** Eşleme kaydı (veritabanı satırı, karar verenin adıyla). */
export interface EslemeKaydi {
  tur: EslemeTuru;
  anahtar: string;
  deger: unknown;
  durum: string;
  uretici: string;
  kararVeren: string | null;
  dayanak: string | null;
  zaman: Date;
}

async function kayitlar(tx: Islem, programId: string, cerceveKod: string): Promise<EslemeKaydi[]> {
  const r = await tx
    .select({ e: sema.programEsleme, ad: sema.kisi.adSoyad })
    .from(sema.programEsleme)
    .leftJoin(sema.kisi, eq(sema.kisi.id, sema.programEsleme.kararVerenKisiId))
    .where(eq(sema.programEsleme.programId, programId))
    .orderBy(asc(sema.programEsleme.sira));
  return r
    .filter((x) => x.e.tur === "secmeli_yer" || x.e.cerceveKod === cerceveKod)
    .map((x) => ({
      tur: EslemeTuru.parse(x.e.tur),
      anahtar: x.e.anahtar,
      deger: x.e.deger,
      durum: x.e.durum,
      uretici: x.e.uretici,
      kararVeren: x.ad,
      dayanak: x.e.dayanak,
      zaman: x.e.zaman,
    }));
}

const DegerSemasi = {
  ders_kategorisi: z.string(),
  pc_kurul: z.array(z.string()),
  secmeli_yer: z.number().int().nonnegative(),
} as const;

/** Her anahtarın son kararı ve son karardan sonraki son önerisi. */
function sonDurumlar(
  liste: readonly EslemeKaydi[],
  tur: EslemeTuru,
): Map<string, { karar: EslemeKarari | null; oneri: EslemeOnerisi | null }> {
  const m = new Map<string, { karar: EslemeKarari | null; oneri: EslemeOnerisi | null }>();
  for (const k of liste) {
    if (k.tur !== tur) continue;
    const d = DegerSemasi[tur].safeParse(k.deger);
    if (!d.success) continue;
    const onceki = m.get(k.anahtar) ?? { karar: null, oneri: null };
    if (k.durum === "karar")
      m.set(k.anahtar, {
        karar: {
          deger: d.data,
          kararVeren: k.kararVeren ?? "",
          zaman: k.zaman.toISOString(),
          dayanak: k.dayanak ?? "",
        },
        oneri: null,
      });
    else
      m.set(k.anahtar, {
        ...onceki,
        oneri: { deger: d.data, uretici: k.uretici === "yz" ? "yz" : "kisi", zaman: k.zaman.toISOString() },
      });
  }
  return m;
}

// ---------------------------------------------------------------------------------------------------------
// Durum ve tablolar

export interface ProgramTablolari {
  program: { id: string; ad: string };
  cerceve: TabloCercevesi;
  bologna: { kanitId: string; okundu: string } | null;
  tablolar: UretilenTablo[];
  eslemeler: {
    dersler: EslemeSatiri[];
    pcKurul: EslemeSatiri[];
    secmeliYer: EslemeSatiri[];
  };
}

async function programYukle(tx: Islem, programId: string) {
  const [p] = await tx.select().from(sema.program).where(eq(sema.program.id, programId));
  if (!p) throw bulunamadi();
  return p;
}

async function hazirla(tx: Islem, programId: string, cerceve: Cerceve): Promise<ProgramTablolari> {
  const p = await programYukle(tx, programId);
  const [okuma] = await okumalar(tx, programId, 1);
  return durumKur({
    program: { id: p.id, ad: p.ad },
    cerceve,
    okuma: okuma ? { kanitId: okuma.kanitId, okundu: okuma.okundu, veri: okuma.veri as ProgramBolognaVerisi } : null,
    kayitlar: await kayitlar(tx, programId, cerceve.kod),
  });
}

/**
 * Saf kurucu: Bologna okuması ve eşleme kayıtlarından tabloları ve eşleme satırlarını kurar. IO yok, model
 * yok. Tabloya yalnız kararlar girer (ilke 3); öneriler yalnız eşleme satırında görünür.
 */
export function durumKur(g: {
  program: { id: string; ad: string };
  cerceve: Cerceve;
  okuma: { kanitId: string; okundu: string; veri: ProgramBolognaVerisi } | null;
  kayitlar: readonly EslemeKaydi[];
}): ProgramTablolari {
  const { cerceve, okuma } = g;
  const p = g.program;
  const liste = g.kayitlar;
  const kat = sonDurumlar(liste, "ders_kategorisi");
  const pck = sonDurumlar(liste, "pc_kurul");
  const yer = sonDurumlar(liste, "secmeli_yer");
  const bologna = okuma?.veri ?? null;

  // Tabloya yalnız karar girer; öneri girmez (ilke 3).
  const kararlar = <T>(m: Map<string, { karar: EslemeKarari | null }>) =>
    Object.fromEntries([...m].flatMap(([k, v]) => (v.karar ? [[k, v.karar.deger as T]] : [])));
  const veri = {
    programAd: p.ad,
    bologna,
    dersKategorileri: kararlar<string>(kat),
    pcKurulEslemesi: kararlar<string[]>(pck),
    secmeliYerSayilari: kararlar<number>(yer),
  };
  const tablolar = tanimlar(cerceve.kod).map((t) => tabloUret(t, veri, cerceve));

  const satir = (
    m: Map<string, { karar: EslemeKarari | null; oneri: EslemeOnerisi | null }>,
    anahtar: string,
    etiket: string,
  ): EslemeSatiri => ({ anahtar, etiket, karar: m.get(anahtar)?.karar ?? null, oneri: m.get(anahtar)?.oneri ?? null });

  const dersler: EslemeSatiri[] = [];
  const yariyillar = new Set<number>();
  for (const d of bologna?.dersler ?? []) {
    if ("hata" in d) {
      dersler.push(satir(kat, d.kod, d.kod));
      continue;
    }
    if (d.bos) continue;
    dersler.push(satir(kat, d.kod, d.ad ? `${d.kod} ${d.ad}` : d.kod));
    if (!d.zorunlu && d.yariyil !== null) yariyillar.add(d.yariyil);
  }
  const ozet = cerceveOzeti(cerceve);
  return {
    program: p,
    cerceve: ozet,
    bologna: okuma ? { kanitId: okuma.kanitId, okundu: okuma.okundu } : null,
    tablolar,
    eslemeler: {
      dersler,
      pcKurul: ozet.kurulCiktilari.length
        ? (bologna?.programCiktilari ?? []).map((pc) => satir(pck, pc.kod, `${pc.kod} ${pc.metin}`))
        : [],
      secmeliYer: [...yariyillar].sort((a, b) => a - b).map((y) => satir(yer, String(y), `${y}. yarıyıl`)),
    },
  };
}

export const DurumGirdisi = z.object({ programId: Kimlik, cerceveKod: z.string().trim().min(1).max(100) }).strict();

/** Programın çerçeveye göre ÖDR tabloları ve eşleme durumu. Model kullanılmaz. */
export async function programTablolari(b: ServisBaglami, girdi: unknown): Promise<ProgramTablolari> {
  const g = DurumGirdisi.parse(girdi);
  const cerceve = cerceveGerekli(g.cerceveKod);
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.oku", { tur: "program", id: g.programId });
    return hazirla(tx, g.programId, cerceve);
  });
}

// ---------------------------------------------------------------------------------------------------------
// Öneri ve karar

const EslemeTemeli = z
  .object({
    programId: Kimlik,
    cerceveKod: z.string().trim().min(1).max(100),
    tur: EslemeTuru,
    anahtar: z.string().trim().min(1).max(100),
    deger: z.union([z.string().trim().min(1).max(50), z.array(z.string().trim().min(1).max(50)).max(50), z.number()]),
  })
  .strict();

export const OneriGirdisi = EslemeTemeli.extend({ uretici: z.enum(["yz", "kisi"]) }).strict();
export const KararGirdisi = EslemeTemeli.extend({
  dayanak: z
    .string()
    .trim()
    .min(3, "Kararın dayanağını yazın (ör. kurul kararının tarihi ve sayısı).")
    .max(500, "Dayanak en çok 500 karakter olabilir."),
}).strict();

const gecersiz = (ileti: string) => new ServisHatasi("gecersiz_istek", ileti);

/** Değeri ve anahtarı çerçeveye ve programın Bologna verisine göre denetler. */
async function denetle(
  tx: Islem,
  g: z.infer<typeof EslemeTemeli>,
  cerceve: Cerceve,
): Promise<{ cerceveKod: string | null; deger: string | string[] | number }> {
  const ozet = cerceveOzeti(cerceve);
  const [okuma] = await okumalar(tx, g.programId, 1);
  if (!okuma) throw gecersiz("Bu programın Bologna verisi aktarılmadı. Önce ders bilgi paketini aktarın.");
  const v = okuma.veri;
  if (g.tur === "ders_kategorisi") {
    if (typeof g.deger !== "string" || !ozet.dersKodlari.includes(g.deger))
      throw gecersiz(`Ders ${ozet.dersEslemeAdi} değeri bu çerçevede geçerli değil. Listeden seçin.`);
    if (!v.dersler.some((d) => d.kod === g.anahtar)) throw gecersiz("Bu ders programın Bologna verisinde yok.");
    return { cerceveKod: cerceve.kod, deger: g.deger };
  }
  if (g.tur === "pc_kurul") {
    const gecerli = new Set(ozet.kurulCiktilari.map((k) => k.kod));
    if (!gecerli.size) throw gecersiz("Bu çerçevede program çıktısı ile kurul çıktısı tablosu yok.");
    if (!Array.isArray(g.deger) || g.deger.some((k) => !gecerli.has(k)))
      throw gecersiz("Kurul çıktısı bu çerçevede geçerli değil. Listeden seçin.");
    if (!v.programCiktilari.some((p) => p.kod === g.anahtar))
      throw gecersiz("Bu program çıktısı programın Bologna verisinde yok.");
    return { cerceveKod: cerceve.kod, deger: [...new Set(g.deger)].sort() };
  }
  if (typeof g.deger !== "number" || !Number.isInteger(g.deger) || g.deger < 0 || g.deger > 50)
    throw gecersiz("Seçmeli yer sayısı 0 ile 50 arasında bir tam sayı olmalı.");
  const y = Number(g.anahtar);
  if (!/^\d+$/u.test(g.anahtar) || !v.dersler.some((d) => !("hata" in d) && !d.zorunlu && d.yariyil === y))
    throw gecersiz("Bu yarıyılda seçmeli ders yok.");
  return { cerceveKod: null, deger: g.deger };
}

/**
 * Eşleme önerisi ekler. YZ ya da kişi yazabilir (API anahtarı dahil); öneri tabloya girmez, kurum
 * kullanıcısının kararını bekler.
 */
export async function eslemeOner(b: ServisBaglami, girdi: unknown): Promise<{ tamam: true }> {
  const g = OneriGirdisi.parse(girdi);
  const cerceve = cerceveGerekli(g.cerceveKod);
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "program", id: g.programId });
    const d = await denetle(tx, g, cerceve);
    await tx.insert(sema.programEsleme).values({
      kurumId: b.aktor.kurumId,
      programId: g.programId,
      cerceveKod: d.cerceveKod,
      tur: g.tur,
      anahtar: g.anahtar,
      deger: d.deger,
      durum: "oneri",
      uretici: g.uretici,
      zaman: b.simdi(),
    });
    await gunluge(
      tx,
      b,
      "program_esleme.onerildi",
      { tur: "program", id: g.programId },
      { cerceve: cerceve.kod, tur: g.tur, anahtar: g.anahtar, uretici: g.uretici },
    );
    return { tamam: true as const };
  });
}

/**
 * Eşleme kararı (ilke 3). Yalnız oturum açmış kişi verebilir; API anahtarı (bir YZ ajanı olabilir) reddedilir.
 * Karar yalnız eklenir; aynı anahtarın önceki kararı silinmez, yenisi geçerli olur. Karar verenin adı,
 * zaman ve dayanak günlüğe yazılır.
 */
export async function eslemeKarariVer(b: ServisBaglami, girdi: unknown): Promise<{ tamam: true }> {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Eşleme kararını yalnız oturum açmış kurum kullanıcısı verebilir.");
  const g = KararGirdisi.parse(girdi);
  const cerceve = cerceveGerekli(g.cerceveKod);
  return islem(b, async (tx, gerekli) => {
    await gerekli("karar.ver", { tur: "program", id: g.programId });
    const d = await denetle(tx, g, cerceve);
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    if (!kisi) throw bulunamadi();
    const zaman = b.simdi();
    await tx.insert(sema.programEsleme).values({
      kurumId: b.aktor.kurumId,
      programId: g.programId,
      cerceveKod: d.cerceveKod,
      tur: g.tur,
      anahtar: g.anahtar,
      deger: d.deger,
      durum: "karar",
      uretici: "kisi",
      kararVerenKisiId: b.aktor.kisiId,
      dayanak: g.dayanak,
      zaman,
    });
    await gunluge(
      tx,
      b,
      "program_esleme.karar_verildi",
      { tur: "program", id: g.programId },
      {
        cerceve: cerceve.kod,
        tur: g.tur,
        anahtar: g.anahtar,
        deger: d.deger,
        kararVeren: kisi.ad,
        zaman: zaman.toISOString(),
        dayanak: g.dayanak,
      },
    );
    return { tamam: true as const };
  });
}

// ---------------------------------------------------------------------------------------------------------
// Word ve Excel

export const BelgeGirdisi = DurumGirdisi.extend({ bicim: z.enum(["docx", "xlsx"]) }).strict();

export interface TabloDosyasi {
  dosyaAdi: string;
  mime: string;
  ozet: string;
  icerik: Uint8Array;
}

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/** Çerçevenin bütün tablolarını tek Word ya da Excel dosyası olarak üretir. EKSİK hücre belgede EKSİK yazılır. */
export async function tabloBelgesi(b: ServisBaglami, girdi: unknown): Promise<TabloDosyasi> {
  const g = BelgeGirdisi.parse(girdi);
  const d = await programTablolari(b, { programId: g.programId, cerceveKod: g.cerceveKod });
  const belge = {
    baslik: `${d.cerceve.ad}: ÖDR tabloları`,
    altBaslik: d.program.ad,
    tablolar: d.tablolar.map(sablonTablosu),
  };
  const icerik = g.bicim === "docx" ? await tabloSablonuDocx(belge) : await tabloSablonuXlsx(belge);
  await islem(b, (tx) =>
    gunluge(
      tx,
      b,
      "program_tablolari.indirildi",
      { tur: "program", id: g.programId },
      { cerceve: g.cerceveKod, bicim: g.bicim },
    ),
  );
  return {
    dosyaAdi: `${g.cerceveKod}-tablolar.${g.bicim}`,
    mime: MIME[g.bicim],
    ozet: ozetHesapla(icerik),
    icerik,
  };
}
