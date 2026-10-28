// Sunucu açılmadan önce: test dizinini boşaltır, PGlite veritabanına göçleri uygular.
import { mkdir, rm } from "node:fs/promises";
import { gocleriUygula, pgliteBaglantisi } from "@akredit/vt";
import { EPOSTA_DIZINI, KOK, VT_DIZINI } from "./ortam.ts";

await rm(KOK, { recursive: true, force: true });
await mkdir(EPOSTA_DIZINI, { recursive: true });
const b = await pgliteBaglantisi(VT_DIZINI);
await gocleriUygula(b.db);
await b.kapat();
console.log("e2e veritabanı hazır.");
