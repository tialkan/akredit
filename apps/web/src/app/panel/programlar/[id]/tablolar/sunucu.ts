// Program tabloları sayfasının sunucu tarafı (İP-47). Gerçek veri kipinde oturumdaki kişinin yetkisiyle
// `odrTablolari.programTablolari` çağrılır. Örnek veri kipinde aynı saf kurucu kurgu Bologna verisiyle
// çalışır; karar kaydedilmez.

import type { odrTablolari as T } from "@akredit/servis";
import { GERCEK_VERI, servisBaglami } from "../../../../../veri/sunucu.ts";
import { ORNEK_BOLOGNA, ornekKayitlari } from "./gorunum.ts";

export { GERCEK_VERI, servisBaglami };

export type TabloSonucu = { tamam: true; durum: T.ProgramTablolari } | { tamam: false; ileti: string };

export async function tabloDurumu(programId: string, programAd: string, cerceveKod: string): Promise<TabloSonucu> {
  const { odrTablolari, ServisHatasi } = await import("@akredit/servis");
  if (!GERCEK_VERI) {
    const cerceve = odrTablolari.cerceveGerekli(cerceveKod);
    const ozet = odrTablolari.tabloCerceveleri().find((c) => c.kod === cerceveKod);
    return {
      tamam: true,
      durum: odrTablolari.durumKur({
        program: { id: programId, ad: programAd },
        cerceve,
        okuma: { kanitId: "ornek", okundu: ORNEK_BOLOGNA.okundu, veri: ORNEK_BOLOGNA },
        kayitlar: ornekKayitlari(ozet?.dersKodlari ?? []),
      }),
    };
  }
  try {
    return {
      tamam: true,
      durum: await odrTablolari.programTablolari(await servisBaglami(), { programId, cerceveKod }),
    };
  } catch (e) {
    if (e instanceof ServisHatasi) return { tamam: false, ileti: e.message };
    throw e;
  }
}
