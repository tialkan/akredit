// OBS not aktarımı. Bütün ad ve numaralar uydurmadır.

import { createHmac } from "node:crypto";
import type { TabloVerisi } from "@akredit/belge";
import { describe, expect, it } from "vitest";
import { baslikTespit, notAktar } from "../src/not-aktarimi/aktar.ts";
import { type NotAktarimProfili, profilOku, sutunHarfi, sutunSirasi } from "../src/not-aktarimi/profil.ts";

// Testte sabit anahtarla HMAC; gerçek anahtar çağıranın işidir.
const takmaAd = (no: string) => createHmac("sha256", "test-anahtari").update(no).digest("hex").slice(0, 16);

const KISISEL = [
  "99000001",
  "99000002",
  "99000003",
  "99000004",
  "Deneme Kişi",
  "Örnek Kurgu",
  "Sahte Ad",
  "Hayali Soyad",
];

/** Çıktının JSON metninde hiçbir öğrenci numarası ya da adı geçmez. */
function kisiselVeriYok(sonuc: unknown) {
  const metin = JSON.stringify(sonuc);
  for (const k of KISISEL) expect(metin, `çıktıda "${k}" var`).not.toContain(k);
}

// Biçim 1: Excel benzeri; başlık 3. satırda, ayrı "Tam Puan" satırı, sayısal hücreler.
const excel: TabloVerisi = {
  sayfalar: [
    {
      ad: "Ara Sınav",
      satirlar: [
        ["KURGU ÜNİVERSİTESİ", null, null, null, null, null],
        ["KRG101 Ara Sınav Soru Bazlı Notlar", null, null, null, null, null],
        ["Öğrenci No", "Adı Soyadı", "S1", "S2", "S3", "Toplam"],
        [null, "Tam Puan", 30, 30, 40, 100],
        [99000001, "Deneme Kişi", 25, 30, 35, 90],
        [99000002, "Örnek Kurgu", 10, 15.5, 20, 45.5],
        [99000003, "Sahte Ad", 0, 0, 0, 0],
      ],
    },
  ],
};

// Biçim 2: noktalı virgüllü, ondalık virgüllü CSV'den gelen metin hücreler; tam puan başlıkta "S1/10".
const csv: TabloVerisi = {
  sayfalar: [
    {
      ad: "notlar.csv",
      satirlar: [
        ["Numara", "Ad Soyad", "1. Soru/10", "2. Soru/10", "3a/5", "3b/5", "Harf Notu"],
        ["99000001", "Deneme Kişi", "7,5", "10", "2,5", "5", "BB"],
        ["99000002", "Örnek Kurgu", "4", "6,25", "", "1", "DD"],
        [" 99000003 ", "Sahte Ad", "0", "0", "0", "0", "FF"],
      ],
    },
  ],
};

// Biçim 3: "Soru 1 (20)" başlıkları ve GR değeri.
const grli: TabloVerisi = {
  sayfalar: [
    {
      ad: "Final",
      satirlar: [
        ["Öğr. No", "Ad Soyad", "Soru 1 (20)", "Soru 2 (30)", "Soru 3 (50)", "Toplam", "Harf"],
        ["99000001", "Deneme Kişi", 20, 25, 40, 85, "BA"],
        ["99000002", "Örnek Kurgu", "GR", "GR", "GR", "GR", "GR"],
        ["99000003", "Sahte Ad", 10, 10, 10, 30, "FF"],
      ],
    },
  ],
};

const puan = (s: ReturnType<typeof notAktar>, no: string, soru: string) =>
  s.puanlar.find((p) => p.ogrenci === takmaAd(no) && p.soruNo === soru)?.puan;

