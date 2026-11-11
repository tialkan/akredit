// Proliz OBS herkese açık ders sayfasının düz metni (tarayıcı aracının okuduğu sekmeli metin).
// Örnekler: test/fixtures/proliz-metin (KAYNAK.md). Beklenen değerler metinden elle sayıldı; yorumda yazılı.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR, aracCalistir } from "../src/index.ts";
import { prolizMetniCoz, prolizSayfaMetniMi } from "../src/proliz-metin.ts";

const oku = (ad: string) => readFileSync(new URL(`./fixtures/proliz-metin/${ad}`, import.meta.url), "utf8");
const DOLU = oku("dolu-ceng201.txt");
const BOS = oku("bos-paket.txt");

const calistir = (girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === "bologna_ayristir");
  if (!a) throw new Error("bologna_ayristir");
  return aracCalistir(a, girdi, { simdi: () => new Date("2026-11-12T10:00:00Z") });
};
// biome-ignore lint/suspicious/noExplicitAny: test yardımcı erişimi
const veri = (r: { veri: Record<string, unknown> }) => r.veri as any;

describe("Proliz düz metni: dolu ders (CENG201)", () => {
  const p = prolizMetniCoz(DOLU);

  it("tanınır", () => {
    expect(prolizSayfaMetniMi(DOLU)).toBe(true);
    expect(prolizSayfaMetniMi(BOS)).toBe(true);
    expect(prolizSayfaMetniMi("Dersin Amacı\tKurgu.\nDeğerlendirme\tAra Sınav 1 40")).toBe(false);
  });

  it("1. ders ayrıntıları başlık satırının altındaki değer satırından okunur", () => {
    // Değer satırı: "3 | CENG201 | OBJECT ORIENTED PROGRAMMING | 3+2+0 | 0 | 6 | 21.05.2024"
    expect(p.ders).toMatchObject({
      kod: "CENG201",
      ad: "OBJECT ORIENTED PROGRAMMING",
      yariyil: 3,
      tul: "3+2+0",
      kredi: 0,
      akts: 6,
      guncelleme: "21.05.2024",
    });
  });

  it("2. öğrenme çıktıları yalnız 4 madde; Ders Konuları 14 hafta", () => {
    // "Sıra No | Açıklama" altında 1-4 numaralı dört satır.
    expect(p.ders.ciktilar.map((c) => c.kod)).toEqual(["Ö1", "Ö2", "Ö3", "Ö4"]);
    expect(p.ders.ciktilar[3]?.metin).toBe("Run time da oluşan istisnaları analiz etmek");
    // "Hafta | Konu" altında 1-14 numaralı satırlar; 9. satır "Vize Haftası".
    expect(p.ders.haftaKonulari).toHaveLength(14);
    expect(p.ders.haftaKonulari[8]).toBe("Vize Haftası");
  });

  it("3. değerlendirme 6 kalem, ders yapısı yalnız 8 alan", () => {
    // Ara Sınav 30 + Kısa Sınav 5 + Ödev 5 + Uygulama 10 + Proje 10 + YSS 40 = 100; "Toplam :" satırı sayılmaz.
    expect(p.ders.degerlendirme).toEqual([
      { ad: "Ara Sınav", sayi: 1, katki: 30 },
      { ad: "Kısa Sınav", sayi: 1, katki: 5 },
      { ad: "Ödev", sayi: 1, katki: 5 },
      { ad: "Uygulama", sayi: 1, katki: 10 },
      { ad: "Proje", sayi: 1, katki: 10 },
      { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 40 },
    ]);
    // Ders Yapısı: Matematik ... Alan Bilgisi, sekiz satır; %50 + %50 = 100.
    expect(p.ders.dersYapisi).toHaveLength(8);
    expect(p.ders.dersYapisi.map((x) => x.yuzde)).toEqual([0, 50, 50, 0, 0, 0, 0, 0]);
    // Kanıt: tablo satırları olduğu gibi (başlık + 6 kalem + toplam = 8 satır).
    expect(p.ders.degerlendirmeKaniti.split("\n")).toHaveLength(8);
    expect(p.ders.degerlendirmeKaniti).toContain("Ara Sınav\t1\t% 30");
    // İş yükü: 5 kalem (Toplam İş Yükü satırı sayılmaz); 36+6+30+40+50 = 162.
    expect(p.ders.isyuku.reduce((t, x) => t + (x.toplam ?? 0), 0)).toBe(162);
  });

  it("4. boş etiket sonraki satırları yutmaz; ön koşul parantezsiz", () => {
    expect(p.ders.icerik.endsWith("Standart Şablon Kütüphanesi.")).toBe(true);
    expect(p.ders.yontem).toBe("");
    expect(p.bilgiler.onKosul).toBe("CENG104 veya CENG114");
    // Amaç iki satırdır ("1.Nesne ...", "2.Iyi ...").
    expect(p.ders.amac.split("\n")).toHaveLength(2);
  });

  it("5. yetkililer kendi satırlarıyla", () => {
    expect(p.yetkililer).toEqual([
      { rol: "Dersin Koordinatörü", deger: "Yok" },
      { rol: "Dersi Verenler", deger: "Dr. Öğr. Üyesi Deniz KURGU" },
      { rol: "Dersin Yardımcıları", deger: "Yok" },
    ]);
    expect(p.kaynaklar).toEqual(["Y. Daniel Liang. Introduction to Java Programming, 10E, 2014."]);
  });

  it("6. ders notları yalnız iki satır; Dökümanlar/Ödevler/Sınavlar girmez", () => {
    expect(p.ders.notlar.split("\n")).toHaveLength(2);
    expect(p.ders.notlar).not.toMatch(/Dökümanlar|Ödevler|Sınavlar/u);
  });

  it("7. katkı matrisi sayı, yalnız Ö1-Ö4; Tüm ayrı", () => {
    expect(Object.keys(p.ders.katki)).toEqual(["Ö1", "Ö2", "Ö3", "Ö4"]);
    expect(p.ders.katki.Ö1).toEqual({
      P1: 5,
      P2: 5,
      P3: 4,
      P4: 1,
      P5: 4,
      P6: 1,
      P7: 1,
      P8: 1,
      P9: 1,
      P10: 1,
      P11: 1,
      P12: 1,
    });
    expect(p.ders.katkiTum.P3).toBe(4);
  });

  it("bologna_ayristir: denetim değerlendirmeyi boş saymaz, teyide sormaz; kanıt hazır", () => {
    const v = veri(calistir({ metin: DOLU }));
    const s = v.sonuc;
    expect(s.bicim).toBe("proliz_duz_metin");
    expect(s.bolognaDenetleGirdisi.ders).toMatchObject({ kod: "CENG201", akts: 6, haftalar: 14 });
    expect(s.bolognaDenetleGirdisi.ders.degerlendirme).toHaveLength(6);
    expect(s.bolognaDenetleGirdisi.ders.dersYapisi).toHaveLength(8);
    expect(Object.keys(s.bolognaDenetleGirdisi.ders.katki)).toEqual(["Ö1", "Ö2", "Ö3", "Ö4"]);
    expect(s.katkiMatrisi.Ö2.P1).toBe(5);
    expect(s.denetim.teyitSorulacak).not.toContain("Değerlendirme yöntem ve yüzdeleri");
    expect(s.denetim.teyitSorulacak).not.toContain("Kullanılan kaynaklar");
    expect(s.denetim.doldurulacak.map((x: { ad: string }) => x.ad).join(" ")).not.toMatch(/Değerlendirme/u);
    expect(s.degerlendirmeDayanagi).toBe("sayfa");
    expect(s.degerlendirmeKaniti).toContain("Yarıyıl Sonu Sınavı\t1\t% 40");
    expect(v.sonrakiAdim).toMatch(/degerlendirmeKaniti/u);
    // 9. İngilizce alan yok; dil bilgisi bilgiler'de.
    expect(s.ingilizce).toBe(false);
    expect(s.bilgiler.dil).toBe("İngilizce");
  });
});

