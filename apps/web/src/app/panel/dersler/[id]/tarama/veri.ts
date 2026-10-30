// Sınav kâğıdı taraması ekranının veri biçimi ve örnek kipteki kurgu tarama (İP-43).
// Biçim `@akredit/servis` `sinavTarama.TaramaGorunumu` ile aynıdır; numara hiçbir alanda yoktur.

export type Neden =
  | "dusuk_guven"
  | "okunamadi"
  | "azami_asimi"
  | "toplam_tutarsiz"
  | "numara_okunamadi"
  | "metinde_yok";

export interface Hucre {
  hucreId: string;
  kagitSira: number;
  alan: string;
  deger: number | null;
  azami: number | null;
  guven: number;
  nedenler: Neden[];
  katman: { katman: 0 | 1 | 2; kural: string; gerekce: string; devredilemez: boolean };
  karar: { sonuc: "onaylandi" | "duzeltildi"; deger: number | null; zaman: string } | null;
  /** Numara kutusunun görüntüsü depoda var mı (görüntünün kendisi ayrı, yetkili ve süreli erişimle gelir). */
  kirpinti: boolean;
}

export interface Tarama {
  taramaId: string;
  kagitSayisi: number;
  saglayici: string;
  model: string;
  esik: number;
  hucreler: Hucre[];
  aktarildi: boolean;
  /** Aktarım öncesi özet: otomatik okunan ve düzeltilmemiş hücrelerin sayısı ve özeti (sunucu hesaplar). */
  otomatikOzet: { sayi: number; ozet: string };
  /** Taramayı bu kişi mi başlattı. */
  sahip: boolean;
}

/** Şablondaki bir kutu: sayfaya göre oransal konum (0-1). Biçim `@akredit/servis` `KutuYeri` ile aynı. */
export interface Kutu {
  sayfa: number;
  x: number;
  y: number;
  genislik: number;
  yukseklik: number;
}

export interface Sablon {
  sinir: { tur: "sayfa"; sayfaSayisi: number } | { tur: "kapak"; isaret: string };
  numara: Kutu;
  numaraUzunlugu?: number;
  toplam?: Kutu;
  sorular: { soruNo: string; kutu: Kutu }[];
}

export interface PanelAraci {
  id: string;
  ad: string;
  tur: string;
  donem: string;
  sorular: { numara: string; tamPuan: number }[];
  sablon: Sablon | null;
}

export interface PanelIstegi {
  id: string;
  olcmeAraciId: string;
  dosyaAdi: string;
  zaman: string;
  durum: "bekliyor" | "tamam" | "hata";
  ileti: string | null;
  taramaId: string | null;
}

export interface PanelTaramasi {
  taramaId: string;
  olcmeAraciId: string;
  zaman: string;
  kagitSayisi: number;
  aktarildi: boolean;
}

export interface PanelVerisi {
  araclar: PanelAraci[];
  istekler: PanelIstegi[];
  taramalar: PanelTaramasi[];
}

/** Yükleme formunun durumu: yerel model yoksa kapalı ve neden söylenir. */
export type YuklemeDurumu = { acik: true } | { acik: false; ileti: string };

/** Otomatik okunan ve kişinin düzeltmediği hücreler (aktarım özetine girenler). */
export function otomatikHucreler(t: Tarama): Hucre[] {
  return t.hucreler.filter((h) => h.katman.katman === 0 && h.karar === null);
}

/** Kâğıtların sütunları: soru alanları sayı sırasıyla, sonra kâğıttaki toplam. Numara gösterilmez. */
export function ozetSutunlari(t: Tarama): string[] {
  const alanlar = [...new Set(t.hucreler.map((h) => h.alan))].filter((a) => a !== "*numara");
  return alanlar.sort((a, b) =>
    a === "*toplam" ? 1 : b === "*toplam" ? -1 : a.localeCompare(b, "tr", { numeric: true }),
  );
}

/** Hücrenin geçerli değeri: kişinin kararı varsa o, yoksa okunan. */
export function gecerliDeger(h: Hucre): number | null {
  return h.karar ? h.karar.deger : h.deger;
}

export const NEDEN_METNI: Record<Neden, string> = {
  okunamadi: "Puan okunamadı.",
  dusuk_guven: "Okuma güveni eşiğin altında.",
  azami_asimi: "Okunan puan sorunun azami puanını aşıyor.",
  toplam_tutarsiz: "Soru puanlarının toplamı kâğıttaki toplamla tutmuyor.",
  numara_okunamadi: "Öğrenci numarası okunamadı.",
  metinde_yok: "Okunan puan kutudaki yazıyla eşleşmiyor.",
};