describe("üç biçim", () => {
  it("Excel benzeri: başlık 3. satırda, tam puan satırı", () => {
    const s = notAktar(excel, { takmaAd, aracId: "ara1", tur: "ara_sinav" });
    expect(s.bulgular).toEqual([]);
    expect(s.arac).toEqual({
      id: "ara1",
      ad: "Ara Sınav",
      tur: "ara_sinav",
      sorular: [
        { no: "1", tamPuan: 30 },
        { no: "2", tamPuan: 30 },
        { no: "3", tamPuan: 40 },
      ],
    });
    // 3 öğrenci × 3 soru
    expect(s.puanlar).toHaveLength(9);
    expect(puan(s, "99000002", "2")).toBe(15.5);
    expect(s.puanlar[0]).toEqual({ ogrenci: takmaAd("99000001"), aracId: "ara1", soruNo: "1", puan: 25 });
    expect(s.profil).toMatchObject({
      baslikSatiri: 3,
      ogrenciNoSutunu: "A",
      adSutunu: "B",
      toplamSutunu: "F",
      tamPuanSatiri: 4,
    });
    kisiselVeriYok({ ...s, profil: s.profil });
  });

  it("CSV: metin hücreler, ondalık virgül, başlıkta tam puan, boş hücre", () => {
    const s = notAktar(csv, { takmaAd });
    expect(s.bulgular).toEqual([]);
    expect(s.arac.sorular).toEqual([
      { no: "1", tamPuan: 10 },
      { no: "2", tamPuan: 10 },
      { no: "3a", tamPuan: 5 },
      { no: "3b", tamPuan: 5 },
    ]);
    expect(puan(s, "99000001", "1")).toBe(7.5);
    expect(puan(s, "99000002", "2")).toBe(6.25);
    expect(puan(s, "99000002", "3a")).toBeNull();
    // Baştaki ve sondaki boşluk numaradan atılır; takma ad aynı çıkar.
    expect(puan(s, "99000003", "3b")).toBe(0);
    expect(s.profil?.harfSutunu).toBe("G");
    kisiselVeriYok(s);
  });

  it("'Soru 1 (20)' başlıkları ve GR: devamsızın bütün puanları boş", () => {
    const s = notAktar(grli, { takmaAd, tur: "yariyil_sonu" });
    expect(s.bulgular).toEqual([]);
    expect(s.arac.sorular.map((x) => x.tamPuan)).toEqual([20, 30, 50]);
    expect(s.puanlar.filter((p) => p.ogrenci === takmaAd("99000002")).map((p) => p.puan)).toEqual([null, null, null]);
    expect(puan(s, "99000001", "3")).toBe(40);
    kisiselVeriYok(s);
  });

  it("parametreyle verilen tam puan başlıktakinden önce gelir", () => {
    const s = notAktar(grli, { takmaAd, tamPuanlar: { "1": 25 } });
    expect(s.arac.sorular[0]).toEqual({ no: "1", tamPuan: 25 });
  });

  it("tam puanı bilinmeyen soru null kalır", () => {
    const t: TabloVerisi = {
      sayfalar: [
        {
          ad: "x",
          satirlar: [
            ["Öğrenci No", "S1"],
            ["99000001", 4],
          ],
        },
      ],
    };
    const s = notAktar(t, { takmaAd });
    expect(s.arac.sorular).toEqual([{ no: "1", tamPuan: null }]);
    expect(s.puanlar[0]?.puan).toBe(4);
  });
});

describe("hatalı girdiler", () => {
  const hatali: TabloVerisi = {
    sayfalar: [
      {
        ad: "Sayfa1",
        satirlar: [
          ["Öğrenci No", "Adı Soyadı", "S1 (10)", "S2 (10)", "Toplam"],
          ["99000001", "Deneme Kişi", "on", 5, 5],
          ["99000002", "Örnek Kurgu", 12, 5, 17],
          ["99000003", "Sahte Ad", 4, 4, 9],
          ["99000001", "Deneme Kişi", 1, 1, 2],
          [null, "Hayali Soyad", 3, 3, 6],
          ["99000004", "Hayali Soyad", -1, 2, 1],
          [],
        ],
      },
    ],
  };

  it("her hata adresiyle bulgu olur, süreç çökmez", () => {
    const s = notAktar(hatali, { takmaAd });
    const kural = (k: string) => s.bulgular.filter((b) => b.kural === k);
    expect(kural("sayi-degil")[0]).toMatchObject({ duzey: "hata", konu: "Sayfa1!C2" });
    expect(kural("sayi-degil")[0]?.aciklama).toMatch(/Sayfa1!C2: hücre sayı değil/);
    expect(kural("puan-tam-puani-asiyor")[0]).toMatchObject({ konu: "Sayfa1!C3" });
    expect(kural("puan-tam-puani-asiyor")[0]?.aciklama).toMatch(/puan 12, 1\. sorunun tam puanı 10/);
    // 4 + 4 = 8, dökümde 9.
    expect(kural("toplam-tutarsiz")[0]).toMatchObject({ duzey: "uyari", konu: "Sayfa1!E4" });
    expect(kural("toplam-tutarsiz")[0]?.aciklama).toMatch(/toplam 9, soru puanlarının toplamı 8/);
    expect(kural("ogrenci-yinelenen")[0]?.aciklama).toBe(
      "5. satırdaki öğrenci 2. satırda da var; ikinci satır alınmadı.",
    );
    expect(kural("ogrenci-no-yok")[0]).toMatchObject({ konu: "Sayfa1!A6" });
    expect(kural("puan-negatif")[0]).toMatchObject({ konu: "Sayfa1!C7" });
    // Hatalı hücrenin puanı boş, aynı satırın geçerli puanları alınır; yinelenen ve numarasız satır alınmaz.
    expect(puan(s, "99000001", "1")).toBeNull();
    expect(puan(s, "99000001", "2")).toBe(5);
    expect(puan(s, "99000002", "1")).toBeNull();
    expect(s.puanlar).toHaveLength(8);
    kisiselVeriYok(s);
  });

  it("başlık bulunamazsa bulgu döner", () => {
    const s = notAktar(
      {
        sayfalar: [
          {
            ad: "Boş",
            satirlar: [
              ["a", "b"],
              [1, 2],
            ],
          },
        ],
      },
      { takmaAd },
    );
    expect(s.profil).toBeNull();
    expect(s.puanlar).toEqual([]);
    expect(s.bulgular[0]).toMatchObject({ duzey: "hata", kural: "baslik-yok" });
  });

  it("başlık 15. satırdan sonraysa bulunmaz", () => {
    const satirlar = [...Array.from({ length: 15 }, () => ["açıklama"]), ["Öğrenci No", "S1"], ["99000001", 1]];
    expect(baslikTespit(satirlar)).toBeNull();
    expect(baslikTespit(satirlar.slice(1))?.baslikSatiri).toBe(15);
  });

  it("sayfa yoksa bulgu döner", () => {
    expect(notAktar({ sayfalar: [] }, { takmaAd }).bulgular[0]?.kural).toBe("sayfa-yok");
  });

  it("aynı soru iki sütunda geçerse bulgu", () => {
    const s = notAktar(
      {
        sayfalar: [
          {
            ad: "x",
            satirlar: [
              ["Numara", "S1", "Soru 1"],
              ["99000001", 1, 1],
            ],
          },
        ],
      },
      { takmaAd },
    );
    expect(s.bulgular.some((b) => b.kural === "soru-yinelenen")).toBe(true);
  });
});

