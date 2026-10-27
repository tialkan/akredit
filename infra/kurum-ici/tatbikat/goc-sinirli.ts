// Tatbikat yardımcısı: "eski sürümü" taklit etmek için yalnız ilk GOC_SAYISI göçü uygular.
// Gerçek kurulumda göçler infra/uretim/goc.ts ile (hepsi) uygulanır.
import { gocleriOku, gocleriUygula, postgresBaglantisi } from "../../../packages/vt/src/index.ts";

const adres = process.env.DATABASE_URL;
const sayi = Number(process.env.GOC_SAYISI);
if (!adres || !Number.isInteger(sayi) || sayi < 1) {
  console.error("DATABASE_URL ve GOC_SAYISI (pozitif tam sayı) gerekli.");
  process.exit(1);
}
const { db, kapat } = postgresBaglantisi(adres, { max: 1, onnotice: () => {} });
try {
  const uygulanan = await gocleriUygula(db, gocleriOku().slice(0, sayi));
  console.log(`Uygulanan göçler: ${uygulanan.join(", ") || "yok"}`);
} finally {
  await kapat();
}
