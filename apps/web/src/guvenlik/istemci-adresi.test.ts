import { describe, expect, it } from "vitest";
import { istemciAdresi } from "./istemci-adresi.ts";

const b = (h: Record<string, string>) => new Headers(h);

describe("istemciAdresi", () => {
  it("önce cf-connecting-ip, sonra x-real-ip, sonra x-forwarded-for", () => {
    const hepsi = {
      "cf-connecting-ip": "198.51.100.1",
      "x-real-ip": "198.51.100.2",
      "x-forwarded-for": "198.51.100.3",
    };
    expect(istemciAdresi(b(hepsi))).toBe("198.51.100.1");
    expect(istemciAdresi(b({ "x-real-ip": "198.51.100.2", "x-forwarded-for": "198.51.100.3" }))).toBe("198.51.100.2");
    expect(istemciAdresi(b({ "x-forwarded-for": "198.51.100.3" }))).toBe("198.51.100.3");
  });

  it("x-forwarded-for'un istemcinin yazdığı sahte ilk öğesini kullanmaz", () => {
    // İstemci "10.0.0.1" yazdı, vekil gerçek adresi (203.0.113.50) sona ekledi.
    expect(istemciAdresi(b({ "x-forwarded-for": "10.0.0.1, 203.0.113.50" }))).toBe("203.0.113.50");
    // İki güvenilen vekil: sondan ikinci öğe.
    expect(istemciAdresi(b({ "x-forwarded-for": "10.0.0.1, 203.0.113.50, 192.0.2.9" }), 2)).toBe("203.0.113.50");
  });

  it("boş başlıkları atlar, adres yoksa null döner", () => {
    expect(istemciAdresi(b({ "cf-connecting-ip": "  ", "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(istemciAdresi(b({}))).toBeNull();
    expect(istemciAdresi(undefined)).toBeNull();
    expect(istemciAdresi(b({ "x-forwarded-for": "203.0.113.50" }), 2)).toBeNull();
  });
});
