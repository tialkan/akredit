import { describe, expect, it } from "vitest";
import {
  insanDakikasi,
  type Karar,
  type KararId,
  type KisiId,
  type KurumId,
  kararOranlari,
  type MatrisDegeri,
  matrisHedefi,
  matrisOlustur,
  type Oneri,
  type OneriId,
  ortanca,
  oturumlariHesapla,
} from "../src/index.ts";

const oneri = (id: string, hedef: string, icerik: MatrisDegeri): Oneri<MatrisDegeri> => ({
  id: id as OneriId,
  kurumId: "k" as KurumId,
  tur: "matris_katkisi",
  hedef: { tur: "cikti_cifti", id: hedef },
  icerik,
  gerekce: "g",
  atiflar: [],
  guven: null,
  uretici: { tur: "kisi", kisiId: "u" as KisiId },
  risk: "orta",
  olusturma: "2026-10-01T00:00:00Z",
});
const karar = (
  id: string,
  oneriId: string,
  sonuc: Karar["sonuc"],
  zaman: string,
  duzeltme: MatrisDegeri | null = null,
): Karar<MatrisDegeri> => ({
  id: id as KararId,
  oneriId: oneriId as OneriId,
  sonuc,
  duzeltme,
  kararVeren: "kisi" as KisiId,
  dayanak: { tur: "dogrudan" },
  gerekce: null,
  zaman,
});

describe("matris", () => {
  const girdi = {
    programCiktilari: ["P2", "P1"],
    dersCiktilari: [
      { ders: "TBP201", kod: "Ö2" },
      { ders: "TBP201", kod: "Ö1" },
    ],
    oneriler: [
      oneri("o1", matrisHedefi("TBP201", "Ö1", "P1"), { tur: "puan", puan: 3 }),
      oneri("o2", "TBP201.Ö1|P1", { tur: "puan", puan: 5 }),
      oneri("o3", "TBP201.Ö1|P2", { tur: "puan", puan: 2 }),
      oneri("o4", "TBP201.Ö2|P1", { tur: "iliskisiz" }),
      oneri("o5", "TBP201.Ö2|P2", { tur: "puan", puan: 4 }),
      oneri("o6", "TBP201.Ö2|P2", { tur: "puan", puan: 1 }),
    ],
    kararlar: [
      karar("k1", "o1", "onaylandi", "2026-10-02T00:00:00Z"),
      // Sonraki düzeltme hücreyi değiştirir: o2 önerisi 5, düzeltme 4.
      karar("k2", "o2", "duzeltildi", "2026-10-03T00:00:00Z", { tur: "puan", puan: 4 }),
      karar("k3", "o3", "reddedildi", "2026-10-03T00:00:00Z"),
      karar("k4", "o4", "duzeltildi", "2026-10-03T00:00:00Z", { tur: "yetersiz_kanit" }),
      karar("k5", "o5", "onaylandi", "2026-10-03T00:00:00Z"),
      karar("yabanci", "o99", "onaylandi", "2026-10-03T00:00:00Z"),
    ],
    olusturma: "2026-10-26T09:30:12.000Z",
  };

  it("son geçerli karar, sıralama, bekleyen sayısı ve yapısal sonuç", () => {
    const m = matrisOlustur(girdi);
    expect(m.sutunlar).toEqual(["P1", "P2"]);
    expect(m.satirlar).toEqual(["TBP201.Ö1", "TBP201.Ö2"]);
    expect(m.hucreler).toEqual({
      "TBP201.Ö1": { P1: { tur: "puan", puan: 4 }, P2: null },
      "TBP201.Ö2": { P1: { tur: "yetersiz_kanit" }, P2: { tur: "puan", puan: 4 } },
    });
    // o6 kararsız.
    expect(m.bekleyen).toBe(1);
  });

  it("CLI ile aynı Markdown ve CSV biçimi", () => {
    const m = matrisOlustur(girdi);
    expect(m.markdown).toBe(
      [
        "# Ders çıktısı × program çıktısı matrisi",
        "",
        "Oluşturma: 2026-10-26 09:30. Yalnız kullanıcının onayladığı ya da düzelttiği değerler yer alır.",
        "",
        "| Ders çıktısı | P1 | P2 |",
        "|---|---|---|",
        "| TBP201.Ö1 | 4 |  |",
        "| TBP201.Ö2 | ? | 4 |",
        "",
        "Gösterim: 1-5 katkı düzeyi. `·` ilişkisiz. `?` kanıt yetersiz. Boş hücre henüz değerlendirilmedi. Bu tablo tasarım uyumunu gösterir, öğrenci başarısını göstermez.",
        "\nKarar bekleyen 1 matris önerisi var.",
      ].join("\n"),
    );
    expect(m.csv).toBe("ders_ciktisi,P1,P2\nTBP201.Ö1,4,\nTBP201.Ö2,yetersiz_kanit,4");
  });

  it("ilişkisiz gösterimi ve bekleyen yokken son satır boş", () => {
    const m = matrisOlustur({
      ...girdi,
      oneriler: [
        oneri("a", "TBP201.Ö1|P1", { tur: "iliskisiz" }),
        { ...oneri("b", "x", { tur: "iliskisiz" }), tur: "kanit_etiketi" },
      ],
      kararlar: [karar("k", "a", "onaylandi", "2026-10-02T00:00:00Z")],
    });
    expect(m.markdown).toContain("| TBP201.Ö1 | · |  |");
    expect(m.markdown.endsWith("göstermez.\n")).toBe(true);
    expect(m.csv.split("\n")[1]).toBe("TBP201.Ö1,iliskisiz,");
    expect(m.bekleyen).toBe(0);
  });
});

