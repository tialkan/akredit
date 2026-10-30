// İP-47 tablo dönüştürücüsü: elle hesaplanmış sentetik program verisiyle sınanır.
// Ders kodları, adları ve sayılar uydurmadır.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  cerceveSemasi,
  FEDEK_4_1,
  type Hucre,
  ILK_CERCEVELER,
  kurulCiktilari,
  MUDEK_LISANS_3_1,
  PROGRAM_BELGELERI,
  PROGRAM_CERCEVELERI,
  type ProgramBolognaVerisi,
  type ProgramTabloVerisiGirdisi,
  SABAK_R4,
  type Satir,
  sablonTablosu,
  TABLO_TANIMLARI,
  type TabloTanimi,
  tabloTanimiYukle,
  tabloUret,
  tulAyir,
} from "../src/index.ts";

const tanim = (kod: string): TabloTanimi => {
  const t = TABLO_TANIMLARI.find((x) => x.kod === kod);
  if (!t) throw new Error(kod);
  return t;
};

const BOLOGNA: ProgramBolognaVerisi = {
  adres: "https://obs.ornek.edu.tr/bologna",
  okundu: "2026-10-30T09:00:00Z",
  programCiktilari: [
    { kod: "P1", metin: "Mühendislik bilgisini uygular." },
    { kod: "P2", metin: "Takım içinde çalışır." },
  ],
  matris: {
    pkodlar: ["P1", "P2"],
    dersler: [
      { kod: "MAT101", ad: "Matematik I", grupBasligi: false, degerler: { P1: "5", P2: "-" } },
      { kod: "FIZ101", ad: "Fizik I", grupBasligi: false, degerler: { P1: "4", P2: "" } },
      { kod: "[G] SEC", ad: "Seçmeli Grup", grupBasligi: true, degerler: {} },
    ],
  },
  dersler: [
    {
      kod: "MAT101",
      ad: "Matematik I",
      yariyil: 1,
      tul: "4+0+0",
      kredi: 4,
      akts: 6,
      zorunlu: true,
      bos: false,
      bilgiler: { "Dersin Dili": "Türkçe" },
    },
    {
      kod: "FIZ101",
      ad: "Fizik I",
      yariyil: 1,
      tul: "3+0+2",
      kredi: 4,
      akts: 5,
      zorunlu: true,
      bos: false,
      bilgiler: { "Dersin Dili": "Türkçe" },
    },
    {
      kod: "MUH201",
      ad: "Statik",
      yariyil: 3,
      tul: "3+1+0",
      kredi: 3,
      akts: 5,
      zorunlu: true,
      bos: false,
      bilgiler: {},
    },
  ],
};

const VERI: ProgramTabloVerisiGirdisi = {
  programAd: "Örnek Mühendisliği",
  bologna: BOLOGNA,
  dersKategorileri: { MAT101: "MTB", FIZ101: "MTB", MUH201: "MK" },
  pcKurulEslemesi: { P1: ["3.C1", "3.C2"], P2: ["3.C2"] },
  subeler: { MAT101: { subeSayisi: 2, enKalabalik: 85 } },
};

const veriSatirlari = (s: Satir[]) => s.filter((x) => x.tur === "veri").map((x) => (x.tur === "ara" ? [] : x.hucreler));
const metin = (h: Hucre | undefined) => (h?.tur === "deger" ? h.metin : h?.tur === "eksik" ? "EKSİK" : "");
const toplam = (s: Satir[]) => {
  const t = s.find((x) => x.tur === "toplam");
  return t && t.tur !== "ara" ? t.hucreler.map(metin) : [];
};

