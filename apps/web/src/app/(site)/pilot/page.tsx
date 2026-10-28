import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, SayfaBasi, Tanimlar, YapisalVeri } from "../../../site/bilesenler.tsx";
import { PILOT_ROLLERI, PILOT_SURECLERI, SAYFALAR, SORUMLULUK } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";
import { PilotFormu } from "./pilot-formu.tsx";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.pilot);

// Dayanak: plan.md §1 (iş yükü pilotta önce/sonra ölçülür), İP-30 (pilot ve iş yükü ölçümü), İP-42.

export default function Pilot() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.pilot} />
      <SayfaBasi
        sayfa={SAYFALAR.pilot}
        ozet="Akredit'i kurumunuzun gerçek verisiyle, seçtiğiniz bir süreçte çalıştırın. Hocalarınızın kalite işine ayırdığı süreyi birlikte ölçelim."
      />
      <Bolum id="pilot-nedir" baslik="Pilotta ne olur">
        <Tanimlar
          ogeler={[
            {
              ad: "Kapsam",
              deger: "Bir birim ve bir süreçle başlanır. Örneğin bir programın Bologna sayfaları ya da ders dosyaları.",
            },
            {
              ad: "Ölçüm",
              deger:
                "Öğretim elemanının onay ekranında geçirdiği süre ölçülür. Önceki dönemle karşılaştırılır, sonuç kurumla paylaşılır.",
            },
            {
              ad: "Veri",
              deger:
                "Öğrenci numarası takma ada çevrilir. Kişisel veri, kurum izin vermedikçe yurt dışına gitmez. İsterseniz kurum içi kurulumla başlanır.",
            },
            { ad: "Ücret", deger: "Yazılım ücretsizdir. Yapay zekâ ücreti kurumun kendi hesabına yansır." },
            { ad: "Sorumluluk", deger: SORUMLULUK },
          ]}
        />
        <p className="mt-6 text-soluk">
          Modüllerin bugünkü durumu{" "}
          <Link href="/ne-yapar" className="font-semibold text-vurgu underline underline-offset-4">
            Ne yapar
          </Link>{" "}
          sayfasında. Kurumunuzu hemen kendiniz açmak isterseniz{" "}
          <Link href="/kurum-ac" className="font-semibold text-vurgu underline underline-offset-4">
            Kurumunuzu açın
          </Link>
          .
        </p>
      </Bolum>
      <Bolum id="basvuru" baslik="Başvuru" zemin not="Bütün alanlar zorunludur, not hariç.">
        <PilotFormu roller={PILOT_ROLLERI} surecler={PILOT_SURECLERI} />
      </Bolum>
    </>
  );
}
