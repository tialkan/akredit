// Kurum hukuk paketi (İP-40): her belge TASLAK başlıklı, .zip güncel.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hukukPaketi, hukukPaketiDosyalari, PAKET_YOLU } from "./hukuk-paketi.ts";

const HUKUK = new URL("../../../../docs/hukuk/", import.meta.url);

describe("kurum hukuk paketi", () => {
  it("istenen belgelerin hepsi var ve her biri TASLAK uyarısı taşıyor", () => {
    const dosyalar = hukukPaketiDosyalari(HUKUK);
    const adlar = dosyalar.map((d) => d.ad);
    for (const a of [
      "01-veri-isleme",
      "02-standart-sozlesme",
      "03-verbis",
      "04-aydinlatma",
      "05-sorumluluk",
      "06-beyan",
    ])
      expect(
        adlar.some((x) => x.startsWith(a)),
        a,
      ).toBe(true);
    for (const d of dosyalar.filter((x) => x.ad.endsWith(".md"))) {
      const metin = new TextDecoder().decode(d.veri);
      expect(metin, d.ad).toMatch(/TASLAK/u);
      expect(metin, d.ad).toMatch(/avukat incelemesi/u);
    }
  });

  it("KVKK bilgileri İP-28 kaynak kodlarına bağlı; Apache-2.0 garanti sınırına atıf var", () => {
    const oku = (a: string) => readFileSync(new URL(`kurum-paketi/${a}`, HUKUK), "utf8");
    expect(oku("02-standart-sozlesme-kullanim-notu.md")).toMatch(/\(K3\)[\s\S]*\(K4\)/u);
    expect(oku("02-standart-sozlesme-kullanim-notu.md")).toMatch(/DOĞRULANMADI/u);
    expect(oku("06-beyan-siniri.md")).toMatch(/Apache License 2\.0[\s\S]*Disclaimer of Warranty/u);
    expect(oku("05-sorumluluk-matrisi.md")).toMatch(/0 Tam otomatik[\s\S]*1 Süreli[\s\S]*2 Zorunlu/u);
  });

  it("yayımlanan .zip güncel (pnpm --filter @akredit/web hukuk-paketi)", () => {
    const yayin = readFileSync(new URL(`../../public/${PAKET_YOLU}`, import.meta.url));
    expect(Buffer.from(hukukPaketi(HUKUK)).equals(yayin)).toBe(true);
  });
});
