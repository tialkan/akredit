// Kaynak doğrulama: DOI, ISBN ya da başlık+yazar ile eserin gerçekten var olduğunu açık kataloglardan denetler.
// Yalnız sabit, izinli hostlara sorar (api.crossref.org, openlibrary.org, www.googleapis.com/books). Ağ adresi
// kullanıcıdan alınmaz; kullanıcı girdisi yalnız doğrulanmış DOI, ISBN ya da sorgu parametresi olarak, kodlanarak
// adrese girer (SSRF yok). Her istekte zaman aşımı ve yanıt boyutu sınırı vardır, yanıt zod ile doğrulanır.
//
// Uydurma yok: künye yalnız katalog yanıtındaki alanlardan kurulur ve kaynak_bicimle biçimiyle yazılır. Başlık
// ve yazarla aramada eşleşme deterministik bir denetimden (başlık sözcükleri, tam soyad belirteci, kayıt türü,
// verilmişse yıl) geçmezse sonuç "bulunamadi"dır.
//
// Ayrım (dış inceleme 2026-11-05): "katalogda bulundu" yalnız eserin katalogda var olduğunu söyler; "ders kaynağı
// olarak uygun" kararı hocanındır. Türkçe kitapların çoğu bu kataloglarda yoktur: bulunamayan eser uydurma sayılmaz
// ama doğrulanmış da sayılmaz; yalnız hocanın verdiği bilgiyle "hoca_beyani" etiketiyle yazılabilir.
//
// Kötüye kullanım sınırı: çağrı başına en çok 5 kaynak, süreç genelinde en çok 4 eşzamanlı dış istek, yanıt akışla
// okunur ve sınırda kesilir. Adres başına ayrı kota HTTP katmanındadır (http.ts).
//
// İmza: bulunan her kayıt, sürecin gizli anahtarıyla künye+bağlantı üzerinden imzalanır. Bologna araçları kaynağı
// "doğrulanmış" saymak için bu imzayı arar; asistan imzayı kendisi üretemez.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { kunyeBicimle } from "./kaynak.ts";
import { AracHatasi, arac, type Kaynak, KOD_KAYNAGI } from "./temel.ts";

export const IZINLI_HOSTLAR = ["api.crossref.org", "openlibrary.org", "www.googleapis.com"] as const;
export const ZAMAN_ASIMI_MS = 8000;
export const EN_BUYUK_YANIT = 1_000_000;
/** Çağrı başına en çok kaynak. */
export const EN_COK_KAYNAK = 5;
/** Süreç genelinde aynı anda en çok dış istek. */
export const ESZAMANLI_DIS_ISTEK = 4;

// ---------------------------------------------------------------- Eşzamanlılık sınırı (semafor)

let aktifIstek = 0;
const bekleyenler: (() => void)[] = [];

/** Süreç genelindeki dış istek semaforu. Sınır doluysa sıra bekler. */
export async function sinirli<T>(is: () => Promise<T>): Promise<T> {
  if (aktifIstek >= ESZAMANLI_DIS_ISTEK) await new Promise<void>((coz) => bekleyenler.push(coz));
  aktifIstek += 1;
  try {
    return await is();
  } finally {
    aktifIstek -= 1;
    bekleyenler.shift()?.();
  }
}

// ---------------------------------------------------------------- İmza

// Anahtar ilk kullanımda üretilir: modül tarayıcı araçlarına da (/deneyin) girer ve orada imza hiç kullanılmaz.
let imzaAnahtari: Buffer | undefined;
function anahtar(): Buffer {
  if (!imzaAnahtari) {
    const ortam = typeof process !== "undefined" ? process.env.AKREDIT_MCP_IMZA_ANAHTARI : undefined;
    imzaAnahtari = ortam && ortam.length >= 16 ? Buffer.from(ortam) : randomBytes(32);
  }
  return imzaAnahtari;
}

