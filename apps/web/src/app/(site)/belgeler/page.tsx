import type { Metadata } from "next";
import Link from "next/link";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { KILAVUZLAR, OKUR_ADI, type Okur } from "./icerik.ts";

export const metadata: Metadata = { title: "Kılavuzlar" };

const OKURLAR: Okur[] = ["hoca", "kalite", "bilgi-islem"];

export default function Belgeler() {
  return (
    <MetinSayfasi
      baslik="Kılavuzlar"
      ozet="Kısa, işe göre kılavuzlar. Her biri birkaç dakikada okunur ve bugün neyin yapılamadığını da açıkça yazar."
    >
      {OKURLAR.map((okur) => (
        <section key={okur} aria-labelledby={`okur-${okur}`}>
          <h2 id={`okur-${okur}`}>{OKUR_ADI[okur]}</h2>
          <ul>
            {KILAVUZLAR.filter((k) => k.okur === okur).map((k) => (
              <li key={k.yol}>
                <Link href={`/belgeler/${k.yol}`}>{k.baslik}</Link> ({k.dakika} dakika): {k.ozet}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <h2>Yardım</h2>
      <p>
        Kılavuzda yanıtını bulamadığınız bir soru için <Link href="/iletisim">iletişim sayfasını</Link> kullanın.
      </p>
    </MetinSayfasi>
  );
}
