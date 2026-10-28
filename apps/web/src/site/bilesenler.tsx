// Tanıtım sitesinin ortak yapı taşları. Düzen: solda dar başlık sütunu, sağda içerik ("dosya" düzeni).
// Kutularda sol vurgu şeridi yoktur; ayrım ince çerçeve ve zeminle yapılır.
// İmza öğesi: yönetmelik dizgisinden paragraf numarası (§) ve iddiayı kaynağına bağlayan dayanak numarası.

import Link from "next/link";
import type { ReactNode } from "react";
import type { DonemAdimi, SayfaBilgisi } from "./icerik.ts";
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
        <h1 className="mt-6 max-w-4xl text-[2.1rem] leading-[1.12] tracking-[-0.015em] text-vurgu sm:text-[3.1rem]">
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
  no,
}: {
  id: string;
  baslik: string;
  not?: ReactNode;
  children: ReactNode;
  zemin?: boolean;
  /** Paragraf numarası (§). Yalnız sayfanın bölümleri sırayla okunacaksa verilir. */
  no?: number;
}) {
  return (
    <section aria-labelledby={id} className={zemin ? "bg-zemin" : "bg-yuzey"}>
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-4 px-4 py-12 sm:py-16 lg:grid-cols-[17rem_1fr]">
        <div>
          {no ? (
            <p className="paragraf-no text-lg" aria-hidden>
              § {no}
            </p>
          ) : null}
          <h2 id={id} className="text-[1.65rem] leading-tight tracking-[-0.01em] text-vurgu">
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

/** Bir dönemin zaman çizelgesi: her satırda zaman, sistemin işi ve hocaya kalan. */
export function DonemCizelgesi({ adimlar }: { adimlar: DonemAdimi[] }) {
  const toplam = adimlar.reduce((t, a) => t + a.dokunus, 0);
  return (
    <div>
      <div className="hidden grid-cols-[10rem_1fr_1fr] gap-6 pb-2 text-sm font-semibold text-soluk md:grid">
        <span>Zaman</span>
        <span>Sistem</span>
        <span>Öğretim elemanı</span>
      </div>
      <ol className="border-b border-cizgi">
        {adimlar.map((a) => (
          <li key={a.zaman} className="grid gap-2 border-t border-cizgi py-4 md:grid-cols-[10rem_1fr_1fr] md:gap-6">
            <p className="font-semibold text-vurgu">{a.zaman}</p>
            <p>
              <span className="font-semibold md:sr-only">Sistem: </span>
              {a.sistem}
            </p>
            <p className="text-metin">
              <span className="font-semibold md:sr-only">Öğretim elemanı: </span>
              {a.hoca}{" "}
              <span className="whitespace-nowrap text-sm text-soluk">
                ({a.dokunus === 0 ? "dokunuş yok" : `${a.dokunus} dokunuş`})
              </span>
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-soluk">
        Toplam: dönem başına {toplam} dokunuş. Komisyon ve yıl sonu kararları yetkili kişilerdedir. Zamanlar örnektir,
        kurumun süreç takvimi belirler.
      </p>
    </div>
  );
}

/** Dayanak imi: iddiayı sayfa sonundaki kaynağa bağlayan numara. */
export function Dayanak({ n }: { n: number }) {
  // Kelime birleştirici (U+2060): numara, önündeki kelimeden ya da noktadan ayrılıp alt satıra düşmez.
  return (
    <sup className="dayanak-imi">
      {"\u2060"}
      <a href={`#dayanak-${n}`} id={`dayanak-imi-${n}`} aria-label={`Dayanak ${n}`}>
        [{n}]
      </a>
    </sup>
  );
}

/** Sayfa sonundaki dayanak listesi. Her öğe depodaki bir dosya ya da resmî belgedir. */
export function Dayanaklar({ ogeler }: { ogeler: string[] }) {
  return (
    <section aria-labelledby="dayanaklar" className="border-t border-cizgi bg-zemin">
      <div className="mx-auto grid max-w-6xl gap-x-12 gap-y-4 px-4 py-10 lg:grid-cols-[17rem_1fr]">
        <div>
          <h2 id="dayanaklar" className="text-xl text-vurgu">
            Dayanaklar
          </h2>
          <p className="mt-2 text-sm text-soluk">Sayfadaki numaralı iddiaların depodaki kaynağı.</p>
        </div>
        <ol className="grid gap-2 text-sm text-soluk">
          {ogeler.map((o, i) => (
            <li key={o} id={`dayanak-${i + 1}`} className="grid grid-cols-[2.5rem_1fr] gap-2 rounded-sm px-1 py-0.5">
              <a
                href={`#dayanak-imi-${i + 1}`}
                className="font-semibold text-petrol"
                aria-label={`Dayanak ${i + 1}, metne dön`}
              >
                [{i + 1}]
              </a>
              <span className="min-w-0 break-words">{o}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