/** Katalog kaydının imzası: künye ve bağlantı üzerinden HMAC-SHA256 (ilk 32 onaltılık hane). */
export function kaynakImzasi(kunye: string, baglanti: string): string {
  return createHmac("sha256", anahtar()).update(`${kunye}\n${baglanti}`).digest("hex").slice(0, 32);
}

/** İmza bu sürecin kaynak_dogrula çıktısına mı ait? */
export function kaynakImzasiDogru(kunye: string, baglanti: string, imza: string): boolean {
  const beklenen = Buffer.from(kaynakImzasi(kunye, baglanti));
  const verilen = Buffer.from(String(imza));
  return beklenen.length === verilen.length && timingSafeEqual(beklenen, verilen);
}

const DOI_DESENI = /^10\.\d{4,9}\/[^\s]{1,200}$/u;

/** "https://doi.org/10.x/y", "doi:10.x/y" ya da "10.x/y" → "10.x/y". Geçersizse null. */
export function doiTemizle(d: string): string | null {
  const t = d
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//iu, "")
    .replace(/^doi:\s*/iu, "");
  return DOI_DESENI.test(t) ? t : null;
}

/** ISBN-10 ya da ISBN-13; tire ve boşluk atılır, denetim basamağı sınanır. Geçersizse null. */
export function isbnTemizle(i: string): string | null {
  const t = i.replace(/[\s-]/gu, "").toUpperCase();
  if (/^\d{13}$/u.test(t)) {
    // ISBN-13: basamaklar sırayla 1 ve 3 ile çarpılır, toplam 10'un katı olmalı.
    const top = [...t].reduce((s, c, k) => s + Number(c) * (k % 2 ? 3 : 1), 0);
    return top % 10 === 0 ? t : null;
  }
  if (/^\d{9}[\dX]$/u.test(t)) {
    // ISBN-10: basamaklar 10'dan 1'e ağırlıkla çarpılır (X = 10), toplam 11'in katı olmalı.
    const top = [...t].reduce((s, c, k) => s + (c === "X" ? 10 : Number(c)) * (10 - k), 0);
    return top % 11 === 0 ? t : null;
  }
  return null;
}

/** Karşılaştırma için sadeleştirme: küçük harf, Türkçe harfler düz, noktalama yok. */
export function sadele(s: string): string[] {
  return s
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/u)
    .filter((x) => x.length > 1);
}

/**
 * Sorgu başlığının sözcüklerinin en az %80'i bulunan başlıkta var mı, ve bulunanın en az %60'ı sorguda var mı.
 * Kısa (en çok iki sözcüklü) başlıklarda ("Veri Yapıları", "Genel Kimya") sözcük kümeleri birebir aynı olmalı.
 */
export function baslikEslesir(sorgu: string, bulunan: string): boolean {
  const a = [...new Set(sadele(sorgu))];
  const b = new Set(sadele(bulunan));
  if (!a.length || !b.size) return false;
  const ortak = a.filter((x) => b.has(x)).length;
  if (a.length <= 2) return ortak === a.length && b.size === a.length;
  return ortak / a.length >= 0.8 && ortak / b.size >= 0.6;
}

/**
 * Sorgudaki yazar soyadı (son sözcük ya da virgülden önceki kısım) bulunan yazarlardan birinde TAM belirteç olarak
 * geçiyor mu. Alt dize yetmez: "Yılmaz" sorgusu "Yılmazer" ile eşleşmez.
 */
export function yazarEslesir(sorgu: string, yazarlar: string[]): boolean {
  const soyad = sorgu.includes(",") ? (sorgu.split(",")[0] ?? "") : (sorgu.trim().split(/\s+/u).at(-1) ?? "");
  const s = sadele(soyad);
  if (!s.length) return false;
  return yazarlar.some((y) => {
    const b = new Set(sadele(y));
    return s.every((x) => b.has(x));
  });
}

// ---------------------------------------------------------------- Güvenli istek

