// ÖDR tablo eşlemesi YZ öneri işi (İP-47). Panel "Öneri iste" ile isteği günlüğe yazar; süreç turu yanıtlanmamış
// istekleri `odr.esleme_oneri` kuyruğuna koyar (istek başına tek iş), iş isteyen kişinin yetkisiyle öneri üretir.
// Kural ve kayıt `@akredit/servis` (`odrTablolari.yzOnerisi`) içindedir; burası yalnız kuyruğa bağlar.
// Öneri tabloya girmez; kurum kullanıcısı onay formunda onaylar.

import { type FabrikaSecenegi, kurumSaglayicisi, odrTablolari } from "@akredit/servis";
import type { Vt } from "@akredit/vt";
import type { Saglayici } from "@akredit/yz";
import { z } from "zod";

export const ESLEME_ONERI_KUYRUGU = "odr.esleme_oneri";

export const EslemeOneriIsi = z.object({
  kurumId: z.uuid(),
  istekId: z.uuid(),
  kisiId: z.uuid(),
  programId: z.uuid(),
  cerceveKod: z.string().min(1).max(100),
  zaman: z.string(),
});
export type EslemeOneriIsi = z.infer<typeof EslemeOneriIsi>;

/** Kurumun yanıtlanmamış isteklerini kuyruğa koyar; tekil anahtar istek kimliğidir. */
export async function bekleyenOnerileriKuyrugaKoy(
  db: Vt,
  kurumId: string,
  gonder: (veri: EslemeOneriIsi, anahtar: string) => Promise<unknown>,
): Promise<number> {
  const istekler = await odrTablolari.yzOnerisi.bekleyenOneriIstekleri(db, kurumId);
  for (const i of istekler) await gonder({ kurumId, ...i }, `esleme-oneri:${i.istekId}`);
  return istekler.length;
}

export interface EslemeOneriBaglami {
  db: Vt;
  simdi: () => Date;
  kurumFabrikasi: FabrikaSecenegi;
  /** Yalnız testte: sabit sağlayıcı. */
  saglayici?: Saglayici;
}

/** Tek isteği işler. Sağlayıcı kurumun anahtarıyla (çıkış kapısı ve maske dahil) kurulur. */
export function eslemeOneriIsi(c: EslemeOneriBaglami, is: EslemeOneriIsi) {
  const fabrika: odrTablolari.yzOnerisi.SaglayiciFabrikasi = c.saglayici
    ? async () => ({ saglayici: c.saglayici as Saglayici })
    : async (kurumId) => {
        const k = await kurumSaglayicisi(c.db, kurumId, { ...c.kurumFabrikasi, simdi: c.simdi });
        return { saglayici: k.saglayici, maske: k.ayar.maske };
      };
  const { kurumId, ...istek } = is;
  return odrTablolari.yzOnerisi.istegiIsle({ db: c.db, simdi: c.simdi, fabrika }, kurumId, istek);
}
