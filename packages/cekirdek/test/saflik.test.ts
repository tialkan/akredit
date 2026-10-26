import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Çekirdek IO yapmaz: zaman, rastgelelik ve ağ parametre olarak gelir.
const kok = new URL("../src", import.meta.url).pathname;
const dosyalar = (readdirSync(kok, { recursive: true }) as string[]).filter((d) => d.endsWith(".ts"));
const YASAK: [string, RegExp][] = [
  ["node:fs", /node:fs/],
  ["node:net", /node:net/],
  ["fetch", /\bfetch\s*\(/],
  ["Date.now()", /Date\.now\s*\(/],
  ["Math.random()", /Math\.random\s*\(/],
];

describe("saflık", () => {
  it("src altında dosya var", () => {
    expect(dosyalar.length).toBeGreaterThan(5);
  });
  for (const d of dosyalar) {
    it(`${d} yasak çağrı içermez`, () => {
      const metin = readFileSync(join(kok, d), "utf8");
      const bulunan = YASAK.filter(([, re]) => re.test(metin)).map(([ad]) => ad);
      expect(bulunan).toEqual([]);
    });
  }
});
