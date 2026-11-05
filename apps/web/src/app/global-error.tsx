"use client";

// Kök yerleşim de çöktüğünde gösterilen 500 sayfası. Kendi <html> ve <body> etiketini taşır (Next kuralı).

import "./yazi-tipi.css";
import "./globals.css";
import { HataSayfasi } from "../site/hata-sayfasi.tsx";

export default function GenelHata({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">
        <HataSayfasi
          kod="500"
          baslik="Site şu an açılamadı"
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
          <p role="alert">Beklenmeyen bir hata oldu. Verileriniz değişmedi. Birazdan yeniden deneyin.</p>
          {error.digest ? (
            <p className="text-soluk">
              Başvuru kodu: <span className="text-metin">{error.digest}</span>
            </p>
          ) : null}
        </HataSayfasi>
      </body>
    </html>
  );
}
