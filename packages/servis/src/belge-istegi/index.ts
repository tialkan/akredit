// İdari birimlerden hesapsız belge isteme (İP-45).
//
// Akış: komisyon üyesi istek oluşturur (ne istendiği, alıcı e-posta, son tarih). Sistem tek kullanımlık, süreli
// ve HMAC imzalı bir bağlantı üretir; birim yetkilisi giriş yapmadan dosyayı yükler.
// - Jeton `yuk.imza` biçimindedir; yük `{k: kurum, i: istek, r: rastgele}`, imza HMAC-SHA256 (gizli anahtar
//   sunucuda). Veritabanında jetonun kendisi değil yalnız SHA-256 özeti durur; doğrulamada imza ve özet ikisi de
//   tutmalıdır. Jeton günlüğe yazılmaz.
// - Yükleme `belge_istegi_yuklemesi` tablosuna istek kimliğiyle eklenir; birincil anahtar ikinci kullanımı
//   (eşzamanlı olanı da) reddeder. Süresi dolan bağlantı kullanılamaz.
// - Yüklenen dosya kanıt olur ama `kaynak_ayrinti.dogrulama = "dogrulanmamis"` ile girer ve bir kanıt etiketi
//   önerisi açılır. Kabul o öneriye verilen insan kararıdır (Katman 1 ya da 2, kurum politikasına göre).
//   Kabul edilmeden kanıt ölçüte bağlanamaz (göç 0080 tetikleyicisi), bu yüzden rapora atıf olamaz.
// - Belgenin metni modele talimat olarak geçmez (ilke 5): bu modül metni hiç okumaz, yalnız dosyayı saklar.

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { gunlugeYaz, type Islem, kiraciIslemi, type SorguSonucu, satirlar, sema, type Vt } from "@akredit/vt";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { ServisHatasi, vtHatasiCevir } from "../hata.ts";

export const EN_UZUN_GUN = 30;
export const VARSAYILAN_GUN = 14;
/** Yüklenebilecek en büyük dosya (bayt). */
export const EN_BUYUK_DOSYA = 20 * 1024 * 1024;
/** Aynı ağ izinden bir saatte en çok bu kadar yükleme (kurum içinde). */
export const AG_SINIRI_SAATLIK = 10;
/** Hatırlatma, son tarihe bu kadar saat kala bir kez gönderilir. */
export const HATIRLATMA_SAATI = 48;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const b64 = (x: Buffer | string) => Buffer.from(x).toString("base64url");

// ---------- Jeton ----------

function imza(gizli: string, yuk: string): string {
  return b64(createHmac("sha256", gizli).update(`akredit.belge-istegi.v1:${yuk}`).digest());
}

function gizliDenetle(gizli: string) {
  if (Buffer.byteLength(gizli) < 32) throw new Error("Belge isteği bağlantı anahtarı en az 32 bayt olmalı.");
}

/** Jetonun veritabanında saklanan özeti (SHA-256, onaltılık). */
export function belirtecOzeti(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

/** İmzalı jeton üretir. `rastgele` en az 16 bayt olmalı (bağlantı tahmin edilemez). */
export function jetonUret(gizli: string, kurumId: string, istekId: string, rastgele: Uint8Array): string {
  gizliDenetle(gizli);
  if (rastgele.byteLength < 16) throw new Error("Jeton için en az 16 bayt rastgele değer gerekir.");
  const yuk = b64(JSON.stringify({ k: kurumId, i: istekId, r: b64(Buffer.from(rastgele)) }));
  return `${yuk}.${imza(gizli, yuk)}`;
}

const gecersiz = () =>
  new ServisHatasi("bulunamadi", "Bu bağlantı geçerli değil. Belgeyi isteyen kişiden yeni bir bağlantı isteyin.");

/** Jetonu doğrular; imza tutmazsa ya da biçim bozuksa hata. */
export function jetonCoz(gizli: string, jeton: string): { kurumId: string; istekId: string } {
  gizliDenetle(gizli);
  if (typeof jeton !== "string" || jeton.length > 400) throw gecersiz();
  const [yuk, im, fazla] = jeton.split(".");
  if (!yuk || !im || fazla !== undefined) throw gecersiz();
  const beklenen = Buffer.from(imza(gizli, yuk));
  const gelen = Buffer.from(im);
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) throw gecersiz();
  let x: unknown;
  try {
    x = JSON.parse(Buffer.from(yuk, "base64url").toString("utf8"));
  } catch {
    throw gecersiz();
  }
  const { k, i, r } = (x ?? {}) as { k?: unknown; i?: unknown; r?: unknown };
  if (typeof k !== "string" || typeof i !== "string" || typeof r !== "string" || !UUID.test(k) || !UUID.test(i))
    throw gecersiz();
  return { kurumId: k, istekId: i };
}

