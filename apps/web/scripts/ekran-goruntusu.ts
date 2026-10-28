// docs/tasarim/ekranlar/ ekran görüntülerini üretir (yalnız açık tema): 375, 768 ve 1440 px.
// Kullanım: önce `pnpm build && pnpm start -p 3108`, sonra `node scripts/ekran-goruntusu.ts http://127.0.0.1:3108`.
import { join } from "node:path";
import { chromium } from "@playwright/test";

const KOK = process.argv[2] ?? "http://127.0.0.1:3108";
const HEDEF = join(import.meta.dirname, "../../../docs/tasarim/ekranlar");
const SAYFALAR: [string, string][] = [
  ["ana-sayfa", "/"],
  ["ne-yapar", "/ne-yapar"],
  ["nasil-calisir", "/nasil-calisir"],
  ["panel", "/panel"],
  ["onay-kutusu", "/panel/onaylar"],
];
const GENISLIKLER = [375, 768, 1440];

const tarayici = await chromium.launch(process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {});
for (const g of GENISLIKLER) {
  const sayfa = await tarayici.newPage({ viewport: { width: g, height: 900 }, colorScheme: "light", locale: "tr-TR" });
  for (const [ad, yol] of SAYFALAR) {
    // Yazı tipleri font-display: optional ile yüklenir; ilk ziyaret sistem yazı tipini gösterebilir.
    // İkinci ziyarette yazı tipi önbellekten gelir, görüntü gerçek dizgiyi gösterir.
    await sayfa.goto(`${KOK}${yol}`, { waitUntil: "networkidle" });
    await sayfa.evaluate(async () => {
      await Promise.all([
        document.fonts.load('600 1em "Source Serif 4"', "Aşİ"),
        document.fonts.load('400 1em "Source Sans 3 Variable"', "Aşİ"),
      ]);
    });
    await sayfa.goto(`${KOK}${yol}`, { waitUntil: "networkidle" });
    // Yazı tipi yüklenmeden çekilen görüntü sistem yazı tipini gösterir.
    await sayfa.evaluate(async () => {
      await document.fonts.ready;
    });
    await sayfa.waitForTimeout(300);
    await sayfa.screenshot({ path: join(HEDEF, `${ad}-${g}.png`), fullPage: false });
  }
  await sayfa.close();
}
await tarayici.close();
