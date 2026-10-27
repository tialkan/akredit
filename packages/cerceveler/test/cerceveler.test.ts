import { describe, expect, it } from "vitest";
import {
  CerceveKutuphanesi,
  cerceveSemasi,
  DOGRULANMADI,
  dogrulamaRozeti,
  eslemeKarariDogrula,
  eslemeOnerisiDogrula,
  gecerliEslemeler,
  ILK_CERCEVELER,
  MUDEK_TASLAK,
  olcutSemasi,
  olcutTaslagiCikar,
  taslakCerceve,
  tumOlcutler,
  uzmanOnayi,
  YOKAK_KURUMSAL_2020,
} from "../src/index.ts";

// Uydurma örnek belge: gerçek bir çerçevenin metni değildir.
const OZET = "a".repeat(64);
const KAYNAK = {
  adres: "https://ornek.test/olcutler.pdf",
  erisimTarihi: "2026-10-27",
  sha256: OZET,
  dosya: "ornek.pdf",
};
const SAYFALAR = [
  { sayfa: 2, metin: "X.1 Birinci ölçüt\nX.1.1 Alt ölçüt bir\nAlt ölçütün açıklama metni\nikinci satır" },
  { sayfa: 1, metin: "Kapak sayfası\nX Örnek ana başlık" },
  { sayfa: 3, metin: "X.1.2 Alt ölçüt iki\nX.9.1 Sahipsiz ölçüt" },
];

