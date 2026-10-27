import { describe, expect, it } from "vitest";
import {
  atlasKiyasla,
  havuzKiyasla,
  izinGecerliMi,
  type KendiOlgunluk,
  type KiyaslamaIzni,
  kidrKiyasla,
  yuzdelik,
} from "../src/index.ts";

const AN = "2026-10-27T10:00:00.000Z";
const izin = (kurumId: string, ek: Partial<KiyaslamaIzni> = {}): KiyaslamaIzni => ({
  kurumId,
  gostergeler: ["G1"],
  verenKisiId: `kisi-${kurumId}`,
  verildi: "2026-01-01T00:00:00.000Z",
  bitis: null,
  geriAlindi: null,
  ...ek,
});
const katki = (kurumId: string, deger: number, gostergeKodu = "G1", donem = "2025") => ({
  kurumId,
  gostergeKodu,
  donem,
  deger,
});

// Uydurma kurumlar: K0 isteyen; K1..K6 diğerleri.
const kurumlar = ["K0", "K1", "K2", "K3", "K4", "K5", "K6"];
const degerler = [50, 10, 20, 30, 40, 60, 70];
const tumKatkilar = kurumlar.map((k, i) => katki(k, degerler[i] as number));
const tumIzinler = kurumlar.map((k) => izin(k));

describe("izin", () => {
  it("süre, geri alma ve kapsamı denetler", () => {
    expect(izinGecerliMi(izin("A"), "G1", AN)).toBe(true);
    expect(izinGecerliMi(izin("A"), "G2", AN)).toBe(false);
    expect(izinGecerliMi(izin("A", { gostergeler: ["*"] }), "G2", AN)).toBe(true);
    expect(izinGecerliMi(izin("A", { verildi: "2027-01-01T00:00:00.000Z" }), "G1", AN)).toBe(false);
    expect(izinGecerliMi(izin("A", { bitis: "2026-06-01T00:00:00.000Z" }), "G1", AN)).toBe(false);
    expect(izinGecerliMi(izin("A", { bitis: "2027-06-01T00:00:00.000Z" }), "G1", AN)).toBe(true);
    expect(izinGecerliMi(izin("A", { geriAlindi: "2026-10-01T00:00:00.000Z" }), "G1", AN)).toBe(false);
    expect(izinGecerliMi(izin("A", { geriAlindi: "2026-12-01T00:00:00.000Z" }), "G1", AN)).toBe(true);
  });
});

describe("havuzKiyasla", () => {
  it("izinli 7 kurumla doğru, deterministik dağılım", () => {
    const s = havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler, AN);
    // sıralı: 10,20,30,40,50,60,70 → ortalama 280/7=40, medyan 40,
    // Ç1: h=6*0.25=1.5 → 20+0.5*10=25, Ç3: h=4.5 → 50+0.5*10=55; K0=50'nin altında 4 değer → 4/7=0.57
    expect(s).toEqual({
      durum: "hazir",
      gostergeKodu: "G1",
      donem: "2025",
      kurumSayisi: 7,
      ortalama: 40,
      medyan: 40,
      ceyrek1: 25,
      ceyrek3: 55,
      kendi: { deger: 50, altindakiOran: 0.57 },
    });
    // Girdi sırası sonucu değiştirmez.
    const ters = havuzKiyasla("K0", "G1", "2025", [...tumKatkilar].reverse(), [...tumIzinler].reverse(), AN);
    expect(ters).toEqual(s);
  });

  it("sonuç başka kurumun kimliğini ya da tek değerini içermez", () => {
    const s = havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler, AN);
    const metin = JSON.stringify(s);
    for (const k of kurumlar.slice(1)) expect(metin).not.toContain(k);
    expect(metin).not.toContain("kisi-");
    // En küçük (10) ve en büyük (70) değer görünmez.
    expect(Object.values(s)).not.toContain(10);
    expect(Object.values(s)).not.toContain(70);
  });

  it("izni olmayan, süresi geçen ya da geri alan kurumun verisi hesaba girmez", () => {
    const izinler = [
      ...tumIzinler.slice(0, 5),
      izin("K5", { geriAlindi: "2026-10-01T00:00:00.000Z" }),
      izin("K6", { gostergeler: ["G2"] }),
    ];
    // K1..K4 kalır: 4 < 5 → sayı yok.
    const s = havuzKiyasla("K0", "G1", "2025", tumKatkilar, izinler, AN);
    expect(s.durum).toBe("yetersiz_grup");
    expect(Object.keys(s).sort()).toEqual(["donem", "durum", "gostergeKodu", "ileti"]);
    // Yedi izinli + izinsiz bir kurumun uç değeri sonucu değiştirmez.
    const ek = havuzKiyasla("K0", "G1", "2025", [...tumKatkilar, katki("IZINSIZ", 1e6)], tumIzinler, AN);
    expect(ek).toEqual(havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler, AN));
  });

  it("isteyen izin vermediyse kendi değeri hesaba girmez, başkalarını yine toplu görür", () => {
    const s = havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler.slice(1), AN);
    // K1..K6: 10..70 (50 hariç) → ortalama 230/6 = 38.33
    expect(s).toMatchObject({ durum: "hazir", kurumSayisi: 6, ortalama: 38.33, kendi: null });
  });

  it("en az grup isteyen hariç sayılır ve 5'in altına indirilemez", () => {
    // K0 + 4 diğer = 5 kurum ama diğer 4 → yetersiz.
    const s = havuzKiyasla("K0", "G1", "2025", tumKatkilar.slice(0, 5), tumIzinler, AN);
    expect(s.durum).toBe("yetersiz_grup");
    expect(havuzKiyasla("K0", "G1", "2025", tumKatkilar.slice(0, 5), tumIzinler, AN, { enAzGrup: 2 }).durum).toBe(
      "yetersiz_grup",
    );
    expect(havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler, AN, { enAzGrup: 7 }).durum).toBe("yetersiz_grup");
    expect(havuzKiyasla("K0", "G1", "2025", tumKatkilar, tumIzinler, AN, { enAzGrup: 6 }).durum).toBe("hazir");
  });

  it("çelişen katkılı kurumu dışlar, başka dönem ve göstergeyi karıştırmaz", () => {
    const katkilar = [...tumKatkilar, katki("K6", 71), katki("K1", 999, "G2"), katki("K2", 999, "G1", "2024")];
    const s = havuzKiyasla("K0", "G1", "2025", katkilar, tumIzinler, AN);
    // K6 dışlandı: 10,20,30,40,50,60 → ortalama 35
    expect(s).toMatchObject({ durum: "hazir", kurumSayisi: 6, ortalama: 35 });
  });

  it("kişi alanı taşıyan katkıyı ve geçersiz izni reddeder", () => {
    expect(() => havuzKiyasla("K0", "G1", "2025", [{ ...katki("K1", 1), ogrenciNo: "123" }], tumIzinler, AN)).toThrow();
    expect(() => havuzKiyasla("K0", "G1", "2025", [], [{ kurumId: "K1" }], AN)).toThrow();
  });

  it("yüzdelik tek elemanda o elemandır", () => {
    expect(yuzdelik([7], 0.5)).toBe(7);
  });
});

