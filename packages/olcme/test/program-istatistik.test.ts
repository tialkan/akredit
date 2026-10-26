import { describe, expect, it } from "vitest";
import {
  korelasyon,
  ortalama,
  ortanca,
  PAKET,
  type ProgramDersGirdisi,
  programPcHesapla,
  sirala,
  standartSapma,
  varyans,
  yuzdelik,
} from "../src/index.ts";

describe("istatistik yardımcıları", () => {
  it("boş ve tek değerli girdiler", () => {
    expect(PAKET).toBe("@akredit/olcme");
    expect(ortalama([])).toBeNull();
    expect(ortanca([])).toBeNull();
    expect(varyans([5])).toBeNull();
    expect(standartSapma([5])).toBeNull();
    expect(korelasyon([1], [2])).toBeNull();
    expect(korelasyon([1, 2], [1])).toBeNull();
  });

  it("elle hesaplanmış değerler", () => {
    // (2+4+4+4+5+5+7+9)/8 = 5; sapma kareleri 9+1+1+1+0+0+4+16 = 32 → varyans 32/7
    expect(varyans([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(32 / 7, 12);
    // tür 7: [1,2,3,4] %25 konum 0,75 → 1 + 0,75·1 = 1,75; ortanca 2,5
    expect(yuzdelik([4, 1, 3, 2], 0.25)).toBeCloseTo(1.75, 12);
    expect(ortanca([4, 1, 3, 2])).toBeCloseTo(2.5, 12);
    // tam doğrusal ilişki → 1; ters → −1; sabit değişken → null
    expect(korelasyon([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(korelasyon([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    expect(korelasyon([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(["b", "a", "b"].sort(sirala)).toEqual(["a", "b", "b"]);
  });
});

const dersler: ProgramDersGirdisi[] = [
  {
    dersKodu: "B200",
    akts: 6,
    ogrenciSayisi: 40,
    pcSaglanmasi: [
      { pcKod: "PC1", deger: 80, katkiToplami: 10, ckSayisi: 2 },
      { pcKod: "PC2", deger: null, katkiToplami: 0, ckSayisi: 0 },
    ],
  },
  {
    dersKodu: "A100",
    akts: 4,
    ogrenciSayisi: 30,
    pcSaglanmasi: [{ pcKod: "PC1", deger: 60, katkiToplami: 5, ckSayisi: 1 }],
  },
];

describe("program PÇ sağlanması", () => {
  it("eşit ağırlık: (80 + 60)/2 = 70; kapsam ders ve öğrenci sayısıyla verilir", () => {
    const [pc1, pc2] = programPcHesapla(dersler);
    expect(pc1?.deger).toBeCloseTo(70, 12);
    expect(pc1?.dersSayisi).toBe(2);
    expect(pc1?.ogrenciSayisi).toBe(70);
    // dersler ders koduna göre sıralı
    expect(pc1?.dersler.map((d) => d.dersKodu)).toEqual(["A100", "B200"]);
    // PÇ2'ye hiçbir dersten değer gelmiyor
    expect(pc2).toEqual({ pcKod: "PC2", deger: null, dersSayisi: 0, ogrenciSayisi: 0, dersler: [] });
  });

  it("AKTS ağırlığı: (80·6 + 60·4)/10 = 72", () => {
    expect(programPcHesapla(dersler, { agirlik: "akts" })[0]?.deger).toBeCloseTo(72, 12);
  });

  it("katkı toplamı ağırlığı: (80·10 + 60·5)/15 = 73,333", () => {
    expect(programPcHesapla(dersler, { agirlik: "katki" })[0]?.deger).toBeCloseTo(1100 / 15, 12);
  });

  it("AKTS eksikse açıklayıcı hata", () => {
    const eksik = [{ ...dersler[1]!, akts: undefined }];
    expect(() => programPcHesapla(eksik, { agirlik: "akts" })).toThrow(/AKTS/);
  });
});
