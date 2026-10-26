// Web arayüzünün veri sözleşmesi. Arayüz yalnız bu arayüzü bilir; şimdilik bellekteki örnek veri
// (`bellek.ts` + `ornek.ts`) kullanılır, gerçek API bağlantısı İP-12'de gelir.

import type {
  Cikti,
  IsoTarih,
  IsoZaman,
  Kanit,
  KanitAtfi,
  KanitId,
  KanitParcasi,
  Karar,
  KararSonucu,
  KisiId,
  MatrisDegeri,
  Oneri,
  OneriId,
  OneriTuru,
  RiskDuzeyi,
  YetkiPolitikasiKapsami,
} from "@akredit/cekirdek";

export interface Kullanici {
  id: KisiId;
  ad: string;
  unvan: string;
}

/** Bir önerinin arayüzde gösterilen içeriği. Düzeltmede `metin` değişir. */
export interface OneriIcerigi {
  baslik: string;
  metin: string;
}

export interface OneriGorunumu extends Oneri<OneriIcerigi> {
  /** Önerinin nereye ait olduğu, ör. "BP102 Veri Tabanı Yönetimi". */
  konum: string;
}

export interface KanitGorunumu extends Kanit {
  baslik: string;
  /** Kanıtın bağlandığı ölçüt kodları. */
  olcutler: string[];
}

export interface KanitAyrintisi {
  kanit: KanitGorunumu;
  parcalar: KanitParcasi[];
}

export interface KanitFiltresi {
  arama?: string;
  kaynakTuru?: Kanit["kaynakTuru"];
  olcut?: string;
}

export interface OlcmeSatiri {
  ciktiId: string;
  kod: string;
  /** Çıktının sağlanma oranı (0-1). Örnek veride sabittir; gerçekte @akredit/olcme hesaplar. */
  saglanma: number;
}

export interface Ders {
  id: string;
  kod: string;
  ad: string;
  akts: number;
  yariyil: number;
  ciktilar: Cikti[];
  bolognaDurumu: "guncel" | "eksik" | "onay_bekliyor";
  bolognaNotu: string;
  dersDosyasi: { ad: string; tamam: boolean }[];
  olcme: OlcmeSatiri[];
}

export interface MatrisHucresi {
  dersCiktisiId: string;
  programCiktisiId: string;
  deger: MatrisDegeri;
}

export interface Program {
  id: string;
  ad: string;
  duzey: "onlisans" | "lisans";
  birim: string;
  ciktilar: Cikti[];
  dersIdleri: string[];
  matris: MatrisHucresi[];
  olcme: OlcmeSatiri[];
  /** Sağlanma eşiği (0-1). */
  esik: number;
}

export interface RaporParagrafi {
  metin: string;
  atiflar: KanitAtfi[];
  /** Kanıta bağlanamayan paragraf `EKSİK` olarak işaretlenir. */
  eksik: boolean;
}

export interface RaporBolumu {
  id: string;
  baslik: string;
  olcut: string;
  paragraflar: RaporParagrafi[];
}

export interface Rapor {
  id: string;
  ad: string;
  donem: string;
  durum: "taslak" | "incelemede";
  bolumler: RaporBolumu[];
}

export interface SurecGorevi {
  id: string;
  baslik: string;
  sonTarih: IsoTarih;
  sorumlu: string;
  durum: "bekliyor" | "devam" | "tamam";
  ilgili: string;
}

export type YzSaglayici = "evren" | "kurum_sunucusu" | "ollama" | "diger";

export interface PolitikaKaydi {
  id: string;
  ad: string;
  kapsam: YetkiPolitikasiKapsami;
  durum: "imza_bekliyor" | "imzali";
  olusturan: string;
  olusturma: IsoZaman;
  imzalayan: string | null;
  imzaZamani: IsoZaman | null;
}

export interface Ayarlar {
  kurumAdi: string;
  kurumKisaAdi: string;
  yzSaglayici: YzSaglayici;
  yurtDisiIzni: boolean;
  politikalar: PolitikaKaydi[];
}

export interface PanelOzeti {
  bekleyen: Record<RiskDuzeyi, number>;
  yaklasanlar: SurecGorevi[];
  kapsama: { olcut: string; kanitSayisi: number }[];
  /** Bu dönem verilen kararların sayısı ve harcanan süre (dakika, örnek veri). */
  kararSayisi: number;
  harcananDakika: number;
}

export interface KararGirdisi {
  oneriId: OneriId;
  sonuc: KararSonucu;
  /** Yalnız `duzeltildi` için: düzeltilmiş metin. */
  duzeltme?: string;
  gerekce?: string;
}

export interface PolitikaGirdisi {
  ad: string;
  oneriTurleri: OneriTuru[];
  enYuksekRisk: RiskDuzeyi;
  enDusukGuven: number;
}

export type IslemSonucu<T> = { tamam: true; deger: T } | { tamam: false; hata: string };

export interface VeriKaynagi {
  kullanici(): Promise<Kullanici>;
  panelOzeti(): Promise<PanelOzeti>;
  bekleyenOneriler(): Promise<OneriGorunumu[]>;
  kararlar(): Promise<Karar<OneriIcerigi>[]>;
  kanitlar(filtre?: KanitFiltresi): Promise<KanitGorunumu[]>;
  kanit(id: KanitId | string): Promise<KanitAyrintisi | null>;
  programlar(): Promise<Program[]>;
  program(id: string): Promise<Program | null>;
  dersler(): Promise<Ders[]>;
  ders(id: string): Promise<Ders | null>;
  raporlar(): Promise<Rapor[]>;
  rapor(id: string): Promise<Rapor | null>;
  surecler(): Promise<SurecGorevi[]>;
  ayarlar(): Promise<Ayarlar>;

  kararVer(girdi: KararGirdisi): Promise<IslemSonucu<Karar<OneriIcerigi>>>;
  /** Yalnız düşük ve orta riskli öneriler toplu onaylanır; yüksek risk varsa hiçbiri onaylanmaz. */
  topluKararVer(oneriIdleri: OneriId[]): Promise<IslemSonucu<Karar<OneriIcerigi>[]>>;
  /** İmza bekleyen politika taslağı oluşturur. Yüksek risk için politika oluşturulamaz. */
  politikaTaslagiOlustur(girdi: PolitikaGirdisi): Promise<IslemSonucu<PolitikaKaydi>>;
  politikaImzala(id: string, imzalayanAd: string): Promise<IslemSonucu<PolitikaKaydi>>;
  ayarlariGuncelle(
    degisiklik: Partial<Pick<Ayarlar, "yzSaglayici" | "yurtDisiIzni" | "kurumAdi" | "kurumKisaAdi">>,
  ): Promise<Ayarlar>;
}
