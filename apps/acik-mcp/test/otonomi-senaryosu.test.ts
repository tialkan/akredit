// Otonomi sözleşmesi: sahte (kural tabanlı) asistan sunucunun yanıtlarını izler ve yalnız hocayaSimdiSor true
// olduğunda durup hocaya sorar. Ölçüt, bütün tur boyunca hocaya kaç kez danışıldığıdır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR, aracCalistir, pesinOnayVar } from "../src/index.ts";
import { SUNUCU_TALIMATI } from "../src/sunucu.ts";

const SIMDI = () => new Date("2026-11-07T09:00:00Z");
const arac = (ad: string) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return a;
};
const sayfa = (n: string) =>
  readFileSync(
    join(import.meta.dirname, `../../../packages/baglayicilar/test/fixtures/bologna/ders-${n}.html`),
    "utf8",
  );

/** Sahte asistan: çağrı sırasını ve hocaya danıştığı durakları kaydeder. */
function sahteAsistan() {
  const cagrilar: string[] = [];
  const duraklar: string[] = [];
  return {
    cagrilar,
    duraklar,
    cagir(ad: string, girdi: unknown) {
      const r = aracCalistir(arac(ad), girdi, { simdi: SIMDI });
      expect(r.hata, `${ad}: ${JSON.stringify(r.veri).slice(0, 300)}`).toBe(false);
      cagrilar.push(ad);
      // biome-ignore lint/suspicious/noExplicitAny: test erişimi
      const v = r.veri as any;
      if (v.hocayaSimdiSor) duraklar.push(ad);
      return v;
    },
    /** Asistanın kendi yazdığı rapor mesajı da bir duraktır (teyit + seçim tek mesajda). */
    hocayaSor(neden: string) {
      duraklar.push(neden);
    },
  };
}

describe("otonomi senaryosu: 'akredit ders paketimi doldur' → tarama → tek rapor → tek kayıt onayı", () => {
  it("iki dersi tarar; hocaya en çok iki kez danışır (rapor+teyit, kayıt onayı)", () => {
    const a = sahteAsistan();
    // 1. Niyet sunucuda çözülür: menü yok, durak yok.
    const basla = a.cagir("akredit_basla", { kullaniciMesaji: "akredit ders paketimi doldur" });
    expect(basla.sonuc.odak.no).toBe("1");

    // 2. Ders listesi açıldı: "hangi ders?" yok.
    const liste = a.cagir("obs_ders_listesi", {
      dersler: [
        { kod: "KRG9001", ad: "Kurgu 1" },
        { kod: "KRG9002", ad: "Kurgu 2" },
      ],
    });
    expect(liste.taramaPlani ?? liste.sonuc.taramaPlani).toHaveLength(2);

    // 3. Her ders tek çağrıyla ayrıştırılır ve denetlenir (bologna_denetle ayrıca çağrılmaz).
    const taranan = ["9001", "9002"].map((n) => a.cagir("bologna_ayristir", { html: sayfa(n) }).sonuc);
    for (const t of taranan) expect(t.denetim, "ayrıştırma denetimi gömülü döndürmeli").toBeDefined();
    expect(a.cagrilar).not.toContain("bologna_denetle");

    // 4. Tek rapor: eksikler + sayfada olmayan resmî bilgi tek mesajda sorulur.
    a.hocayaSor("rapor ve teyit");
    // Hoca: "1. vize 40 final 60, kaynak sayfadaki" → hocanın yanıtı kanıt olarak verilir.
    const ders = { kod: "KRG9001", ad: "Kurgu 1", akts: 5, tul: "2+1+0" };
    const kopya = a.cagir("bologna_kopya_metni", {
      ders,
      alanlar: {
        amac: { tr: "Kurgu biliminin temel kavramlarını tanıtmak ve uygulamalı örneklerle pekiştirmek." },
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 40 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
        ],
        degerlendirmeDayanagi: "hoca",
        degerlendirmeKaniti: "vize 40 final 60",
      },
    });
    // 5. Kayıt onayı durağı (özetle aynı mesaj).
    expect(kopya.hocayaSimdiSor).toBe(true);
    expect(kopya.sonuc.yazilamayan).toEqual([]);

    // 6. Kayıttan sonra geri okuma: eşleşirse durak yok.
    const beklenen = kopya.sonuc.obsKarsilastirGirdisi;
    const geri = a.cagir("obs_karsilastir", {
      ...beklenen,
      geriOkunan: {
        // Geri okunan sayfa ders kodunu ve kaydedilen değerleri içerir.
        metin: ["KRG9001 Kurgu 1", ...beklenen.beklenen.map((x: { deger: string }) => x.deger)].join("\n"),
        dersKodu: "KRG9001",
      },
    });
    expect(geri.sonuc.dur).toBe(false);

    expect(a.duraklar).toEqual(["rapor ve teyit", "bologna_kopya_metni"]);
    expect(a.duraklar.length).toBeLessThanOrEqual(2);
  });

  it("uydurma koruması: asistan hocaya sormadan yüzde yazarsa paket reddeder ve durak açar", () => {
    const a = sahteAsistan();
    const kopya = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1", akts: 5 },
      alanlar: {
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 40 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
        ],
        // Sayfada tablo yok; asistan 'sayfa' diyor ama kanıt metninde yüzdeler geçmiyor.
        degerlendirmeDayanagi: "sayfa",
        degerlendirmeKaniti: "Değerlendirme tablosu boş.",
      },
    });
    expect(kopya.sonuc.yazilamayan.map((x: { alan: string }) => x.alan)).toEqual(["Değerlendirme"]);
    expect(kopya.sonuc.metin).not.toContain("Ara Sınav\t1\t40");
  });
});

