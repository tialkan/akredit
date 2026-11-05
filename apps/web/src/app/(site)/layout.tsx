import Link from "next/link";
import type { ReactNode } from "react";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Logo } from "../../bilesenler/logo.tsx";
import { barindirmaAcik } from "../../site/barindirma.ts";
import { DEPO_ADRESI, SAYFALAR, UST_MENU } from "../../site/icerik.ts";
import { SayfaDurumu } from "../../site/sayfa-durumu.tsx";

const ALT_BAG = "inline-flex min-h-11 items-center text-metin underline underline-offset-4 hover:text-vurgu";

export default function SiteYerlesimi({ children }: { children: ReactNode }) {
  const barindirma = barindirmaAcik();
  return (
    <div className="flex min-h-screen flex-col bg-yuzey">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link href="/" aria-label="Akredit ana sayfa" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          {/* Üç öğe: dar ekranda logonun altına iner, açılır menü gerekmez (İP-49). */}
          <nav aria-label="Site menüsü" className="w-full sm:ml-auto sm:w-auto">
            <ul className="flex flex-wrap gap-x-1 sm:justify-end">
              {UST_MENU.map((m) => (
                <li key={m.yol}>
                  <Link
                    href={m.yol}
                    className="inline-flex min-h-11 items-center rounded-sm px-2 text-lg whitespace-nowrap text-metin hover:bg-yuzey-2 hover:text-vurgu"
                  >
                    {m.ad}
                  </Link>
                </li>
              ))}
              {/* Kurum girişi yalnız barındırılan hizmet açıkken görünür (ADR 0008). */}
              {barindirma ? (
                <li>
                  <Link href="/giris" className={dugmeSinifi("ikincil", "kucuk", "min-h-11 rounded-sm")}>
                    Giriş
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      </header>
      <main id="icerik" className="flex-1">
        <SayfaDurumu barindirma={barindirma} />
        {children}
      </main>
      <footer className="border-t border-cizgi bg-zemin">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 text-base text-soluk">
          <p>Akredit açık kaynaktır (Apache-2.0). YÖKAK ya da başka bir akreditasyon kuruluşuyla bağı yoktur.</p>
          <nav aria-label="Alt menü">
            <ul className="flex flex-wrap gap-x-6">
              <li>
                <Link href={SAYFALAR.proje.yol} className={ALT_BAG}>
                  {SAYFALAR.proje.ad}
                </Link>
              </li>
              <li>
                <Link href={SAYFALAR.iletisim.yol} className={ALT_BAG}>
                  {SAYFALAR.iletisim.ad}
                </Link>
              </li>
              {/* KVKK aydınlatma, gizlilik ve koşullar her sayfanın alt bilgisinde (İP-49, WebKVKKrobot). */}
              {[SAYFALAR.kvkk, SAYFALAR.gizlilik, SAYFALAR.kosullar].map((s) => (
                <li key={s.yol}>
                  <Link href={s.yol} className={ALT_BAG}>
                    {s.yol === "/kosullar" ? "Koşullar" : s.ad}
                  </Link>
                </li>
              ))}
              <li>
                <a href={DEPO_ADRESI} className={ALT_BAG}>
                  Kaynak kodu (GitHub)
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