// ---------- Dosya denetimi ----------

const TURLER: { uzanti: string[]; mime: string; imza: (v: Uint8Array) => boolean }[] = [
  { uzanti: ["pdf"], mime: "application/pdf", imza: (v) => bas(v, [0x25, 0x50, 0x44, 0x46]) },
  {
    uzanti: ["docx"],
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    imza: (v) => bas(v, [0x50, 0x4b, 0x03, 0x04]),
  },
  {
    uzanti: ["xlsx"],
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    imza: (v) => bas(v, [0x50, 0x4b, 0x03, 0x04]),
  },
  { uzanti: ["odt"], mime: "application/vnd.oasis.opendocument.text", imza: (v) => bas(v, [0x50, 0x4b, 0x03, 0x04]) },
  {
    uzanti: ["ods"],
    mime: "application/vnd.oasis.opendocument.spreadsheet",
    imza: (v) => bas(v, [0x50, 0x4b, 0x03, 0x04]),
  },
  { uzanti: ["doc"], mime: "application/msword", imza: (v) => bas(v, [0xd0, 0xcf, 0x11, 0xe0]) },
  { uzanti: ["xls"], mime: "application/vnd.ms-excel", imza: (v) => bas(v, [0xd0, 0xcf, 0x11, 0xe0]) },
  { uzanti: ["png"], mime: "image/png", imza: (v) => bas(v, [0x89, 0x50, 0x4e, 0x47]) },
  { uzanti: ["jpg", "jpeg"], mime: "image/jpeg", imza: (v) => bas(v, [0xff, 0xd8, 0xff]) },
];

function bas(v: Uint8Array, b: number[]): boolean {
  return v.byteLength >= b.length && b.every((x, i) => v[i] === x);
}

/** Kabul edilen uzantılar (kullanıcıya gösterilir). */
export const KABUL_EDILEN = TURLER.flatMap((t) => t.uzanti.map((u) => `.${u}`)).join(", ");

/** Dosya adından yol ve denetim karakterlerini atar. */
export function dosyaAdiTemizle(ad: string): string {
  const son = ad.split(/[\\/]/u).at(-1) ?? "";
  const temiz = son.replace(/\p{Cc}/gu, "").trim();
  return temiz.slice(0, 200) || "belge";
}

/**
 * Dosyanın türünü ve boyutunu denetler. Tür, uzantı ve dosyanın ilk baytlarıyla birlikte belirlenir; tarayıcının
 * bildirdiği türe güvenilmez. Uygunsa MIME türünü, değilse kullanıcıya gösterilecek hatayı döndürür.
 */
export function dosyaDenetle(
  veri: Uint8Array,
  ad: string,
): { tamam: true; mime: string } | { tamam: false; ileti: string } {
  if (veri.byteLength === 0) return { tamam: false, ileti: "Dosya boş. Başka bir dosya seçin." };
  if (veri.byteLength > EN_BUYUK_DOSYA)
    return {
      tamam: false,
      ileti: `Dosya çok büyük. En çok ${EN_BUYUK_DOSYA / 1048576} MB yüklenebilir; dosyayı küçültüp yeniden deneyin.`,
    };
  const uzanti = (ad.split(".").at(-1) ?? "").toLowerCase();
  const tur = TURLER.find((t) => t.uzanti.includes(uzanti));
  if (!tur?.imza(veri))
    return { tamam: false, ileti: `Bu dosya türü kabul edilmiyor. Şu türlerden birini yükleyin: ${KABUL_EDILEN}.` };
  return { tamam: true, mime: tur.mime };
}

// ---------- İstek oluşturma ----------

const tekSatir = (ad: string, enCok: number) =>
  z
    .string()
    .trim()
    .max(enCok, `${ad} çok uzun.`)
    .refine((x) => !/\p{Cc}/u.test(x), `${ad} tek satır olmalı.`);

