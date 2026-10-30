import { expect, type Page, test } from "@playwright/test";

const grup = (page: Page, ad: RegExp) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: ad }) });

test.describe("tanıtım sitesi", () => {
  test("ana sayfa ve menü", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Akredit/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Siz yalnız onaylarsınız");
    await expect(page.getByRole("heading", { name: "İşi kim yapar" })).toBeVisible();
    const menu = page.getByRole("navigation", { name: "Site menüsü" });
    for (const [ad, baslik] of [
      ["Ne yapar", "Ne yapar"],
      ["Nasıl çalışır", "Nasıl çalışır"],
      ["Kimler için", "Kimler için"],
      ["Çerçeveler", "Desteklenen çerçeveler"],
      ["Yapay zekâ ve anahtar", "Yapay zekâ ve kendi anahtarınız"],
      ["Güvenlik ve KVKK", "Güvenlik ve kişisel veriler"],
      ["SSS", "Sık sorulan sorular"],
    ] as const) {
      await menu.getByRole("link", { name: ad, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
    }
    const alt = page.getByRole("navigation", { name: "Alt menü" });
    for (const [ad, baslik] of [
      ["Sınırlar", "Akredit neyi yapmaz"],
      ["Giriş ve hesap", "Giriş ve hesap"],
      ["Açık kaynak", "Açık kaynak"],
      ["İletişim", "İletişim"],
    ] as const) {
      await alt.getByRole("link", { name: ad, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
    }
  });

  test("SEO dosyaları ve yapılandırılmış veri", async ({ page, request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: https://akredit.org/sitemap.xml");
    expect(robots).toMatch(/Disallow: \/panel/);
    const harita = await (await request.get("/sitemap.xml")).text();
    expect(harita).toContain("https://akredit.org/yapay-zeka");
    expect((await request.get("/llms.txt")).status()).toBe(200);
    await page.goto("/sss");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://akredit.org/sss");
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(ld).toContain('"FAQPage"');
  });

  test("dar ekranda menü açılır", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await page.getByText("Menü", { exact: true }).click();
    await page.getByRole("navigation", { name: "Kısa menü" }).getByRole("link", { name: "Ne yapar" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ne yapar");
  });

  test("KVKK sayfası taslak olduğunu söyler", async ({ page }) => {
    await page.goto("/kvkk");
    await expect(page.getByText("Bu sayfa taslaktır.")).toBeVisible();
  });
});

test.describe("panel", () => {
  test("kenar çubuğuyla gezinme", async ({ page }) => {
    await page.goto("/panel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Genel bakış");
    const menu = page.getByRole("navigation", { name: "Panel menüsü" });
    for (const [ad, baslik] of [
      ["Onay kutusu", "Onay kutusu"],
      ["Kanıtlar", "Kanıtlar"],
      ["Program", "Bilgisayar Programcılığı"],
      ["Dersler", "Dersler"],
      ["Raporlar", "Raporlar"],
      ["Takvim ve görevler", "Takvim ve görevler"],
      ["Ayarlar", "Ayarlar"],
    ] as const) {
      await menu.getByRole("link", { name: new RegExp(`^${ad}`) }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
      await expect(menu.getByRole("link", { name: new RegExp(`^${ad}`) })).toHaveAttribute("aria-current", "page");
    }
  });

  test("kanıt arama ve tablo sıralama", async ({ page }) => {
    await page.goto("/panel/kanitlar");
    await page.getByRole("searchbox", { name: "Ara" }).fill("ogrenci");
    await expect(page.getByText("1 kanıt gösteriliyor")).toBeVisible();
    await page.getByRole("searchbox", { name: "Ara" }).fill("");
    await page.getByRole("button", { name: /^Boyut/ }).click();
    await expect(page.getByRole("columnheader", { name: /Boyut/ })).toHaveAttribute("aria-sort", "ascending");
  });

  test("rapor EKSİK paragrafları işaretler ve atıf kanıta götürür", async ({ page }) => {
    await page.goto("/panel/raporlar/rapor-odr");
    // İP-44: rapor cümle cümle okunur; kanıtsız cümle "kanıt yok" ile işaretli, atıf yan panelden kanıta götürür.
    await expect(page.getByText("(kanıt yok)")).toHaveCount(2);
    await page.getByRole("button", { name: /Program çıktılarının gözden geçirilmesi/ }).click();
    await page.getByRole("link", { name: "Kanıtı ayrı sayfada aç" }).click();
    await expect(page).toHaveURL(/kanit-03#parca-3-2/);
  });

  test("program matrisi sekmesi klavyeyle açılır", async ({ page }) => {
    await page.goto("/panel/programlar/prog-bp");
    await page.getByRole("tab", { name: "Program çıktıları" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Matris" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("table")).toContainText("Ders çıktısı");
  });
});

test.describe("onay kutusu", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/panel/onaylar");
    // Klavye ve tıklama dinleyicileri istemci yüklenince bağlanır.
    await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
    await expect(page.getByText("54 öneri bekliyor")).toBeVisible();
  });

  test("düşük risk toplu onaylanır", async ({ page }) => {
    const dusuk = grup(page, /Düşük risk/);
    const kutular = dusuk.getByRole("checkbox", { name: /^Seç:/ });
    await kutular.nth(0).check();
    await kutular.nth(1).check();
    await dusuk.getByRole("button", { name: "Seçilenleri onayla (2)" }).click();
    await expect(page.getByText("2 öneri onaylandı.")).toBeVisible();
    await expect(page.getByText("52 öneri bekliyor")).toBeVisible();
  });

  test("yüksek risk toplu seçilemez, politikaya bağlanamaz, kanıtı açıktır", async ({ page }) => {
    const yuksek = grup(page, /Yüksek risk/);
    await expect(yuksek.getByRole("checkbox")).toHaveCount(0);
    await expect(yuksek.getByRole("button", { name: /otomatik onayla/ })).toHaveCount(0);
    await expect(yuksek.getByRole("button", { name: "Seçilenleri onayla" })).toHaveCount(0);
    await expect(yuksek.locator("blockquote").first()).toBeVisible();
    await expect(yuksek.getByText(/EKSİK: Bu öneri hiçbir kanıta bağlanamadı/)).toBeVisible();
  });

  test("tek öneri onaylanır, düzeltilir ve reddedilir", async ({ page }) => {
    const ilk = page.locator("article").first();
    const baslik = await ilk.getByRole("heading").textContent();
    await ilk.getByRole("button", { name: "Onayla" }).click();
    await expect(page.getByText(`Onaylandı: ${baslik}`)).toBeVisible();

    const ikinci = page.locator("article").first();
    await ikinci.getByRole("button", { name: "Düzelt" }).click();
    await page.getByRole("textbox", { name: "Düzeltilmiş metin" }).fill("Düzeltilmiş öneri metni.");
    await page.getByRole("button", { name: "Düzeltmeyi kaydet" }).click();
    await expect(page.getByText(/^Düzeltilerek onaylandı:/)).toBeVisible();

    await page.locator("article").first().getByRole("button", { name: "Reddet" }).click();
    const kutu = page.getByRole("dialog", { name: "Öneriyi reddet" });
    await expect(kutu).toBeVisible();
    await kutu.getByRole("textbox", { name: /Gerekçe/ }).fill("Kanıt eski.");
    await kutu.getByRole("button", { name: "Reddet" }).click();
    await expect(page.getByText(/^Reddedildi:/)).toBeVisible();
    await expect(page.getByText("51 öneri bekliyor")).toBeVisible();
  });

  test("iletişim kutusu Esc ile kapanır, odak geri döner", async ({ page }) => {
    const dugme = page.locator("article").first().getByRole("button", { name: "Reddet" });
    await dugme.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(dugme).toBeFocused();
  });

  test("kanıt atfı alıntıyı gösterir", async ({ page }) => {
    await grup(page, /Orta risk/)
      .getByRole("button", { name: /BP101 ders izlencesi/ })
      .first()
      .click();
    const kutu = page.getByRole("dialog");
    await expect(kutu.locator("blockquote")).toContainText("Dersin amacı");
    await expect(kutu.getByRole("link", { name: "Kanıtın tamamını aç" })).toHaveAttribute("href", /kanit-01#parca-1-1/);
  });

  test("otomatik onay politikası taslağı oluşturulur ve imzalanır", async ({ page }) => {
    await grup(page, /Orta risk/)
      .getByRole("button", { name: /otomatik onayla/ })
      .first()
      .click();
    const kutu = page.getByRole("dialog", { name: "Otomatik onay politikası" });
    await expect(kutu).toContainText("Yüksek riskli işler hiçbir zaman otomatik onaylanmaz");
    await kutu.getByRole("button", { name: "Taslağı oluştur" }).click();
    await kutu.getByRole("textbox", { name: /adınızı yazın/ }).fill("Yanlış Ad");
    await kutu.getByRole("button", { name: "İmzala" }).click();
    await expect(kutu.getByText(/adınızı hesabınızdaki gibi yazın/)).toBeVisible();
    await kutu.getByRole("textbox", { name: /adınızı yazın/ }).fill("Dr. Öğr. Üyesi Deniz Örnek");
    await kutu.getByRole("button", { name: "İmzala" }).click();
    await expect(page.getByText("Politika imzalandı ve günlüğe yazıldı.")).toBeVisible();
  });

  test("klavye kısayolları: j ile gez, a ile onayla, x ile seç", async ({ page }) => {
    await page.locator("article").first().focus();
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Klavye kısayolları" })).toBeVisible();
    await page.keyboard.press("Escape");
    // Yüksek risk ilk grup; x yüksek riskte seçmez ve uyarır.
    await page.locator("article").first().focus();
    await page.keyboard.press("x");
    await expect(page.getByText("Yüksek riskli öneriler toplu seçilemez. Tek tek onaylayın.")).toBeVisible();
    await page.keyboard.press("j");
    await expect(page.locator("article").nth(1)).toBeFocused();
    await page.keyboard.press("a");
    await expect(page.getByText("53 öneri bekliyor")).toBeVisible();
  });
});
