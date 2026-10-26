import { describe, expect, it } from "vitest";
import type { BolognaOkunanDers, BolognaVerisi, Bulgu } from "../src/index.ts";
import { bolognaDenetle } from "../src/index.ts";
import { type CliBulgu, cliBologna } from "./cli.ts";

// apps/cli/test/bologna.test.mjs içindeki ders sayfası; HTML ayrıştırma İP-05'te taşınacak, burada CLI kullanılır.
const hucre = (x: string) => `<td data-label="&lt;b>No&lt;/b>" onclick="if(a>b){x()}">${x}</td>`;
const tablo = (satirlar: string[][]) =>
  `<table>${satirlar.map((r) => `<tr>${r.map(hucre).join("")}</tr>`).join("")}</table>`;
const dersHtml = [
  tablo([
    ["Yarıyıl", "Kodu", "Adı", "T+U+L", "Kredi", "AKTS", "Son Güncelleme Tarihi"],
    ["3", "TBP201", "İNTERNET PROGRAMLAMA", "2+1+0", "0", "5", "19.09.2026"],
  ]),
  tablo([["Dersin Dili", "Türkçe"]]),
  tablo([
    ["Yarıyıl Çalışmaları", "Sayısı", "Katkı"],
    ["Ara Sınav", "1", "% 40"],
    ["Yarıyıl Sonu Sınavı", "1", "% 50"],
    ["Toplam :", "2", "% 100"],
  ]),
  tablo([
    ["İş Yükü", "Sayısı", "Süre", "Toplam İş Yükü (Saat)"],
    ["Ders Süresi", "14", "3", "42"],
    ["Ödevler", "14", "3", "42"],
    ["AKTS Kredisi : 3", "", "", "3"],
  ]),
  tablo([
    ["Sıra No", "Açıklama"],
    ["1", "HTML sayfası tasarlar."],
    ["2", "CSS uygular."],
  ]),
  tablo([["Hafta", "Konu"], ...Array.from({ length: 14 }, (_, i) => [String(i + 1), `Konu ${i + 1}`])]),
  tablo([
    ["", "P1", "P2"],
    ["Tüm", "4", "2"],
    ["Ö1", "3", "2"],
    ["Be2", "3", "1"],
    ["Ye3", "2", "1"],
  ]),
].join("");

const matrisDersi = (kod: string, zorunlu: boolean, degerler: Record<string, string>) => ({
  kod,
  ad: kod,
  zorunlu,
  grup: null,
  yariyil: 1,
  grupBasligi: false,
  degerler,
});

function cliVerisi(): BolognaVerisi {
  const d = { ...cliBologna.dersSayfasiCoz(dersHtml), zorunlu: true, bos: false, kaynak: "ornek" } as BolognaOkunanDers;
  return {
    adres: "https://obs.ornek.edu.tr/bologna/?curSunit=1",
    okundu: "2026-10-26T00:00:00.000Z",
    programCiktilari: [
      { kod: "P1", metin: "a" },
      { kod: "P2", metin: "b" },
    ],
    tyycIsaret: 0,
    matris: {
      pkodlar: ["P1", "P2"],
      dersler: [
        matrisDersi("TBP201", true, { P1: "3", P2: "2" }),
        matrisDersi("TBP999", true, { P1: "-", P2: "" }),
        matrisDersi("OSD101", false, { P1: "", P2: "" }),
      ],
    },
    dersler: [
      d,
      {
        kod: "OSD101",
        zorunlu: false,
        bos: true,
        kaynak: "",
        yariyil: null,
        kredi: null,
        akts: null,
        bilgiler: {},
        degerlendirme: [],
        isyuku: [],
        dersYapisi: [],
        ciktilar: [],
        haftalar: 0,
        katki: {},
      },
    ],
  };
}

const cliyeCevir = (b: Bulgu[]): CliBulgu[] =>
  b.map((x) => ({ duzey: x.duzey, ders: x.konu ?? "", kural: x.kural, aciklama: x.aciklama }));

// Güncellik kuralı CLI'de gerçek saatle çalışır. 19.09.2026 bugünden 12 aydan yeni olduğu sürece iki taraf da
// bulgu üretmez; eşdeğerlikte TS tarafına aynı tarihe yakın sabit bir zaman verilir.
const SIMDI = "2026-10-26T00:00:00.000Z";

