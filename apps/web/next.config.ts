import type { NextConfig } from "next";

const config: NextConfig = {
  // Docker imajı için bağımsız çıktı (infra/ altındaki Dockerfile kullanır).
  output: "standalone",
  // Çalışma alanı paketleri TypeScript kaynağıyla gelir, Next derler.
  transpilePackages: [
    "@akredit/anket",
    "@akredit/cekirdek",
    "@akredit/gosterge",
    "@akredit/servis",
    "@akredit/surec",
    "@akredit/vt",
    "@akredit/yetki",
    "@akredit/yz",
  ],
  // Veritabanı sürücüleri (WASM ve yerel modüller) paketlenmez, Node yükler.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "postgres", "nodemailer", "qrcode"],
  poweredByHeader: false,
};

export default config;
