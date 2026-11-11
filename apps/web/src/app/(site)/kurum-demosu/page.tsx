import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../../bilesenler/dugme.tsx";
import { DEMO_ROL_BILGISI, DEMO_ROLLERI, DEMO_SERIDI } from "../../../demo/roller.ts";
import { demoAcikMi } from "../../../demo/uc.ts";
import { AskidaTanitim } from "../../../site/askida-tanitim.tsx";
import { barindirmaAcik } from "../../../site/barindirma.ts";
import { Bolum, YapisalVeri } from "../../../site/bilesenler.tsx";
import { DEMO_NOTU, ILETISIM_ADRESI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";
import { ORNEK_VERI } from "../../../veri/kip.ts";

// Barındırılan kurum demosu (İP-41), askıda: sponsor ya da iş birliği yok. Tarayıcıda çalışan araçlardan (/deneyin)
// ayrı tutulur ki kurulumsuz ve masrafsız araçlar demonun askı notuyla karışmasın (strateji raporu 2026-11, #1).
// Demo oturumu açılamıyorsa (örnek veri derlemesi değil ve AKREDIT_DEMO=1 değil) rol düğmeleri kapanır.

const BAG = "text-vurgu underline underline-offset-4";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kurumDemosu);

const HATALAR: Record<string, string> = {
  cok: "Kısa sürede çok fazla örnek oturum açıldı. Birkaç dakika sonra yeniden deneyin.",
  hazir: "Örnek kurum şu an hazırlanıyor. Birkaç dakika sonra yeniden deneyin.",
  rol: "Rol seçilemedi. Aşağıdaki düğmelerden birini kullanın.",
};

export default async function KurumDemosu({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const hata = HATALAR[(await searchParams).hata ?? ""];
  const oturumAcilir = ORNEK_VERI || demoAcikMi(process.env);
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.kurumDemosu} />
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-10 sm:pb-12">
          <h1 className="text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-vurgu sm:text-[3.2rem]">
            Barındırılan kurum demosu
          </h1>
          <p className="mt-5 max-w-[60ch] text-lg">
            Kurum platformunun tamamı: kanıt deposu, onay günlüğü, ÇK/PÇ göstergeleri ve raporlar. Sentetik verilerle.
          </p>
        </div>
      </header>
      <Bolum id="kurum-demosu" baslik="Durum" zemin>
        <div data-demo-notu className="max-w-[62ch] rounded-sm border border-cizgi-guclu bg-yuzey px-4 py-3">
          <p>Askıda. {DEMO_NOTU}</p>
          <p className="mt-2">
            Destek olmak isterseniz{" "}
            <a href={ILETISIM_ADRESI} className={BAG}>
              LinkedIn üzerinden yazın
            </a>
            . Kurulum istemeyen araçlar için{" "}
            <Link href="/deneyin" className={BAG}>
              tarayıcıda deneyin
            </Link>
            ; kendi yapay zekânıza eklenen araçlar için{" "}
            <Link href="/mcp-kullan" className={BAG}>
              kurulum ve araçlar
            </Link>
            .
          </p>
        </div>
        {barindirmaAcik() ? null : (
          <div className="mt-6 max-w-3xl">
            <AskidaTanitim sayfa="kurumDemosu" />
          </div>
        )}
        {oturumAcilir ? (
          <div className="mt-6">
            <p className="max-w-[60ch]">
              Sentetik Örnek Üniversitesi'nde iki saatlik bir oturum açılır: 3 fakülte, 10 program, 120 ders ve takma
              adlı 5.000 öğrencinin not dökümü.
            </p>
            <p className="mt-2 text-sm text-soluk">
              {DEMO_SERIDI} Örnek kurumdan e-posta gönderilmez, yapay zekâ çağrılmaz. Kararlar her gece sıfırlanır.
            </p>
            {hata ? (
              <p
                role="alert"
                className="mt-4 rounded-sm border border-risk-orta bg-risk-orta-zemin px-4 py-3 text-risk-orta"
              >
                {hata}
              </p>
            ) : null}
            {/* Betiksiz çalışır. Örnek veri kipinde veritabanı yoktur: panel kurgu veriyle açılır. */}
            <form
              method={ORNEK_VERI ? "get" : "post"}
              action={ORNEK_VERI ? "/panel" : "/api/deneyin"}
              className="mt-6 grid gap-4 sm:grid-cols-2"
            >
              {ORNEK_VERI ? <input type="hidden" name="tur" value="1" /> : null}
              {DEMO_ROLLERI.map((r) => {
                const b = DEMO_ROL_BILGISI[r];
                return (
                  <div key={r} className="flex flex-col gap-2 rounded-sm border border-cizgi bg-yuzey p-4">
                    <button
                      type="submit"
                      name="rol"
                      value={r}
                      className={dugmeSinifi("birincil", "orta", "min-h-11 rounded-sm")}
                    >
                      {b.dugme}
                    </button>
                    <p className="text-sm text-soluk">{b.aciklama}</p>
                  </div>
                );
              })}
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <p data-demo-kapali className="max-w-[62ch]">
              Örnek oturum şu an açılmıyor. Demo tamamlanınca şu rollerle denenebilecek:
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {DEMO_ROLLERI.map((r) => {
                const b = DEMO_ROL_BILGISI[r];
                return (
                  <li key={r} className="flex flex-col gap-2 rounded-sm border border-cizgi bg-yuzey p-4">
                    <p className="text-lg text-metin">{b.dugme.replace(/ olarak dene$/u, "")}</p>
                    <p className="text-sm text-soluk">{b.aciklama}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Bolum>
    </>
  );
}
