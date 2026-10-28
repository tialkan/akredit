import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../bilesenler/logo.tsx";
import { SAYFALAR } from "../site/icerik.ts";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false } };

/** 404. Kayıt dilinde yazılır: aranan adres, sonuç ve gidilecek yerler. */
export default function Bulunamadi() {
  return (
    <div className="flex min-h-screen flex-col bg-yuzey">
      <header className="border-b border-cizgi">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-2">
          <Link href="/" aria-label="Akredit ana sayfa" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
        </div>
      </header>
      <main id="icerik" className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-14 lg:grid-cols-[17rem_1fr]">
        <p className="paragraf-no text-5xl" aria-hidden>
          404
        </p>
        <div>
          <h1 className="text-[2rem] leading-tight text-vurgu sm:text-[2.6rem]">Bu adreste sayfa yok</h1>
          <p className="mt-4 max-w-[60ch] text-lg">
            Adres yanlış yazılmış ya da sayfa kaldırılmış olabilir. Adresi denetleyin ya da aşağıdaki sayfalardan birine
            geçin.
          </p>
          <ul className="mt-8 max-w-xl border-b border-cizgi">
            {[SAYFALAR.ana, SAYFALAR.neYapar, SAYFALAR.nasil, SAYFALAR.sss, SAYFALAR.iletisim].map((s) => (
              <li key={s.yol} className="border-t border-cizgi">
                <Link
                  href={s.yol}
                  className="flex min-h-11 items-center py-2 font-semibold text-vurgu underline-offset-4 hover:underline"
                >
                  {s.ad}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
