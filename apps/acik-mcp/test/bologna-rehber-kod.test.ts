// Bologna rehberi (ALANLAR) ile cekirdek'in "guncel" kural seti birebir aynı kalmalı (kurucu kararı: kod esastır).
// Biri değişip öteki unutulursa bu test kırılır.
import { type DenetlenecekTaslak, taslakDenetle } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { ALANLAR, bulguAlani } from "../src/bologna.ts";

/** Rehberdeki sayısal sınırlar; eksik ya da sayı olmayan sınır testi kırar. */
const sinirlar = (s: Record<string, number | string> | undefined) =>
  new Proxy(
    {} as Record<
      | "enAz"
      | "enCok"
      | "enAzCikti"
      | "enCokCikti"
      | "onerilenEnAz"
      | "onerilenEnCok"
      | "enAzHafta"
      | "enCokHafta"
      | "enAzKelime",
      number
    >,
    {
      get: (_, k: string) => {
        const v = s?.[k];
        if (typeof v !== "number") throw new Error(`Rehberde sayısal sınır yok: ${k}`);
        return v;
      },
    },
  );
const denetle = (t: DenetlenecekTaslak) => taslakDenetle(t, { kuralSeti: "guncel" }).bulgular;
const kelimeler = (n: number) => Array.from({ length: n }, (_, i) => `kelime${i}`).join(" ");
const tumKurallar = Object.values(ALANLAR).flatMap((a) => [...a.kurallar, ...a.yasaklar]);
const rehberKodlari = new Set(tumKurallar.flatMap((k) => [...k.matchAll(/\bK(\d+)\b/gu)].map((m) => `K${m[1]}`)));

// Her K kodu için cekirdek'te o kodla bulgu üreten örnek girdi.
const ORNEK: Record<string, DenetlenecekTaslak> = {
  K2: { amac: { tr: kelimeler(10), en: kelimeler(10) } },
  K3: { notlar: { tr: "-", en: "-" } },
  K4: { ciktilar: [{ kod: "Ö1", tr: "Konuyu öğrenir.", en: "x", tur: "Bilgi" }] },
  K5: { ciktilar: [] },
  K6: { dersYapisi: [{ ad: "Alan Bilgisi", yuzde: 50 }] },
  K7: { ska: [4] },
  K8: { akts: 5, isyuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3 }] },
  K9: { haftalar: [{ hafta: 1, konu: { tr: kelimeler(8), en: "x" }, onHazirlik: "", dokuman: "" }] },
  K12: { programCiktilari: ["P1"], ciktilar: [{ kod: "Ö1", tr: "Açıklar.", en: "x", tur: "Beceri" }], katki: {} },
} as unknown as Record<string, DenetlenecekTaslak>;

