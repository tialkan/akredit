// Saf anket mantığı. Bütün veriler uydurmadır; beklenen değerlerin hesabı yorumda.

import { readFileSync } from "node:fs";
import type { BolognaOkunanDers, BolognaVerisi } from "@akredit/cekirdek";
import { sahteSaglayici } from "@akredit/yz";
import { describe, expect, it } from "vitest";
import {
  AnketAyari,
  AnketTanimi,
  acikYanitlariOzetle,
  anketIsyukuDenetle,
  anketIsyukuKalemleri,
  anketRaporu,
  anketSonucu,
  belirtecGecerliMi,
  belirtecOzeti,
  bolognaVerisineIsle,
  csvIceAktar,
  davetBelirteci,
  gonderimPlani,
  HAZIR_SABLONLAR,
  kisaKimlik,
  rastgeleBelirtec,
  sablon,
  sayiOzeti,
  YanitHatasi,
  yanitDogrula,
  yuzdelik,
} from "../src/index.ts";

const fixture = (ad: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${ad}`, import.meta.url)));

describe("şablonlar ve yanıt doğrulama", () => {
  it("altı hazır şablon var ve hepsi geçerli", () => {
    expect(Object.keys(HAZIR_SABLONLAR).sort()).toEqual(
      ["akts_isyuku", "danisma_kurulu", "ders_degerlendirme", "ic_paydas", "isveren", "mezun_izleme"].sort(),
    );
    for (const t of Object.values(HAZIR_SABLONLAR)) expect(() => AnketTanimi.parse(t)).not.toThrow();
    expect(sablon("yok")).toBeUndefined();
  });

  it("yanıt yalnız tanımdaki soruları taşır; kişi alanı reddedilir", () => {
    const t = sablon("ders_degerlendirme") as AnketTanimi;
    const tam = { hedef: 5, icerik: "4", olcme: 3, geri_bildirim: 2, genel: 4 };
    expect(yanitDogrula(t, tam)).toMatchObject({ hedef: 5, icerik: 4, guclu: null });
    expect(() => yanitDogrula(t, { ...tam, eposta: "a@b.c" })).toThrow(/kişisel bilgi/u);
    expect(() => yanitDogrula(t, { ...tam, kisi_id: "x" })).toThrow(YanitHatasi);
    expect(() => yanitDogrula(t, { ...tam, bilinmeyen: 1 })).toThrow(/olmayan/u);
    expect(() => yanitDogrula(t, { ...tam, hedef: 6 })).toThrow(/geçersiz/u);
    expect(() => yanitDogrula(t, { ...tam, genel: undefined })).toThrow(/yanıtlayın/u);
    expect(() => yanitDogrula(t, "metin")).toThrow(/okunamadı/u);
  });

  it("seçim, çoklu seçim, sayı türleri", () => {
    const t = AnketTanimi.parse({
      baslik: "Deneme",
      hedefKitle: "mezun",
      sorular: [
        { kod: "a", metin: "A", tur: "tek_secim", secenekler: ["x", "y"] },
        { kod: "b", metin: "B", tur: "coklu_secim", secenekler: ["x", "y"] },
        { kod: "c", metin: "C", tur: "sayi", enAz: 0, enCok: 10 },
      ],
    });
    expect(yanitDogrula(t, { a: "y", b: ["x", "x", "y"], c: "2,5" })).toEqual({ a: "y", b: ["x", "y"], c: 2.5 });
    expect(() => yanitDogrula(t, { a: "z" })).toThrow();
    expect(() => yanitDogrula(t, { b: ["z"] })).toThrow();
    expect(() => yanitDogrula(t, { c: 11 })).toThrow();
    expect(() => yanitDogrula(t, { c: "on" })).toThrow();
    expect(() =>
      AnketTanimi.parse({
        baslik: "x",
        hedefKitle: "mezun",
        sorular: [
          { kod: "a", metin: "A", tur: "acik" },
          { kod: "a", metin: "B", tur: "isyuku" },
        ],
      }),
    ).toThrow();
  });
});

describe("deterministik istatistik", () => {
  it("yüzdelik ve özet elle doğrulanmış", () => {
    // [1,2,3,4]: ortalama 2,5; örneklem varyansı ((1,5²+0,5²)*2)/3 = 5/3, ss = 1,29099…
    // ortanca: h = 3*0,5 = 1,5 → 2 + 0,5*(3-2) = 2,5; Ç1: h = 0,75 → 1,75; Ç3: h = 2,25 → 3,25
    const o = sayiOzeti([4, 1, 3, 2]);
    expect(o).toMatchObject({ n: 4, ortalama: 2.5, ortanca: 2.5, ceyrek1: 1.75, ceyrek3: 3.25, enAz: 1, enCok: 4 });
    expect(o?.standartSapma).toBeCloseTo(Math.sqrt(5 / 3), 12);
    expect(sayiOzeti([7])?.standartSapma).toBeNull();
    expect(sayiOzeti([])).toBeNull();
    expect(() => yuzdelik([], 0.5)).toThrow();
  });

  it("likert dağılımı, eşik altı gizleme, yanıt oranı", () => {
    const t = sablon("ders_degerlendirme") as AnketTanimi;
    // 6 yanıt; "genel": 5,4,4,3,5,1 → dağılım 1:1, 2:0, 3:1, 4:2, 5:2; ortalama 22/6 = 3,666…
    const genel = [5, 4, 4, 3, 5, 1];
    const yanitlar = genel.map((g, i) => ({
      hedef: 4,
      icerik: 4,
      olcme: 4,
      geri_bildirim: i < 3 ? 2 : null,
      genel: g,
      guclu: i === 0 ? "Örnekler" : null,
      oneri: null,
    }));
    const s = anketSonucu(t, yanitlar, { davetSayisi: 24 });
    expect(s.yanitSayisi).toBe(6);
    expect(s.yanitOrani).toBe(0.25); // 6/24
    const g = s.sorular.find((x) => x.kod === "genel");
    expect(g?.dagilim?.map((d) => d.sayi)).toEqual([1, 0, 1, 2, 2]);
    expect(g?.dagilim?.[3]?.oran).toBeCloseTo(2 / 6, 12);
    expect(g?.ozet?.ortalama).toBeCloseTo(22 / 6, 12);
    // geri_bildirim yalnız 3 kişi yanıtladı < eşik 5 → gizli
    const gb = s.sorular.find((x) => x.kod === "geri_bildirim");
    expect(gb).toMatchObject({ n: 3, gizli: true });
    expect(gb?.dagilim).toBeUndefined();
    expect(s.sorular.find((x) => x.kod === "guclu")).toMatchObject({ n: 1, acikSayisi: 1 });
    expect(anketSonucu(t, yanitlar).yanitOrani).toBeNull();
  });

  it("çoklu seçim ve tek seçim sayılır", () => {
    const t = AnketTanimi.parse({
      baslik: "x",
      hedefKitle: "ic_paydas",
      sorular: [
        { kod: "a", metin: "A", tur: "coklu_secim", secenekler: ["x", "y"] },
        { kod: "b", metin: "B", tur: "tek_secim", secenekler: ["x", "y"] },
      ],
    });
    const s = anketSonucu(
      t,
      [
        { a: ["x", "y"], b: "x" },
        { a: ["y"], b: "y" },
        { a: ["y"], b: "y" },
      ],
      { esik: 3 },
    );
    expect(s.sorular[0]?.dagilim?.map((d) => d.sayi)).toEqual([1, 3]);
    expect(s.sorular[1]?.dagilim?.map((d) => d.sayi)).toEqual([1, 2]);
  });
});

function bologna(isyuku: { ad: string; toplam: number }[]): BolognaVerisi {
  const ders: BolognaOkunanDers = {
    kod: "HUK101",
    zorunlu: true,
    bos: false,
    kaynak: "uydurma",
    yariyil: 1,
    kredi: 3,
    akts: 5,
    bilgiler: {},
    degerlendirme: [{ ad: "Final", sayi: 1, katki: 100 }],
    isyuku: isyuku.map((k) => ({ ad: k.ad, sayi: 1, sure: k.toplam, toplam: k.toplam })),
    dersYapisi: [],
    ciktilar: [{ kod: "Ö1", metin: "Uydurma çıktı" }],
    haftalar: 14,
    katki: {},
  };
  return {
    adres: "https://ornek.invalid",
    okundu: "2026-01-01T00:00:00Z",
    programCiktilari: [{ kod: "P1", metin: "x" }],
    matris: { pkodlar: ["P1"], dersler: [] },
    tyycIsaret: 1,
    dersler: [ders, { kod: "HUK102", hata: "okunamadı" }],
  };
}

describe("AKTS iş yükü → Bologna denetimi", () => {
  const t = sablon("akts_isyuku") as AnketTanimi;
  // 5 öğrenci. Etkinlik başına ortanca: ders 42, sınıf dışı 60, ödev 20, proje 0, ara 15, final 20 → 157 saat?
  // Ödev [10,20,20,30,40] → 20; ara [10,15,15,20,25] → 15; final [15,20,20,25,30] → 20; sınıf dışı [40,50,60,70,80] → 60.
  // Toplam 42+60+20+0+15+20 = 157 saat; 157/5 AKTS = 31,4 > 30 → akts-isyuku hatası.
  const yanitlar = [0, 1, 2, 3, 4].map((i) => ({
    ders_suresi: 42,
    sinif_disi: [40, 50, 60, 70, 80][i] as number,
    odev: [10, 20, 20, 30, 40][i] as number,
    proje: 0,
    ara_sinav: [10, 15, 15, 20, 25][i] as number,
    final: [15, 20, 20, 25, 30][i] as number,
    not: null,
  }));
  const sonuc = anketSonucu(t, yanitlar);

  it("kalemler ortancadır", () => {
    const k = anketIsyukuKalemleri(t, sonuc);
    expect(k.map((x) => [x.ad, x.toplam])).toEqual([
      ["Ders süresi", 42],
      ["Sınıf dışı ders çalışma süresi", 60],
      ["Ödevler", 20],
      ["Proje", 0],
      ["Ara sınavlar", 15],
      ["Yarıyıl sonu sınavı", 20],
    ]);
  });

  it("anket sonucu Bologna iş yükü denetimine girer", () => {
    // Beyan 42+84+24 = 150 saat → 30/AKTS: sayfa kendi başına geçer; anket 157 → hata ve fark yok (%4,7 < %20).
    const veri = bologna([
      { ad: "Ders süresi", toplam: 42 },
      { ad: "Sınıf dışı", toplam: 84 },
      { ad: "Sınavlar", toplam: 24 },
    ]);
    const d = anketIsyukuDenetle(veri, "HUK101", t, sonuc);
    expect(d).toMatchObject({ beyan: 150, olculen: 157, akts: 5 });
    expect(d.bulgular).toHaveLength(1);
    expect(d.bulgular[0]).toMatchObject({ duzey: "hata", kural: "akts-isyuku", konu: "HUK101" });
    expect(d.bulgular[0]?.aciklama).toMatch(
      /^Öğrenci anketine göre: Toplam iş yükü 157 saat, AKTS 5\. AKTS başına 31\.4/u,
    );
  });

  it("beyan ile ölçülen arasında büyük fark işaretlenir", () => {
    // Beyan 100 → |157-100|/100 = %57 > %20
    const d = anketIsyukuDenetle(bologna([{ ad: "Ders süresi", toplam: 100 }]), "HUK101", t, sonuc, {
      aktsSaat: [25, 35],
    });
    expect(d.bulgular.map((b) => b.kural)).toEqual(["anket-isyuku-fark"]);
  });

  it("eşik altında denetim yapılmaz; bilinmeyen ders hata verir", () => {
    const az = anketSonucu(t, yanitlar.slice(0, 2));
    const d = anketIsyukuDenetle(bologna([]), "HUK101", t, az);
    expect(d.bulgular[0]?.kural).toBe("anket-isyuku");
    expect(d.beyan).toBeNull();
    expect(() => anketIsyukuDenetle(bologna([]), "HUK102", t, sonuc)).toThrow();
    expect(() => bolognaVerisineIsle(bologna([]), "YOK1", [])).toThrow();
  });
});

describe("gönderim planı (süreç motoru kuralları)", () => {
  const ayar = AnketAyari.parse({
    baslangic: "2026-01-05T06:00:00Z",
    bitis: "2026-01-20T06:00:00Z",
    hatirlatmalar: [3, 1],
  });
  const sessiz = { sessizBaslangic: "20:00", sessizBitis: "08:00", saatDilimi: "Europe/Istanbul" };

  it("başlangıçtan önce bekler, başlangıçta davet gider", () => {
    expect(gonderimPlani(ayar, [], new Date("2026-01-04T00:00:00Z"), sessiz)).toMatchObject({
      eylemler: [],
      sonraki: new Date("2026-01-05T06:00:00Z"),
    });
    const p = gonderimPlani(ayar, [], new Date("2026-01-05T06:00:00Z"), sessiz);
    expect(p.eylemler).toEqual(["davet"]);
    // sonraki: bitişten 3 gün önce = 17 Ocak 06:00Z
    expect(p.sonraki).toEqual(new Date("2026-01-17T06:00:00Z"));
  });

  it("sessiz saatte gönderilmez (İstanbul 23:00 = 20:00Z), 08:00'de (05:00Z) gider", () => {
    const p = gonderimPlani(ayar, [], new Date("2026-01-05T20:00:00Z"), sessiz);
    expect(p.eylemler).toEqual([]);
    expect(p.sonraki).toEqual(new Date("2026-01-06T05:00:00Z"));
  });

  it("hatırlatma vaktinde gider; geç kalınca yalnız sonuncusu", () => {
    expect(gonderimPlani(ayar, ["davet"], new Date("2026-01-17T06:00:00Z"), sessiz).eylemler).toEqual(["hatirlatma_3"]);
    const gec = gonderimPlani(ayar, ["davet"], new Date("2026-01-19T07:00:00Z"), sessiz);
    expect(gec.eylemler).toEqual(["hatirlatma_1"]);
    expect(gec.bastirilan).toEqual(["hatirlatma_3"]);
    // Davet hiç gitmediyse önce davet, hatırlatma bastırılır.
    expect(gonderimPlani(ayar, [], new Date("2026-01-19T07:00:00Z"), sessiz)).toMatchObject({
      eylemler: ["davet"],
      bastirilan: ["hatirlatma_3", "hatirlatma_1"],
    });
  });

  it("bitişte kapanış; kapandıktan sonra iş yok; açık bağlantıda e-posta yok", () => {
    expect(gonderimPlani(ayar, ["davet"], new Date("2026-01-20T06:00:00Z"), sessiz).eylemler).toEqual(["kapanis"]);
    expect(gonderimPlani(ayar, ["kapanis"], new Date("2026-02-01T00:00:00Z"), sessiz).sonraki).toBeNull();
    const acik = AnketAyari.parse({ ...ayar, erisim: "baglanti" });
    expect(gonderimPlani(acik, [], new Date("2026-01-06T06:00:00Z"), sessiz)).toMatchObject({
      eylemler: [],
      sonraki: new Date("2026-01-20T06:00:00Z"),
    });
    expect(() => AnketAyari.parse({ baslangic: ayar.bitis, bitis: ayar.baslangic })).toThrow();
  });
});

describe("kimliksiz belirteç", () => {
  it("davet belirteci belirlenimci, kişiye göre farklı, biçimi geçerli", () => {
    const g = "uydurma-gizli-anahtar-0123456789";
    const a = davetBelirteci(g, "anket-1", "Ayse@Uydurma.edu.tr ");
    expect(a).toBe(davetBelirteci(g, "anket-1", "ayse@uydurma.edu.tr"));
    expect(a).not.toBe(davetBelirteci(g, "anket-2", "ayse@uydurma.edu.tr"));
    expect(belirtecGecerliMi(a)).toBe(true);
    expect(belirtecGecerliMi("kısa")).toBe(false);
    expect(belirtecOzeti(a)).toMatch(/^[0-9a-f]{64}$/u);
    expect(() => davetBelirteci("kisa", "a", "b")).toThrow();
    expect(rastgeleBelirtec(new Uint8Array(16).fill(1))).toHaveLength(22);
    expect(() => rastgeleBelirtec(new Uint8Array(8))).toThrow();
  });
});

describe("açık uçlu yanıtların atıflı özeti (sahte sağlayıcı)", () => {
  const yanitlar = [
    {
      id: "01900000-0000-7000-8000-0000000000e1",
      metin: "Daha çok örnek olay olsun. Bana ayse@uydurma.edu.tr adresinden yazın.",
    },
    { id: "01900000-0000-7000-8000-0000000000e2", metin: "Örnek olaylar az." },
    { id: "01900000-0000-7000-8000-0000000000e3", metin: "  " },
  ];

  it("maddeler yanıt kimliklerine atıflı; destek sayısı atıftan; kişisel veri modele gitmez", async () => {
    const k1 = `Y:${kisaKimlik(yanitlar[0]?.id as string)}`;
    const k2 = `Y:${kisaKimlik(yanitlar[1]?.id as string)}`;
    const s = sahteSaglayici([
      JSON.stringify({ maddeler: [{ metin: "Daha çok örnek olay isteniyor", yanitlar: [k1, k2, k1] }] }),
    ]);
    const o = await acikYanitlariOzetle({ soru: "Öneriniz?", yanitlar }, s);
    expect(o.gecerli).toBe(true);
    expect(o.maddeler[0]).toMatchObject({ destek: 2 });
    expect(o.maddeler[0]?.yanitIdleri).toEqual([yanitlar[0]?.id, yanitlar[1]?.id]);
    const istem = JSON.stringify(s.istekler[0]);
    expect(istem).not.toContain("ayse@uydurma.edu.tr");
    expect(istem).not.toContain(yanitlar[2]?.id.slice(-12));
  });

  it("uydurma atıf ve sayı kural sorunudur", async () => {
    const s = sahteSaglayici([
      JSON.stringify({ maddeler: [{ metin: "Öğrencilerin %80'i örnek istiyor", yanitlar: ["Y:deadbeef"] }] }),
    ]);
    const o = await acikYanitlariOzetle({ soru: "Öneriniz?", yanitlar }, s);
    expect(o.gecerli).toBe(false);
    expect(o.sorunlar.map((x) => x.aciklama).join(" ")).toMatch(/Var olmayan.*sayı/su);
    expect(o.maddeler[0]?.destek).toBe(0);
  });

  it("boş yanıtlarda model çağrılmaz", async () => {
    const s = sahteSaglayici([]);
    expect(await acikYanitlariOzetle({ soru: "x", yanitlar: [] }, s)).toMatchObject({ maddeler: [], gecerli: true });
    expect(s.istekler).toHaveLength(0);
  });
});

describe("CSV içe aktarma", () => {
  it("Google Forms: zaman damgası ve e-posta okunmaz, likert etiketi sayıya çevrilir", async () => {
    const r = await csvIceAktar(fixture("google-forms.csv"), { baslik: "Ders anketi" });
    expect(r.kaynak).toBe("google_forms");
    expect(r.atilanSutunlar).toEqual(["Zaman damgası", "E-posta Adresi"]);
    expect(r.tanim.sorular.map((s) => s.tur)).toEqual(["likert", "acik"]);
    expect(r.yanitlar.map((y) => y.s1)).toEqual([4, 5, 3]);
    expect(JSON.stringify(r.yanitlar)).not.toMatch(/@|2026\//u);
  });

  it("LimeSurvey: belirteç ve IP okunmaz, tanıma eşlenir, geçersiz satır raporlanır", async () => {
    const tanim = AnketTanimi.parse({
      baslik: "Ders",
      hedefKitle: "ogrenci",
      sorular: [
        { kod: "memnuniyet", metin: "Memnuniyet", tur: "likert", secenekler: ["1", "2", "3", "4", "5"] },
        { kod: "sure", metin: "Haftalık süre", tur: "sayi" },
        { kod: "yorum", metin: "Yorum", tur: "acik" },
      ],
    });
    const r = await csvIceAktar(fixture("limesurvey.csv"), { tanim });
    expect(r.kaynak).toBe("limesurvey");
    expect(r.atilanSutunlar).toEqual(["id", "submitdate", "lastpage", "startlanguage", "seed", "token", "ipaddr"]);
    expect(r.yanitlar).toEqual([
      { memnuniyet: 4, sure: 12, yorum: "Güzel bir ders" },
      { memnuniyet: 5, sure: 8.5, yorum: null },
    ]);
    expect(r.hatalar).toEqual([{ satir: 4, neden: '"Memnuniyet" sorusunun yanıtı geçersiz.' }]);
    expect(JSON.stringify(r)).not.toMatch(/tok[A-Z]|10\.0\.0/u);
  });

  it("eşleşmeyen sütun ve boş dosya", async () => {
    const tanim = AnketTanimi.parse({
      baslik: "x",
      hedefKitle: "ogrenci",
      sorular: [{ kod: "a", metin: "A", tur: "acik" }],
    });
    const r = await csvIceAktar(new TextEncoder().encode("A;B\nx;y\n"), { tanim });
    expect(r.eslesmeyenSutunlar).toEqual(["B"]);
    expect(r.yanitlar).toEqual([{ a: "x" }]);
    await expect(csvIceAktar(new Uint8Array())).rejects.toThrow();
  });
});

describe("rapor ve kanıt", () => {
  it("rapor sayıları istatistikten gelir; özet atıflı; içerik özetli", () => {
    const t = AnketTanimi.parse({
      baslik: "Mezun anketi",
      hedefKitle: "mezun",
      sorular: [
        { kod: "a", metin: "Hazırlık", tur: "likert", secenekler: ["1", "2", "3", "4", "5"] },
        { kod: "b", metin: "Eksik konu", tur: "acik" },
        { kod: "c", metin: "Az yanıtlı", tur: "sayi" },
      ],
    });
    const s = anketSonucu(t, [{ a: 5 }, { a: 4 }, { a: 4 }, { a: 3, c: 1 }, { a: 4, b: "Uygulama" }], {
      davetSayisi: 10,
    });
    const r = anketRaporu("Mezun anketi 2026", s, [
      {
        soru: "Eksik konu",
        maddeler: [{ metin: "Uygulama eksik", yanitIdleri: ["01900000-0000-7000-8000-0000000000e1"], destek: 1 }],
        sorunlar: [],
        gecerli: true,
      },
    ]);
    expect(r.dosyaAdi).toBe("mezun-anketi-2026-raporu.md");
    expect(r.ozet).toMatch(/^[0-9a-f]{64}$/u);
    // ortalama (5+4+4+3+4)/5 = 4; oran 5/10 = %50
    expect(r.metin).toContain("Yanıt oranı: %50");
    expect(r.metin).toContain("Ortalama 4, ortanca 4");
    expect(r.metin).toContain("| 4 | 3 | %60 |");
    expect(r.metin).toContain("Uygulama eksik (1 yanıt) [Y:0000000000e1]");
    expect(r.metin).toContain("[EKSİK: Yanıt sayısı eşiğin altında");
  });
});

describe("QR", () => {
  it("bağlantıdan SVG üretir, bağlantı olmayanı reddeder", async () => {
    const { qrSvg } = await import("../src/qr.ts");
    expect(await qrSvg("https://akredit.invalid/anket/a/b")).toMatch(/^<svg[\s\S]*<\/svg>\s*$/u);
    await expect(qrSvg("javascript:alert(1)")).rejects.toThrow();
  });
});
