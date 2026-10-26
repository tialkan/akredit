// Betimsel istatistik yardımcıları. Hepsi saf ve deterministiktir; boş girdide null döner.

/** Dizgeleri kod birimi sırasıyla karşılaştırır (yerel ayardan bağımsız). */
export function sirala(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function toplam(x: readonly number[]): number {
  let t = 0;
  for (const v of x) t += v;
  return t;
}

export function ortalama(x: readonly number[]): number | null {
  return x.length === 0 ? null : toplam(x) / x.length;
}

/** Doğrusal aradeğerli yüzdelik (R tür 7, Excel YÜZDEBİRLİK.DHL). `p` 0-1 arası. */
export function yuzdelik(x: readonly number[], p: number): number | null {
  if (x.length === 0) return null;
  const s = [...x].sort((a, b) => a - b);
  const konum = (s.length - 1) * p;
  const alt = Math.floor(konum);
  const ust = Math.ceil(konum);
  const a = s[alt] as number;
  const b = s[ust] as number;
  return a + (b - a) * (konum - alt);
}

export function ortanca(x: readonly number[]): number | null {
  return yuzdelik(x, 0.5);
}

/** Örneklem varyansı (n − 1). n < 2 için null. */
export function varyans(x: readonly number[]): number | null {
  if (x.length < 2) return null;
  const o = toplam(x) / x.length;
  let k = 0;
  for (const v of x) k += (v - o) * (v - o);
  return k / (x.length - 1);
}

/** Örneklem standart sapması (n − 1). n < 2 için null. */
export function standartSapma(x: readonly number[]): number | null {
  const v = varyans(x);
  return v === null ? null : Math.sqrt(v);
}

/** Pearson korelasyonu. Uzunluk < 2 ya da değişkenlerden biri sabitse null. */
export function korelasyon(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const ox = toplam(x) / x.length;
  const oy = toplam(y) / y.length;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = (x[i] as number) - ox;
    const dy = (y[i] as number) - oy;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}