const kaynak = (n: number) => ({
  adres: `https://yokatlas.yok.gov.tr/content/lisans-dynamic/1000_1.php?y=10000000${n}`,
  okunma: AN,
  ozet: null,
});
const atlas = (n: number, doluluk: number | null, yil = 2025) => ({
  programKodu: `10000000${n}`,
  yil,
  kontenjan: 100,
  yerlesen: doluluk === null ? null : doluluk * 100,
  tabanPuan: null,
  basariSirasi: null,
  doluluk,
  kaynak: kaynak(n),
});

describe("atlasKiyasla", () => {
  it("aynı yılın benzer programlarıyla kaynaklı kıyas", () => {
    const s = atlasKiyasla(
      atlas(1, 0.9),
      [atlas(2, 0.8), atlas(3, 1), atlas(4, 0.95), atlas(5, null), atlas(6, 0.5, 2024), atlas(1, 0.9), atlas(2, 0.1)],
      "doluluk",
    );
    // 0.8, 0.95, 1 → medyan 0.95, Ç1 0.875, Ç3 0.975; 0.9'un altında 1/3
    expect(s).toEqual({
      durum: "hazir",
      alan: "doluluk",
      kendi: 0.9,
      karsilastirmaSayisi: 3,
      medyan: 0.95,
      ceyrek1: 0.875,
      ceyrek3: 0.975,
      altindakiOran: 0.33,
      kaynaklar: [kaynak(2), kaynak(3), kaynak(4)],
    });
  });

  it("kendi ya da karşı değer yoksa EKSİK; kaynaksız kayıt reddedilir", () => {
    expect(atlasKiyasla(atlas(1, null), [atlas(2, 0.8)], "doluluk").durum).toBe("EKSIK");
    expect(atlasKiyasla(atlas(1, 0.5), [], "doluluk").durum).toBe("EKSIK");
    const { kaynak: _k, ...kaynaksiz } = atlas(2, 0.8);
    expect(() => atlasKiyasla(atlas(1, 0.5), [kaynaksiz], "doluluk")).toThrow();
  });
});

const ozet = "a".repeat(64);
const acikKidr = (kurumAdi: string, olcutKod: string, duzey: number, yil = 2025) => ({
  kurumAdi,
  yil,
  olcutKod,
  duzey,
  sayfa: 12,
  kaynak: { adres: `https://ornek.edu.tr/${kurumAdi}/kidr.pdf`, okunma: AN, ozet },
});

describe("kidrKiyasla", () => {
  it("yalnız komisyonun kesin düzeyiyle kıyaslar", () => {
    const kendi: KendiOlgunluk[] = [
      { olcutKod: "A.1.1", karar: "onaylandi", kesinDuzey: 3 },
      { olcutKod: "A.1.2", karar: "bekliyor", kesinDuzey: null },
      { olcutKod: "B.1.1", karar: "duzeltildi", kesinDuzey: 4 },
    ];
    const acik = [
      acikKidr("Ornek Uni X", "A.1.1", 2),
      acikKidr("Ornek Uni Y", "A.1.1", 4),
      acikKidr("Ornek Uni Y", "A.1.1", 5),
      acikKidr("Ornek Uni Z", "A.1.1", 3, 2024),
    ];
    const s = kidrKiyasla(kendi, acik, 2025);
    expect(s.map((x) => x.durum)).toEqual(["hazir", "EKSIK", "EKSIK"]);
    // A.1.1: 2,4 → medyan 3; 3'ün altında 1/2
    expect(s[0]).toMatchObject({ kendi: 3, karsilastirmaSayisi: 2, medyan: 3, altindakiOran: 0.5 });
  });

  it("belge özeti olmayan açık KİDR kaydını reddeder", () => {
    const k = acikKidr("Ornek Uni X", "A.1.1", 2);
    expect(() => kidrKiyasla([], [{ ...k, kaynak: { ...k.kaynak, ozet: null } }], 2025)).toThrow();
  });
});
