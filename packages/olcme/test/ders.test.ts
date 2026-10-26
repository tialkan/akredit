import type { DersOlcmeVerisi } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { dersiOlc, HESAP_SURUMU, TOPLAM_SORU_NO } from "../src/index.ts";
import { ornekMatris, ornekVeri } from "./ornek.ts";

const ck = (s: ReturnType<typeof dersiOlc>, kod: string) => s.ckBasarilari.find((c) => c.ckKod === kod);
const kurallar = (s: ReturnType<typeof dersiOlc>) => s.bulgular.map((b) => `${b.kural}:${b.konu ?? ""}`).sort();

describe("elle hesaplanmış örnek (5 öğrenci, 2 araç, 6 soru, 3 ÇK, 4 PÇ)", () => {
  const s = dersiOlc(ornekVeri(), { esik: 60, matris: ornekMatris });

  it("yöntem ve kimlik alanları", () => {
    expect(s.yontem).toBe("soru");
    expect(s.ogrenciSayisi).toBe(5);
    expect(s.hesapSurumu).toBe(HESAP_SURUMU);
    expect(s.girdiOzeti).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ÇK1 başarısı", () => {
    // ÇK1 soruları: V.S1 (w=1, tam 10), V.S3 (w=0,5, tam 20 → payda 10), F.S3 (w=1, tam 10). Payda 30.
    // o1: (10 + 0,5·20 + 10)/30 = 30/30 = 100
    // o2: (8 + 0,5·14 + 8)/30 = 23/30 = 76,667
    // o3: (5 + 5 + 5)/30 = 50
    // o4: (2 + 3 + 4)/30 = 30
    // o5: V'ye girmedi → V soruları paydadan çıkar: 6/10 = 60
    const c = ck(s, "CK1");
    expect(c?.ogrenciler.o1).toBeCloseTo(100, 10);
    expect(c?.ogrenciler.o2).toBeCloseTo(230 / 3, 10);
    expect(c?.ogrenciler.o3).toBeCloseTo(50, 10);
    expect(c?.ogrenciler.o4).toBeCloseTo(30, 10);
    expect(c?.ogrenciler.o5).toBeCloseTo(60, 10);
    // ortalama = (100 + 76,667 + 50 + 30 + 60)/5 = 316,667/5 = 63,333
    expect(c?.ortalama).toBeCloseTo(950 / 15, 10);
    // sıralı: 30, 50, 60, 76,67, 100 → ortanca 60
    expect(c?.ortanca).toBeCloseTo(60, 10);
    // sapmalar: 36,667; 13,333; −13,333; −33,333; −3,333 → kareler toplamı 2822,22 → /(5−1) → karekök
    expect(c?.standartSapma).toBeCloseTo(Math.sqrt(25400 / 9 / 4), 8);
    // ≥ 60: o1, o2, o5 → 3/5
    expect(c?.esikGecenOrani).toBeCloseTo(0.6, 10);
    expect(c?.soruSayisi).toBe(3);
    expect(c?.n).toBe(5);
  });

  it("ÇK2 ve ÇK3 başarısı", () => {
    // ÇK2: V.S2 (tam 10) + F.S1 (tam 20), payda 30.
    // o1 30/30=100 · o2 (6+16)/30=73,333 · o3 15/30=50 · o4 12/30=40 · o5 12/20=60
    const c2 = ck(s, "CK2");
    expect(c2?.ogrenciler.o2).toBeCloseTo(220 / 3, 10);
    expect(c2?.ogrenciler.o4).toBeCloseTo(40, 10);
    // ortalama (100+73,333+50+40+60)/5 = 323,333/5 = 64,667; ortanca 60; eşik üstü 3/5
    expect(c2?.ortalama).toBeCloseTo(970 / 15, 10);
    expect(c2?.ortanca).toBeCloseTo(60, 10);
    expect(c2?.esikGecenOrani).toBeCloseTo(0.6, 10);
    // ÇK3: V.S3 (w=0,5, tam 20 → 10) + F.S2 (tam 20), payda 30.
    // o1 (10+20)/30=100 · o2 (7+12)/30=63,333 · o3 (5+10)/30=50 · o4 (3+6)/30=30 · o5 14/20=70
    const c3 = ck(s, "CK3");
    expect(c3?.ogrenciler.o2).toBeCloseTo(190 / 3, 10);
    expect(c3?.ogrenciler.o5).toBeCloseTo(70, 10);
    // ortalama 313,333/5 = 62,667; ortanca (30, 50, 63,33, 70, 100) 63,333
    expect(c3?.ortalama).toBeCloseTo(940 / 15, 10);
    expect(c3?.ortanca).toBeCloseTo(190 / 3, 10);
  });

  it("ders içi PÇ sağlanması", () => {
    const pc = Object.fromEntries(s.pcSaglanmasi.map((x) => [x.pcKod, x]));
    // PÇ1 = (63,333·5 + 64,667·3)/(5+3) = (316,667 + 194)/8 = 63,833
    expect(pc.PC1?.deger).toBeCloseTo((950 / 15) * (5 / 8) + (970 / 15) * (3 / 8), 10);
    expect(pc.PC1?.deger).toBeCloseTo(63.8333, 3);
    expect(pc.PC1?.katkiToplami).toBe(8);
    // PÇ2 = (64,667·4 + 62,667·2)/6 = 384/6 = 64
    expect(pc.PC2?.deger).toBeCloseTo(64, 10);
    // PÇ3 = yalnız ÇK3 → 62,667
    expect(pc.PC3?.deger).toBeCloseTo(940 / 15, 10);
    // PÇ4: yalnız iliskisiz ve yetersiz_kanit hücreleri → null
    expect(pc.PC4?.deger).toBeNull();
    expect(pc.PC4?.ckSayisi).toBe(0);
  });

  it("not istatistikleri", () => {
    // Ders notu = 40·(V puanı/40) + 60·(F puanı/50)
    // o1 40+60=100 · o2 40·0,7 + 60·0,72 = 28+43,2 = 71,2 · o3 20+30 = 50 · o4 12+21,6 = 33,6 · o5 0+38,4 = 38,4
    const n = s.notIstatistikleri;
    expect(n.notlar.o2).toBeCloseTo(71.2, 10);
    expect(n.notlar.o5).toBeCloseTo(38.4, 10);
    // ortalama 293,2/5 = 58,64; ortanca 50; en küçük 33,6; en büyük 100
    expect(n.ortalama).toBeCloseTo(58.64, 10);
    expect(n.ortanca).toBeCloseTo(50, 10);
    expect(n.enKucuk).toBeCloseTo(33.6, 10);
    expect(n.enBuyuk).toBe(100);
    // sıralı 33,6 38,4 50 71,2 100; Ç1 konum (5−1)·0,25 = 1 → 38,4; Ç3 konum 3 → 71,2
    expect(n.ceyrek1).toBeCloseTo(38.4, 10);
    expect(n.ceyrek3).toBeCloseTo(71.2, 10);
    // sapmalar 41,36; 12,56; −8,64; −25,04; −20,24 → kareler 1710,6496 + 157,7536 + 74,6496 + 627,0016 + 409,6576
    // = 2979,712 → /4 → karekök
    expect(n.standartSapma).toBeCloseTo(Math.sqrt(2979.712 / 4), 8);
    // histogram: [30,40) 2 · [50,60) 1 · [70,80) 1 · [90,100] 1
    expect(n.histogram.filter((h) => h.sayi > 0).map((h) => [h.alt, h.sayi])).toEqual([
      [30, 2],
      [50, 1],
      [70, 1],
      [90, 1],
    ]);
    // örnek tablo: 100 AA, 71,2 CC, 50 FD, 38,4 ve 33,6 FF
    const harf = Object.fromEntries(n.harfDagilimi.map((h) => [h.harf, h.sayi]));
    expect(harf).toMatchObject({ AA: 1, CC: 1, FD: 1, FF: 2, BA: 0 });
    expect(n.harfTablosuAdi).toBe("örnek");
    // geçme (≥60): o1, o2 → 2/5
    expect(n.gecmeOrani).toBeCloseTo(0.4, 10);
  });

  it("madde analizi ve Cronbach alfa (araç V)", () => {
    const v = s.maddeAnalizi.find((a) => a.aracId === "V");
    // V'ye 4 öğrenci girdi (o5 girmedi).
    expect(v?.n).toBe(4);
    const s1 = v?.maddeler.find((m) => m.soruNo === "S1");
    // ort (10+8+5+2)/4 = 6,25 → p = 0,625
    expect(s1?.guclukIndeksi).toBeCloseTo(0.625, 10);
    // %27 grubu: round(0,27·4)=1. V toplamları o1 40, o2 28, o3 20, o4 12 → üst o1 (10), alt o4 (2) → D = 8/10
    expect(s1?.ayirtEdicilik).toBeCloseTo(0.8, 10);
    // Düzeltilmiş madde-toplam: S1 = (10,8,5,2), kalan = (30,20,15,10).
    // Σ çarpım sapma 86,25; Σ kare S1 36,75; Σ kare kalan 218,75 → r = 86,25/√(36,75·218,75)
    expect(s1?.maddeToplamKorelasyonu).toBeCloseTo(86.25 / Math.sqrt(36.75 * 218.75), 10);
    // Varyanslar (n−1): S1 36,75/3 · S2 20,75/3 · S3 107/3 · toplam 428/3
    // α = 3/2 · (1 − 164,5/428) = 395,25/428 = 0,92348
    expect(v?.cronbachAlfa).toBeCloseTo(395.25 / 428, 10);
  });

  it("madde analizi (araç F)", () => {
    const f = s.maddeAnalizi.find((a) => a.aracId === "F");
    expect(f?.n).toBe(5);
    const s1 = f?.maddeler.find((m) => m.soruNo === "S1");
    // ort (20+16+10+8+12)/5 = 13,2 → p = 0,66
    expect(s1?.guclukIndeksi).toBeCloseTo(0.66, 10);
    // round(0,27·5)=1; F toplamları o1 50, o2 36, o5 32, o3 25, o4 18 → üst o1 20, alt o4 8 → D = 12/20
    expect(s1?.ayirtEdicilik).toBeCloseTo(0.6, 10);
  });

  it("bulgular ve örnek kâğıtlar", () => {
    // Bütün ÇK ortalamaları ≥ 60, her ÇK en az 2 soruyla ölçülüyor, ağırlıklar 100, uç p yok.
    // Kalan: az öğrenci (5 < 10) ve PÇ4'e katkı yok.
    expect(kurallar(s)).toEqual(["az-ogrenci:", "pc-katkisiz:PC4"]);
    // notlar: o1 100 en yüksek, o4 33,6 en düşük, sıralı ortadaki (3.) o3 50
    expect(s.ornekKagitlar).toEqual({ enYuksek: "o1", ortanca: "o3", enDusuk: "o4" });
  });

  it("araç ağırlığıyla ÇK başarısı", () => {
    const a = dersiOlc(ornekVeri(), { aracAgirligiKullan: true });
    // ÇK1, o2: V payı (8+7)·40 = 600, paydası (10+10)·40 = 800; F payı 8·60 = 480, paydası 10·60 = 600
    // → 1080/1400 = 77,142857
    expect(ck(a, "CK1")?.ogrenciler.o2).toBeCloseTo(1080 / 14, 10);
    // o5 yalnız F'ye girdi: ağırlık sadeleşir → 60
    expect(ck(a, "CK1")?.ogrenciler.o5).toBeCloseTo(60, 10);
    expect(a.pcSaglanmasi).toEqual([]);
  });
});

