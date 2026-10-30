// npm yayını için derleme (İP-49). Node, node_modules içindeki .ts dosyalarında tip ayıklama yapmadığından paket
// JavaScript olarak yayınlanır. tsc bu paketi ve kullandığı iş alanı paketlerini (cekirdek, cerceveler, olcme, yz)
// `dist/` altına derler; iş alanı paketleri npm'de olmadığı için `@akredit/<paket>` içe aktarmaları derlenmiş
// kopyaya göreli yola çevrilir. Dış bağımlılık yalnız MCP SDK ve zod'dur. Yayın yapılmaz; bu betik yalnız derler.
//
// Kullanım: pnpm --filter @akredit/acik-mcp build

import { execFileSync } from "node:child_process";
import { chmodSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(import.meta.dirname, "..");
const DIST = join(KOK, "dist");
/** Gömülen iş alanı paketleri ve derlenmiş giriş dosyaları (dist'e göre). */
export const GOMULU: Record<string, string> = {
  "@akredit/cekirdek": "packages/cekirdek/src/index.js",
  "@akredit/cerceveler": "packages/cerceveler/src/index.js",
  "@akredit/olcme": "packages/olcme/src/index.js",
  "@akredit/yz": "packages/yz/src/index.js",
};
export const CLI = "apps/acik-mcp/src/cli.js";

function dosyalar(d: string): string[] {
  return readdirSync(d).flatMap((a) => {
    const y = join(d, a);
    return statSync(y).isDirectory() ? dosyalar(y) : [y];
  });
}

/** `from "@akredit/x"` ve `import("@akredit/x")` belirteçlerini derlenmiş kopyaya göreli yola çevirir. */
export function belirtecleriCevir(metin: string, dosyaYolu: string): string {
  return metin.replace(/(["'])(@akredit\/[a-z-]+)\1/gu, (tam, tirnak: string, ad: string) => {
    const hedef = GOMULU[ad];
    if (!hedef) throw new Error(`${relative(DIST, dosyaYolu)}: gömülmeyen iş alanı paketi ${ad}`);
    let g = relative(dirname(dosyaYolu), join(DIST, hedef)).split(sep).join("/");
    if (!g.startsWith(".")) g = `./${g}`;
    // Bildirim dosyalarında da aynı yol; .d.ts için uzantı .js kalır (NodeNext çözümü).
    return `${tirnak}${g}${tirnak}`;
  });
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  rmSync(DIST, { recursive: true, force: true });
  execFileSync("tsc", ["-p", "tsconfig.build.json"], { cwd: KOK, stdio: "inherit" });
  for (const d of dosyalar(DIST)) {
    if (!/\.(js|d\.ts)$/u.test(d)) continue;
    const eski = readFileSync(d, "utf8");
    const yeni = belirtecleriCevir(eski, d);
    if (yeni !== eski) writeFileSync(d, yeni);
  }
  chmodSync(join(DIST, CLI), 0o755);
  process.stderr.write(`Derlendi: ${relative(KOK, DIST)} (giriş ${CLI})\n`);
}