export const IstekGirdisi = z
  .object({
    /** Ne istendiği. Gereksinim verilirse boş bırakılabilir; metin çerçevedeki gereksinimden alınır. */
    istenen: z.string().trim().max(2000, "İstenen belge açıklaması çok uzun.").optional(),
    gereksinimId: z.uuid().optional(),
    aliciEposta: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Geçerli bir e-posta adresi yazın."))
      .optional()
      .or(z.literal("").transform(() => undefined)),
    birimAdi: tekSatir("Birim adı", 200).optional(),
    sonGun: z.number().int().min(1).max(EN_UZUN_GUN, `Son tarih en çok ${EN_UZUN_GUN} gün sonra olabilir.`).optional(),
  })
  .strict();
export type IstekGirdisi = z.input<typeof IstekGirdisi>;

export interface EpostaGondericisi {
  gonder(i: { alici: string; konu: string; metin: string }): Promise<void>;
}

export interface IstekAyari {
  gizli: string;
  /** Ör. https://akredit.org — bağlantı `${temelAdres}/belge-yukle?j=…` biçimindedir. */
  temelAdres: string;
  /** E-posta taşıyıcısı; yoksa istek oluşturulur ama gönderilmedi diye işaretlenir. */
  tasiyici: EpostaGondericisi | null;
  /** Testler için rastgele kaynak. */
  rastgele?: () => Uint8Array;
}

export interface OlusanIstek {
  id: string;
  /** Bağlantı yalnız bu yanıtta bir kez görünür; saklanmaz. E-posta gönderilemediyse elle iletilebilir. */
  baglanti: string;
  son: string;
  gonderim: "gonderildi" | "gonderilmedi";
  /** Gönderilmediyse nedeni (kullanıcıya gösterilir). */
  neden: string | null;
}

export function baglantiAdresi(temelAdres: string, jeton: string): string {
  return `${temelAdres.replace(/\/+$/u, "")}/belge-yukle?j=${encodeURIComponent(jeton)}`;
}

/** İstek e-postası. Kullanıcı girdisi yalnız gövdeye girer; konu sabittir. */
export function istekIletisi(a: {
  kurumAdi: string;
  isteyenAd: string;
  istenen: string;
  son: Date;
  baglanti: string;
}): { konu: string; metin: string } {
  const tarih = a.son.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  return {
    konu: `${a.kurumAdi}: kalite komisyonundan belge isteği`,
    metin: [
      `${a.isteyenAd} sizden kalite çalışmaları için bir belge istiyor.`,
      "",
      `İstenen belge: ${a.istenen}`,
      `Son tarih: ${tarih}`,
      "",
      "Belgeyi yüklemek için bu bağlantıyı açın. Hesap ya da parola gerekmez:",
      a.baglanti,
      "",
      "Bağlantı yalnız bir kez ve son tarihe kadar kullanılabilir. Bu e-postayı başkasına iletmeyin.",
    ].join("\n"),
  };
}

