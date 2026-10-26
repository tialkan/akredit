import { describe, expect, it } from "vitest";
import { RAPORLAR } from "../../../veri/ornek.ts";
import { bolumKapsamasi, raporKapsamasi } from "./kapsama.ts";

describe("rapor kapsaması", () => {
  it("atıfsız paragraf eksik sayılır", () => {
    const b = {
      id: "b",
      baslik: "B",
      olcut: "Ö-1",
      paragraflar: [
        { metin: "a", atiflar: [], eksik: false }, // atıf yok: eksik sayılır
        { metin: "b", atiflar: [{ kanitId: "k" as never }], eksik: false },
        { metin: "c", atiflar: [], eksik: true },
      ],
    };
    expect(bolumKapsamasi(b)).toEqual({ toplam: 3, atifli: 1, eksik: 2 });
  });

  it("örnek öz değerlendirme raporu: 7 paragraf, 2 EKSİK", () => {
    // Bölüm 1: 3 paragraf (1 eksik), bölüm 2: 2, bölüm 3: 2 (1 eksik)
    const r = RAPORLAR[0];
    if (!r) throw new Error("örnek rapor yok");
    expect(raporKapsamasi(r)).toEqual({ toplam: 7, atifli: 5, eksik: 2 });
  });
});
