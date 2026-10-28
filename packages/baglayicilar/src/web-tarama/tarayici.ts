// Kurum sitesi tarayıcısı (İP-37). Kurumun kendi web sitesinde kanıt olabilecek sayfa ve belgeleri bulur.
//
// Sınırlar (kodla uygulanır):
// - Yalnız kurumun alan adı ve alt alan adları. Başka alan adına giden bağlantı izlenmez, yönlendirme izlenmez.
// - robots.txt'ye uyulur (her köken için ayrı okunur; okunamazsa (5xx/ağ) o kökende hiçbir sayfa alınmaz,
//   404 ise kısıt yok sayılır). `Crawl-delay` aralıktan uzunsa o kullanılır.
// - İstekler arası en az 1 sn (daha kısa ayar kabul edilmez). Derinlik (en çok 4) ve sayfa (en çok 500) sınırı.
// - Yalnız HTML, PDF ve DOCX alınır; uzantısı başka türü gösteren adres hiç istenmez, yanıt türü başka
//   çıkarsa atılır. Boyut sınırı aşılırsa atılır.
// - Giriş bilgisi gerektiren sayfalar alınmaz (401/403), adreste kullanıcı adı/parola olan bağlantı izlenmez.
//
// Çıktı kanıt hattına gider (`BaglayiciKanitGirdisi`): dosya baytları, adres, erişim zamanı ve SHA-256. Sayfa
// metni burada hiçbir modele gitmez; `kaynakAyrinti.guvenilmeyen = true` işaretiyle, metni sonradan okuyan her
// YZ işinin onu talimat değil veri olarak (istem kalkanıyla) ele alması gerektiği kayda geçer (ilke 5).

import { ozetHesapla } from "@akredit/cekirdek";
import type { DisBaglam } from "../baglayici.ts";
import { KULLANICI_AJANI } from "../bologna-proliz/oku.ts";
import type { BaglayiciKanitGirdisi } from "../ebys/kanit.ts";
import { type RobotsKurallari, robotsAyristir, robotsIzinli } from "./robots.ts";

export const EN_AZ_ARALIK_MS = 1000;
export const EN_COK_DERINLIK = 4;
export const EN_COK_SAYFA = 500;
const VARSAYILAN_BOYUT = 20 * 1024 * 1024;

export type TaranmisTur = "html" | "pdf" | "docx";