describe("Proliz düz metni: boş paket", () => {
  it("8. tanınır, hata yerine bütün alanları eksik gösteren denetim döner", () => {
    const p = prolizMetniCoz(BOS);
    expect(p.bulunan).toEqual([]);
    expect(p.ders.pKodlari).toEqual(["P1", "P2", "P3", "P4"]);
    const v = veri(calistir({ metin: BOS, dersIpucu: { kod: "KRG101", ad: "Kurgu Bilimi", akts: 5 } }));
    const s = v.sonuc;
    expect(s.bicim).toBe("proliz_duz_metin");
    expect(s.bosPaket).toBe(true);
    expect(s.bolognaDenetleGirdisi.ders).toMatchObject({ kod: "KRG101", ad: "Kurgu Bilimi", akts: 5 });
    const eksik = s.denetim.doldurulacak.map((x: { ad: string }) => x.ad).join(" ");
    for (const a of [/amacı/u, /içeriği/u, /Değerlendirme/u, /Kaynaklar/u, /Öğrenme çıktıları/u, /Haftalık/u])
      expect(eksik).toMatch(a);
    expect(s.denetim.teyitSorulacak).toEqual(["Değerlendirme yöntem ve yüzdeleri", "Kullanılan kaynaklar"]);
    expect(v.sonrakiAdim).toMatch(/öneriyle doldur/u);
    expect(v.sonrakiAdim).toMatch(/EKSİK/u);
  });

  it("ipucu yoksa kod DERS kalır, ad uydurulmaz", () => {
    const s = veri(calistir({ metin: BOS })).sonuc;
    expect(s.bolognaDenetleGirdisi.ders.kod).toBe("DERS");
    expect(s.bolognaDenetleGirdisi.ders.ad).toBeUndefined();
  });
});
