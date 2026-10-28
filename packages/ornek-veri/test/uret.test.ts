import { dersiOlc, ortalama } from "@akredit/olcme";
import { beforeAll, describe, expect, it } from "vitest";
import {
  DEMO_ROLLERI,
  esikAltiCiktilar,
  type OrnekUniversite,
  ornekUniversiteUret,
  rastgele,
  UYDURMA_SOYADLAR,
  yuzde,
} from "../src/index.ts";

let u: OrnekUniversite;
beforeAll(() => {
  u = ornekUniversiteUret();
});

describe("rastgele", () => {
  it("aynı tohum aynı diziyi, farklı tohum farklı diziyi verir", () => {
    const a = rastgele(7);
    const b = rastgele(7);
    const c = rastgele(8);
    const da = [a.sayi(), a.sayi(), a.sayi()];
    expect([b.sayi(), b.sayi(), b.sayi()]).toEqual(da);
    expect([c.sayi(), c.sayi(), c.sayi()]).not.toEqual(da);
    for (const x of da) expect(x >= 0 && x < 1).toBe(true);
  });
  it("tam sayı aralığın içinde kalır, boş diziden seçim hata verir", () => {
    const r = rastgele(1);
    for (let i = 0; i < 200; i++) {
      const x = r.tam(3, 5);
      expect(x >= 3 && x <= 5).toBe(true);
    }
    expect(() => r.sec([])).toThrow();
    expect(r.onaltilik(12)).toMatch(/^[0-9a-f]{12}$/u);
  });
});

describe("yuzde", () => {
  it("virgüllü tek ondalık yazar", () => {
    // İkilik tabanda tam gösterilebilen değerler seçildi: 71.5 → "%71,5", 60 → "%60,0".
    expect(yuzde(71.5)).toBe("%71,5");
    expect(yuzde(60)).toBe("%60,0");
  });
});

