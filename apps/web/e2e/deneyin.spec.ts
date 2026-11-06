import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, type Request, test } from "@playwright/test";

// /deneyin (İP-49): tarayıcıda çalışan üç araç ve altta askıdaki barındırılan kurum demosu (İP-41).
// Araçlar ağ isteği yapmaz: her akışta, araç kodu yüklendikten sonra page.on("request") ile hiçbir istek
// olmadığı sınanır. Uçtan uca testler örnek veri kipinde derlenmiş uygulamaya karşı çalışır.

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

// Kurgu ders sayfası (KRG101); gerçek kurum ve kişi değildir.
const BOLOGNA = readFileSync(
  new URL("../../../packages/baglayicilar/test/fixtures/bologna/ders-9001.html", import.meta.url),
  "utf8",
);

/** Bundan sonra yapılan istekleri toplar. */
function istekleriTopla(page: Page): Request[] {
  const istekler: Request[] = [];
  page.on("request", (r) => istekler.push(r));
  return istekler;
}

test.describe("deneyin araçları", () => {
  test("ÇK/PÇ: kimlik sütunları atılır, hesap ağ isteği olmadan yapılır, CSV iner", async ({ page }) => {
    await page.goto("/deneyin");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Araçları tarayıcıda deneyin");
    await expect(page.locator("[data-veri-notu]")).toContainText("Verileriniz bu tarayıcıdan çıkmaz.");
    const tablo = page.getByLabel("Not tablosu");
    await expect(tablo).toBeVisible();
    await page.waitForLoadState("networkidle");

    const istekler = istekleriTopla(page);
    await page.getByRole("button", { name: "Örnek tabloyu koy" }).click();
    await page.getByRole("button", { name: "Tabloyu oku" }).click();
    const atilan = page.locator("[data-atilan]");
    await expect(atilan).toContainText("5 öğrenci okundu.");
    await expect(atilan).toContainText('Atılan sütunlar: "Ad Soyad", "Öğrenci No".');
    // Ham tablo bellekten ve kutudan silinir; sayfada ad ya da numara kalmaz.
    await expect(tablo).toHaveValue("");
    await expect(page.locator("main")).not.toContainText("Deniz Kurgu");
    await expect(page.locator("main")).not.toContainText("20269001");

    await page.getByRole("button", { name: "Hesapla" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("ölçme aracının ders notundaki yüzdesi yok");
    await page.getByLabel("Ara Sınav (%)").fill("30");
    await page.getByLabel("Yarıyıl Sonu Sınavı (%)").fill("50");
    await page.getByLabel("Ödev (%)").fill("20");
    await page.getByText("Program çıktısı (PÇ) için katkılar").click();
    await page.getByLabel("ÇK1 katkıları").fill("P1:3");
    await page.getByLabel("ÇK2 katkıları").fill("P1:1, P2:5");
    await page.getByRole("button", { name: "Hesapla" }).click();

    const sonuc = page.locator("[data-ck-sonuc]");
    await expect(sonuc).toBeVisible();
    // ÇK2 = Vize S2 /30: 20, 25, 12, 28, 10 → %66,7, %83,3, %40, %93,3, %33,3. Ortalama 63,3; eşiği geçen 3/5.
    await expect(sonuc.getByRole("row", { name: /ÇK2/u })).toContainText("63,3");
    await expect(sonuc.getByRole("row", { name: /ÇK2/u })).toContainText("%60,0");
    await expect(sonuc.getByRole("region", { name: "Program çıktısı sağlanması" })).toContainText("P2");
    expect(istekler.map((r) => r.url())).toEqual([]);

    const indirme = page.waitForEvent("download");
    await page.getByRole("button", { name: "Sonucu CSV olarak indir" }).click();
    const d = await indirme;
    expect(d.suggestedFilename()).toBe("ck-pc-sonucu.csv");
    const csv = readFileSync((await d.path()) ?? "", "utf8");
    expect(csv).toContain("ÇK2;1;5;63,3;%60,0");
    expect(csv).not.toMatch(/Deniz|2026900/u);
    expect(istekler.filter((r) => !r.url().startsWith("blob:")).map((r) => r.url())).toEqual([]);
  });

  test("Bologna: denetim, iş yükü ve hazır istem ağ isteği olmadan", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/deneyin#bologna");
    await expect(page.getByRole("tab", { name: "Bologna denetimi" })).toHaveAttribute("aria-selected", "true");
    const kutu = page.getByLabel("Ders bilgi paketi sayfası");
    await expect(kutu).toBeVisible();
    await page.waitForLoadState("networkidle");

    const istekler = istekleriTopla(page);
    await kutu.fill(BOLOGNA);
    await page.getByRole("button", { name: "Denetle" }).click();
    const sonuc = page.locator("[data-bologna-sonuc]");
    await expect(sonuc.getByRole("heading", { level: 3 })).toContainText("KRG101");
    await expect(sonuc.getByRole("row", { name: /Öğrenme çıktıları/u })).toContainText("Zayıf");
    await expect(sonuc.locator("[data-is-yuku]")).toContainText("Toplam 150 saat. 5 AKTS için hedef 5 x 30 = 150 saat");
    await page.getByRole("button", { name: "İstemi kopyala" }).click();
    await expect(page.getByText("İstem kopyalandı.")).toBeVisible();
    const pano = await page.evaluate(() => navigator.clipboard.readText());
    expect(pano).toContain("Uydurma yok.");
    expect(pano).toContain("Öğrenme çıktıları (zayıf)");
    expect(istekler.map((r) => r.url())).toEqual([]);
  });

  test("ölçüt arama: resmî kaynak, SHA-256 ve uzman onayı etiketi, ağ isteği olmadan", async ({ page }) => {
    await page.goto("/deneyin");
    await page.getByRole("tab", { name: "Ölçüt arama" }).click();
    const sorgu = page.getByLabel("Sözcük ya da kod");
    await expect(sorgu).toBeVisible();
    await page.waitForLoadState("networkidle");

    const istekler = istekleriTopla(page);
    await sorgu.fill("B.1.1");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await page.getByRole("button", { name: /^B\.1\.1 / }).click();
    const ayrinti = page.locator("[data-olcut-ayrinti]");
    await expect(ayrinti).toBeFocused();
    await expect(ayrinti).toContainText("Uzman onayı bekliyor");
    await expect(ayrinti).toContainText(/Dosya özeti \(SHA-256\): [0-9a-f]{64}/u);
    await expect(ayrinti.getByRole("link")).toHaveAttribute("href", /^https:\/\/www\.yokak\.gov\.tr\//u);

    await page.getByLabel("Çerçeve").selectOption("sabak-genel");
    await sorgu.fill("program");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await expect(page.getByText(/ölçüt bulundu\./u)).toBeVisible();
    expect(istekler.map((r) => r.url())).toEqual([]);
  });

  test("sekmeler klavyeyle gezilir; araçlar klavyeyle kullanılır", async ({ page }) => {
    await page.goto("/deneyin");
    const ck = page.getByRole("tab", { name: "ÇK/PÇ hesabı" });
    await ck.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Bologna denetimi" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Bologna denetimi" })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Ölçüt arama" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(ck).toBeFocused();
    await expect(page).toHaveURL(/#ck$/u);
    // Sekmeden panele: Tab ile tablo kutusu, örnek düğmesi; Enter ile çalışır.
    await page.getByRole("button", { name: "Örnek tabloyu koy" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Tabloyu oku" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-atilan]")).toContainText("5 öğrenci okundu.");
  });

  test("sonuçlarla birlikte WCAG 2.2 AA ihlali yok", async ({ page }) => {
    await page.goto("/deneyin");
    await page.getByRole("button", { name: "Örnek tabloyu koy" }).click();
    await page.getByRole("button", { name: "Tabloyu oku" }).click();
    await page.getByLabel("Ara Sınav (%)").fill("30");
    await page.getByLabel("Yarıyıl Sonu Sınavı (%)").fill("50");
    await page.getByLabel("Ödev (%)").fill("20");
    await page.getByRole("button", { name: "Hesapla" }).click();
    await expect(page.locator("[data-ck-sonuc]")).toBeVisible();
    const ihlal = async () =>
      (await new AxeBuilder({ page }).withTags(ETIKETLER).analyze()).violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
      );
    expect(await ihlal()).toEqual([]);
    await page.getByRole("tab", { name: "Bologna denetimi" }).click();
    await page.getByLabel("Ders bilgi paketi sayfası").fill(BOLOGNA);
    await page.getByRole("button", { name: "Denetle" }).click();
    await expect(page.locator("[data-bologna-sonuc]")).toBeVisible();
    expect(await ihlal()).toEqual([]);
    await page.getByRole("tab", { name: "Ölçüt arama" }).click();
    await page.getByLabel("Sözcük ya da kod").fill("B.1.1");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await page.getByRole("button", { name: /^B\.1\.1 / }).click();
    await expect(page.locator("[data-olcut-ayrinti]")).toBeVisible();
    expect(await ihlal()).toEqual([]);
  });

  test("375 piksel telefonda taşma yok", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/deneyin");
    await page.getByRole("button", { name: "Örnek tabloyu koy" }).click();
    await page.getByRole("button", { name: "Tabloyu oku" }).click();
    await page.getByLabel("Ara Sınav (%)").fill("30");
    await page.getByLabel("Yarıyıl Sonu Sınavı (%)").fill("50");
    await page.getByLabel("Ödev (%)").fill("20");
    await page.getByRole("button", { name: "Hesapla" }).click();
    await expect(page.locator("[data-ck-sonuc]")).toBeVisible();
    const tasma = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await tasma()).toBeLessThanOrEqual(0);
    await page.getByRole("tab", { name: "Bologna denetimi" }).click();
    await page.getByLabel("Ders bilgi paketi sayfası").fill(BOLOGNA);
    await page.getByRole("button", { name: "Denetle" }).click();
    await expect(page.locator("[data-bologna-sonuc]")).toBeVisible();
    expect(await tasma()).toBeLessThanOrEqual(0);
    await page.getByRole("tab", { name: "Ölçüt arama" }).click();
    await page.getByLabel("Sözcük ya da kod").fill("B.1.1");
    await page.getByRole("button", { name: "Ara", exact: true }).click();
    await page.getByRole("button", { name: /^B\.1\.1 / }).click();
    await expect(page.locator("[data-olcut-ayrinti]")).toBeVisible();
    expect(await tasma()).toBeLessThanOrEqual(0);
  });
});

