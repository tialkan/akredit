import type { Metadata } from "next";
import { Bolum, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { KURUM_ACILIS_ADIMLARI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";
import { BasvuruFormu } from "./basvuru-formu.tsx";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kurumAc);

// Dayanak: docs/raporlar/IP-35.md, apps/web/src/kimlik/kurum-acilisi.ts, packages/servis/src/kurum-acilisi.ts.

export default function KurumAc() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.kurumAc} />
      <SayfaBasi
        sayfa={SAYFALAR.kurumAc}
        ozet="Kurumunuzu bu sayfadan açarsınız. Kurumsal e-postanızı doğrularsınız, ardından bir sihirbaz sizi anahtar, karar, program ve davet adımlarından geçirir. Hocalar yalnız davet e-postasını açar."
      />
      <Bolum id="adimlar" baslik="Adımlar">
        <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {KURUM_ACILIS_ADIMLARI.map((a, i) => (
            <li key={a.baslik} className="flex gap-4">
              <span
                aria-hidden
                className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-cizgi-guclu font-semibold tabular-nums"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{a.baslik}</h3>
                <p className="mt-1 text-soluk">{a.metin}</p>
              </div>
            </li>
          ))}
        </ol>
      </Bolum>
      <Bolum id="basvuru" baslik="Başvuru" zemin not="Bilgileriniz yalnız kurumu açmak için kullanılır.">
        <BasvuruFormu />
      </Bolum>
    </>
  );
}
