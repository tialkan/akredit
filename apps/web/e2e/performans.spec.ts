// Performans bütçeleri ve Core Web Vitals ölçümü (İP-31). Bütçeler e2e/butceler.ts içinde; CI'daki
// "Uçtan uca" işi bu testleri çalıştırır, aşım işi kırar. Ölçümler `test-results/performans/` altına da yazılır.
// Ağ ve işlemci Chrome DevTools Protokolü ile yavaşlatılır (yalnız Chromium).

import { mkdirSync, writeFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { BUTCE_SAYFALARI, butce } from "./butceler.ts";

interface Olcum {
  jsKb: number;
  cssKb: number;
  toplamKb: number;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  domOgesi: number;
  yuklemeMs: number;
}

// Kalıcı CDP bağlantısı her sayfada yeni açılır; ağ öykünmesi o sayfaya uygulanır.
async function yavaslat(page: Page, ag: { indirKbit: number; yukleKbit: number; rttMs: number }, cpu: number) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: ag.rttMs,
    downloadThroughput: (ag.indirKbit * 1024) / 8,
    uploadThroughput: (ag.yukleKbit * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  return cdp;
}

const YAVAS_4G = { indirKbit: 1600, yukleKbit: 750, rttMs: 150 };
const YAVAS_3G = { indirKbit: 400, yukleKbit: 400, rttMs: 400 };

async function olc(page: Page, yol: string): Promise<Olcum> {
  const cdp = await yavaslat(page, YAVAS_4G, 4);
  const aktarim = new Map<string, { tur: string; bayt: number }>();
  cdp.on("Network.responseReceived", (e) => aktarim.set(e.requestId, { tur: e.type, bayt: 0 }));
  cdp.on("Network.loadingFinished", (e) => {
    const k = aktarim.get(e.requestId);
    if (k) k.bayt = e.encodedDataLength;
  });
  // Gözlemciler sayfa betiklerinden önce kurulur.
  await page.addInitScript(() => {
    const p = window as unknown as { __perf: { lcp: number; cls: number; tbt: number } };
    p.__perf = { lcp: 0, cls: 0, tbt: 0 };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) p.__perf.lcp = e.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
        if (!e.hadRecentInput) p.__perf.cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) p.__perf.tbt += Math.max(0, e.duration - 50);
    }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(yol, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
  // LCP, kullanıcı etkileşimi ya da sayfa gizlenene dek güncellenir; kısa bir bekleme son adayı yakalar.
  await page.waitForTimeout(500);
  const p = await page.evaluate(() => {
    const x = (window as unknown as { __perf: { lcp: number; cls: number; tbt: number } }).__perf;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    return { ...x, dom: document.getElementsByTagName("*").length, yukleme: nav.loadEventEnd };
  });
  await cdp.detach();
  const kb = (f: (t: string) => boolean) =>
    Math.round(([...aktarim.values()].filter((a) => f(a.tur)).reduce((t, a) => t + a.bayt, 0) / 1024) * 10) / 10;
  return {
    jsKb: kb((t) => t === "Script"),
    cssKb: kb((t) => t === "Stylesheet"),
    toplamKb: kb(() => true),
    lcpMs: Math.round(p.lcp),
    cls: Math.round(p.cls * 1000) / 1000,
    tbtMs: Math.round(p.tbt),
    domOgesi: p.dom,
    yuklemeMs: Math.round(p.yukleme),
  };
}

test.describe("performans bütçeleri (yavaş 4G, 4× işlemci, telefon)", () => {
  test.describe.configure({ mode: "default", timeout: 120_000 });
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  for (const yol of BUTCE_SAYFALARI) {
    test(`${yol} bütçeyi aşmaz`, async ({ page }) => {
      const o = await olc(page, yol);
      // Her ölçüm ayrı dosyaya yazılır (başarısız test çalışanı yeniden başlatır, bellekteki toplam kaybolur).
      mkdirSync("test-results/performans", { recursive: true });
      writeFileSync(`test-results/performans/${encodeURIComponent(yol)}.json`, `${JSON.stringify({ yol, ...o })}\n`);
      const b = butce(yol);
      const asim = (Object.keys(b) as (keyof typeof b)[])
        .filter((k) => o[k] > b[k])
        .map((k) => `${k}: ${o[k]} > ${b[k]}`);
      expect(asim, JSON.stringify(o)).toEqual([]);
    });
  }
});

// Düşük bant genişliği (İP-31 kapsam 3): yavaş 3G (400 kbit/sn, 400 ms gidiş-dönüş) ve 4× işlemcide ana
// sayfalar 6 saniye içinde okunur hâle gelir ve işlevini görür. Eşik, yavaş 3G için LCP "iyi" sınırının
// (2,5 sn) gidiş-dönüş farkıyla genişletilmiş hâlidir; ilk ölçüm 1,5-1,8 sn arasındadır (docs/denetim/performans.md).
test.describe("yavaş 3G ve telefon", () => {
  test.describe.configure({ mode: "default", timeout: 120_000 });
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });

  for (const [yol, baslik] of [
    ["/", /onaylarsınız/i],
    ["/giris", /giriş/i],
    ["/panel/onaylar", /onay/i],
  ] as const) {
    test(`${yol} yavaş 3G'de 6 sn içinde kullanılır`, async ({ page }) => {
      const cdp = await yavaslat(page, YAVAS_3G, 4);
      await page.addInitScript(() => {
        const w = window as unknown as { __lcp: number };
        w.__lcp = 0;
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) w.__lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
      });
      await page.goto(yol, { waitUntil: "load", timeout: 60_000 });
      await expect(page.getByRole("heading", { level: 1, name: baslik })).toBeVisible();
      // Yatay kaydırma yok: içerik 360 piksel genişliğe sığar.
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
      await page.waitForTimeout(300);
      const lcp = await page.evaluate(() => (window as unknown as { __lcp: number }).__lcp);
      mkdirSync("test-results/performans", { recursive: true });
      writeFileSync(`test-results/performans/3g${encodeURIComponent(yol)}.json`, `${JSON.stringify({ yol, lcp })}\n`);
      expect(lcp).toBeGreaterThan(0);
      expect(lcp).toBeLessThan(6000);
      await cdp.detach();
    });
  }
});
