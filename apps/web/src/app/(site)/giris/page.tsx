import type { Metadata } from "next";
import { GirisFormu } from "./giris-formu.tsx";

export const metadata: Metadata = { title: "Giriş" };

export default function Giris() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Giriş</h1>
      <p className="mt-2 text-soluk">Parola yok: e-postanıza tek kullanımlık bir giriş bağlantısı gönderilir.</p>
      <GirisFormu />
      <p id="giris-not" className="mt-6 text-sm text-soluk">
        Giriş bilgileriniz yapay zekâya hiçbir zaman gösterilmez ve günlüğe yazılmaz.
      </p>
    </div>
  );
}
