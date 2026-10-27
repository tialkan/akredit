import type { KurumId } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import {
  type EylemAlicisi,
  egilim,
  type GostergeOlcumu,
  type GostergeTanimi,
  gostergeHesapla,
  gostergeleriDenetle,
  gostergeTanimiOku,
  hedefSapmasi,
  hesapMetni,
  izlenebilirMi,
  kaynakKaniti,
  kaynakMetni,
  raporTablosu,
  sapmaEylemOnerisi,
  type VeriNoktasi,
  veriNoktasiOku,
  yuvarla,
} from "../src/index.ts";

// Uydurma örnek veri.
const ATLAS = {
  tur: "baglayici",
  baglayici: "yokatlas",
  adres: "https://yokatlas.example/1",
  okunma: "2026-09-01T00:00:00Z",
  kanitId: "k-atlas",
} as const;
const ELLE = { tur: "elle", kisiId: "p1", kanitId: "k-elle", zaman: "2026-09-02T00:00:00Z" } as const;
const ANKET = { tur: "anket", anketId: "a1", soru: "S3" } as const;

const doluluk = gostergeTanimiOku({
  kod: "PG-1",
  ad: "Doluluk oranı",
  birim: "%",
  plan: "stratejik_plan",
  planHedefi: "A1.H1",
  yontem: { tur: "oran", pay: "yerlesen", payda: "kontenjan", carpan: 100 },
  kaynaklar: ["baglayici", "elle"],
  donemTuru: "yil",
  yon: "artan",
  hedefler: [
    { donem: "2025", deger: 95 },
    { donem: "2026", deger: 100 },
  ],
});

const v = (anahtar: string, donem: string, deger: number, kaynak: VeriNoktasi["kaynak"] = ATLAS): VeriNoktasi => ({
  anahtar,
  donem,
  deger,
  kaynak,
});

const VERI: VeriNoktasi[] = [
  v("kontenjan", "2024", 80),
  v("yerlesen", "2024", 70),
  v("kontenjan", "2025", 80),
  v("yerlesen", "2025", 76),
  v("kontenjan", "2026", 80),
  v("yerlesen", "2026", 72, ELLE),
];

describe("tanım", () => {
  it("varsayılanları doldurur, geçersiz tanımı reddeder", () => {
    expect(doluluk.tolerans).toBe(0.05);
    expect(() => gostergeTanimiOku({ kod: "x" })).toThrow();
  });
  it("kanıtsız elle girişi reddeder", () => {
    expect(() =>
      veriNoktasiOku({ anahtar: "a", donem: "2026", deger: 1, kaynak: { tur: "elle", kisiId: "p", zaman: "z" } }),
    ).toThrow();
    expect(veriNoktasiOku(v("a", "2026", 1)).deger).toBe(1);
  });
});

