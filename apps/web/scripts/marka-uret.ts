// Marka dosyalarını üretir: apps/web/public/marka/ altına SVG işaretler, favicon PNG'leri, yatay logo PNG'leri
// ve Open Graph görseli. PNG'ler, e2e testleri için zaten kurulu olan Playwright Chromium'u ile çizilir; ek
// görsel kütüphanesi gerekmez.
//   Çalıştırma: pnpm --filter @akredit/web marka
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { ISARET_KUTUSU, ISARET_YOLLARI, MARKA_RENK } from "../src/marka/isaret.ts";

const kok = join(dirname(fileURLToPath(import.meta.url)), "..");
const hedef = join(kok, "public", "marka");
mkdirSync(hedef, { recursive: true });

const { x, y, g } = ISARET_KUTUSU;
const kutu = `${x} ${y} ${g} ${ISARET_KUTUSU.h}`;

function isaretSvg(a: string, onay: string, ek = ""): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${kutu}" width="${g}" height="${ISARET_KUTUSU.h}"${ek}><title>Akredit</title>` +
    `<path d="${ISARET_YOLLARI.solKol}" fill="${a}"/><path d="${ISARET_YOLLARI.sagKol}" fill="${a}"/>` +
    `<path d="${ISARET_YOLLARI.onay}" fill="${onay}"/></svg>\n`
  );
}

const yaz = (ad: string, icerik: string) => writeFileSync(join(hedef, ad), icerik);

yaz("isaret.svg", isaretSvg(MARKA_RENK.lacivert, MARKA_RENK.petrol));
yaz("isaret-acik.svg", isaretSvg(MARKA_RENK.acikA, MARKA_RENK.acikOnay));
yaz("isaret-tek-renk.svg", isaretSvg(MARKA_RENK.lacivert, MARKA_RENK.lacivert));
yaz("isaret-tek-renk-beyaz.svg", isaretSvg("#FFFFFF", "#FFFFFF"));

// Favicon: kare tuval; tarayıcı koyu temadaysa açık renkler kullanılır.
const kare = 74.7;
const ox = x - (kare - g) / 2;
const oy = ISARET_KUTUSU.y - (kare - ISARET_KUTUSU.h) / 2;
yaz(
  "favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox.toFixed(2)} ${oy.toFixed(2)} ${kare} ${kare}"><title>Akredit</title>` +
    `<style>.a{fill:${MARKA_RENK.lacivert}}.o{fill:${MARKA_RENK.petrol}}` +
    `@media (prefers-color-scheme:dark){.a{fill:${MARKA_RENK.acikA}}.o{fill:${MARKA_RENK.acikOnay}}}</style>` +
    `<path class="a" d="${ISARET_YOLLARI.solKol}"/><path class="a" d="${ISARET_YOLLARI.sagKol}"/>` +
    `<path class="o" d="${ISARET_YOLLARI.onay}"/></svg>\n`,
);

/** Lacivert zemin üstünde açık işaret; maskelenebilir simgenin güvenli alanı (%80 daire) içinde kalır. */
export function uygulamaSimgesi(): string {
  const cx = x + g / 2;
  const cy = ISARET_KUTUSU.y + ISARET_KUTUSU.h / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><title>Akredit</title><rect width="512" height="512" fill="${MARKA_RENK.lacivert}"/>` +
    `<g transform="translate(256 262) scale(4.1) translate(${-cx} ${-cy})">` +
    `<path d="${ISARET_YOLLARI.solKol}" fill="#FFFFFF"/><path d="${ISARET_YOLLARI.sagKol}" fill="#FFFFFF"/>` +
    `<path d="${ISARET_YOLLARI.onay}" fill="${MARKA_RENK.acikOnay}"/></g></svg>\n`
  );
}
yaz("uygulama-simgesi.svg", uygulamaSimgesi());

// --- PNG'ler ---
const require = createRequire(import.meta.url);
// Sayfa about:blank'tan yüklendiği için yerel dosya adresleri engellenir; yazı tipi yalnız çizim sırasında
// veri adresi olarak verilir. Üretilen dosyalara yazı tipi gömülmez.
const yaziTipiVerisi = (ad: string) =>
  `data:font/woff2;base64,${readFileSync(require.resolve(`@fontsource-variable/source-sans-3/files/${ad}`)).toString("base64")}`;
const yaziTipi = yaziTipiVerisi("source-sans-3-latin-ext-wght-normal.woff2");
const yaziTipiLatin = yaziTipiVerisi("source-sans-3-latin-wght-normal.woff2");

function chromiumYolu(): string | undefined {
  const k = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(k)) return undefined;
  for (const d of readdirSync(k)
    .filter((a) => /^chromium-\d+$/.test(a))
    .sort()
    .reverse()) {
    const yol = join(k, d, "chrome-linux64", "chrome");
    if (existsSync(yol)) return yol;
  }
  return undefined;
}

