"use client";

import Link from "next/link";
import { dugmeSinifi } from "../bilesenler/dugme.tsx";

/** Beklenmeyen hata ekranı. İç yapıyı (yığın izi, sorgu) göstermez; yalnız başvuru kodu verir. */
export default function HataEkrani({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="icerik" className="mx-auto w-full max-w-3xl px-4 py-14">
      <h1 className="text-[2rem] leading-tight text-vurgu">Sayfa açılamadı</h1>
      <p className="mt-4 max-w-[60ch] text-lg" role="alert">
        Sunucuda beklenmeyen bir hata oldu. Verileriniz değişmedi; yarım kalan bir karar kaydedilmez. Sayfayı yeniden
        deneyin. Hata sürerse kurum yöneticinize aşağıdaki kodu iletin.
      </p>
      {error.digest ? (
        <p className="mt-4 text-soluk">
          Başvuru kodu: <span className="font-semibold text-metin">{error.digest}</span>
        </p>
      ) : null}
      <p className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="button" onClick={reset} className={dugmeSinifi("birincil", "orta", "rounded-sm")}>
          Yeniden deneyin
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4"
        >
          Ana sayfaya dönün
        </Link>
      </p>
    </main>
  );
}