/** Bir birimden belge ister. Yetki: kurum kapsamında kanıt yükleme. */
export async function istekOlustur(b: ServisBaglami, girdi: IstekGirdisi, ayar: IstekAyari): Promise<OlusanIstek> {
  const g = IstekGirdisi.parse(girdi);
  const simdi = b.simdi();
  const id = randomUUID();
  const jeton = jetonUret(ayar.gizli, b.aktor.kurumId, id, ayar.rastgele?.() ?? randomBytes(32));
  const son = new Date(simdi.getTime() + (g.sonGun ?? VARSAYILAN_GUN) * 86_400_000);
  const ozellik = await islem(b, async (tx, gerekli) => {
    await gerekli("kanit.yukle", { tur: "kurum", id: b.aktor.kurumId });
    let istenen = g.istenen ?? "";
    if (g.gereksinimId) {
      const [gr] = await tx
        .select({ metin: sema.kanitGereksinimi.beklenenKanitTuru })
        .from(sema.kanitGereksinimi)
        .where(eq(sema.kanitGereksinimi.id, g.gereksinimId));
      if (!gr) throw new ServisHatasi("bulunamadi", "Seçilen kanıt gereksinimi bulunamadı.");
      istenen = istenen || gr.metin;
    }
    if (istenen.length < 3)
      throw new ServisHatasi("gecersiz_istek", "Ne istendiğini yazın ya da bir kanıt gereksinimi seçin.", [
        { alan: "istenen", ileti: "Ne istendiğini yazın." },
      ]);
    await tx.insert(sema.belgeIstegi).values({
      id,
      kurumId: b.aktor.kurumId,
      gereksinimId: g.gereksinimId ?? null,
      istenen,
      aliciEposta: g.aliciEposta ?? null,
      birimAdi: g.birimAdi || null,
      isteyenKisiId: b.aktor.kisiId,
      belirtecOzet: belirtecOzeti(jeton),
      son,
      olusturma: simdi,
    });
    await gunluge(
      tx,
      b,
      "belge_istegi.olusturuldu",
      { tur: "belge_istegi", id },
      {
        gereksinim: g.gereksinimId ?? null,
        alici: Boolean(g.aliciEposta),
        son: son.toISOString(),
      },
    );
    const [k] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, b.aktor.kurumId));
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    return { istenen, kurumAdi: k?.ad ?? "Akredit", isteyenAd: kisi?.ad ?? "Kalite komisyonu" };
  });
  const baglanti = baglantiAdresi(ayar.temelAdres, jeton);
  let neden: string | null = null;
  if (!g.aliciEposta) neden = "Alıcı e-posta adresi girilmedi. Bağlantıyı birime kendiniz iletin.";
  else if (!ayar.tasiyici) neden = "E-posta gönderimi bu sunucuda ayarlı değil. Bağlantıyı birime kendiniz iletin.";
  else {
    try {
      await ayar.tasiyici.gonder({ alici: g.aliciEposta, ...istekIletisi({ ...ozellik, son, baglanti }) });
    } catch {
      neden = "E-posta gönderilemedi. Bağlantıyı birime kendiniz iletin ya da daha sonra yeni istek oluşturun.";
    }
  }
  const durum = neden ? "gonderilmedi" : "gonderildi";
  await gonderimYaz(b.db, b.aktor.kurumId, id, "ilk", durum, neden, simdi);
  return { id, baglanti, son: son.toISOString(), gonderim: durum, neden };
}

/** Bir gönderim denemesini kaydeder (yalnız eklenir). */
export function gonderimYaz(
  db: Vt,
  kurumId: string,
  istekId: string,
  tur: "ilk" | "hatirlatma",
  durum: "gonderildi" | "gonderilmedi",
  neden: string | null,
  zaman: Date,
): Promise<void> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    await tx.insert(sema.belgeIstegiGonderimi).values({ kurumId, istekId, tur, durum, neden, zaman });
  });
}

// ---------- Panel listesi ----------

export type IstekDurumu = "bekliyor" | "suresi_doldu" | "yuklendi" | "kabul_edildi" | "reddedildi";

export interface IstekSatiri {
  id: string;
  istenen: string;
  birimAdi: string | null;
  aliciVar: boolean;
  son: string;
  olusturma: string;
  durum: IstekDurumu;
  /** Son gönderim denemesinin sonucu; hiç deneme yoksa `null`. */
  gonderim: { durum: "gonderildi" | "gonderilmedi"; neden: string | null; zaman: string } | null;
  kanitId: string | null;
  oneriId: string | null;
}

/** Kurumun belge isteklerini, yeniden eskiye. Yetki: kurum kapsamında kanıt okuma. */
export async function istekleri(b: ServisBaglami): Promise<IstekSatiri[]> {
  const simdi = b.simdi();
  return islem(b, async (tx, gerekli) => {
    await gerekli("kanit.oku", { tur: "kurum", id: b.aktor.kurumId });
    const satir = await tx.select().from(sema.belgeIstegi).orderBy(desc(sema.belgeIstegi.olusturma)).limit(200);
    if (!satir.length) return [];
    const idler = satir.map((s) => s.id);
    const gon = await tx
      .select()
      .from(sema.belgeIstegiGonderimi)
      .where(inArray(sema.belgeIstegiGonderimi.istekId, idler))
      .orderBy(sema.belgeIstegiGonderimi.zaman);
    const yuk = await tx
      .select({ y: sema.belgeIstegiYuklemesi, sonuc: sema.karar.sonuc })
      .from(sema.belgeIstegiYuklemesi)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.belgeIstegiYuklemesi.oneriId))
      .where(inArray(sema.belgeIstegiYuklemesi.id, idler));
    return satir.map((s): IstekSatiri => {
      const g = gon.filter((x) => x.istekId === s.id).at(-1);
      const y = yuk.find((x) => x.y.id === s.id);
      let durum: IstekDurumu = simdi.getTime() >= s.son.getTime() ? "suresi_doldu" : "bekliyor";
      if (y) durum = y.sonuc === "onaylandi" ? "kabul_edildi" : y.sonuc === "reddedildi" ? "reddedildi" : "yuklendi";
      return {
        id: s.id,
        istenen: s.istenen,
        birimAdi: s.birimAdi,
        aliciVar: Boolean(s.aliciEposta),
        son: s.son.toISOString(),
        olusturma: s.olusturma.toISOString(),
        durum,
        gonderim: g
          ? { durum: g.durum as "gonderildi" | "gonderilmedi", neden: g.neden, zaman: g.zaman.toISOString() }
          : null,
        kanitId: y?.y.kanitId ?? null,
        oneriId: y?.y.oneriId ?? null,
      };
    });
  });
}

