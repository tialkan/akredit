import { describe, expect, it } from "vitest";
import { uuidv7, uuidv7Zamani } from "../src/kimlik.ts";
import { degerOzeti, kanonikJson, ozetHesapla, ozetMi } from "../src/ozet.ts";

describe("kanonik JSON", () => {
  it("anahtarları sıralar, boşluk koymaz, undefined alanı atlar", () => {
    expect(kanonikJson({ b: 1, a: [true, null, "ş"], c: undefined, ä: { z: 1, y: 2 } })).toBe(
      '{"a":[true,null,"ş"],"b":1,"ä":{"y":2,"z":1}}',
    );
  });

  it("sayıları ECMAScript biçiminde yazar", () => {
    expect(kanonikJson([1, 1.5, -0, 1e21, 0.1])).toBe("[1,1.5,0,1e+21,0.1]");
  });

  it("JSON olmayan değerleri reddeder", () => {
    expect(() => kanonikJson({ a: Number.NaN })).toThrow(/sonlu olmayan/);
    expect(() => kanonikJson({ a: () => 1 })).toThrow(/function/);
    expect(() => kanonikJson(Symbol("x"))).toThrow();
  });

  it("aynı içerik farklı anahtar sırasıyla aynı özeti verir", () => {
    expect(degerOzeti({ x: 1, y: 2 })).toBe(degerOzeti({ y: 2, x: 1 }));
  });
});

describe("SHA-256 özeti", () => {
  it("bilinen değeri verir", () => {
    // echo -n "abc" | sha256sum
    expect(ozetHesapla("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(ozetHesapla(new TextEncoder().encode("abc"))).toBe(ozetHesapla("abc"));
    expect(ozetMi(ozetHesapla("abc"))).toBe(true);
    expect(ozetMi("ABC")).toBe(false);
  });
});

describe("UUID v7", () => {
  const rastgele = new Uint8Array([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88, 0x77, 0x66]);

  it("RFC 9562 biçimi, sürüm ve varyant bitleri doğru", () => {
    const u = uuidv7(1_700_000_000_000, rastgele);
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidv7Zamani(u)).toBe(1_700_000_000_000);
  });

  it("zamana göre sıralanır", () => {
    const a = uuidv7(1_000, rastgele);
    const b = uuidv7(2_000, new Uint8Array(10));
    expect(a < b).toBe(true);
  });

  it("geçersiz girdiyi reddeder", () => {
    expect(() => uuidv7(-1, rastgele)).toThrow(RangeError);
    expect(() => uuidv7(1, new Uint8Array(3))).toThrow(RangeError);
    expect(() => uuidv7Zamani("00000000-0000-4000-8000-000000000000")).toThrow(TypeError);
  });
});