describe("girdi sırasından bağımsızlık", () => {
  it("öğrenci, soru, araç ve eşleme sırası karıştırılınca aynı özet ve aynı sonuç", () => {
    const veri = ornekVeri();
    const karisik: DersOlcmeVerisi = {
      ...veri,
      ciktilar: [...veri.ciktilar].reverse(),
      araclar: [...veri.araclar].reverse().map((a) => ({
        ...a,
        sorular: [...a.sorular].reverse().map((q) => ({ ...q, eslemeler: [...q.eslemeler].reverse() })),
      })),
      // deterministik karıştırma: 7 ile adımlı dolaşma (30 satır, 7 ile aralarında asal)
      puanlar: veri.puanlar.map((_, i) => veri.puanlar[(i * 7) % veri.puanlar.length]!),
    };
    const a = dersiOlc(veri, { matris: ornekMatris });
    const b = dersiOlc(karisik, { matris: ornekMatris });
    expect(b.girdiOzeti).toBe(a.girdiOzeti);
    expect(b).toEqual(a);
  });

  it("girdi değişince özet değişir", () => {
    const veri = ornekVeri();
    const a = dersiOlc(veri);
    veri.puanlar[0] = { ...veri.puanlar[0]!, puan: 9 };
    expect(dersiOlc(veri).girdiOzeti).not.toBe(a.girdiOzeti);
    expect(dersiOlc(ornekVeri(), { esik: 50 }).girdiOzeti).not.toBe(a.girdiOzeti);
  });
});