describe("şema", () => {
  it("ilk çerçevelerin hepsi şemaya uyar", () => {
    for (const c of ILK_CERCEVELER) expect(cerceveSemasi.safeParse(c).success).toBe(true);
    // 2020 tabanlı 2 YÖKAK taslağı + resmî belgeden 2 YÖKAK sürümü + MÜDEK + 2 iç çerçeve.
    expect(ILK_CERCEVELER).toHaveLength(7);
  });

  it("kaynak özeti olmayan resmî çerçevede hiçbir ölçüt metin ya da resmî başlık taşımaz", () => {
    for (const c of ILK_CERCEVELER.filter((x) => x.resmi && !x.kaynak?.sha256)) {
      expect(c.dogrulandi).toBe(false);
      for (const o of tumOlcutler(c.olcutler)) {
        expect(o.metin).toBe(DOGRULANMADI);
        expect(o.baslikDurumu).toBe("dogrulanmadi");
      }
    }
    expect(MUDEK_TASLAK.olcutler).toHaveLength(0);
  });

  it("YÖKAK ağacı: 5 ana başlık, 22 ölçüt, 58 alt ölçüt", () => {
    // Ölçüt sayısı veri listesinden elle: A(4)+B(6)+C(4)+D(3)+E(5)=22.
    const hepsi = tumOlcutler(YOKAK_KURUMSAL_2020.olcutler);
    expect(YOKAK_KURUMSAL_2020.olcutler.map((o) => o.kod)).toEqual(["A", "B", "C", "D", "E"]);
    expect(hepsi.filter((o) => o.kod.split(".").length === 2)).toHaveLength(22);
    // Alt ölçüt: A 11, B 22, C 12, D 4, E 9 = 58.
    expect(hepsi.filter((o) => o.kod.split(".").length === 3)).toHaveLength(58);
  });

  it("doğrulanmamış ölçüt metin taşıyamaz, resmî metin sayfasız olamaz", () => {
    const temel = {
      kod: "X",
      baslik: "x",
      baslikDurumu: "dogrulanmadi",
      kaynakSayfa: null,
      kanitGereksinimleri: [],
      altOlcutler: [],
    };
    expect(olcutSemasi.safeParse({ ...temel, metin: "uydurma", metinDurumu: "dogrulanmadi" }).success).toBe(false);
    expect(olcutSemasi.safeParse({ ...temel, metin: "m", metinDurumu: "resmi" }).success).toBe(false);
  });

  it("özetsiz kaynakta resmî metin ve doğrulanmış işareti reddedilir", () => {
    const o = {
      kod: "X",
      baslik: "x",
      baslikDurumu: "resmi",
      metin: "m",
      metinDurumu: "resmi",
      kaynakSayfa: 1,
      kanitGereksinimleri: [],
      altOlcutler: [],
    };
    const c = { ...MUDEK_TASLAK, olcutler: [o] };
    expect(cerceveSemasi.safeParse(c).success).toBe(false);
    expect(
      cerceveSemasi.safeParse({ ...YOKAK_KURUMSAL_2020, dogrulandi: true, dogrulayan: "A", dogrulamaZamani: "z" })
        .success,
    ).toBe(false);
  });

  it("başlık da kaynak/özet kuralına bağlı (D2-2)", () => {
    const o = {
      kod: "X",
      baslik: "x",
      baslikDurumu: "resmi",
      metin: DOGRULANMADI,
      metinDurumu: "dogrulanmadi",
      kaynakSayfa: null,
      kanitGereksinimleri: [],
      altOlcutler: [],
    };
    // Sayfasız resmî başlık reddedilir.
    expect(olcutSemasi.safeParse(o).success).toBe(false);
    const sayfali = { ...o, kaynakSayfa: 1 };
    expect(olcutSemasi.safeParse(sayfali).success).toBe(true);
    // Özetsiz kaynakta resmî başlık reddedilir.
    expect(cerceveSemasi.safeParse({ ...MUDEK_TASLAK, olcutler: [sayfali] }).success).toBe(false);
    // Özetli kaynakta kabul edilir; iç çerçevede resmî başlık olamaz.
    const ozetli = { ...MUDEK_TASLAK, kaynak: KAYNAK, olcutler: [sayfali] };
    expect(cerceveSemasi.safeParse(ozetli).success).toBe(true);
    expect(cerceveSemasi.safeParse({ ...ozetli, resmi: false }).success).toBe(false);
    // Çerçevede olmayan belgeye bağlı ölçüt reddedilir.
    expect(cerceveSemasi.safeParse({ ...ozetli, olcutler: [{ ...sayfali, kaynakDosya: "baska.pdf" }] }).success).toBe(
      false,
    );
    // Doğrulanmamış başlıkla resmî metin olmaz; rapor bölümünde sayfasız resmî başlık olmaz.
    expect(
      olcutSemasi.safeParse({ ...sayfali, baslikDurumu: "dogrulanmadi", metin: "m", metinDurumu: "resmi" }).success,
    ).toBe(false);
    expect(
      cerceveSemasi.safeParse({
        ...ozetli,
        raporSablonu: [{ kod: "1", baslik: "b", baslikDurumu: "resmi", olcutKodlari: [] }],
      }).success,
    ).toBe(false);
  });

  it("olgunluk düzeyleri 1–5 sırayla ve yalnız resmî ölçütte", () => {
    const o = {
      kod: "X",
      baslik: "x",
      baslikDurumu: "resmi",
      metin: "m",
      metinDurumu: "resmi",
      kaynakSayfa: 1,
      kanitGereksinimleri: [],
      altOlcutler: [],
    };
    const bes = [1, 2, 3, 4, 5].map((duzey) => ({ duzey, metin: `d${duzey}` }));
    expect(olcutSemasi.safeParse({ ...o, olgunlukTanimlari: bes }).success).toBe(true);
    expect(olcutSemasi.safeParse({ ...o, olgunlukTanimlari: bes.slice(1) }).success).toBe(false);
    expect(
      olcutSemasi.safeParse({ ...o, metin: DOGRULANMADI, metinDurumu: "dogrulanmadi", olgunlukTanimlari: bes }).success,
    ).toBe(false);
  });

  it("rapor şablonu bilinmeyen ölçüte bağlanamaz", () => {
    const c = { ...MUDEK_TASLAK, raporSablonu: [{ kod: "1", baslik: "b", olcutKodlari: ["Y"] }] };
    expect(cerceveSemasi.safeParse(c).success).toBe(false);
  });

  it("rozetler", () => {
    expect(dogrulamaRozeti(YOKAK_KURUMSAL_2020).metin).toBe("Uzman doğrulaması bekliyor");
    expect(dogrulamaRozeti({ resmi: false, dogrulandi: false }).rozet).toBe("ic_cerceve");
    expect(dogrulamaRozeti({ resmi: true, dogrulandi: true }).rozet).toBe("dogrulandi");
  });
});

