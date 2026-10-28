import { describe, expect, it } from "vitest";
import { type DersOlcmeSonucu, dersiOlc, kokNedenAnalizi, type MaddeAnalizi } from "../src/index.ts";
import { ornekVeri } from "./ornek.ts";

const madde = (aracId: string, soruNo: string, p: number | null, d: number | null): MaddeAnalizi => ({
  aracId,
  soruNo,
  tamPuan: 10,
  n: 5,
  ortalama: null,
  guclukIndeksi: p,
  ayirtEdicilik: d,
  maddeToplamKorelasyonu: null,
});

describe("kokNedenAnalizi", () => {
  it("ÇK1 soruları: zor olanlar güçlüğe göre sıralı, sonra ayırt etmeyenler", () => {
    // ÇK1 soruları: V.S1, V.S3, F.S3 (örnek veri). Madde değerleri elle verildi.
    const sonuc = {
      maddeAnalizi: [
        {
          aracId: "V",
          n: 5,
          maddeSayisi: 3,
          cronbachAlfa: null,
          maddeler: [madde("V", "S1", 0.45, 0.6), madde("V", "S2", 0.1, 0.1), madde("V", "S3", 0.7, 0.1)],
        },
        { aracId: "F", n: 5, maddeSayisi: 1, cronbachAlfa: null, maddeler: [madde("F", "S3", 0.3, 0.5)] },
      ],
    } as unknown as DersOlcmeSonucu;
    const r = kokNedenAnalizi(ornekVeri(), sonuc, "CK1");
    // V.S2 ÇK1'e eşli değil, girmez. Zor: F.S3 (0,3), V.S1 (0,45). Ayırt etmeyen: V.S3 (0,1).
    expect(r.map((x) => [x.tur, x.aracId, x.soruNo])).toEqual([
      ["zor_soru", "F", "S3"],
      ["zor_soru", "V", "S1"],
      ["ayirt_etmeyen_soru", "V", "S3"],
    ]);
    expect(r[0]?.aciklama).toContain("%30");
  });

  it("tek soruyla ölçülen çıktı; gerçek hesapla çalışır", () => {
    const veri = ornekVeri();
    const s = dersiOlc(veri, { esik: 60 });
    const tekSoru = {
      ...veri,
      araclar: veri.araclar.slice(0, 1).map((a) => ({ ...a, sorular: a.sorular.slice(1, 2) })),
    };
    expect(kokNedenAnalizi(tekSoru, s, "CK2").at(-1)?.tur).toBe("tek_olcum");
  });
});
