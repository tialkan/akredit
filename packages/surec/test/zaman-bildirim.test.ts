import { describe, expect, it } from "vitest";
import {
  epostaZamani,
  kalanGun,
  kisiTercihi,
  ozetEposta,
  SurecAyari,
  sahteSaat,
  sessizMi,
  sessizSonrasi,
  surecAyariOku,
  yerelTarih,
  yerelZaman,
} from "../src/index.ts";

const IST = "Europe/Istanbul";

describe("saat dilimi", () => {
  it("İstanbul UTC+3: 09:00 yerel = 06:00 UTC", () => {
    expect(yerelZaman("2026-06-15", "09:00", IST).toISOString()).toBe("2026-06-15T06:00:00.000Z");
    // gün farkı ay sınırını aşar: 30 Haziran + 2 gün = 2 Temmuz
    expect(yerelZaman("2026-06-30", "09:00", IST, 2).toISOString()).toBe("2026-07-02T06:00:00.000Z");
  });

  it("yaz saati geçişini doğru hesaplar (Berlin 29 Mart 2026)", () => {
    // 28 Mart CET (UTC+1) → 08:00Z; 30 Mart CEST (UTC+2) → 07:00Z
    expect(yerelZaman("2026-03-28", "09:00", "Europe/Berlin").toISOString()).toBe("2026-03-28T08:00:00.000Z");
    expect(yerelZaman("2026-03-30", "09:00", "Europe/Berlin").toISOString()).toBe("2026-03-30T07:00:00.000Z");
  });

  it("geçersiz tarih reddedilir", () => {
    expect(() => yerelZaman("2026-6-1", "09:00", IST)).toThrow(RangeError);
  });

  it("yerel tarih gece yarısını İstanbul'a göre hesaplar", () => {
    // 22:30Z = 01:30 ertesi gün İstanbul
    expect(yerelTarih(new Date("2026-01-01T22:30:00Z"), IST)).toBe("2026-01-02");
  });
});

describe("sahte saat", () => {
  it("işleri zaman sırasıyla çalıştırır ve saati ilerletir", async () => {
    const s = sahteSaat(new Date("2026-01-01T00:00:00Z"));
    const sira: string[] = [];
    s.zamanla(2000, () => {
      sira.push(`b@${s.simdi().toISOString()}`);
    });
    s.zamanla(1000, () => {
      sira.push("a");
      s.zamanla(500, () => {
        sira.push("a2");
      });
    });
    const iptal = s.zamanla(1500, () => {
      sira.push("iptal");
    });
    iptal();
    await s.ilerlet(1999);
    expect(sira).toEqual(["a", "a2"]);
    await s.ilerlet(1);
    expect(sira).toEqual(["a", "a2", "b@2026-01-01T00:00:02.000Z"]);
    expect(s.bekleyenIsSayisi()).toBe(0);
  });
});

describe("bildirim tercihleri", () => {
  const ayar = SurecAyari.parse({
    bildirim: { kisiler: { k1: { eposta: "gunluk" }, k2: { eposta: "kapali", sessizBaslangic: "bozuk" } } },
  });

  it("kurum varsayılanı ve kişi tercihi birleşir", () => {
    expect(kisiTercihi(ayar, "yok").eposta).toBe("aninda");
    expect(kisiTercihi(ayar, "k1").eposta).toBe("gunluk");
    // bozuk saat kurum varsayılanına düşer
    expect(kisiTercihi(ayar, "k2").sessizBaslangic).toBe("20:00");
  });

  it("sessiz saat gece yarısını aşan aralıkta doğru", () => {
    const t = kisiTercihi(ayar, "yok"); // 20:00–08:00 İstanbul
    expect(sessizMi(new Date("2026-05-04T18:00:00Z"), t)).toBe(true); // 21:00 yerel
    expect(sessizMi(new Date("2026-05-04T02:00:00Z"), t)).toBe(true); // 05:00 yerel
    expect(sessizMi(new Date("2026-05-04T06:00:00Z"), t)).toBe(false); // 09:00 yerel
    // 21:00 yerel → ertesi gün 08:00 yerel = 05:00Z
    expect(sessizSonrasi(new Date("2026-05-04T18:00:00Z"), t).toISOString()).toBe("2026-05-05T05:00:00.000Z");
    // 05:00 yerel → aynı gün 08:00 yerel
    expect(sessizSonrasi(new Date("2026-05-04T02:00:00Z"), t).toISOString()).toBe("2026-05-04T05:00:00.000Z");
  });

  it("e-posta zamanı: anında, günlük özet, kapalı", () => {
    const olusma = new Date("2026-05-04T10:00:00Z"); // 13:00 yerel
    expect(epostaZamani(olusma, kisiTercihi(ayar, "yok"))?.toISOString()).toBe(olusma.toISOString());
    // özet 08:30 yerel; 13:00 geçtiği için ertesi gün 08:30 yerel = 05:30Z
    expect(epostaZamani(olusma, kisiTercihi(ayar, "k1"))?.toISOString()).toBe("2026-05-05T05:30:00.000Z");
    expect(epostaZamani(olusma, kisiTercihi(ayar, "k2"))).toBeNull();
  });

  it("özet e-posta birden çok bildirimi toplar", () => {
    const o = ozetEposta([
      { baslik: "İkinci", metin: "b", olusma: new Date(2) },
      { baslik: "Birinci", metin: "a", olusma: new Date(1) },
    ]);
    expect(o.konu).toBe("Akredit: 2 yeni bildirim");
    expect(o.metin).toContain("- Birinci: a\n- İkinci: b");
    expect(ozetEposta([{ baslik: "X", metin: "y", olusma: new Date(0) }]).konu).toBe("Akredit: X");
    expect(() => ozetEposta([])).toThrow();
  });

  it("kalan gün yukarı yuvarlanır", () => {
    // 36 saat → 2 gün; geçmiş → 0
    expect(kalanGun(new Date(0), new Date(36 * 3_600_000))).toBe(2);
    expect(kalanGun(new Date(10), new Date(0))).toBe(0);
  });

  it("kurum ayarı yoksa varsayılanlar, bozuksa hata", () => {
    expect(surecAyariOku({}).saatDilimi).toBe(IST);
    expect(() => surecAyariOku({ surec: { takvim: { donem_sonu: "15.01.2026" } } })).toThrow();
  });
});
