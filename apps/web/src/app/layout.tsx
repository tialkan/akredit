import "./yazi-tipi.css";
import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import "./globals.css";

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
    images: [{ url: "/marka/og.png", width: 1200, height: 630, alt: "Akredit: kanıtla doğrulanmış kalite" }],
  },
  twitter: { card: "summary_large_image", images: ["/marka/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1320" },
  ],
};

// G-27-1: CSP nonce'u istek başınadır (src/proxy.ts); Next yalnız dinamik işlenen sayfaya nonce
// ekleyebilir. Önceden işlenmiş (durağan) sayfanın betikleri nonce'suz kalır ve engellenir.
export default async function KokYerlesim({ children }: { children: ReactNode }) {
  await connection();
  return (
    <html lang="tr">
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
