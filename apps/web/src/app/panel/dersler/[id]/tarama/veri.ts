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
}

export interface Tarama {
  taramaId: string;
  kagitSayisi: number;
  saglayici: string;
  model: string;
  esik: number;
  hucreler: Hucre[];
  aktarildi: boolean;
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