describe("eşleme profili", () => {
  // Başlığı tanınmayan döküm: sütun adları kuruma özgü.
  const ozel: TabloVerisi = {
    sayfalar: [
      { ad: "Diğer", satirlar: [] },
      {
        ad: "Döküm",
        satirlar: [
          ["Kimlik", "İsim", "Madde A", "Madde B", "Puan Toplamı"],
          ["99000001", "Deneme Kişi", 3, 4, 7],
          ["99000002", "Örnek Kurgu", 2, 2, 5],
        ],
      },
    ],
  };
  const profil: NotAktarimProfili = profilOku(
    JSON.parse(
      '{"surum":1,"sayfa":"Döküm","baslikSatiri":1,"ogrenciNoSutunu":"A","adSutunu":"B","sorular":[{"sutun":"C","no":"A","tamPuan":5},{"sutun":"D","no":"B","tamPuan":5}],"toplamSutunu":"E"}',
    ),
  );

  it("tespit edilemeyen döküm kayıtlı profille okunur", () => {
    expect(notAktar(ozel, { takmaAd }).bulgular[0]?.kural).toBe("baslik-yok");
    const s = notAktar(ozel, { takmaAd, profil });
    expect(s.puanlar.map((p) => p.puan)).toEqual([3, 4, 2, 2]);
    // 2 + 2 = 4, dökümde 5.
    expect(s.bulgular.map((b) => b.kural)).toEqual(["toplam-tutarsiz"]);
    expect(s.profil).toBe(profil);
    kisiselVeriYok(s);
  });

  it("geçersiz profil Türkçe iletiyle reddedilir", () => {
    expect(() =>
      profilOku({ surum: 1, baslikSatiri: 0, ogrenciNoSutunu: "A", sorular: [{ sutun: "C", no: "1" }] }),
    ).toThrow(/eşlemesi geçersiz \(baslikSatiri\)/);
    expect(() =>
      profilOku({ surum: 1, baslikSatiri: 1, ogrenciNoSutunu: "a1", sorular: [{ sutun: "C", no: "1" }] }),
    ).toThrow(/Sütun harfle/);
  });

  it("tespit edilen profil JSON'a yazılıp geri okunabilir", () => {
    const s = notAktar(excel, { takmaAd });
    expect(profilOku(JSON.parse(JSON.stringify(s.profil)))).toEqual(s.profil);
  });

  it("sütun harfleri", () => {
    expect([0, 25, 26, 27, 701, 702].map(sutunHarfi)).toEqual(["A", "Z", "AA", "AB", "ZZ", "AAA"]);
    for (const i of [0, 25, 26, 701, 702]) expect(sutunSirasi(sutunHarfi(i))).toBe(i);
  });
});