async function getir(f: typeof fetch, adres: URL, hata?: () => void): Promise<unknown | null> {
  if (adres.protocol !== "https:" || !(IZINLI_HOSTLAR as readonly string[]).includes(adres.hostname))
    throw new Error("İzinsiz host");
  if (adres.hostname === "www.googleapis.com" && !adres.pathname.startsWith("/books/")) throw new Error("İzinsiz yol");
  if (adres.hostname === "openlibrary.org" && !OPENLIBRARY_YOLLARI.includes(adres.pathname))
    throw new Error("İzinsiz yol");
  return sinirli(async () => {
    let y: Response;
    try {
      y = await f(adres.toString(), {
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
        redirect: "error",
        headers: { accept: "application/json", "user-agent": "akredit-acik-mcp (https://akredit.org)" },
      });
    } catch {
      hata?.();
      return null;
    }
    if (!y.ok) {
      hata?.();
      return null;
    }
    const uzunluk = Number(y.headers.get("content-length") ?? "0");
    if (uzunluk > EN_BUYUK_YANIT) return null;
    const metin = await sinirliMetin(y, EN_BUYUK_YANIT);
    if (metin === null) return null;
    try {
      return JSON.parse(metin);
    } catch {
      return null;
    }
  });
}

/** Yanıt gövdesini bayt sayarak okur; sınır aşılırsa akışı iptal edip null döner. */
export async function sinirliMetin(y: Response, enBuyuk: number): Promise<string | null> {
  if (!y.body) return "";
  const okuyucu = y.body.getReader();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  try {
    for (;;) {
      const { done, value } = await okuyucu.read();
      if (done) break;
      toplam += value.byteLength;
      if (toplam > enBuyuk) {
        await okuyucu.cancel().catch(() => {});
        return null;
      }
      parcalar.push(value);
    }
  } catch {
    return null;
  }
  return Buffer.concat(parcalar).toString("utf8");
}

// ---------------------------------------------------------------- Katalog yanıtları (zod)

const CrossrefEser = z.object({
  DOI: z.string(),
  type: z.string().optional(),
  title: z.array(z.string()).optional(),
  author: z
    .array(z.object({ given: z.string().optional(), family: z.string().optional(), name: z.string().optional() }))
    .optional(),
  editor: z.array(z.object({ given: z.string().optional(), family: z.string().optional() })).optional(),
  "container-title": z.array(z.string()).optional(),
  publisher: z.string().optional(),
  volume: z.string().optional(),
  issue: z.string().optional(),
  page: z.string().optional(),
  issued: z.object({ "date-parts": z.array(z.array(z.number().nullable())).optional() }).optional(),
});
type CrossrefEserT = z.infer<typeof CrossrefEser>;
const CrossrefTek = z.object({ message: CrossrefEser });
const CrossrefListe = z.object({ message: z.object({ items: z.array(CrossrefEser) }) });

const OpenLibraryKitap = z.object({
  title: z.string(),
  url: z.string().optional(),
  authors: z.array(z.object({ name: z.string() })).optional(),
  publishers: z.array(z.object({ name: z.string() })).optional(),
  publish_date: z.string().optional(),
});
const OpenLibraryYanit = z.record(z.string(), OpenLibraryKitap);

const OpenLibraryAramaYanit = z.object({
  docs: z
    .array(
      z.object({
        key: z.string().regex(/^\/works\/OL\d+W$/u),
        title: z.string(),
        author_name: z.array(z.string()).optional(),
        publish_year: z.array(z.number().int()).optional(),
        publisher: z.array(z.string()).optional(),
        isbn: z.array(z.string()).optional(),
      }),
    )
    .optional(),
});

const GoogleCilt = z.object({
  id: z.string(),
  volumeInfo: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    authors: z.array(z.string()).optional(),
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
    industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
  }),
});
const GoogleYanit = z.object({ totalItems: z.number().optional(), items: z.array(GoogleCilt).optional() });
type GoogleCiltT = z.infer<typeof GoogleCilt>;

// ---------------------------------------------------------------- Künyeye çevirme

type KunyeGirdisi = Parameters<typeof kunyeBicimle>[0];

