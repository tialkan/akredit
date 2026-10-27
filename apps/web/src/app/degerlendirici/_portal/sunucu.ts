// Portal sayfalarının sunucu tarafı: istekteki oturumdan servis bağlamını kurar. Yalnız gerçek veri kipinde
// çalışır; örnek veri kipinde `null` döner (portal kişiye özel kayıt gerektirir, örnek veriyle gösterilmez).

import type { ServisBaglami } from "@akredit/servis";
import type { Saglayici } from "@akredit/yz";
import { aktorOlustur } from "../../api/_ortak/v1.ts";

export const GERCEK_VERI = process.env.NEXT_PUBLIC_AKREDIT_VERI === "gercek";

/** Oturum yoksa giriş sayfasına yönlendirir. */
export async function servisBaglami(): Promise<ServisBaglami | null> {
  if (!GERCEK_VERI) return null;
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

// Soru-cevap için yapay zekâ sağlayıcısı. Üretim bağlantısı (kurum ayarındaki sağlayıcı) sonraki İP'de
// kurulur; o zamana kadar soru-cevap kapalıdır ve uç bunu söyler.
const kuresel = globalThis as unknown as { __akreditPortalSaglayici?: Saglayici | null };
export function portalSaglayicisi(): Saglayici | null {
  return kuresel.__akreditPortalSaglayici ?? null;
}
export function portalSaglayicisiAyarla(s: Saglayici | null): void {
  kuresel.__akreditPortalSaglayici = s;
}
