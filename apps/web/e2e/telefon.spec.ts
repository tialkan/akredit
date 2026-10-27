import AxeBuilder from "@axe-core/playwright";
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

// --- İP-33: mobil onay ve bildirim ---

test("telefonda bildirim izni reddedilince e-posta yolu gösterilir", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { get: () => "denied" });
  });
  await page.goto("/panel/onaylar");
  const kutu = page.getByRole("region", { name: "Bildirimler" });
  await expect(kutu).toHaveAttribute("data-bildirim-yolu", "eposta");
  await expect(kutu).toContainText("Bildirim izni verilmedi");
  await expect(kutu).toContainText("e-posta özetiyle");
  await expect(kutu.getByRole("button", { name: "Bildirimleri aç" })).toHaveCount(0);
});

test("telefonda bildirim desteklenmezse e-posta yolu gösterilir", async ({ page }) => {
  await page.addInitScript(() => {
    // @ts-expect-error: desteklemeyen tarayıcıyı öykünmek için kaldırılır
    delete window.Notification;
  });
  await page.goto("/panel/onaylar");
  await expect(page.getByRole("region", { name: "Bildirimler" })).toContainText("desteklemiyor");
});

test("tek elle karar çubuğu: düşük risk onaylanır, yüksek risk çubuktan onaylanmaz", async ({ page }) => {
  await page.goto("/panel/onaylar");
  await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
  const cubuk = page.getByRole("region", { name: "Hızlı karar" });
  await expect(cubuk).toBeVisible();
  // Başparmak bölgesi: çubuk ekranın alt kenarında, düğmeler en az 44 px.
  const kutu = await cubuk.boundingBox();
  expect((kutu?.y ?? 0) + (kutu?.height ?? 0)).toBeGreaterThan(700);
  for (const d of await cubuk.getByRole("button").all())
    expect((await d.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

  // Liste yüksek riskle başlar: çubukta "Onayla" yok, "Kanıtı gör" kartı açar, sayı değişmez.
  await expect(cubuk).toContainText("Yüksek");
  await expect(cubuk.getByRole("button", { name: "Onayla" })).toHaveCount(0);
  await cubuk.getByRole("button", { name: "Kanıtı gör" }).tap();
  await expect(page.getByText("54 öneri bekliyor")).toBeVisible();
  await expect(page.locator("article:focus")).toHaveCount(1);

  // Yüksek riskli grupta seçim kutusu yoktur (toplu onay kapalı).
  await expect(page.locator("section[aria-labelledby=grup-yuksek] input[type=checkbox]")).toHaveCount(0);

  // Düşük riskli öneriye git ve çubuktan onayla.
  const dusuk = page.locator("section[aria-labelledby=grup-dusuk] article").first();
  await dusuk.focus();
  await expect(cubuk).toContainText("Düşük");
  await cubuk.getByRole("button", { name: "Onayla" }).tap();
  await expect(page.getByText("53 öneri bekliyor")).toBeVisible();
});

test("telefonda yüksek riskli öneri toplu seçilemez", async ({ page }) => {
  await page.goto("/panel/onaylar");
  await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
  const yuksek = page.locator("section[aria-labelledby=grup-yuksek]");
  await expect(yuksek.getByRole("checkbox")).toHaveCount(0);
  await expect(yuksek.getByRole("button", { name: /Seçilenleri onayla/ })).toHaveCount(0);
  // Klavye/erişilebilirlik kısayolu ("x") da yüksek riski seçmez.
  await yuksek.locator("article").first().focus();
  await page.keyboard.press("x");
  await expect(page.getByText(/öneri seçili/)).toHaveCount(0);
});

test("çevrim dışıyken liste görünür, karar verilemez", async ({ page, context }) => {
  await page.goto("/panel/onaylar");
  await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
  // Servis çalışanı etkinleşip sayfayı denetlesin, sonra liste önbelleğe girsin diye bir kez yenilenir.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
  await context.setOffline(true);
  await expect(page.getByText("Bağlantı yok. Son kaydedilen liste")).toBeVisible();
  const cubuk = page.getByRole("region", { name: "Hızlı karar" });
  await expect(cubuk.getByRole("button", { name: "Reddet" })).toBeDisabled();
  await page.locator("article").first().getByRole("button", { name: "Onayla" }).tap();
  await expect(page.getByText(/Karar bağlantı gelince verilebilir/).first()).toBeVisible();
  await expect(page.getByText("54 öneri bekliyor")).toBeVisible();
  // Çevrim dışı yeniden açılış: onay listesi önbellekten gelir.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Onay kutusu");
  await context.setOffline(false);
});

test("PWA bildirimi ve servis çalışanı onay kutusuyla sınırlı", async ({ page, request }) => {
  const m = await (await request.get("/panel/onaylar/manifest.webmanifest")).json();
  expect(m.scope).toBe("/panel/onaylar");
  const sw = await request.get("/panel/onaylar/sw.js");
  expect(sw.headers()["service-worker-allowed"]).toBe("/panel/onaylar");
  await page.goto("/panel/onaylar");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/panel/onaylar/manifest.webmanifest");
  const kapsam = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(new URL(kapsam).pathname).toBe("/panel/onaylar");
});

for (const tema of ["light", "dark"] as const) {
  test(`telefonda onay kutusu WCAG 2.2 AA (${tema})`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/panel/onaylar");
    await expect(page.locator("[data-hazir=evet]")).toHaveCount(1);
    await expect(page.getByRole("region", { name: "Bildirimler" })).toBeVisible();
    const sonuc = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
      .analyze();
    expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
}

test("telefonda panel menüsü açılır", async ({ page }) => {
  await page.goto("/panel");
  const menu = page.getByRole("navigation", { name: "Panel menüsü" });
  await menu.getByRole("button", { name: "Menü" }).tap();
  await menu.getByRole("link", { name: /^Kanıtlar/ }).tap();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kanıtlar");
});
