import { expect, test } from "@playwright/test";
import { SAYFALAR } from "./sayfalar.ts";

// Sitede kırık yer kalmasın (İP-49): SAYFALAR'daki her sayfa 200 döner; her sayfadaki her iç bağlantı 200 ya da
// sonunda 200 dönen bir yönlendirmedir. Bilinmeyen adres tasarıma uygun 404, kasıtlı hata tasarıma uygun 500,
// bakım sayfası 200 verir.

const ILETISIM = "https://www.linkedin.com/in/tialkan/";
const BILEREK_YOK = "/bulunamayan-sayfa";

test.describe("bağlantılar", () => {
  test.describe.configure({ timeout: 300_000 });

  test("her sayfa 200; her iç bağlantı 200 ya da beklenen yönlendirme", async ({ page, request }) => {
    const bakilan = new Map<string, number>();
    const kaynak = new Map<string, string>();
    for (const yol of SAYFALAR.filter((y) => y !== BILEREK_YOK)) {
      const y = await page.goto(yol);
      expect(y?.status(), yol).toBe(200);
      const hrefler = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href") ?? ""));
      for (const h of hrefler) {
        if (!h.startsWith("/") || h.startsWith("//")) continue;
        const temiz = h.split("#")[0] ?? "";
        if (!temiz || bakilan.has(temiz)) continue;
        bakilan.set(temiz, 0);
        kaynak.set(temiz, yol);
      }
    }
    expect(bakilan.size).toBeGreaterThan(20);
    const kirik: string[] = [];
    for (const yol of bakilan.keys()) {
      const ilk = await request.get(yol, { maxRedirects: 0 });
      let durum = ilk.status();
      if (durum >= 300 && durum < 400) {
        const son = await request.get(yol);
        durum = son.status();
      }
      bakilan.set(yol, durum);
      if (durum !== 200) kirik.push(`${yol} (${durum}, ${kaynak.get(yol)} sayfasında)`);
    }
    expect(kirik, "kırık iç bağlantılar").toEqual([]);
  });

  test("bilinmeyen adres: tasarıma uygun 404, ana sayfa ve LinkedIn bağlantısı", async ({ page }) => {
    const y = await page.goto(BILEREK_YOK);
    expect(y?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bu adreste sayfa yok");
    await expect(page.getByRole("link", { name: "İletişim: LinkedIn" })).toHaveAttribute("href", ILETISIM);
    await expect(page.getByRole("link", { name: "Ana sayfa" }).first()).toBeVisible();
  });

  test("beklenmeyen hata: tasarıma uygun 500, iç ayrıntı yok", async ({ page }) => {
    const y = await page.goto("/hata-denemesi");
    expect(y?.status()).toBe(500);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sayfa açılamadı");
    await expect(page.getByRole("button", { name: "Yeniden deneyin" })).toBeVisible();
    await expect(page.getByRole("link", { name: "İletişim: LinkedIn" })).toHaveAttribute("href", ILETISIM);
    await expect(page.locator("body")).not.toContainText("Kasıtlı test hatası");
  });

  test("bakım sayfası: ne oldu, ne yapılabilir, ana sayfa ve iletişim", async ({ page }) => {
    const y = await page.goto("/bakim");
    expect(y?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kısa bir bakım yapıyoruz");
    await expect(page.getByRole("link", { name: "Ana sayfaya dönün" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "İletişim: LinkedIn" })).toHaveAttribute("href", ILETISIM);
  });

  test("iletişim: proje sahibi ve LinkedIn; eski adres yok", async ({ page }) => {
    await page.goto("/iletisim");
    await expect(page.locator("main")).toContainText("Proje sahibi Tarık İsmet ALKAN. İletişim: iletisim@akredit.org ya da LinkedIn");
    await expect(page.locator("main").getByRole("link", { name: "LinkedIn" }).first()).toHaveAttribute(
      "href",
      ILETISIM,
    );
    for (const yol of ["/", "/iletisim", "/proje", "/deneyin", "/mcp-kullan"]) {
      await page.goto(yol);
      expect(await page.content(), yol).not.toContain("kulular.com.tr");
    }
  });
});
