// Saha ziyareti sayfasının sunucu tarafı (İP-48). Gerçek veri kipinde (demo kiracısı dahil) istekteki
// oturumdan servis bağlamını kurar ve `sahaZiyareti.hazirla` ile listeyi alır. Örnek veri kipinde aynı
// kurallı listeyi kurgu kanıt bağlarıyla kurar; prova işareti örnek kipte kaydedilmez.

import type { sahaZiyareti as S, ServisBaglami } from "@akredit/servis";
import { GERCEK_VERI } from "../../../veri/kip.ts";
import { aktorOlustur } from "../../api/_ortak/v1.ts";
import { ORNEK_EKSIKLER, ORNEK_KANIT_BAGLARI } from "./gorunum.ts";

export { GERCEK_VERI };

/** Oturum yoksa giriş sayfasına yönlendirir. */
export async function servisBaglami(): Promise<ServisBaglami> {
  const [{ headers }, { redirect }, { tekiller }, { ErisimHatasi, istekBaglami }] = await Promise.all([
    import("next/headers"),
    import("next/navigation"),
    import("../../api/_ortak/sunucu.ts"),
    import("../../../kimlik/erisim.ts"),
  ]);
  const basliklar = new Headers(await headers());
  const { kimlik, db } = await tekiller();
  try {
    const b = await istekBaglami(kimlik, new Request(kimlik.ayar.temelAdres, { headers: basliklar }));
    return { db, aktor: aktorOlustur(b), simdi: () => new Date() };
  } catch (e) {
    if (e instanceof ErisimHatasi) redirect("/giris");
    throw e;
  }
}

export type SahaSonucu = { tamam: true; durum: S.SahaDurumu } | { tamam: false; ileti: string };

export async function sahaDurumu(programId: string, programAd: string, cerceveKod: string): Promise<SahaSonucu> {
  const { sahaZiyareti, odr, ServisHatasi } = await import("@akredit/servis");
  if (!GERCEK_VERI) {
    const cerceve = odr.cerceveBul(cerceveKod);
    const liste = sahaZiyareti.sorulariKur({
      cerceve,
      kanitlar: ORNEK_KANIT_BAGLARI,
      eksikCumleler: ORNEK_EKSIKLER,
    });
    return {
      tamam: true,
      durum: { ...liste, programId, programAd, odrSurumu: null, prova: {}, yz: null },
    };
  }
  try {
    return { tamam: true, durum: await sahaZiyareti.hazirla(await servisBaglami(), { programId, cerceveKod }) };
  } catch (e) {
    if (e instanceof ServisHatasi) return { tamam: false, ileti: e.message };
    throw e;
  }
}