describe("Bologna paket denetimi", () => {
  it("CLI denetle ile aynı bulguları üretir (eşdeğerlik)", () => {
    const veri = cliVerisi();
    expect(cliyeCevir(bolognaDenetle(veri, { simdi: SIMDI }))).toEqual(cliBologna.denetle(veri));
  });

  it("CLI testindeki kurallar", () => {
    const b = bolognaDenetle(cliVerisi(), { simdi: SIMDI });
    const kural = (k: string, ders?: string) => b.find((x) => x.kural === k && (!ders || x.konu === ders));
    expect(kural("tyyc")).toBeTruthy();
    expect(kural("matris-bos", "TBP999")?.duzey).toBe("hata");
    expect(kural("bos-sayfa", "OSD101")?.duzey).toBe("uyari");
    // 84 saat / 5 AKTS = 16.8 saat
    expect(kural("akts-isyuku", "TBP201")?.aciklama).toMatch(/16\.8 saat/);
    // 40 + 50 = 90
    expect(kural("degerlendirme", "TBP201")?.aciklama).toMatch(/%90/);
    expect(kural("kredi", "TBP201")).toBeTruthy();
    expect(kural("matris-tutarlilik", "TBP201")?.aciklama).toMatch(/P1 4\/3/);
    expect(kural("katki-destegi", "TBP201")?.aciklama).toMatch(/P1 \(genel 4, en yüksek 3\)/);
    expect(b.filter((x) => x.konu === "OSD101").length).toBe(1);
    expect(b.find((x) => x.kural === "ders-ciktisi" && x.konu === "TBP201")?.aciklama).toMatch(
      /Ö3 öğrenme çıktıları listesinde görünmüyor/,
    );
  });

  it("diğer kurallar CLI ile eşdeğer: boş program, ayrımsız matris, okunamayan ders, kısa hafta, eksik tablolar", () => {
    const veri = cliVerisi();
    veri.programCiktilari = [];
    veri.tyycIsaret = null;
    veri.matris.dersler.push(matrisDersi("TBP300", true, { P1: "4", P2: "4", P3: "4", P4: "4", P5: "4" }), {
      ...matrisDersi("[G] SEC", false, {}),
      grupBasligi: true,
    });
    const d = veri.dersler[0] as BolognaOkunanDers;
    veri.dersler.push(
      { kod: "TBP400", hata: "HTTP 500" },
      {
        ...d,
        kod: "TBP500",
        isyuku: [],
        degerlendirme: [],
        dersYapisi: [{ alan: "a", yuzde: 70 }],
        ciktilar: [],
        haftalar: 10,
        katki: {},
      },
      {
        ...d,
        kod: "TBP600",
        isyuku: [{ ad: "x", sayi: 1, sure: 1, toplam: 140 }],
        degerlendirme: [{ ad: "y", sayi: 1, katki: 100 }],
        guncelleme: "01.01.2024",
      },
      { ...d, kod: "OSD102", zorunlu: false, bos: true },
    );
    const ts = bolognaDenetle(veri, { simdi: SIMDI });
    expect(cliyeCevir(ts)).toEqual(cliBologna.denetle(veri));
    expect(ts.find((b) => b.kural === "guncellik")?.konu).toBe("TBP600");
    expect(ts.find((b) => b.kural === "matris-ayrimsiz")?.konu).toBe("TBP300");
  });

  it("zaman verilmezse güncellik kuralı çalışmaz; sayı olarak da verilebilir", () => {
    const veri = cliVerisi();
    (veri.dersler[0] as BolognaOkunanDers).guncelleme = "01.01.2020";
    expect(bolognaDenetle(veri).some((b) => b.kural === "guncellik")).toBe(false);
    expect(bolognaDenetle(veri, { simdi: Date.parse(SIMDI) }).some((b) => b.kural === "guncellik")).toBe(true);
    // 12 ay sınırı: 30 günlük aylarla 360 gün. 365 gün sonra uyarı, 300 gün sonra yok.
    (veri.dersler[0] as BolognaOkunanDers).guncelleme = "01.01.2026";
    expect(bolognaDenetle(veri, { simdi: "2026-10-28T00:00:00Z" }).some((b) => b.kural === "guncellik")).toBe(false);
    expect(bolognaDenetle(veri, { simdi: "2027-01-01T00:00:00Z" }).some((b) => b.kural === "guncellik")).toBe(true);
  });

  it("AKTS saat aralığı seçeneği", () => {
    // 84 / 5 = 16.8; aralık 15-20 olunca hata yok.
    const b = bolognaDenetle(cliVerisi(), { aktsSaat: [15, 20], simdi: SIMDI });
    expect(b.some((x) => x.kural === "akts-isyuku")).toBe(false);
  });
});