export type KayitTuru = "kitap" | "makale" | "kitap_bolumu" | "diger";

export interface Dogrulanmis {
  durum: "katalogda_bulundu";
  kunye: string;
  eksikler: string[];
  baglanti: string;
  katalog: "Crossref" | "Open Library" | "Google Books";
  kayitTuru: KayitTuru;
  baslik: string;
  yazarlar: string[];
  yil?: number | string;
  /** Neyle eşleşti: DOI, ISBN ya da başlık + tam soyad (+ yıl, tür). */
  kimlik_eslesmesi: { yontem: "doi" | "isbn" | "baslik_yazar"; denetlenen: string[] };
  /** Künyede eksik alan var mı (yayınevi, yıl...). Eksik alan [EKSİK] kalır. */
  bibliyografik_tamlik: "tam" | "eksik";
  /** Katalogda bulunmak, ders kaynağı olarak uygun olmak demek değildir. */
  ders_kaynagi_uygunlugu: "hoca karar verir";
  /** Bologna araçlarında doğrulanmış kaynak kanıtı. */
  imza: string;
}
export interface Dogrulanamadi {
  durum: "bulunamadi";
  neden: string;
  /** Hoca eseri kendisi biliyorsa yalnız "hoca_beyani" etiketiyle yazılabilir. */
  hocaBeyani: string;
}
export type DogrulamaSonucu = Dogrulanmis | Dogrulanamadi;

const HOCA_BEYANI =
  "Katalogda bulunamadı. Hoca bu eseri kendisi kullanıyorsa künyesini hocanın verdiği bilgiyle 'hoca_beyani' etiketiyle yazın; asistan künye alanı uydurmaz.";
const bulunamadi = (neden: string): Dogrulanamadi => ({ durum: "bulunamadi", neden, hocaBeyani: HOCA_BEYANI });

const yilAl = (s: string | undefined): number | undefined => {
  const m = s?.match(/\b(1[4-9]\d{2}|20\d{2}|2100)\b/u);
  return m ? Number(m[1]) : undefined;
};

const kur = (
  k: Omit<KunyeGirdisi, "kurumYazar" | "yazarlar" | "tur"> & { tur: KunyeGirdisi["tur"]; yazarlar: string[] },
  baglanti: string,
  katalog: Dogrulanmis["katalog"],
  kayitTuru: KayitTuru = k.tur === "makale" ? "makale" : k.tur === "kitap_bolumu" ? "kitap_bolumu" : "kitap",
): Dogrulanmis => {
  const g: KunyeGirdisi = { ...k, kurumYazar: false } as KunyeGirdisi;
  const { kunye, eksikler } = kunyeBicimle(g);
  return {
    durum: "katalogda_bulundu",
    kunye,
    eksikler,
    baglanti,
    katalog,
    kayitTuru,
    baslik: k.baslik,
    yazarlar: k.yazarlar,
    ...(k.yil !== undefined ? { yil: k.yil } : {}),
    kimlik_eslesmesi: { yontem: "baslik_yazar", denetlenen: [] },
    bibliyografik_tamlik: eksikler.length ? "eksik" : "tam",
    ders_kaynagi_uygunlugu: "hoca karar verir",
    imza: kaynakImzasi(kunye, baglanti),
  };
};

const CROSSREF_KITAP = new Set(["book", "monograph", "edited-book", "reference-book", "book-set", "book-series"]);
const crossrefTuru = (t: string | undefined): KayitTuru =>
  t === "journal-article"
    ? "makale"
    : t === "book-chapter" || t === "book-section" || t === "book-part"
      ? "kitap_bolumu"
      : t && CROSSREF_KITAP.has(t)
        ? "kitap"
        : "diger";

