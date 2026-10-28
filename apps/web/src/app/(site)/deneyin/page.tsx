import type { Metadata } from "next";
import { dugmeSinifi } from "../../../bilesenler/dugme.tsx";
import { DEMO_ROL_BILGISI, DEMO_ROLLERI, DEMO_SERIDI } from "../../../demo/roller.ts";
import { Bolum } from "../../../site/bilesenler.tsx";
import { ORNEK_VERI } from "../../../veri/kip.ts";

// Dayanak: plan/ip/IP-41-ornek-universite.md, packages/ornek-veri, apps/web/src/demo.

export const metadata: Metadata = {
  title: "Deneyin",
  description:
    "Hesap açmadan Akredit'i deneyin: sentetik Örnek Üniversitesi'nde bir rol seçin, iki saatlik örnek oturumla paneli ve onay kutusunu kullanın.",
  alternates: { canonical: "https://akredit.org/deneyin" },
};

const HATALAR: Record<string, string> = {
  cok: "Kısa sürede çok fazla örnek oturum açıldı. Birkaç dakika sonra yeniden deneyin.",
  hazir: "Örnek kurum şu an hazırlanıyor. Birkaç dakika sonra yeniden deneyin.",
  rol: "Rol seçilemedi. Aşağıdaki düğmelerden birini kullanın.",
};

export default async function Deneyin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const hata = HATALAR[(await searchParams).hata ?? ""];
  return (
    <>
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-10 sm:pb-14">
          <h1 className="text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-vurgu sm:text-[3.2rem]">
            Hesap açmadan deneyin
          </h1>
          <p className="mt-4 max-w-[60ch] text-lg">
            Bir rol seçin. Sentetik Örnek Üniversitesi'nde iki saatlik bir oturum açılır: 3 fakülte, 10 program, 120
            ders ve takma adlı 5.000 öğrencinin not dökümü. Sayılar not dökümlerinden hesaplanmıştır.
          </p>
          <p className="mt-3 text-sm text-soluk">
            {DEMO_SERIDI} Örnek kurumdan e-posta gönderilmez, yapay zekâ çağrılmaz, dosya yüklenmez. Verdiğiniz kararlar
            yalnız örnek kurumda kalır ve her gece sıfırlanır.
          </p>
        </div>
      </header>
      <Bolum id="roller" baslik="Rolünüzü seçin">
        {hata ? (
          <p
            role="alert"
            className="mb-6 rounded-sm border border-risk-orta bg-risk-orta-zemin px-4 py-3 text-risk-orta"
          >
            {hata}
          </p>
        ) : null}
        {/* Betiksiz çalışır. Örnek veri kipinde veritabanı yoktur: panel kurgu veriyle açılır. */}
        <form
          method={ORNEK_VERI ? "get" : "post"}
          action={ORNEK_VERI ? "/panel" : "/api/deneyin"}
          className="grid gap-4 sm:grid-cols-2"
        >
          {ORNEK_VERI ? <input type="hidden" name="tur" value="1" /> : null}
          {DEMO_ROLLERI.map((r) => {
            const b = DEMO_ROL_BILGISI[r];
            return (
              <div key={r} className="flex flex-col gap-2 rounded-sm border border-cizgi p-4">
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
      </Bolum>
    </>
  );
}
