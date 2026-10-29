import { describe, expect, it } from "vitest";
import {
  type EsikAltiOlcum,
  istisnalariKumele,
  katmanBelirle,
  nihaiOnayKapisi,
  type Oneri,
  onayYorgunlugu,
  onlemMetniGecerliMi,
  pukoKapanisi,
  sureliOnayUygunMu,
  topluOnayaUygunMu,
  yoneticiOzeti,
  zorunluKararDenetle,
} from "../src/index.ts";

const oneri = (tur: string, risk = "dusuk") => ({ tur, risk }) as Pick<Oneri, "tur" | "risk">;

describe("katmanBelirle", () => {
  it("kaynakta onaylı birincil veri katman 0", () => {
    const s = katmanBelirle({ tur: "birincil_veri", kaynakSistem: "obs", kaynaktaOnayli: true });
    expect(s).toMatchObject({ katman: 0, kural: "K0-kaynakta-onayli", devredilemez: false });
    expect(s.gerekce).toContain("kaynak sistem");
  });
  it("kaynakta onaysız veri katman 1", () => {
    expect(katmanBelirle({ tur: "birincil_veri", kaynakSistem: "avesis", kaynaktaOnayli: false }).katman).toBe(1);
  });
  it("eşiğe eşit ölçüm geçer (katman 0), altı katman 2, ölçülemeyen katman 2", () => {
    expect(katmanBelirle({ tur: "olcum", olcumTuru: "ck", deger: 60, esik: 60 }).katman).toBe(0);
    const alt = katmanBelirle({ tur: "olcum", olcumTuru: "pc", deger: 59.99, esik: 60 });
    expect(alt).toMatchObject({ katman: 2, kural: "K2-esik-alti", devredilemez: true });
    expect(katmanBelirle({ tur: "olcum", olcumTuru: "ck", deger: null, esik: 60 }).kural).toBe("K2-olculemedi");
    expect(katmanBelirle({ tur: "olcum", olcumTuru: "ck", deger: Number.NaN, esik: 60 }).katman).toBe(2);
  });
  it("yüksek türler, nihai rapor, müfredat ve eşik altı önlem katman 2 (politika olsa bile)", () => {
    for (const tur of ["olgunluk_duzeyi", "dis_gonderim", "yazma_plani"])
      expect(
        katmanBelirle({ tur: "oneri", oneri: oneri(tur), politikaUygulanir: true, farkOzetiVar: true }).katman,
      ).toBe(2);
    const temel = { tur: "oneri" as const, politikaUygulanir: true, farkOzetiVar: true };
    expect(katmanBelirle({ ...temel, oneri: oneri("rapor_bolumu"), nihaiRapor: true }).kural).toBe("K2-nihai-rapor");
    expect(katmanBelirle({ ...temel, oneri: oneri("bologna_taslagi"), mufredatDegisikligi: true }).kural).toBe(
      "K2-mufredat",
    );
    expect(katmanBelirle({ ...temel, oneri: oneri("eylem"), esikAltiOnlem: true }).kural).toBe("K2-esik-alti-onlem");
    expect(katmanBelirle({ ...temel, oneri: oneri("kanit_etiketi", "yuksek") }).kural).toBe("K2-yuksek-risk");
  });
  it("katman 1: politika ve fark özeti varsa süreli varsayılan onay", () => {
    const tam = katmanBelirle({
      tur: "oneri",
      oneri: oneri("bologna_taslagi"),
      politikaUygulanir: true,
      farkOzetiVar: true,
    });
    expect(tam).toMatchObject({ katman: 1, kural: "K1-sureli-varsayilan" });
    expect(sureliOnayUygunMu(tam)).toBe(true);
    const farksiz = katmanBelirle({ tur: "oneri", oneri: oneri("bologna_taslagi"), politikaUygulanir: true });
    expect(farksiz.kural).toBe("K1-fark-ozeti-yok");
    expect(sureliOnayUygunMu(farksiz)).toBe(false);
    expect(katmanBelirle({ tur: "oneri", oneri: oneri("kanit_etiketi"), politikaUygulanir: false }).kural).toBe(
      "K1-politika-yok",
    );
  });
  it("deterministik: aynı girdi aynı sonuç", () => {
    const g = { tur: "olcum" as const, olcumTuru: "pc" as const, deger: 41, esik: 50 };
    expect(katmanBelirle(g)).toEqual(katmanBelirle({ ...g }));
  });
  it("katman 2 devredilemez ve toplu verilemez", () => {
    const s = katmanBelirle({ tur: "olcum", olcumTuru: "pc", deger: 10, esik: 50 });
    expect(topluOnayaUygunMu(s)).toBe(false);
    expect(zorunluKararDenetle(s, { dayanak: "politika", kararVeren: "Ayşe Örnek" }).gecerli).toBe(false);
    expect(zorunluKararDenetle(s, { dayanak: "sure", kararVeren: "Ayşe Örnek" }).gecerli).toBe(false);
    expect(zorunluKararDenetle(s, { dayanak: "dogrudan", kararVeren: "Ayşe Örnek", toplu: true }).gecerli).toBe(false);
    expect(zorunluKararDenetle(s, { dayanak: "dogrudan", kararVeren: " " }).gecerli).toBe(false);
    expect(zorunluKararDenetle(s, { dayanak: "dogrudan", kararVeren: "Ayşe Örnek" }).gecerli).toBe(true);
  });
});

