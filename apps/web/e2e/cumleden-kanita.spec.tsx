// Cümleden kanıta tek tık (İP-44). Panel rapor sayfası örnek veriyle gerçek etkileşimle sınanır (tıklama,
// klavye, Esc, axe). PDF, DOCX ve XLSX vurgusu okuyucu bileşeninin uydurma veriyle sunucuda çizilmiş açık
// panel hâliyle denetlenir. Bütün ad ve metinler uydurmadır.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { renderToStaticMarkup } from "react-dom/server";
import { RaporOkuyucu } from "../src/app/panel/raporlar/okuyucu.tsx";
import { type OkuyucuKaniti, okuyucuModeli } from "../src/app/panel/raporlar/okuyucu-modeli.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

async function axeTemiz(page: Page) {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(
    sonuc.violations.map(
      (v) => `${v.impact} ${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
    ),
  ).toEqual([]);
}

test.describe.configure({ timeout: 90_000 });
test.use({ colorScheme: "light" });

test("panel raporu: cümle tıklanınca kanıt paneli açılır, ilgili sayfa vurgulanır, Esc kapatır", async ({ page }) => {
  await page.goto("/panel/raporlar/rapor-odr");
  const cumle = page.getByRole("button", { name: /Program çıktılarının gözden geçirilmesi/ });
  await cumle.click();
  const panel = page.getByRole("region", { name: "BP101 ders izlencesi" }).or(page.locator("#kanit-paneli section"));
  await expect(panel.first()).toBeVisible();
  await expect(page.locator("#kanit-paneli")).toContainText("İçerik özeti");
  await expect(page.locator("#kanit-paneli")).toContainText("Atıf verilen yer");
  await expect(page.locator("#kanit-paneli h2")).toBeFocused();
  await axeTemiz(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#kanit-paneli")).toHaveCount(0);
  await expect(cumle).toBeFocused();
});

test("panel raporu: kanıtsız cümle ayrı işaretli, klavyeyle cümleler arasında gezilir", async ({ page }) => {
  await page.goto("/panel/raporlar/rapor-odr");
  const eksik = page.getByRole("button", { name: /izleme kaydı bulunamadı/ });
  await expect(eksik).toContainText("(kanıt yok)");
  const ilk = page.getByRole("button", { name: /Program çıktılarının gözden geçirilmesi/ });
  await ilk.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Birim kalite komisyonu/ })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(eksik).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#kanit-paneli h2")).toHaveText("Bu cümlenin kanıtı yok");
});

// ---------------------------------------------------------------- biçimlere göre vurgu (uydurma veri)

const KANITLAR: OkuyucuKaniti[] = [
  {
    id: "k-pdf",
    baslik: "Kurul tutanağı",
    dosyaAdi: "tutanak.pdf",
    ozet: `aa11bb22${"0".repeat(56)}`,
    parcalar: [1, 2, 3].map((s) => ({
      id: `pdf-${s}`,
      sira: s - 1,
      metin: `Tutanak sayfa ${s} metni.`,
      capa: { sayfa: s },
    })),
    onay: { sonuc: "onaylandi", kisi: "Deneme Komisyon Üyesi", zaman: "2026-10-01T09:00:00.000Z", dayanak: "dogrudan" },
  },
  {
    id: "k-docx",
    baslik: "Öz değerlendirme notu",
    dosyaAdi: "not.docx",
    ozet: `ee55ff66${"0".repeat(56)}`,
    parcalar: [
      { id: "docx-1", sira: 0, metin: "Giriş metni.", capa: { bolum: "1 Giriş" } },
      { id: "docx-2", sira: 1, metin: "Yöntem bölümünün metni.", capa: { bolum: "2.1" } },
    ],
    onay: null,
  },
  {
    id: "k-xlsx",
    baslik: "Not çizelgesi",
    dosyaAdi: "notlar.xlsx",
    ozet: `cc33dd44${"0".repeat(56)}`,
    parcalar: [
      { id: "xlsx-1", sira: 0, metin: "Notlar\nNo | Not\n1 | 70\n2 | 85\n3 | 90", capa: { hucre: "Notlar!A3:B5" } },
    ],
    onay: null,
  },
];

const BOLUMLER = okuyucuModeli(
  [
    {
      id: "b1",
      baslik: "Deneme bölümü",
      olcut: "A.1",
      paragraflar: [
        {
          metin:
            "Kurul toplandı [K:aa11bb22 s. 2]. Yöntem yazıldı [K:ee55ff66 b.2.1]. Notlar girildi [K:cc33dd44 h.Notlar!B4].",
          atiflar: [{ kanitId: "k-pdf" }, { kanitId: "k-docx" }, { kanitId: "k-xlsx" }],
        },
      ],
    },
  ],
  KANITLAR,
);

async function acikCiz(page: Page, cumleId: string) {
  await page.goto("/panel/raporlar/rapor-odr");
  const html = renderToStaticMarkup(<RaporOkuyucu bolumler={BOLUMLER} kanitlar={KANITLAR} ilkAcik={cumleId} />);
  await page.locator("main#icerik").evaluate((m, h) => {
    m.innerHTML = h;
  }, html);
}

const DURUMLAR: [string, string, string, string][] = [
  ["PDF sayfası", "b1-p1-c1", "#parca-pdf-2", "Tutanak sayfa 2 metni."],
  ["DOCX bölümü", "b1-p1-c2", "#parca-docx-2", "Yöntem bölümünün metni."],
  ["XLSX satırı", "b1-p1-c3", "#parca-xlsx-1 mark", "2 | 85"],
];

for (const [ad, cumle, secici, metin] of DURUMLAR) {
  test(`kanıt paneli: ${ad} vurgulanır, özet ve onay bilgisi görünür, axe temiz`, async ({ page }) => {
    await acikCiz(page, cumle);
    const panel = page.locator("#kanit-paneli");
    await expect(panel).toContainText("İçerik özeti");
    await expect(panel.locator(secici)).toContainText(metin);
    await expect(panel.locator(secici.replace(/ mark$/u, ""))).toContainText("Atıf verilen yer");
    // Vurgulanmayan parçalar "Atıf verilen yer" taşımaz.
    await expect(panel.getByText("Atıf verilen yer")).toHaveCount(1);
    if (ad === "PDF sayfası") await expect(panel).toContainText("Deneme Komisyon Üyesi");
    await axeTemiz(page);
  });
}
