// Veritabanını hazırlar (göçleri uygular): `pnpm --filter @akredit/servis vt:hazirla`.
// AKREDIT_VT_ADRES (PostgreSQL) ya da AKREDIT_VT_DIZIN (PGlite, geliştirme) kullanılır. Web sunucusu göç
// çalıştırmaz; bu adım açılıştan önce yapılır.

import { gocleriUygula, pgliteBaglantisi, postgresBaglantisi } from "@akredit/vt";

const adres = process.env.AKREDIT_VT_ADRES;
const dizin = process.env.AKREDIT_VT_DIZIN;
if (!adres && !dizin) {
  console.error("AKREDIT_VT_ADRES ya da AKREDIT_VT_DIZIN tanımlanmalı.");
  process.exit(1);
}
const b = adres ? postgresBaglantisi(adres) : await pgliteBaglantisi(dizin);
await gocleriUygula(b.db);
await b.kapat();
console.log("Göçler uygulandı.");
