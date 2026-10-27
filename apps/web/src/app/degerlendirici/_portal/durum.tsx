import type { ReactNode } from "react";
import { BosDurum } from "../../../bilesenler/temel.tsx";
import { hataBilgisi, type PortalBaglami, portalBaglami } from "./portal.ts";
import { servisBaglami } from "./sunucu.ts";

/** Portal bağlamı ya da kullanıcıya gösterilecek durum (örnek kip, süre doldu). */
export async function portalAc(): Promise<{ p: PortalBaglami } | { durum: ReactNode }> {
  const b = await servisBaglami();
  if (!b)
    return {
      durum: (
        <BosDurum
          baslik="Değerlendirici portalı bu sürümde kapalı"
          aciklama="Portal yalnız kurumun gerçek kayıtlarıyla çalışır. Örnek veriyle gösterilmez."
        />
      ),
    };
  try {
    return { p: await portalBaglami(b) };
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return { durum: <BosDurum baslik="Erişim yok" aciklama={h.ileti} /> };
  }
}

export function tarihYaz(d: Date | string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(new Date(d));
}