describe("toplu mod: birden çok ders, tek özet, tek onay", () => {
  it("bologna_toplu_ozet her ders için kopya metni kapılarını uygular; teyitsiz yüzde satırda 'yazılmaz' görünür", () => {
    const a = sahteAsistan();
    const amac = { tr: "Kurgu biliminin temel kavramlarını tanıtmak ve uygulamalı örneklerle pekiştirmek." };
    const degerlendirme = [
      { ad: "Ara Sınav", sayi: 1, katki: 40 },
      { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
    ];
    const r = a.cagir("bologna_toplu_ozet", {
      dersler: [
        {
          ders: { kod: "KRG9001", ad: "Kurgu 1", akts: 5 },
          alanlar: { amac, degerlendirme, degerlendirmeDayanagi: "hoca", degerlendirmeKaniti: "vize 40 final 60" },
          oncekiDegerler: { "Dersin Amacı (Türkçe)": "" },
        },
        {
          // Kanıtsız yüzde: pakete girmez, tabloda görünür; hoca ders numarasıyla ayırabilir.
          ders: { kod: "KRG9002", ad: "Kurgu 2", akts: 4 },
          alanlar: { amac, degerlendirme, degerlendirmeDayanagi: "sayfa", degerlendirmeKaniti: "tablo boş" },
        },
      ],
    });
    expect(r.hocayaSimdiSor).toBe(true);
    expect(r.sonuc.tablo).toHaveLength(2);
    expect(r.sonuc.tablo[0]).toMatchObject({
      no: 1,
      kod: "KRG9001",
      degerlendirme: "Ara Sınav %40, Yarıyıl Sonu Sınavı %60 (hoca)",
    });
    expect(r.sonuc.tablo[0].degisecekAlanlar).toContain("Dersin Amacı (Türkçe)");
    expect(r.sonuc.tablo[1]).toMatchObject({
      kod: "KRG9002",
      degerlendirme: "teyitsiz, yazılmaz",
      yazilamayan: ["Değerlendirme"],
    });
    // Paketler obs_karsilastir girdisidir; teyitsiz yüzde ikinci paketin beklenenlerinde yoktur.
    const p2 = r.sonuc.paketler.KRG9002 as { beklenen: { alan: string }[] };
    expect(p2.beklenen.map((x) => x.alan)).not.toContain("Değerlendirme (ad, sayı, katkı %)");
    expect(r.sonuc.hocayaGoster).toContain("1) 2 dersin tamamını OBS'ye yaz ve kaydet");
    expect(r.sonuc.hocayaGoster).toContain("2) KRG9002");
    // Tek durak: toplu özet.
    expect(a.duraklar).toEqual(["bologna_toplu_ozet"]);
  });

  it("obs_ders_listesi ve bologna_ayristir tarayıcı adım dizisi verir; adımlar soru sormayı yasaklar", () => {
    const a = sahteAsistan();
    const liste = a.cagir("obs_ders_listesi", { dersler: [{ kod: "KRG9001" }, { kod: "KRG9002" }] }).sonuc;
    expect(liste.tarayiciEylemPlani[0]).toContain("Hocaya soru sormayın");
    expect(liste.tarayiciEylemPlani[0]).toContain("KRG9001");
    const ayr = a.cagir("bologna_ayristir", { html: sayfa("9001") }).sonuc;
    expect(ayr.tarayiciEylemPlani.join(" ")).toContain("bologna_toplu_ozet");
    expect(a.duraklar).toEqual([]);
  });
});

describe("peşin onay (tam otonom kip): hoca başta bir kez 'hepsini yap ve kaydet' der, sonda rapor alır", () => {
  const ONAY = "akredit ders paketlerimi hepsini yap ve kaydet";
  const amac = { tr: "Kurgu biliminin temel kavramlarını tanıtmak ve uygulamalı örneklerle pekiştirmek." };

  it("giriş dışında hiç durak yok; kanıtsız yüzde yine yazılmaz, EKSİK kalır; onay metni kayda geçer", () => {
    const a = sahteAsistan();
    const basla = a.cagir("akredit_basla", { kullaniciMesaji: ONAY });
    expect(basla.sonuc.odak.no).toBe("1");
    expect(basla.sonuc.pesinOnay.metin).toBe(ONAY);
    expect(basla.sonuc.hocayaGoster).toContain("Onaya Gönder'e siz basarsınız");

    const liste = a.cagir("obs_ders_listesi", { dersler: [{ kod: "KRG9001" }, { kod: "KRG9002" }], pesinOnay: ONAY });
    expect(liste.sonuc.hocayaGoster).toContain("OBS'ye kaydedeceğim");
    expect(liste.sonrakiAdim).toContain("rapor durağı yok");

    for (const n of ["9001", "9002"]) a.cagir("bologna_ayristir", { html: sayfa(n) });

    // Değerlendirme sayfada yok, hocaya sorulmaz: paket değerlendirmesiz gider, EKSİK raporda görünür.
    const kopya = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1", akts: 5 },
      alanlar: { amac },
      pesinOnay: ONAY,
    });
    expect(kopya.hocayaSimdiSor).toBe(false);
    expect(kopya.sonuc.pesinOnayKaydi).toBe(ONAY);
    expect(kopya.sonrakiAdim).toContain("sormadan");
    expect(kopya.sonrakiAdim).toContain("TEK rapor");

    // Kanıtsız yüzde peşin onayla da yazılmaz.
    const toplu = a.cagir("bologna_toplu_ozet", {
      dersler: [
        {
          ders: { kod: "KRG9002", ad: "Kurgu 2", akts: 4 },
          alanlar: {
            amac,
            degerlendirme: [
              { ad: "Ara Sınav", sayi: 1, katki: 40 },
              { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
            ],
            degerlendirmeDayanagi: "hoca",
            degerlendirmeKaniti: "söylemedi",
          },
        },
      ],
      pesinOnay: ONAY,
    });
    expect(toplu.hocayaSimdiSor).toBe(false);
    expect(toplu.sonuc.tablo[0].yazilamayan).toEqual(["Değerlendirme"]);

    const beklenen = kopya.sonuc.obsKarsilastirGirdisi;
    const geri = a.cagir("obs_karsilastir", {
      ...beklenen,
      geriOkunan: {
        metin: ["KRG9001 Kurgu 1", ...beklenen.beklenen.map((x: { deger: string }) => x.deger)].join("\n"),
        dersKodu: "KRG9001",
      },
    });
    expect(geri.sonuc.dur).toBe(false);
    expect(a.duraklar).toEqual([]);
  });

  it("kayıt sözü olmayan metin peşin onay sayılmaz: özet gösterilir, onay sorulur", () => {
    const a = sahteAsistan();
    const r = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1" },
      alanlar: { amac },
      pesinOnay: "tamam bakalım",
    });
    expect(r.hocayaSimdiSor).toBe(true);
    expect(r.sonuc.pesinOnayKaydi).toBeUndefined();
    // Kalan eksik varken o adım öne geçer; iki durumda da hocaya sorulur.
    expect(r.sonrakiAdim).toMatch(/peşin onay sayılmadı|kayıt onayını aynı mesajda isteyin/u);
    // Yalnız odak, onay yok: ipucu verilir, akış eski durakla sürer.
    const b = a.cagir("akredit_basla", { kullaniciMesaji: "ders paketimi doldur" });
    expect(b.sonuc.pesinOnay).toBeUndefined();
    expect(b.sonuc.ipucu).toContain("hepsini yap ve kaydet");
  });

  it("olumsuz söz onay değildir: 'kaydetme', 'kaydetmeden önce sor', 'sen halletme' peşin onay sayılmaz", () => {
    // 0.8.0'da PESIN_ONAY yalnız /kaydet|hallet|.../ arıyordu; "kaydetme" de eşleşip sormadan kayda yol açıyordu.
    for (const m of [
      "kaydetme",
      "KAYDETME",
      "hepsini doldur ama kaydetme",
      "kaydetmeden önce bana sor",
      "sormadan kaydetme",
      "sen halletme",
      "OBS'ye yazma, yalnız tara",
      "hepsini yap ama onaylamıyorum",
      "kaydetmeni istemiyorum",
      "hayır, kaydet demedim",
      "HAYIR",
      "hepsini kaydet değil, yalnız göster",
    ])
      expect(pesinOnayVar(m), m).toBe(false);
    // Olumlu sözler onaydır; ad-fiil ("kaydetmek") olumsuz sayılmaz. Kısa ya da boş metin onay değildir.
    for (const m of [
      ONAY,
      "sen hallet",
      "sormadan kaydet",
      "HEPSİNİ YAP VE KAYDET",
      "onaylıyorum, kaydet",
      "kaydetmek için hepsini yap",
    ])
      expect(pesinOnayVar(m), m).toBe(true);
    for (const m of [undefined, "", "ok"]) expect(pesinOnayVar(m)).toBe(false);

    // Araç düzeyi: olumsuz sözle gelen çağrı kayıt onayı durağında kalır, onay kaydı yazılmaz.
    const a = sahteAsistan();
    const kopya = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1" },
      alanlar: { amac },
      pesinOnay: "hepsini doldur ama kaydetme",
    });
    expect(kopya.hocayaSimdiSor).toBe(true);
    expect(kopya.sonuc.pesinOnayKaydi).toBeUndefined();
    expect(kopya.sonuc.not).toContain("hoca bir kez 'kaydet' der");
    const liste = a.cagir("obs_ders_listesi", { dersler: [{ kod: "KRG9001" }], pesinOnay: "sormadan kaydetme" });
    expect(liste.sonuc.hocayaGoster).not.toContain("kaydedeceğim");
    expect(liste.sonuc.raporBicimi).toBeDefined();
    const basla = a.cagir("akredit_basla", { kullaniciMesaji: "akredit ders paketimi doldur ama kaydetme" });
    expect(basla.sonuc.pesinOnay).toBeUndefined();
  });

  it("peşin onayda yanıt kendi içinde tutarlı: rapor biçimi ve seçenek yok, özet sondaki raporda", () => {
    const a = sahteAsistan();
    const liste = a.cagir("obs_ders_listesi", { dersler: [{ kod: "KRG9001" }], pesinOnay: ONAY });
    expect(liste.sonuc.raporBicimi).toBeUndefined();
    expect(liste.sonuc.tarayiciEylemPlani.join(" ")).not.toContain("raporBicimi");
    const kopya = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1" },
      alanlar: { amac },
      pesinOnay: ONAY,
    });
    expect(kopya.sonuc.not).not.toContain("hoca bir kez 'kaydet' der");
    expect(kopya.sonuc.not).toContain("sondaki tek raporda");
    const toplu = a.cagir("bologna_toplu_ozet", {
      dersler: [{ ders: { kod: "KRG9001", ad: "Kurgu 1" }, alanlar: { amac } }],
      pesinOnay: ONAY,
    });
    expect(toplu.sonuc.hocayaGoster).not.toContain("1) 1 dersin tamamını");
    expect(toplu.sonuc.hocayaGoster).toContain("Onaya Gönder'e siz basarsınız.");
    expect(a.duraklar).toEqual([]);
  });

  it("peşin onay yalnız OBS'ye yazan odaklarda açılır; dil denetiminde 'hepsini düzelt' kayıt sözü vermez", () => {
    const a = sahteAsistan();
    const dil = a.cagir("akredit_basla", { kullaniciMesaji: "raporumun dil denetimini yap, hepsini düzelt" });
    expect(dil.sonuc.odak.no).toBe("5");
    expect(dil.sonuc.pesinOnay).toBeUndefined();
    expect(dil.sonuc.hocayaGoster).not.toContain("OBS");
    expect(dil.sonuc.ipucu).toBeUndefined();
  });
});

