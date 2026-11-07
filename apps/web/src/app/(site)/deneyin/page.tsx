import type { Metadata } from "next";
import Link from "next/link";
import { AracSekmeleri } from "../../../deneyin/sekmeler.tsx";

// İP-49: /deneyin, MCP kurmayı bilmeyenler için tarayıcıda çalışan üç deterministik araçtır (src/deneyin). Araçlar
// ağ isteği yapmaz; ayrıştırma ve denetim herkese açık MCP'nin kodudur, hesap @akredit/olcme'dir. Sunucu maliyeti
// yoktur. Askıdaki barındırılan kurum demosu ayrı sayfadadır: /kurum-demosu (strateji raporu 2026-11, #1).

const BAG = "text-vurgu underline underline-offset-4";

export const metadata: Metadata = {
  title: "Araçları tarayıcıda deneyin",
  description:
    "Kurulum ve hesap olmadan: ÇK/PÇ hesabı, Bologna denetimi ve ölçüt arama. Hepsi tarayıcınızda çalışır; verileriniz sunucuya ve yapay zekâya gitmez.",
  alternates: { canonical: "https://akredit.org/deneyin" },
};

export default function Deneyin() {
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
            hiçbir şey gönderilmez, hiçbir şey saklanmaz. Öğrenci notlarını yapay zekâ sohbetine yapıştırmak yerine
            ÇK/PÇ hesabını burada yapın.
          </p>
        </div>
      </header>
      <section aria-label="Araçlar" className="bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
          <AracSekmeleri />
        </div>
      </section>
      <section aria-label="Diğer yollar" className="border-t border-cizgi bg-zemin">
        <p className="mx-auto max-w-6xl px-4 py-6">
          Bu araçları kendi yapay zekânızın içinde, OBS'yi okuyup yazarak kullanmak için{" "}
          <Link href="/mcp-kullan" className={BAG}>
            kurulum ve araçlar
          </Link>
          . Barındırılan kurum platformunun demosu ayrı sayfada:{" "}
          <Link href="/kurum-demosu" className={BAG}>
            kurum demosu
          </Link>
          .
        </p>
      </section>
    </>
  );
}
