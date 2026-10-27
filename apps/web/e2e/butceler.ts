// Performans bütçeleri (İP-31). Ölçüm koşulu: soğuk önbellek, gzip'li yanıt, "yavaş 4G" ağ öykünmesi
// (1,6 Mbit/sn indirme, 750 kbit/sn yükleme, 150 ms gidiş-dönüş) ve 4 kat yavaşlatılmış işlemci; 360×740 telefon.
// Değerler ilk ölçümden (docs/denetim/performans.md) pay bırakılarak seçildi. Bir bütçe aşılırsa e2e kalır;
// bütçeyi gevşetmek yerine önce sayfanın neden büyüdüğüne bakılır.

export interface Butce {
  /** Sıkıştırılmış JavaScript aktarımı (KB). */
  jsKb: number;
  /** Sıkıştırılmış CSS aktarımı (KB). */
  cssKb: number;
  /** Toplam aktarım (KB): belge, betik, stil, yazı tipi, görsel. */
  toplamKb: number;
  /** Largest Contentful Paint (ms), yavaş 4G + 4× işlemci. */
  lcpMs: number;
  /** Cumulative Layout Shift. */
  cls: number;
  /** Toplam engelleme süresi (ms): 50 ms'yi aşan uzun görevlerin aşan kısımlarının toplamı. */
  tbtMs: number;
  /** DOM öğe sayısı. */
  domOgesi: number;
}

/** Genel bütçe: Core Web Vitals "iyi" eşikleri (LCP 2,5 sn, CLS 0,1) ve TBT 300 ms. */
// İlk ölçümde (2026-10-27) en büyük değerler: JS 169 KB, CSS 7 KB, toplam 313 KB, LCP 0,83 sn, CLS 0, TBT 280 ms.
export const GENEL: Butce = { jsKb: 200, cssKb: 12, toplamKb: 350, lcpMs: 2500, cls: 0.1, tbtMs: 300, domOgesi: 1500 };

/** Bilinçli olarak büyük sayfalar; gerekçesi yanlarında. */
export const ISTISNALAR: Record<string, Partial<Butce>> = {
  // Onay kutusu bekleyen bütün önerileri (örnekte 42) kanıt atıflarıyla birlikte tek sayfada gösterir.
  // Sayfalama İP-13 arka ucuyla gelecek; o zamana dek DOM bütçesi geniş tutulur (ölçüm: 2615 öğe).
  "/panel/onaylar": { domOgesi: 3500 },
};

export function butce(yol: string): Butce {
  return { ...GENEL, ...ISTISNALAR[yol] };
}

/** Bütçesi CI'da denetlenen sayfalar: tanıtım sitesinin girişi, panelin her ana sayfası, portal. */
export const BUTCE_SAYFALARI = [
  "/",
  "/nasil-calisir",
  "/giris",
  "/panel",
  "/panel/onaylar",
  "/panel/kanitlar",
  "/panel/kanitlar/kanit-01",
  "/panel/programlar/prog-bp",
  "/panel/dersler/ders-bp101",
  "/panel/raporlar/rapor-odr",
  "/panel/surecler",
  "/panel/gostergeler",
  "/panel/ayarlar",
  "/degerlendirici",
];
