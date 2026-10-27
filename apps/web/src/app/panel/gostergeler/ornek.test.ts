import { gostergeHesapla, izlenebilirMi, raporTablosu } from "@akredit/gosterge";
import { describe, expect, it } from "vitest";
import { ORNEK_DONEMLER, ORNEK_TANIMLAR, ORNEK_VERILER } from "./ornek.ts";

describe("gösterge panosu örnek verisi", () => {
  it("her değer kaynağına izlenebilir", () => {
    for (const t of ORNEK_TANIMLAR)
      for (const d of ORNEK_DONEMLER) expect(izlenebilirMi(t, gostergeHesapla(t, d, ORNEK_VERILER))).toBe(true);
  });

  it("rapor tablosu elle doğrulanmış değerler", () => {
    // PG-1.1: 70/80=87,5; 76/80=95; 72/80=90 (hedef 100, %10 geride → sapma)
    // PG-2.3: 2024 yok; 3,8; 3,9 (hedef 4, %2,5 geride → uyarı)
    // PG-3.2: sağlanan PÇ verisi yok → EKSİK
    const [a, b, c] = raporTablosu(ORNEK_TANIMLAR, ORNEK_VERILER, [...ORNEK_DONEMLER]);
    expect(a).toMatchObject({ degerler: { "2024": 87.5, "2025": 95, "2026": 90 }, sonDurum: "sapma" });
    expect(b).toMatchObject({ degerler: { "2024": null, "2025": 3.8, "2026": 3.9 }, sonDurum: "uyari" });
    expect(c).toMatchObject({ sonDurum: "EKSIK" });
  });
});
