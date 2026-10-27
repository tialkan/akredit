import { describe, expect, it } from "vitest";
import {
  type BirimId,
  gecerliKarar,
  type Karar,
  type KararId,
  type KisiId,
  type KurumId,
  kararDogrula,
  kararIcerigi,
  matrisOnerisiIncelemesi,
  type Oneri,
  type OneriId,
  oneriRiski,
  type PolitikaId,
  type ProgramId,
  politikaUygulanirMi,
  type YetkiPolitikasi,
} from "../src/index.ts";

const kurum = "kurum-1" as KurumId;
const oneri = (ek: Partial<Oneri> = {}): Oneri => ({
  id: "o1" as OneriId,
  kurumId: kurum,
  tur: "kanit_etiketi",
  hedef: { tur: "kanit", id: "k1" },
  icerik: "Danışma kurulu",
  gerekce: "g",
  atiflar: [],
  guven: 0.9,
  uretici: { tur: "kural", kural: "r", surum: "1" },
  risk: "dusuk",
  olusturma: "2026-10-01T00:00:00Z",
  ...ek,
});
const karar = (ek: Partial<Karar> = {}): Karar => ({
  id: "k1" as KararId,
  oneriId: "o1" as OneriId,
  sonuc: "onaylandi",
  duzeltme: null,
  kararVeren: "kisi-1" as KisiId,
  dayanak: { tur: "dogrudan" },
  gerekce: null,
  zaman: "2026-10-02T00:00:00Z",
  ...ek,
});
const politika = (
  ek: Partial<YetkiPolitikasi> = {},
  kapsam: Partial<YetkiPolitikasi["kapsam"]> = {},
): YetkiPolitikasi => ({
  id: "p1" as PolitikaId,
  kurumId: kurum,
  ad: "Etiket politikası",
  kapsam: { oneriTurleri: ["kanit_etiketi", "matris_katkisi"], enYuksekRisk: "orta", enDusukGuven: 0.8, ...kapsam },
  imzalayan: "kisi-1" as KisiId,
  baslangic: "2026-10-01T00:00:00Z",
  bitis: "2026-12-01T00:00:00Z",
  olusturma: "2026-09-30T00:00:00Z",
  ...ek,
});
const SIMDI = "2026-10-15T00:00:00Z";

describe("öneri riski", () => {
  it("tablodan gelir", () => {
    expect(oneriRiski("kanit_etiketi")).toBe("dusuk");
    expect(oneriRiski("matris_katkisi")).toBe("orta");
    expect(oneriRiski("dis_gonderim")).toBe("yuksek");
  });
});

describe("karar doğrulama", () => {
  it("geçerli onay", () => {
    expect(kararDogrula(oneri(), karar())).toEqual({ gecerli: true, hatalar: [] });
  });
  it("tek karar kuralı: aynı öneriye ikinci karar verilemez", () => {
    const r = kararDogrula(oneri(), karar({ id: "k2" as KararId }), [karar()]);
    expect(r.gecerli).toBe(false);
    expect(r.hatalar[0]).toMatch(/zaten karar verilmiş/);
    // Aynı kararın kendisi önceki listede ise sorun değil.
    expect(kararDogrula(oneri(), karar(), [karar()]).gecerli).toBe(true);
  });
  it("düzeltmede içerik zorunlu, retde ve onayda içerik yok", () => {
    expect(kararDogrula(oneri(), karar({ sonuc: "duzeltildi" })).gecerli).toBe(false);
    expect(kararDogrula(oneri(), karar({ sonuc: "duzeltildi", duzeltme: "Yeni" })).gecerli).toBe(true);
    expect(kararDogrula(oneri(), karar({ sonuc: "reddedildi", duzeltme: "x" })).gecerli).toBe(false);
    expect(kararDogrula(oneri(), karar({ sonuc: "onaylandi", duzeltme: "x" })).gecerli).toBe(false);
  });
  it("karar veren zorunlu, başka öneriye ait karar reddedilir", () => {
    expect(kararDogrula(oneri(), karar({ kararVeren: " " as KisiId })).hatalar[0]).toMatch(/kimin verdiği/);
    expect(kararDogrula(oneri(), karar({ oneriId: "o9" as OneriId })).gecerli).toBe(false);
  });
  it("politika dayanağında politika kimliği zorunlu; yüksek risk politikayla karara bağlanamaz", () => {
    expect(kararDogrula(oneri(), karar({ dayanak: { tur: "politika", politikaId: "" as PolitikaId } })).gecerli).toBe(
      false,
    );
    expect(kararDogrula(oneri(), karar({ dayanak: { tur: "politika", politikaId: "p1" as PolitikaId } })).gecerli).toBe(
      true,
    );
    const y = oneri({ tur: "olgunluk_duzeyi", risk: "yuksek" });
    expect(kararDogrula(y, karar({ dayanak: { tur: "politika", politikaId: "p1" as PolitikaId } })).gecerli).toBe(
      false,
    );
    // Türü düşük olsa da önerinin kendi riski yüksekse politika kullanılamaz.
    expect(
      kararDogrula(oneri({ risk: "yuksek" }), karar({ dayanak: { tur: "politika", politikaId: "p1" as PolitikaId } }))
        .gecerli,
    ).toBe(false);
  });
});

