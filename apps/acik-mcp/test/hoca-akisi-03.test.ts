// 0.3.0 hoca akışı (0.4.0 ile güncellendi): genel ayrıştırıcı (Proliz dışı), künye kuralı, kaynak biçimleme, iş yükü önerisi, not tablosu,
// kurulum ve engel rehberi, giriş bilgisi yasağı ve SDK istemcisiyle tam Bologna turu.
// Bütün dersler, kişiler, kurumlar ve kaynaklar kurgudur.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import {
  ACIK_ARACLAR,
  ACIK_ISTEMLER,
  acikMcpIsleyici,
  aracCalistir,
  ENGELLER,
  GIRIS_BILGISI_KURALI,
  ISTEMCILER,
  isYukuDagilimlari,
  kunyeBicimle,
  NOT_TABLOSU_KISISEL_ILETI,
  SUNUCU_SURUMU,
  yazarListesi,
} from "../src/index.ts";

const SIMDI = () => new Date("2026-11-04T10:00:00Z");

async function baglan() {
  const isleyici = acikMcpIsleyici({ simdi: SIMDI, gunluk: () => {} });
  const tasima = new StreamableHTTPClientTransport(new URL("https://akredit.org/mcp"), {
    fetch: (u, i) => isleyici(new Request(u, i)),
  });
  const istemci = new Client({ name: "test", version: "1.0.0" });
  await istemci.connect(tasima);
  return istemci;
}

const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};
// biome-ignore lint/suspicious/noExplicitAny: test yardımcı erişimi
const sonuc = (r: { veri: Record<string, unknown> }) => r.veri.sonuc as any;
// biome-ignore lint/suspicious/noExplicitAny: test yardımcı erişimi
const veri = (r: unknown) => (r as { structuredContent: Record<string, any> }).structuredContent;

/** ÜBYS benzeri kurgu sayfa: anahtar-değer tablosu, başlık satırı, ayrı çıktı ve hafta tabloları. */
const UBYS_HTML = `<html><body>
<table><tr><th>Ders Kodu</th><th>Ders Adı</th><th>T+U+L</th><th>Kredi</th><th>AKTS</th></tr>
<tr><td>KRG204</td><td>Kurgu Ölçme Yöntemleri</td><td>2+1+0</td><td>3</td><td>5</td></tr></table>
<table>
<tr><td>Dersin Dili</td><td>Türkçe</td></tr>
<tr><td>Dersin Türü</td><td>Zorunlu</td></tr>
<tr><td>Ön Koşul</td><td>Yok</td></tr>
<tr><td>Dersi Veren Öğretim Elemanı</td><td>Doç. Dr. Ece Kurgu</td></tr>
<tr><td>E-posta</td><td>ece.kurgu@ornek.edu.tr</td></tr>
<tr><td>Dersin Amacı</td><td></td></tr>
<tr><td>Dersin İçeriği</td><td>Kurgu ölçme yöntemlerine giriş ve temel kavramlar.</td></tr>
</table>
<table><tr><th colspan="2">Öğrenme Çıktıları</th></tr>
<tr><td>1</td><td>Kurgu ölçme kavramlarını açıklar.</td></tr>
<tr><td>2</td><td>Kurgu verisinden temel göstergeleri hesaplar.</td></tr></table>
<table><tr><th colspan="2">Haftalık Konular</th></tr>
<tr><td>1</td><td>Kurgu ölçmeye giriş</td></tr><tr><td>2</td><td>Ölçme türleri</td></tr><tr><td>3</td><td>Göstergeler</td></tr></table>
<table><tr><th>Değerlendirme</th><th>Sayı</th><th>Katkı</th></tr>
<tr><td>Ara Sınav</td><td>1</td><td>%40</td></tr><tr><td>Yarıyıl Sonu Sınavı</td><td>1</td><td>%60</td></tr></table>
<table><tr><th>Kaynaklar</th></tr><tr><td>Kurgucu, A. (2020). Kurgu ölçme. Kurgu Yayınları.</td></tr></table>
<a href="/obs/ders.jsp;jsessionid=A1B2C3D4E5F6">ders</a>
</body></html>`;

/** Düz metin, Türkçe etiketler. 14x3 + 14x4 + 2x11 = 42 + 56 + 22 = 120 = 4 AKTS x 30. */
const DUZ_METIN = `Ders Kodu: KRG305
Ders Adı: Kurgu Veri Çözümlemesi
T+U+L: 3+0+0
AKTS: 4
Dersi Veren: Prof. Dr. Deniz Ak
E-posta: deniz.ak@ornek.edu.tr
Dersin Amacı:
Bu dersin amacı kurgu verisini çözümleme becerisi kazandırmaktır.
Dersin İçeriği: Kurgu verisi, göstergeler ve raporlama.
Yöntem ve Teknikler: Anlatım, tartışma ve uygulama.
Öğrenme Çıktıları:
1. Kurgu verisini açıklar.
2. Kurgu göstergelerini hesaplar.
3. Kurgu raporunu değerlendirir.
Haftalık Konular:
1. Hafta: Giriş
2. Hafta: Veri türleri
Değerlendirme:
Ara Sınav %40
Yarıyıl Sonu Sınavı %60
AKTS İş Yükü:
Ders Süresi 14 3 42
Bireysel Çalışma 14 4 56
Sınav Hazırlığı 2 11 22
Kaynaklar:
1. Kurgucu, A. (2021). Kurgu veri çözümlemesi. Kurgu Yayınları.
2. Örnek, B., & Deneme, C. (2019). Kurgu istatistiği. Kurgu Dergisi, 4(2), 10-20.`;