describe("durak bayrağı ve talimat sırası", () => {
  it("hocayı bekleyen adımlar hocayaSimdiSor true döner: kurulum adımları, not tablosunda eksik bilgi", () => {
    const a = sahteAsistan();
    const kurulum = a.cagir("kurulum_yardimi", { istemci: "claude_web" });
    expect(kurulum.sonrakiAdim).toContain("'oldu' demesini bekleyin");
    expect(kurulum.hocayaSimdiSor).toBe(true);
    expect(kurulum.simdiYap).toBeUndefined();
    // Başlıkta tam puan, çıktı eşlemesi ve yüzde yok: eksikler hocaya TEK mesajda sorulur.
    const eksik = a.cagir("not_tablosu_ayristir", { tablo: "Vize S1\tFinal S1\n10\t20\n15\t30" });
    expect(eksik.sonuc.hazir).toBe(false);
    expect(eksik.hocayaSimdiSor).toBe(true);
    // Eksik yoksa durak yok: taslak doğrudan hesaba gider.
    const tam = a.cagir("not_tablosu_ayristir", {
      tablo: "Vize S1 (ÇK1) /20\tFinal S1 (ÇK1) /50\n10\t20\n15\t30",
      agirliklar: { ara_sinav: 40, yariyil_sonu: 60 },
    });
    expect(tam.sonuc.hazir).toBe(true);
    expect(tam.hocayaSimdiSor).toBe(false);
  });

  it("sunucu talimatında KURAL 1-7 sıralıdır", () => {
    const sira = [...SUNUCU_TALIMATI.matchAll(/KURAL (\d):/gu)].map((m) => Number(m[1]));
    expect(sira).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
