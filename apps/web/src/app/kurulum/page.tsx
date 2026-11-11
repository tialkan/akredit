import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "../../bilesenler/logo.tsx";
import { AskidaTanitim } from "../../site/askida-tanitim.tsx";
import { barindirmaAcik } from "../../site/barindirma.ts";
import { PlatformDurumu } from "../../site/platform-durumu.tsx";
import { Sihirbaz } from "./sihirbaz.tsx";

export const metadata: Metadata = { title: "Kurulum", robots: { index: false } };

// Kurum yöneticisinin kurulum sihirbazı (İP-35). Veri kipinden bağımsız olarak gerçek veritabanıyla çalışır.
export default function KurulumSayfasi() {
  // Barındırılan hizmet askıdayken (ADR 0008) akredit.org'da kurum yoktur: sihirbaz yerine tanıtım gösterilir.
  const acik = barindirmaAcik();
  return (
    <div className="flex min-h-screen flex-col bg-zemin">
      <header className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
          <Link href="/" aria-label="Akredit ana sayfa" className="inline-flex min-h-11 items-center">
            <Logo />
          </Link>
          <span className="text-soluk">Kurulum</span>
        </div>
      </header>
      <main id="icerik" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="text-3xl font-semibold tracking-[-0.01em] text-vurgu">Kurumunuzu hazırlayın</h1>
        {acik ? null : (
          <>
            <p className="mt-2 max-w-prose text-soluk">
              akredit.org'da kurum kurulumu şu an kapalı. Kurumlara barındırılan hizmet sponsor bulunana kadar
              sunulmuyor.
            </p>
            <div className="mt-8 grid max-w-3xl gap-6">
              <AskidaTanitim sayfa="kurulum" />
              <PlatformDurumu />
            </div>
          </>
        )}
        {acik ? (
          <>
            <p className="mt-2 max-w-prose text-soluk">
              Beş adım. Her adım ayrı kaydedilir; istediğiniz adıma dönebilirsiniz. Hocalara yalnız davet e-postası
              gider.
            </p>
            <div className="mt-8">
              <Sihirbaz />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