describe("iş yükü ölçümü", () => {
  it("2 saatten uzun boşluk yeni oturum açar; tam 2 saat aynı oturumda", () => {
    const r = oturumlariHesapla([
      "2026-10-01T09:00:00Z",
      "2026-10-01T09:30:00Z",
      "2026-10-01T11:30:00Z", // 2 saat boşluk: aynı oturum (09:00-11:30 = 2.5 saat)
      "2026-10-01T14:00:00Z", // 2.5 saat boşluk: yeni oturum
      "2026-10-01T14:30:00Z", // 0.5 saat
    ]);
    expect(r.oturumlar).toHaveLength(2);
    // 2.5 + 0.5 = 3 saat
    expect(r.etkinSaat).toBe(3);
  });
  it("sırasız girdi sıralanır, boş girdi sıfır", () => {
    expect(oturumlariHesapla([Date.parse("2026-10-01T10:00:00Z"), "2026-10-01T09:00:00Z"]).etkinSaat).toBe(1);
    expect(oturumlariHesapla([])).toEqual({ oturumlar: [], etkinSaat: 0 });
    expect(oturumlariHesapla(["2026-10-01T09:00:00Z", "2026-10-01T10:00:00Z"], 0.5).oturumlar).toHaveLength(2);
  });
  it("karar oranları kararlılar içinde yuvarlanır", () => {
    const r = kararOranlari(["onaylandi", "onaylandi", "duzeltildi", "bekliyor", "reddedildi"]);
    // 4 kararlı: 2/4 = %50, 1/4 = %25, 1/4 = %25
    expect(r).toEqual({
      toplam: 5,
      bekleyen: 1,
      kararli: 4,
      onaylandi: 2,
      duzeltildi: 1,
      reddedildi: 1,
      yuzde: { onaylandi: 50, duzeltildi: 25, reddedildi: 25 },
    });
    // 3 kararlı: 1/3 = %33.3 → 33, 2/3 = %66.7 → 67
    expect(kararOranlari(["onaylandi", "reddedildi", "reddedildi"]).yuzde).toEqual({
      onaylandi: 33,
      duzeltildi: 0,
      reddedildi: 67,
    });
    expect(kararOranlari(["bekliyor"]).yuzde.onaylandi).toBeNull();
  });
  it("kişi bazında insan dakikası: toplam ve ortanca", () => {
    const r = insanDakikasi([
      { kisiId: "a", dakika: 3 },
      { kisiId: "b", dakika: 10 },
      { kisiId: "a", dakika: 1 },
      { kisiId: "a", dakika: 8 },
      { kisiId: "a", dakika: 2 },
      { kisiId: "b", dakika: -1 },
      { kisiId: "b", dakika: Number.NaN },
    ]);
    // a: 3+1+8+2 = 14, sıralı 1,2,3,8 → ortanca (2+3)/2 = 2.5; b: yalnız 10.
    expect(r).toEqual([
      { kisiId: "a", kararSayisi: 4, toplam: 14, ortanca: 2.5 },
      { kisiId: "b", kararSayisi: 1, toplam: 10, ortanca: 10 },
    ]);
    expect(ortanca([])).toBe(0);
    expect(ortanca([5, 1, 3])).toBe(3);
  });
});
