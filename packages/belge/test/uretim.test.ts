import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { docxUret, metinCikar } from "../src/index.ts";
import type { DocxModeli } from "../src/turler.ts";

const TR = "ı İ ğ Ğ ş Ş ç Ç ö Ö ü Ü";

const model: DocxModeli = {
  baslik: "Program Öz Değerlendirme Raporu",
  altBaslik: "Taslak",
  ustBilgi: "Örnek Üniversitesi — Taslak, onaylanmadı",
  altBilgi: "Akredit",
  bolumler: [
    {
      baslik: "Eğitim ve Öğretim",
      duzey: 1,
      icerik: [
        { tur: "paragraf", metin: `Program çıktıları tanımlıdır [K:k1 s.3]. ${TR}` },
        { tur: "paragraf", metin: "EKSİK: Paydaş anket sonucu bulunamadı.", vurgu: "eksik" },
        { tur: "paragraf", metin: "Bu bölüm kurulca gözden geçirilecek.", vurgu: "not" },
      ],
    },
    {
      baslik: "Ölçme ve Değerlendirme",
      duzey: 2,
      icerik: [
        { tur: "madde", maddeler: ["Birinci madde", "İkinci madde"] },
        { tur: "madde", maddeler: ["Adım bir", "Adım iki"], numarali: true },
        {
          tur: "tablo",
          basliklar: ["Çıktı", "Sağlanma düzeyi"],
          satirlar: [
            ["PÇ1", "3,4"],
            ["PÇ2", "2,8"],
          ],
          aciklama: "Tablo 1. Program çıktıları",
        },
      ],
    },
    { baslik: "Şeffaflık", duzey: 3, icerik: [{ tur: "paragraf", metin: "Son paragraf." }] },
  ],
};

describe("docxUret", () => {
  it("gidiş-dönüş: başlıklar, paragraflar, tablolar geri gelir; Türkçe kayıpsız", async () => {
    const v = await docxUret(model);
    const b = await metinCikar(v, { ad: "rapor.docx" });
    expect(b.tur).toBe("docx");
    expect(b.uyarilar).toEqual([]);
    const basliklar = b.bolumler.filter((x) => x.baslik).map((x) => [x.baslik, x.duzey]);
    expect(basliklar).toEqual([
      ["Eğitim ve Öğretim", 1],
      ["Ölçme ve Değerlendirme", 2],
      ["Şeffaflık", 3],
    ]);
    const egitim = b.bolumler.find((x) => x.baslik === "Eğitim ve Öğretim");
    expect(egitim?.metin).toContain(`Program çıktıları tanımlıdır [K:k1 s.3]. ${TR}`);
    expect(egitim?.metin).toContain("EKSİK: Paydaş anket sonucu bulunamadı.");
    expect(b.bolumler.find((x) => x.baslik === "Ölçme ve Değerlendirme")?.metin).toBe(
      "Birinci madde\n\nİkinci madde\n\nAdım bir\n\nAdım iki\n\nTablo 1. Program çıktıları",
    );
    expect(b.bolumler[0]?.metin).toContain("Program Öz Değerlendirme Raporu");
    expect(b.tablolar).toEqual([
      {
        capa: { bolum: "Ölçme ve Değerlendirme" },
        ad: "Tablo 1",
        satirlar: [
          ["Çıktı", "Sağlanma düzeyi"],
          ["PÇ1", "3,4"],
          ["PÇ2", "2,8"],
        ],
      },
    ]);
  });

  it("biçim: tekrarlı başlık satırı, eksik vurgusu, listeler, üst/alt bilgi, sayfa numarası, Türkçe dil", async () => {
    const z = unzipSync(await docxUret(model));
    const belge = strFromU8(z["word/document.xml"] as Uint8Array);
    expect(belge).toContain("<w:tblHeader");
    expect(belge).toContain('w:fill="FDECEA"'); // eksik vurgusu zemin rengi
    expect(belge).toContain('w:color w:val="B00020"');
    expect(belge.match(/<w:numId /g)?.length).toBe(4);
    const ust = Object.keys(z).filter((a) => /word\/header\d*\.xml/.test(a));
    const alt = Object.keys(z).filter((a) => /word\/footer\d*\.xml/.test(a));
    expect(ust.map((a) => strFromU8(z[a] as Uint8Array)).join("")).toContain(
      "Örnek Üniversitesi — Taslak, onaylanmadı",
    );
    const altMetin = alt.map((a) => strFromU8(z[a] as Uint8Array)).join("");
    expect(altMetin).toContain("PAGE");
    expect(altMetin).toContain("NUMPAGES");
    const stiller = strFromU8(z["word/styles.xml"] as Uint8Array);
    expect(stiller).toContain("tr-TR");
    const numara = strFromU8(z["word/numbering.xml"] as Uint8Array);
    expect(numara).toContain('w:val="decimal"');
    expect(numara).toContain('w:val="bullet"');
  });
});