function crossrefKunye(e: CrossrefEserT): Dogrulanmis | null {
  const baslik = e.title?.[0]?.trim();
  if (!baslik) return null;
  const yazarlar = (e.author ?? [])
    .map((a) => (a.family ? [a.family, a.given].filter(Boolean).join(", ") : (a.name ?? "")))
    .filter(Boolean);
  const yil = e.issued?.["date-parts"]?.[0]?.[0] ?? undefined;
  const kap = e["container-title"]?.[0];
  const kayit = crossrefTuru(e.type);
  const tur: KunyeGirdisi["tur"] = kayit === "makale" ? "makale" : kayit === "kitap_bolumu" ? "kitap_bolumu" : "kitap";
  const doi = e.DOI;
  return kur(
    {
      tur,
      yazarlar,
      baslik,
      ...(yil ? { yil } : {}),
      ...(tur === "makale" && kap ? { dergi: kap } : {}),
      ...(tur === "kitap_bolumu" && kap ? { kitapBasligi: kap } : {}),
      ...(tur !== "makale" && e.publisher ? { yayinevi: e.publisher } : {}),
      ...(tur === "kitap_bolumu" && e.editor?.length
        ? {
            editorler: e.editor.map((x) => [x.family, x.given].filter(Boolean).join(", ")).filter((x) => x.length >= 2),
          }
        : {}),
      ...(e.volume ? { cilt: e.volume } : {}),
      ...(e.issue ? { sayi: e.issue } : {}),
      ...(e.page ? { sayfalar: e.page } : {}),
      doi,
    },
    `https://doi.org/${doi}`,
    "Crossref",
    kayit,
  );
}

function googleKunye(c: GoogleCiltT): Dogrulanmis {
  const v = c.volumeInfo;
  const yil = yilAl(v.publishedDate);
  return kur(
    {
      tur: "kitap",
      yazarlar: v.authors ?? [],
      baslik: v.subtitle ? `${v.title}: ${v.subtitle}` : v.title,
      ...(yil ? { yil } : {}),
      ...(v.publisher ? { yayinevi: v.publisher } : {}),
    },
    `https://books.google.com/books?id=${encodeURIComponent(c.id)}`,
    "Google Books",
  );
}

// ---------------------------------------------------------------- Sorgular

const CROSSREF = "https://api.crossref.org/works";
const OPENLIBRARY = "https://openlibrary.org/api/books";
const OPENLIBRARY_ARAMA = "https://openlibrary.org/search.json";
const OPENLIBRARY_YOLLARI = ["/api/books", "/search.json"];
const GOOGLE = "https://www.googleapis.com/books/v1/volumes";

type AranTur = "kitap" | "makale" | "kitap_bolumu" | "herhangi";

const KAYIT_ADI: Record<KayitTuru, string> = {
  kitap: "kitap",
  makale: "dergi makalesi",
  kitap_bolumu: "kitap bölümü",
  diger: "başka türde bir kayıt (bildiri, rapor...)",
};

/** Aranan tür ve yıl verildiyse kayıtla uyuşuyor mu; uyuşmuyorsa nedeni. */
function ekDenetim(k: Dogrulanmis, s: { tur?: AranTur | undefined; yil?: number | undefined }): string | null {
  if (s.tur && s.tur !== "herhangi" && k.kayitTuru !== s.tur)
    return `Katalogdaki kayıt ${KAYIT_ADI[k.kayitTuru]}; aranan ${KAYIT_ADI[s.tur]}. Aynı eser sayılmadı.`;
  if (s.yil !== undefined) {
    const y = typeof k.yil === "number" ? k.yil : yilAl(String(k.yil ?? ""));
    if (y === undefined) return "Katalog kaydında yıl yok; verilen yılla karşılaştırılamadı.";
    if (y !== s.yil) return `Katalogdaki yıl ${y}, verilen yıl ${s.yil}. Aynı baskı sayılmadı.`;
  }
  return null;
}

