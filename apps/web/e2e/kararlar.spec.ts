// İP-39: karar kartları ve yönetici özeti (örnek veri kipi). Katman 2'de toplu onay yoktur; klavyeyle karar
// verilir; yönetici özeti görülmeden nihai onay düğmesi çalışmaz. Erişilebilirlik axe ile denetlenir.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

test("karar kartları: kümelenmiş kart, klavyeyle önlem, toplu onay yok", async ({ page }) => {
  await page.goto("/panel/kararlar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Karar kartları");
  const kartlar = page.getByRole("list", { name: "Karar kartları" }).getByRole("article");
  // Örnek: PÇ3'te üç ders tek kartta, BP101 ÇK2 ayrı kart. Eşiği geçen sonuçlar karta düşmez.
  await expect(kartlar).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Program çıktısı PÇ3: 3 ders eşiğin altında" })).toBeVisible();
  await expect(page.getByRole("button", { name: /hepsini onayla|toplu/iu })).toHaveCount(0);

  const ihlaller = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(ihlaller.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

  // Seçim yapmadan kaydetmek hata verir; 1 ile ilk önlem seçilir, o ile kaydedilir.
  await kartlar.first().focus();
  await page.keyboard.press("o");
  await expect(page.getByRole("alert").filter({ hasText: "Önce bir önlem seçin" })).toBeVisible();
  await page.keyboard.press("1");
  await page.keyboard.press("o");
  await expect(kartlar).toHaveCount(1);

  // Kendi önlemi: y ile yazma alanı açılır.
  await page.keyboard.press("y");
  await expect(page.getByLabel("Önleminiz")).toBeFocused();
  await page.getByLabel("Önleminiz").fill("Laboratuvar oturumu ekle");
  await page.getByRole("button", { name: "Kararı kaydet" }).click();
  await expect(page.getByText("Bütün kararlar verildi")).toBeVisible();
});

test("yönetici özeti görülmeden nihai onay verilemez", async ({ page }) => {
  await page.goto("/panel/kararlar");
  const onay = page.getByRole("button", { name: "Raporu onayla" });
  await expect(page.getByRole("heading", { name: "Düşen göstergeler" })).toBeVisible();
  await expect(onay).toBeDisabled();
  await page.getByLabel("Özeti okudum").check();
  await expect(onay).toBeEnabled();
});
