"use client";

import { HataSayfasi } from "../site/hata-sayfasi.tsx";

/** Beklenmeyen hata ekranı (500). İç yapıyı (yığın izi, sorgu) göstermez; yalnız başvuru kodu verir. */
export default function HataEkrani({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <HataSayfasi
      kod="500"
      baslik="Sayfa açılamadı"
      eylem={
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded bg-vurgu px-5 font-semibold text-vurgu-metin hover:opacity-90"
        >
          Yeniden deneyin
        </button>
      }
    >
      <p role="alert">
        Beklenmeyen bir hata oldu. Verileriniz değişmedi. Yeniden deneyin; sürerse aşağıdaki kodla yazın.
      </p>
      {error.digest ? (
        <p className="text-soluk">
          Başvuru kodu: <span className="text-metin">{error.digest}</span>
        </p>
      ) : null}
    </HataSayfasi>
  );
}
