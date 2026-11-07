// Platformun bugünkü durumu ve sponsor çağrısı (kurucu kararı 2026-11-01, ADR 0008). Ana sayfada ve askıdaki
// sayfalarda (/kurum-ac, /pilot, /giris) aynı metin gösterilir.
import Link from "next/link";
import { DEPO_ADRESI, ILETISIM_ADRESI, PLATFORM_DURUMU, SPONSOR_CAGRISI } from "./icerik.ts";

const BAG = "text-vurgu underline underline-offset-4";

export function PlatformDurumu({ baslikId = "platform-durumu" }: { baslikId?: string }) {
  return (
    <section aria-labelledby={baslikId} className="rounded-sm border border-cizgi-guclu bg-zemin p-5 sm:p-6">
      <h2 id={baslikId} className="text-xl font-semibold text-metin">
        Durum
      </h2>
      <ul className="mt-3 grid list-disc gap-2 pl-5">
        {PLATFORM_DURUMU.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      <p className="mt-4">{SPONSOR_CAGRISI}</p>
      <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
        <a href={ILETISIM_ADRESI} className={`inline-flex min-h-11 items-center ${BAG}`}>
          Sponsor olmak için iletişim: LinkedIn
        </a>
        <Link href="/kurum-demosu" className={`inline-flex min-h-11 items-center ${BAG}`}>
          Demonun durumu
        </Link>
        <a href={DEPO_ADRESI} className={`inline-flex min-h-11 items-center ${BAG}`}>
          Açık kaynak deposu
        </a>
      </p>
    </section>
  );
}
