import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sahteBaglam } from "../avesis/test/sahte.ts";
import {
  ondalik,
  PARCA_YOLU,
  programIstatistigiCoz,
  programIstatistikleriniOku,
  tamsayi,
  YOKATLAS_KOSULU,
} from "./yokatlas.ts";

const html = readFileSync(new URL("./test/fixtures/genel-bilgiler.html", import.meta.url), "utf8");

describe("YÖK Atlas ayrıştırma", () => {
  it("kurgu genel bilgiler panelinden istatistikleri okur ve doluluğu hesaplar", () => {
    const p = programIstatistigiCoz(html, "999000111");
    expect(p).toMatchObject({
      yil: 2025,
      kontenjan: 84, // "Toplam Kontenjan" satırı; "Genel Kontenjan" tanımsıza düşer
      yerlesen: 80,
      bosKalan: null, // "---"
      tabanPuan: 312.45678,
      basariSirasi: 145320, // "145.320"
    });
    // 80 / 84 = 0,952380… → 4 basamak: 0,9524
    expect(p.doluluk).toBe(0.9524);
    expect(p.tanimsiz["Genel Kontenjan"]).toBe("82");
    expect(p.tanimsiz["Puan Türü"]).toBe("SAY");
  });

  it("sayı biçimleri", () => {
    expect(tamsayi("1.234")).toBe(1234);
    expect(tamsayi("12")).toBe(12);
    expect(tamsayi("Dolmadı")).toBeNull();
    expect(tamsayi("1,5")).toBeNull();
    expect(ondalik("250,5")).toBe(250.5);
    expect(ondalik("--")).toBeNull();
  });

  it("tablosuz sayfada yapı değişikliği uyarısı verir", () => {
    expect(() => programIstatistigiCoz("<p>Bakım</p>", "999000111")).toThrow(/yapısı değişmiş/);
  });

  it("kontenjan 0 ise doluluk hesaplanmaz", () => {
    const p = programIstatistigiCoz(
      "<table><tr><td>Toplam Kontenjan</td><td>0</td></tr><tr><td>Toplam Yerleşen</td><td>0</td></tr></table>",
      "999000111",
    );
    expect(p.doluluk).toBeNull();
  });
});

describe("YÖK Atlas okuma", () => {
  it("programları en az 2 sn aralıkla okur; hatalı kod ve HTTP hatası tek programı düşürür", async () => {
    const s = sahteBaglam({
      [PARCA_YOLU("lisans", "999000111")]: html,
      [PARCA_YOLU("lisans", "999000222")]: { durum: 503, govde: "" },
    });
    const r = await programIstatistikleriniOku(["999000111", "12", "999000222"], s.baglam, { aralikMs: 100 });
    expect(r.programlar.map((p) => p.programKodu)).toEqual(["999000111"]);
    expect(r.hatalar.map((h) => h.programKodu)).toEqual(["12", "999000222"]);
    expect(r.hatalar[1]?.ileti).toMatch(/HTTP 503/);
    expect(s.beklemeler).toEqual([2000]);
    expect(s.istekler[0]?.adres).toBe("https://yokatlas.yok.gov.tr/content/lisans-dynamic/1000_1.php?y=999000111");
    expect(r.kaynaklar[0]?.okunma).toBe("2026-10-27T09:00:00.000Z");
    expect(YOKATLAS_KOSULU.durum).toBe("DOĞRULANMADI");
  });
});
