// Kurulum uçlarına (`/api/kurulum/*`) istek. Sunucu hataları Türkçe iletiyle döner.

export type Sonuc<T> =
  | { tamam: true; deger: T }
  | { tamam: false; durum: number; hata: string; alanlar: { alan: string; ileti: string }[] };

export async function kurulumIstegi<T>(
  yontem: "GET" | "POST" | "PATCH",
  yol: string,
  govde?: unknown,
): Promise<Sonuc<T>> {
  try {
    const y = await fetch(`/api/kurulum/${yol}`, {
      method: yontem,
      credentials: "same-origin",
      headers: govde === undefined ? {} : { "content-type": "application/json" },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    });
    const v = (await y.json().catch(() => null)) as unknown;
    if (y.ok) return { tamam: true, deger: v as T };
    const h = (v ?? {}) as { hata?: string; alanlar?: { alan: string; ileti: string }[] };
    return {
      tamam: false,
      durum: y.status,
      hata:
        y.status === 401
          ? "Oturumunuz yok ya da süresi doldu. Giriş yapıp yeniden deneyin."
          : (h.hata ?? "İşlem yapılamadı. Yeniden deneyin."),
      alanlar: h.alanlar ?? [],
    };
  } catch {
    return {
      tamam: false,
      durum: 0,
      hata: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.",
      alanlar: [],
    };
  }
}

export const BIRIM_TURU_ADI: Record<string, string> = {
  fakulte: "Fakülte",
  myo: "Meslek yüksekokulu",
  enstitu: "Enstitü",
  yuksekokul: "Yüksekokul",
  bolum: "Bölüm",
  anabilim_dali: "Anabilim dalı",
  idari: "İdari birim",
};

export const DUZEY_ADI: Record<string, string> = {
  onlisans: "Ön lisans",
  lisans: "Lisans",
  yuksek_lisans: "Yüksek lisans",
  doktora: "Doktora",
};

/**
 * "Ad Soyad; e-posta" ya da "Ad Soyad, e-posta" satırlarını ayırır. Başlık satırı ve boş satır atlanır.
 * Yalnız dosyadaki adresler okunur; addan adres üretilmez.
 */
export function csvKisileri(metin: string): { adSoyad: string; eposta: string }[] {
  const sonuc: { adSoyad: string; eposta: string }[] = [];
  for (const satir of metin.split(/\r?\n/u)) {
    const parca = satir.split(/[;,\t]/u).map((x) => x.trim().replace(/^"|"$/gu, ""));
    const eposta = parca.find((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(x));
    const ad = parca.find((x) => x && x !== eposta && /\p{L}/u.test(x) && !/^ad/iu.test(x));
    if (eposta && ad) sonuc.push({ adSoyad: ad, eposta: eposta.toLowerCase() });
  }
  return sonuc;
}

/** Karşılaştırma için ad: unvanlar ve büyük-küçük harf farkı atılır. */
const UNVANLAR = new Set([
  "prof",
  "doç",
  "doc",
  "dr",
  "öğr",
  "ogr",
  "gör",
  "gor",
  "üyesi",
  "uyesi",
  "arş",
  "ars",
  "uzm",
  "okt",
]);

export function adAnahtari(ad: string): string {
  return ad
    .toLocaleLowerCase("tr")
    .split(/\s+/u)
    .map((t) => t.replace(/[^\p{L}]/gu, ""))
    .filter((t) => t && !UNVANLAR.has(t))
    .join(" ");
}
