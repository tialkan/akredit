import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import {
  DURAGAN_ONBELLEK,
  DURAGAN_YOLLAR,
  GUVENLIK_BASLIKLARI,
  SURUM_BASLIGI,
  surumBelirle,
} from "./src/guvenlik/basliklar.ts";

// Sürüm işareti (İP-49): derleme anındaki commit, yoksa package.json sürümü. Derlemede sabitlenir.
const paket = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
const SURUM = surumBelirle(process.env, paket.version);

const config: NextConfig = {
  // Docker imajı için bağımsız çıktı (infra/ altındaki Dockerfile kullanır).
  output: "standalone",
  // Çalışma alanı paketleri TypeScript kaynağıyla gelir, Next derler.
  transpilePackages: [
    "@akredit/acik-mcp",
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
  // /deneyin araçları (İP-49) tarayıcıda MCP ayrıştırıcılarını çalıştırır; onların sunucu tarafı kişisel veri
  // denetimi @akredit/yz'yi (Node modülleri) içe aktarır. Tarayıcı paketinde boş bir modül kullanılır.
  // Ölçme özeti (cekirdek ozet.ts) için Node crypto öykünmesi (~145 KB) yerine yalnız SHA-256 içeren küçük modül
  // kullanılır; Next öykünmeyi kendi adıyla eklediği için o ad da yönlendirilir. Yalnız tarayıcı paketi etkilenir.
  turbopack: {
    resolveAlias: {
      "@akredit/yz": { browser: "./src/deneyin/yz-tarayici.ts" },
      "node:crypto": { browser: "./src/deneyin/crypto-tarayici.ts" },
      crypto: { browser: "./src/deneyin/crypto-tarayici.ts" },
      "next/dist/compiled/crypto-browserify": { browser: "./src/deneyin/crypto-tarayici.ts" },
    },
  },
  // Veri kipi derlemede sabitlenir (src/veri/kip.ts): varsayılan gerçek veritabanı; örnek veri yalnız
  // AKREDIT_ORNEK_VERI=1 ile (tanıtım, uçtan uca testler).
  env: {
    NEXT_PUBLIC_AKREDIT_ORNEK_VERI: process.env.AKREDIT_ORNEK_VERI === "1" ? "1" : "0",
    AKREDIT_SURUM: SURUM,
  },
  // Güvenlik ve sürüm başlıkları bütün yollara, /mcp ve API dahil (İP-49). CSP ve frame-ancestors istek başına
  // src/proxy.ts'te verilir; CORS başlıkları /mcp işleyicisinindir, burada dokunulmaz.
  async headers() {
    return [
      { source: "/:path*", headers: [...GUVENLIK_BASLIKLARI, { key: SURUM_BASLIGI, value: SURUM }] },
      ...DURAGAN_YOLLAR.map((source) => ({ source, headers: [{ key: "Cache-Control", value: DURAGAN_ONBELLEK }] })),
    ];
  },
};

export default config;
