// Sentetik Örnek Üniversitesi veri modeli. Kimlikler yerine "anahtar" kullanılır; yükleyici bunları
// veritabanı kimliklerine çevirir. Öğrenci yalnız takma adla temsil edilir: ad, numara, e-posta yoktur.

import type { DersOlcmeVerisi } from "@akredit/cekirdek";
import type { CkPcMatrisi, DersOlcmeSonucu } from "@akredit/olcme";

export const DEMO_ROLLERI = [
  "ogretim_elemani",
  "bolum_baskani",
  "kalite_komisyonu",
  "rektorluk",
  "dis_degerlendirici",
] as const;
export type DemoRolu = (typeof DEMO_ROLLERI)[number];

/** `rol` sayılabilir türüyle aynı adlar (packages/vt/src/sema/ortak.ts). */
export type VtRolu =
  | "kurum_yoneticisi"
  | "kalite_komisyonu_baskani"
  | "kalite_komisyonu_uyesi"
  | "birim_kalite_sorumlusu"
  | "program_sorumlusu"
  | "ogretim_elemani"
  | "degerlendirici"
  | "gozlemci";

export type KapsamTuru = "kurum" | "birim" | "program" | "ders";

export interface Kapsam {
  tur: KapsamTuru;
  /** `kurum` için boş metin. */
  anahtar: string;
}

export interface OrnekCikti {
  kod: string;
  metin: string;
}

export interface OrnekBirim {
  anahtar: string;
  tur: "fakulte" | "bolum";
  ad: string;
  kod: string;
  ust: string | null;
}

export interface OrnekProgram {
  anahtar: string;
  birim: string;
  ad: string;
  duzey: "lisans";
  ciktilar: OrnekCikti[];
}

export interface OrnekDers {
  anahtar: string;
  program: string;
  kod: string;
  ad: string;
  akts: number;
  teorik: number;
  uygulama: number;
  yariyil: number;
  zorunlu: boolean;
  ciktilar: OrnekCikti[];
  /** ÇK × PÇ katkı matrisi; `null` ise matris henüz girilmemiştir (bilinçli eksik). */
  matris: CkPcMatrisi | null;
}

export interface OrnekKisi {
  anahtar: string;
  adSoyad: string;
  unvan: string;
  program: string | null;
}

export interface OrnekDonem {
  anahtar: string;
  ad: string;
  baslangic: string;
  bitis: string;
}

export interface OrnekAcilis {
  anahtar: string;
  ders: string;
  donem: string;
  sorumlu: string;
  /** Soru bazlı not dökümü (takma adlı). */
  veri: DersOlcmeVerisi;
  /** `@akredit/olcme dersiOlc` çıktısı. Elle yazılmış sayı yoktur. */
  sonuc: DersOlcmeSonucu;
}

export interface OrnekAnketOzeti {
  kod: string;
  n: number;
  ortalama: number | null;
}

export interface OrnekAnket {
  anahtar: string;
  acilis: string;
  davetSayisi: number;
  yanitlar: Record<string, number | null>[];
  ozet: OrnekAnketOzeti[];
}

export type BelgeTuru = "bologna" | "tutanak" | "anket_raporu" | "puko_raporu";

export interface OrnekBelge {
  anahtar: string;
  tur: BelgeTuru;
  dosyaAdi: string;
  baslik: string;
  tarih: string;
  kapsam: Kapsam;
  bolumler: { baslik: string; metin: string }[];
}

export type OrnekOneriTuru =
  | "kanit_etiketi"
  | "toplanti_tutanagi"
  | "anket_ozeti"
  | "matris_katkisi"
  | "soru_cikti_eslemesi"
  | "bologna_taslagi"
  | "rapor_bolumu"
  | "eylem";

export interface OrnekAtif {
  belge: string;
  /** Belgedeki bölüm sırası (0'dan). */
  bolum: number;
  alinti: string;
}

export interface OrnekOneri {
  anahtar: string;
  tur: OrnekOneriTuru;
  hedef: { tur: "kurum" | "program" | "ders" | "kanit"; anahtar: string };
  baslik: string;
  metin: string;
  gerekce: string;
  risk: "dusuk" | "orta" | "yuksek";
  atiflar: OrnekAtif[];
}

export type PukoAsamasi = "planla" | "uygula" | "kontrol_et" | "onlem_al";

export interface OrnekEylem {
  anahtar: string;
  tanim: string;
  asama: PukoAsamasi;
  hedefTarih: string;
  sorumlu: string;
  kaynak: string;
  belgeler: string[];
}

export interface OrnekEksik {
  tur: "matris" | "olculmeyen_cikti" | "akts_tablosu" | "tutanak" | "anket_esigi";
  hedef: Kapsam;
  aciklama: string;
}

export interface OrnekPersona {
  rol: DemoRolu;
  kisi: string;
  atamalar: { rol: VtRolu; kapsam: Kapsam }[];
}

export interface OrnekUniversite {
  surum: string;
  tohum: number;
  kurum: { ad: string; kisaAd: string; esik: number };
  birimler: OrnekBirim[];
  programlar: OrnekProgram[];
  dersler: OrnekDers[];
  kisiler: OrnekKisi[];
  ogrenciler: { takmaAd: string; program: string; sinif: number }[];
  donemler: OrnekDonem[];
  acilislar: OrnekAcilis[];
  anketler: OrnekAnket[];
  belgeler: OrnekBelge[];
  oneriler: OrnekOneri[];
  eylemler: OrnekEylem[];
  eksikler: OrnekEksik[];
  personalar: OrnekPersona[];
}
