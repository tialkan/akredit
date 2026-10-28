// İP-35 uçtan uca: "Kurumunuzu açın" → e-posta doğrulaması → giriş → kurulum sihirbazı (anahtar, yurt dışı
// kararı, Bologna'dan program, hoca daveti, çerçeve) → birim yönetimi. Gerçek arka uç (boş PGlite) ile çalışır.
// Sihirbaz ekranlarının 1440 px görüntüleri docs/marka/ altına yazılır.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { BOLOGNA_PORT, EPOSTA_DIZINI, KURULUM_ADRESI } from "./yardim/ortam.ts";

const ETIKETLER = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];
const MARKA = join(import.meta.dirname, "../../../docs/marka");

interface Ileti {
  alici: string;
  konu: string;
  metin: string;
}

async function iletiler(): Promise<Ileti[]> {
  const adlar = (await readdir(EPOSTA_DIZINI).catch(() => [] as string[])).sort();
  return Promise.all(adlar.map(async (a) => JSON.parse(await readFile(join(EPOSTA_DIZINI, a), "utf8")) as Ileti));
}

async function baglantiBekle(alici: string, konu: RegExp, kalip: RegExp): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const son = (await iletiler()).filter((x) => x.alici === alici && konu.test(x.konu)).at(-1);
    const b = son?.metin.match(kalip)?.[0];
    if (b) return b;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${alici} için e-posta gelmedi: ${konu}`);
}

async function axe(page: Page) {
  const sonuc = await new AxeBuilder({ page }).withTags(ETIKETLER).analyze();
  expect(sonuc.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function goruntu(page: Page, ad: string) {
  await page.screenshot({ path: join(MARKA, `${ad}-1440.png`), fullPage: true });
}

const YONETICI = "kurucu@uydurma-e2e.edu.tr";

test.describe("kurum açılışı → sihirbaz → davet", () => {
  test.describe.configure({ mode: "serial", timeout: 120_000 });
  test.use({ baseURL: KURULUM_ADRESI, viewport: { width: 1440, height: 900 } });

  test("uçtan uca", async ({ page }) => {
    // 1. Başvuru
    await page.goto("/kurum-ac");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kurumunuzu açın");
    await axe(page);
    await page.getByLabel("Kurumun adı").fill("Uydurma Uçtan Uca Üniversitesi");
    await page.getByLabel("Kurumsal e-posta alan adı").fill("uydurma-e2e.edu.tr");
    await page.getByLabel("İlk yöneticinin adı ve soyadı").fill("Deneme Kurucu");
    await page.getByLabel("İlk yöneticinin kurumsal e-postası").fill(YONETICI);
    await page.waitForTimeout(2100); // Bot denetimi: form en az 2 sn açık kalmalı.
    await page.getByRole("button", { name: "Doğrulama bağlantısı gönder" }).click();
    await expect(page.getByText("Doğrulama bağlantısı gönderildi.")).toBeVisible();
    await goruntu(page, "kurum-ac");

    // 2. Doğrulama
    const dogrula = await baglantiBekle(YONETICI, /kurum açılışını doğrulayın/u, /http\S+\/kurum-ac\/dogrula\?b=\S+/u);
    await page.goto(dogrula);
    await page.getByRole("button", { name: "Kurumu aç" }).click();
    await expect(page.getByText("Uydurma Uçtan Uca Üniversitesi açıldı.")).toBeVisible();

    // 3. Giriş bağlantısı sihirbaza götürür.
    const giris = await baglantiBekle(YONETICI, /giriş bağlantınız/u, /http\S+magic-link\/verify\S+/u);
    await page.goto(giris);
    await expect(page).toHaveURL(/\/kurulum$/u);
    await expect(page.getByRole("heading", { name: "Yapay zekâ anahtarı", level: 2 })).toBeVisible();
    await axe(page);
    await goruntu(page, "kurulum-1-anahtar");

    // (a) Anahtar: uydurma biçimde; bağlantı denenmez.
    await page.getByLabel("OpenRouter anahtarı").fill("sk-or-v1-uydurmaanahtar00000000000000e2e");
    await page.getByRole("button", { name: "Anahtarı kaydet ve devam et" }).click();

    // (b) Yurt dışı kararı
    await expect(page.getByRole("heading", { name: "Yurt dışı aktarım kararı", level: 2 })).toBeFocused();
    await expect(page.getByText(/maskesiz kişisel veri gönderilmez/u)).toBeVisible();
    await axe(page);
    await goruntu(page, "kurulum-2-yurt-disi");
    await page.getByLabel(/İzin vermiyorum/u).check();
    await page.getByLabel("İmza: adınız ve soyadınız").fill("Başka Ad");
    await page.getByRole("button", { name: "Kararı imzala ve devam et" }).click();
    await expect(page.getByText("İmza için adınızı hesabınızdaki gibi yazın.")).toBeVisible();
    await page.getByLabel("İmza: adınız ve soyadınız").fill("deneme kurucu");
    await page.getByRole("button", { name: "Kararı imzala ve devam et" }).click();

    // (c) Bologna'dan birim ve program
    await expect(page.getByRole("heading", { name: "Birim ve program", level: 2 })).toBeVisible();
    await page
      .getByLabel("Bologna program adresi")
      .fill(`http://127.0.0.1:${BOLOGNA_PORT}/oibs/bologna/index.aspx?lang=tr&curSunit=1`);
    await page.getByRole("button", { name: "Sayfaları oku" }).click();
    await expect(page.getByRole("heading", { name: "Öneri" })).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Yeni birimin adı").fill("Uydurma Hukuk Fakültesi");
    await page.getByLabel("Programın adı").fill("Uydurma Hukuk");
    await page.getByLabel("Düzey").selectOption("lisans");
    await axe(page);
    await goruntu(page, "kurulum-3-program");
    await page.getByRole("button", { name: "Öneriyi onayla ve kaydet" }).click();

    // (d) Davet: Bologna'daki ad öneri olarak gelir, e-postayı yönetici yazar.
    await expect(page.getByRole("heading", { name: "Hocaların daveti", level: 2 })).toBeVisible();
    const satir = page.getByRole("row", { name: /Kurgu ÖRNEKOĞLU/u });
    await expect(satir).toBeVisible();
    await expect(satir.getByRole("textbox")).toHaveValue("");
    await satir.getByRole("textbox").fill("kurgu@uydurma-e2e.edu.tr");
    await axe(page);
    await goruntu(page, "kurulum-4-davet");
    await page.getByRole("button", { name: "Davetleri gönder" }).click();
    await expect(page.getByText("1 davet gönderildi.", { exact: false })).toBeVisible();
    const davet = await baglantiBekle("kurgu@uydurma-e2e.edu.tr", /sizi davet ediyor/u, /http\S+\/davet\?b=\S+/u);
    expect(davet).toContain("/davet?b=");
    await page.getByRole("button", { name: "Devam et" }).click();

    // (e) Çerçeve
    await expect(page.getByRole("heading", { name: "Çerçeve", level: 2 })).toBeVisible();
    await page.getByLabel(/sürüm 3\.3/u).check();
    await axe(page);
    await goruntu(page, "kurulum-5-cerceve");
    await page.getByRole("button", { name: "Seçimi kaydet ve kurulumu bitir" }).click();
    await expect(page.getByText("Kurulum tamamlandı.")).toBeVisible();

    // Birim yönetimi: Bologna'dan gelen birim ve program listede; düzeltme geçmişe yazılır.
    await page.goto("/panel/birimler");
    await expect(page.getByRole("heading", { name: "Uydurma Hukuk Fakültesi" })).toBeVisible();
    await page.getByRole("button", { name: "Düzelt: Uydurma Hukuk", exact: true }).click();
    await page.getByLabel("Programın adı").first().fill("Uydurma Hukuk Programı");
    await page.getByRole("button", { name: "Düzeltmeyi kaydet" }).click();
    await expect(page.getByText(/Program düzeltildi/u)).toBeVisible();
    await page.getByRole("button", { name: "Geçmiş: Uydurma Hukuk Programı" }).click();
    await expect(page.getByText(/"Uydurma Hukuk" yerine "Uydurma Hukuk Programı"/u)).toBeVisible();
    await axe(page);
    await goruntu(page, "panel-birimler");
  });

  test("aynı alan adına ikinci kurum açılamaz", async ({ page }) => {
    await page.goto("/kurum-ac");
    await page.getByLabel("Kurumun adı").fill("İkinci Uydurma");
    await page.getByLabel("Kurumsal e-posta alan adı").fill("uydurma-e2e.edu.tr");
    await page.getByLabel("İlk yöneticinin adı ve soyadı").fill("Başka Kişi");
    await page.getByLabel("İlk yöneticinin kurumsal e-postası").fill("baska@uydurma-e2e.edu.tr");
    await page.waitForTimeout(2100);
    await page.getByRole("button", { name: "Doğrulama bağlantısı gönder" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Bu alan adıyla açılmış bir kurum var" })).toBeVisible();
  });
});
