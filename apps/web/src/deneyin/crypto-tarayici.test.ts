import { createHash as nodeHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createHash } from "./crypto-tarayici.ts";

describe("tarayıcı SHA-256", () => {
  it("FIPS 180-4 örnekleri", () => {
    // NIST örnek değerleri: "" ve "abc".
    expect(createHash("sha256").update("").digest("hex")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(createHash("sha256").update("abc").digest("hex")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("blok sınırlarında ve Türkçe metinde Node ile aynı", () => {
    for (const n of [55, 56, 63, 64, 65, 119, 120, 1000]) {
      const m = "ğüşİçö".repeat(n).slice(0, n);
      expect(createHash("sha256").update(m).digest("hex"), String(n)).toBe(
        nodeHash("sha256").update(m).digest("hex"),
      );
    }
  });

  it("başka algoritma ya da kodlama hata verir", () => {
    expect(() => createHash("md5")).toThrow();
    expect(() => createHash("sha256").update("x").digest("base64")).toThrow();
  });
});