describe("çerçeveler", () => {
  it("altı program çerçevesi şemadan geçer, resmî ve uzman doğrulaması bekliyor", () => {
    expect(PROGRAM_CERCEVELERI.map((c) => `${c.kod}@${c.surum}`)).toEqual([
      "mudek-lisans@3.1",
      "mudek-yl@2.0",
      "fedek-lisans@4.1",
      "sabak-genel@R4",
      "epdad-ogretmen@1.1",
      "epdad-rpd@241216",
    ]);
    for (const c of PROGRAM_CERCEVELERI) {
      expect(cerceveSemasi.safeParse(c).success).toBe(true);
      expect(c.resmi && !c.dogrulandi && c.kaynak?.sha256).toBeTruthy();
    }
    // Panelde seçilebilmesi için ilk çerçeveler listesinde.
    for (const c of PROGRAM_CERCEVELERI) expect(ILK_CERCEVELER).toContain(c);
  });

  it("kurul çıktıları belgedeki sırayla okunur", () => {
    expect(kurulCiktilari(MUDEK_LISANS_3_1).map((k) => k.etiket)).toEqual([
      "Mühendislik Bilgisi",
      "Problem Analizi",
      "Mühendislik Tasarımı",
      "Teknik ve Araçların Kullanımı",
      "Araştırma ve İnceleme",
      "Mühendislik Uygulamalarının Küresel Etkisi",
      "Mühendislik Etiği",
      "Bireysel ve Takım Çalışması",
      "Sözlü ve Yazılı İletişim",
      "Proje Yönetimi",
      "Yaşam Boyu Öğrenme",
    ]);
    expect(kurulCiktilari(FEDEK_4_1).map((k) => k.etiket)).toEqual([
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
    ]);
    expect(kurulCiktilari(SABAK_R4)).toHaveLength(11);
  });

  it("kanıt gereksinimleri yalnız Akredit'in ürettiği kanıtları anar", () => {
    const k = MUDEK_LISANS_3_1.olcutler.flatMap((o) => o.altOlcutler).find((o) => o.kod === "3.2");
    expect(k?.kanitGereksinimleri.map((g) => g.uretenSurec)).toEqual(["olcme"]);
  });
});

describe("tablo tanımı yükleme", () => {
  const ornek = TABLO_TANIMLARI[0];
  it("resmî belge özeti saklanmadan tablo tanımı yüklenemez", () => {
    expect(() => tabloTanimiYukle({ ...ornek, kaynak: { ...PROGRAM_BELGELERI.mudekOdr31, sha256: null } })).toThrow(
      /SHA-256/u,
    );
    expect(() => tabloTanimiYukle({ ...ornek, kaynak: { ...PROGRAM_BELGELERI.mudekOdr31, dosya: null } })).toThrow();
    expect(tabloTanimiYukle(ornek).kod).toBe("mudek-lisans.5.1");
  });

  it("tanımlı olmayan kategori sütunu reddedilir", () => {
    const bozuk = {
      ...ornek,
      sutunlar: [{ kod: "x", baslik: "X", kaynak: "ders.kategori", kategori: "YOK" }],
    };
    expect(() => tabloTanimiYukle(bozuk)).toThrow(/YOK/u);
  });

  it("her tanımın çerçevesi kayıtlı; 12 tablo", () => {
    expect(TABLO_TANIMLARI).toHaveLength(12);
    for (const t of TABLO_TANIMLARI) expect(PROGRAM_CERCEVELERI.some((c) => c.kod === t.cerceveKod)).toBe(true);
  });
});

