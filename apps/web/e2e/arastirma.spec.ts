// İP-37 panel akışı: kurum ayarlarında "Web araması" bölümü ve ders sayfasındaki araştırma kartı.
// Panel örnek veri kipindedir (bellek kaynağı); sunucudaki kuralın aynısı (izin yokken açılamaz, 1-10) burada da
// uygulanır. Erişilebilirlik axe ile denetlenir.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const bolum = (page: Page) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: "Web araması", exact: true }) });

test.describe("web araması ayarı", () => {
  test("yurt dışı izni yokken devre dışı ve nedeni yazılı; izinle açılır, sonuç tavanı 1-10", async ({ page }) => {
    await page.goto("/panel/ayarlar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ayarlar");
    const b = bolum(page);
    await expect(b).toBeVisible();

    // 1. İzin yok: anahtar ve sonuç alanı devre dışı, nedeni okunur ve anahtara bağlıdır.
    const anahtar = b.getByRole("switch", { name: "Başka kurumlarda örnek ara" });
    await expect(anahtar).toBeDisabled();
    await expect(anahtar).not.toBeChecked();
    await expect(b.getByText(/Devre dışı: web araması yurt dışındaki hizmeti kullanır/u)).toBeVisible();
    await expect(anahtar).toHaveAccessibleDescription(/Devre dışı/u);
    await expect(b.getByLabel("İstek başına en çok sonuç")).toBeDisabled();
    await expect(b.getByLabel("İstek başına en çok sonuç")).toHaveValue("5");

    const ihlaller = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
    expect(ihlaller.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

    // 2. Yurt dışı izni verilir: bölüm etkinleşir, neden kaybolur.
    await page.getByRole("switch", { name: "Yurt dışındaki yapay zekâ hizmetine izin ver" }).check();
    await expect(anahtar).toBeEnabled();
    await expect(b.getByText(/Devre dışı:/u)).toHaveCount(0);

    // 3. Klavyeyle açılır.
    await anahtar.focus();
    await page.keyboard.press("Space");
    await expect(anahtar).toBeChecked();
    await expect(b.getByText("Şu an: Açık")).toBeVisible();
    await expect(page.getByText("Web araması açıldı.")).toBeVisible();

    // 4. Tavan dışı değer reddedilir; geçerli değer kaydedilir.
    const sonuc = b.getByLabel("İstek başına en çok sonuç");
    await sonuc.fill("11");
    await b.getByRole("button", { name: "Kaydet" }).click();
    await expect(b.getByText("1 ile 10 arasında bir tam sayı yazın.")).toBeVisible();
    await expect(sonuc).toHaveAttribute("aria-invalid", "true");
    await sonuc.fill("3");
    await b.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText("Web araması: istek başına en çok 3 sonuç.")).toBeVisible();
    await expect(sonuc).toHaveValue("3");

    // 5. İzin kaldırılınca web araması yine devre dışı görünür (açık olsa da istek gitmez).
    await page.getByRole("switch", { name: "Yurt dışındaki yapay zekâ hizmetine izin ver" }).uncheck();
    await expect(anahtar).toBeDisabled();
    await expect(anahtar).not.toBeChecked();
    await expect(b.getByText("Şu an: Kapalı")).toBeVisible();
  });
});

test.describe("ders sayfası araştırma kartı", () => {
  test("eylemler örnek kipte ne yapılacağını söyler", async ({ page }) => {
    await page.goto("/panel/dersler/ders-bp101");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText(/Eksik giderme, kanıt arama ve Word paketi örnek veri kipinde kapalıdır/u),
    ).toBeVisible();
  });
});
