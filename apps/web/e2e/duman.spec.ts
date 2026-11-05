import { expect, type Page, test } from "@playwright/test";

const grup = (page: Page, ad: RegExp) =>
  page.locator("section").filter({ has: page.getByRole("heading", { name: ad }) });

test.describe("tanıtım sitesi", () => {
  test("ana sayfa: yalnız iki adım ve SSS; menü üç öğe", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Akredit/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("kendi yapay zekânızda");
    await expect(page.locator("main h2")).toHaveText([
      /Adım 1.*Akredit'i yapay zekânıza ekleyin/u,
      /Adım 2.*akredit yazın/u,
      "Takıldınız mı?",
    ]);
    // Eski tanıtım bölümleri ana sayfadan kalktı.
    for (const ad of ["Platform", "İşi kim yapar", "Kim için ne yapar", "Bir dönem nasıl geçer"])
      await expect(page.getByRole("heading", { name: ad, exact: true })).toHaveCount(0);
    // Claude varsayılan açık, diğerleri kapalı; geliştirici araçları en sonda.
    const kutular = page.locator("#kurulum details");
    await expect(kutular).toHaveCount(5);
    await expect(page.locator("#kur-claude")).toHaveAttribute("open", "");
    for (const k of ["chatgpt", "claude-code", "cursor", "vscode"])
      await expect(page.locator(`#kur-${k}`)).not.toHaveAttribute("open");
    await expect(kutular.last()).toHaveAttribute("id", "kur-vscode");
    await expect(page.locator("#kur-claude ol > li")).toHaveCount(5);
    await expect(page.locator("#kur-claude")).toContainText("Add custom connector");
    await page.locator("#kur-claude-code summary").click();
    await expect(page.locator("#kur-claude-code")).toContainText(
      "claude mcp add --transport http akredit https://akredit.org/mcp",
    );
    await expect(page.getByText("parolanızı yalnız OBS'nin kendi ekranına yazın")).toBeVisible();
    await expect(page.locator("main details:not([id])")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "Ayrıntılı kurulum rehberi ve bütün araçlar" })).toHaveAttribute(
      "href",
      "/mcp-kullan",
    );

    const menu = page.getByRole("navigation", { name: "Site menüsü" });
    await expect(menu.getByRole("link")).toHaveText(["Nasıl kurulur", "Proje ayrıntıları", "İletişim", "Giriş"]);
    for (const [ad, baslik] of [
      ["Nasıl kurulur", "Akredit araçlarını kendi yapay zekânızla kullanın"],
      ["Proje ayrıntıları", "Projenin devam eden ayrıntıları"],
      ["İletişim", "İletişim"],
    ] as const) {
      await menu.getByRole("link", { name: ad, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(baslik);
    }
    const alt = page.getByRole("navigation", { name: "Alt menü" });
    await expect(alt.getByRole("link", { name: "Kaynak kodu (GitHub)" })).toHaveAttribute(
      "href",
      "https://github.com/tialkan/akredit",
    );
    await expect(page.locator("footer")).toContainText("YÖKAK ya da başka bir akreditasyon kuruluşuyla bağı yoktur");
    await alt.getByRole("link", { name: "Proje ayrıntıları", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projenin devam eden ayrıntıları");
  });

  test("kopyala düğmesi klavyeyle çalışır ve sonucu söyler", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    const dugme = page.locator("#kur-claude").getByRole("button", { name: "Kopyala" });
    await dugme.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#kur-claude").getByText("Kopyalandı.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("https://akredit.org/mcp");
    // En kolay yol: kurulum isteğinin tamamı tek düğmeyle kopyalanır.
    const istek = page.locator("#kurulum > div > div").filter({ hasText: "Claude'a yapıştırılacak metin" });
    await istek.getByRole("button", { name: "Kopyala" }).focus();
    await page.keyboard.press("Enter");
    await expect(istek.getByText("Kopyalandı.")).toBeVisible();
    const pano = await page.evaluate(() => navigator.clipboard.readText());
    expect(pano).toContain("Akredit'i benim için kur.");
    // Tam otonom: kullanıcıya hangi uygulamayı kullandığı sorulmaz.
    expect(pano).not.toMatch(/hangi uygulamay/u);
    expect(pano).toContain("https://akredit.org/mcp");
    expect(pano).toContain("Benden parola ya da doğrulama kodu isteme.");
    // Claude Code: açılır bölüm klavyeyle açılır, komut boşluk tuşuyla kopyalanır.
    await page.locator("#kur-claude-code summary").focus();
    await page.keyboard.press("Enter");
    await page.locator("#kur-claude-code").getByRole("button", { name: "Kopyala" }).first().focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#kur-claude-code").getByText("Kopyalandı.")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "claude mcp add --transport http akredit https://akredit.org/mcp",
    );
  });

  test("proje ayrıntıları: gruplar, durum etiketleri ve geri bağlantı", async ({ page }) => {
    await page.goto("/proje");
    const durum = (yol: string) => page.locator(`[data-proje-sayfasi="${yol}"] [data-durum]`);
    // Ana sunucu barındırma açık kipte (AKREDIT_BARINDIRMA=1): askıdaki sayfalar bu kurulumda çalışır görünür.
    // Kapalı kip (üretim varsayılanı, "Askıda") barindirma.spec.ts'te sınanır.
    for (const y of ["/mcp-kullan", "/ne-yapar", "/sss", "/pilot"]) await expect(durum(y), y).toHaveText("Çalışıyor");
    // Demo henüz tamamlanmadı (kurucu, İP-49).
    await expect(durum("/deneyin")).toHaveText("Taslak");
    for (const y of ["/kvkk", "/gizlilik", "/kosullar", "/guvenlik"]) await expect(durum(y), y).toHaveText("Çalışıyor");
    await expect(durum("/belgeler")).toHaveText("Taslak");
    await expect(page.locator("main h2")).toContainText([
      "Kendi yapay zekânızla kullanım",
      "Platformu tanıtan sayfalar",
      "Barındırılan kurum hizmeti",
      "Güven ve hukuk metinleri",
    ]);
    await page.locator('[data-proje-sayfasi="/kvkk"] a').click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kişisel verilerin korunması");
    const serit = page.locator("[data-sayfa-durumu]");
    await expect(serit.locator("[data-durum]")).toHaveText("Çalışıyor");
    await expect(serit).toContainText("tüzel kimliği");
    await serit.getByRole("link", { name: "Proje ayrıntıları" }).click();
    await expect(page).toHaveURL(/\/proje$/u);
    // Ana yoldaki sayfalarda şerit yok.
    for (const y of ["/", "/mcp-kullan", "/iletisim"]) {
      await page.goto(y);
      await expect(page.locator("[data-sayfa-durumu]"), y).toHaveCount(0);
    }
  });

  test("SEO dosyaları ve yapılandırılmış veri", async ({ page, request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: https://akredit.org/sitemap.xml");
    expect(robots).toMatch(/Disallow: \/panel/);
    const harita = await (await request.get("/sitemap.xml")).text();
    expect(harita).toContain("https://akredit.org/yapay-zeka");
    expect(harita).toContain("https://akredit.org/proje");
    expect(await (await request.get("/llms.txt")).text()).toContain("https://akredit.org/proje");
    expect((await request.get("/llms.txt")).status()).toBe(200);
    await page.goto("/sss");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://akredit.org/sss");
    const ld = await page.locator('script[type="application/ld+json"]').textContent();
    expect(ld).toContain('"FAQPage"');
  });

  test("dar ekranda menü doğrudan görünür, açılır menü yok", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");
    await expect(page.getByText("Menü", { exact: true })).toHaveCount(0);
    await page
      .getByRole("navigation", { name: "Site menüsü" })
      .getByRole("link", { name: "Proje ayrıntıları" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projenin devam eden ayrıntıları");
  });

  test("hukuk sayfaları yayında: taslak uyarısı yok, geçerli durum bilgisi korunur", async ({ page }) => {
    for (const yol of ["/kvkk", "/gizlilik", "/kosullar", "/guvenlik"]) {
      await page.goto(yol);
      await expect(page.locator("main")).not.toContainText("taslak");
      await expect(page.locator("main")).not.toContainText("Hukuki incelemeden geçmemiştir");
      await expect(page.locator("main")).not.toContainText("avukat incelemesi");
    }
    // Hâlâ geçerli durumlar: barındırma askıda, bağımsız sızma testi yapılmadı.
    await expect(page.locator("main")).toContainText("Bağımsız sızma testi henüz");
    await page.goto("/proje");
    await expect(page.locator('[data-proje-sayfasi="/kvkk"] [data-durum]')).toHaveText("Çalışıyor");
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
