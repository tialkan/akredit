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

  it("bölen seçeneği ve taslaktaki bölen", () => {
    const t = ornekTaslak();
    delete t.bolen;
    // 5 AKTS × 25 = 125
    expect(taslakDenetle(t, { bolen: 25 }).hedef).toBe(125);
  });
});
