// İP-48: saha ziyareti sayfasının saf yardımcıları. Örnek kip verisi kurgudur.
import { odr, sahaZiyareti } from "@akredit/servis";
import { describe, expect, it } from "vitest";
import { ORNEK_EKSIKLER, ORNEK_KANIT_BAGLARI, oranMetni, provaOzeti, SAHA_CERCEVELERI, secimOku } from "./gorunum.ts";

describe("saha ziyareti sayfası", () => {
  it("çerçeve kodlarının hepsi servis tarafından tanınır", () => {
    for (const [k] of SAHA_CERCEVELERI) expect(odr.cerceveBul(k).kod).toBe(k);
  });

  it("seçim: tanınmayan değer ilk seçeneğe düşer", () => {
    const p = [{ id: "p1" }, { id: "p2" }];
    expect(secimOku({ program: "p2", cerceve: "mudek", rol: "ogrenci" }, p)).toEqual({
      programId: "p2",
      cerceveKod: "mudek",
      rol: "ogrenci",
    });
    expect(secimOku({ program: "yok", cerceve: "yok", rol: ["yok"] }, p)).toEqual({
      programId: "p1",
      cerceveKod: "akredit-onlisans-ic",
      rol: "komisyon",
    });
  });

  it("oran metni yalnız biçimler", () => {
    expect([oranMetni(25), oranMetni(33.3), oranMetni(0), oranMetni(null)]).toEqual([
      "%25,0",
      "%33,3",
      "%0,0",
      "Soru yok",
    ]);
  });

  it("örnek kip listesi: kurallı, prova özeti rol sorularından sayılır", () => {
    const l = sahaZiyareti.sorulariKur({
      cerceve: odr.cerceveBul("akredit-onlisans-ic"),
      kanitlar: ORNEK_KANIT_BAGLARI,
      eksikCumleler: ORNEK_EKSIKLER,
    });
    // 6 ölçüt sorusu + 2 EKSİK sorusu; kanıtlı olanlar P.1 ve P.4: 2 / 8 = %25,0.
    expect(l.toplam).toEqual({ soru: 8, kanitli: 2, oran: 25 });
    const ilk = l.sorular[0]?.id ?? "";
    const o = provaOzeti({ sorular: l.sorular, prova: { [ilk]: "eksik_var" } }, "komisyon");
    expect(o).toMatchObject({ isaretli: 1, eksik: 1 });
    expect(o.sorular).toHaveLength(8);
  });
});