function sonla(
  k: Dogrulanmis | null,
  yontem: Dogrulanmis["kimlik_eslesmesi"]["yontem"],
  s: { tur?: AranTur | undefined; yil?: number | undefined },
  bulunamadiNedeni: string,
): DogrulamaSonucu {
  if (!k) return bulunamadi(bulunamadiNedeni);
  const sorun = ekDenetim(k, s);
  if (sorun) return bulunamadi(sorun);
  const denetlenen = [
    yontem === "doi" ? "DOI" : yontem === "isbn" ? "ISBN (sağlama basamağı geçerli)" : "başlık sözcükleri, tam soyad",
    ...(s.tur && s.tur !== "herhangi" ? ["kayıt türü"] : []),
    ...(s.yil !== undefined ? ["yıl"] : []),
  ];
  return { ...k, kimlik_eslesmesi: { yontem, denetlenen } };
}

async function doiIle(f: typeof fetch, doi: string): Promise<Dogrulanmis | null> {
  const y = CrossrefTek.safeParse(await getir(f, new URL(`${CROSSREF}/${encodeURIComponent(doi)}`)));
  return y.success ? crossrefKunye(y.data.message) : null;
}

async function isbnIle(f: typeof fetch, isbn: string): Promise<Dogrulanmis | null> {
  const ol = new URL(OPENLIBRARY);
  ol.searchParams.set("bibkeys", `ISBN:${isbn}`);
  ol.searchParams.set("format", "json");
  ol.searchParams.set("jscmd", "data");
  const o = OpenLibraryYanit.safeParse(await getir(f, ol));
  const kitap = o.success ? o.data[`ISBN:${isbn}`] : undefined;
  if (kitap) {
    const yil = yilAl(kitap.publish_date);
    const baglanti =
      kitap.url && /^https:\/\/openlibrary\.org\//u.test(kitap.url)
        ? kitap.url
        : `https://openlibrary.org/isbn/${isbn}`;
    return kur(
      {
        tur: "kitap",
        yazarlar: (kitap.authors ?? []).map((a) => a.name),
        baslik: kitap.title,
        ...(yil ? { yil } : {}),
        ...(kitap.publishers?.[0] ? { yayinevi: kitap.publishers[0].name } : {}),
      },
      baglanti,
      "Open Library",
    );
  }
  const g = new URL(GOOGLE);
  g.searchParams.set("q", `isbn:${isbn}`);
  const gy = GoogleYanit.safeParse(await getir(f, g));
  const c = gy.success
    ? gy.data.items?.find((x) =>
        (x.volumeInfo.industryIdentifiers ?? []).some((i) => i.identifier.replace(/-/gu, "") === isbn),
      )
    : undefined;
  return c ? googleKunye(c) : null;
}

/**
 * Başlık+yazar araması. Sıra: Crossref (makale), Open Library (kitap), Google Books (son çare).
 * Google'a ulaşılamazsa (kota, HTTP hatası) o katalog atlanır ve bu durum bildirilir.
 */
