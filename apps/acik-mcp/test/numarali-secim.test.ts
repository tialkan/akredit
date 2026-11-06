// Kurucu isteği (06.11.2026): hoca seçenekleri yalnız numarayla seçer; Bologna'da tarayıcı varsa ilk iş OBS açılır.
// Codex denemesinde asistan "akredit"i arama terimi sanıp menüyü göstermedi; talimat bunu açıkça yasaklar.
import { describe, expect, it } from "vitest";
import { baslangic, KISA_KURALLAR } from "../src/promptlar.ts";
import { SUNUCU_TALIMATI } from "../src/sunucu.ts";

describe("numaralı seçim ve önce OBS", () => {
  it("sunucu talimatı: akredit arama terimi değildir, sorular numaralı, Bologna'da ilk iş OBS", () => {
    expect(SUNUCU_TALIMATI).toContain("'akredit' bir dosya, klasör ya da arama terimi değildir");
    expect(SUNUCU_TALIMATI).toContain("numaralı seçeneklerle sor");
    expect(SUNUCU_TALIMATI).toContain("ilk iş OBS'yi açmaktır");
  });

  it("menü numaralıdır ve kısa kurallar numarayla ilerlemeyi ve önce OBS'yi söyler", () => {
    const b = baslangic();
    expect(b.hocayaGoster).toMatch(/Yalnız numarasını yazın/u);
    expect(
      b.hocayaGoster
        .split("\n")
        .slice(1)
        .every((s) => /^\d\) /u.test(s)),
    ).toBe(true);
    expect(KISA_KURALLAR.join(" ")).toContain("yalnız numara yazarak");
    expect(b.akislar["1"]).toContain("İLK İŞ");
    // Bologna akışı ders adını sormaz; OBS'den okur.
    expect(b.akislar["1"]).toContain("Ders adını ya da paketi sorma");
  });
});