const MIME: Record<TaranmisTur, string> = {
  html: "text/html",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export interface TaramaAyari {
  /** Başlangıç adresi; kurumun alan adında olmalı. */
  baslangic: string;
  /** Kurumun alan adı (ör. "ornek.edu.tr"). Alt alan adları da taranır. */
  alanAdi: string;
  /** Başlangıçtan en çok kaç bağlantı ileri gidilir (0: yalnız başlangıç). Varsayılan 2. */
  derinlik?: number;
  /** En çok kaç adres istenir (robots.txt hariç). Varsayılan 50. */
  enCokSayfa?: number;
  /** İstekler arası en az süre (ms). 1000'den küçük değer 1000 sayılır. */
  aralikMs?: number;
  /** Tek dosyanın en büyük boyutu (bayt). */
  enBuyukBoyut?: number;
  /** HTML sayfaları da kanıt adayı olsun mu? Varsayılan evet (ör. kalite komisyonu sayfası). */
  htmlKanit?: boolean;
}

export interface TaranmisBelge extends BaglayiciKanitGirdisi {
  kaynakTuru: "baglayici";
  adres: string;
  erisim: string;
  ozet: string;
  tur: TaranmisTur;
  derinlik: number;
  kaynakAyrinti: {
    tur: "web_tarama";
    adres: string;
    erisim: string;
    ozet: string;
    derinlik: number;
    guvenilmeyen: true;
  };
}

export interface AtlananAdres {
  adres: string;
  neden: "robots" | "alan_disi" | "tur" | "boyut" | "http" | "ag" | "giris_gerekli" | "sinir" | "yonlendirme";
}

export interface TaramaSonucu {
  belgeler: TaranmisBelge[];
  atlanan: AtlananAdres[];
  /** robots.txt dahil yapılan istek sayısı. */
  istekSayisi: number;
}

export class TaramaHatasi extends Error {}

/** Adres kurumun alan adında mı (alt alan adları dahil)? */
export function alanIcinde(adres: URL, alanAdi: string): boolean {
  const a = alanAdi.toLowerCase().replace(/^\.+|\.+$/gu, "");
  const m = adres.hostname.toLowerCase();
  return m === a || m.endsWith(`.${a}`);
}

const ATLANAN_UZANTI =
  /\.(jpe?g|png|gif|svg|webp|ico|bmp|tiff?|mp[34]|avi|mov|wmv|webm|zip|rar|7z|gz|tar|exe|msi|dmg|iso|css|js|json|xml|xlsx?|pptx?|doc|ppt|odt|ods|odp|txt|csv|rss|woff2?|ttf|eot)$/iu;

/** Uzantıdan tür tahmini; HTML sayfalarının çoğu uzantısızdır. Bilinen başka tür ise null. */
export function uzantidanTur(u: URL): TaranmisTur | "bilinmiyor" | null {
  const yol = u.pathname.toLowerCase();
  if (yol.endsWith(".pdf")) return "pdf";
  if (yol.endsWith(".docx")) return "docx";
  if (/\.(html?|aspx?|php|jsp)$/u.test(yol)) return "html";
  if (ATLANAN_UZANTI.test(yol)) return null;
  return "bilinmiyor";
}

function icerikTuru(baslik: string | null, u: URL): TaranmisTur | null {
  const t = (baslik ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (t === "text/html" || t === "application/xhtml+xml") return "html";
  if (t === "application/pdf") return "pdf";
  if (t === MIME.docx) return "docx";
  // Bazı sunucular belgeyi genel türle gönderir; o zaman uzantıya bakılır.
  if (t === "" || t === "application/octet-stream") {
    const x = uzantidanTur(u);
    return x === "pdf" || x === "docx" || x === "html" ? x : null;
  }
  return null;
}

/** Adresi normalleştirir: parça (#) atılır, giriş bilgili ya da http(s) olmayan adres reddedilir. */
export function adresNormallestir(ham: string, taban?: URL): URL | null {
  let u: URL;
  try {
    u = new URL(ham.trim(), taban);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  u.hash = "";
  return u;
}

const HTML_VARLIK: Record<string, string> = { "&amp;": "&", "&#38;": "&", "&quot;": '"', "&#39;": "'" };

/** HTML'den <a href> bağlantıları (betik ve yorum içindekiler hariç). */
export function baglantilar(html: string, taban: URL): URL[] {
  const temiz = html.replace(/<!--[\s\S]*?-->/gu, "").replace(/<script\b[\s\S]*?<\/script>/giu, "");
  const sonuc: URL[] = [];
  for (const m of temiz.matchAll(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/giu)) {
    const ham = (m[2] ?? m[3] ?? m[4] ?? "").replace(/&(amp|#38|quot|#39);/gu, (x) => HTML_VARLIK[x] ?? x);
    const u = adresNormallestir(ham, taban);
    if (u) sonuc.push(u);
  }
  return sonuc;
}

/** Sayfanın "nofollow" meta etiketi var mı? */
function nofollow(html: string): boolean {
  return /<meta[^>]+name\s*=\s*["']?robots["']?[^>]+content\s*=\s*["'][^"']*nofollow/iu.test(html);
}

/**
 * Siteyi tarar. Ağ, saat ve bekleme bağlamdan gelir (testte sahte bağlam). Hata fırlatmaz; alınamayan
 * adresler `atlanan` listesinde nedeniyle döner. Başlangıç adresi alan dışındaysa `TaramaHatasi`.
 */
export async function siteTara(baglam: DisBaglam, ayar: TaramaAyari): Promise<TaramaSonucu> {
  const bas = adresNormallestir(ayar.baslangic);
  if (!bas) throw new TaramaHatasi("Başlangıç adresi geçersiz. Tam adresi (https://…) yazın.");
  if (!alanIcinde(bas, ayar.alanAdi))
    throw new TaramaHatasi("Başlangıç adresi kurumun alan adında değil. Yalnız kurumun kendi sitesi taranır.");
  const derinlikSiniri = Math.max(0, Math.min(ayar.derinlik ?? 2, EN_COK_DERINLIK));
  const sayfaSiniri = Math.max(1, Math.min(ayar.enCokSayfa ?? 50, EN_COK_SAYFA));
  const enBuyuk = ayar.enBuyukBoyut ?? VARSAYILAN_BOYUT;
  const htmlKanit = ayar.htmlKanit ?? true;
  let aralik = Math.max(EN_AZ_ARALIK_MS, ayar.aralikMs ?? EN_AZ_ARALIK_MS);

  const belgeler: TaranmisBelge[] = [];
  const atlanan: AtlananAdres[] = [];
  const gorulen = new Set<string>();
  const kuyruk: { u: URL; d: number }[] = [{ u: bas, d: 0 }];
  const robots = new Map<string, RobotsKurallari | "yasak">();
  const ozetler = new Set<string>();
  let istekSayisi = 0;
  let sonIstek: number | null = null;
  let sayfaSayisi = 0;

  const bekle = async () => {
    const simdi = baglam.simdi().getTime();
    if (sonIstek !== null) {
      const kalan = sonIstek + aralik - simdi;
      if (kalan > 0) await baglam.bekle(kalan);
    }
    sonIstek = baglam.simdi().getTime();
  };

  const getir = async (u: URL): Promise<Response | null> => {
    await bekle();
    istekSayisi++;
    try {
      return await baglam.fetch(u.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { "User-Agent": KULLANICI_AJANI },
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      return null;
    }
  };

  const robotsAl = async (u: URL): Promise<RobotsKurallari | "yasak"> => {
    const var_ = robots.get(u.origin);
    if (var_) return var_;
    const y = await getir(new URL("/robots.txt", u.origin));
    let k: RobotsKurallari | "yasak";
    if (!y || y.status >= 500) k = "yasak";
    else if (y.status >= 400) k = { kurallar: [], bekleme: null };
    else k = robotsAyristir(await y.text(), KULLANICI_AJANI);
    if (k !== "yasak" && k.bekleme !== null) aralik = Math.max(aralik, k.bekleme * 1000);
    robots.set(u.origin, k);
    return k;
  };

  while (kuyruk.length) {
    const { u, d } = kuyruk.shift() as { u: URL; d: number };
    const anahtar = u.toString();
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    if (!alanIcinde(u, ayar.alanAdi)) {
      atlanan.push({ adres: anahtar, neden: "alan_disi" });
      continue;
    }
    const uzanti = uzantidanTur(u);
    if (uzanti === null) {
      atlanan.push({ adres: anahtar, neden: "tur" });
      continue;
    }
    if (sayfaSayisi >= sayfaSiniri) {
      atlanan.push({ adres: anahtar, neden: "sinir" });
      continue;
    }
    const kural = await robotsAl(u);
    if (kural === "yasak" || !robotsIzinli(kural, u.pathname + u.search)) {
      atlanan.push({ adres: anahtar, neden: "robots" });
      continue;
    }
    sayfaSayisi++;
    const y = await getir(u);
    if (!y) {
      atlanan.push({ adres: anahtar, neden: "ag" });
      continue;
    }
    if (y.status >= 300 && y.status < 400) {
      // Yönlendirme izlenmez: hedef alan içindeyse ayrı adres olarak kuyruğa girer (aynı sınırlarla).
      const hedef = adresNormallestir(y.headers.get("location") ?? "", u);
      if (hedef && alanIcinde(hedef, ayar.alanAdi)) kuyruk.push({ u: hedef, d });
      atlanan.push({ adres: anahtar, neden: "yonlendirme" });
      continue;
    }
    if (y.status === 401 || y.status === 403) {
      atlanan.push({ adres: anahtar, neden: "giris_gerekli" });
      continue;
    }
    if (!y.ok) {
      atlanan.push({ adres: anahtar, neden: "http" });
      continue;
    }
    const tur = icerikTuru(y.headers.get("content-type"), u);
    if (!tur) {
      atlanan.push({ adres: anahtar, neden: "tur" });
      continue;
    }
    const uzunluk = Number(y.headers.get("content-length") ?? "0");
    if (uzunluk > enBuyuk) {
      atlanan.push({ adres: anahtar, neden: "boyut" });
      continue;
    }
    const veri = new Uint8Array(await y.arrayBuffer());
    if (veri.byteLength > enBuyuk) {
      atlanan.push({ adres: anahtar, neden: "boyut" });
      continue;
    }
    const erisim = baglam.simdi().toISOString();
    if (tur === "html") {
      const html = new TextDecoder().decode(veri);
      if (d < derinlikSiniri && !nofollow(html))
        for (const b of baglantilar(html, u)) if (!gorulen.has(b.toString())) kuyruk.push({ u: b, d: d + 1 });
      if (!htmlKanit) continue;
    }
    const ozet = ozetHesapla(veri);
    if (ozetler.has(ozet)) continue;
    ozetler.add(ozet);
    const dosyaAdi = dosyaAdiCikar(u, tur);
    belgeler.push({
      veri,
      dosyaAdi,
      mime: MIME[tur],
      kaynakTuru: "baglayici",
      adres: anahtar,
      erisim,
      ozet,
      tur,
      derinlik: d,
      kaynakAyrinti: { tur: "web_tarama", adres: anahtar, erisim, ozet, derinlik: d, guvenilmeyen: true },
    });
    baglam.ilerleme?.(`${belgeler.length} belge bulundu`);
  }
  return { belgeler, atlanan, istekSayisi };
}

function dosyaAdiCikar(u: URL, tur: TaranmisTur): string {
  const son = decodeURIComponent(u.pathname.split("/").filter(Boolean).at(-1) ?? "");
  const temiz = (son || u.hostname).replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 120);
  if (tur === "html") return /\.html?$/iu.test(temiz) ? temiz : `${temiz}.html`;
  return temiz.toLowerCase().endsWith(`.${tur}`) ? temiz : `${temiz}.${tur}`;
}
