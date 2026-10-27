import { describe, expect, it } from "vitest";
import { KILAVUZLAR, kilavuzBul, metinleri } from "./icerik.ts";
import { cumleler, kelimeSayisi, sadelikOlc, yasakTerimler } from "./sadelik.ts";

describe("sadelik ölçüleri", () => {
  it("cümleleri ayırır ve kelimeleri sayar", () => {
    // "Bir iki üç." (3 kelime) ve "Dört beş!" (2 kelime): ortalama 2,5, en uzun 3.
    expect(cumleler("Bir iki üç. Dört beş!")).toEqual(["Bir iki üç.", "Dört beş!"]);
    expect(kelimeSayisi("Bir iki — üç.")).toBe(3);
    expect(sadelikOlc(["Bir iki üç. Dört beş!"])).toEqual({ cumleSayisi: 2, ortalamaKelime: 2.5, enUzunCumle: 3 });
  });

  it("teknik terimi kelime başında yakalar, kelime içinde yakalamaz", () => {
    expect(yasakTerimler("Dosyayı JSON olarak verin")).toEqual(["json"]);
    expect(yasakTerimler("Kapı açık")).toEqual([]);
    expect(yasakTerimler("Kurumsal SSO ile girin")).toEqual(["sso"]);
  });
});

describe("kılavuzlar", () => {
  it("kapsamdaki konuların hepsi var", () => {
    for (const yol of ["onay-vermek", "belge-eklemek", "ders-dosyasi", "rapor", "kalite-birimi", "bilgi-islem"]) {
      expect(kilavuzBul(yol), yol).toBeDefined();
    }
    expect(new Set(KILAVUZLAR.map((k) => k.yol)).size).toBe(KILAVUZLAR.length);
  });

  for (const k of KILAVUZLAR) {
    describe(k.baslik, () => {
      const metin = metinleri(k);

      it("teknik terim içermez", () => {
        expect(metin.flatMap(yasakTerimler)).toEqual([]);
      });

      it("cümleler kısa: ortalama ≤ 16, en uzun ≤ 32 kelime", () => {
        const o = sadelikOlc(metin);
        expect(o.ortalamaKelime).toBeLessThanOrEqual(16);
        expect(o.enUzunCumle).toBeLessThanOrEqual(32);
      });

      it("okuma süresi 7 dakikayı geçmez ve yazılan süre gerçeğe yakın", () => {
        // Yavaş okuyucu için dakikada 120 kelime varsayılır; yazılan süre bundan kısa olmamalı.
        const kelime = metin.reduce((a, m) => a + kelimeSayisi(m), 0);
        expect(k.dakika).toBeLessThanOrEqual(7);
        expect(k.dakika).toBeGreaterThanOrEqual(Math.ceil(kelime / 120) - 1);
      });

      it("henüz olmayanları açıkça söyler", () => {
        expect(k.sinirlar.length).toBeGreaterThan(0);
      });

      it("yapılmamış işi vaat etmez: garanti ve kesin sonuç sözü yok", () => {
        const kucuk = metin.join(" ").toLocaleLowerCase("tr");
        for (const soz of ["garanti eder", "garantiler", "akreditasyon alırsınız", "%100 otomatik"]) {
          expect(kucuk).not.toContain(soz);
        }
      });
    });
  }
});