describe("hesap", () => {
  it("oran: 76/80×100 = 95, girdiler kaynaklarıyla", () => {
    const o = gostergeHesapla(doluluk, "2025", VERI);
    expect(o.deger).toBe(95);
    expect(o.durum).toBe("hesaplandi");
    expect(o.girdiler.map((g) => g.kaynak)).toEqual([ATLAS, ATLAS]);
    expect(izlenebilirMi(doluluk, o)).toBe(true);
    expect(o.hesap).toBe("yerlesen / kontenjan × 100");
  });

  it("toplam, ortalama, değer", () => {
    const t = (yontem: unknown): GostergeTanimi =>
      gostergeTanimiOku({ ...doluluk, yontem, kaynaklar: ["anket", "olcme"] });
    const veri = [v("a", "d", 1, ANKET), v("b", "d", 2, { tur: "olcme", sonucId: "s1" })];
    // 1 + 2 = 3; (1+2)/2 = 1,5
    expect(gostergeHesapla(t({ tur: "toplam", anahtarlar: ["a", "b"] }), "d", veri).deger).toBe(3);
    expect(gostergeHesapla(t({ tur: "ortalama", anahtarlar: ["a", "b"] }), "d", veri).deger).toBe(1.5);
    expect(gostergeHesapla(t({ tur: "deger", anahtar: "b" }), "d", veri).deger).toBe(2);
    expect(hesapMetni(t({ tur: "ortalama", anahtarlar: ["a", "b"] }))).toBe("(a + b) / 2");
    expect(hesapMetni(t({ tur: "toplam", anahtarlar: ["a", "b"] }))).toBe("a + b");
    expect(hesapMetni(t({ tur: "deger", anahtar: "a" }))).toBe("a");
    expect(hesapMetni(t({ tur: "oran", pay: "a", payda: "b" }))).toBe("a / b");
  });

  it("2/3 yuvarlanır: 66,6667", () => {
    expect(yuvarla((2 / 3) * 100)).toBe(66.6667);
  });

  it("eksik veri, sıfır payda, izinsiz ve geçersiz kaynak, çelişki EKSİK olur", () => {
    const yok = gostergeHesapla(doluluk, "2030", VERI);
    expect(yok.deger).toBeNull();
    expect(yok.eksikler).toHaveLength(2);
    expect(izlenebilirMi(doluluk, yok)).toBe(true);

    const sifir = gostergeHesapla(doluluk, "d", [v("yerlesen", "d", 1), v("kontenjan", "d", 0)]);
    expect(sifir.eksikler[0]).toMatch(/sıfır/);

    const izinsiz = gostergeHesapla(doluluk, "d", [v("yerlesen", "d", 1, ANKET), v("kontenjan", "d", 2)]);
    expect(izinsiz.eksikler[0]).toMatch(/izin verilmeyen kaynak.*anket/);

    const bozuk = gostergeHesapla(doluluk, "d", [
      { anahtar: "yerlesen", donem: "d", deger: 1, kaynak: { tur: "elle" } as never },
      v("kontenjan", "d", 2),
    ]);
    expect(bozuk.eksikler[0]).toMatch(/kaynağı eksik/);

    const celiski = gostergeHesapla(doluluk, "d", [
      v("yerlesen", "d", 1),
      v("yerlesen", "d", 2, ELLE),
      v("kontenjan", "d", 2),
    ]);
    expect(celiski.eksikler[0]).toMatch(/farklı değer/);

    // Aynı değeri veren iki kaynak çelişki değildir.
    const ayni = gostergeHesapla(doluluk, "d", [
      v("yerlesen", "d", 1),
      v("yerlesen", "d", 1, ELLE),
      v("kontenjan", "d", 2),
    ]);
    expect(ayni.deger).toBe(50);
  });

  it("izlenebilirlik denetimi bozulmuş ölçümü yakalar", () => {
    const o = gostergeHesapla(doluluk, "2025", VERI);
    expect(izlenebilirMi(doluluk, { ...o, girdiler: o.girdiler.slice(1) })).toBe(false);
    expect(izlenebilirMi(doluluk, { ...o, girdiler: o.girdiler.map((g) => ({ ...g, kaynak: ANKET })) })).toBe(false);
    expect(izlenebilirMi(doluluk, { ...o, deger: null, durum: "EKSIK", eksikler: [] })).toBe(false);
  });

  it("kaynak metni ve kanıtı", () => {
    expect(kaynakMetni(ATLAS)).toBe("Bağlayıcı: yokatlas (https://yokatlas.example/1, 2026-09-01)");
    expect(kaynakMetni(ANKET)).toBe("Anket a1, soru S3");
    expect(kaynakMetni({ tur: "olcme", sonucId: "s" })).toBe("Ölçme sonucu s");
    expect(kaynakMetni(ELLE)).toBe("Elle giriş, kanıt k-elle (2026-09-02)");
    expect(kaynakKaniti(ANKET)).toBeNull();
    expect(kaynakKaniti({ ...ATLAS, kanitId: undefined })).toBeNull();
  });
});

