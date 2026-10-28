import { expect, test } from "@playwright/test";

// Demo akışı (İP-41). Uçtan uca testler örnek veri kipinde derlenmiş uygulamaya karşı çalışır: rol seçimi
// panele kurgu veriyle gider. Gerçek veritabanında demo oturumu (`POST /api/deneyin`, iki saatlik oturum,
// gerçek kurumlara erişememe) `src/demo/demo.test.ts` ile sınanır.

test.describe("deneyin", () => {
  test("ana sayfadan rol seçerek panele, şerit ve rehber turuyla", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Hesap açmadan deneyin" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hesap açmadan deneyin");
    for (const ad of [
      "Öğretim elemanı olarak dene",
      "Bölüm başkanı olarak dene",
      "Kalite komisyonu olarak dene",
      "Rektörlük olarak dene",
      "Dış değerlendirici olarak dene",
    ])
      await expect(page.getByRole("button", { name: ad })).toBeVisible();

    await page.getByRole("button", { name: "Bölüm başkanı olarak dene" }).click();
    await expect(page).toHaveURL(/\/panel\?tur=1&rol=bolum_baskani/u);
    await expect(page.getByText("Örnek veri, gerçek kurum değildir.")).toBeVisible();
    const tur = page.getByRole("region", { name: "Rehber turu" });
    await expect(tur).toContainText("Adım 1 / 3");
    await tur.getByRole("button", { name: "İleri" }).click();
    await expect(tur).toContainText("Adım 2 / 3");
    await tur.getByRole("button", { name: "Geri" }).click();
    await expect(tur).toContainText("Adım 1 / 3");
    await tur.getByRole("button", { name: "Turu kapat" }).click();
    await expect(tur).toBeHidden();
    await expect(page.getByText("Örnek veri, gerçek kurum değildir.")).toBeVisible();
  });

  test("site menüsünde Deneyin bağlantısı", async ({ page }) => {
    await page.goto("/nasil-calisir");
    await page.getByRole("link", { name: "Deneyin", exact: true }).click();
    await expect(page).toHaveURL(/\/deneyin$/u);
  });
});
