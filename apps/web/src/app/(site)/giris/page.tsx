import type { Metadata } from "next";
import { Logo } from "../../../bilesenler/logo.tsx";
import { AskidaTanitim } from "../../../site/askida-tanitim.tsx";
import { barindirmaAcik } from "../../../site/barindirma.ts";
import { PlatformDurumu } from "../../../site/platform-durumu.tsx";
import { GirisFormu } from "./giris-formu.tsx";

export const metadata: Metadata = {
  title: "Giriş",
  description:
    "Akredit hesabınıza kurumsal e-postanıza gelen bağlantıyla ya da kurumunuzun tek oturum sistemiyle girin.",
  alternates: { canonical: "https://akredit.org/giris" },
};

export default function Giris() {
  // Barındırılan hizmet askıdayken (ADR 0008) akredit.org'da kurum hesabı yoktur; giriş formu yerine durum gösterilir.
  if (!barindirmaAcik())
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <Logo boy="buyuk" />
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Giriş</h1>
        <p className="mt-2 mb-8 text-soluk">
          akredit.org'da kurum girişi şu an kapalı. Kurumlara barındırılan hizmet sponsor bulunana kadar sunulmuyor.
        </p>
        <div className="grid gap-6">
          <AskidaTanitim sayfa="giris" />
          <PlatformDurumu />
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <Logo boy="buyuk" />
      <h1 className="mt-8 text-3xl font-bold tracking-tight">Giriş</h1>
      <p className="mt-2 text-soluk">Parola yok: e-postanıza tek kullanımlık bir giriş bağlantısı gönderilir.</p>
      <GirisFormu />
      <p id="giris-not" className="mt-6 text-sm text-soluk">
        Giriş bilgileriniz yapay zekâya hiçbir zaman gösterilmez ve günlüğe yazılmaz.
      </p>
    </div>
  );
}
