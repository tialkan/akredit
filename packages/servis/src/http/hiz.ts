// Hız sınırı: anahtar başına jeton kovası. Süreç içi bellekte tutulur; birden çok sunucu örneğinde her örnek
// kendi sınırını uygular (üretimde ters vekil sınırıyla birlikte kullanılır, İP-26/27).

export interface HizSecenekleri {
  /** Kovanın en çok jeton sayısı (ani istek payı). */
  kapasite: number;
  /** Saniyede eklenen jeton. */
  saniyede: number;
  simdi?: () => number;
}

export interface HizSonucu {
  izin: boolean;
  kalan: number;
  /** İzin yoksa kaç saniye sonra yeniden denenebilir. */
  bekle: number;
}

export class HizSiniri {
  readonly #kovalar = new Map<string, { jeton: number; zaman: number }>();
  readonly #s: Required<HizSecenekleri>;
  constructor(s: HizSecenekleri) {
    this.#s = { simdi: () => Date.now(), ...s };
  }
  al(anahtar: string): HizSonucu {
    const simdi = this.#s.simdi();
    const k = this.#kovalar.get(anahtar) ?? { jeton: this.#s.kapasite, zaman: simdi };
    k.jeton = Math.min(this.#s.kapasite, k.jeton + ((simdi - k.zaman) / 1000) * this.#s.saniyede);
    k.zaman = simdi;
    this.#kovalar.set(anahtar, k);
    if (this.#kovalar.size > 50_000) this.#temizle(simdi);
    if (k.jeton < 1) return { izin: false, kalan: 0, bekle: Math.ceil((1 - k.jeton) / this.#s.saniyede) };
    k.jeton -= 1;
    return { izin: true, kalan: Math.floor(k.jeton), bekle: 0 };
  }
  #temizle(simdi: number) {
    const dolma = (this.#s.kapasite / this.#s.saniyede) * 1000;
    for (const [a, k] of this.#kovalar) if (simdi - k.zaman > dolma) this.#kovalar.delete(a);
  }
}
