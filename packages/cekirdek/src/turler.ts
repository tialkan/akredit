// Akredit alan modelinin ortak türleri. Paketler arası sözleşmedir: docs/mimari.md §3 ile uyumlu tutulur.
// Değiştirmeden önce bu türleri kullanan paketleri kontrol et (rg "@akredit/cekirdek").

/** Markalı kimlik: farklı varlıkların kimlikleri derleme anında birbirine karışmasın. */
export type Marka<T, M extends string> = T & { readonly __marka: M };

export type KurumId = Marka<string, "KurumId">;
export type BirimId = Marka<string, "BirimId">;
export type ProgramId = Marka<string, "ProgramId">;
export type DersId = Marka<string, "DersId">;
export type DersAcilisiId = Marka<string, "DersAcilisiId">;
export type DonemId = Marka<string, "DonemId">;
export type KisiId = Marka<string, "KisiId">;
export type KanitId = Marka<string, "KanitId">;
export type ParcaId = Marka<string, "ParcaId">;
export type CiktiId = Marka<string, "CiktiId">;
export type CerceveId = Marka<string, "CerceveId">;
export type OlcutId = Marka<string, "OlcutId">;
export type OneriId = Marka<string, "OneriId">;
export type KararId = Marka<string, "KararId">;
export type PolitikaId = Marka<string, "PolitikaId">;

/** SHA-256 özetinin 64 karakterlik küçük harfli onaltılık yazımı. */
export type Ozet = Marka<string, "Ozet">;

/** ISO 8601 zaman damgası (UTC), ör. "2026-10-23T08:00:00.000Z". */
export type IsoZaman = string;
/** ISO 8601 tarih, ör. "2026-10-23". */
export type IsoTarih = string;

// ---------- Kurum yapısı ----------

export type BirimTuru = "fakulte" | "myo" | "enstitu" | "yuksekokul" | "bolum" | "anabilim_dali" | "idari";
export type ProgramDuzeyi = "onlisans" | "lisans" | "yuksek_lisans" | "doktora";
export type KapsamTuru = "kurum" | "birim" | "program" | "ders";

export type Rol =
  | "kurum_yoneticisi"
  | "kalite_komisyonu_baskani"
  | "kalite_komisyonu_uyesi"
  | "birim_kalite_sorumlusu"
  | "program_sorumlusu"
  | "ogretim_elemani"
  | "degerlendirici"
  | "gozlemci";

export interface Kapsam {
  tur: KapsamTuru;
  /** `kurum` kapsamında kurum kimliği, diğerlerinde ilgili varlığın kimliği. */
  id: string;
}

// ---------- Kanıt ----------

/** Kanıtın içindeki bir yerin adresi. En az bir alan dolu olur. */
export interface Capa {
  sayfa?: number;
  /** Sayfa aralığının sonu (sayfa ile birlikte). */
  sayfaSon?: number;
  bolum?: string;
  satir?: number;
  /** Tablo hücresi, ör. "B12" ya da "Sayfa1!B12". */
  hucre?: string;
  slayt?: number;
}

export type KanitKaynakTuru = "yukleme" | "baglayici" | "eposta" | "uretilen";
export type KisiselVeriDurumu = "yok" | "maskeli" | "var" | "bilinmiyor";

export interface Kanit {
  id: KanitId;
  kurumId: KurumId;
  ozet: Ozet;
  dosyaAdi: string;
  mime: string;
  boyut: number;
  kaynakTuru: KanitKaynakTuru;
  /** Bağlayıcı adı, kaynak adres, okunma zamanı, e-posta göndereni gibi ayrıntılar. */
  kaynakAyrinti: Record<string, unknown>;
  /** Belgenin içeriğinin ait olduğu tarih (biliniyorsa). */
  belgeTarihi: IsoTarih | null;
  kapsamlar: Kapsam[];
  eklenme: IsoZaman;
  kisiselVeri: KisiselVeriDurumu;
}

export interface KanitParcasi {
  id: ParcaId;
  kanitId: KanitId;
  sira: number;
  capa: Capa;
  metin: string;
}

// ---------- Çıktılar ve matris ----------

export type CiktiTuru = "pea" | "program" | "ders" | "tyyc";

export interface Cikti {
  id: CiktiId;
  tur: CiktiTuru;
  /** Program çıktısında program, ders çıktısında ders kimliği. */
  sahipId: string;
  kod: string;
  metin: string;
  surum: number;
  oncekiSurumId: CiktiId | null;
}

export type KatkiPuani = 1 | 2 | 3 | 4 | 5;

