import { describe, expect, it } from "vitest";
import {
  baslatmaZamani,
  bastirilanAnahtarlar,
  bosDurum,
  type Eylem,
  HAZIR_SURECLER,
  hazirSurec,
  ilerlet,
  kapatilabilirMi,
  type MotorBaglami,
  type OrnekDurumu,
  SurecTanimi,
  sonrakiUyanma,
} from "../src/index.ts";

const tanim = hazirSurec("donem_sonu_ders_dosyasi");
if (!tanim) throw new Error("hazır süreç yok");

// Uydurma takvim: dönem sonu 12 Ocak 2026, not girişi son günü 20 Ocak 2026 (İstanbul, 09:00).
const takvim = { donem_sonu: "2026-01-12", not_giris_son: "2026-01-20" };
const b = (simdi: string): MotorBaglami => ({
  simdi: new Date(simdi),
  takvim,
  saatDilimi: "Europe/Istanbul",
  gunSaati: "09:00",
});

/** Eylemleri durum üzerine uygular (uygulayıcının yaptığını taklit eder). */
function uygula(d: OrnekDurumu, eylemler: Eylem[], simdi: Date) {
  for (const e of eylemler) {
    if (e.tur === "gorev_ac") {
      const a = d.adimlar[e.adim];
      if (a) Object.assign(a, { durum: "acik", acilis: simdi, sonTarih: e.sonTarih });
    } else if (e.tur === "kapat") d.durum = "kapali";
    else {
      const a = d.adimlar[e.adim];
      if (a) a.gonderilenler.push(e.anahtar, ...bastirilanAnahtarlar(tanim as SurecTanimi, d, e, simdi));
    }
  }
}

describe("süreç tanımı", () => {
  it("bütün hazır süreçler geçerli ve takvim anahtarlarını adlandırıyor", () => {
    expect(HAZIR_SURECLER.map((t) => t.kod)).toEqual([
      "donem_sonu_ders_dosyasi",
      "kidr_bidr_takvimi",
      "anket_dongusu",
      "danisma_kurulu",
      "puko_eylem_izleme",
      "program_akreditasyonu",
      "bologna_guncelleme",
    ]);
  });

  it("hazır süreçlerde tarih gömülü değil (yalnız takvim anahtarı)", () => {
    expect(JSON.stringify(HAZIR_SURECLER)).not.toMatch(/\d{4}-\d{2}-\d{2}/u);
  });

  it("bilinmeyen adıma bağlı koşul, tekrar eden kod ve adsız takvim anahtarı reddedilir", () => {
    const temel = {
      kod: "deneme",
      ad: "Deneme",
      adimlar: [
        {
          kod: "aa",
          ad: "A",
          puko: "planla",
          tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["yok"] } },
          gorev: { baslik: "A", rol: "ogretim_elemani" },
          sonTarih: { tur: "takvim", nokta: { anahtar: "adsiz" } },
        },
      ],
    };
    const r = SurecTanimi.safeParse(temel);
    expect(r.success).toBe(false);
    const iletiler = r.error?.issues.map((i) => i.message).join("|") ?? "";
    expect(iletiler).toContain("Bilinmeyen adım: yok");
    expect(iletiler).toContain("Takvim anahtarı tanımda adlandırılmamış: adsiz");
  });
});

