import { type NextRequest, NextResponse } from "next/server";
import { onbellekPolitikasi } from "./guvenlik/basliklar.ts";
import { cspBasligi, cspBaslikAdi, cspKipi, NONCE_BASLIGI, nonceUret } from "./guvenlik/csp.ts";

// G-27-1: istek başına nonce'lu CSP. Next.js nonce'u istek başlığındaki CSP'den okuyup kendi
// betiklerine ekler; yanıt başlığı tarayıcıya gider.
export function proxy(istek: NextRequest) {
  const nonce = nonceUret();
  const kip = cspKipi(process.env.AKREDIT_CSP);
  const politika = cspBasligi(nonce, { gelistirme: process.env.NODE_ENV === "development" });
  const basliklar = new Headers(istek.headers);
  basliklar.set(NONCE_BASLIGI, nonce);
  // Next nonce'u yalnız zorlayan başlıktan okur; rapor kipinde de betiklere nonce eklensin.
  basliklar.set("Content-Security-Policy", politika);
  const yanit = NextResponse.next({ request: { headers: basliklar } });
  yanit.headers.set(cspBaslikAdi(kip), politika);
  // Herkese açık tanıtım sayfaları paylaşılan önbellekte kısa süre tutulur (İP-49). Yalnız tam sayfa GET;
  // istemci gezintisinin RSC istekleri ve panel/API yolları Next'in no-store değerinde kalır.
  const onbellek =
    istek.method === "GET" && !istek.headers.has("rsc") ? onbellekPolitikasi(istek.nextUrl.pathname) : null;
  if (onbellek) yanit.headers.set("Cache-Control", onbellek);
  return yanit;
}

export const config = {
  matcher: [
    {
      // Durağan dosyalar, görseller ve API uçları HTML değildir; önceden getirmeler atlanır.
      source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