export function alanAdi(alan: string): string {
  if (alan === "*numara") return "Öğrenci numarası";
  if (alan === "*toplam") return "Kâğıttaki toplam";
  return `Soru ${alan}`;
}

export function puanYaz(x: number | null): string {
  return x === null ? "okunamadı" : x.toLocaleString("tr-TR", { maximumFractionDigits: 3 });
}

/** Güveni yüzde olarak yazar (gösterim; hesap değildir). */
export function guvenYaz(g: number): string {
  return `%${Math.round(g * 100)}`;
}

/** Karara bağlanmamış Katman 2 hücreleri. */
export function bekleyenKartlar(t: Tarama): Hucre[] {
  return t.hucreler.filter((h) => h.katman.katman === 2 && h.karar === null);
}

const K0 = { katman: 0 as const, kural: "K0-otomatik-okundu", gerekce: "Otomatik okundu.", devredilemez: false };
const k2 = (kural: string, gerekce: string) => ({ katman: 2 as const, kural, gerekce, devredilemez: true });

function hucre(
  kagitSira: number,
  alan: string,
  deger: number | null,
  azami: number | null,
  guven: number,
  nedenler: Neden[] = [],
): Hucre {
  const katman = nedenler.length
    ? k2(
        nedenler.includes("toplam_tutarsiz")
          ? "K2-sinav-toplam-tutarsiz"
          : nedenler.includes("azami_asimi")
            ? "K2-sinav-azami-asimi"
            : `K2-sinav-${(nedenler[0] as string).replace(/_/gu, "-")}`,
        `${nedenler.map((n) => NEDEN_METNI[n]).join(" ")} Puanı siz onaylayın ya da düzeltin.`,
      )
    : K0;
  return {
    hucreId: `ornek-${kagitSira}-${alan}`,
    kagitSira,
    alan,
    deger,
    azami,
    guven,
    nedenler,
    katman,
    karar: null,
    kirpinti: alan === "*numara",
  };
}

/** Kurgu tarama: iki kâğıt (biri tutarlı, biri toplamı tutmayan), numaralar gösterilmez. */
export const ORNEK_TARAMA: Tarama = {
  taramaId: "ornek-tarama",
  kagitSayisi: 2,
  saglayici: "ollama",
  model: "kurum içi model",
  esik: 0.9,
  aktarildi: false,
  // Örnek kipte özet sunucuda hesaplanmaz; aktarım zaten yapılmaz.
  otomatikOzet: { sayi: 4, ozet: "0".repeat(64) },
  sahip: true,
  hucreler: [
    hucre(1, "*numara", null, null, 1),
    hucre(1, "1", 8, 10, 0.97),
    hucre(1, "2", 7.5, 10, 0.96),
    hucre(1, "*toplam", 15.5, null, 0.98),
    hucre(2, "*numara", null, null, 0, ["numara_okunamadi"]),
    hucre(2, "1", 9, 10, 0.6, ["dusuk_guven", "toplam_tutarsiz"]),
    hucre(2, "2", 6, 10, 0.95, ["toplam_tutarsiz"]),
    hucre(2, "*toplam", 16, null, 0.97, ["toplam_tutarsiz"]),
  ],
};

/** Örnek kipte bir ölçme aracı (iki soru), kayıtlı şablonu ve kurgu tarama. */
export const ORNEK_PANEL: PanelVerisi = {
  araclar: [
    {
      id: "ornek-vize",
      ad: "Vize",
      tur: "ara_sinav",
      donem: "2026-2027 Güz",
      sorular: [
        { numara: "1", tamPuan: 10 },
        { numara: "2", tamPuan: 10 },
      ],
      sablon: {
        sinir: { tur: "sayfa", sayfaSayisi: 1 },
        numara: { sayfa: 1, x: 0.6, y: 0.05, genislik: 0.3, yukseklik: 0.05 },
        numaraUzunlugu: 10,
        toplam: { sayfa: 1, x: 0.7, y: 0.85, genislik: 0.2, yukseklik: 0.06 },
        sorular: [
          { soruNo: "1", kutu: { sayfa: 1, x: 0.8, y: 0.2, genislik: 0.12, yukseklik: 0.05 } },
          { soruNo: "2", kutu: { sayfa: 1, x: 0.8, y: 0.5, genislik: 0.12, yukseklik: 0.05 } },
        ],
      },
    },
  ],
  istekler: [],
  taramalar: [
    {
      taramaId: "ornek-tarama",
      olcmeAraciId: "ornek-vize",
      zaman: "2026-10-30T09:00:00Z",
      kagitSayisi: 2,
      aktarildi: false,
    },
  ],
};
