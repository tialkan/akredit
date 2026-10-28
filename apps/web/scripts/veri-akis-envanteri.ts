// Veri akış envanterini kod tabanından üretir: docs/hukuk/veri-akis-envanteri.md ve .csv (İP-40).
// Çalıştırma: pnpm --filter @akredit/web envanter
import { writeFileSync } from "node:fs";
import { envanterCsv, envanterMarkdown } from "../src/veri/veri-akisi.ts";
import { guncelEnvanter } from "../src/veri/veri-akisi-girdi.ts";

const kok = new URL("../../../docs/hukuk/", import.meta.url);
const satirlar = guncelEnvanter();
writeFileSync(new URL("veri-akis-envanteri.md", kok), envanterMarkdown(satirlar));
writeFileSync(new URL("veri-akis-envanteri.csv", kok), envanterCsv(satirlar));
console.log(`Envanter yazıldı: ${satirlar.length} satır.`);
