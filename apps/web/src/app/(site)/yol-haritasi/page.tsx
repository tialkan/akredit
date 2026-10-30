import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { DEPO_ADRESI, SAYFALAR, YOL_HARITASI } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.yolHaritasi);

const DALGALAR = [
  { dalga: "simdi", baslik: "Şimdi yapılanlar", not: "Bu işler sürüyor." },
  { dalga: "sonra", baslik: "Sıradakiler", not: "Şimdiki işler bitince başlar." },
  {
    dalga: "tamam",
    baslik: "Tamamlananlar",
    not: "Kabul ölçütleri karşılandı. Pilot ve canlı kullanım ayrıca izlenir.",
  },
] as const;

export default function YolHaritasi() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.yolHaritasi} />
      <SayfaBasi
        sayfa={SAYFALAR.yolHaritasi}
        ozet={
          <>
            Akredit iş paketleriyle ilerler. Her paketin kapsamı ve kabul ölçütü açık kaynak deposunda yazılıdır. Tarih
            verilmez; bir iş bitince durumu güncellenir. Bugün çalışan modüller{" "}
            <Link href="/ne-yapar" className="font-semibold text-vurgu underline underline-offset-4">
              Ne yapar
            </Link>{" "}
            sayfasında.
          </>
        }
      />
      {DALGALAR.map((d, i) => (
        <Bolum key={d.dalga} id={d.dalga} baslik={d.baslik} not={d.not} zemin={i % 2 === 1}>
          <ol className="border-b border-cizgi">
            {YOL_HARITASI.filter((y) => y.dalga === d.dalga).map((y) => (
              <li key={y.no} className="grid gap-1 border-t border-cizgi py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <p className="font-semibold text-vurgu">{y.ad}</p>
                <p>{y.metin}</p>
              </li>
            ))}
          </ol>
        </Bolum>
      ))}
      <Bolum id="kaynak" baslik="Ayrıntı" not="İş paketlerinin tamamı.">
        <p>
          Bütün iş paketleri, durumları ve kabul ölçütleri{" "}
          <a
            href={`${DEPO_ADRESI}/blob/main/plan.md`}
            className="font-semibold text-vurgu underline underline-offset-4"
          >
            proje planında
          </a>
          . Pilot uygulamaya katılmak için{" "}
          <Link href="/pilot" className="font-semibold text-vurgu underline underline-offset-4">
            başvurun
          </Link>
          .
        </p>
      </Bolum>
    </>
  );
}
