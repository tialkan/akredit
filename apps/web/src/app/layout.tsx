import "@fontsource-variable/source-sans-3";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Akredit", template: "%s · Akredit" },
  description:
    "Akreditasyon ve kalite işlerini kanıta dayalı, kayıtlı ve onaylı yürüten açık kaynak platform. Sistem hazırlar, siz onaylarsınız.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#111418" },
  ],
};

export default function KokYerlesim({ children }: { children: ReactNode }) {
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
