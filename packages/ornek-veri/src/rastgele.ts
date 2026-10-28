// Tohumlu, belirlenimci sözde rastgele sayı üreteci (mulberry32). Aynı tohum her zaman aynı diziyi verir.
// Şifreleme amaçlı değildir; yalnız sentetik veri üretiminde kullanılır.

export interface Rastgele {
  /** [0, 1) aralığında sayı. */
  sayi(): number;
  /** [alt, ust] aralığında tam sayı. */
  tam(alt: number, ust: number): number;
  /** Ortalama ve standart sapmayla yaklaşık normal dağılımlı sayı (Box-Muller). */
  normal(ort: number, sapma: number): number;
  sec<T>(dizi: readonly T[]): T;
  /** Olasılık p ile true. */
  olasilik(p: number): boolean;
  /** 16'lık tabanda belirtilen uzunlukta dizi. */
  onaltilik(uzunluk: number): string;
}

export function rastgele(tohum: number): Rastgele {
  let durum = tohum >>> 0;
  const sayi = () => {
    durum = (durum + 0x6d2b79f5) >>> 0;
    let t = durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const r: Rastgele = {
    sayi,
    tam: (alt, ust) => alt + Math.floor(sayi() * (ust - alt + 1)),
    normal: (ort, sapma) => {
      const u = 1 - sayi();
      const v = sayi();
      return ort + sapma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    sec: (dizi) => {
      const x = dizi[Math.floor(sayi() * dizi.length)];
      if (x === undefined) throw new RangeError("Boş diziden seçilemez.");
      return x;
    },
    olasilik: (p) => sayi() < p,
    onaltilik: (uzunluk) => {
      let s = "";
      while (s.length < uzunluk) s += Math.floor(sayi() * 16).toString(16);
      return s;
    },
  };
  return r;
}
