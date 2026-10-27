// Üretim göç girişi: `DATABASE_URL`'deki veritabanına packages/vt göçlerini uygular.
// dagit.sh, web ve işçi yeni sürüme geçmeden ÖNCE işçi imajında bunu çalıştırır.
// Göçler yalnız ileriye doğrudur ve geriye uyumlu yazılır (docs/isletim/surum-ve-geri-alma.md).

import { gocleriUygula, postgresBaglantisi } from "../../packages/vt/src/index.ts";

const adres = process.env.DATABASE_URL;
if (!adres) {
  console.error("DATABASE_URL tanımlı değil.");
  process.exit(1);
}

const { db, kapat } = postgresBaglantisi(adres, { max: 1, onnotice: () => {} });
try {
  const uygulanan = await gocleriUygula(db);
  console.log(uygulanan.length ? `Uygulanan göçler: ${uygulanan.join(", ")}` : "Göçler güncel.");
} finally {
  await kapat();
}
