import type { DersOlcmeVerisi } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { olcmeGirdiSorunlari } from "../src/index.ts";

// Tutarlı en küçük girdi: iki çıktı, bir araç, iki soru (10'ar puan), iki öğrenci.
const temel = (): DersOlcmeVerisi => ({
  dersKodu: "KRG101",
  donem: "2026-2027 Güz",
  ciktilar: [{ kod: "Ö1" }, { kod: "Ö2" }],
  araclar: [
    {
      id: "vize",
      tur: "ara_sinav",
      ad: "Ara Sınav",
      agirlik: 40,
      sorular: [
        { no: "1", tamPuan: 10, eslemeler: [{ ciktiKod: "Ö1", agirlik: 1 }] },
        { no: "2", tamPuan: 10, eslemeler: [{ ciktiKod: "Ö2", agirlik: 1 }] },
      ],
    },
  ],
  puanlar: [
    { ogrenci: "o1", aracId: "vize", soruNo: "1", puan: 10 },
    { ogrenci: "o1", aracId: "vize", soruNo: "2", puan: 0 },
    { ogrenci: "o2", aracId: "vize", soruNo: "1", puan: null },
  ],
});

describe("olcmeGirdiSorunlari", () => {
  it("tutarlı girdide sorun yok; tam puana eşit puan ve boş (null) puan geçerlidir", () => {
    expect(olcmeGirdiSorunlari(temel())).toEqual([]);
  });

  it("tam puanı aşan puan reddedilir (12 > 10 olsaydı başarı %120 çıkardı)", () => {
    const v = temel();
    v.puanlar[0] = { ogrenci: "o1", aracId: "vize", soruNo: "1", puan: 12 };
    expect(olcmeGirdiSorunlari(v)).toEqual(["o1 için vize 1. soru puanı (12) tam puanı (10) aşıyor."]);
  });

  it("yinelenen puan satırı, tanımsız araç ve tanımsız soru reddedilir", () => {
    const v = temel();
    v.puanlar.push(
      { ogrenci: "o1", aracId: "vize", soruNo: "1", puan: 5 },
      { ogrenci: "o2", aracId: "final", soruNo: "1", puan: 5 },
      { ogrenci: "o2", aracId: "vize", soruNo: "9", puan: 5 },
    );
    expect(olcmeGirdiSorunlari(v)).toEqual([
      "o1 için vize 1. soru puanı birden çok kez yazılmış.",
      "o2 için tanımsız final aracına puan yazılmış. Aracı ekleyin ya da satırı silin.",
      "o2 için vize aracında olmayan 9. soruya puan yazılmış.",
    ]);
  });

  it("yinelenen çıktı, araç, soru ve listede olmayan çıktıya eşleme reddedilir", () => {
    const v = temel();
    v.ciktilar.push({ kod: "Ö1" });
    const a = v.araclar[0];
    if (!a) throw new Error("araç yok");
    a.sorular.push({ no: "2", tamPuan: 5, eslemeler: [{ ciktiKod: "Ö9", agirlik: 1 }] });
    v.araclar.push({ ...a, sorular: [] });
    expect(olcmeGirdiSorunlari(v)).toEqual([
      "Ders çıktısı Ö1 2 kez yazılmış. Her çıktıyı bir kez yazın.",
      "vize içinde 2. soru birden çok kez yazılmış.",
      "vize 2. soru, listede olmayan Ö9 çıktısına eşlenmiş. Çıktıyı ekleyin ya da eşlemeyi düzeltin.",
      "Ölçme aracı vize birden çok kez yazılmış. Her aracı bir kez yazın.",
    ]);
  });

  it("en çok 10 sorun yazılır, gerisi sayılır", () => {
    const v = temel();
    for (let i = 0; i < 12; i++) v.puanlar.push({ ogrenci: `o${i + 10}`, aracId: "yok", soruNo: "1", puan: 1 });
    const s = olcmeGirdiSorunlari(v);
    expect(s).toHaveLength(11);
    expect(s[10]).toBe("ve 2 sorun daha.");
  });
});
