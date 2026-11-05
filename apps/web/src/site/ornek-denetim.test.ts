import { describe, expect, it } from "vitest";
import { ornekDenetim } from "./ornek-denetim.ts";

describe("ana sayfa önce/sonra örneği", () => {
  it("önce: üç bulgu, gerçek denetimden", () => {
    const { once } = ornekDenetim();
    // İş yükü 42+56+4 = 102 saat, 5 AKTS: AKTS başına 20,4 saat (25-30 dışında).
    // Değerlendirme 40+50 = %90. Haftalık konu 12 (<14).
    expect(once.map((b) => b.kural)).toEqual(["akts-isyuku", "degerlendirme", "haftalar"]);
    expect(once[0]?.aciklama).toContain("102 saat");
    expect(once[1]?.aciklama).toContain("%90");
  });

  it("sonra: bulgu yok", () => {
    // 42+84+4+10 = 140 saat / 5 = 28 saat; 40+60 = 100; 14 hafta.
    expect(ornekDenetim().sonra).toEqual([]);
  });
});