describe("hedef sapması", () => {
  const olc = (donem: string, deger: number | null): GostergeOlcumu => ({
    kod: "PG-1",
    donem,
    deger,
    durum: deger === null ? "EKSIK" : "hesaplandi",
    girdiler: [],
    eksikler: deger === null ? ["yok"] : [],
    hesap: "",
  });
  it("artan yön: hedefte, uyarı (≤%5), sapma", () => {
    // 2026 hedef 100: 100 → hedefte; 96 → gerilik 4, %4 → uyarı; 90 → %10 → sapma
    expect(hedefSapmasi(doluluk, olc("2026", 100)).durum).toBe("hedefte");
    expect(hedefSapmasi(doluluk, olc("2026", 96))).toEqual({
      durum: "uyari",
      hedef: 100,
      gerilik: 4,
      bagilGerilik: 0.04,
    });
    expect(hedefSapmasi(doluluk, olc("2026", 90)).durum).toBe("sapma");
    expect(hedefSapmasi(doluluk, olc("2026", null)).durum).toBe("EKSIK");
    expect(hedefSapmasi(doluluk, olc("2040", 1)).durum).toBe("hedef_yok");
  });
  it("azalan yön ve sıfır hedef", () => {
    const t = { ...doluluk, yon: "azalan" as const, hedefler: [{ donem: "d", deger: 0 }] };
    expect(hedefSapmasi(t, olc("d", 0)).durum).toBe("hedefte");
    expect(hedefSapmasi(t, olc("d", 1))).toEqual({ durum: "sapma", hedef: 0, gerilik: 1, bagilGerilik: null });
  });
  it("eğilim: en küçük kareler", () => {
    // 87,5; 95; 90 → x̄=1, ȳ=90,8333; eğim = ((-1)(-3,333)+0+(1)(-0,8333))/2 = 1,25
    const o = ["2024", "2025", "2026"].map((d) => gostergeHesapla(doluluk, d, VERI));
    expect(o.map((x) => x.deger)).toEqual([87.5, 95, 90]);
    expect(egilim(doluluk, o)).toEqual({ egim: 1.25, yorum: "iyilesiyor" });
    expect(egilim({ ...doluluk, yon: "azalan" }, o).yorum).toBe("kotulesiyor");
    expect(egilim(doluluk, [olc("a", 5), olc("b", 5)]).yorum).toBe("durgun");
    expect(egilim(doluluk, [olc("a", 5), olc("b", null)]).yorum).toBe("yetersiz_veri");
  });
});

describe("eylem önerisi", () => {
  const b = { kurumId: "kurum-1" as KurumId, simdi: "2026-10-27T00:00:00.000Z", oneriId: () => "oneri-1" };
  it("sapmada kural önerisi üretir, sayılar hesaptan, atıflar kanıtlardan", () => {
    // 2026: 72/80×100 = 90, hedef 100 → gerilik 10, %10 > %5
    const o = gostergeHesapla(doluluk, "2026", VERI);
    const oneri = sapmaEylemOnerisi(doluluk, o, b);
    expect(oneri).not.toBeNull();
    expect(oneri?.tur).toBe("eylem");
    expect(oneri?.risk).toBe("orta");
    expect(oneri?.uretici).toEqual({ tur: "kural", kural: "gosterge_hedef_sapmasi", surum: "1" });
    expect(oneri?.icerik).toMatchObject({ deger: 90, hedef: 100, gerilik: 10, gostergeKod: "PG-1" });
    expect(oneri?.atiflar.map((a) => a.kanitId).sort()).toEqual(["k-atlas", "k-elle"]);
    expect(oneri?.gerekce).toContain("yerlesen / kontenjan × 100");
  });
  it("hedefte ya da uyarıda öneri yok", () => {
    expect(sapmaEylemOnerisi(doluluk, gostergeHesapla(doluluk, "2025", VERI), b)).toBeNull();
  });
  it("denetim süreç motoruna yalnız sapanları iletir", async () => {
    const gelen: unknown[] = [];
    const alici: EylemAlicisi = { eylemOner: (o) => void gelen.push(o) };
    const s = await gostergeleriDenetle([doluluk], VERI, "2026", b, alici);
    expect(gelen).toHaveLength(1);
    expect(s.oneriler).toEqual(gelen);
    expect((await gostergeleriDenetle([doluluk], VERI, "2025", b, alici)).oneriler).toHaveLength(0);
  });
});

describe("rapor tablosu", () => {
  it("dönem değerleri, son hedef ve durum", () => {
    const [s] = raporTablosu([doluluk], VERI, ["2024", "2025", "2026"]);
    expect(s).toMatchObject({
      kod: "PG-1",
      degerler: { "2024": 87.5, "2025": 95, "2026": 90 },
      hedef: 100,
      sonDurum: "sapma",
      planHedefi: "A1.H1",
    });
    expect(raporTablosu([doluluk], VERI, ["2025"], "faaliyet_raporu")).toEqual([]);
    expect(raporTablosu([{ ...doluluk, planHedefi: undefined }], VERI, [])[0]).toMatchObject({
      sonDurum: "EKSIK",
      planHedefi: null,
    });
  });
});
