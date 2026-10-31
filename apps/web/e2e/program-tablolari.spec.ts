// Program tabloları sayfası (İP-47), örnek veri kipi: çerçeve seçimi, hücre kaynağı, "Öneri iste" ve eşleme
// onayı yalnız klavyeyle yapılır; her durumda axe WCAG 2.2 AA ihlali yoktur. Örnek kipte karar ve öneri
// kaydedilmez, sayfa bunu söyler.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const YOL = "/panel/programlar/prog-bp/tablolar";
const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

test.describe.configure({ timeout: 90_000 });

async function axeTemiz(page: Page): Promise<void> {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(
    sonuc.violations.map(
      (v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

/** Odak verilen öğeye ulaşana dek Sekme tuşuna basar; fare kullanılmaz. */
async function sekmeyleGit(page: Page, hedef: ReturnType<Page["locator"]>, en = 400): Promise<void> {
  for (let i = 0; i < en; i++) {
    await page.keyboard.press("Tab");
    if (await hedef.evaluate((e) => e === document.activeElement)) return;
  }
  throw new Error("Öğeye klavyeyle ulaşılamadı");
}

test("program tabloları: çerçeve klavyeyle seçilir, tablolar ve EKSİK hücreler görünür", async ({ page }) => {
  await page.goto(YOL);
  await expect(page.getByRole("heading", { level: 1, name: "Program tabloları" })).toBeVisible();
  const secim = page.getByLabel("Akreditasyon çerçevesi");
  const secenekler = await secim.locator("option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
  expect(secenekler.length).toBeGreaterThan(1);
  const hedef = secenekler[1] ?? "";

  await sekmeyleGit(page, secim);
  await page.keyboard.press("ArrowDown");
  await expect(secim).toHaveValue(hedef);
  await sekmeyleGit(page, page.getByLabel("Hücre kaynaklarını göster"));
  await page.keyboard.press("Space");
  await sekmeyleGit(page, page.getByRole("button", { name: "Tabloları göster" }));
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(new RegExp(`cerceve=${hedef}.*kaynak=1`, "u"));
  await expect(page.getByLabel("Akreditasyon çerçevesi")).toHaveValue(hedef);
  await expect(page.getByRole("navigation", { name: "Tablolar" })).toBeVisible();
  // Her tablo başlıklı bir bölümdür; verisi olmayan hücre boş ya da sıfır değil EKSİK yazılır.
  expect(await page.getByRole("table").count()).toBeGreaterThan(0);
  await expect(page.getByRole("cell", { name: "EKSİK" }).first()).toBeVisible();
  await axeTemiz(page);
});

test("program tabloları: Öneri iste klavyeyle çalışır, örnek kipte öneri istenmediğini söyler", async ({ page }) => {
  await page.goto(YOL);
  const dugme = page.getByRole("button", { name: "Öneri iste" });
  await expect(dugme).toBeVisible();
  // Düğmenin açıklaması ekran okuyucuya bağlı: öneri onaysız tabloya girmez.
  await expect(dugme).toHaveAccessibleDescription(/siz onaylamadıkça tabloya girmez/u);
  await sekmeyleGit(page, dugme);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/ileti=oneri_ornek/u);
  await expect(page.getByRole("status").filter({ hasText: "Örnek veri kipinde öneri istenmez." })).toBeVisible();
  await axeTemiz(page);
});

test("program tabloları: eşleme onayı örnek kipte kaydedilmez", async ({ page }) => {
  await page.goto(YOL);
  await expect(page.getByRole("heading", { name: "Eşlemeler" })).toBeVisible();
  const dayanak = page.locator("#eslemeler textarea, #eslemeler input[name=dayanak]").first();
  await sekmeyleGit(page, dayanak, 800);
  await page.keyboard.type("Bölüm kurulu kararı, örnek");
  const kaydet = page.locator("#eslemeler button[type=submit]").last();
  await sekmeyleGit(page, kaydet, 50);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/ileti=ornek/u);
  await expect(page.getByRole("status").filter({ hasText: "Örnek veri kipinde karar kaydedilmez." })).toBeVisible();
});