describe("motor", () => {
  it("kendiliğinden başlama anı takvimden gelir", () => {
    expect(baslatmaZamani(tanim, b("2026-01-01T00:00:00Z"))?.toISOString()).toBe("2026-01-12T06:00:00.000Z");
    expect(baslatmaZamani(tanim, { ...b("2026-01-01T00:00:00Z"), takvim: {} })).toBeNull();
  });

  it("dönem sonu: görev, hatırlatmalar, gecikme, yükseltme ve kapanış sırası", () => {
    const d = bosDurum(tanim, new Date("2026-01-12T06:00:00Z"));
    // 1) Başlangıçta yalnız ilk adım açılır; son tarih not_giris_son + 2 gün = 22 Ocak 09:00 yerel = 06:00Z
    let e = ilerlet(tanim, d, b("2026-01-12T06:00:00Z"));
    expect(e).toEqual([{ tur: "gorev_ac", adim: "notlar", sonTarih: new Date("2026-01-22T06:00:00.000Z") }]);
    uygula(d, e, new Date("2026-01-12T06:00:00Z"));
    // 2) Sıradaki uyanma: 3 gün önce hatırlatma = 19 Ocak 06:00Z
    expect(sonrakiUyanma(tanim, d, b("2026-01-12T06:00:00Z"))?.toISOString()).toBe("2026-01-19T06:00:00.000Z");
    expect(ilerlet(tanim, d, b("2026-01-19T05:59:59Z"))).toEqual([]);
    e = ilerlet(tanim, d, b("2026-01-19T06:00:00Z"));
    expect(e).toEqual([{ tur: "hatirlat", adim: "notlar", anahtar: "hatirlat:notlar:3", gunKaldi: 3 }]);
    uygula(d, e, new Date("2026-01-19T06:00:00Z"));
    // aynı an ikinci çalıştırma eylem üretmez
    expect(ilerlet(tanim, d, b("2026-01-19T06:00:00Z"))).toEqual([]);
    // 3) son tarih: gecikme; 3 gün sonra yükseltme program sorumlusuna
    e = ilerlet(tanim, d, b("2026-01-21T06:00:00Z"));
    expect(e.map((x) => x.tur)).toEqual(["hatirlat"]);
    uygula(d, e, new Date("2026-01-21T06:00:00Z"));
    e = ilerlet(tanim, d, b("2026-01-22T06:00:00Z"));
    expect(e).toEqual([{ tur: "gecikti", adim: "notlar", anahtar: "gecikti:notlar" }]);
    uygula(d, e, new Date("2026-01-22T06:00:00Z"));
    e = ilerlet(tanim, d, b("2026-01-25T06:00:00Z"));
    expect(e).toEqual([{ tur: "yukselt", adim: "notlar", anahtar: "yukselt:notlar", rol: "program_sorumlusu" }]);
    uygula(d, e, new Date("2026-01-25T06:00:00Z"));
    expect(sonrakiUyanma(tanim, d, b("2026-01-25T06:00:00Z"))).toBeNull();
    // 4) kanıtsız kapanmaz
    const notlar = d.adimlar.notlar;
    const adim = tanim.adimlar[0];
    if (!notlar || !adim) throw new Error();
    expect(kapatilabilirMi(adim, notlar)).toEqual({ tamam: false, eksikKanit: 1 });
    notlar.kanitSayisi = 1;
    expect(kapatilabilirMi(adim, notlar)).toEqual({ tamam: true });
    notlar.durum = "tamam";
    // 5) sonraki adım koşulla açılır; süre 14 gün
    e = ilerlet(tanim, d, b("2026-01-26T06:00:00Z"));
    expect(e).toEqual([{ tur: "gorev_ac", adim: "ders_dosyasi", sonTarih: new Date("2026-02-09T06:00:00.000Z") }]);
    for (const k of ["ders_dosyasi", "program_degerlendirme"]) {
      const a = d.adimlar[k];
      if (a) a.durum = "tamam";
    }
    expect(ilerlet(tanim, d, b("2026-01-27T00:00:00Z"))).toEqual([{ tur: "kapat" }]);
    d.durum = "kapali";
    expect(ilerlet(tanim, d, b("2026-01-27T00:00:00Z"))).toEqual([]);
  });

  it("uzun süre çalışmadıysa hatırlatma yağdırmaz, yalnız gecikme bildirir", () => {
    const d = bosDurum(tanim, new Date("2026-01-12T06:00:00Z"));
    uygula(d, ilerlet(tanim, d, b("2026-01-12T06:00:00Z")), new Date("2026-01-12T06:00:00Z"));
    const e = ilerlet(tanim, d, b("2026-01-23T00:00:00Z"));
    expect(e.map((x) => x.tur)).toEqual(["gecikti"]);
    uygula(d, e, new Date("2026-01-23T00:00:00Z"));
    expect(d.adimlar.notlar?.gonderilenler.sort()).toEqual(
      ["gecikti:notlar", "hatirlat:notlar:1", "hatirlat:notlar:3"].sort(),
    );
  });

  it("takvimde tarih yoksa adım açılmaz, eksik tarih bir kez bildirilir", () => {
    const d = bosDurum(tanim, new Date("2026-01-12T06:00:00Z"));
    const bb = { ...b("2026-01-12T06:00:00Z"), takvim: { donem_sonu: "2026-01-12" } };
    const e = ilerlet(tanim, d, bb);
    expect(e).toEqual([
      {
        tur: "eksik_tarih",
        adim: "notlar",
        anahtar: "eksik_tarih:notlar:not_giris_son",
        takvimAnahtarlari: ["not_giris_son"],
      },
    ]);
    d.adimlar.notlar?.gonderilenler.push("eksik_tarih:notlar:not_giris_son");
    expect(ilerlet(tanim, d, bb)).toEqual([]);
  });

  it("olay ve tarih koşulları", () => {
    const t = SurecTanimi.parse({
      kod: "kosullu",
      ad: "Koşullu",
      takvimAnahtarlari: { t1: "T1" },
      adimlar: [
        {
          kod: "aa",
          ad: "A",
          puko: "planla",
          tetikleyici: {
            tur: "kosul",
            kosul: {
              tur: "hepsi",
              kosullar: [
                { tur: "olay", olay: "notlar_girildi" },
                { tur: "tarih", nokta: { anahtar: "t1", gunFark: 0 } },
              ],
            },
          },
          gorev: { baslik: "A", rol: "ogretim_elemani" },
          sonTarih: { tur: "sure", gun: 5 },
        },
        {
          kod: "bb",
          ad: "B",
          puko: "uygula",
          tetikleyici: { tur: "olay", olay: "baska" },
          gorev: { baslik: "B", rol: "ogretim_elemani" },
          sonTarih: { tur: "sure", gun: 5 },
          enAzKanit: 0,
        },
      ],
    });
    const d = bosDurum(t, new Date("2026-03-01T00:00:00Z"));
    const bb = (s: string) => ({ ...b(s), takvim: { t1: "2026-03-10" } });
    expect(ilerlet(t, d, bb("2026-03-11T00:00:00Z"))).toEqual([]);
    // tarih bekleniyorsa uyanma o tarihtir (10 Mart 09:00 yerel = 06:00Z)
    expect(sonrakiUyanma(t, d, bb("2026-03-01T00:00:00Z"))?.toISOString()).toBe("2026-03-10T06:00:00.000Z");
    d.olaylar.push("notlar_girildi");
    expect(ilerlet(t, d, bb("2026-03-09T00:00:00Z"))).toEqual([]);
    expect(ilerlet(t, d, bb("2026-03-10T06:00:00Z")).map((x) => x.tur)).toEqual(["gorev_ac"]);
    d.olaylar.push("baska");
    expect(ilerlet(t, d, bb("2026-03-10T06:00:00Z")).map((x) => `${x.tur}:${(x as { adim: string }).adim}`)).toEqual([
      "gorev_ac:aa",
      "gorev_ac:bb",
    ]);
    // en az kanıt 0 olan görev kanıtsız kapanabilir
    const bAdim = t.adimlar[1];
    if (!bAdim) throw new Error();
    expect(kapatilabilirMi(bAdim, { durum: "acik", kanitSayisi: 0, gonderilenler: [] })).toEqual({ tamam: true });
  });
});