test.describe("deneyin kurum demosu", () => {
  test("ana sayfada yalnız demo askı notu; proje ayrıntılarında araçlar çalışıyor, demo askıda", async ({ page }) => {
    await page.goto("/");
    // Kurucu kararı (06.11.2026): ana sayfa araçlara bağlanmaz, yalnız demonun askıda olduğunu söyler.
    await expect(page.locator('main a[href="/deneyin"]')).toHaveCount(0);
    await expect(page.locator('main a[href="/deneyin#kurum-demosu"]')).toHaveCount(1);
    await page.goto("/proje");
    await expect(page.locator('[data-proje-sayfasi="/deneyin"] [data-durum]')).toHaveText("Çalışıyor");
    // Bu sunucuda barındırma açık: askıdaki satır "bu kurulumda açık" görünür. akredit.org'daki "Askıda" durumu
    // src/site/site.test.ts'te sınanır.
    await expect(page.locator('[data-proje-sayfasi="/deneyin#kurum-demosu"]')).toContainText(
      "Demo: Örnek Üniversitesi",
    );
    await page.goto("/deneyin");
    const serit = page.locator("[data-sayfa-durumu]");
    await expect(serit.locator("[data-durum]")).toHaveText("Çalışıyor");
    await expect(page.locator("[data-demo-notu]")).toContainText(
      "Demo hazır ve çalışır durumda, ancak askıda: sunucu ve yapay zekâ maliyeti var. Bu masrafı karşılayacak sponsor aranıyor.",
    );
  });

  test("proje ayrıntılarından rol seçerek panele, şerit ve rehber turuyla", async ({ page }) => {
    await page.goto("/proje");
    await page.getByRole("link", { name: "Demo: Örnek Üniversitesi" }).click();
    await expect(page).toHaveURL(/\/deneyin#kurum-demosu$/u);
    // Örnek veri derlemesinde oturum açılır: rol düğmeleri görünür, kapalı bölüm notu yok.
    await expect(page.locator("[data-demo-kapali]")).toHaveCount(0);
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
  });
});