const INGILIZCE = `Course Code: FIC101
Course Title: Introduction to Fiction Studies
ECTS: 5
Language: English
Instructor: Dr. Jane Fiction
Course Objectives: The aim of this course is to introduce fiction studies.
Course Content: Fiction, narrative, and measurement.
Learning Outcomes:
LO1 Explains basic fiction concepts.
LO2 Applies narrative analysis.
Weekly Topics:
Week 1 Introduction
Week 2 Narrative
Week 3 Measurement
Assessment:
Midterm 40%
Final 60%
References:
Fiction, J. (2020). Fiction studies. Fiction Press.`;

describe("genel ayrıştırıcı (Proliz dışı)", () => {
  it("ÜBYS benzeri tablo: alanları bulur, görev satırlarını korur, oturum kimliğini atar, künyeyi korur", () => {
    const r = calistir("bologna_ayristir", { html: UBYS_HTML });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    expect(s.bicim).toBe("genel");
    const d = s.bolognaDenetleGirdisi.ders;
    expect(d).toMatchObject({
      kod: "KRG204",
      ad: "Kurgu Ölçme Yöntemleri",
      tul: "2+1+0",
      kredi: 3,
      akts: 5,
      haftalar: 3,
    });
    expect(d.ciktilar).toEqual([
      { kod: "Ö1", metin: "Kurgu ölçme kavramlarını açıklar." },
      { kod: "Ö2", metin: "Kurgu verisinden temel göstergeleri hesaplar." },
    ]);
    expect(d.degerlendirme).toEqual([
      { ad: "Ara Sınav", sayi: 1, katki: 40 },
      { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
    ]);
    expect(d.kaynaklar).toEqual(["Kurgucu, A. (2020). Kurgu ölçme. Kurgu Yayınları."]);
    expect(s.bilgiler).toMatchObject({ dil: "Türkçe", tur: "Zorunlu", onKosul: "Yok" });
    expect(s.bulunamayan).toContain("Dersin amacı");
    expect(s.bulunamayan).toContain("AKTS iş yükü");
    // Bulunan temel alanlar: ad, akts, içerik, çıktılar, haftalar, değerlendirme = 6 → orta.
    expect(s.guven).toBe("orta");
    const metin = JSON.stringify(r.veri);
    // Oturum kimliği atılır; görev bilgisi (ad, e-posta) olduğu gibi korunur.
    expect(metin).not.toContain("A1B2C3D4E5F6");
    expect(String(r.veri.atilan)).toMatch(/oturum/u);
    expect(String(r.veri.atilan)).not.toMatch(/Dersi Veren|kişisel veri/u);
    expect(d.yetkililer).toEqual([
      { rol: "Dersi Veren Öğretim Elemanı", deger: "Doç. Dr. Ece Kurgu" },
      { rol: "E-posta", deger: "ece.kurgu@ornek.edu.tr" },
    ]);
  });

  it("düz metin: etiketli bölümler, iş yükü satırları, künyeler; görev satırları korunur", () => {
    const r = calistir("bologna_ayristir", { metin: DUZ_METIN });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    const d = s.bolognaDenetleGirdisi.ders;
    expect(d).toMatchObject({ kod: "KRG305", akts: 4, tul: "3+0+0", haftalar: 2, kaynakSayisi: 2 });
    expect(d.amac).toBe("Bu dersin amacı kurgu verisini çözümleme becerisi kazandırmaktır.");
    expect(d.yontem).toBe("Anlatım, tartışma ve uygulama.");
    expect(d.ciktilar).toHaveLength(3);
    expect(d.isyuku).toEqual([
      { ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42 },
      { ad: "Bireysel Çalışma", sayi: 14, sure: 4, toplam: 56 },
      { ad: "Sınav Hazırlığı", sayi: 2, sure: 11, toplam: 22 },
    ]);
    expect(s.haftaKonulari).toEqual(["Giriş", "Veri türleri"]);
    expect(d.kaynaklar[1]).toBe("Örnek, B., & Deneme, C. (2019). Kurgu istatistiği. Kurgu Dergisi, 4(2), 10-20.");
    // ad, akts, amaç, içerik, çıktılar, haftalar, değerlendirme, iş yükü = 8 → yüksek.
    expect(s.guven).toBe("yüksek");
    expect(d.yetkililer).toEqual([
      { rol: "Dersi Veren", deger: "Prof. Dr. Deniz Ak" },
      { rol: "E-posta", deger: "deniz.ak@ornek.edu.tr" },
    ]);
    expect(r.veri.atilan).toBeUndefined();
    // Ayrıştırılan girdi doğrudan denetlenebilir: 120 saat, 4 x 30 ile uyumlu.
    const den = sonuc(calistir("bologna_denetle", s.bolognaDenetleGirdisi));
    const isyuku = den.alanlar.find((a: { alan: string }) => a.alan === "isyuku");
    expect(isyuku.durum).toBe("tamam");
  });

  it("İngilizce metin: Objective, Learning Outcomes, Weekly Topics, Assessment etiketleri", () => {
    const s = sonuc(calistir("bologna_ayristir", { metin: INGILIZCE }));
    const d = s.bolognaDenetleGirdisi.ders;
    expect(d).toMatchObject({ kod: "FIC101", ad: "Introduction to Fiction Studies", akts: 5, haftalar: 3 });
    expect(d.ciktilar.map((c: { metin: string }) => c.metin)).toEqual([
      "Explains basic fiction concepts.",
      "Applies narrative analysis.",
    ]);
    expect(d.degerlendirme).toEqual([
      { ad: "Midterm", sayi: 1, katki: 40 },
      { ad: "Final", sayi: 1, katki: 60 },
    ]);
    expect(s.bilgiler.dil).toBe("English");
    expect(d.kaynaklar).toEqual(["Fiction, J. (2020). Fiction studies. Fiction Press."]);
    expect(JSON.stringify(d.yetkililer)).toContain("Jane");
  });

  it("Proliz sayfası önce Proliz ayrıştırıcısıyla çözülür", () => {
    const html = readFileSync(
      join(import.meta.dirname, "../../../packages/baglayicilar/test/fixtures/bologna/ders-9001.html"),
      "utf8",
    );
    const s = sonuc(calistir("bologna_ayristir", { html }));
    expect(s.bicim).toBe("proliz");
    expect(s.guven).toBe("yüksek");
    expect(s.bulunamayan).toContain("Dersin amacı");
  });
});

describe("künye kuralı (KVKK)", () => {
  it("Bologna alanlarında yayımlanmış ad ve e-posta reddedilmez; öbür araçlarda öğrenci kimliği reddedilir", () => {
    const temel = { ders: { kod: "KRG101", akts: 5 } };
    const kunye = "Ak, D., & Kurgu, E. (2020). Kurgu bilimi. Kurgu Yayınları.";
    const tamam = calistir("bologna_denetle", {
      ders: { ...temel.ders, kaynaklar: [kunye, "Prof. Dr. Deniz Ak (2021). Kurgu. Kurgu Yayınları."] },
    });
    expect(tamam.hata).toBe(false);
    const kaynak = sonuc(tamam).alanlar.find((a: { alan: string }) => a.alan === "kaynaklar");
    expect(kaynak.durum).toBe("tamam");
    const amac = calistir("bologna_denetle", { ders: { ...temel.ders, amac: "Dersi Prof. Dr. Deniz Ak verir." } });
    expect(amac.hata).toBe(false);
    const eposta = calistir("bologna_taslak_denetle", {
      ders: {},
      secenekler: [{ etiket: "1", alanlar: { kaynaklar: [`${kunye} deniz.ak@ornek.edu.tr`] } }],
    });
    expect(eposta.hata).toBe(false);
    // Not tablosu ve ÇK/PÇ araçlarında tam tarama sürer: öğrenci adı takma adla gelmelidir.
    const ck = calistir("ck_pc_hesapla", { ogrenciler: ["Prof. Dr. Deniz Ak"] });
    expect(ck.veri.kod).toBe("kisisel_veri");
  });
});

describe("kaynak_bicimle", () => {
  it("kitap, makale ve bölüm künyesi; eksik bilgi uydurulmaz, [EKSİK] yazılır", () => {
    expect(yazarListesi(["Ayşe Kurgu"])).toBe("Kurgu, A.");
    expect(yazarListesi(["Kurgu, Ayşe Nur", "Deneme, Can"])).toBe("Kurgu, A. N., & Deneme, C.");
    expect(yazarListesi(["A B", "C D", "E F"])).toBe("B, A., D, C., & F, E.");
    const r = calistir("kaynak_bicimle", {
      kaynaklar: [
        {
          tur: "kitap",
          yazarlar: ["Kurgu, Ayşe"],
          yil: 2020,
          baslik: "Kurgu bilimine giriş",
          baski: 3,
          yayinevi: "Kurgu Yayınları",
        },
        {
          tur: "makale",
          yazarlar: ["Deneme, Can", "Örnek, Ece"],
          yil: 2019,
          baslik: "Kurgu ölçme",
          dergi: "Kurgu Dergisi",
          cilt: "4",
          sayi: "2",
          sayfalar: "10-20",
          doi: "10.1234/kurgu.2019.4",
        },
        { tur: "kitap", yazarlar: ["Kurgu, Ayşe"], baslik: "Adsız kitap" },
        {
          tur: "kitap_bolumu",
          yazarlar: ["Deneme, Can"],
          yil: 2022,
          baslik: "Ölçme bölümü",
          editorler: ["Örnek, Ece"],
          kitapBasligi: "Kurgu el kitabı",
          sayfalar: "45-60",
          yayinevi: "Kurgu Yayınları",
        },
      ],
    });
    expect(r.hata).toBe(false);
    const k = sonuc(r).kunyeler;
    expect(k[0].kunye).toBe("Kurgu, A. (2020). Kurgu bilimine giriş (3. bs.). Kurgu Yayınları.");
    expect(k[1].kunye).toBe(
      "Deneme, C., & Örnek, E. (2019). Kurgu ölçme. Kurgu Dergisi, 4(2), 10-20. https://doi.org/10.1234/kurgu.2019.4",
    );
    expect(k[2].kunye).toBe("Kurgu, A. (t.y.). Adsız kitap. [EKSİK: yayınevi].");
    expect(k[2].eksikler).toEqual(["yıl (t.y. yazıldı)", "yayınevi"]);
    expect(k[3].kunye).toBe(
      "Deneme, C. (2022). Ölçme bölümü. İçinde E. Örnek (Ed.), Kurgu el kitabı (ss. 45-60). Kurgu Yayınları.",
    );
    expect(sonuc(r).tamamlanan).toBe(3);
    expect(kunyeBicimle({ tur: "web", yazarlar: [], kurumYazar: false, baslik: "Kurgu sayfası" }).eksikler).toEqual([
      "yazar",
      "yıl (t.y. yazıldı)",
      "adres",
    ]);
  });
});

describe("is_yuku_oner", () => {
  const DEG = [
    { ad: "Ara Sınav", sayi: 1, katki: 40 },
    { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
  ];

  it("5 AKTS, 2+1+0, vize %40 final %60: satırlar yalnız olan etkinliklerden, kaynak ve varsayımla", () => {
    // Hedef 5 x 30 = 150; ders süresi 14 x 3 = 42; kalan 108.
    // Dengeli: haftalık floor(108 x 0.6 / 14) = floor(4.63) = 4 → 56; etkinliğe 108 - 56 = 52.
    // Ara sınav round(52 x 40 / 100) = round(20.8) = 21; final (son satır) 108 - 56 - 21 = 31. Toplam 150.
    const [d] = isYukuDagilimlari(5, "2+1+0", 14, undefined, DEG);
    expect(d?.isyuku.map((x) => [x.ad, x.sayi, x.sure])).toEqual([
      ["Ders Süresi", 14, 3],
      ["Sınıf Dışı Ders Çalışma Süresi", 14, 4],
      ["Ara Sınav Hazırlık", 1, 21],
      ["Yarıyıl Sonu Sınavı Hazırlık", 1, 31],
    ]);
    expect(d?.isyuku[2]?.kaynak).toBe("Değerlendirme kalemi: Ara Sınav");
    expect(d?.isyuku[1]?.kaynak).toBe("Akredit önerisi");
    for (const x of d?.isyuku ?? []) expect(x.varsayim).toBeTruthy();
    // Ödev ve proje değerlendirmede yok: hiçbir dağılımda satır açılmaz.
    for (const x of isYukuDagilimlari(5, "2+1+0", 14, undefined, DEG))
      expect(x.isyuku.some((y) => /Ödev|Proje/u.test(y.ad))).toBe(false);
    const s = sonuc(calistir("is_yuku_oner", { akts: 5, tul: "2+1+0", degerlendirme: DEG }));
    expect(s.secenekler).toHaveLength(3);
    for (const x of s.secenekler) {
      expect(x.toplam).toBe(150);
      expect(x.tamEsit).toBe(true);
      expect(x.etiket).toBe("öneri");
      // Sunucunun taslak denetimi de aynı toplamı onaylar.
      const t = sonuc(
        calistir("bologna_taslak_denetle", {
          ders: { akts: 5, tul: "2+1+0" },
          secenekler: [{ etiket: "1", alanlar: { isyuku: x.isyuku } }],
        }),
      );
      expect(t.secenekler[0].hesap.isyuku.toplam).toBe(150);
      expect(t.secenekler[0].eksikler).toEqual([]);
    }
  });

  it("ödev varsa ödev satırı açılır; değerlendirme verilmezse etkinlik eklenmez ve eksik söylenir", () => {
    const odevli = isYukuDagilimlari(5, "2+1+0", 14, undefined, [...DEG, { ad: "Ödev", sayi: 2, katki: 20 }]);
    expect(odevli[0]?.isyuku.find((x) => x.ad === "Ödev")?.sayi).toBe(2);
    const s = sonuc(calistir("is_yuku_oner", { akts: 5, tul: "2+1+0" }));
    // Yalnız haftalık çalışma: floor(108 / 14) = 7 → 98; toplam 42 + 98 = 140, 125-150 aralığında.
    expect(s.secenekler).toHaveLength(1);
    expect(s.secenekler[0].isyuku.map((x: { ad: string }) => x.ad)).toEqual([
      "Ders Süresi",
      "Sınıf Dışı Ders Çalışma Süresi",
    ]);
    expect(s.secenekler[0].toplam).toBe(140);
    expect(s.secenekler[0].aralikta).toBe(true);
    expect(s.eksik).toMatch(/Değerlendirme kalemleri verilmedi/u);
  });

  it("sayfadan okunan iş yükü öneriden ayrı döner", () => {
    const s = sonuc(
      calistir("is_yuku_oner", {
        akts: 5,
        tul: "2+1+0",
        degerlendirme: DEG,
        sayfaIsYuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3 }],
      }),
    );
    expect(s.sayfadanOkunan).toEqual({
      satirlar: [{ ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42, kaynak: "sayfa" }],
      toplam: 42,
    });
    expect(s.secenekler[0].toplam).toBe(150);
  });

  it("çeşitli AKTS ve T+U+L için toplam hedefe eşit; kurum değeri verilirse o; ders süresi hedefi aşarsa açık ileti", () => {
    for (const [akts, tul] of [
      [2, "2+0+0"],
      [3, "3+0+0"],
      [4, "2+2+0"],
      [6, "3+0+2"],
      [7.5, "4+0+0"],
    ] as const)
      for (const x of isYukuDagilimlari(akts, tul, 14, undefined, DEG)) expect(x.toplam).toBe(Math.round(akts * 30));
    // Kurum değeri 25: 5 x 25 = 125.
    for (const x of isYukuDagilimlari(5, "2+1+0", 14, 25, DEG)) expect(x.toplam).toBe(125);
    const r = calistir("is_yuku_oner", { akts: 1, tul: "4+0+0" });
    expect(r.hata).toBe(true);
    expect(String(r.veri.hata)).toMatch(/aşıyor/u);
  });
});

