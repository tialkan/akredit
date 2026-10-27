import type { NextConfig } from "next";

const config: NextConfig = {
  // Docker imajı için bağımsız çıktı (infra/ altındaki Dockerfile kullanır).
  output: "standalone",
  // Çalışma alanı paketleri TypeScript kaynağıyla gelir, Next derler.
  transpilePackages: ["@akredit/cekirdek", "@akredit/servis", "@akredit/vt", "@akredit/yetki"],
  // Veritabanı sürücüleri (WASM ve yerel modüller) paketlenmez, Node yükler.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector", "postgres"],
  poweredByHeader: false,
};

export default config;
