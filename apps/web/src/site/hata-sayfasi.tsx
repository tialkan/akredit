// 404, 500 ve bakım sayfalarının ortak iskeleti (İP-49). Sade, açık tema, kısa Türkçe: ne oldu, ne yapılabilir.
// Her birinde ana sayfaya ve tek iletişim kanalına (LinkedIn) bağlantı vardır. Bağımlılığı azdır; global-error
// içinde de kullanılabilir (Next bileşeni kullanmaz, sıradan <a> ile bağlanır).

import type { ReactNode } from "react";
import { Logo } from "../bilesenler/logo.tsx";
import { ILETISIM_ADRESI } from "./iletisim.ts";

const BAG = "inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4";

export function HataSayfasi({
  kod,
  baslik,
  children,
  eylem,
}: {
  /** Büyük, süs amaçlı numara (404, 500); ekran okuyucudan gizlenir. */
  kod?: string;
  baslik: string;
  children: ReactNode;
  /** İsteğe bağlı ilk eylem (ör. "Yeniden deneyin" düğmesi). */
  eylem?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-yuzey text-metin">
      <header className="border-b border-cizgi">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-2">
          <a href="/" aria-label="Akredit ana sayfa" className="inline-flex min-h-11 items-center">
            <Logo />
          </a>
        </div>
      </header>
      <main id="icerik" className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-14 lg:grid-cols-[17rem_1fr]">
        {kod ? (
          <p className="paragraf-no text-5xl" aria-hidden>
            {kod}
          </p>
        ) : (
          <span aria-hidden />
        )}
        <div>
          <h1 className="text-[2rem] leading-tight text-vurgu sm:text-[2.6rem]">{baslik}</h1>
          <div className="mt-4 grid max-w-[60ch] gap-3 text-lg">{children}</div>
          <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {eylem}
            <a href="/" className={BAG}>
              Ana sayfaya dönün
            </a>
            <a href={ILETISIM_ADRESI} className={BAG}>
              İletişim: LinkedIn
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
