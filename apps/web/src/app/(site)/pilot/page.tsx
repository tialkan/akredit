import type { Metadata } from "next";
import Link from "next/link";
import { AskidaTanitim } from "../../../site/askida-tanitim.tsx";
import { barindirmaAcik } from "../../../site/barindirma.ts";
import { Bolum, SayfaBasi, Tanimlar, YapisalVeri } from "../../../site/bilesenler.tsx";
import { PILOT_ROLLERI, PILOT_SURECLERI, SAYFALAR, SORUMLULUK } from "../../../site/icerik.ts";
import { PlatformDurumu } from "../../../site/platform-durumu.tsx";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";
import { PilotFormu } from "./pilot-formu.tsx";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.pilot);

// Dayanak: plan.md §1 (iş yükü pilotta önce/sonra ölçülür), İP-30 (pilot ve iş yükü ölçümü), İP-42.

export default function Pilot() {
  // Barındırılan hizmet askıdayken (ADR 0008) başvuru alınmaz: form gösterilmez, sunucu da kaydetmez.
  const acik = barindirmaAcik();
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.pilot} />
      <SayfaBasi
        sayfa={SAYFALAR.pilot}
        ozet={
          acik
            ? "Akredit'i kurumunuzun gerçek verisiyle, seçtiğiniz bir süreçte çalıştırın. Hocalarınızın kalite işine ayırdığı süreyi birlikte ölçelim."
            : "Pilot başvurusu şu an kapalı. Pilot uygulama, barındırılan hizmetle birlikte sponsor bulunana kadar askıda. Aşağıda pilotun nasıl yürüyeceği yazılı."
        }
      >
        {acik ? null : (
          <div className="mt-8 grid max-w-3xl gap-6">
            <AskidaTanitim sayfa="pilot" />
            <PlatformDurumu />
          </div>
        )}
      </SayfaBasi>
      <Bolum
        id="pilot-nedir"
        baslik="Pilotta ne olur"
        not={acik ? undefined : "Hizmet açıldığında geçerli olacak düzen."}
      >
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
          sayfasında.
          {acik ? (
            <>
              {" "}
              Kurumunuzu hemen kendiniz açmak isterseniz{" "}
              <Link href="/kurum-ac" className="font-semibold text-vurgu underline underline-offset-4">
                Kurumunuzu açın
              </Link>
              .
            </>
          ) : null}
        </p>
      </Bolum>
      {acik ? (
        <Bolum id="basvuru" baslik="Başvuru" zemin not="Bütün alanlar zorunludur, not hariç.">
          <PilotFormu roller={PILOT_ROLLERI} surecler={PILOT_SURECLERI} />
        </Bolum>
      ) : null}
    </>
  );
}
