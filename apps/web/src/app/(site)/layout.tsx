import Link from "next/link";
import type { ReactNode } from "react";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Logo } from "../../bilesenler/logo.tsx";

const MENU = [
  { href: "/nasil-calisir", ad: "Nasıl çalışır" },
  { href: "/guvenlik", ad: "Güvenlik" },
  { href: "/belgeler", ad: "Kılavuzlar" },
  { href: "/kvkk", ad: "KVKK" },
  { href: "/acik-kaynak", ad: "Açık kaynak" },
  { href: "/iletisim", ad: "İletişim" },
];

export default function SiteYerlesimi({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" aria-label="Akredit ana sayfa">
            <Logo />
          </Link>
          <nav aria-label="Site menüsü" className="order-3 w-full md:order-none md:w-auto md:flex-1">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="inline-flex min-h-11 items-center text-metin hover:text-vurgu hover:underline"
                  >
                    {m.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex gap-2">
            <Link href="/giris" className={dugmeSinifi("sessiz", "kucuk")}>
              Giriş
            </Link>
            <Link href="/panel" className={dugmeSinifi("birincil", "kucuk")}>
              Örnek paneli gör
            </Link>
          </div>
        </div>
      </header>
      <main id="icerik" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-cizgi bg-yuzey">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm text-soluk sm:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-2 max-w-prose">
              Akredit, Apache 2.0 lisanslı açık kaynak bir yazılımdır. Hiçbir akreditasyon kuruluşunun resmî aracı
              değildir ve akreditasyon sonucu için garanti vermez.
            </p>
          </div>
          <nav aria-label="Alt menü">
            <ul className="grid grid-cols-2 gap-1">
              {MENU.map((m) => (
                <li key={m.href}>
                  <Link href={m.href} className="inline-flex min-h-8 items-center underline-offset-2 hover:underline">
                    {m.ad}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
