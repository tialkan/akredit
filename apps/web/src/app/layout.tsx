import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Akredit",
  description: "Akreditasyon ve kalite süreçlerini kanıta dayalı yürüten açık kaynak platform.",
};

export default function KokYerlesim({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
