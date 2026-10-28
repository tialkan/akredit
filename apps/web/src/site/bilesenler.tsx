// Tanıtım sitesinin ortak yapı taşları. Düzen: solda dar başlık sütunu, sağda içerik ("dosya" düzeni).
// Kutularda sol vurgu şeridi yoktur; ayrım ince çerçeve ve zeminle yapılır.

import Link from "next/link";
import type { ReactNode } from "react";
import type { SayfaBilgisi } from "./icerik.ts";
import { yapisalVeri } from "./yapisal.ts";

/** JSON-LD. İçerik kodda sabit veridir, kullanıcı girdisi değildir; "<" kaçışlanır. */
export function YapisalVeri({ sayfa, ek }: { sayfa: SayfaBilgisi; ek?: object[] }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: sabit JSON-LD, kullanıcı girdisi içermez
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: yapisalVeri(sayfa, ek) }} />;
}

export function SayfaBasi({ sayfa, ozet, children }: { sayfa: SayfaBilgisi; ozet: ReactNode; children?: ReactNode }) {
  return (
    <header className="border-b border-cizgi bg-yuzey">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-10 sm:pb-14">
        <nav aria-label="Konum" className="text-sm text-soluk">
          <ol className="flex flex-wrap gap-x-2">
            <li>
              <Link href="/" className="underline underline-offset-4 hover:text-vurgu">
                Ana sayfa
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page">{sayfa.ad}</li>
          </ol>
        </nav>
        <h1 className="mt-6 max-w-4xl text-[2.1rem] leading-[1.1] font-bold tracking-[-0.02em] text-vurgu sm:text-5xl">
          {sayfa.baslik}
        </h1>
        <div className="mt-5 max-w-[62ch] text-lg text-metin">{ozet}</div>
        {children}
      </div>
    </header>
  );
}

/** İki sütunlu bölüm: solda başlık ve kısa not, sağda içerik. Dar ekranda alt alta. */
export function Bolum({
  id,
  baslik,
  not,
  children,
  zemin = false,
}: {
  id: string;
  baslik: string;
  not?: ReactNode;
  children: ReactNode;
  zemin?: boolean;
}) {
  return (
    <section aria-labelledby={id} className={zemin ? "bg-zemin" : "bg-yuzey"}>
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-4 px-4 py-12 sm:py-16 lg:grid-cols-[17rem_1fr]">
        <div>
          <h2 id={id} className="text-2xl leading-tight font-bold tracking-[-0.01em]">
            {baslik}
          </h2>
          {not ? <p className="mt-2 text-soluk">{not}</p> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** Uzun metin bloğu: okunur satır uzunluğu, liste ve bağlantı biçimleri. */
export function Metin({ children }: { children: ReactNode }) {
  return <div className="metin-sayfa [&>*:first-child]:mt-0">{children}</div>;
}

/** Taslak uyarısı: hukuk metinleri ve doğrulanmamış bilgiler için. */
export function TaslakNotu({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="mt-6 rounded-sm border border-risk-orta bg-risk-orta-zemin px-4 py-3 text-risk-orta">
      {children}
    </div>
  );
}

/** Tanım listesi: "Girer / Çıkar / Hocaya kalan" gibi etiketli satırlar. */
export function Tanimlar({ ogeler }: { ogeler: { ad: string; deger: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[9rem_1fr]">
      {ogeler.map((o) => (
        <div key={o.ad} className="contents">
          <dt className="font-semibold text-soluk">{o.ad}</dt>
          <dd className="min-w-0">{o.deger}</dd>
        </div>
      ))}
    </dl>
  );
}
