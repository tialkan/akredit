import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type AjanOlayi, ajanCalistir, aracTanimla, aracTanimlari, kisalt } from "../src/ajan.ts";
import { maliyetHesapla, type OlcumOlayi, olcen } from "../src/olcum.ts";
import { InsanGerekliHatasi, YzHatasi } from "../src/saglayici.ts";
import { sahteSaglayici } from "../src/saglayicilar/sahte.ts";
import { jsonAyikla, ONARIM_SINIRI, yapilandirilmisCagri } from "../src/yapilandirilmis.ts";

const okuma = vi.fn(async (a: { q: string }) => `bulundu: ${a.q}`);
const onayla = vi.fn(async () => "onaylandı");
const sil = vi.fn(async () => "silindi");

const ARACLAR = [
  aracTanimla({
    ad: "ara",
    aciklama: "Kanıt arar",
    sema: z.object({ q: z.string() }),
    yetki: "okuma",
    calistir: okuma,
  }),
  aracTanimla({
    ad: "onayla",
    aciklama: "Onaylar",
    sema: z.object({ id: z.string() }),
    yetki: "onay_gerektirir",
    calistir: onayla,
  }),
  aracTanimla({ ad: "sil", aciklama: "Siler", sema: z.object({}), yetki: "yasak", calistir: sil }),
];

const cagri = (ad: string, argumanlar: unknown, id = ad) => ({ aracCagrilari: [{ id, ad, argumanlar }] });

