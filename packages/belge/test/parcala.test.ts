import { describe, expect, it } from "vitest";
import { metinCikar, parcala } from "../src/index.ts";
import { metniBol } from "../src/parcala.ts";
import type { BelgeMetni } from "../src/turler.ts";
import { pdfOlustur } from "./pdf-yardimci.ts";

function belge(kismi: Partial<BelgeMetni>): BelgeMetni {
  return {
    tur: "metin",
    ozet: "0".repeat(64) as BelgeMetni["ozet"],
    bolumler: [],
    tablolar: [],
    ocrGerekli: false,
    uyarilar: [],
    ...kismi,
  };
}

const paragraf = (i: number, n: number) => `Paragraf ${i}: ${"öğrenci çıktısı ".repeat(n)}`.trim();

describe("parcala", () => {
  it("paragraf sınırına saygılı, hedefe yakın, en büyüğü aşmaz, çapa korunur", () => {
    // Her paragraf "Paragraf i: " (12-13) + 16*30 - 1 = ~491 karakter; hedef 1000 → iki paragraf bir parçada.
    const metin = Array.from({ length: 6 }, (_, i) => paragraf(i, 30)).join("\n\n");
    const p = parcala(belge({ bolumler: [{ capa: { sayfa: 4 }, metin }] }));
    expect(p.length).toBe(3);
    for (const x of p) {
      expect(x.capa).toEqual({ sayfa: 4 });
      expect(x.metin.length).toBeLessThanOrEqual(1000);
      // Hiçbir paragraf ortadan bölünmez: her parça "Paragraf" ile başlar ve tam paragraflardan oluşur.
      for (const s of x.metin.split("\n")) expect(s).toMatch(/^Paragraf \d: (öğrenci çıktısı ?)+$/);
    }
    expect(p.map((x) => x.sira)).toEqual([0, 1, 2]);
  });

  it("uzun tek paragraf cümleden, gerekirse boşluktan bölünür; sınır aşılmaz", () => {
    const cumleler = Array.from({ length: 40 }, (_, i) => `Bu ${i}. cümledir ve ölçütle ilgilidir.`).join(" ");
    const kelime = "çok ".repeat(800);
    const p = parcala(belge({ bolumler: [{ capa: { bolum: "Giriş" }, metin: `${cumleler}\n${kelime}` }] }), {
      hedefUzunluk: 300,
      enBuyukUzunluk: 400,
    });
    for (const x of p) expect(x.metin.length).toBeLessThanOrEqual(400);
    // Cümle parçaları cümle sonunda biter.
    expect(p[0]?.metin.endsWith(".")).toBe(true);
    expect(
      p
        .map((x) => x.metin)
        .join(" ")
        .replace(/\s+/g, " "),
    ).toBe(`${cumleler} ${kelime}`.replace(/\s+/g, " ").trim());
  });

  it("sayfa sınırı aşılmaz: kısa sayfalar birleştirilmez", async () => {
    const b = await metinCikar(pdfOlustur([["Birinci sayfa."], ["İkinci sayfa."], ["Üçüncü sayfa."]]));
    const p = parcala(b);
    expect(p.map((x) => [x.capa.sayfa, x.metin])).toEqual([
      [1, "Birinci sayfa."],
      [2, "İkinci sayfa."],
      [3, "Üçüncü sayfa."],
    ]);
  });

  it("başlık ilk parçaya eklenir", () => {
    const p = parcala(
      belge({ bolumler: [{ capa: { bolum: "Amaç" }, baslik: "Amaç", duzey: 1, metin: "Kısa metin." }] }),
    );
    expect(p).toEqual([{ sira: 0, capa: { bolum: "Amaç" }, metin: "Amaç\nKısa metin." }]);
  });

  it("tablo satırı bölünmez, başlık satırı her parçada tekrar eder, hücre çapası daraltılır", () => {
    const satirlar = [
      ["No", "Ad", "Puan"],
      ...Array.from({ length: 30 }, (_, i) => [`${i + 1}`, `Öğrenci ${i + 1} ${"x".repeat(20)}`, 50 + i]),
    ];
    const t = { capa: { hucre: "Notlar!A1:C31" }, ad: "Notlar", satirlar };
    const p = parcala(
      belge({ tablolar: [t], bolumler: [{ capa: { hucre: "Notlar!A1:C31" }, baslik: "Notlar", metin: "kopya" }] }),
      {
        hedefUzunluk: 300,
        enBuyukUzunluk: 400,
      },
    );
    // Okunabilir metin bölümü (aynı çapa) tekrar edilmez.
    expect(p.some((x) => x.metin.includes("kopya"))).toBe(false);
    expect(p.length).toBeGreaterThan(1);
    const gorulen: string[] = [];
    for (const x of p) {
      expect(x.metin.length).toBeLessThanOrEqual(400);
      const s = x.metin.split("\n");
      expect(s[0]).toBe("Notlar");
      expect(s[1]).toBe("No | Ad | Puan");
      for (const r of s.slice(2)) {
        expect(r).toMatch(/^\d+ \| Öğrenci \d+ x{20} \| \d+$/);
        gorulen.push(r);
      }
    }
    expect(gorulen.length).toBe(30);
    // İlk parça 2. satırdan başlar (1. satır başlık): "Notlar!A2:C…".
    expect(p[0]?.capa.hucre).toMatch(/^Notlar!A2:C\d+$/);
    const son = p[p.length - 1]?.capa.hucre;
    expect(son).toMatch(/:C31$/);
  });

  it("tek başına sığmayan satır bölünmeden kendi parçası olur", () => {
    const t = {
      capa: { bolum: "Ek" },
      satirlar: [
        ["a", "b"],
        ["kısa", "1"],
        ["uzun", "y".repeat(500)],
      ],
    };
    const p = parcala(belge({ tablolar: [t] }), { hedefUzunluk: 100, enBuyukUzunluk: 200 });
    expect(p.map((x) => x.metin)).toEqual(["a | b\nkısa | 1", `uzun | ${"y".repeat(500)}`]);
    expect(p[1]?.capa).toEqual({ bolum: "Ek", satir: 3 });
  });

  it("metniBol boş metinde boş liste", () => {
    expect(metniBol("  \n\n ", 100, 200)).toEqual([]);
  });
});
