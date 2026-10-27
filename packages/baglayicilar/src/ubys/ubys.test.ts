import { readFileSync } from "node:fs";
import { tabloOku, xlsxUret } from "@akredit/belge";
import { describe, expect, it } from "vitest";
import { obsDisaAktarimiOku, saglayiciTahmin, sutunTuru } from "./ubys.ts";

const takmaAd = (no: string) => `T-${[...no].reverse().join("")}`;
const csv = new Uint8Array(readFileSync(new URL("./test/fixtures/ubys-not-listesi.csv", import.meta.url)));

describe("UBYS / OBS not listesi içe aktarımı", () => {
  it("kurgu UBYS CSV dışa aktarımını okur, kişisel sütunları atlar", async () => {
    const tablo = await tabloOku(csv, { ad: "not-listesi.csv" });
    const r = obsDisaAktarimiOku(tablo, { takmaAd });
    expect(r.saglayici).toBe("ubys");
    expect(r.ders).toEqual({ kod: "KRG101", donem: "2025-2026 Güz" });
    expect(r.degerlendirmeler).toEqual([
      { ad: "Vize (%40)", agirlik: 40 },
      { ad: "Final (%60)", agirlik: 60 },
      { ad: "Bütünleme", agirlik: null },
    ]);
    expect(r.ogrenciler).toEqual([
      {
        ogrenci: "T-100000009",
        notlar: { "Vize (%40)": 55, "Final (%60)": 70, Bütünleme: null },
        ortalama: 64,
        harf: "CC",
      },
      {
        ogrenci: "T-200000009",
        notlar: { "Vize (%40)": "devamsiz", "Final (%60)": 40, Bütünleme: null },
        ortalama: 16,
        harf: "FF",
      },
      {
        ogrenci: "T-300000009",
        notlar: { "Vize (%40)": 80.5, "Final (%60)": null, Bütünleme: null },
        ortalama: 48.2,
        harf: "DD",
      },
    ]);
    // CSV satır 7'de "abc", satır 9'da yinelenen numara, satır 10'da numarasız satır.
    expect(r.bulgular).toEqual([
      { kod: "sayi_degil", ileti: "Not hücresi sayı değil.", hucre: "E7" },
      { kod: "yinelenen", ileti: "Aynı öğrenci birden çok kez var; ilki alındı.", hucre: "A9" },
      { kod: "numarasiz", ileti: "Öğrenci numarası olmayan satır atlandı.", hucre: "A10" },
    ]);
    const json = JSON.stringify(r);
    for (const yasak of ["900000001", "Deneme Örnek", "Kurgu Hayali", "00000000000", "Satırsız"])
      expect(json).not.toContain(yasak);
  });

  it("XLSX dışa aktarımında ağırlık toplamı ve aralık dışı not bulgusu", async () => {
    const veri = await xlsxUret([
      {
        ad: "Notlar",
        basliklar: ["Öğrenci No", "Ad Soyad", "Ara Sınav %30", "Ödev %20", "Yarıyıl Sonu %40", "Ortalama", "Harf"],
        satirlar: [["900000011", "Hayali Ad", 120, 50, 60, 70, "bb"]],
      },
    ]);
    const r = obsDisaAktarimiOku(await tabloOku(veri, { ad: "x.xlsx" }), { takmaAd });
    expect(r.saglayici).toBe("proliz"); // "yarıyıl sonu" imzası
    expect(r.ogrenciler[0]?.harf).toBe("BB");
    expect(r.bulgular.map((b) => b.kod)).toEqual(["agirlik_toplami", "aralik_disi"]);
    expect(r.bulgular[0]?.ileti).toContain("%90"); // 30 + 20 + 40
    expect(r.bulgular[1]?.hucre).toBe("C2");
  });

  it("numara sütunu olmayan dosyada açık uyarı", () => {
    const r = obsDisaAktarimiOku({ sayfalar: [{ ad: "S", satirlar: [["Ad", "Not"]] }] }, { takmaAd });
    expect(r.bulgular[0]?.kod).toBe("baslik_yok");
    expect(obsDisaAktarimiOku({ sayfalar: [] }, { takmaAd }).bulgular[0]?.kod).toBe("sayfa_yok");
  });

  it("sütun türü ve sağlayıcı tahmini", () => {
    expect(sutunTuru("t.c. kimlik no")).toBe("kisisel");
    expect(sutunTuru("e-posta")).toBe("kisisel");
    expect(sutunTuru("final (%60)")).toBe("degerlendirme");
    expect(sutunTuru("harf notu")).toBe("harf");
    expect(sutunTuru("devam durumu")).toBe("devam");
    expect(saglayiciTahmin(["öğrenci no", "vize"], "")).toBe("genel");
  });
});
