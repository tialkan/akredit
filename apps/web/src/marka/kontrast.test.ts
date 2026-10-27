import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { belirtecleriOku, kontrastOrani } from "./kontrast.ts";

describe("kontrastOrani", () => {
  it("bilinen değerleri verir", () => {
    // Siyah/beyaz: (1 + 0.05) / (0 + 0.05) = 21.
    expect(kontrastOrani("#000000", "#ffffff")).toBeCloseTo(21, 5);
    // Aynı renk: 1.
    expect(kontrastOrani("#10325b", "#10325b")).toBe(1);
    // #767676 beyaz üstünde AA sınırındaki bilinen gri: L = 0.1812 → 1.05 / 0.2312 ≈ 4.54.
    expect(kontrastOrani("#767676", "#ffffff")).toBeCloseTo(4.54, 2);
  });
});

const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
const temalar = belirtecleriOku(css);

const ZEMINLER = ["zemin", "yuzey", "yuzey-2"];
/** [ön, arka, en düşük oran]. Metin 4.5:1 (1.4.3), metin dışı öğe 3:1 (1.4.11). */
const CIFTLER: [string, string, number][] = [
  ...["metin", "soluk", "vurgu", "petrol", "risk-dusuk", "risk-orta", "risk-yuksek"].flatMap((on) =>
    ZEMINLER.map((z): [string, string, number] => [on, z, 4.5]),
  ),
  ["vurgu-metin", "vurgu", 4.5],
  ["metin", "vurgu-zemin", 4.5],
  ["vurgu", "vurgu-zemin", 4.5],
  ["petrol", "petrol-zemin", 4.5],
  ["metin", "petrol-zemin", 4.5],
  ["risk-dusuk", "risk-dusuk-zemin", 4.5],
  ["risk-orta", "risk-orta-zemin", 4.5],
  ["risk-yuksek", "risk-yuksek-zemin", 4.5],
  ["metin", "isi-0", 4.5],
  ["metin", "isi-1", 4.5],
  ["metin", "isi-2", 4.5],
  ["metin", "isi-3", 4.5],
  ["isi-metin-koyu", "isi-4", 4.5],
  ["isi-metin-koyu", "isi-5", 4.5],
  ...ZEMINLER.map((z): [string, string, number] => ["odak", z, 3]),
  ...ZEMINLER.map((z): [string, string, number] => ["cizgi-guclu", z, 3]),
  // Odak çizgisi 2px dışarı kaydırılır (globals.css), bu yüzden düğme rengine değil çevresindeki zemine karşı ölçülür.
  ...ZEMINLER.map((z): [string, string, number] => ["isaret-a", z, 3]),
  ...ZEMINLER.map((z): [string, string, number] => ["isaret-onay", z, 3]),
];

describe.each(Object.entries(temalar))("%s tema", (_ad, renk) => {
  it.each(CIFTLER)("%s / %s ≥ %d", (on, arka, esik) => {
    const a = renk[on];
    const b = renk[arka];
    expect(a, `--${on} tanımlı değil`).toBeDefined();
    expect(b, `--${arka} tanımlı değil`).toBeDefined();
    expect(kontrastOrani(a as string, b as string)).toBeGreaterThanOrEqual(esik);
  });

  it("risk renkleri birbirinden ve vurgudan ayrışır", () => {
    const r = ["risk-dusuk", "risk-orta", "risk-yuksek", "vurgu"].map((k) => renk[k]);
    expect(new Set(r).size).toBe(4);
  });
});

describe("uygulama simgesi", () => {
  it("panel manifest simgesi marka dosyasıyla aynıdır", async () => {
    const { SIMGE_SVG } = await import("../app/panel/onaylar/mobil.ts");
    const dosya = readFileSync(join(import.meta.dirname, "../../public/marka/uygulama-simgesi.svg"), "utf8").trim();
    expect(SIMGE_SVG).toBe(dosya);
  });
});
