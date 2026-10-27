import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SAYFALAR } from "./sayfalar.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

for (const tema of ["light", "dark"] as const) {
  test.describe(`axe (${tema === "light" ? "açık" : "koyu"} tema)`, () => {
    test.use({ colorScheme: tema });
    // axe büyük sayfalarda (onay kutusu ~5000 öğe) tek başına ~10 sn sürer; paralel koşuda pay bırakılır.
    test.describe.configure({ timeout: 90_000 });
    for (const yol of SAYFALAR) {
      // Kabul ölçütü "ciddi ihlal yok"; burada her düzeydeki WCAG 2.2 A/AA ihlali reddedilir.
      test(`${yol} WCAG 2.2 AA ihlali içermez`, async ({ page }) => {
        await page.goto(yol);
        await expect(page.locator("h1").first()).toBeVisible();
        const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
        expect(
          sonuc.violations.map(
            (v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
          ),
        ).toEqual([]);
      });
    }
  });
}
