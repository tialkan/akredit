// Eşdeğerlik (İP-24): eski CLI uygulaması ile @akredit/cekirdek köprüsü aynı girdide aynı sonucu verir.
// Çalıştır: node --test test/  (internete çıkmaz)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { denetle as eskiDenetle, dersSayfasiCoz } from "../lib/bologna.mjs";
import { taslakDenetle as eskiTaslak } from "../lib/bologna-taslak.mjs";
import { denetle, taslakDenetle } from "../lib/cekirdek.mjs";

const hucre = (x) => `<td>${x}</td>`;
const tablo = (satirlar) => `<table>${satirlar.map((r) => `<tr>${r.map(hucre).join("")}</tr>`).join("")}</table>`;
const dersHtml = (guncelleme) =>
  [
    tablo([["Yarıyıl", "Kodu", "Adı", "T+U+L", "Kredi", "AKTS", "Son Güncelleme Tarihi"], ["3", "TBP201", "İNTERNET PROGRAMLAMA", "2+1+0", "0", "5", guncelleme]]),
    tablo([["Dersin Dili", "Türkçe"]]),
    tablo([["Yarıyıl Çalışmaları", "Sayısı", "Katkı"], ["Ara Sınav", "1", "% 40"], ["Yarıyıl Sonu Sınavı", "1", "% 50"], ["Toplam :", "2", "% 100"]]),
    tablo([["İş Yükü", "Sayısı", "Süre", "Toplam İş Yükü (Saat)"], ["Ders Süresi", "14", "3", "42"], ["Ödevler", "14", "3", "42"], ["AKTS Kredisi : 3", "", "", "3"]]),
    tablo([["Sıra No", "Açıklama"], ["1", "HTML sayfası tasarlar."], ["2", "CSS uygular."]]),
    tablo([["Hafta", "Konu"], ...Array.from({ length: 14 }, (_, i) => [String(i + 1), `Konu ${i + 1}`])]),
    tablo([["", "P1", "P2"], ["Tüm", "4", "2"], ["Ö1", "3", "2"], ["Be2", "3", "1"], ["Ye3", "2", "1"]]),
  ].join("");

const yakinTarih = () => {
  const t = new Date(Date.now() - 30 * 86400000);
  return `${String(t.getDate()).padStart(2, "0")}.${String(t.getMonth() + 1).padStart(2, "0")}.${t.getFullYear()}`;
};

function veri(guncelleme = yakinTarih()) {
  const d = { ...dersSayfasiCoz(dersHtml(guncelleme)), zorunlu: true };
  return {
    programCiktilari: [{ kod: "P1", metin: "a" }, { kod: "P2", metin: "b" }],
    tyycIsaret: 0,
    matris: { pkodlar: ["P1", "P2"], dersler: [
      { kod: "TBP201", zorunlu: true, degerler: { P1: "3", P2: "2" } },
      { kod: "TBP999", zorunlu: true, degerler: { P1: "-", P2: "" } },
      { kod: "OSD101", zorunlu: false, degerler: { P1: "", P2: "" } },
    ] },
    dersler: [d, { kod: "OSD101", zorunlu: false, bos: true }],
  };
}

test("Bologna denetimi: CLI test senaryosunda eski ve çekirdek aynı bulguları verir", () => {
  const v = veri();
  assert.deepEqual(denetle(structuredClone(v)), eskiDenetle(structuredClone(v)));
});

test("Bologna denetimi: boş program, ayrımsız matris, okunamayan ve eksik dersler, eski tarih", () => {
  const v = veri("01.01.2020");
  v.programCiktilari = [];
  v.tyycIsaret = null;
  v.matris.dersler.push({ kod: "TBP300", zorunlu: true, degerler: { P1: "4", P2: "4", P3: "4", P4: "4", P5: "4" } }, { kod: "[G] SEC", zorunlu: false, degerler: {}, grupBasligi: true });
  const d = v.dersler[0];
  v.dersler.push(
    { kod: "TBP400", hata: "HTTP 500" },
    { ...d, kod: "TBP500", isyuku: [], degerlendirme: [], dersYapisi: [{ alan: "a", yuzde: 70 }], ciktilar: [], haftalar: 10, katki: {} },
    { ...d, kod: "OSD102", zorunlu: false, bos: true },
  );
  const yeni = denetle(structuredClone(v), { aktsSaat: [20, 25] });
  assert.deepEqual(yeni, eskiDenetle(structuredClone(v), { aktsSaat: [20, 25] }));
  assert.ok(yeni.some((b) => b.kural === "guncellik"), "güncellik kuralı çalışır");
});

const ornek = () => JSON.parse(readFileSync(new URL("../bilgi/bologna-taslak-ornek.json", import.meta.url), "utf8"));

const taslakDegisiklikleri = [
  ["örnek", () => {}],
  ["iş yükü", (t) => { t.isyuku[0].sure = 2; }],
  ["ölçülemeyen çıktı", (t) => { t.ciktilar[0].tr = "Web teknolojileri hakkında bilgi sahibi olur."; t.ciktilar[1].tr = "HTML5 ile erişilebilir sayfa yapısı tasarlayabilir."; }],
  ["numaralandırma", (t) => { t.ciktilar[2].kod = "Ö9"; }],
  ["boş alanlar", (t) => { t.amac = { tr: "" }; t.kod = ""; delete t.haftalar; }],
  ["bölen 25", (t) => { t.__bolen = 25; }],
];

for (const [ad, degistir] of taslakDegisiklikleri) {
  test(`Taslak denetimi (K1-K12) eşdeğer: ${ad}`, () => {
    const t = ornek();
    degistir(t);
    const bolen = t.__bolen ?? 30;
    delete t.__bolen;
    assert.deepEqual(taslakDenetle(structuredClone(t), { bolen }), eskiTaslak(structuredClone(t), { bolen }));
  });
}