describe("politika uygulanır mı", () => {
  it("bütün koşullar sağlanınca uygulanır", () => {
    expect(politikaUygulanirMi(oneri(), politika(), SIMDI)).toEqual({
      uygulanir: true,
      neden: "Politikanın bütün koşulları sağlanıyor.",
    });
  });

  it("yüksek risk hiçbir koşulda uygulanmaz", () => {
    const yuksekTurler = ["olgunluk_duzeyi", "yazma_plani", "dis_gonderim"] as const;
    for (const tur of yuksekTurler) {
      // Politika türü kapsasa, güven 1 olsa ve eşik 0 olsa bile.
      const p = politika({}, { oneriTurleri: [tur], enDusukGuven: 0 });
      const r = politikaUygulanirMi(oneri({ tur, risk: "dusuk", guven: 1 }), p, SIMDI);
      expect(r.uygulanir).toBe(false);
      expect(r.neden).toMatch(/Yüksek riskli/);
    }
    // Önerinin kendi riski yüksek.
    expect(politikaUygulanirMi(oneri({ risk: "yuksek", guven: 1 }), politika(), SIMDI).uygulanir).toBe(false);
    // Tip denetimini aşan "yuksek" eşikli politika da uygulanmaz.
    const hileli = politika({}, { enYuksekRisk: "yuksek" as unknown as "orta" });
    expect(politikaUygulanirMi(oneri({ tur: "matris_katkisi", risk: "orta" }), hileli, SIMDI).uygulanir).toBe(false);
  });

  it("iptal edilmiş politika uygulanmaz (inceleme bulgu 3)", () => {
    const p = politika();
    const r = politikaUygulanirMi(oneri(), p, SIMDI, { iptalEdilenler: new Set([p.id]) });
    expect(r).toEqual({ uygulanir: false, neden: "Politika iptal edildi." });
    expect(politikaUygulanirMi(oneri(), p, SIMDI, { iptalEdilenler: [p.id] }).uygulanir).toBe(false);
    expect(politikaUygulanirMi(oneri(), p, SIMDI, { iptalEdilenler: ["baska"] }).uygulanir).toBe(true);
  });

  it("güven eşiğe eşitse uygulanır, altındaysa uygulanmaz, null ise uygulanmaz", () => {
    expect(politikaUygulanirMi(oneri({ guven: 0.8 }), politika(), SIMDI).uygulanir).toBe(true);
    expect(politikaUygulanirMi(oneri({ guven: 0.79999 }), politika(), SIMDI).neden).toMatch(/eşiğinin altında/);
    expect(politikaUygulanirMi(oneri({ guven: null }), politika(), SIMDI).neden).toMatch(/güven değeri yok/);
  });

  it("zaman aralığı: başlangıç anında geçerli, bitiş anında geçersiz, bitişsiz süresiz", () => {
    expect(politikaUygulanirMi(oneri(), politika(), "2026-10-01T00:00:00Z").uygulanir).toBe(true);
    expect(politikaUygulanirMi(oneri(), politika(), "2026-09-30T23:59:59.999Z").neden).toMatch(/henüz başlamadı/);
    expect(politikaUygulanirMi(oneri(), politika(), "2026-11-30T23:59:59.999Z").uygulanir).toBe(true);
    expect(politikaUygulanirMi(oneri(), politika(), "2026-12-01T00:00:00Z").neden).toMatch(/süresi doldu/);
    expect(politikaUygulanirMi(oneri(), politika({ bitis: null }), "2030-01-01T00:00:00Z").uygulanir).toBe(true);
    expect(politikaUygulanirMi(oneri(), politika(), Date.parse(SIMDI)).uygulanir).toBe(true);
    expect(politikaUygulanirMi(oneri(), politika(), "geçersiz").neden).toMatch(/geçersiz/);
  });

  it("tür, risk eşiği, kurum ve imza denetlenir", () => {
    expect(politikaUygulanirMi(oneri({ tur: "eylem", risk: "orta" }), politika(), SIMDI).neden).toMatch(/türü/);
    const dusukEsik = politika({}, { enYuksekRisk: "dusuk" });
    expect(politikaUygulanirMi(oneri({ tur: "matris_katkisi", risk: "orta" }), dusukEsik, SIMDI).neden).toMatch(
      /riski/,
    );
    expect(politikaUygulanirMi(oneri({ kurumId: "k2" as KurumId }), politika(), SIMDI).neden).toMatch(
      /başka bir kuruma/,
    );
    expect(politikaUygulanirMi(oneri(), politika({ imzalayan: "" as KisiId }), SIMDI).neden).toMatch(/imzalayan/);
  });

  it("birim ve program kapsamı", () => {
    const p = politika({}, { birimIdleri: ["b1" as BirimId], programIdleri: ["pr1" as ProgramId] });
    expect(politikaUygulanirMi(oneri(), p, SIMDI).neden).toMatch(/birimlerde değil/);
    expect(politikaUygulanirMi(oneri(), p, SIMDI, { birimId: "b2" as BirimId }).uygulanir).toBe(false);
    expect(politikaUygulanirMi(oneri(), p, SIMDI, { birimId: "b1" as BirimId }).neden).toMatch(/programlarda değil/);
    expect(
      politikaUygulanirMi(oneri(), p, SIMDI, { birimId: "b1" as BirimId, programId: "pr1" as ProgramId }).uygulanir,
    ).toBe(true);
  });
});

