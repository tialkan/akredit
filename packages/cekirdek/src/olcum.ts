// İş yükü ölçümü: CLI pilot raporundaki süre ve karar oranı hesabının saf hali, ve kişi bazında insan dakikası.

import type { IsoZaman, KararSonucu } from "./turler.ts";

export const OTURUM_ARASI_SAAT = 2;
const SAAT_MS = 3600000;

export interface Oturum {
  /** Epoch milisaniye. */
  baslangic: number;
  bitis: number;
}

export interface OturumSonucu {
  oturumlar: Oturum[];
  /** Oturum sürelerinin toplamı, saat. */
  etkinSaat: number;
}

/**
 * Zaman damgalı adımları oturumlara ayırır. İki adım arasındaki boşluk `araSaat`ten uzunsa yeni oturum başlar
 * (tam `araSaat` kadar boşluk aynı oturumda kalır). Adımlar önce zamana göre sıralanır.
 */
export function oturumlariHesapla(zamanlar: readonly (IsoZaman | number)[], araSaat = OTURUM_ARASI_SAAT): OturumSonucu {
  const sirali = zamanlar.map((z) => (typeof z === "number" ? z : Date.parse(z))).sort((a, b) => a - b);
  const oturumlar: Oturum[] = [];
  for (const t of sirali) {
    const son = oturumlar.at(-1);
    if (son && t - son.bitis <= araSaat * SAAT_MS) son.bitis = t;
    else oturumlar.push({ baslangic: t, bitis: t });
  }
  const etkinSaat = oturumlar.reduce((s, o) => s + (o.bitis - o.baslangic), 0) / SAAT_MS;
  return { oturumlar, etkinSaat };
}

export interface KararOranlari {
  toplam: number;
  bekleyen: number;
  kararli: number;
  onaylandi: number;
  duzeltildi: number;
  reddedildi: number;
  /** Kararlı öneriler içinde tam sayıya yuvarlanmış yüzde; karar yoksa null. */
  yuzde: { onaylandi: number | null; duzeltildi: number | null; reddedildi: number | null };
}

export function kararOranlari(durumlar: readonly (KararSonucu | "bekliyor")[]): KararOranlari {
  const say = (d: KararSonucu | "bekliyor") => durumlar.filter((x) => x === d).length;
  const onaylandi = say("onaylandi");
  const duzeltildi = say("duzeltildi");
  const reddedildi = say("reddedildi");
  const kararli = onaylandi + duzeltildi + reddedildi;
  const yuzde = (n: number) => (kararli ? Math.round((100 * n) / kararli) : null);
  return {
    toplam: durumlar.length,
    bekleyen: say("bekliyor"),
    kararli,
    onaylandi,
    duzeltildi,
    reddedildi,
    yuzde: { onaylandi: yuzde(onaylandi), duzeltildi: yuzde(duzeltildi), reddedildi: yuzde(reddedildi) },
  };
}

export interface KararSuresi {
  kisiId: string;
  /** Kişinin bir karar için harcadığı süre, dakika. */
  dakika: number;
}

export interface InsanDakikasi {
  kisiId: string;
  kararSayisi: number;
  toplam: number;
  ortanca: number;
}

export function ortanca(degerler: readonly number[]): number {
  if (!degerler.length) return 0;
  const s = [...degerler].sort((a, b) => a - b);
  const o = Math.floor(s.length / 2);
  return s.length % 2 ? (s[o] ?? 0) : ((s[o - 1] ?? 0) + (s[o] ?? 0)) / 2;
}

/** Kişi bazında karar verme süresi: toplam ve ortanca dakika. Negatif ya da sayı olmayan süreler atılır. */
export function insanDakikasi(sureler: readonly KararSuresi[]): InsanDakikasi[] {
  const gruplar = new Map<string, number[]>();
  for (const s of sureler) {
    if (!Number.isFinite(s.dakika) || s.dakika < 0) continue;
    const g = gruplar.get(s.kisiId) ?? [];
    g.push(s.dakika);
    gruplar.set(s.kisiId, g);
  }
  return [...gruplar].map(([kisiId, d]) => ({
    kisiId,
    kararSayisi: d.length,
    toplam: d.reduce((a, b) => a + b, 0),
    ortanca: ortanca(d),
  }));
}
