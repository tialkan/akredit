import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { BildirimSaglayici } from "../../bilesenler/etkilesimli.tsx";
import { KenarCubugu } from "../../bilesenler/kenar-cubugu.tsx";
import { Logo } from "../../bilesenler/logo.tsx";
import { OrnekVeriSeridi } from "../../bilesenler/temel.tsx";
import { panelDemoBilgisi } from "../../demo/panel.ts";
import { RehberTuru } from "../../demo/rehber-turu.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../veri/sunucu.ts";

export const metadata = { title: { default: "Panel", template: "%s · Panel · Akredit" } };

export default async function PanelYerlesimi({ children }: { children: ReactNode }) {
  const kaynak = await panelVeriKaynagi();
  const [kullanici, ayarlar, bekleyen, demo] = await Promise.all([
    kaynak.kullanici(),
    kaynak.ayarlar(),
    kaynak.bekleyenOneriler(),
    panelDemoBilgisi(),
  ]);
  return (
    <BildirimSaglayici>
      <div className="flex min-h-screen flex-col">
        {GERCEK_VERI ? null : <OrnekVeriSeridi />}
        {/* Demo oturumu (İP-41): "Örnek veri, gerçek kurum değildir" şeridi ve rehber turu. */}
        <Suspense fallback={null}>
          <RehberTuru rol={demo?.rol ?? null} />
        </Suspense>
        <header className="border-b border-cizgi bg-yuzey">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
            <Link href="/" aria-label="Akredit ana sayfa">
              <Logo />
            </Link>
            <span className="text-soluk">{ayarlar.kurumAdi}</span>
            <span className="ml-auto text-sm">
              <span className="font-semibold">{kullanici.ad}</span>
              <span className="text-soluk"> · {kullanici.unvan}</span>
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col md:flex-row">
          <KenarCubugu bekleyenSayisi={bekleyen.length} />
          <main id="icerik" className="min-w-0 flex-1 px-4 py-6 sm:px-8">
            {children}
          </main>
        </div>
      </div>
    </BildirimSaglayici>
  );
}
