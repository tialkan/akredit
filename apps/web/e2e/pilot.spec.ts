// İP-42 uçtan uca: pilot başvurusu (barındırma açık sunucuda, AKREDIT_BARINDIRMA=1; kapalısı barindirma.spec.ts) gerçek arka uçla (boş PGlite, SMTP yok → kaydedilir, "alındı" döner),
// 375 px'te ana sayfa ve proje ayrıntılarında taşma olmaması (İP-49), sitede depo yolu görünmemesi ve 375/1440 ekran görüntüleri
// (docs/tasarim/ekranlar/*-ip42-*.png).

import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { KURULUM_ADRESI } from "./yardim/ortam.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const EKRANLAR = join(import.meta.dirname, "../../../docs/tasarim/ekranlar");

async function axe(page: Page) {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("pilot başvurusu", () => {
  test.use({ baseURL: KURULUM_ADRESI, viewport: { width: 1440, height: 900 } });

  test("form doldurulur, sunucu kaydeder, 'alındı' gösterilir", async ({ page }) => {
    await page.goto("/pilot");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pilot uygulama");
    await axe(page);
    await page.getByLabel("Kurumun adı").fill("Uydurma Pilot Üniversitesi");
    await page.getByLabel("Birim").fill("Mühendislik Fakültesi");
    await page.getByLabel("Rolünüz").selectOption("kalite_komisyonu");
    await page.getByLabel("Kurumsal e-posta").fill("kalite@uydurma-pilot.edu.tr");
    await page.getByLabel("Hangi süreçle başlamak istersiniz").selectOption("bologna");
    await page.getByLabel(/pilot başvurusunu değerlendirmek/u).check();
    await page.waitForTimeout(3100); // Bot denetimi: form en az 3 sn açık kalmalı.
    await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
    await expect(page.getByRole("status")).toContainText("Başvurunuz alındı");
  });

  test("genel e-posta sunucuda reddedilir ve alanın yanında söylenir", async ({ page }) => {
    await page.goto("/pilot");
    await page.getByLabel("Kurumun adı").fill("Uydurma Pilot Üniversitesi");
    await page.getByLabel("Birim").fill("Kalite Koordinatörlüğü");
    await page.getByLabel("Rolünüz").selectOption("rektorluk");
    await page.getByLabel("Kurumsal e-posta").fill("kisi@gmail.com");
    await page.getByLabel("Hangi süreçle başlamak istersiniz").selectOption("kidr");
    await page.getByLabel(/pilot başvurusunu değerlendirmek/u).check();
    await page.waitForTimeout(3100);
    await page.getByRole("button", { name: "Başvuruyu gönder" }).click();
    await expect(page.getByText("Kurumsal e-posta adresinizi yazın.")).toBeVisible();
    await axe(page);
  });

  test("başka kökenden istek reddedilir", async ({ request }) => {
    const y = await request.post("/api/pilot", { headers: { origin: "https://kotu.example" }, data: {} });
    expect(y.status()).toBe(403);
  });
});

test.describe("İP-42 site metni", () => {
  for (const yol of ["/", "/proje", "/kvkk"]) {
    test(`375 px: ${yol} taşmaz, dokunma alanları en az 44 px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(yol);
      // Ana sayfada bütün açılır bölümler açılır; açık hâlde de taşma olmamalı.
      await page.evaluate(() => {
        for (const d of document.querySelectorAll("details")) d.open = true;
      });
      const tasma = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // Taşma olursa ileti taşan öğeleri (kaydırma kabı içindekiler hariç) adıyla söyler.
      const tasanlar = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
          .filter((e) => !e.closest("[class*='overflow-x-auto']"))
          .slice(0, 6)
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 50)}`),
      );
      expect(tasma, tasanlar.join(" | ")).toBeLessThanOrEqual(0);
      // Hukuk metninin içindeki satır içi bağlantılar sayılmaz; denetim ana yoldaki sayfalar içindir.
      if (yol === "/kvkk") return;
      const kucukler = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("header a, header button, main a, main button, main summary")]
          .filter((e) => e.getClientRects().length > 0 && !e.closest("p, dd, li p"))
          .filter((e) => e.getBoundingClientRect().height < 44)
          .map((e) => (e.textContent ?? "").trim().slice(0, 40)),
      );
      expect(kucukler).toEqual([]);
    });
  }

  test("kimler için: dört rol bölümü", async ({ page }) => {
    await page.goto("/kimler-icin");
    for (const ad of ["Rektörlük", "Kalite komisyonu", "Bölüm başkanı", "Öğretim elemanı"])
      await expect(page.getByRole("heading", { level: 2, name: ad, exact: true })).toBeVisible();
  });

  test("tanıtım sayfalarında depo yolu görünmez; dayanaklar GitHub'a bağlanır", async ({ page }) => {
    for (const yol of [
      "/",
      "/proje",
      "/nasil-calisir",
      "/yapay-zeka",
      "/giris-ve-hesap",
      "/ne-yapar",
      "/kimler-icin",
    ]) {
      await page.goto(yol);
      const metin = await page.locator("body").innerText();
      expect(metin, yol).not.toMatch(/\b(?:packages|apps|docs|infra)\/|\.(?:tsx?|sql)\b|CLAUDE\.md/u);
    }
    await page.goto("/nasil-calisir");
    const bag = page.locator("#dayanak-1 a").last();
    await expect(bag).toHaveAttribute("href", /^https:\/\/github\.com\/tialkan\/akredit\//u);
  });

  test("ne yapar: her modülde durum; yol haritası bağlı", async ({ page }) => {
    await page.goto("/ne-yapar");
    const durumlar = page.locator("main section[id] >> text=/^Durum:/");
    expect(await durumlar.count()).toBeGreaterThanOrEqual(16);
    await page.getByRole("link", { name: "Yol haritası", exact: true }).first().click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yol haritası");
    await expect(page.getByText("Sınav kâğıdı taraması")).toBeVisible();
  });

  for (const genislik of [375, 1440]) {
    test(`ekran görüntüleri ${genislik} px`, async ({ page }) => {
      await page.setViewportSize({ width: genislik, height: genislik === 375 ? 812 : 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const [yol, ad] of [
        ["/", "ana-sayfa"],
        ["/proje", "proje"],
        ["/kimler-icin", "kimler-icin"],
        ["/ne-yapar", "ne-yapar"],
        ["/yol-haritasi", "yol-haritasi"],
        ["/pilot", "pilot"],
      ] as const) {
        await page.goto(yol);
        await expect(page.locator("h1").first()).toBeVisible();
        await page.screenshot({ path: join(EKRANLAR, `${ad}-ip42-${genislik}.png`), fullPage: true });
      }
    });
  }
});
