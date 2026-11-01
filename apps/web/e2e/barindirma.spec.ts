// ADR 0008 uçtan uca: barındırma bayrağı kapalıyken (üretim varsayılanı) ana sayfa MCP'yi öne çıkarır ve durum
// notunu gösterir; kurum açma, pilot başvurusu ve giriş yeni kayıt almaz; demo ve /mcp çalışmaya devam eder.
// Bayrak açıkken aynı akışlar kurulum.spec.ts ve pilot.spec.ts'te ana sunucuda sınanır.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { KAPALI_ADRESI } from "./yardim/ortam.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

async function axe(page: Page) {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function durumNotuVar(page: Page) {
  const durum = page.getByRole("region", { name: "Durum" });
  await expect(durum).toBeVisible();
  await expect(durum).toContainText("Platform tamamlandı");
  await expect(durum).toContainText("sponsor bulunana kadar sunulmuyor");
  await expect(durum.getByRole("link", { name: "Sponsor olmak için iletişim" })).toHaveAttribute("href", "/iletisim");
}

test.describe("barındırma kapalı (varsayılan)", () => {
  test.use({ baseURL: KAPALI_ADRESI, viewport: { width: 1440, height: 900 } });

  test("ana sayfa: ilk ekranda MCP ve durum notu; başlıkta giriş ve kurum açma yok", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Akreditasyon ölçütleri ve denetimleri, kendi yapay zekânızda.",
    );
    const ilk = page.locator("main section").first();
    await expect(ilk.getByText("https://akredit.org/mcp", { exact: true })).toBeInViewport();
    await expect(ilk).toContainText("YÖKAK, MÜDEK, FEDEK, EPDAD ve SABAK");
    await expect(ilk.getByRole("link", { name: "Yapay zekânıza ekleyin" })).toHaveAttribute("href", "/mcp-kullan");
    await durumNotuVar(page);
    const ust = page.locator("header").first();
    await expect(ust.getByRole("link", { name: "Giriş", exact: true })).toHaveCount(0);
    await expect(ust.getByRole("link", { name: "Kurumunuzu açın" })).toHaveCount(0);
    await expect(ust.getByRole("link", { name: "Deneyin", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Pilot kurum/u })).toHaveCount(0);
    await axe(page);
  });

  test("kurum açma: form yok, durum ve sponsor çağrısı var", async ({ page }) => {
    await page.goto("/kurum-ac");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kurumunuzu açın");
    await expect(page.getByText("akredit.org'da kurum açma şu an kapalı.", { exact: false })).toBeVisible();
    await durumNotuVar(page);
    await expect(page.getByLabel("Kurumun adı")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Doğrulama bağlantısı gönder" })).toHaveCount(0);
    await axe(page);
    await page.goto("/kurum-ac/dogrula?b=abcdefghijklmnopqrstuvwxyz");
    await expect(page.getByText("Kurum açma şu an kapalı.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Kurumu aç" })).toHaveCount(0);
  });

  test("pilot: form yok, durum ve sponsor çağrısı var", async ({ page }) => {
    await page.goto("/pilot");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pilot uygulama");
    await expect(page.getByText("Pilot başvurusu şu an kapalı.", { exact: false })).toBeVisible();
    await durumNotuVar(page);
    await expect(page.getByLabel("Kurumun adı")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Başvuruyu gönder" })).toHaveCount(0);
    await axe(page);
  });

  test("giriş: form yok, durum var", async ({ page }) => {
    await page.goto("/giris");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Giriş");
    await durumNotuVar(page);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await axe(page);
  });

  test("yeni kayıt uçları 503 döner ve ne yapılacağını söyler", async ({ request }) => {
    for (const uc of ["/api/pilot", "/api/kurum-acilisi", "/api/kurum-acilisi/dogrula"]) {
      const y = await request.post(uc, { headers: { origin: KAPALI_ADRESI }, data: {} });
      expect(y.status(), uc).toBe(503);
      expect((await y.json()).hata, uc).toContain("iletişim sayfasına");
    }
  });

  test("demo etkilenmez: rol seçimi panele götürür", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Hesap açmadan deneyin" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hesap açmadan deneyin");
    await expect(page.getByRole("button", { name: "Öğretim elemanı olarak dene" })).toBeVisible();
  });

  test("MCP etkilenmez: araç listesi döner", async ({ request }) => {
    const y = await request.post("/mcp", {
      headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
      data: { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
    });
    expect(y.status()).toBe(200);
    const govde = await y.text();
    expect(govde).toContain('"tools"');
    expect(govde).toContain("Rapor dil denetimi");
  });
});
