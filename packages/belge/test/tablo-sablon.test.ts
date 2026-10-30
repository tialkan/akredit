// İP-47: ÖDR tablolarının Word ve Excel çıktısı. EKSİK hücre belgeye "EKSİK" yazılır.

import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  EKSIK_HUCRE,
  eksikHucreSayisi,
  type TabloSablonuBelgesi,
  tabloOku,
  tabloSablonuDocx,
  tabloSablonuModeli,
  tabloSablonuXlsx,
} from "../src/index.ts";

const BELGE: TabloSablonuBelgesi = {
  baslik: "Örnek Mühendisliği ÖDR tabloları",
  ustBilgi: "Örnek Üniversitesi",
  tablolar: [
    {
      baslik: "Tablo 5.2 Ders ve Sınıf Büyüklükleri",
      aciklama: ["Kaynak şablon: mudek/mudek-ozdegerlendirme-raporu-3.1.docx (Ölçüt 5, 5.1.1)."],
      basliklar: ["Dersin Kodu", "Dersin Adı", "Teorik Ders saati", "Diğer"],
      satirlar: [
        { ara: "1. Yarıyıl" },
        { hucreler: ["FIZ101", "Fizik I", 3, null] },
        { hucreler: ["Toplam", "", 3, ""], toplam: true },
      ],
    },
  ],
};

describe("tablo şablonu", () => {
  it("Word modeli: eksik uyarısı, tablo, açıklama; taslak işareti", () => {
    const m = tabloSablonuModeli(BELGE);
    expect(m.ustBilgi).toBe("Örnek Üniversitesi · Taslak: onaylanmadı");
    const icerik = m.bolumler[0]?.icerik ?? [];
    expect(icerik[0]).toMatchObject({ tur: "paragraf", vurgu: "eksik" });
    expect(icerik[1]).toEqual({
      tur: "tablo",
      basliklar: ["Dersin Kodu", "Dersin Adı", "Teorik Ders saati", "Diğer"],
      // Ara satır ilk hücreye yazılır, öteki hücreler boş; null hücre EKSİK olur.
      satirlar: [
        ["1. Yarıyıl", "", "", ""],
        ["FIZ101", "Fizik I", "3", EKSIK_HUCRE],
        ["Toplam", "", "3", ""],
      ],
    });
    expect(eksikHucreSayisi(BELGE.tablolar[0] ?? { baslik: "", aciklama: [], basliklar: [], satirlar: [] })).toBe(1);
  });

  it("Word dosyası açılır, başlık ve EKSİK hücresi belgede", async () => {
    const docx = await tabloSablonuDocx(BELGE);
    const xml = strFromU8(unzipSync(docx)["word/document.xml"] ?? new Uint8Array());
    expect(xml).toContain("Tablo 5.2 Ders ve Sınıf Büyüklükleri");
    expect(xml).toContain(EKSIK_HUCRE);
    expect(xml).toContain("FIZ101");
  });

  it("Excel: her tablo bir sayfa, sayı sayı olarak, EKSİK metin olarak", async () => {
    const xlsx = await tabloSablonuXlsx(BELGE);
    const okunan = await tabloOku(xlsx, { ad: "t.xlsx" });
    const s = okunan.sayfalar[0];
    expect(s?.satirlar[0]).toEqual(["Dersin Kodu", "Dersin Adı", "Teorik Ders saati", "Diğer"]);
    expect(s?.satirlar[2]).toEqual(["FIZ101", "Fizik I", 3, EKSIK_HUCRE]);
  });
});
