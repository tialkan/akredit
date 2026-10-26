import { expect, test } from "@playwright/test";

// 360 px telefon: onay kutusu yatay kaydırma olmadan kullanılır.
test("telefonda onay kutusu", async ({ page }) => {
  await page.goto("/panel/onaylar");
  await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
  const tasma = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(tasma).toBeLessThanOrEqual(0);
  const ilk = page.locator("article").first();
  const dugme = ilk.getByRole("button", { name: "Onayla" });
  const kutu = await dugme.boundingBox();
  expect(kutu?.height ?? 0).toBeGreaterThanOrEqual(24);
  await dugme.tap();
  await expect(page.getByText("53 öneri bekliyor")).toBeVisible();
});

test("telefonda panel menüsü açılır", async ({ page }) => {
  await page.goto("/panel");
  const menu = page.getByRole("navigation", { name: "Panel menüsü" });
  await menu.getByRole("button", { name: "Menü" }).tap();
  await menu.getByRole("link", { name: /^Kanıtlar/ }).tap();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kanıtlar");
});