// ---------- Hesapsız sayfa: ön izleme ve yükleme ----------

export interface IstekOnizlemesi {
  istenen: string;
  isteyenAd: string;
  kurumAdi: string;
  birimAdi: string | null;
  son: string;
  durum: { gecerli: true } | { gecerli: false; neden: string };
}

async function istekYukle_(tx: Islem, istekId: string, jeton: string) {
  const [s] = await tx.select().from(sema.belgeIstegi).where(eq(sema.belgeIstegi.id, istekId));
  if (!s) throw gecersiz();
  const a = Buffer.from(s.belirtecOzet);
  const c = Buffer.from(belirtecOzeti(jeton));
  if (a.length !== c.length || !timingSafeEqual(a, c)) throw gecersiz();
  return s;
}

const KULLANILDI = "Bu bağlantı daha önce kullanıldı. Bir bağlantı yalnız bir kez kullanılır.";
const SURESI_DOLDU = "Bu bağlantının süresi doldu. Belgeyi isteyen kişiden yeni bir bağlantı isteyin.";

async function engel(tx: Islem, s: typeof sema.belgeIstegi.$inferSelect, simdi: Date): Promise<ServisHatasi | null> {
  const [y] = await tx
    .select({ id: sema.belgeIstegiYuklemesi.id })
    .from(sema.belgeIstegiYuklemesi)
    .where(eq(sema.belgeIstegiYuklemesi.id, s.id));
  if (y) return new ServisHatasi("cakisma", KULLANILDI);
  if (simdi.getTime() >= s.son.getTime()) return new ServisHatasi("kural_ihlali", SURESI_DOLDU);
  return null;
}

/** Bağlantıyı açar; hiçbir şey yazmaz. */
export async function istekOnizle(db: Vt, gizli: string, jeton: string, simdi: Date): Promise<IstekOnizlemesi> {
  const { kurumId, istekId } = jetonCoz(gizli, jeton);
  return kiraciIslemi(db, kurumId, async (tx) => {
    const s = await istekYukle_(tx, istekId, jeton);
    const [k] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, s.isteyenKisiId));
    const e = await engel(tx, s, simdi);
    return {
      istenen: s.istenen,
      isteyenAd: kisi?.ad ?? "Kalite komisyonu",
      kurumAdi: k?.ad ?? "",
      birimAdi: s.birimAdi,
      son: s.son.toISOString(),
      durum: e ? { gecerli: false, neden: e.message } : { gecerli: true },
    };
  });
}

/** Depoya önceden konmuş dosyanın bilgisi. */
export interface YuklenenDosya {
  ozet: string;
  depoAnahtari: string;
  dosyaAdi: string;
  mime: string;
  boyut: number;
}

export interface YuklemeGirdisi {
  jeton: string;
  dosya: YuklenenDosya;
  aciklama?: string;
  /** Tuzlu ağ izi (hız sınırı için); IP saklanmaz. */
  agIzi: string | null;
}

export interface YuklemeSonucu {
  kanitId: string;
  oneriId: string;
}

const Aciklama = z
  .string()
  .trim()
  .max(1000, "Not en çok 1000 karakter olabilir.")
  .optional()
  .transform((x) => x || null);

