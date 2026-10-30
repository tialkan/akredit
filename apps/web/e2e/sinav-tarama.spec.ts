// Sınav kâğıdı taraması ekranı (İP-43): kartlar yalnız klavyeyle karara bağlanabilir; aktarım düğmesi kartlar
// bitince açılır. Örnek veri kipi; numara ekranda görünmez.

import { expect, test } from "@playwright/test";

test("onay kartları klavyeyle kapatılır, aktarım düğmesi sonra açılır", async ({ page }) => {
  await page.goto("/panel/dersler/ders-bp101/tarama");
  await expect(page.getByRole("heading", { level: 1, name: "Sınav kâğıdı taraması" })).toBeVisible();
  const aktar = page.getByRole("button", { name: "Özeti onayla ve puanları aktar" });
  await expect(aktar).toBeDisabled();
  const kartlar = page.getByRole("article");
  await expect(kartlar).toHaveCount(4);

  // Numara kartı: alana odaklan, numarayı yaz, Enter.
  await page.getByLabel("Kâğıttaki öğrenci numarası").focus();
  await page.keyboard.type("2099000104");
  await page.keyboard.press("Enter");
  // Sayfada her bölümün kendi durum bölgesi var (şablon, yükleme, kartlar); karar bildirimi kartlarınkindedir.
  await expect(page.getByRole("status").filter({ hasText: "kararınız kaydedildi" })).toHaveText(
    "2. kâğıt, öğrenci numarası: kararınız kaydedildi.",
  );
  await expect(kartlar).toHaveCount(3);

  // Azami puanı aşan düzeltme reddedilir, doğru puan kabul edilir.
  const puan = page.getByLabel("Doğru puan").first();
  await puan.focus();
  await page.keyboard.type("11");
  await page.keyboard.press("Enter");
  await expect(page.getByText("en çok 10 puan verilebilir")).toBeVisible();
  await puan.fill("");
  await puan.focus();
  await page.keyboard.type("10");
  await page.keyboard.press("Enter");
  await expect(kartlar).toHaveCount(2);

  // Kalan iki kart "Okunanı onayla" düğmesine Tab ile gelip Enter.
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Okunanı onayla" }).first().focus();
    await page.keyboard.press("Enter");
  }
  await expect(kartlar).toHaveCount(0);
  await expect(aktar).toBeEnabled();
  await expect(page.getByText("2099000104")).toHaveCount(0);
});