function tekAracVeri(puanlar: Record<string, (number | null)[]>, tamPuanlar = [10, 10]): DersOlcmeVerisi {
  return {
    dersKodu: "UC101",
    donem: "2026-2027 Güz",
    ciktilar: [{ kod: "CK1" }, { kod: "CK2" }],
    araclar: [
      {
        id: "A",
        tur: "kisa_sinav",
        ad: "Kısa sınav",
        agirlik: 100,
        sorular: tamPuanlar.map((t, i) => ({
          no: `S${i + 1}`,
          tamPuan: t,
          eslemeler: [{ ciktiKod: i === 0 ? "CK1" : "CK2", agirlik: 1 }],
        })),
      },
    ],
    puanlar: Object.entries(puanlar).flatMap(([ogrenci, x]) =>
      x.map((puan, i) => ({ ogrenci, aracId: "A", soruNo: `S${i + 1}`, puan })),
    ),
  };
}

describe("uç durumlar", () => {
  it("tam puanı 0 olan soru: hata bulgusu, paydadan ve madde analizinden çıkar", () => {
    const s = dersiOlc(tekAracVeri({ a: [5, 0], b: [10, 0] }, [10, 0]));
    expect(kurallar(s)).toContain("soru-tam-puan-sifir:A/S2");
    expect(s.bulgular.find((b) => b.kural === "soru-tam-puan-sifir")?.duzey).toBe("hata");
    // CK2 yalnız S2 ile ölçülüyordu → ölçülmemiş, değerler null
    expect(ck(s, "CK2")?.ortalama).toBeNull();
    expect(ck(s, "CK2")?.esikGecenOrani).toBeNull();
    expect(kurallar(s)).toContain("ck-olculmemis:CK2");
    // ders notu yalnız S1'den: a 5/10 → 50, b 100
    expect(s.notIstatistikleri.notlar).toEqual({ a: 50, b: 100 });
    expect(s.maddeAnalizi[0]?.maddeSayisi).toBe(1);
    // tek madde → alfa tanımsız, bulgu üretilmez
    expect(s.maddeAnalizi[0]?.cronbachAlfa).toBeNull();
  });

  it("eşlemesiz soru ve bilinmeyen çıktıya eşleme", () => {
    const v = tekAracVeri({ a: [5, 5], b: [6, 6] });
    const a0 = v.araclar[0]!;
    a0.sorular[1] = { no: "S2", tamPuan: 10, eslemeler: [] };
    a0.sorular.push({ no: "S3", tamPuan: 10, eslemeler: [{ ciktiKod: "CK9", agirlik: 1 }] });
    const s = dersiOlc(v);
    expect(kurallar(s)).toEqual(
      expect.arrayContaining([
        "soru-eslemesiz:A/S2",
        "esleme-bilinmeyen-cikti:A/S3",
        "ck-olculmemis:CK2",
        "ck-tek-soru:CK1",
      ]),
    );
  });

  it("tek öğrenci: sapma, ayırt edicilik, alfa null; az öğrenci uyarısı", () => {
    const s = dersiOlc(tekAracVeri({ tek: [7, 3] }));
    expect(s.ogrenciSayisi).toBe(1);
    // ÇK1 = 7/10 = 70; ÇK2 = 3/10 = 30 (eşik altı)
    expect(ck(s, "CK1")?.ortalama).toBe(70);
    expect(ck(s, "CK1")?.standartSapma).toBeNull();
    expect(s.notIstatistikleri.notlar.tek).toBe(50);
    expect(s.notIstatistikleri.standartSapma).toBeNull();
    expect(s.maddeAnalizi[0]?.maddeler[0]?.ayirtEdicilik).toBeNull();
    expect(s.maddeAnalizi[0]?.maddeler[0]?.maddeToplamKorelasyonu).toBeNull();
    expect(s.maddeAnalizi[0]?.cronbachAlfa).toBeNull();
    expect(kurallar(s)).toEqual(
      expect.arrayContaining(["az-ogrenci:", "ck-esik-alti:CK2", "arac-guvenirlik-tanimsiz:A"]),
    );
    expect(s.ornekKagitlar).toEqual({ enYuksek: "tek", ortanca: "tek", enDusuk: "tek" });
  });

  it("herkes aynı puanı aldı: sd 0, alfa ve korelasyon null, bulgu", () => {
    const s = dersiOlc(tekAracVeri({ a: [6, 6], b: [6, 6], c: [6, 6] }));
    expect(ck(s, "CK1")?.standartSapma).toBe(0);
    expect(s.notIstatistikleri.standartSapma).toBe(0);
    expect(s.maddeAnalizi[0]?.cronbachAlfa).toBeNull();
    expect(s.maddeAnalizi[0]?.maddeler[0]?.maddeToplamKorelasyonu).toBeNull();
    // D = (6 − 6)/10 = 0 → negatif değil
    expect(s.maddeAnalizi[0]?.maddeler[0]?.ayirtEdicilik).toBe(0);
    expect(kurallar(s)).toContain("arac-guvenirlik-tanimsiz:A");
    // eşitlikte takma ad sırası: en yüksek ve en düşük "a", ortanca (3 kişide 2.) "b"
    expect(s.ornekKagitlar).toEqual({ enYuksek: "a", ortanca: "b", enDusuk: "a" });
  });

  it("araç ağırlıkları toplamı 100 değil: uyarı ve 100'e oranlama", () => {
    const v = tekAracVeri({ a: [5, 5], b: [10, 10] });
    v.araclar[0]!.agirlik = 80;
    const s = dersiOlc(v);
    expect(kurallar(s)).toContain("arac-agirlik-toplami:");
    // a: 80·(10/20) = 40 → 40·100/80 = 50
    expect(s.notIstatistikleri.notlar.a).toBeCloseTo(50, 10);
  });

  it("ağırlıklar toplamı 0: ders notu 0, araç tam puanı 0 olan araç atlanır", () => {
    const v = tekAracVeri({ a: [0, 0] }, [0, 0]);
    v.araclar[0]!.agirlik = 0;
    const s = dersiOlc(v);
    expect(s.notIstatistikleri.notlar.a).toBe(0);
    expect(kurallar(s)).toContain("arac-agirlik-toplami:");
  });

  it("girmeyen öğrenci (bütün puanları null) ÇK'da ölçülmez, notu 0 sayılır", () => {
    const s = dersiOlc(tekAracVeri({ a: [8, 8], b: [null, null] }));
    expect(ck(s, "CK1")?.ogrenciler.b).toBeNull();
    expect(ck(s, "CK1")?.n).toBe(1);
    expect(s.notIstatistikleri.notlar.b).toBe(0);
    expect(s.maddeAnalizi[0]?.n).toBe(1);
  });

  it("kolay, zor, negatif ayırt edici sorular ve düşük güvenirlik", () => {
    // S1 herkes tam (p=1 > 0,90); S2 çok zor (p < 0,20) ve alt grubun puanı yüksek
    const veri: DersOlcmeVerisi = tekAracVeri(
      {
        a: [10, 0, 10],
        b: [10, 0, 9],
        c: [10, 1, 8],
        d: [10, 2, 0],
      },
      [10, 10, 10],
    );
    const s = dersiOlc(veri);
    const r = kurallar(s);
    expect(r).toContain("soru-cok-kolay:A/S1");
    expect(r).toContain("soru-cok-zor:A/S2");
    // toplamlar: a 20, b 19, c 19, d 12 → round(0,27·4)=1; üst a (S2=0), alt d (S2=2) → D = −0,2
    expect(s.maddeAnalizi[0]?.maddeler[1]?.ayirtEdicilik).toBeCloseTo(-0.2, 10);
    expect(r).toContain("soru-negatif-ayirt:A/S2");
    // S1 varyansı 0, S2 = (0,0,1,2) → 2,75/3; S3 = (10,9,8,0) → 62,75/3; toplam (20,19,19,12) → 41/3
    // α = 3/2 · (1 − (0 + 2,75 + 62,75)/41) = 1,5 · (−24,5/41) < 0,60
    expect(s.maddeAnalizi[0]?.cronbachAlfa).toBeCloseTo(1.5 * (1 - 65.5 / 41), 10);
    expect(r).toContain("arac-dusuk-guvenirlik:A");
  });

  it("boş veri: istatistikler null, örnek kâğıt yok", () => {
    const s = dersiOlc(tekAracVeri({}));
    expect(s.ogrenciSayisi).toBe(0);
    expect(s.notIstatistikleri.ortalama).toBeNull();
    expect(s.notIstatistikleri.enKucuk).toBeNull();
    expect(s.notIstatistikleri.enBuyuk).toBeNull();
    expect(s.notIstatistikleri.gecmeOrani).toBeNull();
    expect(s.maddeAnalizi[0]?.maddeler[0]?.guclukIndeksi).toBeNull();
    expect(s.ornekKagitlar).toEqual({ enYuksek: null, ortanca: null, enDusuk: null });
  });

  it("kurum harf tablosu, histogram sınırları ve geçme notu parametreleri", () => {
    const s = dersiOlc(tekAracVeri({ a: [10, 10], b: [5, 5], c: [2, 1] }), {
      harfTablosu: [
        { harf: "G", alt: 50 },
        { harf: "K", alt: 20 },
      ],
      histogramSinirlari: [100, 0, 50],
      gecmeNotu: 50,
    });
    // notlar: a 100, b 50, c 15 → G 2, K 0 (15 < 20, tabloda yok)
    expect(s.notIstatistikleri.harfDagilimi).toEqual([
      { harf: "G", sayi: 2 },
      { harf: "K", sayi: 0 },
    ]);
    expect(s.notIstatistikleri.harfTablosuAdi).toBe("kurum");
    // [0,50) c · [50,100] a, b (son aralık üst sınırı içerir)
    expect(s.notIstatistikleri.histogram).toEqual([
      { alt: 0, ust: 50, sayi: 1 },
      { alt: 50, ust: 100, sayi: 2 },
    ]);
    expect(s.notIstatistikleri.gecmeOrani).toBeCloseTo(2 / 3, 10);
  });

  it("eksik puan satırı 0 sayılır, sıfır ve negatif eşleme ağırlığı yok sayılır", () => {
    const v = tekAracVeri({ a: [10, 10] });
    v.puanlar.pop(); // a'nın S2 satırı yok
    v.araclar[0]!.sorular[0]!.eslemeler.push({ ciktiKod: "CK2", agirlik: 0 });
    const s = dersiOlc(v);
    expect(ck(s, "CK2")?.ogrenciler.a).toBe(0);
    expect(ck(s, "CK2")?.soruSayisi).toBe(1);
  });
});

