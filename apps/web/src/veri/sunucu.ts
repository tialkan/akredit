// Sunucu bileşenlerinin veri kaynağı. Gerçek veri kipinde isteğin çerezinden oturumu çözer ve servis
// kaynağını kurar; oturum yoksa giriş sayfasına yönlendirir. Örnek veri kipinde bellekteki kaynak döner.

import type { gosterge as G, ServisBaglami } from "@akredit/servis";
import { aktorOlustur } from "../app/api/_ortak/v1.ts";
import { ErisimHatasi, istekBaglami } from "../kimlik/erisim.ts";
import { veriKaynagi as bellekKaynagi } from "./bellek.ts";
import type { VeriKaynagi } from "./kaynak.ts";
import { GERCEK_VERI } from "./kip.ts";
import { ORNEK_SIMDI } from "./ornek.ts";

export { GERCEK_VERI };

/** Panelde "kaç gün kaldı" hesabının bugünü: gerçek kipte şimdiki zaman, örnek kipte örneğin sabit günü. */
export function panelSimdi(): string {
  return GERCEK_VERI ? new Date().toISOString() : ORNEK_SIMDI;
}

export async function panelVeriKaynagi(): Promise<VeriKaynagi> {
  if (!GERCEK_VERI) return bellekKaynagi();
  const { ServisVeriKaynagi } = await import("./gercek.ts");
  return new ServisVeriKaynagi(await servisBaglami());
}

/**
 * Gösterge panosu verisi (D3-4). Gerçek veri kipinde kayıtlardan (`@akredit/servis gosterge`); örnek veri
 * kipinde uydurma örnek. Kurum kapsamında ölçme okuma yetkisi yoksa `null`.
 */
export async function gostergeVerisi(): Promise<G.GostergePanosu | null> {
  if (!GERCEK_VERI) {
    const o = await import("../app/panel/gostergeler/ornek.ts");
    return {
      donemler: [...o.ORNEK_DONEMLER],
      tanimlar: o.ORNEK_TANIMLAR,
      veriler: o.ORNEK_VERILER,
      reddedilenler: [],
    };
  }
  const { gosterge, ServisHatasi } = await import("@akredit/servis");
  try {
    return await gosterge.gostergePanosu(await servisBaglami());
  } catch (e) {
    if (e instanceof ServisHatasi && e.kod === "yetki_yok") return null;
    throw e;
  }
}

async function servisBaglami(): Promise<ServisBaglami> {
  const [{ headers }, { redirect }, { tekiller }] = await Promise.all([
    import("next/headers"),
    import("next/navigation"),
    import("../app/api/_ortak/sunucu.ts"),
  ]);
  // Önce istek başlıkları: sayfa böylece istek anında üretilir (derlemede veritabanına bağlanılmaz).
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
