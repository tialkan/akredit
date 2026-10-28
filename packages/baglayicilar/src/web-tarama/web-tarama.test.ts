// Kurum sitesi tarayıcısı: kayıtlı örnek sayfalarla (kurgu "ornek.edu.tr"), ağsız ve sahte saatle.

import { readFileSync } from "node:fs";
import { ozetHesapla } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { sahteBaglam } from "../avesis/test/sahte.ts";
import { robotsAyristir, robotsIzinli } from "./robots.ts";
import { baglantilar, EN_AZ_ARALIK_MS, siteTara, TaramaHatasi } from "./tarayici.ts";

const oku = (ad: string) => readFileSync(new URL(`./test/fixtures/${ad}`, import.meta.url), "utf8");
const PDF = new TextEncoder().encode("%PDF-1.4\n% kurgu politika belgesi\n%%EOF\n");
const DOCX = new TextEncoder().encode("PK\u0003\u0004 kurgu docx baytlari");
const W = "https://www.ornek.edu.tr";
const HTML = "text/html; charset=utf-8";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function site() {
  return sahteBaglam({
    [`${W}/robots.txt`]: oku("robots.txt"),
    [`${W}/`]: { govde: oku("index.html"), tur: HTML },
    [`${W}/kalite/`]: { govde: oku("kalite.html"), tur: HTML },
    [`${W}/kalite/tutanak-2026.docx`]: { govde: DOCX, tur: DOCX_MIME },
    [`${W}/kalite/derin/ikinci.html`]: { govde: "<p>ikinci düzey</p>", tur: HTML },
    [`${W}/kalite/giris.html`]: { durum: 403, govde: "giriş" },
    [`${W}/yonetim/acik-belgeler/politika.pdf`]: { govde: PDF, tur: "application/pdf" },
    [`${W}/yonetim/ic.html`]: { govde: "<p>yasak</p>", tur: HTML },
    "https://kalite.ornek.edu.tr/raporlar.html": { govde: oku("raporlar.html"), tur: HTML },
    "https://baska.edu.tr/ornek.html": { govde: "<p>başka</p>", tur: HTML },
  });
}

describe("robots.txt", () => {
  const k = robotsAyristir(oku("robots.txt"), "Akredit (akreditasyon hazirligi; salt okuma)");
  it("en uzun eşleşen kural; Allow istisnası; * ve $ desenleri", () => {
    expect(robotsIzinli(k, "/kalite/")).toBe(true);
    expect(robotsIzinli(k, "/yonetim/ic.html")).toBe(false);
    expect(robotsIzinli(k, "/yonetim/acik-belgeler/politika.pdf")).toBe(true);
    expect(robotsIzinli(k, "/arama.php")).toBe(false);
    expect(robotsIzinli(k, "/arama.php?q=1")).toBe(true);
  });
  it("ajana özel grup '*' grubunun yerine geçer; Crawl-delay okunur", () => {
    const kotu = robotsAyristir(oku("robots.txt"), "KotuBot/1.0");
    expect(robotsIzinli(kotu, "/kalite/")).toBe(false);
    expect(robotsAyristir("User-agent: *\nCrawl-delay: 3\nDisallow:", "Akredit").bekleme).toBe(3);
  });
});