const stil = `<style>
@font-face{font-family:"SS3";src:url("${yaziTipiLatin}") format("woff2-variations");font-weight:200 900;unicode-range:U+0000-00FF,U+0131}
@font-face{font-family:"SS3";src:url("${yaziTipi}") format("woff2-variations");font-weight:200 900;unicode-range:U+0100-02BA}
html,body{margin:0;padding:0;background:transparent}
body{font-family:"SS3",sans-serif}
</style>`;

function yatayLogoHtml(a: string, onay: string, metin: string): string {
  return `${stil}<div id="k" style="display:inline-flex;align-items:center;gap:22px;padding:12px">
${isaretSvg(a, onay, ' style="height:96px;width:auto"')}
<span style="font-size:104px;font-weight:700;letter-spacing:-0.015em;color:${metin};line-height:1">Akredit</span></div>`;
}

const tarayici = await chromium.launch({ executablePath: chromiumYolu() });
try {
  const sayfa = await tarayici.newPage();
  async function cek(html: string, ad: string, boyut?: { w: number; h: number }) {
    await sayfa.setViewportSize(boyut ? { width: boyut.w, height: boyut.h } : { width: 1400, height: 400 });
    await sayfa.setContent(html, { waitUntil: "load" });
    await sayfa.evaluate(() => document.fonts.ready);
    const yuklu = await sayfa.evaluate(
      async () => (await document.fonts.load('700 40px "SS3"', "Akredit ğış")).length > 0,
    );
    if (!yuklu) throw new Error("Yazı tipi yüklenemedi");
    const yol = join(hedef, ad);
    if (boyut) await sayfa.screenshot({ path: yol, omitBackground: true });
    else await sayfa.locator("#k").screenshot({ path: yol, omitBackground: true });
  }

  const tamSayfa = (ic: string) => `${stil}<div id="k" style="width:100vw;height:100vh">${ic}</div>`;
  const favSvg = isaretSvg(MARKA_RENK.lacivert, MARKA_RENK.petrol, ' style="width:100%;height:100%"');
  await cek(
    tamSayfa(`<div style="box-sizing:border-box;padding:1px 0;width:100%;height:100%;display:flex">${favSvg}</div>`),
    "favicon-32.png",
    { w: 32, h: 32 },
  );
  await cek(
    tamSayfa(uygulamaSimgesi().replace("<svg ", '<svg style="width:100%;height:100%" ')),
    "apple-touch-icon.png",
    {
      w: 180,
      h: 180,
    },
  );
  await cek(tamSayfa(uygulamaSimgesi().replace("<svg ", '<svg style="width:100%;height:100%" ')), "simge-512.png", {
    w: 512,
    h: 512,
  });
  await cek(yatayLogoHtml(MARKA_RENK.lacivert, MARKA_RENK.petrol, MARKA_RENK.lacivert), "logo-yatay.png");
  await cek(yatayLogoHtml(MARKA_RENK.acikA, MARKA_RENK.acikOnay, MARKA_RENK.acikA), "logo-yatay-acik.png");

  // Open Graph 1200×630: lacivert zemin, açık işaret, ad ve kısa söz. Hiçbir kurum simgesi kullanılmaz.
  await cek(
    `${stil}<div style="width:1200px;height:630px;box-sizing:border-box;background:${MARKA_RENK.lacivert};color:#fff;
      padding:88px 96px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden">
      <div style="position:absolute;left:0;bottom:0;width:100%;height:10px;background:${MARKA_RENK.petrol}"></div>
      <div style="display:flex;align-items:center;gap:28px">
        ${isaretSvg(MARKA_RENK.acikA, MARKA_RENK.acikOnay, ' style="height:120px;width:auto"')}
        <span style="font-size:128px;font-weight:700;letter-spacing:-0.015em;line-height:1">Akredit</span>
      </div>
      <div>
        <div style="font-size:52px;font-weight:600;line-height:1.15;max-width:960px">Kanıtla doğrulanmış kalite.</div>
        <div style="margin-top:18px;font-size:32px;line-height:1.3;color:#C9D6E6;max-width:960px">
          Akreditasyon ve kalite işleri kanıta dayalı, kayıtlı ve onaylı. Sistem hazırlar, siz onaylarsınız.</div>
        <div style="margin-top:28px;font-size:28px;font-weight:600;color:${MARKA_RENK.acikOnay}">akredit.org</div>
      </div></div>`,
    "og.png",
    { w: 1200, h: 630 },
  );
} finally {
  await tarayici.close();
}
console.log(`Marka dosyaları yazıldı: ${hedef}`);
