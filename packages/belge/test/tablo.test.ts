import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { ayracBul, csvAyristir, hucreCoz, metneCevir } from "../src/csv.ts";
import { metinCikar, tabloOku, xlsxUret } from "../src/index.ts";
import { odf } from "./yardimci.ts";

const TR = "ı İ ğ Ğ ş Ş ç Ç ö Ö ü Ü";

/** Windows-1254 kodlayıcı (yalnız test için): ASCII + Türkçe harfler. */
function cp1254(s: string): Uint8Array {
  const ozel: Record<string, number> = {
    ı: 0xfd,
    İ: 0xdd,
    ğ: 0xf0,
    Ğ: 0xd0,
    ş: 0xfe,
    Ş: 0xde,
    ç: 0xe7,
    Ç: 0xc7,
    ö: 0xf6,
    Ö: 0xd6,
    ü: 0xfc,
    Ü: 0xdc,
  };
  return new Uint8Array([...s].map((c) => ozel[c] ?? (c.charCodeAt(0) < 128 ? c.charCodeAt(0) : 0x3f)));
}

describe("CSV", () => {
  it("noktalı virgül + ondalık virgül + Windows-1254 doğru okunur", async () => {
    const metin =
      'Öğrenci No;Ad Soyad;Vize;Final\r\n0210001;Çağla Işık;72,5;"81,25"\r\n0210002;"Şükrü; Öztürk";1.234,5;\r\n';
    const v = cp1254(metin);
    expect(metneCevir(v).kodlama).toBe("windows-1254");
    const t = await tabloOku(v, { ad: "notlar.csv" });
    // 72,5 → 72.5; "81,25" tırnaklı → 81.25; 1.234,5 binlik nokta → 1234.5; başında 0 olan numara metin kalır.
    expect(t.sayfalar).toEqual([
      {
        ad: "CSV",
        satirlar: [
          ["Öğrenci No", "Ad Soyad", "Vize", "Final"],
          ["0210001", "Çağla Işık", 72.5, 81.25],
          ["0210002", "Şükrü; Öztürk", 1234.5, null],
        ],
      },
    ]);
  });

  it("UTF-8 BOM ve virgül ayraçlı (ondalık nokta) dosya", async () => {
    const v = new Uint8Array([
      0xef,
      0xbb,
      0xbf,
      ...new TextEncoder().encode(`ad,puan\n${TR},3.5\n"çok ""tırnaklı""",4\n`),
    ]);
    const t = await tabloOku(v, { ad: "a.csv" });
    expect(t.sayfalar[0]?.satirlar).toEqual([
      ["ad", "puan"],
      [TR, 3.5],
      ['çok "tırnaklı"', 4],
    ]);
  });

  it("sekme ayracı ve tırnak içinde satır sonu", () => {
    expect(ayracBul("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(ayracBul("a;b,c\n1;2,3")).toBe(";");
    expect(csvAyristir('a;"b\nc";d\n1;2;3', ";")).toEqual([
      ["a", "b\nc", "d"],
      ["1", "2", "3"],
    ]);
  });

  it("hucreCoz", () => {
    expect(hucreCoz("3,5", true)).toBe(3.5);
    expect(hucreCoz("3.5", false)).toBe(3.5);
    expect(hucreCoz("3,5", false)).toBe("3,5");
    expect(hucreCoz("007", true)).toBe("007");
    expect(hucreCoz(" ", true)).toBe(null);
    expect(hucreCoz("-12", true)).toBe(-12);
  });

  it("metinCikar CSV'yi tablo ve okunabilir metin olarak verir", async () => {
    const b = await metinCikar(cp1254("ders;kredi\nİş Hukuku;3,5\n"), { ad: "d.csv" });
    expect(b.tur).toBe("csv");
    expect(b.tablolar).toEqual([
      {
        capa: { hucre: "A1:B2" },
        ad: "CSV",
        satirlar: [
          ["ders", "kredi"],
          ["İş Hukuku", 3.5],
        ],
      },
    ]);
    expect(b.bolumler[0]?.metin).toBe("ders | kredi\nİş Hukuku | 3.5");
  });
});

describe("XLSX", () => {
  it("xlsxUret → tabloOku aynı hücreleri verir (gidiş-dönüş)", async () => {
    const satirlar = [
      ["Çıktı", "Düzey", null],
      [TR, 3.75, "ölçüldü"],
      ["Ğ", -2, null],
    ];
    const v = await xlsxUret([
      { ad: "PÇ Matrisi", basliklar: ["Kod", "Değer", "Not"], satirlar },
      { ad: "İkinci", basliklar: ["a"], satirlar: [[1]] },
    ]);
    const t = await tabloOku(v, { ad: "m.xlsx" });
    expect(t.sayfalar).toEqual([
      {
        ad: "PÇ Matrisi",
        satirlar: [["Kod", "Değer", "Not"], ...satirlar.map((s) => (s[2] === null ? s.slice(0, 2) : s))],
      },
      { ad: "İkinci", satirlar: [["a"], [1]] },
    ]);
  });

  it("başlık kalın ve dondurulmuş, sütun genişliği içerikten", async () => {
    const v = await xlsxUret([
      { ad: "S", basliklar: ["k", "uzun başlık metni"], satirlar: [["çok çok uzun bir hücre değeri burada", 1]] },
    ]);
    const kitap = new ExcelJS.Workbook();
    await kitap.xlsx.load(Buffer.from(v) as never);
    const ws = kitap.getWorksheet("S");
    expect(ws?.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(ws?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    // Genişlik = en uzun içerik + 2 (8 ile 60 arası): 36 + 2 = 38; ikinci sütun "uzun başlık metni" 17 + 2 = 19.
    expect(ws?.getColumn(1).width).toBe(38);
    expect(ws?.getColumn(2).width).toBe(19);
  });

  it("birleştirilmiş hücre, tarih ve formül", async () => {
    const kitap = new ExcelJS.Workbook();
    const ws = kitap.addWorksheet("Notlar");
    ws.getCell("A1").value = "Başlık";
    ws.mergeCells("A1:C1");
    ws.getCell("A2").value = new Date(Date.UTC(2026, 9, 27));
    ws.getCell("B2").value = 4;
    ws.getCell("C2").value = { formula: "B2*2", result: 8 };
    ws.getCell("A3").value = new Date(Date.UTC(2026, 9, 27, 13, 30));
    const v = new Uint8Array(await kitap.xlsx.writeBuffer());
    const t = await tabloOku(v);
    expect(t.sayfalar[0]?.satirlar).toEqual([["Başlık"], ["2026-10-27", 4, 8], ["2026-10-27T13:30:00.000Z"]]);
    const b = await metinCikar(v, { ad: "n.xlsx" });
    expect(b.tablolar[0]?.capa).toEqual({ hucre: "Notlar!A1:C3" });
    expect(b.bolumler[0]?.capa).toEqual({ hucre: "Notlar!A1:C3" });
  });
});

describe("ODS", () => {
  it("tekrarlı hücre, birleştirme, tarih ve sayı", async () => {
    const v = odf(
      "spreadsheet",
      `<table:table table:name="Sınav"><table:table-row><table:table-cell table:number-columns-spanned="2" office:value-type="string"><text:p>Öğrenci</text:p></table:table-cell><table:covered-table-cell/><table:table-cell office:value-type="string"><text:p>Puan</text:p></table:table-cell></table:table-row>
       <table:table-row><table:table-cell office:value-type="date" office:date-value="2026-10-27"><text:p>27.10.2026</text:p></table:table-cell><table:table-cell table:number-columns-repeated="2" office:value-type="float" office:value="7.5"><text:p>7,5</text:p></table:table-cell><table:table-cell table:number-columns-repeated="1000"/></table:table-row>
       <table:table-row table:number-rows-repeated="1048000"><table:table-cell table:number-columns-repeated="1024"/></table:table-row></table:table>`,
    );
    const t = await tabloOku(v, { ad: "s.ods" });
    expect(t.sayfalar).toEqual([
      {
        ad: "Sınav",
        satirlar: [
          ["Öğrenci", null, "Puan"],
          ["2026-10-27", 7.5, 7.5],
        ],
      },
    ]);
    const b = await metinCikar(v, { ad: "s.ods" });
    expect(b.tur).toBe("ods");
    expect(b.tablolar[0]?.capa).toEqual({ hucre: "Sınav!A1:C2" });
  });

  it("tablo olmayan dosyada uyarı", async () => {
    const t = await tabloOku(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]));
    expect(t.sayfalar).toEqual([]);
    expect(t.uyarilar?.[0]).toMatch(/tablo değil/);
    const x = await tabloOku(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), { ad: "a.xls" });
    expect(x.uyarilar?.[0]).toMatch(/\.xlsx ya da CSV/);
  });
});
