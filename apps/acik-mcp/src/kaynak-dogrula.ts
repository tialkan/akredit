// Kaynak doğrulama: DOI, ISBN ya da başlık+yazar ile eserin gerçekten var olduğunu açık kataloglardan denetler.
// Yalnız sabit, izinli hostlara sorar (api.crossref.org, openlibrary.org, www.googleapis.com/books). Ağ adresi
// kullanıcıdan alınmaz; kullanıcı girdisi yalnız doğrulanmış DOI, ISBN ya da sorgu parametresi olarak, kodlanarak
// adrese girer (SSRF yok). Her istekte zaman aşımı ve yanıt boyutu sınırı vardır, yanıt zod ile doğrulanır.
//
// Uydurma yok: künye yalnız katalog yanıtındaki alanlardan kurulur ve kaynak_bicimle biçimiyle yazılır. Başlık
// ve yazarla aramada eşleşme deterministik bir benzerlik denetiminden geçmezse sonuç "doğrulanamadı"dır; istem o
// eserin asla önerilmemesini söyler.

import { z } from "zod";
import { kunyeBicimle } from "./kaynak.ts";
import { AracHatasi, arac, type Kaynak, KOD_KAYNAGI } from "./temel.ts";

export const IZINLI_HOSTLAR = ["api.crossref.org", "openlibrary.org", "www.googleapis.com"] as const;
export const ZAMAN_ASIMI_MS = 8000;
export const EN_BUYUK_YANIT = 1_000_000;

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

/** Sorgu başlığının sözcüklerinin en az %80'i bulunan başlıkta var mı, ve bulunanın en az %60'ı sorguda var mı. */
export function baslikEslesir(sorgu: string, bulunan: string): boolean {
  const a = sadele(sorgu);
  const b = new Set(sadele(bulunan));
  if (!a.length || !b.size) return false;
  const ortak = a.filter((x) => b.has(x)).length;
  return ortak / a.length >= 0.8 && ortak / b.size >= 0.6;
}

/** Sorgudaki yazar soyadı (son sözcük ya da virgülden önceki kısım) bulunan yazarlardan birinde geçiyor mu. */
export function yazarEslesir(sorgu: string, yazarlar: string[]): boolean {
  const soyad = sorgu.includes(",") ? (sorgu.split(",")[0] ?? "") : (sorgu.trim().split(/\s+/u).at(-1) ?? "");
  const s = sadele(soyad).join(" ");
  if (!s) return false;
  return yazarlar.some((y) => sadele(y).join(" ").includes(s));
}

// ---------------------------------------------------------------- Güvenli istek

