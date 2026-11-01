// Sunucu açılmadan önce: test dizinini boşaltır, PGlite veritabanına göçleri uygular.
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { gocleriUygula, pgliteBaglantisi } from "@akredit/vt";
import { EPOSTA_DIZINI, KOK, VT_DIZINI } from "./ortam.ts";

// E2E_KOK verilirse (barındırma kapalı ikinci sunucu) o sunucunun kendi dizini hazırlanır.
const kok = process.env.E2E_KOK ?? KOK;
await rm(kok, { recursive: true, force: true });
await mkdir(process.env.E2E_KOK ? join(kok, "eposta") : EPOSTA_DIZINI, { recursive: true });
const b = await pgliteBaglantisi(process.env.E2E_KOK ? join(kok, "vt") : VT_DIZINI);
await gocleriUygula(b.db);
await b.kapat();
console.log("e2e veritabanı hazır.");
