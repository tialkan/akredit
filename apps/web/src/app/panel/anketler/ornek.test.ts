import { describe, expect, it } from "vitest";
import { ORNEK_ANKETLER, ornekIsyukuDenetimi } from "./ornek.ts";

describe("örnek anket verisi", () => {
  it("belirlenimci ve hesaplanmış", () => {
    expect(ORNEK_ANKETLER.map((a) => a.sonuc.yanitSayisi)).toEqual([38, 24, 3]);
    // 38/60 ve 24/60
    expect(ORNEK_ANKETLER[0]?.sonuc.yanitOrani).toBeCloseTo(38 / 60, 12);
    expect(ORNEK_ANKETLER[1]?.sonuc.yanitOrani).toBe(0.4);
    // 3 yanıt < eşik 5: mezun anketinde dağılım gizli
    expect(ORNEK_ANKETLER[2]?.sonuc.sorular.every((s) => s.tur === "acik" || s.gizli)).toBe(true);
  });

  it("iş yükü anketi Bologna denetimine girer", () => {
    const d = ornekIsyukuDenetimi();
    expect(d.beyan).toBe(150);
    expect(d.olculen).toBeGreaterThan(0);
    expect(ornekIsyukuDenetimi()).toEqual(d);
  });
});
