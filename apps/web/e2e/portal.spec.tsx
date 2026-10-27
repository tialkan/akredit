// Değerlendirici portalının dolu hâli. Portal örnek veri kipinde kapalıdır (kişiye özel kayıt ister); bu yüzden
// sayfaların görünüm bileşenleri burada uydurma veriyle sunucuda çizilir ve gerçek portal yerleşiminin
// (başlık, menü, stiller, tema) içine yerleştirilip axe ile denetlenir. Bütün ad ve metinler uydurmadır.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ErisimGunluguGorunumu,
  KanitGorunumu,
  KanitOdasiGorunumu,
} from "../src/app/degerlendirici/_portal/gorunum.tsx";
import { SoruFormu } from "../src/app/degerlendirici/soru/soru-formu.tsx";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

const ODA = (
  <KanitOdasiGorunumu
    erisimBitis="2026-11-30T21:00:00Z"
    program={[
      { tarih: "2026-11-10", saat: "09.30", etkinlik: "Açılış toplantısı", yer: "Senato salonu" },
      { tarih: "2026-11-11", etkinlik: "Öğrencilerle görüşme" },
    ]}
    filtre={{ arama: "anket" }}
    gruplar={[
      {
        olcut: "Ö-1",
        kanitlar: [
          { id: "k1", baslik: "Öğrenci memnuniyet anketi 2025", dosyaAdi: "anket.pdf", belgeTarihi: "2025-06-01" },
        ],
      },
      {
        olcut: null,
        kanitlar: [{ id: "k2", baslik: "Toplantı tutanağı", dosyaAdi: "tutanak.docx", belgeTarihi: null }],
      },
    ]}
  />
);

const KANIT = (
  <KanitGorunumu
    kanit={{ baslik: "Öğrenci memnuniyet anketi 2025", dosyaAdi: "anket.pdf", ozet: "a".repeat(64), olcutler: ["Ö-1"] }}
    parcalar={[
      { id: "p1", sira: 0, metin: "Anket 412 öğrenciye uygulandı.", capa: { sayfa: 2 } },
      { id: "p2", sira: 1, metin: "Sonuçlar kurulda görüşüldü.", capa: {} },
    ]}
  />
);

const GUNLUK = (
  <ErisimGunluguGorunumu
    kayitlar={[
      {
        id: "g1",
        zaman: "2026-10-27T09:00:00.000Z",
        kisiAdi: "Deneme Değerlendirici",
        islem: "Kanıt görüntüledi",
        ayrinti: "Kanıt aaaaaaaa",
      },
      { id: "g2", zaman: "2026-10-27T09:05:00.000Z", kisiAdi: null, islem: "Soru sordu", ayrinti: "Soru: Anket?" },
    ]}
  />
);

const DURUMLAR: [string, ReactElement][] = [
  ["kanıt odası", ODA],
  ["kanıt görüntüleyici", KANIT],
  ["soru formu", <SoruFormu key="soru" />],
  ["erişim günlüğü", GUNLUK],
];

/** Portal yerleşimini açar, ana içeriği verilen görünümle değiştirir. */
async function ciz(page: Page, oge: ReactElement) {
  await page.goto("/degerlendirici");
  const html = renderToStaticMarkup(oge);
  await page.locator("main#icerik").evaluate((m, h) => {
    m.innerHTML = h;
  }, html);
}

for (const tema of ["light", "dark"] as const) {
  test.describe(`portal dolu hâli (${tema === "light" ? "açık" : "koyu"} tema)`, () => {
    test.use({ colorScheme: tema });
    // axe büyük sayfalarda (onay kutusu ~5000 öğe) tek başına ~10 sn sürer; paralel koşuda pay bırakılır.
    test.describe.configure({ timeout: 90_000 });
    for (const [ad, oge] of DURUMLAR) {
      test(`${ad} WCAG 2.2 AA ihlali içermez`, async ({ page }) => {
        await ciz(page, oge);
        await expect(page.locator("main h1, main label").first()).toBeVisible();
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

test("portal: kanıt odası klavyeyle gezilir, menüde bulunulan sayfa bildirilir", async ({ page }) => {
  await ciz(page, ODA);
  await expect(page.getByRole("link", { name: "Kanıt odası" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("search")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("2 kanıt, 2 ölçüt altında.");
  // Sekme sırası: içeriğe geç → logo → menü → arama alanları → düğme → kanıt bağlantıları.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "İçeriğe geç" })).toBeFocused();
  const sira: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    sira.push(
      await page.evaluate(() => {
        const e = document.activeElement as HTMLElement | null;
        return e?.getAttribute("aria-label") || e?.getAttribute("name") || e?.textContent?.trim() || "";
      }),
    );
  }
  expect(sira).toEqual([
    "Akredit ana sayfa",
    "Kanıt odası",
    "Soru sor",
    "arama",
    "olcut",
    "Süz",
    "Öğrenci memnuniyet anketi 2025",
    "Toplantı tutanağı",
  ]);
  // Odak her öğede görünür (WCAG 2.4.7): odak halkası çizilir.
  const halka = await page.evaluate(() => getComputedStyle(document.activeElement as Element).outlineStyle);
  expect(halka).not.toBe("none");
});

test("portal: kanıt görüntüleyicide başlık düzeni ve konum bilgisi okunur", async ({ page }) => {
  await ciz(page, KANIT);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Öğrenci memnuniyet anketi 2025");
  await expect(page.getByRole("heading", { level: 2, name: "Belge metni" })).toBeAttached();
  await expect(page.getByRole("navigation", { name: "Kırıntı yolu" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "412" })).toContainText("Sayfa 2");
});

test("portal: erişim günlüğü tablosu başlıklı ve zamanlar makinece okunur", async ({ page }) => {
  await ciz(page, GUNLUK);
  await expect(page.getByRole("table", { name: "Değerlendirici erişim kayıtları, en yeni önce" })).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(4);
  await expect(page.locator("time[datetime='2026-10-27T09:00:00.000Z']")).toBeVisible();
});
