// Kurum hukuk paketini .zip olarak derler: apps/web/public/indir/akredit-kurum-hukuk-paketi.zip (İP-40).
// Çalıştırma: pnpm --filter @akredit/web hukuk-paketi (önce envanter)
import { mkdirSync, writeFileSync } from "node:fs";
import { hukukPaketi, PAKET_YOLU } from "../src/site/hukuk-paketi.ts";

const hedef = new URL(`../public/${PAKET_YOLU}`, import.meta.url);
mkdirSync(new URL(".", hedef), { recursive: true });
const zip = hukukPaketi(new URL("../../../docs/hukuk/", import.meta.url));
writeFileSync(hedef, zip);
console.log(`Hukuk paketi yazıldı: ${zip.length} bayt.`);
