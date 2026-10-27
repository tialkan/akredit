// Ders dosyası işçisi (İP-16): eşlemesi insanca onaylanmış ders açılışları için ölçmeyi yapar, ders dosyasını
// ve dosya onayı önerisini açar. Böylece hoca eşlemeyi onayladıktan sonra ek bir adım atmaz. Kural ve kayıt
// `@akredit/servis` ders dosyası modülündedir; burası yalnız zamanlar.

import { dersDosyasi } from "@akredit/servis";
import type { Vt } from "@akredit/vt";

export interface DersDosyasiIsciAyari {
  db: Vt;
  kurumlar: () => Promise<string[]>;
  saat: () => Date;
  hata?: (kurumId: string, e: unknown) => void;
}

export function dersDosyasiIscisi(ayar: DersDosyasiIsciAyari) {
  return {
    /** Bütün kurumlarda bir tur; üretilen ders açılışlarının sayısını döndürür. Bir kurumun hatası ötekini durdurmaz. */
    async tur(): Promise<number> {
      let n = 0;
      for (const k of await ayar.kurumlar()) {
        try {
          n += (await dersDosyasi.bekleyenleriUret(ayar.db, k, ayar.saat())).length;
        } catch (e) {
          ayar.hata?.(k, e);
        }
      }
      return n;
    },
  };
}
