import type { Metadata } from "next";
import Link from "next/link";
import { SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR, SSS } from "../../../site/icerik.ts";
import { sayfaUstVerisi, sssVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.sss);

export default function Sss() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.sss} ek={[sssVerisi(SSS)]} />
      <SayfaBasi sayfa={SAYFALAR.sss} ozet="Kısa cevaplar. Ayrıntısı ilgili sayfada." />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="max-w-3xl divide-y divide-cizgi border-y border-cizgi">
          {SSS.map((x) => (
            <details key={x.soru} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {x.soru}
                <span
                  aria-hidden
                  className="text-2xl leading-none text-soluk group-open:rotate-45 motion-safe:transition-transform"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[66ch] pb-5 text-metin">{x.cevap}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-soluk">
          Sorunuz burada yoksa{" "}
          <Link href="/iletisim" className="font-semibold text-vurgu underline underline-offset-4">
            iletişim
          </Link>{" "}
          sayfasındaki yoldan yazın.
        </p>
      </div>
    </>
  );
}
