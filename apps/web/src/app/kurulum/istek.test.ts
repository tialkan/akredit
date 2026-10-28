import { describe, expect, it } from "vitest";
import { adAnahtari, csvKisileri } from "./istek.ts";

describe("kurulum yardımcıları", () => {
  it("CSV: ad ve e-posta okunur, başlık ve eksik satır atlanır; addan adres üretilmez", () => {
    const metin =
      'ad_soyad;eposta\nKurgu Örnekoğlu; Kurgu@Uydurma.edu.tr\nAdresi Olmayan Hoca\n\n"Deneme Hoca",dh@uydurma.edu.tr';
    expect(csvKisileri(metin)).toEqual([
      { adSoyad: "Kurgu Örnekoğlu", eposta: "kurgu@uydurma.edu.tr" },
      { adSoyad: "Deneme Hoca", eposta: "dh@uydurma.edu.tr" },
    ]);
  });
  it("ad eşleştirmede unvan ve harf farkı yok sayılır", () => {
    expect(adAnahtari("Dr. Öğr. Üyesi Kurgu ÖRNEKOĞLU")).toBe(adAnahtari("kurgu örnekoğlu"));
    expect(adAnahtari("Öğr. Gör. Deneme Hoca")).toBe("deneme hoca");
  });
});
