// Göçleri `DATABASE_URL` ile gösterilen PostgreSQL'e uygular. Docker Compose'daki `goc` hizmeti ve CI kullanır.
// Bağlantı kullanıcısı tabloların sahibi olur (geliştirmede süper kullanıcı). Tekrar çalıştırmak bir şey değiştirmez.

import { gocleriUygula, postgresBaglantisi } from "../../packages/vt/src/index.ts";

const adres = process.env.DATABASE_URL;
if (!adres) {
  console.error("DATABASE_URL tanımlı değil. .env.ornek dosyasına bakın.");
  process.exit(1);
}

const { db, kapat } = postgresBaglantisi(adres, { max: 1, onnotice: () => {} });
try {
  const uygulanan = await gocleriUygula(db);
  console.log(uygulanan.length ? `Uygulanan göçler: ${uygulanan.join(", ")}` : "Göçler güncel.");
} finally {
  await kapat();
}
