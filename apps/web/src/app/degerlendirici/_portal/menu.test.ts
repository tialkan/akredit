// İP-44: portal menüsünde rapor bağlantısı. Rapor sayfaları "Raporlar"ı, kanıt sayfaları "Kanıt odası"nı etkin yapar.
import { describe, expect, it } from "vitest";
import { etkinMi } from "./menu.tsx";

describe("portal menüsü", () => {
  it("rapor sayfası yalnız Raporlar bağlantısını etkin yapar", () => {
    expect(etkinMi("/degerlendirici/kanit/rapor", "/degerlendirici/kanit/rapor")).toBe(true);
    expect(etkinMi("/degerlendirici/kanit/rapor/abc", "/degerlendirici/kanit/rapor")).toBe(true);
    expect(etkinMi("/degerlendirici/kanit/rapor/abc", "/degerlendirici")).toBe(false);
    expect(etkinMi("/degerlendirici/kanit/abc", "/degerlendirici")).toBe(true);
    expect(etkinMi("/degerlendirici/kanit/abc", "/degerlendirici/kanit/rapor")).toBe(false);
    expect(etkinMi("/degerlendirici/soru", "/degerlendirici/soru")).toBe(true);
  });
});
