import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SAYFALAR = [
  "/",
  "/nasil-calisir",
  "/guvenlik",
  "/kvkk",
  "/acik-kaynak",
  "/iletisim",
  "/giris",
  "/panel",
  "/panel/onaylar",
  "/panel/kanitlar",
  "/panel/kanitlar/kanit-01",
  "/panel/programlar/prog-bp",
  "/panel/dersler",
  "/panel/dersler/ders-bp101",
  "/panel/raporlar",
  "/panel/raporlar/rapor-odr",
  "/panel/surecler",
  "/panel/ayarlar",
];

for (const tema of ["light", "dark"] as const) {
  test.describe(`axe (${tema === "light" ? "açık" : "koyu"} tema)`, () => {
    test.use({ colorScheme: tema });
    for (const yol of SAYFALAR) {
      test(`${yol} ciddi ya da kritik ihlal içermez`, async ({ page }) => {
        await page.goto(yol);
        await expect(page.locator("h1")).toBeVisible();
        const sonuc = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const agir = sonuc.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(agir.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
          [],
        );
      });
    }
  });
}
