// OpenAPI belgesini üretir: `pnpm --filter @akredit/servis openapi`. Depodaki `openapi.json` ile üretilenin
// aynı olduğu testte (CI) denetlenir; uç ya da şema değişince bu betik yeniden çalıştırılır.

import { writeFileSync } from "node:fs";
import { openapiBelgesi } from "../src/http/openapi.ts";

const hedef = new URL("../openapi.json", import.meta.url);
writeFileSync(hedef, `${JSON.stringify(openapiBelgesi(), null, 2)}\n`);
console.log(`OpenAPI belgesi yazıldı: ${hedef.pathname}`);