describe("not_tablosu_ayristir", () => {
  const KIMLIKLI = [
    "Ad Soyad\tNumara\tVize S1 (ÇK1) /20\tVize S2 (ÇK2) /30\tFinal S1 (ÇK1) /50\tToplam",
    "Ayşe Kurgu\t2026000001\t10\t15\t25\t50",
    "Mehmet Örnek\t2026000002\t20\t30\t50\t100",
  ].join("\n");
  const TABLO = [
    "Vize S1 (ÇK1) /20\tVize S2 (ÇK2) /30\tFinal S1 (ÇK1) /50\tToplam",
    "10\t15\t25\t50",
    "20\t30\t50\t100",
  ].join("\n");

  it("ad, soyad ya da numara sütunu görürse işlemez; değer yanıta girmez; ileti aynen", () => {
    for (const tablo of [
      KIMLIKLI,
      // Başlıksız numara sütunu: 9-11 haneli numara.
      "Ödev ÇK1 /10\tSütun\n5\t202600001\n6\t202600002",
      "Öğrenci No;Ödev ÇK3 /10\n2026000003;8\n2026000004;7",
    ]) {
      const r = calistir("not_tablosu_ayristir", { tablo });
      expect(r.hata).toBe(true);
      expect(r.veri.kod).toBe("kisisel_veri");
      expect(r.veri.hata).toBe(NOT_TABLOSU_KISISEL_ILETI);
      expect(JSON.stringify(r.veri)).not.toMatch(/Ayşe|Mehmet|2026000001|202600001/u);
    }
    expect(NOT_TABLOSU_KISISEL_ILETI).toBe(
      "Kişisel veriyi yapay zekâ sohbetine yapıştırmayın: Excel'de Ad, Soyad, Numara sütunlarını silip yalnız not sütunlarını yapıştırın ya da verinin tarayıcınızdan çıkmadığı hesaplayıcıyı kullanın: https://akredit.org/deneyin",
    );
  });

  it("yalnız not sütunları: takma ad verir, başlıktan soru ve ÇK eşlemesini sezer", () => {
    const r = calistir("not_tablosu_ayristir", { tablo: TABLO });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    expect(s.ogrenciSayisi).toBe(2);
    expect(
      s.sutunlar.map((x: { aracId: string; soruNo: string; ciktilar: string[]; tamPuan: number }) => [
        x.aracId,
        x.soruNo,
        x.ciktilar,
        x.tamPuan,
      ]),
    ).toEqual([
      ["ara_sinav", "1", ["Ö1"], 20],
      ["ara_sinav", "2", ["Ö2"], 30],
      ["yariyil_sonu", "1", ["Ö1"], 50],
    ]);
    expect(s.yoksayilanSutunlar).toEqual(["Toplam"]);
    expect(s.ciktilar).toEqual(["Ö1", "Ö2"]);
    expect(s.hazir).toBe(false);
    expect(s.eksikler.join(" ")).toMatch(/ara_sinav.*yüzdesi yok/u);
    expect(s.ckPcHesaplaTaslagi.puanlar[0]).toEqual({ ogrenci: "o1", aracId: "ara_sinav", soruNo: "1", puan: 10 });
  });

  it("ağırlıklar verilince hazır olur ve ÇK/PÇ hesabına doğrudan girer", () => {
    const s = sonuc(
      calistir("not_tablosu_ayristir", { tablo: TABLO, agirliklar: { ara_sinav: 40, yariyil_sonu: 60 } }),
    );
    expect(s.hazir).toBe(true);
    const { not: _n, ...taslak } = s.ckPcHesaplaTaslagi;
    const h = calistir("ck_pc_hesapla", { dersKodu: "KRG101", donem: "2025-2026 Güz", ...taslak });
    expect(h.hata).toBe(false);
    expect(sonuc(h).ogrenciSayisi).toBe(2);
  });

  it("noktalı virgüllü CSV ve ondalık virgül okunur; tam puanı aşan hücre eksik olarak bildirilir", () => {
    const csv = "Ödev ÇK3 /10;Ödev ÇK4 /10\n12,5;5\n7,5;6";
    const s = sonuc(calistir("not_tablosu_ayristir", { tablo: csv, agirliklar: { odev: 100 } }));
    // Takma ad eklenirken tablo sekmeli biçime çevrilir; ondalık virgül yine okunur.
    expect(s.ayirac).toBe("sekme");
    expect(
      s.ckPcHesaplaTaslagi.puanlar
        .filter((p: { soruNo: string }) => p.soruNo === "1")
        .map((p: { puan: number }) => p.puan),
    ).toEqual([12.5, 7.5]);
    expect(s.eksikler.join(" ")).toMatch(/tam puanı aşıyor/u);
  });
});