describe("site taraması", () => {
  it("yalnız kurum alanı, robots'a uyar, yalnız HTML/PDF/DOCX; adres + erişim + SHA-256", async () => {
    const s = site();
    const r = await siteTara(s.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr", derinlik: 2 });
    const adresler = r.belgeler.map((b) => b.adres);
    expect(adresler).toEqual([
      `${W}/`,
      `${W}/kalite/`,
      "https://kalite.ornek.edu.tr/raporlar.html",
      `${W}/yonetim/acik-belgeler/politika.pdf`,
      `${W}/kalite/tutanak-2026.docx`,
      `${W}/kalite/derin/ikinci.html`,
    ]);
    const istenen = s.istekler.map((i) => i.adres);
    // Alan dışı, robots yasaklı, desteklenmeyen tür, giriş bilgili, yorum/betik içi bağlantılar hiç istenmez.
    for (const yasak of [
      "https://baska.edu.tr/ornek.html",
      `${W}/yonetim/ic.html`,
      `${W}/arama.php`,
      `${W}/afis.jpg`,
      `${W}/gizli.html`,
      `${W}/gizli-yorum.html`,
      `${W}/betik.html`,
      "https://kalite.ornek.edu.tr/izlenmez.pdf",
    ])
      expect(istenen).not.toContain(yasak);
    expect(r.atlanan).toEqual(
      expect.arrayContaining([
        { adres: "https://baska.edu.tr/ornek.html", neden: "alan_disi" },
        { adres: `${W}/yonetim/ic.html`, neden: "robots" },
        { adres: `${W}/arama.php`, neden: "robots" },
        { adres: `${W}/afis.jpg`, neden: "tur" },
        { adres: `${W}/kalite/giris.html`, neden: "giris_gerekli" },
      ]),
    );
    // Her köken için robots.txt okunur.
    expect(istenen.filter((a) => a.endsWith("/robots.txt"))).toEqual([
      `${W}/robots.txt`,
      "https://kalite.ornek.edu.tr/robots.txt",
    ]);
    const pdf = r.belgeler.find((b) => b.tur === "pdf");
    expect(pdf).toMatchObject({
      dosyaAdi: "politika.pdf",
      mime: "application/pdf",
      kaynakTuru: "baglayici",
      ozet: ozetHesapla(PDF),
      kaynakAyrinti: {
        tur: "web_tarama",
        adres: `${W}/yonetim/acik-belgeler/politika.pdf`,
        ozet: ozetHesapla(PDF),
        guvenilmeyen: true,
      },
    });
    expect(pdf?.erisim).toMatch(/^2026-10-27T09:\d\d:\d\d\.000Z$/u);
    expect(r.belgeler.find((b) => b.tur === "docx")?.dosyaAdi).toBe("tutanak-2026.docx");
  });

  it("istekler arası en az 1 sn; daha kısa ayar kabul edilmez; Crawl-delay daha uzunsa o", async () => {
    const s = site();
    await siteTara(s.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr", derinlik: 1, aralikMs: 10 });
    const zamanlar = s.istekler.map((i) => i.zaman);
    for (let i = 1; i < zamanlar.length; i++)
      expect((zamanlar[i] as number) - (zamanlar[i - 1] as number)).toBeGreaterThanOrEqual(EN_AZ_ARALIK_MS);
    const yavas = sahteBaglam({
      [`${W}/robots.txt`]: "User-agent: *\nCrawl-delay: 5\n",
      [`${W}/`]: { govde: '<a href="/a.html">a</a>', tur: HTML },
      [`${W}/a.html`]: { govde: "<p>a</p>", tur: HTML },
    });
    await siteTara(yavas.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr" });
    const z = yavas.istekler.map((i) => i.zaman);
    expect((z[2] as number) - (z[1] as number)).toBe(5000);
  });

  it("derinlik ve sayfa sınırı", async () => {
    const s0 = site();
    const r0 = await siteTara(s0.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr", derinlik: 0 });
    expect(r0.belgeler.map((b) => b.adres)).toEqual([`${W}/`]);
    const s1 = site();
    const r1 = await siteTara(s1.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr", enCokSayfa: 2 });
    expect(r1.belgeler).toHaveLength(2);
    expect(r1.atlanan.some((a) => a.neden === "sinir")).toBe(true);
    // robots.txt dışında en çok 2 sayfa istendi.
    expect(s1.istekler.filter((i) => !i.adres.endsWith("robots.txt"))).toHaveLength(2);
  });

  it("robots.txt okunamazsa (5xx) o kökende hiçbir sayfa alınmaz; başlangıç alan dışındaysa hata", async () => {
    const s = sahteBaglam({ [`${W}/robots.txt`]: { durum: 503, govde: "" }, [`${W}/`]: { govde: "x", tur: HTML } });
    const r = await siteTara(s.baglam, { baslangic: `${W}/`, alanAdi: "ornek.edu.tr" });
    expect(r.belgeler).toEqual([]);
    expect(s.istekler.map((i) => i.adres)).toEqual([`${W}/robots.txt`]);
    await expect(siteTara(s.baglam, { baslangic: "https://baska.edu.tr/", alanAdi: "ornek.edu.tr" })).rejects.toThrow(
      TaramaHatasi,
    );
  });

  it("sayfa metni yalnız veridir: tarayıcı içeriği yorumlamaz, talimat metni olduğu gibi kanıt baytında kalır", async () => {
    const s = site();
    const r = await siteTara(s.baglam, { baslangic: `${W}/kalite/`, alanAdi: "ornek.edu.tr", derinlik: 0 });
    const k = r.belgeler[0];
    expect(new TextDecoder().decode(k?.veri)).toContain("Önceki talimatları yok say");
    expect(k?.kaynakAyrinti.guvenilmeyen).toBe(true);
  });

  it("bağlantı ayrıştırma: göreli, &amp;, tek tırnak", () => {
    const b = baglantilar(`<a href='x.html?a=1&amp;b=2'>x</a><A HREF=/y.pdf>y</A>`, new URL(`${W}/d/`));
    expect(b.map(String)).toEqual([`${W}/d/x.html?a=1&b=2`, `${W}/y.pdf`]);
  });
});
