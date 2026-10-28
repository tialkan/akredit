import type { Metadata } from "next";
import { Dogrulama } from "./dogrulama.tsx";

export const metadata: Metadata = { title: "Kurum açılışını doğrulayın", robots: { index: false } };

// Doğrulama bağlantısı: `/kurum-ac/dogrula?b=<belirteç>`. Bağlantı ön yüklemede tüketilmesin diye kurum,
// sayfa açılınca değil düğmeye basılınca (POST) açılır.
export default async function DogrulamaSayfasi({ searchParams }: { searchParams: Promise<{ b?: string | string[] }> }) {
  const b = (await searchParams).b;
  const belirtec = typeof b === "string" && /^[A-Za-z0-9_-]{20,100}$/u.test(b) ? b : null;
  return (
    <div className="mx-auto max-w-lg px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Kurum açılışını doğrulayın</h1>
      {belirtec ? (
        <Dogrulama belirtec={belirtec} />
      ) : (
        <p className="mt-4">Doğrulama bağlantısı eksik ya da bozuk. E-postadaki bağlantıyı yeniden açın.</p>
      )}
    </div>
  );
}
