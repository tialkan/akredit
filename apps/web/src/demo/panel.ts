// Panelin demo bilgisi (İP-41): istek bir demo oturumuysa seçilen rol ve bitiş; değilse null.
// Gerçek veri kipinde oturumdan okunur. Örnek veri kipinde veritabanı yoktur; tur `?rol=` ile açılır
// (bkz. `rehber-turu.tsx`), burada null döner.

import { ErisimHatasi, istekBaglami } from "../kimlik/erisim.ts";
import { GERCEK_VERI } from "../veri/kip.ts";
import { type DemoRolu, demoRoluMu } from "./roller.ts";

export interface PanelDemoBilgisi {
  rol: DemoRolu;
  bitis: string;
}

export async function panelDemoBilgisi(): Promise<PanelDemoBilgisi | null> {
  if (!GERCEK_VERI) return null;
  const [{ headers }, { tekiller }] = await Promise.all([
    import("next/headers"),
    import("../app/api/_ortak/sunucu.ts"),
  ]);
  const basliklar = new Headers(await headers());
  const { kimlik } = await tekiller();
  try {
    const b = await istekBaglami(kimlik, new Request(kimlik.ayar.temelAdres, { headers: basliklar }));
    if (!b.demo || !demoRoluMu(b.demo.rol)) return null;
    return { rol: b.demo.rol, bitis: b.demo.bitis.toISOString() };
  } catch (e) {
    if (e instanceof ErisimHatasi) return null;
    throw e;
  }
}