describe("araç düzeyi yedek yöntem", () => {
  const veri: DersOlcmeVerisi = {
    dersKodu: "YDK101",
    donem: "2026-2027 Güz",
    ciktilar: [{ kod: "CK1" }, { kod: "CK2" }],
    araclar: [
      { id: "odev", tur: "odev", ad: "Ödev", agirlik: 30, sorular: [] },
      {
        id: "final",
        tur: "yariyil_sonu",
        ad: "Final",
        agirlik: 70,
        sorular: [{ no: "1", tamPuan: 50, eslemeler: [{ ciktiKod: "CK2", agirlik: 1 }] }],
      },
    ],
    puanlar: [
      { ogrenci: "x", aracId: "odev", soruNo: TOPLAM_SORU_NO, puan: 8 },
      { ogrenci: "x", aracId: "final", soruNo: "1", puan: 25 },
    ],
  };

  it("karma yöntem: sorusuz araç tek sanal soru gibi hesaplanır", () => {
    const s = dersiOlc(veri, {
      aracEslemeleri: { odev: [{ ciktiKod: "CK1", agirlik: 2 }] },
      aracTamPuani: { odev: 10 },
    });
    expect(s.yontem).toBe("karma");
    // ÇK1 = ödev 8/10 = 80
    expect(ck(s, "CK1")?.ortalama).toBeCloseTo(80, 10);
    // not = 30·0,8 + 70·0,5 = 24 + 35 = 59
    expect(s.notIstatistikleri.notlar.x).toBeCloseTo(59, 10);
  });

  it("yalnız sorusuz araçlar: arac yöntemi; eşleme verilmezse eşlemesiz bulgusu; tam puan varsayılanı 100", () => {
    const yalniz: DersOlcmeVerisi = { ...veri, araclar: [veri.araclar[0]!], puanlar: [veri.puanlar[0]!] };
    const s = dersiOlc(yalniz);
    expect(s.yontem).toBe("arac");
    expect(kurallar(s)).toContain(`soru-eslemesiz:odev/${TOPLAM_SORU_NO}`);
    // ağırlık 30 → 100'e oranlanır: 30·(8/100)·100/30 = 8
    expect(s.notIstatistikleri.notlar.x).toBeCloseTo(8, 10);
  });
});