describe("Bologna rehberi ile kod", () => {
  it("rehberdeki her K kodu cekirdek'te bulgu üretir ve MCP'de atılmaz", () => {
    expect([...rehberKodlari].sort()).toEqual(Object.keys(ORNEK).sort());
    for (const kod of rehberKodlari) {
      const b = denetle(ORNEK[kod] ?? {}).filter((x) => x.kural === kod);
      expect(b.length, kod).toBeGreaterThan(0);
      for (const x of b) expect(["temel", "yetkililer"], kod).not.toContain(bulguAlani(x));
    }
  });

  it("denetlenmeyen K1, K10, K11 rehberde kural kodu olarak geçmez ve 'denetlemez' diye yazılır", () => {
    for (const k of ["K1", "K10", "K11"]) expect(rehberKodlari.has(k), k).toBe(false);
    // K10 bulgusu kodda var ama MCP onu yetkililer alanına bağlayıp atar.
    expect(bulguAlani({ duzey: "hata", kural: "K10", aciklama: "" })).toBe("yetkililer");
    for (const a of [ALANLAR.amac, ALANLAR.yontem, ALANLAR.yetkililer])
      expect(a.kurallar.some((k) => /denetlemez/u.test(k))).toBe(true);
  });

  it("'farkındalık' kodda uyarıdır, rehberde yasak değil uyarıdır", () => {
    const b = denetle({
      ciktilar: [{ kod: "Ö1", tr: "Etik konularda farkındalık geliştirir.", en: "x", tur: "Beceri" }],
    } as DenetlenecekTaslak);
    expect(b.find((x) => x.kural === "K4")?.duzey).toBe("uyari");
    expect(ALANLAR.ciktilar.yasaklar.join(" ")).not.toMatch(/farkındalık/u);
    expect(ALANLAR.ciktilar.kurallar.some((k) => /K4 \(uyarı\).*farkındalık/u.test(k))).toBe(true);
  });

  it("'cli' kural seti (8-12 çıktı) rehbere girmez", () => {
    expect(tumKurallar.join(" ")).not.toMatch(/8-12/u);
  });

  it("kelime sınırları kodla aynı", () => {
    for (const [alan, ad] of [
      ["amac", "Amaç"],
      ["icerik", "İçerik"],
      ["yontem", "Yöntem"],
    ] as const) {
      const { enAzKelime, enCokKelime } = ALANLAR[alan].sinir as { enAzKelime: number; enCokKelime: number };
      const k2 = (n: number) =>
        denetle({ [alan]: { tr: kelimeler(n), en: kelimeler(n) } }).some(
          (b) => b.kural === "K2" && b.aciklama.startsWith(ad),
        );
      expect([k2(enAzKelime - 1), k2(enAzKelime), k2(enCokKelime), k2(enCokKelime + 1)], alan).toEqual([
        true,
        false,
        false,
        true,
      ]);
    }
  });

  it("çıktı sayısı sınırları kodla aynı", () => {
    const { enAzCikti, enCokCikti, onerilenEnAz, onerilenEnCok } = sinirlar(ALANLAR.ciktilar.sinir);
    const k5 = (n: number) =>
      denetle({
        ciktilar: Array.from({ length: n }, (_, i) => ({
          kod: `Ö${i + 1}`,
          tr: "Açıklar.",
          en: "x",
          tur: i ? "Beceri" : "Yetkinlik",
        })),
      } as DenetlenecekTaslak)
        .filter((b) => b.kural === "K5" && /öğrenme çıktısı var/u.test(b.aciklama))
        .map((b) => b.duzey)[0] ?? "yok";
    expect(k5(enAzCikti - 1)).toBe("hata");
    expect(k5(enAzCikti)).toBe("uyari");
    expect(k5(onerilenEnAz)).toBe("yok");
    expect(k5(onerilenEnCok)).toBe("yok");
    expect(k5(enCokCikti)).toBe("uyari");
    expect(k5(enCokCikti + 1)).toBe("hata");
  });

  it("hafta sınırları kodla aynı", () => {
    const { enAzHafta, enCokHafta, enAzKelime } = sinirlar(ALANLAR.haftalar.sinir);
    const hafta = (n: number, k = 8) =>
      denetle({
        haftalar: Array.from({ length: n }, (_, i) => ({
          hafta: i + 1,
          konu: { tr: kelimeler(k), en: "x" },
          onHazirlik: "x",
          dokuman: "x",
        })),
      } as DenetlenecekTaslak).filter((b) => b.kural === "Ders akışı" && b.duzey === "hata");
    expect(hafta(enAzHafta - 1).length).toBeGreaterThan(0);
    expect(hafta(enAzHafta)).toEqual([]);
    expect(hafta(enCokHafta)).toEqual([]);
    expect(hafta(enCokHafta + 1).length).toBeGreaterThan(0);
    expect(hafta(enAzHafta, enAzKelime - 1).length).toBeGreaterThan(0);
  });

  it("SKA, katkı ve iş yükü sınırları kodla aynı", () => {
    const { enAz, enCok } = sinirlar(ALANLAR.ska.sinir);
    const k7 = (n: number) =>
      denetle({ ska: Array.from({ length: n }, (_, i) => i + 1) }).some((b) => b.kural === "K7");
    expect([k7(enAz - 1), k7(enAz), k7(enCok), k7(enCok + 1)]).toEqual([true, false, false, true]);

    const katki = sinirlar(ALANLAR.katki.sinir);
    const k12 = (v: number) =>
      denetle({
        programCiktilari: ["P1"],
        ciktilar: [{ kod: "Ö1", tr: "Açıklar.", en: "x", tur: "Beceri" }],
        katki: { Ö1: { P1: v } },
      } as unknown as DenetlenecekTaslak).some((b) => b.kural === "K12");
    expect([k12(katki.enAz - 1), k12(katki.enAz), k12(katki.enCok), k12(katki.enCok + 1)]).toEqual([
      true,
      false,
      false,
      true,
    ]);

    // 25-30 saat/AKTS: 2 AKTS için 50-60 saat.
    expect(ALANLAR.isyuku.sinir?.aralik).toBe("25-30 saat/AKTS");
    const k8 = (saat: number) =>
      denetle({ akts: "2", isyuku: [{ ad: "Çalışma", sayi: 1, sure: saat }] } as unknown as DenetlenecekTaslak).some(
        (b) => b.kural === "K8",
      );
    expect([k8(49), k8(50), k8(60), k8(61)]).toEqual([true, false, false, true]);
    expect(taslakDenetle({ akts: "2" } as unknown as DenetlenecekTaslak, { kuralSeti: "guncel" }).hedefAraligi).toEqual(
      [50, 60],
    );
  });
});
