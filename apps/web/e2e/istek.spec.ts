// İP-45 uçtan uca: hesapsız belge yükleme sayfası. Giriş ve çerez olmadan açılır, 375 px'te yatay kaydırma
// olmadan kullanılır, axe temizdir. Örnek bağlantı (`?j=ornek`) gösterir ama kaydetmez; bozuk bağlantı açıkça
// reddedilir.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { KURULUM_ADRESI } from "./yardim/ortam.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

async function axe(page: Page) {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

test.describe("hesapsız belge yükleme", () => {
  test.use({ baseURL: KURULUM_ADRESI, viewport: { width: 375, height: 800 } });

  test("örnek bağlantı hesapsız açılır, 375 px'te kullanılır, gönderim kaydetmeden onaylanır", async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto("/belge-yukle?j=ornek");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Belge yükleme");
    await expect(page.getByText("İstenen belge")).toBeVisible();
    await axe(page);
    const tasma = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(tasma).toBeLessThanOrEqual(0);
    await page.getByLabel("Dosya").setInputFiles({
      name: "plan.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7 örnek"),
    });
    await page.getByLabel("Kısa not (isteğe bağlı)").fill("Örnek not.");
    await page.waitForTimeout(2100); // Bot denetimi: form en az 2 sn açık kalmalı.
    await page.getByRole("button", { name: "Belgeyi gönder" }).click();
    await expect(page.getByRole("status")).toContainText("Örnek gönderim tamam");
    await axe(page);
    expect(await context.cookies()).toEqual([]);
  });

  test("bozuk bağlantı reddedilir ve ne yapılacağı söylenir", async ({ page }) => {
    await page.goto("/belge-yukle?j=bozuk.baglanti");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bağlantı açılamadı");
    await expect(page.getByText(/isteyen kişi/u)).toBeVisible();
    await axe(page);
  });
});
