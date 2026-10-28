import Link from "next/link";
import type { ReactNode } from "react";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Logo } from "../../bilesenler/logo.tsx";
import { ALT_MENU, DURUM_NOTU, UST_MENU } from "../../site/icerik.ts";

function MenuListesi({ sinif }: { sinif: string }) {
  return (
    <ul className={sinif}>
      {UST_MENU.map((m) => (
        <li key={m.yol}>
          <Link
            href={m.yol}
            className="inline-flex min-h-11 items-center rounded-sm px-2 whitespace-nowrap text-metin hover:bg-yuzey-2 hover:text-vurgu"
          >
            {m.ad}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SiteYerlesimi({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-yuzey">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <Link href="/" aria-label="Akredit ana sayfa" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          <nav aria-label="Site menüsü" className="hidden flex-1 xl:block">
            <MenuListesi sinif="flex justify-end" />
          </nav>
          <div className="ml-auto flex items-center gap-2 xl:ml-2">
            <Link
              href="/deneyin"
              className="inline-flex min-h-11 items-center px-2 font-semibold text-vurgu underline underline-offset-4"
            >
              Deneyin
            </Link>
            <Link
              href="/kurum-ac"
              className="hidden min-h-11 items-center px-2 font-semibold text-vurgu underline underline-offset-4 sm:inline-flex"
            >
              Kurumunuzu açın
            </Link>
            <Link href="/giris" className={dugmeSinifi("ikincil", "kucuk", "min-h-11 rounded-sm")}>
              Giriş
            </Link>
            {/* Dar ekranda menü: betiksiz açılır kapanır öğe. */}
            <details className="relative xl:hidden">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-sm border border-cizgi-guclu px-3 font-semibold [&::-webkit-details-marker]:hidden">
                Menü
              </summary>
              <nav
                aria-label="Kısa menü"
                className="absolute right-0 z-20 mt-2 w-64 rounded-sm border border-cizgi bg-yuzey p-2"
              >
                <MenuListesi sinif="grid" />
              </nav>
            </details>
          </div>
        </div>
      </header>
      <main id="icerik" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-cizgi bg-zemin">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[17rem_1fr] lg:gap-x-12">
          <div className="text-sm text-soluk">
            <Logo />
            <p className="mt-3">
              Apache-2.0 lisanslı açık kaynak yazılım. Hiçbir akreditasyon kuruluşunun resmî aracı değildir.
            </p>
            <p className="mt-3">{DURUM_NOTU}</p>
          </div>
          <nav aria-label="Alt menü" className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4">
            {ALT_MENU.map((g) => (
              <div key={g.baslik}>
                <h2 className="font-semibold text-metin">{g.baslik}</h2>
                <ul className="mt-2">
                  {g.sayfalar.map((s) => (
                    <li key={s.yol}>
                      <Link
                        href={s.yol}
                        className="inline-flex min-h-8 items-center text-soluk underline-offset-4 hover:text-vurgu hover:underline"
                      >
                        {s.ad}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