describe("MÜDEK Tablo 5.1 Lisans Eğitim Planı", () => {
  const u = tabloUret(tanim("mudek-lisans.5.1"), VERI);

  it("dersleri yarıyıl ve kod sırasıyla, kategoriyi Yerel-AKTS biçiminde yazar", () => {
    expect(u.basliklar).toEqual([
      "Ders Kodu",
      "Dersin Adı",
      "Öğretim Dili",
      "Matematik ve Temel Bilimler",
      "Mesleki Konular",
      "Genel Eğitim",
      "Diğer",
    ]);
    expect(u.satirlar.filter((s) => s.tur === "ara").map((s) => (s.tur === "ara" ? s.metin : ""))).toEqual([
      "1. Yarıyıl",
      "3. Yarıyıl",
    ]);
    // FIZ101: kredi 4, AKTS 5, kategori MTB → "4-5"; öteki kategoriler boş (bu ders o kategoride değil).
    // MUH201: Bologna'da dil yok → EKSİK; kategori MK → "3-5".
    expect(veriSatirlari(u.satirlar).map((r) => r.map(metin))).toEqual([
      ["FIZ101", "Fizik I", "Türkçe", "4-5", "", "", ""],
      ["MAT101", "Matematik I", "Türkçe", "4-6", "", "", ""],
      ["MUH201", "Statik", "EKSİK", "", "3-5", "", ""],
    ]);
  });

  it("toplamlar elle hesapla aynı", () => {
    // MTB: kredi 4 + 4 = 8, AKTS 5 + 6 = 11 → "8-11". MK: yalnız MUH201 → "3-5".
    // GE ve Diğer: bu kategoride ders yok, toplam 0 → "0-0".
    expect(toplam(u.satirlar)).toEqual(["Toplam", "", "", "8-11", "3-5", "0-0", "0-0"]);
    expect(u.eksikSayisi).toBe(1);
  });

  it("seçmeli ders varsa ve yer sayısı girilmediyse toplam EKSİK çıkar", () => {
    const secmeli = structuredClone(BOLOGNA);
    const d = secmeli.dersler[2];
    if (d && "zorunlu" in d) d.zorunlu = false;
    const t = tabloUret(tanim("mudek-lisans.5.1"), { ...VERI, bologna: secmeli });
    expect(toplam(t.satirlar).slice(3)).toEqual(["EKSİK", "EKSİK", "EKSİK", "EKSİK"]);
  });

  it("seçmeli dersler kurumun girdiği yer sayısı kadar sayılır", () => {
    // MUH201 (3. yarıyıl, MK, kredi 3, AKTS 5) ve uydurma MUH203 (3. yarıyıl, MK, kredi 3, AKTS 5) seçmeli.
    // 3. yarıyılda 2 seçmeli yer: MK = 2 x "3-5" = "6-10". MTB zorunlu derslerden: "8-11".
    // GE ve Diğer: seçmeliler bu kategoride değil, katkı 0 → "0-0".
    const secmeli = structuredClone(BOLOGNA);
    const d = secmeli.dersler[2];
    if (d && "zorunlu" in d) d.zorunlu = false;
    secmeli.dersler.push({
      kod: "MUH203",
      ad: "Malzeme",
      yariyil: 3,
      tul: "3+0+0",
      kredi: 3,
      akts: 5,
      zorunlu: false,
      bos: false,
      bilgiler: { "Dersin Dili": "Türkçe" },
    });
    const v = {
      ...VERI,
      bologna: secmeli,
      dersKategorileri: { ...VERI.dersKategorileri, MUH203: "MK" },
      secmeliYerSayilari: { "3": 2 },
    };
    const t = tabloUret(tanim("mudek-lisans.5.1"), v);
    expect(toplam(t.satirlar).slice(3)).toEqual(["8-11", "6-10", "0-0", "0-0"]);
    // Yer sayısı 0: seçmeliler sayılmaz; MK'de zorunlu ders de yok → "0-0".
    const sifir = tabloUret(tanim("mudek-lisans.5.1"), { ...v, secmeliYerSayilari: { "3": 0 } });
    expect(toplam(sifir.satirlar).slice(3)).toEqual(["8-11", "0-0", "0-0", "0-0"]);
    // Aynı yarıyılın seçmelileri farklı kategorideyse hangisinin sayılacağı bilinmez: MK ve GE EKSİK.
    const karisik = tabloUret(tanim("mudek-lisans.5.1"), {
      ...v,
      dersKategorileri: { ...v.dersKategorileri, MUH203: "GE" },
    });
    expect(toplam(karisik.satirlar).slice(3)).toEqual(["8-11", "EKSİK", "EKSİK", "0-0"]);
    // SABAK Tablo 1 AKTS sütunu: zorunlu 6 + 5 = 11, seçmeli 2 x 5 = 10 → 21.
    const sabak = tabloUret(tanim("sabak-genel.odr-1"), v);
    expect(toplam(sabak.satirlar)).toContain("21");
  });

  it("kategori eşlemesi olmayan ders EKSİK çıkar, sıfır ya da boş yazılmaz", () => {
    const t = tabloUret(tanim("mudek-lisans.5.1"), { ...VERI, dersKategorileri: { MAT101: "MTB" } });
    const fiz = veriSatirlari(t.satirlar)[0] ?? [];
    expect(fiz.slice(3).map(metin)).toEqual(["EKSİK", "EKSİK", "EKSİK", "EKSİK"]);
    // MTB sütununda FIZ101 eksik olduğu için toplam da eksik.
    expect(toplam(t.satirlar)[3]).toBe("EKSİK");
  });

  it("okunamayan ders sayfası: kod yazılır, öteki hücreler EKSİK", () => {
    const b = structuredClone(BOLOGNA);
    b.dersler.push({ kod: "TAR101", hata: "Sayfa açılmadı" });
    const t = tabloUret(tanim("mudek-lisans.5.1"), { ...VERI, bologna: b });
    const son = veriSatirlari(t.satirlar).at(-1) ?? [];
    expect(son.map(metin)).toEqual(["TAR101", "EKSİK", "EKSİK", "EKSİK", "EKSİK", "EKSİK", "EKSİK"]);
    expect(t.satirlar.some((s) => s.tur === "ara" && s.metin === "Yarıyılı belirtilmemiş dersler")).toBe(true);
  });
});

