import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../../bilesenler/logo.tsx";
import { PortalMenusu } from "./_portal/menu.tsx";

export const metadata = { title: { default: "Kanıt odası", template: "%s · Değerlendirici · Akredit" } };

export default function DegerlendiriciYerlesimi({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link href="/" aria-label="Akredit ana sayfa">
            <Logo />
          </Link>
          <PortalMenusu />
          <span className="ml-auto text-sm text-soluk">Salt okunur erişim</span>
        </div>
      </header>
      <main id="icerik" className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        {children}
      </main>
    </div>
  );
}