/**
 * Bağlantıyla yüklenen dosyayı kanıt hattına "dış birimden, doğrulanmamış" olarak alır ve kabul için kanıt
 * etiketi önerisi açar. İkinci kullanım, süre aşımı ve hız sınırı reddedilir.
 */
export async function istekYukle(db: Vt, gizli: string, g: YuklemeGirdisi, simdi: Date): Promise<YuklemeSonucu> {
  const { kurumId, istekId } = jetonCoz(gizli, g.jeton);
  const aciklama = Aciklama.parse(g.aciklama);
  if (!/^[0-9a-f]{64}$/u.test(g.dosya.ozet)) throw new ServisHatasi("gecersiz_istek", "Dosya bilgisi hatalı.");
  try {
    return await kiraciIslemi(db, kurumId, async (tx) => {
      const s = await istekYukle_(tx, istekId, g.jeton);
      const e = await engel(tx, s, simdi);
      if (e) throw e;
      if (g.agIzi) {
        const saatOnce = new Date(simdi.getTime() - 3_600_000);
        const [n] = await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(sema.belgeIstegiYuklemesi)
          .where(and(eq(sema.belgeIstegiYuklemesi.agIzi, g.agIzi), gte(sema.belgeIstegiYuklemesi.zaman, saatOnce)));
        if ((n?.n ?? 0) >= AG_SINIRI_SAATLIK)
          throw new ServisHatasi(
            "cok_fazla_istek",
            "Kısa sürede çok fazla yükleme yapıldı. Bir saat sonra yeniden deneyin.",
          );
      }
      const dosyaAdi = dosyaAdiTemizle(g.dosya.dosyaAdi);
      const ayrinti = { disBirim: true, dogrulama: "dogrulanmamis", belgeIstegi: s.id, birim: s.birimAdi ?? null };
      // Aynı içerik kurumda zaten kanıtsa yeni kanıt açılmaz; o kanıtın durumu değişmez (yalnız eklenir).
      const [varolan] = await tx
        .select({ id: sema.kanit.id })
        .from(sema.kanit)
        .where(and(eq(sema.kanit.kurumId, kurumId), eq(sema.kanit.ozet, g.dosya.ozet)));
      let kanitId = varolan?.id;
      if (!kanitId) {
        const [kn] = await tx
          .insert(sema.kanit)
          .values({
            kurumId,
            ozet: g.dosya.ozet,
            dosyaAdi,
            mime: g.dosya.mime,
            boyut: g.dosya.boyut,
            depoAnahtari: g.dosya.depoAnahtari,
            kaynakTuru: "yukleme",
            kaynakAyrinti: ayrinti,
            kapsamlar: [],
            yukleyenKisiId: null,
          })
          .returning({ id: sema.kanit.id });
        if (!kn) throw new Error("Kanıt eklenemedi.");
        kanitId = kn.id;
        await tx
          .insert(sema.kanitIsleme)
          .values({ kurumId, kanitId, durum: "bekliyor", ayrinti: { asama: "alindi", yol: "belge_istegi" } });
        await gunlugeYaz(tx, {
          aktor: { tur: "sistem", id: null },
          eylem: "kanit.eklendi",
          hedef: { tur: "kanit", id: kanitId },
          ayrinti: { ozet: g.dosya.ozet, kaynakTuru: "yukleme", boyut: g.dosya.boyut, belgeIstegi: s.id },
          zaman: simdi,
        });
      }
      const [o] = await tx
        .insert(sema.oneri)
        .values({
          kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: kanitId,
          icerik: {
            baslik: `Dış birimden gelen belge: ${s.istenen.slice(0, 160)}`,
            metin:
              "Birim yetkilisi bu belgeyi istek bağlantısıyla yükledi. Kanıt olarak kabul edilmesi için inceleyin.",
            dogrulama: "dogrulanmamis",
            belgeIstegi: s.id,
            gereksinim: s.gereksinimId,
            birim: s.birimAdi,
            dosyaAdi,
          },
          gerekce: "Hesapsız belge isteği bağlantısıyla geldi; içerik doğrulanmadı.",
          guven: null,
          ureticiTuru: "kural",
          uretici: { kural: "belge_istegi", surum: "1" },
          risk: "orta",
        })
        .returning({ id: sema.oneri.id });
      if (!o) throw new Error("Öneri eklenemedi.");
      await tx.insert(sema.belgeIstegiYuklemesi).values({
        id: s.id,
        kurumId,
        kanitId,
        oneriId: o.id,
        aciklama,
        agIzi: g.agIzi,
        zaman: simdi,
      });
      await gunlugeYaz(tx, {
        aktor: { tur: "sistem", id: null },
        eylem: "belge_istegi.yuklendi",
        hedef: { tur: "belge_istegi", id: s.id },
        ayrinti: { kanit: kanitId, oneri: o.id, ozet: g.dosya.ozet, yeniKanit: !varolan, yol: "baglanti" },
        zaman: simdi,
      });
      return { kanitId, oneriId: o.id };
    });
  } catch (e) {
    if (e instanceof ServisHatasi) throw e;
    const c = vtHatasiCevir(e);
    if (c instanceof ServisHatasi && c.kod === "cakisma") throw new ServisHatasi("cakisma", KULLANILDI);
    throw c;
  }
}

