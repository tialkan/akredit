import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, SayfaBasi, Tanimlar, YapisalVeri } from "../../../site/bilesenler.tsx";
import { BAGLAYICILAR, MODULLER, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.neYapar);

function Liste({ ogeler }: { ogeler: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {ogeler.map((o) => (
        <li key={o}>{o}</li>
      ))}
    </ul>
  );
}

export default function NeYapar() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.neYapar} />
      <SayfaBasi
        sayfa={SAYFALAR.neYapar}
        ozet="Akredit birbirine bağlı modüllerden oluşur. Her modül için neyin girdiği, neyin çıktığı ve öğretim elemanına ne kaldığı aşağıda yazılı."
      >
        <nav aria-label="Modüller" className="mt-8">
          <ul className="flex flex-wrap gap-2 text-sm">
            {MODULLER.map((m) => (
              <li key={m.kimlik}>
                <a
                  href={`#${m.kimlik}`}
                  className="inline-flex min-h-9 items-center rounded-sm border border-cizgi px-3 hover:bg-yuzey-2"
                >
                  {m.ad}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </SayfaBasi>
      <Bolum
        id="baglayici-tablosu"
        baslik="Hangi sistemden ne okunur"
        not="Kanıt kurumun zaten kullandığı sistemlerden gelir. Her bağlayıcının okuduğu ve okumadığı."
        zemin
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <caption className="sr-only">Bağlayıcılar, okudukları ve okumadıkları</caption>
            <thead>
              <tr className="border-b-2 border-cizgi-guclu">
                <th scope="col" className="py-2 pr-4">
                  Sistem
                </th>
                <th scope="col" className="py-2 pr-4">
                  Okur
                </th>
                <th scope="col" className="py-2">
                  Okumaz
                </th>
              </tr>
            </thead>
            <tbody>
              {BAGLAYICILAR.map((b) => (
                <tr key={b.ad} className="border-b border-cizgi align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {b.ad}
                  </th>
                  <td className="py-3 pr-4">{b.okur}</td>
                  <td className="py-3 text-soluk">{b.okumaz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-soluk">
          Bağlayıcılar yazıldı ve kayıtlı örneklerle sınandı. Canlı kurum sistemlerinde pilot denemesi henüz yapılmadı.
          Panelden bağlayıcı açma ekranı henüz yok.
        </p>
      </Bolum>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {MODULLER.map((m) => (
          <section
            key={m.kimlik}
            id={m.kimlik}
            aria-labelledby={`${m.kimlik}-baslik`}
            className="grid scroll-mt-6 gap-x-12 gap-y-4 border-b border-cizgi py-10 last:border-b-0 lg:grid-cols-[17rem_1fr]"
          >
            <div>
              <h2 id={`${m.kimlik}-baslik`} className="text-[1.65rem] leading-tight tracking-[-0.01em] text-vurgu">
                {m.ad}
              </h2>
              <p className="mt-2 text-soluk">{m.ozet}</p>
            </div>
            <div className="min-w-0">
              <Tanimlar
                ogeler={[
                  { ad: "Ne girer", deger: <Liste ogeler={m.girer} /> },
                  { ad: "Ne çıkar", deger: <Liste ogeler={m.cikar} /> },
                  { ad: "Hocaya kalan", deger: <p className="font-semibold">{m.hoca}</p> },
                  ...(m.not ? [{ ad: "Not", deger: <p className="text-soluk">{m.not}</p> }] : []),
                ]}
              />
            </div>
          </section>
        ))}
        <p className="py-8 text-soluk">
          Modüllerin hangi rolde nasıl görüldüğü{" "}
          <Link href="/kimler-icin" className="font-semibold text-vurgu underline underline-offset-4">
            Kimler için
          </Link>{" "}
          sayfasında, öneriden onaya akış{" "}
          <Link href="/nasil-calisir" className="font-semibold text-vurgu underline underline-offset-4">
            Nasıl çalışır
          </Link>{" "}
          sayfasındadır.
        </p>
      </div>
    </>
  );
}
