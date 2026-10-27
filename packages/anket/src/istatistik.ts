// Deterministik anket istatistikleri. Sayılar yalnız buradan gelir (ilke 2); model metni sayı üretmez.
// Küçük gruplarda (n < en az yanıt eşiği) dağılım gösterilmez: az yanıtlı bir derste tek öğrencinin
// yanıtı tanınabilir. Eşik varsayılanı 5.

import type { AnketTanimi, Soru, Yanit } from "./sema.ts";

export const VARSAYILAN_ESIK = 5;

export interface SayiOzeti {
  n: number;
  ortalama: number;
  /** Örneklem standart sapması (n-1); n < 2 ise null. */
  standartSapma: number | null;
  ortanca: number;
  ceyrek1: number;
  ceyrek3: number;
  enAz: number;
  enCok: number;
}

export interface SoruSonucu {
  kod: string;
  metin: string;
  tur: Soru["tur"];
  /** Bu soruyu yanıtlayan kişi sayısı (boş bırakanlar sayılmaz). */
  n: number;
  /** n eşiğin altındaysa true; dağılım ve özet verilmez. */
  gizli: boolean;
  /** likert/tek_secim/coklu_secim: seçenek → sayı. */
  dagilim?: { secenek: string; sayi: number; oran: number }[];
  /** likert, sayi, isyuku. */
  ozet?: SayiOzeti;
  /** acik: boş olmayan yanıt sayısı (metinler ayrıca özetlenir). */
  acikSayisi?: number;
}

export interface AnketSonucu {
  yanitSayisi: number;
  /** Davet edilen sayısı bilinirse yanıt oranı (0-1). */
  yanitOrani: number | null;
  esik: number;
  sorular: SoruSonucu[];
}

/** Sıralı dizide doğrusal aralama ile yüzdelik (R tip 7, Excel YÜZDEBİRLİK). */
export function yuzdelik(sirali: readonly number[], p: number): number {
  if (!sirali.length) throw new RangeError("Boş dizi.");
  const h = (sirali.length - 1) * p;
  const a = Math.floor(h);
  const alt = sirali[a] as number;
  const ust = sirali[Math.min(a + 1, sirali.length - 1)] as number;
  return alt + (h - a) * (ust - alt);
}

export function sayiOzeti(degerler: readonly number[]): SayiOzeti | null {
  if (!degerler.length) return null;
  const s = [...degerler].sort((a, b) => a - b);
  const n = s.length;
  const ortalama = s.reduce((t, x) => t + x, 0) / n;
  const varyans = n > 1 ? s.reduce((t, x) => t + (x - ortalama) ** 2, 0) / (n - 1) : null;
  return {
    n,
    ortalama,
    standartSapma: varyans === null ? null : Math.sqrt(varyans),
    ortanca: yuzdelik(s, 0.5),
    ceyrek1: yuzdelik(s, 0.25),
    ceyrek3: yuzdelik(s, 0.75),
    enAz: s[0] as number,
    enCok: s[n - 1] as number,
  };
}

function soruSonucu(s: Soru, yanitlar: readonly Yanit[], esik: number): SoruSonucu {
  const degerler = yanitlar.map((y) => y[s.kod]).filter((v) => v !== null && v !== undefined && v !== "");
  const n = degerler.length;
  const temel: SoruSonucu = { kod: s.kod, metin: s.metin, tur: s.tur, n, gizli: n < esik };
  if (s.tur === "acik") return { ...temel, acikSayisi: n };
  if (temel.gizli) return temel;
  if (s.tur === "likert" || s.tur === "tek_secim" || s.tur === "coklu_secim") {
    const secenekler = s.secenekler ?? [];
    const say = secenekler.map((sec, i) => {
      const sayi = degerler.filter((v) =>
        s.tur === "likert" ? v === i + 1 : Array.isArray(v) ? v.includes(sec) : v === sec,
      ).length;
      return { secenek: sec, sayi, oran: sayi / n };
    });
    const sonuc: SoruSonucu = { ...temel, dagilim: say };
    if (s.tur === "likert") {
      const oz = sayiOzeti(degerler as number[]);
      if (oz) sonuc.ozet = oz;
    }
    return sonuc;
  }
  const oz = sayiOzeti(degerler as number[]);
  return oz ? { ...temel, ozet: oz } : temel;
}

export function anketSonucu(
  tanim: AnketTanimi,
  yanitlar: readonly Yanit[],
  secenek: { davetSayisi?: number; esik?: number } = {},
): AnketSonucu {
  const esik = secenek.esik ?? VARSAYILAN_ESIK;
  return {
    yanitSayisi: yanitlar.length,
    yanitOrani: secenek.davetSayisi ? yanitlar.length / secenek.davetSayisi : null,
    esik,
    sorular: tanim.sorular.map((s) => soruSonucu(s, yanitlar, esik)),
  };
}
