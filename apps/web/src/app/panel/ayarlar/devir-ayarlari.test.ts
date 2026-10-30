import { describe, expect, it } from "vitest";
import { tatilleriAyir } from "./devir-ayarlari.tsx";

describe("tatil listesi girişi (İP-38)", () => {
  it("satır, virgül ve boşlukla ayrılmış günleri ayırır, boşları atar", () => {
    expect(tatilleriAyir("2026-10-29\n\n2027-01-01, 2027-04-23 ;2027-05-01")).toEqual([
      "2026-10-29",
      "2027-01-01",
      "2027-04-23",
      "2027-05-01",
    ]);
  });
});