const olc = (dersKodu: string, kod: string, deger: number | null, olcumTuru: "ck" | "pc" = "pc"): EsikAltiOlcum => ({
  olcumTuru,
  kod,
  dersKodu,
  donem: "2026-2027 Güz",
  deger,
  esik: 60,
  kaynak: { hesapSurumu: "olcme-1.0.0" },
});

describe("istisnalariKumele", () => {
  it("aynı PÇ'de eşik altı üç ders tek küme; eşiği geçen dışarıda; sıralı", () => {
    const k = istisnalariKumele([
      olc("BP103", "PÇ3", 52),
      olc("BP101", "PÇ3", 40),
      olc("BP102", "PÇ3", 55),
      olc("BP104", "PÇ3", 70),
      olc("BP101", "PÇ1", 58),
      olc("BP101", "ÇK2", 30, "ck"),
    ]);
    expect(k.map((x) => x.anahtar)).toEqual([
      "ck|BP101|ÇK2|2026-2027 Güz",
      "pc|PÇ1|2026-2027 Güz",
      "pc|PÇ3|2026-2027 Güz",
    ]);
    const pc3 = k[2];
    expect(pc3?.olcumler.map((o) => o.dersKodu)).toEqual(["BP101", "BP102", "BP103"]);
    expect(pc3?.enDusuk).toBe(40);
    // Açıklar: 20, 5, 8 → ortalama 33/3 = 11
    expect(pc3?.ortalamaAcik).toBe(11);
    expect(pc3?.olculemeyenVar).toBe(false);
  });

  it("ölçülemeyen (null) ders de istisnadır; en düşük ve açık yalnız ölçülenlerden", () => {
    const k = istisnalariKumele([olc("BP101", "PÇ3", 40), olc("BP102", "PÇ3", null), olc("BP103", "PÇ3", 70)]);
    expect(k).toHaveLength(1);
    expect(k[0]?.olcumler.map((o) => o.dersKodu)).toEqual(["BP101", "BP102"]);
    expect(k[0]?.olculemeyenVar).toBe(true);
    // Yalnız BP101 ölçüldü: en düşük 40, açık 60 − 40 = 20.
    expect(k[0]?.enDusuk).toBe(40);
    expect(k[0]?.ortalamaAcik).toBe(20);
    const yalniz = istisnalariKumele([olc("BP102", "PÇ3", null)]);
    expect(yalniz[0]?.enDusuk).toBeNull();
    expect(yalniz[0]?.ortalamaAcik).toBeNull();
  });
});

describe("onlemMetniGecerliMi", () => {
  it("rakam içeren model metnini reddeder", () => {
    expect(onlemMetniGecerliMi("Uygulama saatini artır").gecerli).toBe(true);
    expect(onlemMetniGecerliMi("Başarıyı %20 artır").gecerli).toBe(false);
    expect(onlemMetniGecerliMi("Ödev sayısını ٣ yap").gecerli).toBe(false);
    expect(onlemMetniGecerliMi("  ").gecerli).toBe(false);
    expect(onlemMetniGecerliMi("a".repeat(281)).gecerli).toBe(false);
  });
});

