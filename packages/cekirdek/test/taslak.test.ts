import { describe, expect, it } from "vitest";
import { type TaslakDenetimSonucu, taslakDenetle } from "../src/index.ts";
import { cliTaslak, ornekTaslak } from "./cli.ts";

const metinler = (s: TaslakDenetimSonucu, duzey: "hata" | "uyari") =>
  s.bulgular.filter((b) => b.duzey === duzey).map((b) => `${b.kural}: ${b.aciklama}`);
const hatalar = (t: Parameters<typeof taslakDenetle>[0]) => metinler(taslakDenetle(t), "hata").join("\n");

/** TS sonucu CLI'nin hatalar/uyarılar dizelerine birebir eşit mi? */
function esdeger(t: unknown) {
  const cli = cliTaslak.taslakDenetle(structuredClone(t));
  const ts = taslakDenetle(structuredClone(t) as Parameters<typeof taslakDenetle>[0]);
  expect(metinler(ts, "hata")).toEqual(cli.hatalar);
  expect(metinler(ts, "uyari")).toEqual(cli.uyarilar);
  expect(ts.isToplam).toBe(cli.isToplam);
  expect(ts.hedef).toBe(cli.hedef);
}

describe("Bologna taslak denetimi", () => {
  it("örnek taslak hatasız geçer (CLI'de olduğu gibi)", () => {
    const s = taslakDenetle(ornekTaslak());
    expect(s.bulgular.filter((b) => b.duzey === "hata")).toEqual([]);
    // Örnekte 5 AKTS × 30 = 150 saat.
    expect(s.hedef).toBe(150);
    expect(s.isToplam).toBe(150);
    esdeger(ornekTaslak());
  });

  it("K8 iş yükü AKTS × 30'a eşit olmalı", () => {
    const t = ornekTaslak();
    const ilk = t.isyuku[0];
    if (ilk) ilk.sure = 2;
    expect(hatalar(t)).toMatch(/K8: Toplam iş yükü 136 saat/);
    esdeger(t);
  });

  it("K4 ölçülemeyen çıktı yakalanır, -ebilir biçimi geçer", () => {
    const t = ornekTaslak();
    const [c1, c2, c3] = t.ciktilar;
    if (!c1 || !c2 || !c3) throw new Error("örnek eksik");
    c1.tr = "Web teknolojileri hakkında bilgi sahibi olur.";
    c2.tr = "HTML5 ile erişilebilir sayfa yapısı tasarlayabilir.";
    c3.tr = "Erişilebilirlik farkındalığı kazanır.";
    const h = hatalar(t);
    expect(h).toMatch(/K4: Ö1/);
    expect(h).not.toMatch(/K4: Ö2/);
    esdeger(t);
  });

  it("K5 kesintili numaralandırma ve eksik yetkinlik", () => {
    const t = ornekTaslak();
    const c = t.ciktilar[2];
    if (c) c.kod = "Ö9";
    for (const x of t.ciktilar) if (x.tur === "Yetkinlik") x.tur = "Beceri";
    const h = hatalar(t);
    expect(h).toMatch(/K5: Çıktı numaralandırması kesintili/);
    expect(h).toMatch(/En az bir çıktı Yetkinlik/);
    esdeger(t);
  });

  it("K12 şişirilmiş matris ve programda olmayan sütun", () => {
    const t = ornekTaslak();
    for (const s of Object.values(t.katki)) for (const p of Object.keys(s)) s[p] = 5;
    const o1 = t.katki["Ö1"];
    if (o1) o1.P99 = 3;
    const h = hatalar(t);
    expect(h).toMatch(/şişirilmiş/);
    expect(h).toMatch(/programda olmayan sütun: P99/);
    esdeger(t);
  });

  it("Türkçe karakteri düşürülmüş metin ve eksik değerlendirme yakalanır", () => {
    const t = ornekTaslak();
    const h0 = t.haftalar[0];
    if (h0) h0.onHazirlik = "Haftalik konu notlarini inceleyiniz.";
    t.degerlendirme.pop();
    const h = hatalar(t);
    expect(h).toMatch(/Türkçe: .*[Hh]aftalik/);
    expect(h).toMatch(/Katkılar toplamı %60/);
    esdeger(t);
  });

  it("boş ve bozuk taslakta CLI ile aynı bulgular", () => {
    esdeger({});
    const t = ornekTaslak() as unknown as Record<string, unknown>;
    t.amac = { tr: "-", en: "" };
    t.icerik = { tr: "kısa içerik", en: "x" };
    t.yontem = { tr: "Yok", en: "." };
    t.notlar = { tr: "", en: "" };
    t.tul = "2+2+0";
    t.degerlendirme = [{ ad: "Ara Sınav", sayi: 1, katki: 100 }];
    t.isyuku = [{ ad: "Ders süresi", sayi: 14, sure: 2 }];
    t.dersYapisi = [];
    t.ciktilar = [{ kod: "Ö1", tr: "", en: "", tur: "Diğer" }];
    t.haftalar = [{ hafta: 1, konu: { tr: "kısa", en: "" }, onHazirlik: "-", dokuman: "" }];
    t.kaynaklar = [{ yazar: "-", eser: "x" }];
    t.programCiktilari = [];
    t.katki = { Ö1: { P1: "", P2: 7 } };
    t.ska = [18];
    t.yetkililer = [];
    esdeger(t);
    const t2 = ornekTaslak() as unknown as Record<string, unknown>;
    t2.katki = {};
    t2.amac = { tr: "bir iki üç dört beş altı yedi sekiz dokuz on ".repeat(7), en: "kısa" };
    esdeger(t2);
  });

  it("varsayılan set CLI ile eşdeğer kalır; 'guncel' set yalnız istenince çalışır", () => {
    const t = ornekTaslak();
    t.ciktilar = t.ciktilar.slice(0, 6);
    // CLI setinde 6 çıktı hatadır (8-12).
    expect(hatalar(t)).toMatch(/K5: 6 öğrenme çıktısı var, 8-12/u);
    esdeger(t);
  });
});

