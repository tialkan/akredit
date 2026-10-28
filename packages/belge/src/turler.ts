// @akredit/belge veri sözleşmesi. Tüketenler: kanıt hattı (apps/isci), bağlayıcılar (not aktarımı), rapor üretimi.

import type { Capa, Ozet } from "@akredit/cekirdek";

export type BelgeTuru =
  | "pdf"
  | "docx"
  | "xlsx"
  | "csv"
  | "pptx"
  | "odt"
  | "ods"
  | "html"
  | "metin"
  | "json"
  | "gorsel"
  | "bilinmiyor";

export interface BelgeIpucu {
  /** Özgün dosya adı (uzantı türü tahmin etmeye yardım eder). */
  ad?: string;
  mime?: string;
}

/** Belgeden çıkan, çapası belli bir metin bölümü (PDF sayfası, Word başlığı altı, slayt). */
export interface BelgeBolumu {
  capa: Capa;
  baslik?: string;
  /** Başlık düzeyi (1 en üst). */
  duzey?: number;
  metin: string;
}

export type HucreDegeri = string | number | null;

export interface Tablo {
  capa: Capa;
  ad?: string;
  satirlar: HucreDegeri[][];
}

export interface BelgeMetni {
  tur: BelgeTuru;
  ozet: Ozet;
  bolumler: BelgeBolumu[];
  tablolar: Tablo[];
  /** Metin katmanı olmayan taranmış belge ya da görsel: OCR kuyruğuna gider. */
  ocrGerekli: boolean;
  /** Kullanıcıya gösterilebilir Türkçe uyarılar. */
  uyarilar: string[];
  sayfaSayisi?: number;
}

/** Elektronik tablo ya da CSV'nin ham hücre görünümü (not aktarımı gibi işler için). */
export interface TabloVerisi {
  sayfalar: { ad: string; satirlar: HucreDegeri[][] }[];
  /** Okunamayan ya da desteklenmeyen dosyada kullanıcıya gösterilebilir Türkçe uyarılar. */
  uyarilar?: string[];
}

/** Arama ve atıf birimi. */
export interface Parca {
  sira: number;
  capa: Capa;
  metin: string;
}

export interface ParcalamaSecenekleri {
  /** Hedef parça uzunluğu (karakter). Varsayılan 1000. */
  hedefUzunluk?: number;
  /** En büyük parça uzunluğu (karakter). Varsayılan 1600. */
  enBuyukUzunluk?: number;
}

export interface CikarmaSecenekleri {
  /** Bayt cinsinden en büyük girdi. Varsayılan 100 MB. */
  enBuyukBoyut?: number;
  /** ZIP tabanlı biçimlerde açılmış toplam boyut sınırı. Varsayılan 500 MB. */
  enBuyukAcilmisBoyut?: number;
  /** ZIP tabanlı biçimlerde en çok dosya sayısı. Varsayılan 10 000. */
  enBuyukDosyaSayisi?: number;
  /** ZIP içindeki bir dosyanın en büyük sıkıştırma oranı (1 MB üstü dosyalar için). Varsayılan 200. */
  enBuyukSikistirmaOrani?: number;
  /** PDF ayrıştırma zaman sınırı (ms). Varsayılan 30 000. */
  zamanAsimiMs?: number;
}

// ---------- Belge üretimi (rapor, ders dosyası, matris dışa aktarımı) ----------

export interface DocxParagraf {
  tur: "paragraf";
  metin: string;
  /** "eksik": eksik bilgi vurgusu; "not": açıklama kutusu; "oneri": Akredit önerisi (onay bekler) işareti. */
  vurgu?: "eksik" | "not" | "oneri";
}

export interface DocxTablo {
  tur: "tablo";
  basliklar: string[];
  satirlar: string[][];
  aciklama?: string;
  /** Akredit önerisi olarak işaretlenecek satırların sırası (0'dan; başlık hariç). Sarı zemin ve kalın yazı. */
  oneriSatirlari?: number[];
}

export interface DocxMadde {
  tur: "madde";
  maddeler: string[];
  numarali?: boolean;
}

export type DocxIcerik = DocxParagraf | DocxTablo | DocxMadde;

export interface DocxBolumu {
  baslik?: string;
  duzey: 1 | 2 | 3;
  icerik: DocxIcerik[];
}

export interface DocxModeli {
  baslik: string;
  altBaslik?: string;
  /** Sayfa üstü ve altı metinleri (ör. kurum adı, "Taslak: onaylanmadı"). */
  ustBilgi?: string;
  altBilgi?: string;
  bolumler: DocxBolumu[];
}

export interface XlsxSayfasi {
  ad: string;
  basliklar: string[];
  satirlar: HucreDegeri[][];
}
