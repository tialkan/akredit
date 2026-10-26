import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { metinCikar, tabloOku } from "../src/index.ts";
import { ZamanAsimi, zamanSinirli } from "../src/pdf.ts";
import { XmlHatasi, xmlAyristir } from "../src/xml.ts";
import { GuvenlikHatasi, VARSAYILAN_ZIP, zipAc } from "../src/zip.ts";
import { pdfOlustur } from "./pdf-yardimci.ts";
import { docxHam, W_NS_ATTR, zip } from "./yardimci.ts";

describe("ZIP bombası", () => {
  // 20 MB sıfır baytı deflate ile ~20 KB'a iner: oran ~1000, sınır 200.
  const bomba = () =>
    zipSync(
      { "[Content_Types].xml": strToU8("<x/>"), "word/document.xml": new Uint8Array(20 * 1024 * 1024) },
      { level: 9 },
    );

  it("yüksek sıkıştırma oranlı dosya reddedilir, süreç çökmez", async () => {
    const v = bomba();
    expect(v.length).toBeLessThan(200 * 1024);
    expect(() => zipAc(v, VARSAYILAN_ZIP)).toThrow(GuvenlikHatasi);
    const b = await metinCikar(v, { ad: "bomba.docx" });
    expect(b.tur).toBe("docx");
    expect(b.bolumler).toEqual([]);
    expect(b.uyarilar[0]).toMatch(/ZIP bombası/);
  });

  it("açılmış toplam boyut sınırı", async () => {
    const v = zip({ "[Content_Types].xml": "<x/>", "word/document.xml": "a".repeat(5000) });
    const b = await metinCikar(v, {}, { enBuyukAcilmisBoyut: 1000 });
    expect(b.uyarilar[0]).toMatch(/açılmış boyutu/);
  });

  it("dosya sayısı sınırı", async () => {
    const d: Record<string, string> = { "[Content_Types].xml": "<x/>", "xl/workbook.xml": "<x/>" };
    for (let i = 0; i < 50; i++) d[`xl/x${i}.xml`] = "<x/>";
    const t = await tabloOku(zip(d), {}, { enBuyukDosyaSayisi: 20 });
    expect(t.sayfalar).toEqual([]);
    expect(t.uyarilar?.[0]).toMatch(/çok fazla dosya/);
  });
});

describe("XML varlık saldırısı", () => {
  const milyarKahkaha = `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]>`;

  it("DTD içeren XML reddedilir", () => {
    expect(() => xmlAyristir(`${milyarKahkaha}<a>&lol2;</a>`)).toThrow(XmlHatasi);
    expect(() => xmlAyristir('<!DOCTYPE a SYSTEM "file:///etc/passwd"><a/>')).toThrow(XmlHatasi);
  });

  it("DTD'li DOCX çökmeden uyarılı boş sonuç verir; varlık genişlemez", async () => {
    const v = zip({
      "[Content_Types].xml": "<x/>",
      "word/document.xml": `${milyarKahkaha}<w:document ${W_NS_ATTR}><w:body><w:p><w:r><w:t>&lol2;</w:t></w:r></w:p></w:body></w:document>`,
    });
    const b = await metinCikar(v, { ad: "a.docx" });
    expect(b.bolumler).toEqual([]);
    expect(JSON.stringify(b)).not.toContain("lollol");
    expect(b.uyarilar[0]).toMatch(/güvenli olmayan/);
  });

  it("öntanımlı ve sayısal varlıklar çözülür, bilinmeyenler olduğu gibi kalır", () => {
    const x = xmlAyristir('<a t="&quot;x&quot;">&lt;&#305;&#x15F;&foo;<![CDATA[<ham>]]><!-- yorum --></a>');
    expect(x.oz.t).toBe('"x"');
    expect(x.cocuklar.join("")).toBe("<ış&foo;<ham>");
  });

  it("bozuk XML hata verir", () => {
    expect(() => xmlAyristir("<a><b></a>")).toThrow(XmlHatasi);
    expect(() => xmlAyristir("<a>")).toThrow(XmlHatasi);
    expect(() => xmlAyristir("")).toThrow(XmlHatasi);
  });
});

describe("PDF zaman aşımı", () => {
  it("bitmeyen iş zaman sınırında kesilir", async () => {
    await expect(zamanSinirli(new Promise(() => {}), 10)).rejects.toBeInstanceOf(ZamanAsimi);
    await expect(zamanSinirli(Promise.resolve(5), 1000)).resolves.toBe(5);
  });

  it("normal PDF süre sınırı içinde okunur", async () => {
    const b = await metinCikar(pdfOlustur([["a".repeat(50)]]), {}, { zamanAsimiMs: 10_000 });
    expect(b.bolumler[0]?.metin).toBe("a".repeat(50));
  });
});

describe("bozuk girdiler çökmez", () => {
  it.each([
    ["docx", docxHam("<w:p><w:r>")],
    ["xlsx", zip({ "[Content_Types].xml": "<x/>", "xl/workbook.xml": "bozuk" })],
    ["pptx", zip({ "[Content_Types].xml": "<x/>", "ppt/presentation.xml": "<p:presentation><" })],
  ])("%s", async (_ad, v) => {
    const b = await metinCikar(v);
    expect(b.bolumler).toEqual([]);
    expect(b.uyarilar.length).toBeGreaterThan(0);
  });
});
