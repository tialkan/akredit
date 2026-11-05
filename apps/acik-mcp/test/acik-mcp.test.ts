// Uçtan uca: resmî SDK istemcisi, açık HTTP işleyicisine (ağsız, fetch yerine işleyici) bağlanır.
// Örnek veriler uydurmadır.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import {
  ACIK_ARACLAR,
  AKREDIT_NOTU,
  acikMcpIsleyici,
  aracCalistir,
  type GunlukKaydi,
  kisiselVeriTurleri,
  OKUNAMADI,
} from "../src/index.ts";

const SIMDI = () => new Date("2026-10-30T10:00:00Z");

async function baglan(gunluk: GunlukKaydi[] = []) {
  const isleyici = acikMcpIsleyici({ simdi: SIMDI, gunluk: (k) => gunluk.push(k) });
  const tasima = new StreamableHTTPClientTransport(new URL("https://akredit.org/mcp"), {
    fetch: (u, i) => isleyici(new Request(u, i)),
  });
  const istemci = new Client({ name: "test", version: "1.0.0" });
  await istemci.connect(tasima);
  return istemci;
}

const veri = (r: unknown) => (r as { structuredContent: Record<string, unknown> }).structuredContent;
const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};

describe("uçtan uca (SDK istemcisi)", () => {
  it("araç listesi on sekiz salt okuma aracı döner; yalnız kaynak_dogrula dış kataloğa sorar", async () => {
    const c = await baglan();
    const { tools } = await c.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "bologna_alan_rehberi",
        "bologna_ayristir",
        "bologna_denetle",
        "bologna_durum",
        "bologna_kopya_metni",
        "bologna_taslak_denetle",
        "ck_pc_hesapla",
        "engel_coz",
        "is_yuku_oner",
        "kaynak_bicimle",
        "kaynak_dogrula",
        "kurulum_yardimi",
        "not_tablosu_ayristir",
        "olcut_ara",
        "olcut_getir",
        "olgunluk_duzeyleri",
        "oz_degerlendirme_iskeleti",
        "rapor_dil_denetle",
      ].sort(),
    );
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
    expect(tools.filter((t) => t.annotations?.openWorldHint).map((t) => t.name)).toEqual(["kaynak_dogrula"]);
    // Karar, imza ya da gönderim aracı yok.
    expect(tools.some((t) => /karar|imza|gonder|onay/u.test(t.name))).toBe(false);
    await c.close();
  });

  it("olcut_getir resmî metni kaynak, sayfa ve özetle döndürür; günlükte içerik yok", async () => {
    const gunluk: GunlukKaydi[] = [];
    const c = await baglan(gunluk);
    const r = await c.callTool({ name: "olcut_getir", arguments: { kod: "B.1" } });
    const v = veri(r);
    expect(r.isError).toBeFalsy();
    expect(v.not).toBe(AKREDIT_NOTU);
    expect(String(v.not)).toContain("YÖKAK ile bağı yoktur");
    const kaynak = (v.kaynak as { adres: string; sha256: string; sayfa: number }[])[0];
    expect(kaynak?.adres).toMatch(/^https:\/\/www\.yokak\.gov\.tr\//u);
    expect(kaynak?.sha256).toMatch(/^[0-9a-f]{64}$/u);
    const kayit = gunluk.find((g) => g.arac === "olcut_getir");
    expect(kayit).toBeDefined();
    expect(Object.keys(kayit ?? {}).sort()).toEqual(["arac", "boyut", "durum", "sureMs", "yontem", "zaman"]);
    expect(JSON.stringify(gunluk)).not.toContain("B.1");
    await c.close();
  });

  it("öğrenci numarası içeren çağrı reddedilir ve takma ad istenir; yayımlanmış görev bilgisi reddedilmez", async () => {
    const c = await baglan();
    const r = await c.callTool({
      name: "rapor_dil_denetle",
      arguments: { metin: "Öğrenci no: 20231234567 olan öğrencinin notu düşüktür." },
    });
    expect(r.isError).toBe(true);
    expect(String(veri(r).hata)).toMatch(/takma ad/u);
    expect(JSON.stringify(r)).not.toContain("20231234567");
    const g = await c.callTool({
      name: "rapor_dil_denetle",
      arguments: { metin: "Toplantıya Prof. Dr. Ayşe Kaya katıldı. İletişim: ayse@ornek.edu.tr" },
    });
    expect(g.isError).toBeFalsy();
    await c.close();
  });
});

