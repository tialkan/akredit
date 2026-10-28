import { describe, expect, it } from "vitest";
import { KART_KISAYOLLARI, kartKisayolu, yuzde } from "./kisayol.ts";

describe("kartKisayolu", () => {
  it("tuşları eylemlere çevirir; değiştiriciyle çalışmaz", () => {
    expect(kartKisayolu("j")).toEqual({ tur: "sonraki" });
    expect(kartKisayolu("2")).toEqual({ tur: "sec", sira: 1 });
    expect(kartKisayolu("4")).toBeNull();
    expect(kartKisayolu("o", true)).toBeNull();
  });
  it("toplu onay kısayolu yok", () => {
    expect(kartKisayolu("a")).toBeNull();
    expect(kartKisayolu("x")).toBeNull();
    expect(KART_KISAYOLLARI.some((k) => /hepsi|toplu/i.test(k.aciklama))).toBe(false);
  });
  it("yüzde biçimi", () => {
    expect(yuzde(52.25)).toBe("%52,3");
  });
});
