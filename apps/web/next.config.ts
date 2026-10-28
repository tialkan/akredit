import type { NextConfig } from "next";

const config: NextConfig = {
  // Docker imajı için bağımsız çıktı (infra/ altındaki Dockerfile kullanır).
  output: "standalone",
  // Çalışma alanı paketleri TypeScript kaynağıyla gelir, Next derler.
  transpilePackages: [
    "@akredit/anket",
    "@akredit/baglayicilar",
    "@akredit/belge",
    "@akredit/cerceveler",
    "@akredit/cekirdek",
    "@akredit/depo",
    "@akredit/gosterge",
    "@akredit/olcme",
    "@akredit/ornek-veri",
    "@akredit/servis",
    "@akredit/surec",
    "@akredit/vt",
    "@akredit/yetki",
    "@akredit/yz",
  ],
  // Veritabanı sürücüleri (WASM ve yerel modüller) paketlenmez, Node yükler.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "postgres", "nodemailer", "qrcode"],
  poweredByHeader: false,
  // Veri kipi derlemede sabitlenir (src/veri/kip.ts): varsayılan gerçek veritabanı; örnek veri yalnız
  // AKREDIT_ORNEK_VERI=1 ile (tanıtım, uçtan uca testler).
  env: { NEXT_PUBLIC_AKREDIT_ORNEK_VERI: process.env.AKREDIT_ORNEK_VERI === "1" ? "1" : "0" },
};

export default config;
