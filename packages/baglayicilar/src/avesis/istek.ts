// İP-23 bağlayıcılarının ortak istek yardımcıları: hız sınırı, zaman aşımı, adres denetimi, kullanım koşulu notu.
// (Bu dosya avesis klasöründe durur; yokatlas ve bulut bağlayıcıları da buradan alır.)

import type { DisBaglam } from "../baglayici.ts";
import { KULLANICI_AJANI } from "../bologna-proliz/oku.ts";

/** Bir bağlayıcının kaynak kurumun kullanım koşullarıyla ilgili notu. */
export interface KullanimKosulu {
  kaynak: string;
  /** Koşulların okunduğu adres; doğrulanmadıysa yok. */
  adres?: string;
  /** Koşullar bir insan tarafından resmî sayfadan okunup doğrulanmadıkça "DOĞRULANMADI". */
  durum: "DOĞRULANMADI" | "dogrulandi";
  not: string;
  /** Bu bağlayıcının uyguladığı en kısa istek aralığı (ms). */
  enAzAralikMs: number;
}

export interface Sinirlayici {
  /** Sıradaki istekten önce gereken süreyi bekler. */
  bekle(): Promise<void>;
}

/**
 * İki istek arasında en az `aralikMs` geçmesini sağlar. Saat bağlamdan okunur,
 * bekleme bağlamdan yapılır; testte sahte bağlamla bekleme süreleri tam olarak denetlenir.
 */
export function sinirlayici(baglam: DisBaglam, aralikMs: number): Sinirlayici {
  let son: number | null = null;
  return {
    async bekle() {
      const simdi = baglam.simdi().getTime();
      if (son !== null) {
        const kalan = son + aralikMs - simdi;
        if (kalan > 0) await baglam.bekle(kalan);
      }
      son = Math.max(simdi, (son ?? 0) + aralikMs);
    },
  };
}

export class BaglayiciHatasi extends Error {}

export interface IstekSecenegi {
  zamanAsimiMs?: number;
  basliklar?: Record<string, string>;
  yontem?: string;
  govde?: string;
}

/** Sınırlayıcıdan geçip GET (ya da verilen yöntem) isteği yapar. HTTP hatası kullanıcıya gösterilebilir iletiyle döner. */
export async function istek(
  baglam: DisBaglam,
  sinir: Sinirlayici,
  adres: string,
  s: IstekSecenegi = {},
): Promise<Response> {
  await sinir.bekle();
  const init: RequestInit = {
    method: s.yontem ?? "GET",
    headers: { "User-Agent": KULLANICI_AJANI, ...(s.basliklar ?? {}) },
    signal: AbortSignal.timeout(s.zamanAsimiMs ?? 20_000),
  };
  if (s.govde !== undefined) init.body = s.govde;
  const y = await baglam.fetch(adres, init);
  if (y.status === 429) throw new BaglayiciHatasi("Kaynak çok fazla istek aldığını bildirdi; bir süre sonra yeniden deneyin.");
  if (!y.ok) throw new BaglayiciHatasi(`Sayfa okunamadı (HTTP ${y.status}). Adresi denetleyip yeniden deneyin.`);
  return y;
}

/** Adresin https olduğunu ve izinli bir ana makineye gittiğini denetler. */
export function adresDenetle(adres: string, izinli: (makine: string) => boolean): URL {
  let u: URL;
  try {
    u = new URL(adres);
  } catch {
    throw new BaglayiciHatasi("Adres geçersiz. Tam adresi (https://…) yapıştırın.");
  }
  if (u.protocol !== "https:") throw new BaglayiciHatasi("Yalnız https adresleri okunur.");
  if (u.username || u.password) throw new BaglayiciHatasi("Adreste giriş bilgisi bulunamaz.");
  if (!izinli(u.hostname.toLowerCase())) throw new BaglayiciHatasi("Bu adres bu bağlayıcının kaynağı değil.");
  return u;
}
