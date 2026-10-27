// Bologna (Proliz) canlı yapı testleri. Fixture'lar 2026-10-27'de EBYÜ Hukuk (curSunit=57) canlı sayfalarından
// birebir alınan işaretlemeyle üretildi (docs/baglayicilar/canli-dogrulama-2026-10-27/bologna-bulgular.md);
// kişi adları, e-posta ve metinler kurgudur. Ağ yoktur.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DisBaglam } from "../src/baglayici.ts";
import {
  dersKimlikleri,
  dersSayfasiCoz,
  EPOSTA_YERINE,
  epostaAyikla,
  programCiktilari,
  programMatrisi,
  tyycIsaretSayisi,
} from "../src/bologna-proliz/ayristir.ts";
import { programiOku } from "../src/bologna-proliz/oku.ts";

const fixture = (ad: string) => readFileSync(new URL(`./fixtures/bologna-canli/${ad}`, import.meta.url), "utf8");

describe("Bologna canlı yapı (EBYÜ, 2026-10-27)", () => {
  it("10 program çıktısı okunur", () => {
    const pc = programCiktilari(fixture("progLearnOutcomes.html"));
    expect(pc.map((p) => p.kod)).toEqual(["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10"]);
  });

  it("matris: sayısal ders kodları (1000.020105) ve yarıyıl başlığı okunur", () => {
    const m = programMatrisi(fixture("progCourseMatrix.html"));
    expect(m.pkodlar).toHaveLength(10);
    expect(m.dersler.map((d) => d.kod)).toEqual(["1000.020105", "1000.020107"]);
    expect(m.dersler[0]).toMatchObject({ yariyil: 1, zorunlu: true, grup: null, grupBasligi: false });
    expect(Object.values(m.dersler[0]?.degerler ?? {})).toEqual(["4", "4", "3", "4", "4", "3", "3", "3", "3", "3"]);
    expect(m.dersler[1]?.degerler.P10).toBe("5");
  });

  it("ders kimlikleri sayısal kodla eşlenir", () => {
    expect(dersKimlikleri(fixture("progCourses.html"))).toEqual({
      "1000.020105": "1106285",
      "1000.020107": "1106286",
    });
  });

  it("TYYÇ: 14/12 hücreli satırlar okunur; okunup boşsa 0, okunamadıysa null", () => {
    // Canlı örnekte P hücreleri boş: 9 alt satır × 10 P hücresi okunur, işaret yok → 0.
    expect(tyycIsaretSayisi(fixture("progTYYCMatrix.html"), 10)).toBe(0);
    // Satır yapısı tanınmıyorsa veri yok.
    expect(tyycIsaretSayisi("<table><tr><td>a</td></tr></table>", 10)).toBeNull();
    // 14 hücreli satırda P1..P10 = slice(2, 12); 12 hücreli satırda slice(1, 11). Burada P1 ve P10 işaretli → 2.
    const h = (r: string[]) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`;
    const dokuzBos = Array(9).fill("");
    const html = `<table>${h(Array(14).fill(""))}${h(["Bilgi", "1", "X", ...dokuzBos, "1", "Bilgi"])}${h(["2", ...dokuzBos, "X", "2"])}</table>`;
    expect(tyycIsaretSayisi(html, 10)).toBe(2);
  });

  it("ders sayfası: kredi, AKTS, değerlendirme, iş yükü, ÇK, hafta, alan yüzdesi; e-posta ayıklanır", () => {
    const d = dersSayfasiCoz(fixture("ders-1106285.html"));
    expect(d).toMatchObject({
      yariyil: 1,
      kod: "1000.020105",
      tul: "4+0+0",
      kredi: 4,
      akts: 6,
      guncelleme: "08.10.2025",
    });
    expect(d.degerlendirme).toEqual([
      { ad: "Ara Sınav", sayi: 1, katki: 40 },
      { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
    ]);
    // 56 + 112 + 1 + 2 + 7 + 2 = 180 saat; 180 / 30 = 6 AKTS. Toplam ve AKTS satırları katılmaz.
    expect(d.isyuku).toHaveLength(6);
    expect(d.isyuku.reduce((t, x) => t + (x.toplam ?? 0), 0)).toBe(180);
    expect(d.ciktilar).toHaveLength(5);
    expect(d.haftalar).toBe(16);
    expect(d.dersYapisi).toEqual([{ alan: "Sosyal Bilimler", yuzde: 100 }]);
    expect(Object.keys(d.katki)).toEqual(["Tüm", "Ö1", "Ö2", "Ö3", "Ö4", "Ö5"]);
    expect(JSON.stringify(d)).not.toMatch(/@/);
    expect(d.bilgiler["Dersin Yardımcıları"]).toBe(`Arş. Gör. Hayal KURGUN (${EPOSTA_YERINE})`);
  });

  it("e-posta ayıklama iç içe nesnelerde çalışır", () => {
    expect(epostaAyikla({ a: ["x a.b@c.edu.tr y"], n: 3 })).toEqual({ a: [`x ${EPOSTA_YERINE} y`], n: 3 });
  });

  it("CLI (apps/cli/lib/bologna.mjs) canlı fixture'larda aynı sonucu verir", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: CLI modülünün tipi yok
    const c: any = await import(new URL("../../../apps/cli/lib/bologna.mjs", import.meta.url).href);
    const html = fixture("ders-1106285.html");
    expect(JSON.parse(JSON.stringify(c.dersSayfasiCoz(html)))).toEqual(JSON.parse(JSON.stringify(dersSayfasiCoz(html))));
    expect(c.epostaAyikla("a@b.co")).toBe(EPOSTA_YERINE);
  });

  it("programiOku canlı yapıda dersleri bulur ve okur", async () => {
    const taban = "https://obs.kurgu.edu.tr/oibs/bologna/";
    const baglam: DisBaglam = {
      fetch: (async (g: string | URL | Request) => {
        const yol = String(g).slice(taban.length);
        const ders = yol.match(/curCourse=(\d+)/);
        try {
          return new Response(fixture(ders ? `ders-${ders[1]}.html` : `${yol.split(".aspx")[0]}.html`));
        } catch {
          return new Response("", { status: 404 });
        }
      }) as typeof fetch,
      bekle: async () => {},
      simdi: () => new Date("2026-10-27T09:00:00.000Z"),
    };
    const v = await programiOku(`${taban}index.aspx?curSunit=57`, baglam, { aralikMs: 0 });
    expect(v.programCiktilari).toHaveLength(10);
    expect(v.matris.dersler).toHaveLength(2);
    expect(v.tyycIsaret).toBe(0);
    expect(v.dersler[0]).toMatchObject({ kod: "1000.020105", akts: 6, zorunlu: true, bos: false });
    // İkinci dersin sayfası kayıtlı değil: hata kaydı olur, süreç sürer.
    expect(v.dersler[1]).toMatchObject({ kod: "1000.020107", hata: expect.stringMatching(/HTTP 404/) });
  });
});
