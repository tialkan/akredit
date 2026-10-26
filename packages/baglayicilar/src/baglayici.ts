// Bağlayıcıların ortak arayüzü. Ağ ve zaman her zaman bağlamdan gelir; testte sahte bağlam verilir.

export interface DisBaglam {
  fetch: typeof fetch;
  bekle(ms: number): Promise<void>;
  simdi(): Date;
  ilerleme?(mesaj: string): void;
}

/** Okunan verinin nereden ve ne zaman alındığı. */
export interface Kaynak {
  adres: string;
  /** ISO zaman */
  okunma: string;
  aciklama?: string;
}

/** Gerçek ağ ve saatle çalışan varsayılan bağlam. */
export function gercekBaglam(ilerleme?: (mesaj: string) => void): DisBaglam {
  return {
    fetch: globalThis.fetch.bind(globalThis),
    bekle: (ms) => new Promise((r) => setTimeout(r, ms)),
    simdi: () => new Date(),
    ...(ilerleme ? { ilerleme } : {}),
  };
}