// ---------- Kabul durumu ----------

/**
 * Kanıtın rapora atıf yapılabilir olup olmadığı. Dış birimden gelen kanıt ancak kabul önerisi onaylandıysa
 * uygundur; diğer kanıtlar bu kurala tabi değildir. Aynı kural veritabanında ölçüt bağında da uygulanır.
 */
export async function atifaUygunMu(tx: Islem, kanitId: string): Promise<boolean> {
  const [k] = await tx.select({ ayrinti: sema.kanit.kaynakAyrinti }).from(sema.kanit).where(eq(sema.kanit.id, kanitId));
  if (!k) return false;
  if ((k.ayrinti as { dogrulama?: unknown } | null)?.dogrulama !== "dogrulanmamis") return true;
  const [r] = await tx
    .select({ id: sema.karar.id })
    .from(sema.belgeIstegiYuklemesi)
    .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.belgeIstegiYuklemesi.oneriId))
    .where(and(eq(sema.belgeIstegiYuklemesi.kanitId, kanitId), eq(sema.karar.sonuc, "onaylandi")));
  return Boolean(r);
}

// ---------- Hatırlatma (işçi) ----------

export interface Hatirlatilacak {
  id: string;
  aliciEposta: string;
  istenen: string;
  son: Date;
}

/**
 * Son tarihine `HATIRLATMA_SAATI` saatten az kalmış, yüklenmemiş, alıcısı olan ve henüz hatırlatılmamış istekler.
 * Jeton saklanmadığı için hatırlatma yeni bağlantı içermez; ilk e-postadaki bağlantıya yönlendirir.
 */
export async function hatirlatilacaklar(db: Vt, kurumId: string, simdi: Date): Promise<Hatirlatilacak[]> {
  const sinir = new Date(simdi.getTime() + HATIRLATMA_SAATI * 3_600_000);
  return kiraciIslemi(db, kurumId, async (tx) => {
    const r = await tx.execute(sql`
      select i.id, i.alici_eposta, i.istenen, i.son from belge_istegi i
      where i.alici_eposta is not null and i.son > ${simdi.toISOString()}::timestamptz
        and i.son <= ${sinir.toISOString()}::timestamptz
        and not exists (select 1 from belge_istegi_yuklemesi y where y.id = i.id)
        and not exists (select 1 from belge_istegi_gonderimi g where g.istek_id = i.id and g.tur = 'hatirlatma')
        and exists (select 1 from belge_istegi_gonderimi g where g.istek_id = i.id and g.tur = 'ilk'
                    and g.durum = 'gonderildi')
      order by i.son`);
    const satir = satirlar(
      r as unknown as SorguSonucu<{ id: string; alici_eposta: string; istenen: string; son: string | Date }>,
    );
    return satir.map((x) => ({ id: x.id, aliciEposta: x.alici_eposta, istenen: x.istenen, son: new Date(x.son) }));
  });
}

export function hatirlatmaIletisi(a: { istenen: string; son: Date }): { konu: string; metin: string } {
  const tarih = a.son.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  return {
    konu: "Hatırlatma: kalite komisyonundan belge isteği",
    metin: [
      "Sizden istenen belge henüz yüklenmedi.",
      "",
      `İstenen belge: ${a.istenen}`,
      `Son tarih: ${tarih}`,
      "",
      "Belgeyi, ilk e-postadaki bağlantıyla yükleyebilirsiniz. Bağlantıyı bulamazsanız isteyen kişiye yazın.",
    ].join("\n"),
  };
}