describe("geçerli karar", () => {
  it("onay ya da düzeltmelerin en sonuncusu; ret yok sayılır", () => {
    const a = karar({ id: "a" as KararId, zaman: "2026-10-02T00:00:00Z" });
    const b = karar({ id: "b" as KararId, sonuc: "duzeltildi", duzeltme: "x", zaman: "2026-10-05T00:00:00Z" });
    const r = karar({ id: "r" as KararId, sonuc: "reddedildi", zaman: "2026-10-09T00:00:00Z" });
    expect(gecerliKarar([b, a, r])?.id).toBe("b");
    expect(gecerliKarar([r])).toBeNull();
    expect(gecerliKarar([])).toBeNull();
    // Eşit zamanda listede sonra gelen kazanır.
    const c = karar({ id: "c" as KararId, zaman: "2026-10-05T00:00:00Z" });
    expect(gecerliKarar([b, c])?.id).toBe("c");
  });
  it("karar içeriği", () => {
    expect(kararIcerigi(oneri(), karar())).toBe("Danışma kurulu");
    expect(kararIcerigi(oneri(), karar({ sonuc: "duzeltildi", duzeltme: "Y" }))).toBe("Y");
    expect(kararIcerigi(oneri(), karar({ sonuc: "reddedildi" }))).toBeNull();
  });
});

describe("matris önerisi inceleme notu (CLI oner-matris)", () => {
  it("4 ve 5 puan kanıtsızsa ölçme planı notu, diğer puanlarda kaynak notu", () => {
    expect(matrisOnerisiIncelemesi({ tur: "puan", puan: 4 }, false)).toBe(
      "4 ve 5 puan ölçme planından bir kanıtla desteklenmeli.",
    );
    expect(matrisOnerisiIncelemesi({ tur: "puan", puan: 5 }, false)).toBe(
      "4 ve 5 puan ölçme planından bir kanıtla desteklenmeli.",
    );
    expect(matrisOnerisiIncelemesi({ tur: "puan", puan: 3 }, false)).toBe("Kaynak kanıt belirtilmedi.");
    expect(matrisOnerisiIncelemesi({ tur: "puan", puan: 5 }, true)).toBeNull();
    expect(matrisOnerisiIncelemesi({ tur: "iliskisiz" }, false)).toBeNull();
  });
});