describe("ajan döngüsü", () => {
  it("okuma aracını çalıştırır, sonucu modele verir, yanıtla biter", async () => {
    const olaylar: AjanOlayi[] = [];
    const s = sahteSaglayici([cagri("ara", { q: "kurul" }), "Kurul bulundu."]);
    const r = await ajanCalistir({
      saglayici: s,
      mesajlar: [{ rol: "kullanici", icerik: "ara" }],
      araclar: ARACLAR,
      olay: (o) => olaylar.push(o),
    });
    expect(r.neden).toBe("yanit");
    expect(r.yanit).toBe("Kurul bulundu.");
    expect(r.turSayisi).toBe(2);
    expect(r.mesajlar.find((m) => m.rol === "arac")?.icerik).toBe("bulundu: kurul");
    expect(olaylar.map((o) => o.tur)).toEqual(["model_yaniti", "arac_calisti", "model_yaniti", "bitti"]);
    // Yasak araç modele hiç tanıtılmaz.
    expect(s.istekler[0]?.araclar?.map((a) => a.ad)).toEqual(["ara", "onayla"]);
  });

  it("onay_gerektirir araç çalıştırılmaz, bekleyen onay olarak döner", async () => {
    onayla.mockClear();
    const s = sahteSaglayici([cagri("onayla", { id: "k1" })]);
    const r = await ajanCalistir({ saglayici: s, mesajlar: [], araclar: ARACLAR });
    expect(onayla).not.toHaveBeenCalled();
    expect(r.neden).toBe("onay_bekliyor");
    expect(r.bekleyenOnaylar).toEqual([{ cagriId: "onayla", arac: "onayla", argumanlar: { id: "k1" } }]);
    expect(r.mesajlar.at(-1)?.icerik).toMatch(/^BEKLİYOR/u);
  });

  it("yasak ve bilinmeyen araç çağrısı reddedilir, çalıştırılmaz", async () => {
    sil.mockClear();
    const olaylar: AjanOlayi[] = [];
    const s = sahteSaglayici([cagri("sil", {}), cagri("yok", {}), "tamam"]);
    const r = await ajanCalistir({ saglayici: s, mesajlar: [], araclar: ARACLAR, olay: (o) => olaylar.push(o) });
    expect(sil).not.toHaveBeenCalled();
    expect(r.mesajlar.filter((m) => m.rol === "arac").map((m) => m.icerik)).toEqual([
      "REDDEDİLDİ: Bu araç kullanılamaz.",
      "REDDEDİLDİ: Böyle bir araç yok.",
    ]);
    expect(olaylar.filter((o) => o.tur === "arac_reddedildi")).toHaveLength(2);
  });

  it("geçersiz argüman reddedilir; araç hatası modele iletilir", async () => {
    const hatali = aracTanimla({
      ad: "patla",
      aciklama: "",
      sema: z.object({}),
      yetki: "oneri",
      calistir: () => {
        throw new Error("olmadı");
      },
    });
    const s = sahteSaglayici([cagri("ara", { q: 5 }), cagri("patla", {}), "son"]);
    const r = await ajanCalistir({ saglayici: s, mesajlar: [], araclar: [...ARACLAR, hatali] });
    const arac = r.mesajlar.filter((m) => m.rol === "arac").map((m) => m.icerik);
    expect(arac[0]).toMatch(/^REDDEDİLDİ: Argümanlar geçersiz: q:/u);
    expect(arac[1]).toBe("HATA: olmadı");
  });

  it("tur sınırı aşılınca durur", async () => {
    const s = sahteSaglayici([cagri("ara", { q: "x" })], { sonuTekrarla: true });
    const r = await ajanCalistir({ saglayici: s, mesajlar: [], araclar: ARACLAR, turSiniri: 3 });
    expect(r.neden).toBe("tur_siniri");
    expect(r.turSayisi).toBe(3);
    expect(s.istekler).toHaveLength(3);
  });

  it("araç çıktısı kısaltılır; nesne çıktısı JSON'a çevrilir", async () => {
    const uzun = aracTanimla({
      ad: "uzun",
      aciklama: "",
      sema: z.object({}),
      yetki: "okuma",
      calistir: () => ({ m: "x".repeat(50) }),
    });
    const s = sahteSaglayici([cagri("uzun", {}), "son"]);
    const r = await ajanCalistir({ saglayici: s, mesajlar: [], araclar: [uzun], aracCiktisiSiniri: 10 });
    expect(r.mesajlar.find((m) => m.rol === "arac")?.icerik).toBe('{"m":"xxxx\n[… 48 karakter kısaltıldı]');
    expect(kisalt("abc", 5)).toBe("abc");
  });

  it("iptal sinyaliyle durur", async () => {
    const k = new AbortController();
    k.abort();
    const r = await ajanCalistir({ saglayici: sahteSaglayici([]), mesajlar: [], araclar: [], sinyal: k.signal });
    expect(r.neden).toBe("iptal");
    const iptalEden = { ...sahteSaglayici([]), sohbet: async () => Promise.reject(new YzHatasi("iptal", "x")) };
    expect((await ajanCalistir({ saglayici: iptalEden, mesajlar: [], araclar: [] })).neden).toBe("iptal");
    const bozuk = { ...sahteSaglayici([]), sohbet: async () => Promise.reject(new Error("başka")) };
    await expect(ajanCalistir({ saglayici: bozuk, mesajlar: [], araclar: [] })).rejects.toThrow("başka");
  });

  it("araç tanımları JSON şemaya çevrilir", () => {
    expect(aracTanimlari(ARACLAR)[0]?.parametreler).toMatchObject({
      type: "object",
      properties: { q: { type: "string" } },
    });
  });
});

const Sema = z.object({ tur: z.enum(["tutanak", "izlence"]), guven: z.number().min(0).max(1) });