describe("içe aktarma", () => {
  it("sayfa sırasına göre ağaç kurar, metni ve kaynak sayfayı belgeden alır", () => {
    const { olcutler, uyarilar } = olcutTaslagiCikar(SAYFALAR);
    const hepsi = tumOlcutler(olcutler);
    expect(hepsi.map((o) => [o.kod, o.kaynakSayfa])).toEqual([
      ["X.1", 2],
      ["X.1.1", 2],
      ["X.1.2", 3],
      ["X.9.1", 3],
    ]);
    expect(hepsi[1]?.metin).toBe("Alt ölçütün açıklama metni ikinci satır");
    expect(hepsi[0]?.metin).toBe("Birinci ölçüt");
    expect(uyarilar).toEqual(["X.9.1 için üst ölçüt X.9 belgede bulunamadı."]);
  });

  it("tekrar eden kodu uyarır", () => {
    const { uyarilar } = olcutTaslagiCikar([{ sayfa: 1, metin: "X.1 a\nX.1 b" }]);
    expect(uyarilar[0]).toContain("yeniden");
  });

  it("taslak doğrulanmamış çıkar, uzman onayıyla doğrulanır, girdi değişmez", () => {
    const { cerceve } = taslakCerceve({
      kod: "ornek",
      ad: "Örnek",
      surum: "1",
      kaynak: KAYNAK,
      yayimTarihi: null,
      sayfalar: SAYFALAR,
    });
    expect(cerceve.dogrulandi).toBe(false);
    expect(() => uzmanOnayi(cerceve, { dogrulayan: " ", zaman: "2026-10-27T10:00:00Z" })).toThrow();
    const onayli = uzmanOnayi(cerceve, { dogrulayan: "Uzman Örnek", zaman: "2026-10-27T10:00:00Z" });
    expect(onayli.dogrulandi).toBe(true);
    expect(cerceve.dogrulandi).toBe(false);
  });

  it("özetsiz belge ve ölçütsüz belge içe aktarılmaz", () => {
    const g = { kod: "ornek", ad: "Ö", surum: "1", yayimTarihi: null, sayfalar: SAYFALAR };
    expect(() => taslakCerceve({ ...g, kaynak: { ...KAYNAK, sha256: null } })).toThrow(/özeti/);
    expect(() => taslakCerceve({ ...g, kaynak: KAYNAK, sayfalar: [{ sayfa: 1, metin: "yok" }] })).toThrow();
  });

  it("doğrulanmamış metinli çerçeve onaylanamaz", () => {
    expect(() => uzmanOnayi(YOKAK_KURUMSAL_2020, { dogrulayan: "U", zaman: "z" })).toThrow();
  });
});

describe("sürümler", () => {
  const surum = (s: string, baslik: string) =>
    taslakCerceve({
      kod: "ornek",
      ad: "Örnek",
      surum: s,
      kaynak: KAYNAK,
      yayimTarihi: null,
      sayfalar: [{ sayfa: 1, metin: `X.1 ${baslik}` }],
    }).cerceve;

  it("rapor eski sürüme bağlı kalır", () => {
    const k = new CerceveKutuphanesi();
    k.ekle(surum("1", "Eski"));
    const rapor = k.bagla("ornek", "1");
    k.ekle(surum("2", "Yeni"));
    expect(k.cozumle(rapor).olcutler[0]?.baslik).toBe("Eski");
    expect(k.surumler("ornek")).toEqual(["1", "2"]);
  });

  it("aynı sürüm farklı içerikle eklenemez, kayıt değiştirilemez", () => {
    const k = new CerceveKutuphanesi();
    const c = k.ekle(surum("1", "Eski"));
    expect(k.ekle(surum("1", "Eski"))).toBe(c);
    expect(() => k.ekle(surum("1", "Başka"))).toThrow(/yeni sürüm/);
    expect(() => {
      (c.olcutler[0] as { baslik: string }).baslik = "x";
    }).toThrow();
    expect(() => k.bagla("ornek", "9")).toThrow();
    expect(() => k.cozumle({ cerceveKod: "yok", cerceveSurum: "1" })).toThrow();
  });
});

describe("eşleme", () => {
  const oneri = {
    id: "e1",
    kaynak: { cerceveKod: "akredit-onlisans-ic", cerceveSurum: "0.1", olcutKod: "P.2" },
    hedef: { cerceveKod: "yokak-kurumsal", cerceveSurum: "2020", olcutKod: "B.1.3" },
    gerekce: "İkisi de ders–çıktı eşleştirmesini ister.",
    uretici: "kural" as const,
    risk: "orta" as const,
    olusturma: "2026-10-27T10:00:00Z",
  };

  it("öneri iki uçta da var olan ölçüte işaret etmeli", () => {
    expect(eslemeOnerisiDogrula(oneri, ILK_CERCEVELER)).toEqual([]);
    const kotu = { ...oneri, hedef: { ...oneri.hedef, olcutKod: "Z.9" } };
    expect(eslemeOnerisiDogrula(kotu, ILK_CERCEVELER)).toHaveLength(1);
    expect(eslemeOnerisiDogrula({ ...oneri, hedef: oneri.kaynak }, ILK_CERCEVELER)).toContain(
      "Eşleme iki farklı çerçeve arasında olmalı.",
    );
    expect(eslemeOnerisiDogrula({}, ILK_CERCEVELER).length).toBeGreaterThan(0);
  });

  it("yalnız kişinin onayladığı eşleme geçerlidir, ikinci karar reddedilir", () => {
    const karar = { oneriId: "e1", sonuc: "onaylandi" as const, kararVeren: "Uzman Örnek", zaman: "z" };
    expect(gecerliEslemeler([oneri], [])).toEqual([]);
    expect(eslemeKarariDogrula(oneri, { ...karar, kararVeren: "" })).toHaveLength(1);
    expect(eslemeKarariDogrula(oneri, karar, [karar])).toHaveLength(1);
    expect(eslemeKarariDogrula(oneri, { ...karar, oneriId: "x" })).toHaveLength(1);
    expect(gecerliEslemeler([oneri], [karar])).toEqual([oneri]);
  });
});