describe("kurulum_yardimi ve engel_coz", () => {
  /** Hocaya giriş bilgisini asistana yazdıran ya da isteyen cümle. */
  const ISTEYEN =
    /(parola|şifre|doğrulama kodu|kullanıcı adı)[^.]*\b(bana|buraya|sohbete|asistana)\s+(yazın|verin|gönderin|yapıştırın|iletin)\b/iu;

  it("her istemci için numaralı adımlar; giriş kuralı her yanıtta; giriş bilgisi istenmez", () => {
    for (const istemci of ISTEMCILER) {
      const r = calistir("kurulum_yardimi", { istemci });
      expect(r.hata).toBe(false);
      const s = sonuc(r);
      expect(s.girisKurali).toMatch(/yalnız OBS'nin kendi giriş ekranına/u);
      expect(s.baglayiciAdimlari.map((a: { no: number }) => a.no)).toEqual(
        s.baglayiciAdimlari.map((_: unknown, i: number) => i + 1),
      );
      expect(s.tarayiciAdimlari.length).toBeGreaterThan(0);
      const metin = JSON.stringify(s);
      expect(metin).not.toMatch(ISTEYEN);
      expect(metin).not.toMatch(/—|\*\*/u);
    }
    const chrome = sonuc(calistir("kurulum_yardimi", { istemci: "claude_chrome", konu: "baglayici" }));
    expect(chrome.tarayiciAdimlari).toBeUndefined();
    expect(chrome.baglayiciAdimlari.some((a: { degisebilir?: boolean }) => a.degisebilir)).toBe(true);
  });

  it("her engel için adımlar; CAPTCHA'yı hoca çözer; tarayıcı yoksa kopyala-yapıştır yedeği gelir", () => {
    for (const engel of ENGELLER) {
      const s = sonuc(calistir("engel_coz", { engel, istemci: "chatgpt" }));
      expect(s.adimlar.length).toBeGreaterThan(0);
      expect(JSON.stringify(s)).not.toMatch(ISTEYEN);
    }
    expect(JSON.stringify(sonuc(calistir("engel_coz", { engel: "captcha" })))).toMatch(/siz çözün; asistan çözmez/u);
    const yok = sonuc(calistir("engel_coz", { engel: "tarayici_araci_yok", istemci: "claude_web" }));
    expect(yok.yedekYol.map((a: { yap: string }) => a.yap).join(" ")).toMatch(/Ctrl\+A.*Ctrl\+C.*Ctrl\+V/u);
    expect(JSON.stringify(sonuc(calistir("engel_coz", { engel: "kaydet_basilamiyor" })))).toMatch(/siz basarsınız/u);
  });
});

describe("giriş bilgisi yasağı", () => {
  /** Hocadan giriş bilgisi isteyen ya da asistana geçirten ifade. */
  const ISTEYEN =
    /(parola|şifre|doğrulama kodu|kullanıcı adı|çerez)[^.\n]*\b(bana|buraya|sohbete|asistana)\s+(yazın|verin|gönderin|yapıştırın|iletin)\b|(parolanızı|şifrenizi)\s+(yazar mısınız|paylaşın|verir misiniz)/iu;

  it("her istem giriş bilgisi kuralını taşır; giriş bilgisi geçen her satır bir yasak ya da yalnız OBS ekranı der", () => {
    for (const i of ACIK_ISTEMLER) {
      const m = i.metin({});
      expect(m).toContain(GIRIS_BILGISI_KURALI);
      expect(m).not.toMatch(ISTEYEN);
      for (const satir of m.split("\n").filter((s) => /parola|şifre|doğrulama kodu|çerez/iu.test(s)))
        expect(satir).toMatch(
          /asla|isteme|yazmayın|önerme|kullanma|kendiniz yazın|kendisi yalnız|değiştir|yalnız OBS|sizindir|sen girme/iu,
        );
    }
    expect(GIRIS_BILGISI_KURALI).toMatch(/asla isteme/u);
    expect(GIRIS_BILGISI_KURALI).toMatch(/CAPTCHA'yı sen çözmezsin/u);
    expect(GIRIS_BILGISI_KURALI).toMatch(/Kaydet düğmesine yalnız hocanın açık izniyle basarsın/u);
    expect(GIRIS_BILGISI_KURALI).toMatch(/Gönder düğmesine hiç basmazsın/u);
  });

  it("parola, doğrulama kodu ya da çerez içeren girdi reddedilir ve değer yanıta girmez", () => {
    for (const metin of [
      "OBS parola: Gizli.Parola-123",
      "Şifre=Gizli.Parola-123",
      "SMS doğrulama kodu 482913",
      "Cookie: JSESSIONID=GIZLIOTURUM12345",
      "Bağlantı: /obs?PHPSESSID=GIZLIOTURUM12345",
    ]) {
      const r = calistir("rapor_dil_denetle", { metin });
      expect(r.hata).toBe(true);
      expect(r.veri.kod).toBe("giris_bilgisi");
      expect(JSON.stringify(r.veri)).not.toMatch(/Gizli|482913|GIZLIOTURUM/u);
    }
    // Sıradan metindeki "parola" sözcüğü engellenmez.
    expect(calistir("rapor_dil_denetle", { metin: "Parola politikası güncellendi." }).hata).toBe(false);
  });

  it("sunucu talimatı giriş bilgisini yasaklar ve akredit'i gösterir", async () => {
    const c = await baglan();
    const talimat = c.getInstructions() ?? "";
    expect(talimat).toMatch(/parola, doğrulama kodu ya da çerez asla isteme/u);
    expect(talimat).toMatch(/'akredit'/u);
    expect(c.getServerVersion()?.version).toBe(SUNUCU_SURUMU);
    expect(SUNUCU_SURUMU).toBe("0.5.1");
    await c.close();
  });
});

// ---------------------------------------------------------------- Uçtan uca tam tur

const tekrar = (cumle: string, kez: number) => Array.from({ length: kez }, () => cumle).join(" ");
// 11 kelime x 6 = 66 (60-120).
const AMAC_TR = tekrar(
  "Bu ders kurgu ölçme yöntemlerini tanıtır ve temel çözümleme becerisi kazandırmayı hedefler.",
  6,
);
const AMAC_EN = tekrar(
  "This course introduces fiction measurement methods and builds basic analysis skills for students.",
  6,
);
// 13 kelime x 10 = 130 (120-250).
const ICERIK_TR = tekrar(
  "Ders kurgu ölçmenin temel kavramları, gösterge türleri, veri toplama ve raporlama konularını kapsar.",
  10,
);
const ICERIK_EN = tekrar(
  "The course covers basic concepts of fiction measurement, indicator types, data collection and reporting.",
  10,
);
// 9 kelime x 5 = 45 (40-90).
const YONTEM_TR = tekrar("Ders anlatım, tartışma, uygulama ve küçük proje çalışmasıyla yürütülür.", 5);
const YONTEM_EN = tekrar("The course runs with lectures, discussion, practice and small projects.", 5);

const CIKTILAR = [
  ["Kurgu ölçme kavramlarını örneklerle açıklar.", "Explains fiction measurement concepts.", "Bilgi"],
  ["Kurgu göstergelerini türlerine göre sınıflandırır.", "Classifies fiction indicators.", "Bilgi"],
  ["Kurgu verisinden temel göstergeleri hesaplar.", "Calculates basic indicators.", "Beceri"],
  ["Ölçme yöntemini örnek veriye uygular.", "Applies a measurement method.", "Beceri"],
  ["İki ölçme yaklaşımını karşılaştırır.", "Compares two measurement approaches.", "Beceri"],
  ["Ölçme sorunlarını uygun yöntemle çözer.", "Solves measurement problems.", "Beceri"],
  ["Ölçme sonuçlarını gerekçeleriyle değerlendirir.", "Evaluates measurement results.", "Beceri"],
  ["Ekip içinde küçük bir ölçme projesi tasarlar.", "Designs a small measurement project.", "Yetkinlik"],
].map(([tr, en, tur], i) => ({ kod: `Ö${i + 1}`, tr, en, tur }));

const HAFTALAR = Array.from({ length: 14 }, (_, i) => {
  const n = i + 1;
  const tr =
    n === 8
      ? "Ara sınav haftası: ilk yedi haftanın konularının genel tekrarı ve sınav"
      : n === 14
        ? "Yarıyıl sonu sınavı haftası: bütün konuların genel tekrarı ve değerlendirme"
        : `${n}. hafta konusu: kurgu ölçme yönteminin temel kavramları ve örnek uygulamaları`;
  return {
    hafta: n,
    konu: { tr, en: `Week ${n}: fiction measurement concepts and sample applications` },
    onHazirlik: "Ders notunun ilgili bölümünü okuma",
    dokuman: "Haftalık ders sunumu",
  };
});

describe("uçtan uca Bologna turu (SDK istemcisi): ayrıştır, eksik, hepsi 1, tamamlandı", () => {
  it("ÜBYS benzeri sayfadan başlayıp bütün zorunlu alanlar tamamlanınca tamamlandı der", async () => {
    const c = await baglan();
    const istem = await c.getPrompt({ name: "akredit", arguments: { odak: "1" } });
    const im = String((istem.messages[0]?.content as { text?: string } | undefined)?.text ?? "");
    expect(im).toContain("Adım 0. OBS'ye giriş");
    expect(im).toContain("bologna_durum");

    // 1. Ayrıştır.
    const ay = veri(await c.callTool({ name: "bologna_ayristir", arguments: { html: UBYS_HTML } }));
    expect(ay.sonuc.bicim).toBe("genel");
    const girdi = ay.sonuc.bolognaDenetleGirdisi;
    const sayfaKunyesi: string[] = girdi.ders.kaynaklar;

    // 2. Eksik listesi.
    const den = veri(await c.callTool({ name: "bologna_denetle", arguments: girdi }));
    const durum = Object.fromEntries(den.sonuc.alanlar.map((a: { alan: string; durum: string }) => [a.alan, a.durum]));
    expect(durum).toMatchObject({
      amac: "bilinmiyor",
      icerik: "zayif",
      ciktilar: "zayif",
      haftalar: "zayif",
      kaynaklar: "zayif",
    });
    expect(den.sonuc.kalanAlanSayisi).toBeGreaterThan(4);

    const ders = { kod: "KRG204", ad: "Kurgu Ölçme Yöntemleri", akts: 5, tul: "2+1+0" };
    const durumu = async (alanlar: Record<string, unknown>) =>
      veri(await c.callTool({ name: "bologna_durum", arguments: { ders, alanlar } })).sonuc;

    // Başlangıçta yalnız sayfadaki tek künye: 9 zorunlu alanın 9'u kalır (kaynak 1 tane, en az 2 gerek).
    const ilk = await durumu({ kaynaklar: sayfaKunyesi });
    expect(ilk.kalanAlanSayisi).toBe(9);
    expect(ilk.bicimDenetimi).toBe("geçmedi");
    // Sayfadaki künye düz metindir: doğrulanmamış sayılır.
    expect(JSON.stringify(ilk.alanlar)).toMatch(/doğrulanmamış kaynak yazılamaz/u);

    // 3. Asistan seçenek 1'leri yazar, sunucu denetler (hoca "hepsi 1" dedi).
    const amacDenetimi = veri(
      await c.callTool({
        name: "bologna_taslak_denetle",
        arguments: {
          ders,
          secenekler: [
            { etiket: "1", alanlar: { amac: { tr: AMAC_TR, en: AMAC_EN } } },
            { etiket: "2", alanlar: { amac: { tr: "Kısa amaç.", en: "Short aim." } } },
          ],
        },
      }),
    );
    expect(amacDenetimi.sonuc.bicimdenGecenler).toEqual(["1"]);
    expect(amacDenetimi.sonuc.secenekler[0]).toMatchObject({ bicimDenetimi: "geçti", icerikTeyidi: "hoca" });

    const degerlendirme = [
      { ad: "Ara Sınav", sayi: 1, katki: 30 },
      { ad: "Proje", sayi: 1, katki: 20 },
      { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 50 },
    ];
    const isyuku = veri(await c.callTool({ name: "is_yuku_oner", arguments: { akts: 5, tul: "2+1+0", degerlendirme } }))
      .sonuc.secenekler[0].isyuku;
    const kunyeler = veri(
      await c.callTool({
        name: "kaynak_bicimle",
        arguments: {
          kaynaklar: [
            {
              tur: "kitap",
              yazarlar: ["Deneme, Can"],
              yil: 2023,
              baslik: "Kurgu ölçme el kitabı",
              yayinevi: "Kurgu Yayınları",
            },
          ],
        },
      }),
    ).sonuc.kunyeler.map((k: { kunye: string }) => k.kunye);

    const hepsi1: Record<string, unknown> = {
      amac: { tr: AMAC_TR, en: AMAC_EN },
      icerik: { tr: ICERIK_TR, en: ICERIK_EN },
      yontem: { tr: YONTEM_TR, en: YONTEM_EN },
      notlar: { tr: "Haftalık ders sunumları ve uygulama föyleri.", en: "Weekly slides and practice sheets." },
      ciktilar: CIKTILAR,
      degerlendirme,
      isyuku,
      haftalar: HAFTALAR,
      // Hoca sayfadaki ve verdiği eseri kullandığını söyledi; katalogda aranmadılar: hoca beyanı.
      kaynaklar: [...sayfaKunyesi, ...kunyeler].map((kunye) => ({ kunye, dogrulama: "hoca_beyani" })),
    };

    // 4. Her seçimden sonra kalan alan sayısı azalır.
    const sira = ["amac", "icerik", "yontem", "notlar", "ciktilar", "degerlendirme", "isyuku", "haftalar", "kaynaklar"];
    // Değerlendirme yüzdelerini hoca söyledi (teyit sorusuna yanıt).
    let secilen: Record<string, unknown> = { kaynaklar: sayfaKunyesi, degerlendirmeDayanagi: "hoca" };
    let onceki = ilk.kalanAlanSayisi as number;
    for (const alan of sira) {
      secilen = { ...secilen, [alan]: hepsi1[alan] };
      const d = await durumu(secilen);
      expect(d.kalanAlanSayisi).toBe(onceki - 1);
      onceki = d.kalanAlanSayisi;
    }
    const son = await durumu(secilen);
    expect(son.bicimDenetimi).toBe("geçti");
    expect(son.icerikTeyidi).toBe("hoca");
    expect(son.ozet).toMatch(/^Biçim denetiminden geçti; içerik teyidi: hoca/u);
    expect(son.hesap.isyuku.toplam).toBe(150);
    expect(son.hesap.degerlendirmeToplami).toBe(100);

    // 5. OBS'ye yazma yedeği: kopya metni eksiksiz.
    const km = veri(await c.callTool({ name: "bologna_kopya_metni", arguments: { ders, alanlar: secilen } }));
    expect(km.sonuc.kalanEksikler).toEqual([]);
    expect(km.sonuc.metin).toContain("Diğer Kaynaklar > Kaynaklar");
    expect(km.sonuc.metin).toContain("Deneme, C. (2023). Kurgu ölçme el kitabı. Kurgu Yayınları.");
    expect(km.sonuc.metin).not.toMatch(/—|\*\*/u);
    expect(km.sonuc.yazilamayan).toEqual([]);

    // 6. Kayıttan sonra geri okuma: aynı sayfa eşleşir; başka dersin sayfası yazmayı durdurur.
    const g = km.sonuc.obsKarsilastirGirdisi;
    const sayfa = `KRG204 Kurgu Ölçme Yöntemleri\n${km.sonuc.metin}`;
    const kar = veri(await c.callTool({ name: "obs_karsilastir", arguments: { ...g, geriOkunan: { metin: sayfa } } }));
    expect(kar.sonuc.dur).toBe(false);
    expect(kar.sonuc.farkli).toBe(0);
    const baska = veri(
      await c.callTool({
        name: "obs_karsilastir",
        arguments: { ...g, geriOkunan: { metin: sayfa.replaceAll("KRG204", "KRG999"), dersKodu: "KRG999" } },
      }),
    );
    expect(baska.sonuc.dur).toBe(true);
    expect(baska.sonuc.nedenler.join(" ")).toMatch(/ders kodu \(KRG999\) beklenenden \(KRG204\) farklı/u);
    await c.close();
  });
});
