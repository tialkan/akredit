import type { NextConfig } from "next";

const config: NextConfig = {
  // Docker imajı için bağımsız çıktı (infra/ altındaki Dockerfile kullanır).
  output: "standalone",
  // Çalışma alanı paketleri TypeScript kaynağıyla gelir, Next derler.
  transpilePackages: ["@akredit/cekirdek"],
  poweredByHeader: false,
};

export default config;
