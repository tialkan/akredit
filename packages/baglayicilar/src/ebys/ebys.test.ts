import { readFileSync } from "node:fs";
import { tabloOku } from "@akredit/belge";
import { describe, expect, it } from "vitest";
import { evrakListesiOku, eypOku, tarihNormal, ustveriCoz } from "./ebys.ts";
import { zipOku, zipYaz } from "./zip.ts";

const ustveri = readFileSync(new URL("./test/fixtures/ustveri.xml", import.meta.url), "utf8");
const pdf = new TextEncoder().encode("%PDF-1.4 kurgu üst yazı");

describe("e-Yazışma paketi", () => {
  it("üstveriyi okur, üst yazı ve ekleri kanıt girdisine çevirir, paket iç dosyalarını atlar", () => {
    const paket = zipYaz({
      "[Content_Types].xml": "<Types/>",
      "_rels/.rels": "<Relationships/>",
      "Ustveri/Ustveri.xml": ustveri,
      "UstYazi/ustyazi.pdf": pdf,
      "Ekler/ek1.xlsx": new Uint8Array([1, 2, 3]),
      "Imzalar/imza.p7s": new Uint8Array([9]),
    });
    const r = eypOku(paket, "yazi.eyp");
    expect(r.ustveri).toEqual({
      konu: "Kurgu Bölümü Danışma Kurulu & Toplantı Tutanağı",
      tarih: "2025-03-14",
      sayi: "E-99999999-100-123456",
      gizlilik: "TSD",
    });
    expect(r.girdiler.map((g) => [g.dosyaAdi, g.mime])).toEqual([
      ["ustyazi.pdf", "application/pdf"],
      ["ek1.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ]);
    expect(r.girdiler[0]).toMatchObject({
      kaynakTuru: "baglayici",
      belgeTarihi: "2025-03-14",
      kaynakAyrinti: { baglayici: "ebys", paket: "yazi.eyp", yol: "UstYazi/ustyazi.pdf", sayi: "E-99999999-100-123456" },
    });
    expect(new TextDecoder().decode(r.girdiler[0]?.veri)).toBe("%PDF-1.4 kurgu üst yazı");
    expect(r.uyarilar).toEqual([]);
  });

  it("gizlilik dereceli paketi reddeder", () => {
    const paket = zipYaz({
      "Ustveri.xml": ustveri.replace("<tipler:GuvenlikKodu>TSD", "<tipler:GuvenlikKodu>Gizli"),
      "a.pdf": pdf,
    });
    expect(() => eypOku(paket, "g.eyp")).toThrow(/Gizlilik dereceli/);
  });

  it("üstverisiz paket uyarıyla okunur; DOCTYPE içeren üstveri reddedilir", () => {
    const r = eypOku(zipYaz({ "a.pdf": pdf }), "p.eyp");
    expect(r.uyarilar[0]).toMatch(/üstveri bulunamadı/);
    expect(() => ustveriCoz('<!DOCTYPE x [<!ENTITY a "b">]><Konu>&a;</Konu>')).toThrow(/güvensiz/);
  });

  it("ZIP güvenliği: yol geçişi, ZIP olmayan veri", () => {
    expect(() => zipOku(zipYaz({ "../kaçak.txt": "x" }))).toThrow(/güvensiz/);
    expect(() => zipOku(new Uint8Array([1, 2, 3]))).toThrow(/ZIP/);
    expect(() => zipOku(zipYaz({ "a.txt": "x".repeat(100_000) }), { enCokGirdi: 10, enBuyukToplam: 1e9, enBuyukOran: 10 })).toThrow(
      /çok büyük/,
    );
    const z = zipOku(zipYaz({ "k/ç.txt": "çalışır" }));
    expect(new TextDecoder().decode(z.get("k/ç.txt"))).toBe("çalışır");
  });

  it("tarih biçimleri", () => {
    expect(tarihNormal("14.03.2025")).toBe("2025-03-14");
    expect(tarihNormal("2/4/2025")).toBe("2025-04-02");
    expect(tarihNormal("2025-01-05T00:00")).toBe("2025-01-05");
    expect(tarihNormal("dün")).toBeNull();
  });
});

describe("EBYS evrak listesi", () => {
  it("kurgu CSV listesini okur, imzalayan kişi sütununu almaz", async () => {
    const csv = new Uint8Array(readFileSync(new URL("./test/fixtures/evrak-listesi.csv", import.meta.url)));
    const r = evrakListesiOku(await tabloOku(csv, { ad: "liste.csv" }));
    expect(r.kayitlar).toEqual([
      { sayi: "E-99999999-100-1", tarih: "2025-03-14", konu: "Danışma kurulu toplantısı", birim: "Kurgu Bölümü", satir: 3 },
      { sayi: "E-99999999-100-2", tarih: "2025-04-02", konu: "Program çıktıları güncellemesi", birim: "Kurgu Bölümü", satir: 4 },
      { sayi: "E-99999999-100-3", tarih: null, konu: "Ders dosyaları hatırlatma", birim: null, satir: 6 },
    ]);
    const json = JSON.stringify(r);
    for (const ad of ["Deneme Örnekoğlu", "Hayali Kişi", "Uydurma Ad"]) expect(json).not.toContain(ad);
    expect(evrakListesiOku({ sayfalar: [{ ad: "x", satirlar: [["a"]] }] }).uyarilar[0]).toMatch(/Konu sütunu/);
  });
});
