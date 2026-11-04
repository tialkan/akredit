import { expect, test } from "@playwright/test";

// Demo akışı (İP-41). Uçtan uca testler örnek veri kipinde derlenmiş uygulamaya karşı çalışır: rol seçimi
// panele kurgu veriyle gider. Gerçek veritabanında demo oturumu (`POST /api/deneyin`, iki saatlik oturum,
// gerçek kurumlara erişememe) `src/demo/demo.test.ts` ile sınanır.

test.describe("deneyin", () => {
  test("proje ayrıntılarından rol seçerek panele, şerit ve rehber turuyla", async ({ page }) => {
    await page.goto("/proje");
    await page.getByRole("link", { name: "Demo: Örnek Üniversitesi" }).click();
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

  test("demo ana sayfada değil, proje ayrıntılarında; demo sayfasında durum şeridi", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('main a[href="/deneyin"]')).toHaveCount(0);
    await page.goto("/deneyin");
    const serit = page.locator("[data-sayfa-durumu]");
    await expect(serit.locator("[data-durum]")).toHaveText("Çalışıyor");
    await expect(serit.getByRole("link", { name: "Proje ayrıntıları" })).toHaveAttribute("href", "/proje");
  });
});