async function getir(f: typeof fetch, adres: URL): Promise<unknown | null> {
  if (adres.protocol !== "https:" || !(IZINLI_HOSTLAR as readonly string[]).includes(adres.hostname))
    throw new Error("İzinsiz host");
  if (adres.hostname === "www.googleapis.com" && !adres.pathname.startsWith("/books/")) throw new Error("İzinsiz yol");
  let y: Response;
  try {
    y = await f(adres.toString(), {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      redirect: "error",
      headers: { accept: "application/json", "user-agent": "akredit-acik-mcp (https://akredit.org)" },
    });
  } catch {
    return null;
  }
  if (!y.ok) return null;
  const uzunluk = Number(y.headers.get("content-length") ?? "0");
  if (uzunluk > EN_BUYUK_YANIT) return null;
  const metin = await y.text();
  if (metin.length > EN_BUYUK_YANIT) return null;
  try {
    return JSON.parse(metin);
  } catch {
    return null;
  }
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

export interface Dogrulanmis {
  durum: "dogrulandi";
  kunye: string;
  eksikler: string[];
  baglanti: string;
  katalog: "Crossref" | "Open Library" | "Google Books";
  baslik: string;
  yazarlar: string[];
  yil?: number | string;
}
export interface Dogrulanamadi {
  durum: "dogrulanamadi";
  neden: string;
}
export type DogrulamaSonucu = Dogrulanmis | Dogrulanamadi;

const yilAl = (s: string | undefined): number | undefined => {
  const m = s?.match(/\b(1[4-9]\d{2}|20\d{2}|2100)\b/u);
  return m ? Number(m[1]) : undefined;
};

const kur = (
  k: Omit<KunyeGirdisi, "kurumYazar" | "yazarlar" | "tur"> & { tur: KunyeGirdisi["tur"]; yazarlar: string[] },
  baglanti: string,
  katalog: Dogrulanmis["katalog"],
): Dogrulanmis => {
  const g: KunyeGirdisi = { ...k, kurumYazar: false } as KunyeGirdisi;
  const { kunye, eksikler } = kunyeBicimle(g);
  return {
    durum: "dogrulandi",
    kunye,
    eksikler,
    baglanti,
    katalog,
    baslik: k.baslik,
    yazarlar: k.yazarlar,
    ...(k.yil !== undefined ? { yil: k.yil } : {}),
  };
};

function crossrefKunye(e: CrossrefEserT): Dogrulanmis | null {
  const baslik = e.title?.[0]?.trim();
  if (!baslik) return null;
  const yazarlar = (e.author ?? [])
    .map((a) => (a.family ? [a.family, a.given].filter(Boolean).join(", ") : (a.name ?? "")))
    .filter(Boolean);
  const yil = e.issued?.["date-parts"]?.[0]?.[0] ?? undefined;
  const kap = e["container-title"]?.[0];
  const tur: KunyeGirdisi["tur"] =
    e.type === "journal-article" ? "makale" : e.type === "book-chapter" ? "kitap_bolumu" : "kitap";
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
const GOOGLE = "https://www.googleapis.com/books/v1/volumes";

async function doiIle(f: typeof fetch, doi: string): Promise<DogrulamaSonucu> {
  const y = CrossrefTek.safeParse(await getir(f, new URL(`${CROSSREF}/${encodeURIComponent(doi)}`)));
  const k = y.success ? crossrefKunye(y.data.message) : null;
  return k ?? { durum: "dogrulanamadi", neden: "Bu DOI Crossref kataloğunda bulunamadı." };
}

async function isbnIle(f: typeof fetch, isbn: string): Promise<DogrulamaSonucu> {
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
  return c ? googleKunye(c) : { durum: "dogrulanamadi", neden: "Bu ISBN Open Library ve Google Books'ta bulunamadı." };
}

async function baslikIle(f: typeof fetch, baslik: string, yazar: string): Promise<DogrulamaSonucu> {
  const g = new URL(GOOGLE);
  g.searchParams.set("q", `intitle:${baslik} inauthor:${yazar}`);
  g.searchParams.set("maxResults", "5");
  const gy = GoogleYanit.safeParse(await getir(f, g));
  const c = gy.success
    ? gy.data.items?.find(
        (x) => baslikEslesir(baslik, x.volumeInfo.title) && yazarEslesir(yazar, x.volumeInfo.authors ?? []),
      )
    : undefined;
  if (c) return googleKunye(c);
  const cr = new URL(CROSSREF);
  cr.searchParams.set("query.bibliographic", baslik);
  cr.searchParams.set("query.author", yazar);
  cr.searchParams.set("rows", "5");
  const cy = CrossrefListe.safeParse(await getir(f, cr));
  if (cy.success)
    for (const e of cy.data.message.items) {
      const k = crossrefKunye(e);
      if (k && baslikEslesir(baslik, k.baslik) && yazarEslesir(yazar, k.yazarlar)) return k;
    }
  return {
    durum: "dogrulanamadi",
    neden: "Bu başlık ve yazarla eşleşen eser Google Books ve Crossref kataloglarında bulunamadı.",
  };
}

const KaynakSorgusu = z
  .object({
    doi: z.string().trim().max(250).optional(),
    isbn: z.string().trim().max(30).optional(),
    baslik: z.string().trim().min(2).max(300).optional(),
    yazar: z.string().trim().min(2).max(120).optional(),
  })
  .refine((k) => k.doi || k.isbn || (k.baslik && k.yazar), {
    message: "DOI, ISBN ya da başlık ile yazar verin.",
  });
type KaynakSorgusuT = z.infer<typeof KaynakSorgusu>;

/** Tek kaynağı doğrular. DOI önce, sonra ISBN, sonra başlık+yazar. */
export async function kaynakDogrula(f: typeof fetch, k: KaynakSorgusuT): Promise<DogrulamaSonucu> {
  if (k.doi) {
    const d = doiTemizle(k.doi);
    if (!d) return { durum: "dogrulanamadi", neden: "DOI biçimi geçersiz (10.xxxx/... olmalı)." };
    return doiIle(f, d);
  }
  if (k.isbn) {
    const i = isbnTemizle(k.isbn);
    if (!i) return { durum: "dogrulanamadi", neden: "ISBN geçersiz (denetim basamağı tutmuyor)." };
    return isbnIle(f, i);
  }
  return baslikIle(f, k.baslik ?? "", k.yazar ?? "");
}

const KATALOG_KAYNAKLARI: Kaynak[] = [
  { ad: "Crossref REST API", adres: "https://api.crossref.org" },
  { ad: "Open Library Books API", adres: "https://openlibrary.org/developers/api" },
  { ad: "Google Books API", adres: "https://developers.google.com/books" },
];

export const kaynakDogrulaAraci = arac({
  ad: "kaynak_dogrula",
  baslik: "Kaynağın gerçekten var olduğunu doğrula",
  aciklama:
    "DOI, ISBN ya da başlık ile yazar verilen eserleri açık kataloglarda (Crossref, Open Library, Google Books) arar. Bulursa katalogdaki bilgiden künye ve açılabilir bağlantı döndürür; bulamazsa 'doğrulanamadı' der. Önerilecek her kaynak önce bu araçtan geçer.",
  sonrakiAdim:
    "Yalnız durumu 'dogrulandi' olan kaynakları hocaya künyesi ve bağlantısıyla numaralı seçenek olarak gösterin. 'dogrulanamadi' olan kaynağı asla önermeyin, künyesini yazmayın; yerine başka bir aday arayıp yeniden doğrulayın.",
  kunyeAlanlari: ["kaynaklar"],
  disAg: true,
  // Künye ve katalog numaraları kişisel veri değildir; ISBN gibi uzun sayılar numara deseniyle karışmasın.
  kisiselVeriKapsami: "yok",
  girdi: z.object({
    kaynaklar: z.array(KaynakSorgusu).min(1).max(10),
  }),
  calistir: async ({ kaynaklar }, b) => {
    const f = b.fetch ?? globalThis.fetch;
    if (!f) throw new AracHatasi("Bu ortamda dış katalog sorgusu yapılamıyor. Kaynakları şimdilik önermeyin.");
    const sonuclar = await Promise.all(kaynaklar.map((k) => kaynakDogrula(f, k)));
    const liste = sonuclar.map((s, i) => ({ no: i + 1, ...s }));
    const dogrulanan = liste.filter((s) => s.durum === "dogrulandi").length;
    return {
      sonuc: {
        kaynaklar: liste,
        dogrulanan,
        dogrulanamayan: liste.length - dogrulanan,
        kural:
          "Doğrulanamayan kaynak önerilmez. Künye katalog bilgisinden kurulur; katalogda olmayan alan [EKSİK] kalır.",
      },
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/kaynak-dogrula.ts", "Akredit kaynak doğrulayıcı"), ...KATALOG_KAYNAKLARI],
    };
  },
});
