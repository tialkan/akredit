import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { metinCikar, turTahminEt } from "../src/index.ts";
import { pdfOlustur } from "./pdf-yardimci.ts";
import { docxHam, odf, pptx, W_NS_ATTR, zip } from "./yardimci.ts";

const TR = "ı İ ğ Ğ ş Ş ç Ç ö Ö ü Ü";
const enc = (s: string) => new TextEncoder().encode(s);

describe("turTahminEt", () => {
  it("sihirli baytlardan tanır", () => {
    expect(turTahminEt(enc("%PDF-1.7\n"))).toBe("pdf");
    expect(turTahminEt(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("gorsel");
    expect(turTahminEt(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("gorsel");
    expect(turTahminEt(new Uint8Array([0x49, 0x49, 0x2a, 0x00]))).toBe("gorsel");
  });
  it("ZIP içeriğinden docx/xlsx/pptx/odt/ods ayırır, uzantıya aldanmaz", () => {
    expect(turTahminEt(docxHam(""), { ad: "yanlis.xlsx" })).toBe("docx");
    expect(turTahminEt(zip({ "[Content_Types].xml": "<x/>", "xl/workbook.xml": "<x/>" }))).toBe("xlsx");
    expect(turTahminEt(pptx([{ baslik: "a", govde: [] }]))).toBe("pptx");
    expect(turTahminEt(odf("text", ""))).toBe("odt");
    expect(turTahminEt(odf("spreadsheet", ""))).toBe("ods");
    expect(turTahminEt(odf("presentation", ""))).toBe("pptx");
  });
  it("uzantı ve MIME'ye düşer", () => {
    expect(turTahminEt(enc("a;b"), { ad: "notlar.CSV" })).toBe("csv");
    expect(turTahminEt(enc("x"), { mime: "text/html; charset=utf-8" })).toBe("html");
    expect(turTahminEt(enc("<!DOCTYPE html><p>")).valueOf()).toBe("html");
    expect(turTahminEt(enc('{"a":1}'))).toBe("json");
    expect(turTahminEt(enc("düz metin"))).toBe("metin");
    expect(turTahminEt(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe("bilinmiyor");
  });
});

describe("metinCikar", () => {
  it("özet girdinin SHA-256'sıdır", async () => {
    const v = enc("merhaba");
    const b = await metinCikar(v, { ad: "a.txt" });
    expect(b.ozet).toBe(createHash("sha256").update(v).digest("hex"));
  });

  it("PDF: sayfa numaralı bölümler, Türkçe karakterler kayıpsız", async () => {
    const b = await metinCikar(pdfOlustur([[`Birinci sayfa ${TR}`], ["İkinci sayfa: Öğrenci çıktıları"]]));
    expect(b.tur).toBe("pdf");
    expect(b.sayfaSayisi).toBe(2);
    expect(b.ocrGerekli).toBe(false);
    expect(b.bolumler.map((x) => x.capa.sayfa)).toEqual([1, 2]);
    expect(b.bolumler[0]?.metin).toContain(TR);
    expect(b.bolumler[1]?.metin).toBe("İkinci sayfa: Öğrenci çıktıları");
  });

  it("PDF: metinsiz sayfada ocrGerekli ve Türkçe uyarı", async () => {
    const b = await metinCikar(pdfOlustur([[], []]));
    expect(b.ocrGerekli).toBe(true);
    expect(b.uyarilar[0]).toMatch(/taranmış/);
  });

  it("bozuk PDF çökmez, uyarılı boş sonuç verir", async () => {
    const b = await metinCikar(enc("%PDF-1.4\nbozuk içerik"));
    expect(b.bolumler).toEqual([]);
    expect(b.uyarilar[0]).toMatch(/okunamadı/);
  });

  it("DOCX: başlık stilleri, tablo, dipnot, Türkçe", async () => {
    const stiller = `<w:styles ${W_NS_ATTR}><w:style w:styleId="Balk1"><w:name w:val="Başlık 1"/></w:style><w:style w:styleId="Heading2"><w:name w:val="heading 2"/></w:style></w:styles>`;
    const dipnot = `<w:footnotes ${W_NS_ATTR}><w:footnote w:type="separator" w:id="-1"><w:p/></w:footnote><w:footnote w:id="1"><w:p><w:r><w:t>Kaynak: öz değerlendirme</w:t></w:r></w:p></w:footnote></w:footnotes>`;
    const govde = `
      <w:p><w:r><w:t>Giriş paragrafı</w:t></w:r></w:p>
      <w:p><w:pPr><w:pStyle w:val="Balk1"/></w:pPr><w:r><w:t>Eğitim-öğretim</w:t></w:r></w:p>
      <w:p><w:r><w:t xml:space="preserve">Program </w:t></w:r><w:r><w:t>${TR}</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>
      <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Ders</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>AKTS</w:t></w:r></w:p></w:tc></w:tr>
             <w:tr><w:tc><w:p><w:r><w:t>Hukuka Giriş</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>5</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
      <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Ölçme</w:t></w:r></w:p>
      <w:p><w:r><w:t>a &amp; b</w:t></w:r></w:p>`;
    const b = await metinCikar(docxHam(govde, { "word/styles.xml": stiller, "word/footnotes.xml": dipnot }));
    expect(b.tur).toBe("docx");
    expect(b.bolumler.map((x) => [x.capa.bolum, x.duzey])).toEqual([
      ["§1", undefined],
      ["Eğitim-öğretim", 1],
      ["Ölçme", 2],
      ["Dipnotlar", undefined],
    ]);
    expect(b.bolumler[1]?.metin).toBe(`Program ${TR}[1]`);
    expect(b.bolumler[2]?.metin).toBe("a & b");
    expect(b.bolumler[3]?.metin).toBe("[1] Kaynak: öz değerlendirme");
    expect(b.tablolar).toEqual([
      {
        capa: { bolum: "Eğitim-öğretim" },
        ad: "Tablo 1",
        satirlar: [
          ["Ders", "AKTS"],
          ["Hukuka Giriş", "5"],
        ],
      },
    ]);
  });

  it("PPTX: slayt başına bölüm, başlık, konuşmacı notu ve tablo", async () => {
    const b = await metinCikar(
      pptx([
        { baslik: "Kalite güvencesi", govde: ["Birinci madde", TR], not: "Burada süreyi hatırlat" },
        {
          baslik: "Sonuç",
          govde: ["Öneriler"],
          tablo: [
            ["Ölçüt", "Düzey"],
            ["A.1", "3"],
          ],
        },
      ]),
    );
    expect(b.tur).toBe("pptx");
    expect(b.sayfaSayisi).toBe(2);
    expect(b.bolumler).toEqual([
      { capa: { slayt: 1 }, baslik: "Kalite güvencesi", metin: `Birinci madde\n${TR}` },
      { capa: { slayt: 1, bolum: "Konuşmacı notları" }, baslik: "Konuşmacı notları", metin: "Burada süreyi hatırlat" },
      { capa: { slayt: 2 }, baslik: "Sonuç", metin: "Öneriler" },
    ]);
    expect(b.tablolar[0]).toEqual({
      capa: { slayt: 2 },
      ad: "Slayt 2 tablosu",
      satirlar: [
        ["Ölçüt", "Düzey"],
        ["A.1", "3"],
      ],
    });
  });

  it("ODT: başlıklar, paragraflar, liste ve tablo", async () => {
    const b = await metinCikar(
      odf(
        "text",
        `<text:p>Önsöz</text:p><text:h text:outline-level="1">Birinci Bölüm</text:h><text:p>Metin<text:s text:c="2"/>${TR}</text:p>
         <text:list><text:list-item><text:p>madde bir</text:p></text:list-item></text:list>
         <text:h text:outline-level="2">Alt başlık</text:h>
         <table:table table:name="Çizelge"><table:table-row><table:table-cell office:value-type="string"><text:p>Şube</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="12"><text:p>12</text:p></table:table-cell></table:table-row></table:table>`,
      ),
    );
    expect(b.tur).toBe("odt");
    expect(b.bolumler.map((x) => [x.baslik, x.duzey, x.metin])).toEqual([
      [undefined, undefined, "Önsöz"],
      ["Birinci Bölüm", 1, `Metin  ${TR}\n\n- madde bir`],
      ["Alt başlık", 2, ""],
    ]);
    expect(b.tablolar[0]).toEqual({ capa: { bolum: "Alt başlık" }, ad: "Çizelge", satirlar: [["Şube", "12"]] });
  });

  it("ODP: slaytlar ve notlar", async () => {
    const b = await metinCikar(
      odf(
        "presentation",
        `<draw:page><draw:frame presentation:class="title"><draw:text-box><text:p>Açılış</text:p></draw:text-box></draw:frame>
         <draw:frame><draw:text-box><text:p>Güçlü yönler</text:p></draw:text-box></draw:frame>
         <presentation:notes><draw:frame><draw:text-box><text:p>Not: ölçütleri anlat</text:p></draw:text-box></draw:frame></presentation:notes></draw:page>
         <draw:page><draw:frame><draw:text-box><text:p>İkinci</text:p></draw:text-box></draw:frame></draw:page>`,
      ),
      { ad: "sunum.odp" },
    );
    expect(b.bolumler).toEqual([
      { capa: { slayt: 1 }, baslik: "Açılış", metin: "Güçlü yönler" },
      { capa: { slayt: 1, bolum: "Konuşmacı notları" }, baslik: "Konuşmacı notları", metin: "Not: ölçütleri anlat" },
      { capa: { slayt: 2 }, metin: "İkinci" },
    ]);
  });

  it("HTML: script/style atılır, başlıklar ve tablolar korunur", async () => {
    const html = `<!DOCTYPE html><html><head><style>p{color:red}</style><script>alert("talimat")</script></head><body>
      <p>Giriş &amp; amaç</p><h1>Öz Değerlendirme</h1><p>${TR}&nbsp;son</p>
      <table><tr><th>Ölçüt</th><th>Kanıt</th></tr><tr><td>A.1</td><td>Kurul<br>kararı</td></tr></table>
      <h2>Alt</h2><p>bitti</p></body></html>`;
    const b = await metinCikar(enc(html), { ad: "a.html" });
    expect(b.tur).toBe("html");
    expect(JSON.stringify(b)).not.toContain("alert");
    expect(JSON.stringify(b)).not.toContain("color");
    expect(b.bolumler).toEqual([
      { capa: { bolum: "§1" }, metin: "Giriş & amaç" },
      { capa: { bolum: "Öz Değerlendirme" }, baslik: "Öz Değerlendirme", duzey: 1, metin: `${TR} son` },
      { capa: { bolum: "Alt" }, baslik: "Alt", duzey: 2, metin: "bitti" },
    ]);
    expect(b.tablolar[0]?.satirlar).toEqual([
      ["Ölçüt", "Kanıt"],
      ["A.1", "Kurul\nkararı"],
    ]);
  });

  it("Markdown başlıkları bölüm olur; düz metin ve JSON tek bölüm", async () => {
    const md = await metinCikar(enc(`önsöz\n# Başlık Bir\nmetin ${TR}\n\`\`\`\n# kod içi\n\`\`\`\n## İki\nson`), {
      ad: "not.md",
    });
    expect(md.bolumler.map((x) => [x.baslik, x.duzey, x.capa.satir])).toEqual([
      [undefined, undefined, 1],
      ["Başlık Bir", 1, 2],
      ["İki", 2, 7],
    ]);
    expect(md.bolumler[1]?.metin).toContain("# kod içi");
    const txt = await metinCikar(enc(`satır ${TR}`), { ad: "a.txt" });
    expect(txt.bolumler).toEqual([{ capa: { satir: 1 }, metin: `satır ${TR}` }]);
    const js = await metinCikar(enc('{"ad":"Çağrı"}'));
    expect(js.tur).toBe("json");
    expect(js.bolumler[0]?.metin).toBe('{"ad":"Çağrı"}');
  });

  it("görsel: ocrGerekli", async () => {
    const b = await metinCikar(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
    expect(b.tur).toBe("gorsel");
    expect(b.ocrGerekli).toBe(true);
    expect(b.uyarilar[0]).toMatch(/OCR/);
  });

  it("eski .doc/.xls/.ppt için yol gösteren uyarı", async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]);
    expect((await metinCikar(ole, { ad: "rapor.doc" })).uyarilar[0]).toMatch(/\.docx ya da PDF/);
    expect((await metinCikar(ole, { ad: "liste.xls" })).uyarilar[0]).toMatch(/\.xlsx ya da CSV/);
    expect((await metinCikar(ole, { ad: "sunum.ppt" })).uyarilar[0]).toMatch(/\.pptx/);
    expect((await metinCikar(ole)).uyarilar[0]).toMatch(/eski bir Office/);
  });

  it("boyut sınırını aşan dosya okunmaz", async () => {
    const b = await metinCikar(enc("x".repeat(2000)), { ad: "a.txt" }, { enBuyukBoyut: 1000 });
    expect(b.bolumler).toEqual([]);
    expect(b.uyarilar[0]).toMatch(/çok büyük/);
  });

  it("bozuk ZIP çökmez", async () => {
    const v = docxHam("<w:p>");
    const b = await metinCikar(v.subarray(0, 60), { ad: "a.docx" });
    expect(b.bolumler).toEqual([]);
    expect(b.uyarilar.length).toBe(1);
  });
});