async function baslikIle(
  f: typeof fetch,
  baslik: string,
  yazar: string,
  s: { tur?: AranTur | undefined; yil?: number | undefined },
): Promise<{ k: Dogrulanmis | null; googleUlasilamadi: boolean }> {
  const uygun = (k: Dogrulanmis) =>
    baslikEslesir(baslik, k.baslik) && yazarEslesir(yazar, k.yazarlar) && ekDenetim(k, s) === null;
  const cr = new URL(CROSSREF);
  cr.searchParams.set("query.bibliographic", baslik);
  cr.searchParams.set("query.author", yazar);
  cr.searchParams.set("rows", "5");
  const cy = CrossrefListe.safeParse(await getir(f, cr));
  if (cy.success)
    for (const e of cy.data.message.items) {
      const k = crossrefKunye(e);
      if (k && uygun(k)) return { k, googleUlasilamadi: false };
    }
  if (s.tur === undefined || s.tur === "kitap" || s.tur === "herhangi") {
    const ol = new URL(OPENLIBRARY_ARAMA);
    ol.searchParams.set("title", baslik);
    ol.searchParams.set("author", yazar);
    ol.searchParams.set("limit", "10");
    ol.searchParams.set("fields", "key,title,author_name,publish_year,publisher,isbn");
    const oy = OpenLibraryAramaYanit.safeParse(await getir(f, ol));
    if (oy.success)
      for (const d of oy.data.docs ?? []) {
        // Yıl verildiyse kaydın baskı yılları (publish_year) arasında geçmeli; ilk yayın yılı tek başına yetmez.
        // Yıl verilmediyse künyeye yıl yazılmaz (hangi baskı olduğu bilinmez).
        const yil = s.yil !== undefined && (d.publish_year ?? []).includes(s.yil) ? s.yil : undefined;
        if (s.yil !== undefined && yil === undefined) continue;
        const k = kur(
          {
            tur: "kitap",
            yazarlar: d.author_name ?? [],
            baslik: d.title,
            ...(yil ? { yil } : {}),
            ...(d.publisher?.length === 1 && d.publisher[0] ? { yayinevi: d.publisher[0] } : {}),
          },
          `https://openlibrary.org${d.key}`,
          "Open Library",
        );
        if (uygun(k)) return { k, googleUlasilamadi: false };
      }
  }
  let googleUlasilamadi = false;
  const g = new URL(GOOGLE);
  g.searchParams.set("q", `intitle:${baslik} inauthor:${yazar}`);
  g.searchParams.set("maxResults", "5");
  const gy = GoogleYanit.safeParse(
    await getir(f, g, () => {
      googleUlasilamadi = true;
    }),
  );
  if (gy.success)
    for (const x of gy.data.items ?? []) {
      const k = googleKunye(x);
      if (baslikEslesir(baslik, x.volumeInfo.title) && uygun(k)) return { k, googleUlasilamadi: false };
    }
  return { k: null, googleUlasilamadi };
}

const KaynakSorgusu = z
  .object({
    doi: z.string().trim().max(250).optional(),
    isbn: z.string().trim().max(30).optional(),
    baslik: z.string().trim().min(2).max(300).optional(),
    yazar: z.string().trim().min(2).max(120).optional(),
    tur: z
      .enum(["kitap", "makale", "kitap_bolumu", "herhangi"])
      .optional()
      .describe("Aranan kayıt türü. Kitap aranıyorsa dergi makalesi kabul edilmez. ISBN verilirse varsayılan kitap."),
    yil: z.number().int().min(1400).max(2100).optional().describe("Biliniyorsa yayın yılı; kayıtla birebir uymalı"),
  })
  .refine((k) => k.doi || k.isbn || (k.baslik && k.yazar), {
    message: "DOI, ISBN ya da başlık ile yazar verin.",
  });
type KaynakSorgusuT = z.infer<typeof KaynakSorgusu>;

/** Tek kaynağı doğrular. DOI önce, sonra ISBN, sonra başlık+yazar. */
export async function kaynakDogrula(f: typeof fetch, k: KaynakSorgusuT): Promise<DogrulamaSonucu> {
  const ek = { tur: k.tur, yil: k.yil };
  if (k.doi) {
    const d = doiTemizle(k.doi);
    if (!d) return bulunamadi("DOI biçimi geçersiz (10.xxxx/... olmalı).");
    return sonla(await doiIle(f, d), "doi", ek, "Bu DOI Crossref kataloğunda bulunamadı.");
  }
  if (k.isbn) {
    const i = isbnTemizle(k.isbn);
    if (!i) return bulunamadi("ISBN geçersiz (sağlama basamağı tutmuyor).");
    return sonla(
      await isbnIle(f, i),
      "isbn",
      { ...ek, tur: k.tur ?? "kitap" },
      "Bu ISBN Open Library ve Google Books'ta bulunamadı.",
    );
  }
  const b = await baslikIle(f, k.baslik ?? "", k.yazar ?? "", ek);
  return sonla(
    b.k,
    "baslik_yazar",
    ek,
    b.googleUlasilamadi
      ? "Bu başlık ve yazarla (tam soyad, verildiyse tür ve yıl) eşleşen eser Crossref ve Open Library kataloglarında bulunamadı; Google Books'a ulaşılamadı (kota ya da bağlantı sorunu), orada aranamadı. Daha sonra yeniden deneyin ya da ISBN ile arayın."
      : "Bu başlık ve yazarla (tam soyad, verildiyse tür ve yıl) eşleşen eser Crossref, Open Library ve Google Books kataloglarında bulunamadı. Türkçe kitapların çoğu bu kataloglarda yoktur.",
  );
}