describe("Örnek Üniversitesi üreteci", () => {
  it("belirlenimcidir: aynı tohum aynı veri, farklı tohum farklı veri", () => {
    const kucuk1 = ornekUniversiteUret({ tohum: 11, ogrenciSayisi: 400 });
    const kucuk2 = ornekUniversiteUret({ tohum: 11, ogrenciSayisi: 400 });
    const kucuk3 = ornekUniversiteUret({ tohum: 12, ogrenciSayisi: 400 });
    expect(JSON.stringify(kucuk2)).toBe(JSON.stringify(kucuk1));
    expect(kucuk3.ogrenciler[0]?.takmaAd).not.toBe(kucuk1.ogrenciler[0]?.takmaAd);
  });

  it("kapsamdaki büyüklükte: 3 fakülte, 10 program, 120 ders, 5.000 öğrenci", () => {
    expect(u.birimler.filter((b) => b.tur === "fakulte")).toHaveLength(3);
    expect(u.programlar).toHaveLength(10);
    expect(u.dersler).toHaveLength(120);
    expect(u.ogrenciler).toHaveLength(5000);
    expect(new Set(u.ogrenciler.map((o) => o.takmaAd)).size).toBe(5000);
    expect(u.acilislar).toHaveLength(120);
    // Her açılışta soru bazlı döküm: 9 soru × sınıftaki öğrenci sayısı (5000 / 10 program / 4 sınıf = 125).
    const ilk = u.acilislar[0];
    expect(ilk?.veri.puanlar).toHaveLength(9 * 125);
  });

  it("öğrenci yalnız takma adla temsil edilir", () => {
    for (const o of u.ogrenciler) expect(o.takmaAd).toMatch(/^T-[0-9a-f]{12}$/u);
    const metin = JSON.stringify(u.acilislar.map((a) => a.veri.puanlar));
    expect(metin).not.toMatch(/@|ad_soyad|numara/iu);
  });

  it("ölçme sonuçları @akredit/olcme ile birebir aynıdır (elle yazılmış sayı yok)", () => {
    for (const a of u.acilislar.slice(0, 15)) {
      const d = u.dersler.find((x) => x.anahtar === a.ders);
      const yeniden = dersiOlc(a.veri, { esik: 60, ...(d?.matris ? { matris: d.matris } : {}) });
      expect(yeniden).toEqual(a.sonuc);
    }
  });

  it("eşik altı sonuçlar ve bilinçli eksikler vardır", () => {
    const esikAlti = u.acilislar.filter((a) => esikAltiCiktilar(a).length > 0);
    expect(esikAlti.length).toBeGreaterThanOrEqual(3);
    // Öğretim elemanı rolünün dersi (Algoritma Analizi) eşik altıdır: tur bu dersi gösterir.
    const aa = u.dersler.find((d) => d.ad === "Algoritma Analizi");
    expect(esikAlti.some((a) => a.ders === aa?.anahtar)).toBe(true);
    const turler = new Set(u.eksikler.map((e) => e.tur));
    for (const t of ["matris", "olculmeyen_cikti", "akts_tablosu", "tutanak", "anket_esigi"])
      expect(turler.has(t as never)).toBe(true);
    // Ölçülmeyen ÇK: dersiOlc sonucunda ÖÇ4 için soru sayısı 0.
    const ra = u.dersler.find((d) => d.ad === "Reel Analiz");
    const raSonuc = u.acilislar.find((a) => a.ders === ra?.anahtar)?.sonuc;
    expect(raSonuc?.ckBasarilari.find((c) => c.ckKod === "ÖÇ4")?.soruSayisi).toBe(0);
    // Matrissiz ders: PÇ sağlanması boş.
    const ys = u.dersler.find((d) => d.ad === "Yapı Statiği");
    expect(u.acilislar.find((a) => a.ders === ys?.anahtar)?.sonuc.pcSaglanmasi).toEqual([]);
  });

  it("öneri metnindeki yüzde, ölçme sonucundan biçimlendirilir", () => {
    const o = u.oneriler.find((x) => x.tur === "eylem");
    expect(o).toBeDefined();
    const a = u.acilislar.find((x) => o?.anahtar.startsWith(`eylem-${x.anahtar}-`));
    const ck = esikAltiCiktilar(a as never)[0];
    expect(o?.metin).toContain(yuzde(ck?.ortalama as number));
  });

  it("anket özetleri yanıtlardan hesaplanır", () => {
    const a = u.anketler[5];
    const genel = a?.yanitlar.map((y) => y.genel).filter((v): v is number => typeof v === "number") ?? [];
    expect(a?.ozet.find((o) => o.kod === "genel")).toEqual({
      kod: "genel",
      n: genel.length,
      ortalama: ortalama(genel),
    });
  });

  it("adlar açıkça uydurmadır; gerçek bir üniversite adı geçmez", () => {
    expect(u.kurum.ad).toBe("Örnek Üniversitesi");
    for (const k of u.kisiler) {
      const soyad = k.adSoyad.split(" ").at(-1);
      expect(UYDURMA_SOYADLAR).toContain(soyad);
    }
    const metin = JSON.stringify({ b: u.birimler, belgeler: u.belgeler, o: u.oneriler });
    // "<Ad> Üniversitesi" kalıbında yalnız "Örnek Üniversitesi" geçebilir.
    const universiteler = [...metin.matchAll(/(\p{Lu}[\p{L}]+) Üniversitesi/gu)].map((m) => m[1]);
    expect(new Set(universiteler)).toEqual(new Set(universiteler.length ? ["Örnek"] : []));
  });

  it("her demo rolü için persona ve rol ataması vardır", () => {
    expect(u.personalar.map((p) => p.rol)).toEqual([...DEMO_ROLLERI]);
    for (const p of u.personalar) {
      expect(u.kisiler.some((k) => k.anahtar === p.kisi)).toBe(true);
      expect(p.atamalar.length).toBeGreaterThan(0);
    }
  });

  it("öneri atıfları var olan belge ve bölümlere gider; yüksek riskli öneri vardır", () => {
    for (const o of u.oneriler)
      for (const a of o.atiflar) {
        const b = u.belgeler.find((x) => x.anahtar === a.belge);
        expect(b, a.belge).toBeDefined();
        expect(b?.bolumler[a.bolum]?.metin).toContain(a.alinti.split("\n")[0]?.slice(0, 40) ?? "");
      }
    expect(u.oneriler.some((o) => o.risk === "yuksek")).toBe(true);
  });
});
