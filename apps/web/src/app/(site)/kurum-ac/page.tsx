import type { Metadata } from "next";
import { barindirmaAcik } from "../../../site/barindirma.ts";
import { Bolum, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { KURUM_ACILIS_ADIMLARI, SAYFALAR } from "../../../site/icerik.ts";
import { PlatformDurumu } from "../../../site/platform-durumu.tsx";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";
import { BasvuruFormu } from "./basvuru-formu.tsx";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kurumAc);

// Dayanak: docs/raporlar/IP-35.md, apps/web/src/kimlik/kurum-acilisi.ts, packages/servis/src/kurum-acilisi.ts.

export default function KurumAc() {
  // Barındırılan hizmet askıdayken (ADR 0008) form gösterilmez, sunucu da yeni kayıt almaz.
  const acik = barindirmaAcik();
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.kurumAc} />
      <SayfaBasi
        sayfa={SAYFALAR.kurumAc}
        ozet={
          acik
            ? "Kurumunuzu bu sayfadan açarsınız. Kurumsal e-postanızı doğrularsınız, ardından bir sihirbaz sizi anahtar, karar, program ve davet adımlarından geçirir. Hocalar yalnız davet e-postasını açar."
            : "akredit.org'da kurum açma şu an kapalı. Kurumlara barındırılan hizmet sponsor bulunana kadar sunulmuyor. Yazılım hazır: kendi sunucunuza kurarsanız aynı adımlar orada çalışır."
        }
      >
        {acik ? null : (
          <div className="mt-8 max-w-3xl">
            <PlatformDurumu />
          </div>
        )}
      </SayfaBasi>
      <Bolum id="adimlar" baslik="Adımlar" not={acik ? undefined : "Kendi kurulumunuzda kurum böyle açılır."}>
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
      {acik ? (
        <Bolum id="basvuru" baslik="Başvuru" zemin not="Bilgileriniz yalnız kurumu açmak için kullanılır.">
          <BasvuruFormu />
        </Bolum>
      ) : null}
    </>
  );
}