describe("Ders ve sınıf büyüklükleri (MÜDEK 5.2, FEDEK 4.4)", () => {
  it("kaynağı olmayan sütun EKSİK çıkar, boş ya da sıfır değil", () => {
    const u = tabloUret(tanim("mudek-lisans.5.2"), VERI);
    const satirlar = veriSatirlari(u.satirlar);
    // "Diğer" sütununun Akredit'te kaynağı yok: her satırda EKSİK.
    for (const r of satirlar) {
      expect(r[7]?.tur).toBe("eksik");
      expect(metin(r[7])).not.toBe("");
      expect(metin(r[7])).not.toBe("0");
    }
    // FIZ101 "3+0+2" → teorik 3, uygulama 0, laboratuvar 2; şube bilgisi yok → EKSİK.
    expect(satirlar[0]?.map(metin)).toEqual(["FIZ101", "Fizik I", "EKSİK", "EKSİK", "3", "0", "2", "EKSİK"]);
    // MAT101 şube: 2 şube, en kalabalık 85 öğrenci (öğrenci bilgi sistemi aktarımı).
    expect(satirlar[1]?.slice(2, 4).map(metin)).toEqual(["2", "85"]);
  });

  it("FEDEK 4.4 AKTS toplamı elle hesapla aynı", () => {
    const u = tabloUret(tanim("fedek-lisans.4.4"), VERI);
    // 5 (FIZ101) + 6 (MAT101) + 5 (MUH201) = 16; öteki sütunlar toplanmaz.
    expect(toplam(u.satirlar)).toEqual(["Toplam", "", "", "", "", "", "", "", "16"]);
  });
});

describe("SABAK ÖDR Tablo 1 Eğitim planı", () => {
  it("Lab/Uyg, Z/S ve ders türünü yazar", () => {
    const u = tabloUret(tanim("sabak-genel.odr-1"), {
      ...VERI,
      dersKategorileri: { MAT101: "T", FIZ101: "T", MUH201: "M" },
    });
    // FIZ101 "3+0+2": Lab/Uyg = 0 + 2 = 2. MUH201 "3+1+0": Lab/Uyg = 1 + 0 = 1.
    expect(veriSatirlari(u.satirlar).map((r) => r.map(metin))).toEqual([
      ["Fizik I", "3", "2", "5", "Z", "T"],
      ["Matematik I", "4", "0", "6", "Z", "T"],
      ["Statik", "3", "1", "5", "Z", "M"],
    ]);
    // AKTS toplamı 5 + 6 + 5 = 16. İlk sütun "Toplam" etiketidir.
    expect(toplam(u.satirlar)).toEqual(["Toplam", "", "", "16", "", ""]);
  });

  it("geçersiz ders türü EKSİK çıkar", () => {
    const u = tabloUret(tanim("sabak-genel.odr-1"), { ...VERI, dersKategorileri: { MAT101: "X" } });
    expect(veriSatirlari(u.satirlar).map((r) => metin(r[5]))).toEqual(["EKSİK", "EKSİK", "EKSİK"]);
  });
});

describe("EPDAD EK I.1 Lisans Eğitim Programı", () => {
  it("kategori AKTS yazılır, toplam elle hesapla aynı", () => {
    const u = tabloUret(tanim("epdad-ogretmen.ek-1.1"), {
      ...VERI,
      dersKategorileri: { MAT101: "AB", FIZ101: "AB", MUH201: "OMB" },
    });
    expect(veriSatirlari(u.satirlar)[0]?.map(metin)).toEqual(["FIZ101", "Fizik I", "Türkçe", "", "", "5", ""]);
    // Genel Kültür 0; Öğretmenlik Meslek Bilgisi 5 (MUH201); Alan Bilgisi 5 + 6 = 11; Diğer 0.
    expect(toplam(u.satirlar)).toEqual(["Toplam", "", "", "0", "5", "11", "0"]);
  });
});