describe("yapılandırılmış çıktı", () => {
  it("geçerli JSON ilk denemede kabul edilir; yerel destek yoksa şema isteme eklenir", async () => {
    const s = sahteSaglayici(['```json\n{"tur":"tutanak","guven":0.9}\n```']);
    const r = await yapilandirilmisCagri({ saglayici: s, mesajlar: [], sema: Sema, ad: "s" });
    expect(r).toEqual({ veri: { tur: "tutanak", guven: 0.9 }, onarimSayisi: 0 });
    expect(s.istekler[0]?.mesajlar.at(-1)?.icerik).toMatch(/JSON şemasına/u);
    expect(s.istekler[0]?.jsonSema?.sema).toMatchObject({ type: "object" });
  });

  it("yerel destekli sağlayıcıya şema istemi eklenmez", async () => {
    const s = sahteSaglayici(['{"tur":"izlence","guven":1}'], { yapilandirilmisCikti: true });
    await yapilandirilmisCagri({ saglayici: s, mesajlar: [], sema: Sema, ad: "s" });
    expect(s.istekler[0]?.mesajlar).toEqual([]);
  });

  it("geçersiz JSON → onarım → başarı", async () => {
    const olcumler: number[] = [];
    const s = sahteSaglayici(["{bozuk", 'Elbette: {"tur":"izlence","guven":0.5} umarım olur']);
    const r = await yapilandirilmisCagri({
      saglayici: s,
      mesajlar: [],
      sema: Sema,
      ad: "s",
      cagriSonrasi: (_y, ms) => olcumler.push(ms),
    });
    expect(r).toEqual({ veri: { tur: "izlence", guven: 0.5 }, onarimSayisi: 1 });
    expect(s.istekler[1]?.mesajlar.at(-1)?.icerik).toMatch(/^Yanıtın şemaya uymuyor/u);
    expect(olcumler).toHaveLength(2);
  });

  it("şemaya uymayan çıktı alan yoluyla onarıma gönderilir", async () => {
    const s = sahteSaglayici(['{"tur":"rapor","guven":2}', '{"tur":"tutanak","guven":0.1}']);
    const r = await yapilandirilmisCagri({ saglayici: s, mesajlar: [], sema: Sema, ad: "s" });
    expect(r.onarimSayisi).toBe(1);
    expect(s.istekler[1]?.mesajlar.at(-1)?.icerik).toMatch(/tur: .*guven: /su);
  });

  it(`${ONARIM_SINIRI} onarımdan sonra InsanGerekliHatasi`, async () => {
    const s = sahteSaglayici(["x", "y", "z", '{"tur":"tutanak","guven":1}']);
    const e = await yapilandirilmisCagri({ saglayici: s, mesajlar: [], sema: Sema, ad: "s" }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(InsanGerekliHatasi);
    expect((e as InsanGerekliHatasi).message).toMatch(/incelemesi gerekiyor/u);
    expect(s.istekler).toHaveLength(1 + ONARIM_SINIRI);
  });

  it("jsonAyikla dizi ve hatalı metin", () => {
    expect(jsonAyikla("sonuç: [1,2]")).toEqual([1, 2]);
    expect(() => jsonAyikla("hiç yok")).toThrow(/JSON bulunamadı/u);
  });
});

describe("ölçüm", () => {
  it("maliyeti fiyat tablosuyla hesaplar", () => {
    // 1.000.000 × 3 / 1e6 + 500.000 × 15 / 1e6 = 3 + 7,5 = 10,5
    expect(maliyetHesapla("m", 1_000_000, 500_000, { m: { giris: 3, cikis: 15 } })).toBe(10.5);
    expect(maliyetHesapla("yok", 1, 1, {})).toBeNull();
  });
  it("başarılı ve başarısız çağrı için olay üretir", async () => {
    const olaylar: OlcumOlayi[] = [];
    let t = 1000;
    const simdi = () => (t += 250);
    const s = olcen(sahteSaglayici(["a"]), {
      kurumId: "kurum-1",
      fiyatlar: { "sahte-1": { giris: 1_000_000, cikis: 0 } },
      olay: (o) => olaylar.push(o),
      simdi,
    });
    await s.sohbet({ mesajlar: [] });
    await expect(s.sohbet({ mesajlar: [] })).rejects.toThrow();
    // Sahte sağlayıcı 10 giriş belirteci bildirir: 10 × 1.000.000 / 1e6 = 10.
    expect(olaylar[0]).toEqual({
      saglayici: "sahte",
      model: "sahte-1",
      kurumId: "kurum-1",
      sureMs: 250,
      girisBelirteci: 10,
      cikisBelirteci: 5,
      tahminiMaliyet: 10,
      basarili: true,
    });
    expect(olaylar[1]).toMatchObject({ basarili: false, tahminiMaliyet: null });
  });
});
