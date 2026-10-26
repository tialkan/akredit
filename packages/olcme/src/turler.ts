// Ölçme motorunun seçenek ve sonuç türleri. Girdi sözleşmesi @akredit/cekirdek `DersOlcmeVerisi`dir.

import type { Bulgu, CiktiEslemesi, MatrisDegeri, Ozet } from "@akredit/cekirdek";

/** Hesap yönteminin sürümü. Formül değişirse artırılır; eski sonuçlar eski sürümle yeniden üretilebilir. */
export const HESAP_SURUMU = "olcme-1.0.0";

/** Yalnız araç toplamı bilinen (sorusuz) araçlarda puan satırının taşıdığı soru numarası. */
export const TOPLAM_SORU_NO = "*";

/** ÇK kodu → PÇ kodu → hücre. */
export type CkPcMatrisi = Record<string, Record<string, MatrisDegeri>>;

export interface HarfAraligi {
  harf: string;
  /** Bu harf için en düşük not (dahil). */
  alt: number;
}

export interface OlcmeSecenekleri {
  /** ÇK başarısı ve öğrenci başarısı için eşik (0-100). Varsayılan 60. */
  esik?: number;
  /** ÇK başarısında soru katkısını aracın ders notundaki ağırlığıyla çarp. Varsayılan false. */
  aracAgirligiKullan?: boolean;
  /** ÇK × PÇ katkı matrisi. Verilmezse PÇ sağlanması boş döner. */
  matris?: CkPcMatrisi;
  /** Sorusuz araçlar için araç → ÇK eşlemesi (yedek yöntem). */
  aracEslemeleri?: Record<string, CiktiEslemesi[]>;
  /** Sorusuz araçların tam puanı. Varsayılan 100. */
  aracTamPuani?: Record<string, number>;
  /** Histogram sınırları, artan. Varsayılan 0, 10, …, 100. Son aralık üst sınırı içerir. */
  histogramSinirlari?: number[];
  /** Harf tablosu. Varsayılan `ORNEK_HARF_TABLOSU` (hiçbir kurumun resmî tablosu değildir). */
  harfTablosu?: HarfAraligi[];
  /** Geçme notu (0-100). Varsayılan 60 (örnek değer). */
  gecmeNotu?: number;
}

export type Yontem = "soru" | "arac" | "karma";

export interface DagilimOzeti {
  n: number;
  ortalama: number | null;
  ortanca: number | null;
  standartSapma: number | null;
}

export interface CkBasarisi extends DagilimOzeti {
  ckKod: string;
  /** ÇK'yı ölçen soru (ya da sorusuz araç) sayısı. */
  soruSayisi: number;
  /** Eşiği geçen öğrenci oranı (0-1); ölçülen öğrenci yoksa null. */
  esikGecenOrani: number | null;
  /** Öğrenci takma adı → başarı (0-100); ölçülmeyen öğrenci null. */
  ogrenciler: Record<string, number | null>;
}

export interface PcSaglanmasi {
  pcKod: string;
  /** 0-100; katkılı ve ölçülmüş ÇK yoksa null. */
  deger: number | null;
  katkiToplami: number;
  ckSayisi: number;
}

export interface NotIstatistikleri extends DagilimOzeti {
  enKucuk: number | null;
  enBuyuk: number | null;
  ceyrek1: number | null;
  ceyrek3: number | null;
  histogram: { alt: number; ust: number; sayi: number }[];
  harfDagilimi: { harf: string; sayi: number }[];
  harfTablosuAdi: string;
  gecmeNotu: number;
  gecmeOrani: number | null;
  /** Öğrenci takma adı → ders başarı notu (0-100). */
  notlar: Record<string, number>;
}

export interface MaddeAnalizi {
  aracId: string;
  soruNo: string;
  tamPuan: number;
  n: number;
  ortalama: number | null;
  /** Güçlük indeksi p = ort/tamPuan. */
  guclukIndeksi: number | null;
  /** D = (ort_üst − ort_alt)/tamPuan, üst ve alt %27. */
  ayirtEdicilik: number | null;
  /** Madde ile maddenin çıkarıldığı araç toplamı arasındaki korelasyon. */
  maddeToplamKorelasyonu: number | null;
}

export interface AracAnalizi {
  aracId: string;
  n: number;
  maddeSayisi: number;
  /** Cronbach alfa; tanımsızsa null. */
  cronbachAlfa: number | null;
  maddeler: MaddeAnalizi[];
}

export interface OrnekKagitlar {
  enYuksek: string | null;
  ortanca: string | null;
  enDusuk: string | null;
}

export interface DersOlcmeSonucu {
  dersKodu: string;
  donem: string;
  yontem: Yontem;
  esik: number;
  ogrenciSayisi: number;
  ckBasarilari: CkBasarisi[];
  pcSaglanmasi: PcSaglanmasi[];
  notIstatistikleri: NotIstatistikleri;
  maddeAnalizi: AracAnalizi[];
  bulgular: Bulgu[];
  ornekKagitlar: OrnekKagitlar;
  hesapSurumu: string;
  girdiOzeti: Ozet;
}
