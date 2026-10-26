import { Building2, Mail } from "lucide-react";
import type { Metadata } from "next";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";

export const metadata: Metadata = { title: "Giriş" };

// Yalnız arayüz: giriş işlevi İP-09'da bağlanacak. Form gönderilmez.
export default function Giris() {
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Giriş</h1>
      <p className="mt-2 text-soluk">Parola yok: e-postanıza tek kullanımlık bir giriş bağlantısı gönderilir.</p>
      <p
        role="note"
        className="mt-4 rounded-md border border-risk-orta bg-risk-orta-zemin px-3 py-2 text-sm text-risk-orta"
      >
        Giriş henüz açık değil. Bu ekran önizlemedir.
      </p>
      <form className="mt-6 space-y-4" aria-describedby="giris-not">
        <MetinAlani etiket="Kurum e-posta adresiniz" type="email" name="eposta" autoComplete="email" required />
        <Dugme tur="birincil" className="w-full" disabled simge={<Mail aria-hidden className="size-5" />}>
          Giriş bağlantısı gönder
        </Dugme>
      </form>
      <div className="my-6 flex items-center gap-3 text-sm text-soluk">
        <span className="h-px flex-1 bg-cizgi" />
        ya da
        <span className="h-px flex-1 bg-cizgi" />
      </div>
      <Dugme className="w-full" disabled simge={<Building2 aria-hidden className="size-5" />}>
        Kurum hesabıyla giriş yap
      </Dugme>
      <p id="giris-not" className="mt-6 text-sm text-soluk">
        Giriş bilgileriniz yapay zekâya hiçbir zaman gösterilmez ve günlüğe yazılmaz.
      </p>
    </div>
  );
}
