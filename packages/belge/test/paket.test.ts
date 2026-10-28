// İP-37: Akredit önerisi işareti (paragraf ve tablo satırı) ve .zip paketleme.

import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { docxUret, guvenliDosyaAdi, metinCikar, zipPaketle } from "../src/index.ts";

describe("Akredit önerisi işareti", () => {
  it("öneri paragrafı etiketli, öneri satırı sarı zeminli; tablo geri okunur", async () => {
    const veri = await docxUret({
      baslik: "Ders bilgi paketi",
      bolumler: [
        {
          duzey: 1,
          baslik: "Genel",
          icerik: [
            { tur: "paragraf", metin: "Amaç metni yeniden yazıldı.", vurgu: "oneri" },
            {
              tur: "tablo",
              basliklar: ["Kod", "Alan", "Değer", "Kaynak"],
              satirlar: [
                ["A001", "Dersin Amacı", "Yeni amaç", "Akredit önerisi"],
                ["A002", "Ön Koşul", "Yok", "Bologna'da mevcut"],
              ],
              oneriSatirlari: [0],
            },
          ],
        },
      ],
    });
    const xml = strFromU8(unzipSync(veri)["word/document.xml"] as Uint8Array);
    expect(xml).toContain("Akredit önerisi: ");
    // Öneri satırının hücreleri ve öneri paragrafı sarı zeminli; ikinci satır değil.
    expect(xml.match(/w:fill="FFF4C2"/gu)?.length).toBe(5);
    const m = await metinCikar(veri, { ad: "paket.docx" });
    expect(m.tablolar[0]?.satirlar).toEqual([
      ["Kod", "Alan", "Değer", "Kaynak"],
      ["A001", "Dersin Amacı", "Yeni amaç", "Akredit önerisi"],
      ["A002", "Ön Koşul", "Yok", "Bologna'da mevcut"],
    ]);
  });
});

describe("zip paketi", () => {
  it("adlar düzleşir, yinelenen ada sıra eklenir; aynı girdi aynı bayt", () => {
    const d = [
      { ad: "../../etc/BPA102 paket.docx", veri: new Uint8Array([1, 2]) },
      { ad: "BPA102-paket.docx", veri: new Uint8Array([3]) },
    ];
    const z = zipPaketle(d);
    expect(Object.keys(unzipSync(z))).toEqual(["BPA102-paket.docx", "BPA102-paket-2.docx"]);
    expect(zipPaketle(d)).toEqual(z);
    expect(guvenliDosyaAdi("..")).toBe("belge");
  });
});
