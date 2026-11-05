import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../../bilesenler/dugme.tsx";
import { DEMO_ROL_BILGISI, DEMO_ROLLERI, DEMO_SERIDI } from "../../../demo/roller.ts";
import { demoAcikMi } from "../../../demo/uc.ts";
import { AracSekmeleri } from "../../../deneyin/sekmeler.tsx";
import { Bolum } from "../../../site/bilesenler.tsx";
import { DEMO_NOTU, ILETISIM_ADRESI } from "../../../site/icerik.ts";
import { ORNEK_VERI } from "../../../veri/kip.ts";

// İP-49: /deneyin, MCP kurmayı bilmeyenler için tarayıcıda çalışan üç deterministik araçtır (src/deneyin). Araçlar
// ağ isteği yapmaz; ayrıştırma ve denetim herkese açık MCP'nin kodudur, hesap @akredit/olcme'dir.
// Altta barındırılan kurum demosu (İP-41) askıda durur: sponsor ya da iş birliği yok. Demo oturumu açılamıyorsa
// (örnek veri derlemesi değil ve AKREDIT_DEMO=1 değil) rol düğmeleri kapanır; kırık form gösterilmez.

const BAG = "text-vurgu underline underline-offset-4";

export const metadata: Metadata = {
  title: "Araçları tarayıcıda deneyin",
  description:
    "Kurulum ve hesap olmadan: ÇK/PÇ hesabı, Bologna denetimi ve ölçüt arama. Hepsi tarayıcınızda çalışır; verileriniz sunucuya ve yapay zekâya gitmez.",
  alternates: { canonical: "https://akredit.org/deneyin" },
};

const HATALAR: Record<string, string> = {
  cok: "Kısa sürede çok fazla örnek oturum açıldı. Birkaç dakika sonra yeniden deneyin.",
  hazir: "Örnek kurum şu an hazırlanıyor. Birkaç dakika sonra yeniden deneyin.",
  rol: "Rol seçilemedi. Aşağıdaki düğmelerden birini kullanın.",
};

export default async function Deneyin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const hata = HATALAR[(await searchParams).hata ?? ""];
  const oturumAcilir = ORNEK_VERI || demoAcikMi(process.env);
  return (
    <>
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 pt-8 pb-10 sm:pt-10 sm:pb-12">
          <h1 className="text-[2.4rem] leading-[1.05] tracking-[-0.02em] text-vurgu sm:text-[3.2rem]">
            Araçları tarayıcıda deneyin
          </h1>
          <p className="mt-5 max-w-[60ch] text-lg">
            Kurulum ve hesap gerekmez. ÇK/PÇ hesabı, Bologna denetimi ve ölçüt arama bu sayfada çalışır.
          </p>
          <p data-veri-notu className="mt-4 max-w-[62ch] rounded-sm border border-cizgi-guclu bg-zemin px-4 py-3">
            Verileriniz bu tarayıcıdan çıkmaz. Hesap ve denetim sizin bilgisayarınızda yapılır; sunucuya ve yapay zekâya
            hiçbir şey gönderilmez, hiçbir şey saklanmaz.
          </p>
        </div>
      </header>
      <section aria-label="Araçlar" className="bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <AracSekmeleri />
        </div>
      </section>
      <Bolum id="kurum-demosu" baslik="Barındırılan kurum demosu" zemin>
        <div data-demo-notu className="max-w-[62ch] rounded-sm border border-cizgi-guclu bg-yuzey px-4 py-3">
          <p>Askıda. {DEMO_NOTU}</p>
          <p className="mt-2">
            Destek olmak isterseniz{" "}
            <a href={ILETISIM_ADRESI} className={BAG}>
              LinkedIn üzerinden yazın
            </a>
            . Kendi yapay zekânıza eklenen araçlar için{" "}
            <Link href="/mcp-kullan" className={BAG}>
              kurulum ve araçlar
            </Link>
            .
          </p>
        </div>
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