const KATALOG_KAYNAKLARI: Kaynak[] = [
  { ad: "Crossref REST API", adres: "https://api.crossref.org" },
  { ad: "Open Library Books API", adres: "https://openlibrary.org/developers/api" },
  { ad: "Open Library Search API", adres: "https://openlibrary.org/dev/docs/api/search" },
  { ad: "Google Books API", adres: "https://developers.google.com/books" },
];

export const kaynakDogrulaAraci = arac({
  ad: "kaynak_dogrula",
  baslik: "Kaynağın gerçekten var olduğunu doğrula",
  aciklama:
    "DOI, ISBN ya da başlık ile yazar verilen eserleri (çağrı başına en çok 5) açık kataloglarda (Crossref, Open Library, Google Books) arar. Eşleşme için tam soyad, başlık sözcükleri, verildiyse kayıt türü ve yıl denetlenir. Bulursa katalogdaki bilgiden künye, bağlantı ve imza döndürür ('katalogda_bulundu'); bulamazsa 'bulunamadi' der. Katalogda bulunmak ders kaynağı olarak uygunluk demek değildir; ona hoca karar verir.",
  sonrakiAdim:
    "Yalnız 'katalogda_bulundu' olan kaynakları hocaya künyesi ve bağlantısıyla gösterin; uygunluğuna hoca karar verir. Bologna araçlarına kaynağı { kunye, dogrulama: { durum, baglanti, imza } } olarak aynen verin. 'bulunamadi' dönerse hocaya 'ne yapayım' diye sormayın: kendi web aramanızla aynı konuda en çok 2 başka aday (ISBN ya da DOI ile) bulup bu aracı bir kez daha çağırın; yine bulunamazsa alanı 'EKSİK: ders kaynağı' bırakıp akışı sürdürün, son özette sorun. 'bulunamadi' olan kaynağı asla kendiniz önermeyin; hoca o eseri kullandığını söylerse yalnız hocanın verdiği bilgiyle dogrulama: 'hoca_beyani' olarak yazın.",
  kunyeAlanlari: ["kaynaklar"],
  disAg: true,
  // Künye ve katalog numaraları kişisel veri değildir; ISBN gibi uzun sayılar numara deseniyle karışmasın.
  kisiselVeriKapsami: "yok",
  girdi: z.object({
    kaynaklar: z.array(KaynakSorgusu).min(1).max(EN_COK_KAYNAK),
  }),
  calistir: async ({ kaynaklar }, b) => {
    const f = b.fetch ?? globalThis.fetch;
    if (!f) throw new AracHatasi("Bu ortamda dış katalog sorgusu yapılamıyor. Kaynakları şimdilik önermeyin.");
    const sonuclar = await Promise.all(kaynaklar.map((k) => kaynakDogrula(f, k)));
    const liste = sonuclar.map((s, i) => ({ no: i + 1, ...s }));
    const bulunan = liste.filter((s) => s.durum === "katalogda_bulundu").length;
    return {
      sonuc: {
        kaynaklar: liste,
        katalogdaBulunan: bulunan,
        bulunamayan: liste.length - bulunan,
        kural:
          "Katalogda bulunmayan kaynak asistanca önerilmez; hoca kullandığını söylerse 'hoca_beyani' etiketiyle yazılır. Künye katalog bilgisinden kurulur; katalogda olmayan alan [EKSİK] kalır. Ders kaynağı olarak uygunluğa hoca karar verir.",
      },
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/kaynak-dogrula.ts", "Akredit kaynak doğrulayıcı"), ...KATALOG_KAYNAKLARI],
    };
  },
});
