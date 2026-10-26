// Yalıtılmış metin çıkarma: `@akredit/belge` ayrı bir worker thread'de çalışır. Süre dolunca worker kesilir
// ve sonraki istek için yenisi açılır. İstekler sıraya girer; bir worker aynı anda tek belge okur.

import { Worker } from "node:worker_threads";
import type { BelgeIpucu, BelgeMetni, CikarmaSecenekleri } from "@akredit/belge";
import { ozetHesapla } from "@akredit/cekirdek";

export const SURE_DOLDU =
  "Dosyanın okunması çok uzun sürdü ve durduruldu. Dosyayı yeniden kaydedip (ör. PDF olarak) tekrar yükleyin.";
export const OKUNAMADI = "Dosya okunurken beklenmeyen bir sorun oldu. Dosyayı yeniden kaydedip tekrar yükleyin.";

export interface YalitilmisSecenek extends CikarmaSecenekleri {
  /** Bir belgenin toplam süre sınırı (ms). Varsayılan 60 000. */
  toplamSureMs?: number;
  /** Yalnız test: worker'ı bilerek kilitler. */
  kilitle?: boolean;
}

interface Yanit {
  no: number;
  sonuc?: BelgeMetni;
  hata?: boolean;
}

/** Tek worker'lı çıkarma havuzu. */
export function cikarmaHavuzu(ayar: { bellekMb?: number } = {}) {
  let w: Worker | null = null;
  let sayac = 0;
  let sira: Promise<unknown> = Promise.resolve();
  const bekleyen = new Map<number, { isci: Worker; f: (y: Yanit) => void }>();

  const ac = (): Worker => {
    if (w) return w;
    const yeni = new Worker(new URL("./cikarma-isci.ts", import.meta.url), {
      resourceLimits: { maxOldGenerationSizeMb: ayar.bellekMb ?? 512 },
    });
    yeni.unref();
    yeni.on("message", (y: Yanit) => bekleyen.get(y.no)?.f(y));
    const coku = () => {
      if (w === yeni) w = null;
      for (const [no, b] of bekleyen) if (b.isci === yeni) b.f({ no, hata: true });
    };
    yeni.on("error", coku);
    yeni.on("exit", coku);
    w = yeni;
    return yeni;
  };

  const tekCikar = (veri: Uint8Array, ipucu: BelgeIpucu | undefined, s: YalitilmisSecenek) =>
    new Promise<BelgeMetni>((coz) => {
      const { toplamSureMs = 60_000, kilitle, ...cikarma } = s;
      const bos = (uyari: string): BelgeMetni => ({
        tur: "bilinmiyor",
        ozet: ozetHesapla(veri),
        bolumler: [],
        tablolar: [],
        ocrGerekli: false,
        uyarilar: [uyari],
      });
      const no = ++sayac;
      const isci = ac();
      const zamanlayici = setTimeout(() => {
        bekleyen.delete(no);
        if (w === isci) w = null;
        void isci.terminate();
        coz(bos(SURE_DOLDU));
      }, toplamSureMs);
      bekleyen.set(no, {
        isci,
        f: (y) => {
          clearTimeout(zamanlayici);
          bekleyen.delete(no);
          coz(y.sonuc ?? bos(OKUNAMADI));
        },
      });
      isci.postMessage({ no, veri, ipucu, secenek: cikarma, kilitle });
    });

  return {
    cikar(veri: Uint8Array, ipucu?: BelgeIpucu, secenek: YalitilmisSecenek = {}): Promise<BelgeMetni> {
      const p = sira.then(() => tekCikar(veri, ipucu, secenek));
      sira = p.catch(() => undefined);
      return p;
    },
    async kapat() {
      const x = w;
      w = null;
      await x?.terminate();
    },
  };
}

let ortak: ReturnType<typeof cikarmaHavuzu> | null = null;

/** Süreç genelindeki ortak havuzla yalıtılmış çıkarma. */
export function yalitilmisMetinCikar(veri: Uint8Array, ipucu?: BelgeIpucu, secenek?: YalitilmisSecenek) {
  ortak ??= cikarmaHavuzu();
  return ortak.cikar(veri, ipucu, secenek);
}
