import { describe, expect, it } from "vitest";
import {
  boyutYaz,
  gunFarki,
  islemeMetni,
  kisayolEylemi,
  matrisHucreYazisi,
  metinAramaAnahtari,
  riskeGoreGrupla,
  sinirla,
  sirala,
  sureYaz,
  tarihYaz,
  yuzdeYaz,
} from "./yardimci.ts";

describe("yardımcılar", () => {
  it("işleme durumu metni duruma göre Türkçe ve hattın iletisini taşır", () => {
    expect(islemeMetni({ durum: "hata", asama: "cikarma", ileti: "Dosya okunamadı." })).toBe(
      "İşlenemedi: Dosya okunamadı.",
    );
    expect(islemeMetni({ durum: "gomme_tamam", asama: "tamam", ileti: null })).toBe("İşlendi");
    expect(islemeMetni({ durum: "ocr_gerekli", asama: "ocr", ileti: null })).toBe(
      "Taranmış belge, metnin okunması bekleniyor",
    );
    expect(islemeMetni({ durum: "bekliyor", asama: "alindi", ileti: null })).toBe("İşleniyor");
  });

  it("arama anahtarı Türkçe büyük harf ve aksanları sadeleştirir", () => {
    expect(metinAramaAnahtari("  ÖĞRENCİ   Işık ")).toBe("ogrenci isik");
  });

  it("tarih yazımı", () => {
    expect(tarihYaz("2026-10-31")).toBe("31 Ekim 2026");
    expect(tarihYaz("2026-02-01T23:00:00.000Z")).toBe("1 Şubat 2026");
    expect(tarihYaz("bozuk")).toBe("bozuk");
  });

  it("gün farkı", () => {
    expect(gunFarki("2026-10-27", "2026-10-31")).toBe(4);
    expect(gunFarki("2026-10-27T09:00:00Z", "2026-10-20")).toBe(-7);
  });

  it("yüzde, boyut ve süre", () => {
    expect(yuzdeYaz(0.866)).toBe("%87");
    expect(yuzdeYaz(null)).toBe("Yok");
    expect(boyutYaz(512)).toBe("512 B");
    expect(boyutYaz(12_697)).toBe("12,4 KB"); // 12697 / 1024 = 12,399...
    expect(sureYaz(45)).toBe("45 dk");
    expect(sureYaz(85)).toBe("1 sa 25 dk");
    expect(sureYaz(120)).toBe("2 sa");
  });

  it("risk gruplaması yüksekten düşüğe sıralı ve boş grupları korur", () => {
    const g = riskeGoreGrupla([{ risk: "dusuk" as const }, { risk: "yuksek" as const }]);
    expect(g.map((x) => [x.risk, x.ogeler.length])).toEqual([
      ["yuksek", 1],
      ["orta", 0],
      ["dusuk", 1],
    ]);
  });

  it("Türkçe alfabeyle ve sayısal sıralar, eşitlikte sırayı korur", () => {
    const ad = (x: { ad: string }) => x.ad;
    expect(sirala([{ ad: "Çay" }, { ad: "Cam" }, { ad: "Dal" }], ad, "artan").map(ad)).toEqual(["Cam", "Çay", "Dal"]);
    expect(sirala([{ ad: "Ö-10" }, { ad: "Ö-2" }], ad, "artan").map(ad)).toEqual(["Ö-2", "Ö-10"]);
    expect(sirala([3, 1, 2], (x) => x, "azalan")).toEqual([3, 2, 1]);
    const es = [
      { ad: "a", n: 1 },
      { ad: "b", n: 1 },
    ];
    expect(sirala(es, (x) => x.n, "azalan").map((x) => x.ad)).toEqual(["a", "b"]);
  });

  it("kısayollar", () => {
    expect(kisayolEylemi("j")).toBe("sonraki");
    expect(kisayolEylemi("k")).toBe("onceki");
    expect(kisayolEylemi("a")).toBe("onayla");
    expect(kisayolEylemi("d")).toBe("duzelt");
    expect(kisayolEylemi("r")).toBe("reddet");
    expect(kisayolEylemi("x")).toBe("sec");
    expect(kisayolEylemi("a", true)).toBeNull();
    expect(kisayolEylemi("z")).toBeNull();
  });

  it("matris hücresi hem sayı hem açıklama verir", () => {
    expect(matrisHucreYazisi({ tur: "puan", puan: 4 })).toEqual({ kisa: "4", uzun: "Katkı 4 / 5", seviye: 4 });
    expect(matrisHucreYazisi({ tur: "iliskisiz" }).uzun).toBe("İlişki yok");
    expect(matrisHucreYazisi({ tur: "yetersiz_kanit" }).kisa).toBe("?");
  });

  it("sınırla", () => {
    expect(sinirla(5, 0, 3)).toBe(3);
    expect(sinirla(-1, 0, 3)).toBe(0);
  });
});