describe("pukoKapanisi", () => {
  const once = [olc("BP101", "PÇ3", 40), olc("BP102", "PÇ3", 55)];
  it("hepsi eşiği geçerse iyileşti; farklar hesaptan", () => {
    const r = pukoKapanisi(
      once,
      new Map([
        ["BP101", 61],
        ["BP102", 60],
      ]),
    );
    expect(r.durum).toBe("kapandi_iyilesti");
    expect(r.karsilastirma.map((k) => k.fark)).toEqual([21, 5]);
  });
  it("biri eşik altında ya da ölçülmemişse iyileşmedi", () => {
    expect(
      pukoKapanisi(
        once,
        new Map([
          ["BP101", 61],
          ["BP102", 59],
        ]),
      ).durum,
    ).toBe("kapandi_iyilesmedi");
    const r = pukoKapanisi(once, new Map([["BP101", 61]]));
    expect(r.durum).toBe("kapandi_iyilesmedi");
    expect(r.karsilastirma[1]).toMatchObject({ sonra: null, fark: null, esigiGecti: false });
    expect(pukoKapanisi([], new Map()).durum).toBe("kapandi_iyilesmedi");
  });
});

describe("yoneticiOzeti ve nihai onay kapısı", () => {
  const g = [
    { kod: "G1", ad: "Mezun istihdamı", onceki: 50, simdiki: 58, kaynak: "anket" },
    { kod: "G2", ad: "PÇ3 sağlanma", onceki: 62, simdiki: 55, kaynak: "olcme" },
    { kod: "G3", ad: "Tez sayısı", onceki: 10, simdiki: 10.2, kaynak: "avesis" },
    { kod: "G4", ad: "Yeni gösterge", onceki: null, simdiki: 3, kaynak: "obs" },
  ];
  it("yükselen/düşen hesaptan; PÜKÖ sayıları", () => {
    const o = yoneticiOzeti(
      g,
      ["Dış paydaş katılımı"],
      ["acik", "kapandi_iyilesti", "kapandi_iyilesti", "onlem_secildi"],
    );
    expect(o.yukselen.map((x) => [x.kod, x.fark])).toEqual([["G1", 8]]);
    expect(o.dusen.map((x) => [x.kod, x.fark])).toEqual([["G2", -7]]);
    expect(o.degismeyen).toBe(1);
    expect(o.karsilastirilamayan).toBe(1);
    expect(o.puko).toEqual({ acik: 1, onlemSecildi: 1, iyilesti: 2, iyilesmedi: 0 });
    expect(o.imza).toMatch(/^[0-9a-f]{8}$/);
  });
  it("özet görülmeden ya da değiştikten sonra onay yok", () => {
    const o = yoneticiOzeti(g, [], []);
    expect(nihaiOnayKapisi(o, null).gecerli).toBe(false);
    expect(nihaiOnayKapisi(o, { imza: "00000000", zaman: "2026-10-28T10:00:00Z" }).gecerli).toBe(false);
    expect(nihaiOnayKapisi(o, { imza: o.imza, zaman: "2026-10-28T10:00:00Z" }).gecerli).toBe(true);
  });
});

describe("onayYorgunlugu", () => {
  it("küçük kümede gizli", () => {
    expect(onayYorgunlugu([{ katman: 2, sureMs: 1000, sonuc: "onaylandi" }]).gizli).toBe(true);
  });
  it("ortanca ve incelemeden onay oranı", () => {
    // Süreler: 500, 1500, 3000, 8000, 1000(ret), 12000 → sıralı 500,1000,1500,3000,8000,12000; ortanca (1500+3000)/2 = 2250 ms
    // İncelemeden onay: onaylanan ve < 2000 ms → 500, 1500 = 2 (1000 ms ret sayılmaz); oran 2/6
    const r = onayYorgunlugu([
      { katman: 1, sureMs: 500, sonuc: "onaylandi" },
      { katman: 1, sureMs: 1500, sonuc: "onaylandi" },
      { katman: 2, sureMs: 3000, sonuc: "onaylandi" },
      { katman: 2, sureMs: 8000, sonuc: "duzeltildi" },
      { katman: 2, sureMs: 1000, sonuc: "reddedildi" },
      { katman: 2, sureMs: 12000, sonuc: "onaylandi" },
    ]);
    expect(r).toEqual({
      kararSayisi: 6,
      ortancaSn: 2.25,
      incelemedenOnay: 2,
      incelemedenOnayOrani: 2 / 6,
      gizli: false,
    });
  });
});
