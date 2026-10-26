import Link from "next/link";
import type { ReactNode } from "react";
import { BildirimSaglayici } from "../../bilesenler/etkilesimli.tsx";
import { KenarCubugu } from "../../bilesenler/kenar-cubugu.tsx";
import { Logo } from "../../bilesenler/logo.tsx";
import { OrnekVeriSeridi } from "../../bilesenler/temel.tsx";
import { veriKaynagi } from "../../veri/bellek.ts";

export const metadata = { title: { default: "Panel", template: "%s · Panel · Akredit" } };

export default async function PanelYerlesimi({ children }: { children: ReactNode }) {
  const kaynak = veriKaynagi();
  const [kullanici, ayarlar, bekleyen] = await Promise.all([
    kaynak.kullanici(),
    kaynak.ayarlar(),
    kaynak.bekleyenOneriler(),
  ]);
  return (
    <BildirimSaglayici>
      <div className="flex min-h-screen flex-col">
        <OrnekVeriSeridi />
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
