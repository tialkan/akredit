// Projenin devam eden ayrıntıları (kurucu isteği, İP-49). Ana yoldan çekilen bütün sayfalar gruplu ve dürüst
// durum etiketiyle listelenir. Durumlar plan.md §8 ve ADR 0008 ile tutarlıdır (src/site/icerik.ts PROJE_GRUPLARI).

import type { Metadata } from "next";
import Link from "next/link";
import { barindirmaAcik } from "../../../site/barindirma.ts";
import { YapisalVeri } from "../../../site/bilesenler.tsx";
import { DurumEtiketi } from "../../../site/durum-etiketi.tsx";
import { GORSELLER, Gorsel } from "../../../site/gorsel.tsx";
import { DEPO_ADRESI, gecerliDurum, type PROJE_DURUM_ADI, PROJE_GRUPLARI, SAYFALAR } from "../../../site/icerik.ts";
import { PlatformDurumu } from "../../../site/platform-durumu.tsx";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.proje);

const BAG = "text-vurgu underline underline-offset-4";

const ANLAMLAR: { durum: keyof typeof PROJE_DURUM_ADI; anlam: string }[] = [
  { durum: "calisiyor", anlam: "Açık, kullanılabilir." },
  { durum: "askida", anlam: "Hazır, sponsor bulunana kadar kapalı." },
  { durum: "taslak", anlam: "Son hâlini almadı." },
];

export default function Proje() {
  const barindirma = barindirmaAcik();
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.proje} />
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-10 sm:pt-10 lg:max-w-6xl">
          <nav aria-label="Konum" className="text-base text-soluk">
            <ol className="flex flex-wrap gap-x-2">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-4">
                  Ana sayfa
                </Link>
              </li>
              <li aria-hidden className="inline-flex min-h-11 items-center">
                /
              </li>
              <li aria-current="page" className="inline-flex min-h-11 items-center">
                {SAYFALAR.proje.ad}
              </li>
            </ol>
          </nav>
          <div className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-12">
            <div>
              <h1 className="text-[2.3rem] leading-[1.08] tracking-[-0.025em] text-vurgu sm:text-[3.2rem]">
                {SAYFALAR.proje.baslik}
              </h1>
              <div className="mt-5 grid max-w-[62ch] gap-3 text-lg">
                <p>
                  Yazılım açık kaynak (Apache-2.0,{" "}
                  <a href={DEPO_ADRESI} className={BAG}>
                    GitHub
                  </a>
                  ). Kurum hizmeti sponsor bulunana kadar askıda. Bugün açık olan:{" "}
                  <Link href="/" className={BAG}>
                    kendi yapay zekânıza eklenen araçlar
                  </Link>
                  .
                </p>
              </div>
              <dl className="mt-6 grid gap-2 text-base">
                {ANLAMLAR.map((a) => (
                  <div key={a.durum} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <dt>
                      <DurumEtiketi durum={a.durum} />
                    </dt>
                    <dd className="text-soluk">{a.anlam}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="gravur-levha w-full max-w-md lg:max-w-none">
              <Gorsel
                gorsel={GORSELLER.avlu}
                alt="Gravür çizim: kemerli revaklarla çevrili, ağaçlı ve ortasında havuz bulunan bir üniversite avlusu."
                boyutlar="(min-width: 64rem) 30rem, (min-width: 28rem) 28rem, calc(100vw - 2rem)"
                oncelikli
              />
            </div>
          </div>
        </div>
      </header>

      {PROJE_GRUPLARI.map((g, i) => {
        const id = `grup-${i + 1}`;
        return (
          <section key={g.baslik} aria-labelledby={id} className={i % 2 === 0 ? "bg-zemin" : "bg-yuzey"}>
            <div className="mx-auto max-w-4xl px-4 py-10">
              <h2 id={id} className="text-[1.75rem] leading-tight text-vurgu">
                {g.baslik}
              </h2>
              <p className="mt-2 text-lg text-soluk">{g.not}</p>
              <ul className="mt-5 border-b border-cizgi">
                {g.sayfalar.map((s) => {
                  const { durum, not } = gecerliDurum(s, barindirma);
                  return (
                    <li key={s.yol} data-proje-sayfasi={s.yol} className="border-t border-cizgi py-4">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <Link href={s.yol} className={`inline-flex min-h-11 items-center text-xl ${BAG}`}>
                          {s.ad}
                        </Link>
                        <DurumEtiketi durum={durum} />
                      </div>
                      <p className="mt-1">{s.aciklama}</p>
                      <p className="mt-1 text-soluk">{not}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        );
      })}

      <div className="border-t border-cizgi bg-yuzey">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <PlatformDurumu />
        </div>
      </div>
    </>
  );
}
