// Sunucu bileşenlerinin veri kaynağı. Gerçek veri kipinde isteğin çerezinden oturumu çözer ve servis
// kaynağını kurar; oturum yoksa giriş sayfasına yönlendirir. Örnek veri kipinde bellekteki kaynak döner.

import { aktorOlustur } from "../app/api/_ortak/v1.ts";
import { ErisimHatasi, istekBaglami } from "../kimlik/erisim.ts";
import { veriKaynagi as bellekKaynagi } from "./bellek.ts";
import type { VeriKaynagi } from "./kaynak.ts";

export const GERCEK_VERI = process.env.NEXT_PUBLIC_AKREDIT_VERI === "gercek";

export async function panelVeriKaynagi(): Promise<VeriKaynagi> {
  if (!GERCEK_VERI) return bellekKaynagi();
  const [{ headers }, { redirect }, { tekiller }, { ServisVeriKaynagi }] = await Promise.all([
    import("next/headers"),
    import("next/navigation"),
    import("../app/api/_ortak/sunucu.ts"),
    import("./gercek.ts"),
  ]);
  // Önce istek başlıkları: sayfa böylece istek anında üretilir (derlemede veritabanına bağlanılmaz).
  const basliklar = new Headers(await headers());
  const { kimlik, db } = await tekiller();
  try {
    const b = await istekBaglami(kimlik, new Request(kimlik.ayar.temelAdres, { headers: basliklar }));
    return new ServisVeriKaynagi({ db, aktor: aktorOlustur(b), simdi: () => new Date() });
  } catch (e) {
    if (e instanceof ErisimHatasi) redirect("/giris");
    throw e;
  }
}
