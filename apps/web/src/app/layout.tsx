import "./yazi-tipi.css";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { PAYLASIM_ALT } from "../site/yapisal.ts";
import "./globals.css";

const ON_YUKLENEN_YAZI_TIPLERI = [
  "/yazi-tipleri/LatoLatin-Regular.woff2",
  "/yazi-tipleri/Oswald-500-latin.woff2",
  "/yazi-tipleri/Oswald-500-latin-ext.woff2",
];

const ACIKLAMA =
  "Akreditasyon ve kalite işlerini kanıta dayalı, kayıtlı ve onaylı yürüten açık kaynak platform. Sistem hazırlar, siz onaylarsınız.";

export const metadata: Metadata = {
  title: { default: "Akredit", template: "%s · Akredit" },
  description: ACIKLAMA,
  metadataBase: new URL("https://akredit.org"),
  applicationName: "Akredit",
  icons: {
    icon: [
      { url: "/marka/favicon.svg", type: "image/svg+xml" },
      { url: "/marka/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/marka/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Akredit",
    title: "Akredit",
    description: ACIKLAMA,
    images: [{ url: "/marka/og.jpg", width: 1200, height: 630, alt: PAYLASIM_ALT }],
  },
  twitter: { card: "summary_large_image", images: ["/marka/og.jpg"] },
  // Sürüm işareti (İP-49): derleme anındaki commit; x-app-version başlığıyla aynı değer (next.config.ts).
  other: { "app-version": process.env.AKREDIT_SURUM ?? "bilinmiyor" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

// G-27-1: CSP nonce'u istek başınadır (src/proxy.ts); Next yalnız dinamik işlenen sayfaya nonce
// ekleyebilir. Önceden işlenmiş (durağan) sayfanın betikleri nonce'suz kalır ve engellenir.
export default async function KokYerlesim({ children }: { children: ReactNode }) {
  await connection();
  return (
    <html lang="tr">
      <head>
        {/* Yazı tipleri ilk boyamaya yetişsin (yazi-tipi.css: font-display optional). Lato 700 ve gerisi gerektikçe. */}
        {ON_YUKLENEN_YAZI_TIPLERI.map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
      </head>
      <body className="min-h-screen">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-yuzey focus:px-4 focus:py-2 focus:font-semibold"
        >
          İçeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
