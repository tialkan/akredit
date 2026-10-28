// Web kontrol listesinin (docs/tasarim/web-kontrol-listesi.md) otomatik denetimleri.
// Kullanıcıya görünen metnin tamamı src/ altındaki TS/TSX dosyalarında ve public/ altındaki metin
// dosyalarındadır. Bu test o dosyaları okur:
// - em dash (U+2014) yok (madde 33),
// - yasak kelimeler yok (madde 35),
// - kutu, kart ve menü öğelerinin solunda renkli dikey vurgu şeridi yok (kullanıcı kuralı),
// - koyu tema yok; color-scheme yalnız light.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const KOK = join(import.meta.dirname, "../..");

function dosyalar(dizin: string, uzantilar: RegExp): string[] {
  const sonuc: string[] = [];
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad);
    if (statSync(yol).isDirectory()) sonuc.push(...dosyalar(yol, uzantilar));
    else if (uzantilar.test(ad)) sonuc.push(yol);
  }
  return sonuc;
}

const KAYNAK = [
  ...dosyalar(join(KOK, "src"), /\.(tsx?|css)$/u).filter((d) => !d.endsWith("kurallar.test.ts")),
  ...dosyalar(join(KOK, "public"), /\.(txt|svg|webmanifest)$/u),
].map((d) => ({ ad: relative(KOK, d), metin: readFileSync(d, "utf8") }));

/** Madde 35: yasak ifadeler. Küçük harfe çevrilip Türkçe ekleri de yakalayacak biçimde aranır. */
export const YASAK_IFADELER = [
  "yenilikçi çözüm",
  "dijital dönüşüm yolculuğu",
  "sınırları zorluyoruz",
  "geleceği şekillendiriyoruz",
  "sinerji",
  "vizyoner",
  "kusursuz",
  "benzersiz deneyim",
  "bir sonraki seviye",
];

/** Sol vurgu şeridi: Tailwind border-l / border-s sınıfları, CSS border-left / border-inline-start, içe gölgeyle şerit. */
const SOL_SERIT = [
  /(?<![\w-])border-[ls](?:-[0-9]+|-\[[^\]]+\]|-[a-z][\w-]*)?(?![\w-])/u,
  /border-left/u,
  /border-inline-start/u,
  /shadow-\[inset_[0-9]+px_0/u,
  /inset\s+[0-9]+px\s+0\s+0/u,
];

function satirlar(metin: string, kosul: (s: string) => boolean): number[] {
  return metin.split("\n").flatMap((s, i) => (kosul(s) ? [i + 1] : []));
}

describe("kullanıcı metni", () => {
  it("taranan dosya kümesi boş değil (site ve panel)", () => {
    expect(KAYNAK.some((d) => d.ad.includes("(site)"))).toBe(true);
    expect(KAYNAK.some((d) => d.ad.includes("panel"))).toBe(true);
    expect(KAYNAK.some((d) => d.ad.endsWith("llms.txt"))).toBe(true);
  });

  it("em dash (—) hiçbir dosyada yok", () => {
    const bulunan = KAYNAK.flatMap((d) => satirlar(d.metin, (s) => s.includes("—")).map((n) => `${d.ad}:${n}`));
    expect(bulunan).toEqual([]);
  });

  it("yasak kelimeler yok", () => {
    const bulunan = KAYNAK.flatMap((d) => {
      const kucuk = d.metin.toLocaleLowerCase("tr");
      return YASAK_IFADELER.filter((y) => kucuk.includes(y)).map((y) => `${d.ad}: ${y}`);
    });
    expect(bulunan).toEqual([]);
  });

  it("emoji süsleme yok", () => {
    const bulunan = KAYNAK.flatMap((d) =>
      satirlar(d.metin, (s) => /\p{Extended_Pictographic}/u.test(s)).map((n) => `${d.ad}:${n}`),
    );
    expect(bulunan).toEqual([]);
  });
});

describe("görsel kurallar", () => {
  it("solda renkli dikey vurgu şeridi (border-left) kullanılmaz", () => {
    const bulunan = KAYNAK.filter((d) => /\.(tsx?|css)$/u.test(d.ad)).flatMap((d) =>
      satirlar(d.metin, (s) => SOL_SERIT.some((r) => r.test(s))).map((n) => `${d.ad}:${n}`),
    );
    expect(bulunan).toEqual([]);
  });

  it("şerit deseni gerçek örnekleri yakalar, zararsız sınıfları geçirir", () => {
    const yakalar = (s: string) => SOL_SERIT.some((r) => r.test(s));
    expect(yakalar('className="border-l-4 border-vurgu"')).toBe(true);
    expect(yakalar('className="border-l border-cizgi"')).toBe(true);
    expect(yakalar('className="border-s-2"')).toBe(true);
    expect(yakalar("border-left: 3px solid red;")).toBe(true);
    expect(yakalar("shadow-[inset_3px_0_0_var(--petrol)]")).toBe(true);
    expect(yakalar('className="border border-lacivert rounded-sm"')).toBe(false);
    expect(yakalar('className="border-b border-cizgi"')).toBe(false);
  });

  it("koyu tema yok, color-scheme yalnız light", () => {
    const css = readFileSync(join(KOK, "src/app/globals.css"), "utf8");
    expect(css).toMatch(/color-scheme:\s*light/u);
    // Favicon tarayıcı sekmesinin koyu çubuğuna uyum sağlar; bu sitenin teması değildir ve izinlidir.
    const bulunan = KAYNAK.filter((d) => !d.ad.endsWith("favicon.svg")).filter((d) =>
      /prefers-color-scheme:\s*dark|color-scheme:\s*dark|\.dark\b/u.test(d.metin),
    );
    expect(bulunan.map((d) => d.ad)).toEqual([]);
  });
});
