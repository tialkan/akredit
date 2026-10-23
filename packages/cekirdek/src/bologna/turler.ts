// Bologna Bilgi Paketi veri sözleşmesi. Okuyucu: @akredit/baglayicilar (bologna-proliz).
// Denetleyici: @akredit/cekirdek (bologna/denetim). Yapı, apps/cli/lib/bologna.mjs çıktısıyla birebir uyumludur.

export interface BolognaProgramCiktisi {
  /** "P1", "P2", ... */
  kod: string;
  metin: string;
}

export interface BolognaMatrisDersi {
  kod: string;
  ad: string;
  zorunlu: boolean;
  grup: string | null;
  yariyil: number | null;
  /** "[G]" ile başlayan seçmeli grup başlığı satırı mı? */
  grupBasligi: boolean;
  /** Program çıktısı kodu → hücre değeri ("", "-", "1"..."5"). */
  degerler: Record<string, string>;
}

export interface BolognaProgramMatrisi {
  pkodlar: string[];
  dersler: BolognaMatrisDersi[];
}

export interface BolognaDegerlendirmeKalemi {
  ad: string;
  sayi: number | null;
  katki: number | null;
}

export interface BolognaIsYukuKalemi {
  ad: string;
  sayi: number | null;
  sure: number | null;
  toplam: number | null;
}

/** Bir ders sayfasının ayrıştırılmış hali (dersSayfasiCoz çıktısı). */
export interface BolognaDersSayfasi {
  yariyil: number | null;
  kod?: string;
  ad?: string;
  /** "2+1+0" */
  tul?: string;
  kredi: number | null;
  akts: number | null;
  /** "19.09.2026" */
  guncelleme?: string;
  bilgiler: Record<string, string>;
  degerlendirme: BolognaDegerlendirmeKalemi[];
  isyuku: BolognaIsYukuKalemi[];
  dersYapisi: { alan: string; yuzde: number | null }[];
  ciktilar: { kod: string; metin: string }[];
  haftalar: number;
  /** Satır ("Tüm", "Ö1", ...) → program çıktısı kodu → değer. */
  katki: Record<string, Record<string, string>>;
}

export interface BolognaOkunanDers extends BolognaDersSayfasi {
  kod: string;
  zorunlu: boolean;
  /** Sayfa "Kayıt Yok" gösteriyor. */
  bos: boolean;
  kaynak: string;
}

export interface BolognaOkunamayanDers {
  kod: string;
  hata: string;
}

export type BolognaDersi = BolognaOkunanDers | BolognaOkunamayanDers;

export interface BolognaVerisi {
  adres: string;
  /** ISO zaman */
  okundu: string;
  programCiktilari: BolognaProgramCiktisi[];
  matris: BolognaProgramMatrisi;
  /** TYYÇ matrisinde işaretli hücre sayısı; okunamadıysa null. */
  tyycIsaret: number | null;
  dersler: BolognaDersi[];
}

export function okunamadiMi(d: BolognaDersi): d is BolognaOkunamayanDers {
  return "hata" in d;
}

// ---------- Ders sayfası taslağı (OBS'ye yazılmadan önce K1-K12 denetiminden geçer) ----------

export interface IkiDilliMetin {
  tr: string;
  en: string;
}

export type CiktiDuzeyTuru = "Bilgi" | "Beceri" | "Yetkinlik";

export interface BolognaTaslagi {
  kod: string;
  ad: string;
  akts: number;
  /** "2+1+0" */
  tul: string;
  /** AKTS başına saat; varsayılan 30. */
  bolen?: number;
  amac: IkiDilliMetin;
  icerik: IkiDilliMetin;
  yontem: IkiDilliMetin;
  notlar: IkiDilliMetin;
  onKosul?: string;
  degerlendirme: { ad: string; sayi: number; katki: number }[];
  isyuku: { ad: string; sayi: number; sure: number }[];
  dersYapisi: { alan: string; yuzde: number }[];
  ciktilar: { kod: string; tr: string; en: string; tur: CiktiDuzeyTuru }[];
  haftalar: { hafta: number; konu: IkiDilliMetin; onHazirlik: string; dokuman: string }[];
  kaynaklar: { yazar: string; eser: string; yayinevi?: string; yil?: number }[];
  /** Programın resmî çıktı kodları ("P1", ...). */
  programCiktilari: string[];
  /** Ders çıktısı kodu → program çıktısı kodu → 1-5 ya da boş. */
  katki: Record<string, Record<string, number | null | "">>;
  /** Sürdürülebilir Kalkınma Amaçları (1-17). */
  ska: number[];
  yetkililer: { rol: string; ad: string; eposta: string; avesis?: string }[];
}
