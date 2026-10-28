import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetinSayfasi } from "../../../../bilesenler/logo.tsx";
import { KILAVUZLAR, kilavuzBul, OKUR_ADI } from "../icerik.ts";

export function generateStaticParams() {
  return KILAVUZLAR.map((k) => ({ kilavuz: k.yol }));
}

type Parametre = { params: Promise<{ kilavuz: string }> };

export async function generateMetadata({ params }: Parametre): Promise<Metadata> {
  const k = kilavuzBul((await params).kilavuz);
  if (!k) return { title: "Kılavuz bulunamadı" };
  return {
    title: `${k.baslik} (kılavuz)`,
    description: k.ozet,
    alternates: { canonical: `https://akredit.org/belgeler/${k.yol}` },
  };
}

export default async function KilavuzSayfasi({ params }: Parametre) {
  const k = kilavuzBul((await params).kilavuz);
  if (!k) notFound();
  return (
    <MetinSayfasi baslik={k.baslik} ozet={k.ozet}>
      <p>
        {OKUR_ADI[k.okur]} · Okuma süresi yaklaşık {k.dakika} dakika · <Link href="/belgeler">Bütün kılavuzlar</Link>
      </p>
      {k.bolumler.map((b) => (
        <section key={b.baslik}>
          <h2>{b.baslik}</h2>
          {b.paragraflar?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {b.adimlar ? (
            <ol>
              {b.adimlar.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
          ) : null}
        </section>
      ))}
      <section aria-labelledby="sinirlar">
        <h2 id="sinirlar">Şu an yapılamayanlar</h2>
        <ul>
          {k.sinirlar.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      {k.panel ? (
        <p>
          İlgili sayfa: <Link href={k.panel}>panelde aç</Link>. Panel, giriş yaptığınızda kurumunuzun kayıtlarıyla
          açılır.
        </p>
      ) : null}
    </MetinSayfasi>
  );
}
