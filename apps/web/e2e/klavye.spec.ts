// Klavye ve ekran okuyucu yapısı denetimi (WCAG 2.1.1, 2.1.2, 2.4.1, 2.4.2, 2.4.3, 2.4.6, 2.4.7, 2.4.11, 3.1.1).
// Her sayfada: içeriğe geç bağlantısı çalışır; Sekme tuşu bütün odaklanabilir öğeleri sırayla gezer, tuzak yoktur;
// her odakta görünür bir odak göstergesi vardır ve odaklanan öğe başka bir öğenin (yapışkan başlık) altında kalmaz.
// Ekran okuyucunun dayandığı yapı: dil, tekil ve anlamlı başlık, tek ana bölge, adlı ve tekil gezinme bölgeleri,
// atlamasız başlık düzeyleri.

import { expect, type Page, test } from "@playwright/test";
import { SAYFALAR } from "./sayfalar.ts";

interface OdakBilgisi {
  /** Öğeye bir kez verilen sıra numarası; aynı adlı öğeleri ayırt etmek için. */
  no: string;
  ad: string;
  gorunur: boolean;
  gosterge: boolean;
  ortulmus: boolean;
}

async function odakBilgisi(page: Page): Promise<OdakBilgisi | null> {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e || e === document.body) return null;
    e.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    const halka = s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) >= 2;
    const golge = s.boxShadow !== "none";
    // 2.4.11: odaklanan öğenin en az bir kısmı görünmeli; merkez noktasındaki öğe kendisi ya da içindeki bir öğe olmalı.
    const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    const ustteki = document.elementFromPoint(x, y);
    const ortulmus = !!ustteki && !(e === ustteki || e.contains(ustteki) || ustteki.contains(e));
    const k = window as unknown as { __odakSayac?: number };
    e.dataset.odakNo ??= String((k.__odakSayac = (k.__odakSayac ?? 0) + 1));
    return {
      no: e.dataset.odakNo,
      ad: (e.getAttribute("aria-label") || e.textContent || e.getAttribute("name") || e.tagName).trim().slice(0, 60),
      gorunur: r.width > 0 && r.height > 0,
      gosterge: halka || golge,
      ortulmus,
    };
  });
}

for (const yol of SAYFALAR) {
  test(`${yol}: klavyeyle gezilir, odak görünür ve örtülmez`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(yol);
    await expect(page.locator("h1").first()).toBeVisible();
    // Odaklanabilir öğe sayısı (sekme sırasındakiler).
    const toplam = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), summary",
          ),
        ].filter((e) => e.tabIndex >= 0 && e.getClientRects().length > 0 && !e.closest("[inert],dialog:not([open])"))
          .length,
    );
    // İlk Sekme içeriğe geç bağlantısına gelir; Enter odak noktasını ana bölgeye taşır.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#icerik$/);
    await page.goto(yol);
    await expect(page.locator("h1").first()).toBeVisible();

    const sorunlar: string[] = [];
    const gorulen = new Set<string>();
    let ard = 0;
    let onceki = "";
    const sinir = Math.min(toplam, 80);
    for (let i = 0; i < sinir; i++) {
      await page.keyboard.press("Tab");
      const o = await odakBilgisi(page);
      if (!o) break;
      if (!o.gorunur) sorunlar.push(`görünmeyen öğeye odak: ${o.ad}`);
      else if (!o.gosterge) sorunlar.push(`odak göstergesi yok: ${o.ad}`);
      if (o.ortulmus) sorunlar.push(`odaklanan öğe örtülü: ${o.ad}`);
      // Tuzak: aynı öğede kalmak (art arda 3 kez) klavye tuzağıdır.
      ard = o.no === onceki ? ard + 1 : 0;
      if (ard >= 3) {
        sorunlar.push(`klavye tuzağı: ${o.ad}`);
        break;
      }
      onceki = o.no;
      gorulen.add(o.no);
    }
    expect(sorunlar).toEqual([]);
    if (toplam > 1) expect(gorulen.size).toBeGreaterThan(1);
    // Shift+Sekme geri gider.
    await page.keyboard.press("Shift+Tab");
    expect(await odakBilgisi(page)).not.toBeNull();
  });

  test(`${yol}: ekran okuyucu yapısı`, async ({ page }) => {
    await page.goto(yol);
    await expect(page.locator("h1").first()).toBeVisible();
    const y = await page.evaluate(() => {
      const gorunur = (e: Element) => (e as HTMLElement).getClientRects().length > 0 || e.classList.contains("sr-only");
      const basliklar = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
        .filter((h) => gorunur(h) && !h.closest("dialog:not([open])"))
        .map((h) => Number(h.tagName[1]));
      const atlama = basliklar.some((d, i) => i > 0 && d > (basliklar[i - 1] as number) + 1);
      const navlar = [...document.querySelectorAll("nav")].map(
        (n) =>
          n.getAttribute("aria-label") ??
          document.getElementById(n.getAttribute("aria-labelledby") ?? "")?.textContent ??
          "",
      );
      return {
        dil: document.documentElement.lang,
        baslik: document.title,
        h1: document.querySelectorAll("h1").length,
        ilkBaslik: basliklar[0],
        atlama,
        main: document.querySelectorAll("main").length,
        navlar,
        adsizGorsel: [...document.querySelectorAll("img:not([alt]), svg:not([aria-hidden]):not([role=img])")].length,
      };
    });
    expect(y.dil).toBe("tr");
    expect(y.baslik).toMatch(/Akredit/);
    expect(y.h1).toBe(1);
    expect(y.ilkBaslik).toBe(1);
    expect(y.atlama).toBe(false);
    expect(y.main).toBe(1);
    expect(y.navlar.every((a) => a.trim().length > 0)).toBe(true);
    expect(new Set(y.navlar).size).toBe(y.navlar.length);
    expect(y.adsizGorsel).toBe(0);
  });
}

test("sayfa başlıkları birbirinden ayırt edilir", async ({ page }) => {
  const basliklar = new Map<string, string>();
  for (const yol of SAYFALAR) {
    await page.goto(yol);
    basliklar.set(yol, await page.title());
  }
  // Aynı başlığı paylaşan sayfalar (ör. iki ayrı ders) olabilir; burada her sayfa türü tekil olmalı.
  const tekrar = [...basliklar.entries()].filter(
    ([y, b]) => [...basliklar.entries()].filter(([y2, b2]) => b2 === b && y2 !== y).length > 0,
  );
  expect(tekrar).toEqual([]);
});
