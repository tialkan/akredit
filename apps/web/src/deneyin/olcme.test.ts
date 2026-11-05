import { describe, expect, it } from "vitest";
import { ciktiKodlari, hesapla, matrisSatiriOku, sonucCsv, tabloyuHazirla } from "./olcme.ts";

// Uydurma ad ve numaralar (gerçek kişi değildir).
const TABLO = [
  "Ad Soyad;Öğrenci No;Vize S1 (ÇK1) /20;Vize S2 (ÇK2) /30;Final S1 (ÇK1) /50;Toplam",
  "Ayşe Kurgu;20260001;10;30;25;65",
  "Mehmet Örnek;20260002;20;15;50;85",
].join("\n");

describe("tabloyuHazirla", () => {
  it("ad ve numara sütunlarını atar, takma ad verir, başlıkları çözer", () => {
    const h = tabloyuHazirla(TABLO);
    expect(h.atilan).toEqual(['"Ad Soyad" sütunu', '"Öğrenci No" sütunu']);
    expect(h.tablo).not.toMatch(/Ayşe|Mehmet|20260001/u);
    expect(h.tablo.split("\n")[1]?.startsWith("o1\t")).toBe(true);
    expect(h.ogrenciSayisi).toBe(2);
    expect(h.sutunlar.map((s) => [s.aracId, s.soruNo, s.tamPuan, s.ciktilar.join()])).toEqual([
      ["ara_sinav", "1", 20, "Ö1"],
      ["ara_sinav", "2", 30, "Ö2"],
      ["yariyil_sonu", "1", 50, "Ö1"],
    ]);
    expect(h.yoksayilan).toEqual(["Toplam"]);
    expect(h.araclar.map((a) => a.id)).toEqual(["ara_sinav", "yariyil_sonu"]);
  });
});

describe("hesapla", () => {
  const h = tabloyuHazirla(TABLO);
  const temel = { tamPuanlar: {}, eslemeler: {}, matris: {}, esik: 60 };

  it("ağırlık yoksa hesaplamaz, eksiği söyler", () => {
    const r = hesapla(h, { ...temel, agirliklar: { ara_sinav: 40 } });
    expect(r.tamam).toBe(false);
    if (!r.tamam) expect(r.eksikler.join(" ")).toContain('"yariyil_sonu" ölçme aracının');
  });

  it("ÇK ve PÇ değerleri elle hesaplanan örnekle aynı", () => {
    const r = hesapla(h, {
      ...temel,
      agirliklar: { ara_sinav: 40, yariyil_sonu: 60 },
      matris: { Ö1: { P1: 3 }, Ö2: { P1: 1, P2: 5 } },
    });
    expect(r.tamam).toBe(true);
    if (!r.tamam) return;
    const ck = Object.fromEntries(r.sonuc.ckBasarilari.map((c) => [c.ckKod, c]));
    // Ö1 = Vize S1 + Final S1, payda 20 + 50 = 70.
    // o1: (10 + 25) / 70 = %50; o2: (20 + 50) / 70 = %100. Ortalama 75; eşiği (60) geçen 1/2.
    expect(ck.Ö1?.ortalama).toBe(75);
    expect(ck.Ö1?.esikGecenOrani).toBe(0.5);
    // Ö2 = Vize S2 / 30. o1: 30/30 = %100; o2: 15/30 = %50. Ortalama 75; eşiği geçen 1/2.
    expect(ck.Ö2?.ortalama).toBe(75);
    expect(ck.Ö2?.esikGecenOrani).toBe(0.5);
    const pc = Object.fromEntries(r.sonuc.pcSaglanmasi.map((p) => [p.pcKod, p.deger]));
    // P1 = (75·3 + 75·1) / (3 + 1) = 75. P2 = 75·5 / 5 = 75.
    expect(pc.P1).toBe(75);
    expect(pc.P2).toBe(75);
    const csv = sonucCsv(r.sonuc);
    expect(csv).toContain("ÇK1;2;2;75,0;%50,0");
    expect(csv).not.toMatch(/o1|o2|Ayşe/u);
  });

  it("başlıkta olmayan tam puan ve eşleme hocadan alınır", () => {
    const h2 = tabloyuHazirla("Numara;Vize S1;Vize S2\n20261111;5;8\n20262222;10;4");
    const r = hesapla(h2, {
      ...temel,
      tamPuanlar: { "Vize S1": 10, "Vize S2": 10 },
      eslemeler: { "Vize S1": ["Ö1"], "Vize S2": ["Ö1"] },
      agirliklar: { ara_sinav: 100 },
    });
    expect(r.tamam).toBe(true);
    // Ö1 payda 20. o1: 13/20 = 65; o2: 14/20 = 70. Ortalama 67,5; ikisi de 60'ı geçer.
    if (r.tamam) {
      expect(r.sonuc.ckBasarilari[0]?.ortalama).toBe(67.5);
      expect(r.sonuc.ckBasarilari[0]?.esikGecenOrani).toBe(1);
    }
  });
});

describe("girdi yardımcıları", () => {
  it("ÇK kodları ve matris satırı", () => {
    expect(ciktiKodlari("ÇK1, Ö2 3")).toEqual(["Ö1", "Ö2", "Ö3"]);
    expect(matrisSatiriOku("P1:3, PÇ2=5, P3:9")).toEqual({ P1: 3, P2: 5 });
  });
});