describe("HTTP sınırları", () => {
  it("GET 405, OPTIONS CORS, büyük gövde 413, hız sınırı 429", async () => {
    const h = acikMcpIsleyici({
      simdi: SIMDI,
      gunluk: () => {},
      enBuyukGovde: 100,
      hiz: { kapasite: 2, saniyede: 0.001 },
    });
    expect((await h(new Request("https://akredit.org/mcp"))).status).toBe(405);
    const o = await h(new Request("https://akredit.org/mcp", { method: "OPTIONS" }));
    expect(o.status).toBe(204);
    expect(o.headers.get("access-control-allow-origin")).toBe("*");
    const buyuk = await h(new Request("https://akredit.org/mcp", { method: "POST", body: "x".repeat(200) }));
    expect(buyuk.status).toBe(413);
    // Kapasite 2: 413 bir jeton, ikinci istek bir jeton harcar; üçüncüsü 429.
    await h(new Request("https://akredit.org/mcp", { method: "POST", body: "{}" }));
    const r = await h(new Request("https://akredit.org/mcp", { method: "POST", body: "{}" }));
    expect(r.status).toBe(429);
  });
});

describe("araçlar", () => {
  it("olgunluk_duzeyleri beş düzey ve örnek kanıt döndürür", () => {
    const r = calistir("olgunluk_duzeyleri", { kod: "B.1.2" });
    expect(r.hata).toBe(false);
    const s = r.veri.sonuc as { duzeyler: unknown[]; ornekKanitlar: string[] };
    expect(s.duzeyler).toHaveLength(5);
    expect(s.ornekKanitlar.length).toBeGreaterThan(0);
  });

  it("bilinmeyen ölçüt kodu açık bir iletiyle reddedilir", () => {
    const r = calistir("olcut_getir", { kod: "Z.9" });
    expect(r.hata).toBe(true);
    expect(String(r.veri.hata)).toContain("bulunamadı");
  });

  it("olcut_ara kodla tam eşleşmeyi öne alır", () => {
    const r = calistir("olcut_ara", { sorgu: "B.3" });
    expect((r.veri.sonuc as { olcutler: { kod: string }[] }).olcutler[0]?.kod).toBe("B.3");
  });

  it("program çerçevesi: EPDAD alt standardında göstergeler ve dört düzey; okunamayan tanım uydurulmaz", () => {
    const r = calistir("olcut_getir", { kod: "2.1.1", cerceve: "epdad-ogretmen" });
    expect(r.hata).toBe(false);
    const s = r.veri.sonuc as {
      ust: { kod: string } | null;
      ekler: { tur: string; no: number; duzeyler: { duzey: string; metin: string }[] }[];
      derecelendirme: string[];
    };
    expect(s.ust?.kod).toBe("2");
    expect(s.derecelendirme).toEqual(["İleri Düzeyde", "Oldukça Gelişmiş", "Gelişmeye Açık", "Başlangıç Düzeyinde"]);
    // 2.1.1/1'in düzey tanımları belgeden ayrılamadı (cerceveler testi): dördü de "Belgeden okunamadı".
    expect(s.ekler[0]?.duzeyler.map((d) => d.metin)).toEqual(Array(4).fill(OKUNAMADI));
    const k = r.veri.kaynak as { sha256?: string | null }[];
    expect(k.every((x) => /^[0-9a-f]{64}$/u.test(x.sha256 ?? ""))).toBe(true);
  });

  it("program çerçevesi: MÜDEK 5.1 bölüm listesi verir, seçim yapmaz; bölüm verilince konular gelir", () => {
    const liste = calistir("olcut_getir", { kod: "5.1", cerceve: "mudek-lisans" });
    const s = liste.veri.sonuc as { ozguBolumler: { bolumler: { kod: string }[] }; ekler?: unknown[] };
    expect(s.ozguBolumler.bolumler).toHaveLength(26);
    expect(s.ekler).toBeUndefined();
    const konu = calistir("olcut_getir", { kod: "5.1", cerceve: "mudek-lisans", bolum: "bilgisayar-yazilim" });
    const e = (konu.veri.sonuc as { ekler: { tur: string; kaynakSayfa: number }[] }).ekler;
    expect(e[0]).toMatchObject({ tur: "ozgu_konu", kaynakSayfa: 11 });
    const yanlis = calistir("olcut_getir", { kod: "5.2", cerceve: "mudek-lisans", bolum: "bilgisayar-yazilim" });
    expect(yanlis.hata).toBe(true);
  });

  it("olcut_ara program çerçevesinde ek öğe (FEDEK programa özgü madde) bulur; varsayılan YÖKAK", () => {
    const r = calistir("olcut_ara", { sorgu: "Alman Tarihi", cerceve: "fedek-lisans" });
    const s = r.veri.sonuc as { cerceveKod: string; ekler: { olcutKod: string; tur: string; bolum: string }[] };
    expect(s.cerceveKod).toBe("fedek-lisans");
    expect(s.ekler[0]).toMatchObject({ olcutKod: "10.1", tur: "ozgu_konu", bolum: "alman-dili-ve-edebiyati" });
    const v = calistir("olcut_ara", { sorgu: "B.3" }).veri.sonuc as { cerceveKod: string };
    expect(v.cerceveKod).toBe("yokak-kurumsal");
  });

  it("öz değerlendirme iskeleti metin yazmaz, alt ölçütleri EKSİK verir", () => {
    const r = calistir("oz_degerlendirme_iskeleti", { bolum: "B" });
    const b = (r.veri.sonuc as { bolumler: { altBasliklar: { tur: string; durum?: string }[] }[] }).bolumler;
    expect(b).toHaveLength(1);
    const alt = b[0]?.altBasliklar.filter((x) => x.tur === "alt_olcut") ?? [];
    expect(alt.length).toBeGreaterThan(0);
    for (const x of alt) expect(x.durum).toBe("EKSİK");
  });

  it("bologna_denetle AKTS-iş yükü uyumsuzluğunu ve değerlendirme toplamını bulur", () => {
    // İş yükü 14*3 + 14*2 = 70 saat, AKTS 5: AKTS başına 14 saat (beklenen 25-30) → hata.
    // Değerlendirme 40 + 50 = 90 → hata.
    const r = calistir("bologna_denetle", {
      ders: {
        kod: "ORN101",
        akts: 5,
        kredi: 3,
        tul: "3+0+0",
        guncelleme: "01.09.2026",
        haftalar: 14,
        ciktilar: [{ kod: "Ö1", metin: "Temel kavramları açıklar." }],
        degerlendirme: [
          { ad: "Ara sınav", sayi: 1, katki: 40 },
          { ad: "Final", sayi: 1, katki: 50 },
        ],
        isyuku: [
          { ad: "Ders", sayi: 14, sure: 3, toplam: 42 },
          { ad: "Çalışma", sayi: 14, sure: 2, toplam: 28 },
        ],
      },
    });
    expect(r.hata).toBe(false);
    const kurallar = (r.veri.sonuc as { bulgular: { kural: string }[] }).bulgular.map((b) => b.kural);
    expect(kurallar).toContain("akts-isyuku");
    expect(kurallar).toContain("degerlendirme");
    expect(kurallar).not.toContain("program-ciktisi");
  });

  it("ck_pc_hesapla elle doğrulanmış değeri verir, öğrenci bazında sonuç dönmez", () => {
    // Tek soru (10 puan) Ö1'e eşli. o1: 8 → %80, o2: 4 → %40. Ö1 ortalaması 60.
    // Matris Ö1→P1 = 3: P1 sağlanması = 60.
    const r = calistir("ck_pc_hesapla", {
      dersKodu: "ORN101",
      donem: "2025-2026 Güz",
      ciktilar: [{ kod: "Ö1" }],
      araclar: [
        { id: "f", agirlik: 100, sorular: [{ no: "1", tamPuan: 10, eslemeler: [{ ciktiKod: "Ö1", agirlik: 1 }] }] },
      ],
      puanlar: [
        { ogrenci: "o1", aracId: "f", soruNo: "1", puan: 8 },
        { ogrenci: "o2", aracId: "f", soruNo: "1", puan: 4 },
      ],
      matris: { Ö1: { P1: 3 } },
    });
    expect(r.hata).toBe(false);
    const s = r.veri.sonuc as {
      ckBasarilari: Record<string, unknown>[];
      pcSaglanmasi: { pcKod: string; deger: number }[];
    };
    expect(s.ckBasarilari[0]?.ortalama).toBe(60);
    expect(s.ckBasarilari[0]).not.toHaveProperty("ogrenciler");
    expect(s.pcSaglanmasi[0]).toMatchObject({ pcKod: "P1", deger: 60 });
  });

  it("öğrenci numarası takma ad yerine kabul edilmez", () => {
    const r = calistir("ck_pc_hesapla", {
      dersKodu: "ORN101",
      donem: "2025-2026 Güz",
      ciktilar: [{ kod: "Ö1" }],
      araclar: [
        { id: "f", agirlik: 100, sorular: [{ no: "1", tamPuan: 10, eslemeler: [{ ciktiKod: "Ö1", agirlik: 1 }] }] },
      ],
      puanlar: [{ ogrenci: "2021123456", aracId: "f", soruNo: "1", puan: 8 }],
    });
    expect(r.hata).toBe(true);
  });

  it("rapor_dil_denetle kanıtsız üstünlük ifadesini işaretler", () => {
    const r = calistir("rapor_dil_denetle", { metin: "Birimimiz en iyi uygulamaları her zaman sürdürmektedir." });
    const b = (r.veri.sonuc as { bulgular: { kural: string }[] }).bulgular;
    expect(b.some((x) => x.kural === "ustunluk")).toBe(true);
  });

  it("kişisel veri denetimi değeri değil türü döndürür", () => {
    expect(kisiselVeriTurleri({ a: "Tel: 0532 123 45 67" })).toEqual(["telefon numarası"]);
    expect(kisiselVeriTurleri({ a: "B.1.2 alt ölçütü" })).toEqual([]);
  });
});
