// Sürümlü çerçeve kütüphanesi. Bir sürüm bir kez eklenir, üzerine yazılmaz; rapor
// bağlandığı sürümü tutar, yeni sürüm eski raporu değiştirmez.

import { type Cerceve, cerceveSemasi } from "./sema.ts";

export interface CerceveBaglantisi {
  cerceveKod: string;
  cerceveSurum: string;
}

const anahtar = (kod: string, surum: string) => `${kod}@${surum}`;

const derinDondur = <T>(d: T): T => {
  if (d && typeof d === "object") {
    for (const v of Object.values(d)) derinDondur(v);
    Object.freeze(d);
  }
  return d;
};

export class CerceveKutuphanesi {
  #surumler = new Map<string, Cerceve>();

  /** Çerçeve sürümünü ekler. Aynı kod ve sürüm farklı içerikle eklenemez. */
  ekle(girdi: unknown): Cerceve {
    const c = derinDondur(structuredClone(cerceveSemasi.parse(girdi)));
    const k = anahtar(c.kod, c.surum);
    const eski = this.#surumler.get(k);
    if (eski) {
      if (JSON.stringify(eski) !== JSON.stringify(c))
        throw new Error(`${k} zaten kayıtlı. Değişiklik için yeni sürüm numarası verin.`);
      return eski;
    }
    this.#surumler.set(k, c);
    return c;
  }

  getir(kod: string, surum: string): Cerceve | undefined {
    return this.#surumler.get(anahtar(kod, surum));
  }

  surumler(kod: string): string[] {
    return [...this.#surumler.values()].filter((c) => c.kod === kod).map((c) => c.surum);
  }

  hepsi(): Cerceve[] {
    return [...this.#surumler.values()];
  }

  /** Yeni rapor için bağlantı: belirtilen sürüm kütüphanede olmalı. */
  bagla(kod: string, surum: string): CerceveBaglantisi {
    if (!this.getir(kod, surum)) throw new Error(`${anahtar(kod, surum)} kütüphanede yok.`);
    return Object.freeze({ cerceveKod: kod, cerceveSurum: surum });
  }

  /** Raporun bağlı olduğu sürümü döner; en güncel sürüme kaymaz. */
  cozumle(b: CerceveBaglantisi): Cerceve {
    const c = this.getir(b.cerceveKod, b.cerceveSurum);
    if (!c) throw new Error(`Raporun bağlı olduğu çerçeve sürümü bulunamadı: ${anahtar(b.cerceveKod, b.cerceveSurum)}`);
    return c;
  }
}