/** Ders çıktısı × program çıktısı hücresi. 0 yoktur: ilişki yoksa `iliskisiz`. */
export type MatrisDegeri = { tur: "puan"; puan: KatkiPuani } | { tur: "iliskisiz" } | { tur: "yetersiz_kanit" };

// ---------- Öneri, karar, yetki politikası ----------

export type RiskDuzeyi = "dusuk" | "orta" | "yuksek";

export type OneriTuru =
  | "kanit_etiketi"
  | "toplanti_tutanagi"
  | "anket_ozeti"
  | "matris_katkisi"
  | "soru_cikti_eslemesi"
  | "bologna_taslagi"
  | "rapor_bolumu"
  | "eylem"
  | "olgunluk_duzeyi"
  | "yazma_plani"
  | "dis_gonderim"
  /** Başka kurumdan örnek (İP-37): kanıt değildir, rapora kanıt olarak giremez. */
  | "dis_ornek";

/** Her öneri türünün varsayılan risk düzeyi. Yüksek risk hiçbir politikayla devredilemez. */
export const ONERI_RISKI: Readonly<Record<OneriTuru, RiskDuzeyi>> = {
  kanit_etiketi: "dusuk",
  toplanti_tutanagi: "dusuk",
  anket_ozeti: "dusuk",
  matris_katkisi: "orta",
  soru_cikti_eslemesi: "orta",
  bologna_taslagi: "orta",
  rapor_bolumu: "orta",
  eylem: "orta",
  olgunluk_duzeyi: "yuksek",
  yazma_plani: "yuksek",
  dis_gonderim: "yuksek",
  dis_ornek: "orta",
};

/** Bir önerinin dayandığı kanıt yeri. Alıntı, parçada birebir (normalleştirilmiş) geçmelidir. */
export interface KanitAtfi {
  kanitId: KanitId;
  parcaId?: ParcaId;
  capa?: Capa;
  alinti?: string;
}

export type Uretici =
  | { tur: "yz"; model: string; istemOzeti: string }
  | { tur: "kural"; kural: string; surum: string }
  | { tur: "kisi"; kisiId: KisiId };

export interface OneriHedefi {
  /** ör. "kanit", "cikti_cifti", "ders", "rapor_bolumu", "olcut" */
  tur: string;
  id: string;
}

export interface Oneri<T = unknown> {
  id: OneriId;
  kurumId: KurumId;
  tur: OneriTuru;
  hedef: OneriHedefi;
  icerik: T;
  gerekce: string;
  atiflar: KanitAtfi[];
  /** 0-1 arası; kural ve kişi önerilerinde null olabilir. */
  guven: number | null;
  uretici: Uretici;
  risk: RiskDuzeyi;
  olusturma: IsoZaman;
}

export type KararSonucu = "onaylandi" | "duzeltildi" | "reddedildi";

export type KararDayanagi = { tur: "dogrudan" } | { tur: "politika"; politikaId: PolitikaId };

export interface Karar<T = unknown> {
  id: KararId;
  oneriId: OneriId;
  sonuc: KararSonucu;
  /** Yalnız `duzeltildi` sonucunda dolu: önerinin düzeltilmiş içeriği. */
  duzeltme: T | null;
  /** Politika kararlarında politikayı imzalayan kişi. */
  kararVeren: KisiId;
  dayanak: KararDayanagi;
  gerekce: string | null;
  zaman: IsoZaman;
}

export interface YetkiPolitikasiKapsami {
  oneriTurleri: OneriTuru[];
  /** Politika en çok bu risk düzeyine kadar uygulanır. `yuksek` olamaz. */
  enYuksekRisk: Exclude<RiskDuzeyi, "yuksek">;
  /** Bu güvenin altındaki öneriler politikayla karara bağlanmaz. */
  enDusukGuven: number;
  birimIdleri?: BirimId[];
  programIdleri?: ProgramId[];
}

export interface YetkiPolitikasi {
  id: PolitikaId;
  kurumId: KurumId;
  ad: string;
  kapsam: YetkiPolitikasiKapsami;
  imzalayan: KisiId;
  baslangic: IsoZaman;
  bitis: IsoZaman | null;
  olusturma: IsoZaman;
}

// ---------- Denetim bulgusu ----------

export type BulguDuzeyi = "hata" | "uyari" | "bilgi";

/** Bologna, taslak, rapor ve ölçme denetimlerinin ortak bulgu biçimi. */
export interface Bulgu {
  duzey: BulguDuzeyi;
  /** Kural kodu, ör. "akts-isyuku", "K8", "atif-gecersiz". */
  kural: string;
  /** Bulgunun konusu: ders kodu, çıktı kodu, paragraf numarası. */
  konu?: string;
  aciklama: string;
}