describe("Bologna taslak denetimi: güncel kural seti (dış inceleme 2026-11-05)", () => {
  const guncel = (t: Parameters<typeof taslakDenetle>[0], s: Parameters<typeof taslakDenetle>[1] = {}) =>
    taslakDenetle(t, { kuralSeti: "guncel", ...s });
  const yaz = (s: TaslakDenetimSonucu, duzey: "hata" | "uyari") => metinler(s, duzey).join("\n");

  it("ÖÇ sayısı 4-10 geçerli, 5-8 dışı uyarı, 3 ve 11 hata", () => {
    const t = ornekTaslak();
    const ciktilar = t.ciktilar;
    const say = (n: number) => {
      t.ciktilar = ciktilar
        .slice(0, n)
        .map((c, i) => ({ ...c, kod: `Ö${i + 1}`, tur: i === 0 ? "Yetkinlik" : "Beceri" }));
      return guncel(t);
    };
    expect(yaz(say(4), "hata")).not.toMatch(/K5: \d+ öğrenme/u);
    expect(yaz(say(4), "uyari")).toMatch(/K5: 4 öğrenme çıktısı var; 5-8 önerilir/u);
    expect(yaz(say(6), "hata") + yaz(say(6), "uyari")).not.toMatch(/K5: \d+ öğrenme/u);
    expect(yaz(say(10), "uyari")).toMatch(/10 öğrenme çıktısı var; 5-8/u);
    expect(yaz(say(3), "hata")).toMatch(/K5: 3 öğrenme çıktısı var, 4-10 olmalı/u);
    t.ciktilar = [...ciktilar, ...ciktilar].slice(0, 11).map((c, i) => ({ ...c, kod: `Ö${i + 1}` }));
    expect(yaz(guncel(t), "hata")).toMatch(/K5: 11 öğrenme çıktısı var, 4-10/u);
  });

  it("-ebilme/-abilme ve -ebilir kabul; sahip ol, farkında ol, haberdar ol, vakıf ol ölçülemez", () => {
    const t = ornekTaslak();
    const metin = [
      "HTML ile erişilebilir sayfa yapısı tasarlayabilme.",
      "Ağ protokollerini analiz edebilme.",
      "Veri tabanı sorgusu yazabilir.",
      "Web güvenliği konusunda bilgiye sahip olur.",
      "Erişilebilirlik ilkelerinin farkında olur.",
      "Güncel standartlardan haberdar olur.",
      "Protokollere vakıf olur.",
    ];
    metin.forEach((m, i) => {
      const c = t.ciktilar[i];
      if (c) c.tr = m;
    });
    const h = yaz(guncel(t), "hata");
    for (const k of ["Ö1", "Ö2", "Ö3"]) expect(h).not.toMatch(new RegExp(`K4: ${k} `, "u"));
    for (const k of ["Ö4", "Ö5", "Ö6", "Ö7"]) expect(h).toMatch(new RegExp(`K4: ${k} `, "u"));
    // Aynı metin CLI setinde: "-ebilme" hata, "farkında olur" geçer (eski davranış korunur).
    const cli = hatalar(t);
    expect(cli).toMatch(/K4: Ö1 /u);
    expect(cli).not.toMatch(/K4: Ö5 /u);
  });

  it("AKTS iş yükü: kurum değeri yoksa AKTS başına 25-30 saat aralığı, verilirse tam o değer", () => {
    const t = ornekTaslak();
    delete t.bolen;
    // Örnek: 5 AKTS, toplam 150 saat. Aralık 5 × 25 = 125 ile 5 × 30 = 150.
    expect(guncel(t).hedefAraligi).toEqual([125, 150]);
    expect(yaz(guncel(t), "hata")).not.toMatch(/K8/u);
    const ilk = t.isyuku[0];
    if (!ilk) throw new Error("örnek eksik");
    // İlk satırı 1 saat azaltınca toplam 150 - 14 = 136: aralıkta, geçer (CLI setinde tam eşitlik ister).
    ilk.sure -= 1;
    expect(guncel(t).isToplam).toBe(136);
    expect(yaz(guncel(t), "hata")).not.toMatch(/K8/u);
    expect(hatalar(t)).toMatch(/K8: Toplam iş yükü 136/u);
    // Kurum değeri 30 verilirse tam 150 istenir; bulgu "kurum" türündedir.
    const k = guncel(t, { kurumBoleni: 30 });
    const k8 = k.bulgular.find((b) => b.kural === "K8");
    expect(k8?.aciklama).toMatch(/136 saat, AKTS 5 × 30 \(kurum değeri\) = 150/u);
    expect(k8?.kuralTuru).toBe("kurum");
    // Aralık dışı: 2 saat azaltınca 122 < 125.
    ilk.sure -= 2;
    const a = guncel(t).bulgular.find((b) => b.kural === "K8");
    expect(a?.aciklama).toMatch(/108 saat, AKTS 5 için 125-150/u);
  });

  it("her bulgu kural türü ve dayanak taşır; hiçbiri doğrulanmadan resmî sayılmaz", () => {
    const s = guncel({});
    expect(s.bulgular.length).toBeGreaterThan(5);
    for (const b of s.bulgular) {
      expect(["kurum", "Akredit önerisi"]).toContain(b.kuralTuru);
      expect(b.dayanak).toBeTruthy();
    }
    expect(s.bulgular.some((b) => b.kuralTuru === "resmî")).toBe(false);
  });

  it("bölen seçeneği ve taslaktaki bölen", () => {
    const t = ornekTaslak();
    delete t.bolen;
    // 5 AKTS × 25 = 125
    expect(taslakDenetle(t, { bolen: 25 }).hedef).toBe(125);
  });
});