describe("matris tabloları", () => {
  it("ders × PÇ: Bologna matrisinden, boş hücre EKSİK, ilişkisiz '-'", () => {
    const u = tabloUret(tanim("mudek-lisans.5.1.2"), VERI);
    expect(u.basliklar).toEqual(["Ders Kodu", "Dersin Adı", "P1", "P2"]);
    expect(u.satirlar.map((s) => (s.tur === "ara" ? [`ara:${s.metin}`] : s.hucreler.map(metin)))).toEqual([
      ["MAT101", "Matematik I", "5", "-"],
      ["FIZ101", "Fizik I", "4", "EKSİK"],
      ["ara:Seçmeli Grup"],
    ]);
  });

  it("PÇ × MÜDEK Çıktısı: X işareti ve kapsayan PÇ sayısı", () => {
    const u = tabloUret(tanim("mudek-lisans.3.1.2"), VERI, MUDEK_LISANS_3_1);
    expect(u.basliklar).toHaveLength(2 + 11);
    const [p1, p2] = veriSatirlari(u.satirlar);
    expect(p1?.slice(2, 5).map(metin)).toEqual(["X", "X", ""]);
    expect(p2?.slice(2, 5).map(metin)).toEqual(["", "X", ""]);
    // Çıktı 1: yalnız P1 → 1; Çıktı 2: P1 ve P2 → 2; öteki dokuz çıktıyı kapsayan PÇ yok → 0.
    expect(toplam(u.satirlar).slice(2)).toEqual(["1", "2", "0", "0", "0", "0", "0", "0", "0", "0", "0"]);
  });

  it("eşlemesi girilmemiş PÇ satırı ve sayım EKSİK", () => {
    const u = tabloUret(tanim("mudek-lisans.3.1.2"), { ...VERI, pcKurulEslemesi: { P1: ["3.C1"] } }, MUDEK_LISANS_3_1);
    const p2 = veriSatirlari(u.satirlar)[1] ?? [];
    expect(p2.slice(2).every((h) => h.tur === "eksik")).toBe(true);
    expect(
      toplam(u.satirlar)
        .slice(2)
        .every((m) => m === "EKSİK"),
    ).toBe(true);
  });

  it("yanlış çerçeveyle PÇ × kurul tablosu üretilmez", () => {
    expect(() => tabloUret(tanim("mudek-lisans.3.1.2"), VERI, FEDEK_4_1)).toThrow(/mudek-lisans/u);
  });
});

describe("veri yokken ve belge şablonuna çeviri", () => {
  it("Bologna verisi yoksa tek satır, bütün hücreler EKSİK", () => {
    const u = tabloUret(tanim("fedek-lisans.4.1"), { programAd: "Örnek Fizik", bologna: null });
    expect(u.satirlar).toHaveLength(1);
    expect(u.eksikSayisi).toBe(u.basliklar.length);
    expect(u.notlar[0]).toMatch(/Bologna/u);
  });

  it("şablon girdisinde EKSİK null, boş hücre boş metin, sayı sayı olur", () => {
    const s = sablonTablosu(tabloUret(tanim("mudek-lisans.5.2"), VERI));
    expect(s.baslik).toBe("Tablo 5.2 Ders ve Sınıf Büyüklükleri");
    expect(s.aciklama[0]).toContain("mudek/mudek-ozdegerlendirme-raporu-3.1.docx");
    const fiz = s.satirlar.find((r) => "hucreler" in r);
    expect(fiz && "hucreler" in fiz ? fiz.hucreler : []).toEqual(["FIZ101", "Fizik I", null, null, 3, 0, 2, null]);
  });

  it("tulAyir: biçim tutmazsa null", () => {
    expect(tulAyir("2+1+0")).toEqual([2, 1, 0]);
    expect(tulAyir("2+1")).toBeNull();
    expect(tulAyir(undefined)).toBeNull();
  });
});

describe("modelsiz çalışır", () => {
  it("dönüştürücü yapay zekâ katmanını ve ağı kullanmaz, eşzamanlıdır", () => {
    const klasor = new URL("../src/program-tablolari/", import.meta.url);
    for (const ad of readdirSync(klasor)) {
      const kaynak = readFileSync(new URL(ad, klasor), "utf8");
      expect(kaynak, ad).not.toMatch(/@akredit\/yz|fetch\(|node:/u);
    }
    const u = tabloUret(tanim("fedek-lisans.4.4"), VERI);
    expect(u).not.toBeInstanceOf(Promise);
  });
});
