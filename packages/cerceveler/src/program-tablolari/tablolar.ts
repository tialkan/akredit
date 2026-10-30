// ÖDR tablo tanımları. Her tablo, kuruluşun resmî ÖDR şablonundaki bir tabloya karşılık gelir;
// başlık, sütun başlıkları ve dayanak cümlesi belgeden birebir alınır (test/program-tablolari-resmi.test.ts).
// Sütun başına veri kaynağı yazılır; kaynağı olmayan sütun (`kaynak: null`) üretimde EKSİK çıkar.

import { z } from "zod";
import { kaynakBelgeSemasi } from "../sema.ts";
import { PROGRAM_BELGELERI as B } from "./kaynaklar.ts";

/** Sütunun Akredit verisindeki karşılığı. */
export const SUTUN_KAYNAKLARI = [
  "ders.kod",
  "ders.ad",
  "ders.dil",
  "ders.teorik",
  "ders.uygulama",
  "ders.laboratuvar",
  "ders.uygulamaLab",
  "ders.akts",
  "ders.zorunluSecmeli",
  "ders.turu",
  "ders.kategori",
  "ders.subeSayisi",
  "ders.enKalabalikSube",
] as const;
export type SutunKaynagi = (typeof SUTUN_KAYNAKLARI)[number];

export const sutunSemasi = z
  .object({
    kod: z.string().min(1),
    /** Tabloda görünen başlık. */
    baslik: z.string().min(1),
    /** Belgede başlık farklı yazılmışsa (bölünmüş hücre, yazım) belgedeki biçimi; doğrulama bununla yapılır. */
    belgeMetni: z.string().min(1).optional(),
    kaynak: z.enum(SUTUN_KAYNAKLARI).nullable(),
    /** `ders.kategori` sütununda kategori kodu: dersin kurum onaylı kategorisi buysa kredi yazılır. */
    kategori: z.string().min(1).optional(),
    /** Kredi biçimi: yalnız AKTS ya da MÜDEK'teki gibi "yerel-AKTS". */
    bicim: z.enum(["akts", "yerel-akts"]).optional(),
    /** Toplam satırında toplanır mı? */
    toplanir: z.boolean().default(false),
  })
  .superRefine((s, ctx) => {
    if (s.kaynak === "ders.kategori" && !s.kategori)
      ctx.addIssue({ code: "custom", message: `${s.kod}: kategori sütununda kategori kodu yazılmalı.` });
  });
export type Sutun = z.infer<typeof sutunSemasi>;

/** Tablo tanımının dayandığı belge: yalnız indirilmiş ve özeti saklanmış resmî belge (ilke 6). */
const ozetliBelge = kaynakBelgeSemasi.refine((b) => b.sha256 !== null && b.dosya !== null, {
  message: "Tablo tanımı yalnız indirilmiş ve SHA-256 özeti saklanmış resmî belgeye dayanabilir.",
});

export const tabloTanimiSemasi = z
  .object({
    kod: z.string().regex(/^[a-z0-9.-]+$/u),
    cerceveKod: z.string().min(1),
    /** Tablo başlığı. "resmi" ise belgede birebir geçer; "ic" ise Akredit adıdır, dayanak cümlesi belgeden gelir. */
    baslik: z.string().min(1),
    baslikDurumu: z.enum(["resmi", "ic"]),
    kaynak: ozetliBelge,
    /** Belgedeki yeri: PDF'te fiziksel sayfa; Word şablonunda sayfa yoktur (null), bölüm yazılır. */
    sayfa: z.number().int().positive().nullable(),
    bolum: z.string().min(1),
    /** Tabloyu isteyen ya da tanımlayan cümle; belgede birebir geçer. */
    dayanak: z.string().min(1),
    /** Satır düzeni: ders listesi, ders × program çıktısı matrisi ya da program çıktısı × kurul çıktısı. */
    duzen: z.enum(["ders", "ders-pc", "pc-kurul"]),
    sutunlar: z.array(sutunSemasi),
    /** `ders.kategori` sütunlarında geçerli kategori kodları (kurumun ders eşlemesi bunlardan biri olmalı). */
    kategoriler: z.array(z.string().min(1)).default([]),
    /** `ders.turu` sütununda geçerli değerler (SABAK: T, G, M). */
    turler: z.array(z.string().min(1)).default([]),
    notlar: z.array(z.string().min(1)).default([]),
  })
  .superRefine((t, ctx) => {
    const kat = t.sutunlar.filter((s) => s.kaynak === "ders.kategori").map((s) => s.kategori);
    for (const k of kat)
      if (k && !t.kategoriler.includes(k))
        ctx.addIssue({ code: "custom", message: `${t.kod}: ${k} kategorisi tanımlı değil.` });
    if (t.duzen === "ders" && t.sutunlar.length === 0)
      ctx.addIssue({ code: "custom", message: `${t.kod}: ders tablosunda sütun olmalı.` });
  });
export type TabloTanimi = z.infer<typeof tabloTanimiSemasi>;
export type TabloTanimiGirdisi = z.input<typeof tabloTanimiSemasi>;

const S = (
  kod: string,
  baslik: string,
  kaynak: SutunKaynagi | null,
  ek: Partial<Pick<Sutun, "belgeMetni" | "kategori" | "bicim" | "toplanir">> = {},
): z.input<typeof sutunSemasi> => ({ kod, baslik, kaynak, ...ek });

const kategoriSutunu = (kod: string, baslik: string, bicim: "akts" | "yerel-akts", belgeMetni?: string) =>
  S(kod, baslik, "ders.kategori", { kategori: kod, bicim, toplanir: true, ...(belgeMetni ? { belgeMetni } : {}) });

const TANIM_GIRDILERI: TabloTanimiGirdisi[] = [
  {
    kod: "mudek-lisans.5.1",
    cerceveKod: "mudek-lisans",
    baslik: "Tablo 5.1 Lisans Eğitim Planı",
    baslikDurumu: "resmi",
    kaynak: B.mudekOdr31,
    sayfa: null,
    bolum: "Ölçüt 5, 5.1.1",
    dayanak: "Eğitim planını Tablo 5.1 ve Tablo 5.2’yi doldurarak veriniz.",
    duzen: "ders",
    kategoriler: ["MTB", "MK", "GE", "D"],
    sutunlar: [
      S("kod", "Ders Kodu", "ders.kod"),
      S("ad", "Dersin Adı", "ders.ad"),
      S("dil", "Öğretim Dili", "ders.dil"),
      kategoriSutunu("MTB", "Matematik ve Temel Bilimler", "yerel-akts"),
      kategoriSutunu("MK", "Mesleki Konular", "yerel-akts"),
      kategoriSutunu("GE", "Genel Eğitim", "yerel-akts"),
      kategoriSutunu("D", "Diğer", "yerel-akts"),
    ],
    notlar: [
      "Kategori hücreleri Yerel Kredi-AKTS Kredisi biçimindedir.",
      "Ders kategorisi kurumun onayladığı eşlemeden gelir; eşlemesi olmayan ders EKSİK çıkar.",
      "Önemli düzeyde tasarım içeren dersler için ( ) işareti Akredit verisinde yok; elle işaretlenir.",
    ],
  },
  {
    kod: "mudek-lisans.5.2",
    cerceveKod: "mudek-lisans",
    baslik: "Tablo 5.2 Ders ve Sınıf Büyüklükleri",
    baslikDurumu: "resmi",
    kaynak: B.mudekOdr31,
    sayfa: null,
    bolum: "Ölçüt 5, 5.1.1",
    dayanak: "Dersin Teorik ve Uygulama/Pratik/Laboratuvar saatlerini Tablo 5.2’de veriniz.",
    duzen: "ders",
    sutunlar: [
      S("kod", "Dersin Kodu", "ders.kod"),
      S("ad", "Dersin Adı", "ders.ad"),
      S("sube", "Son İki Yarıyılda Açılan Şube Sayısı", "ders.subeSayisi"),
      S("kalabalik", "En Kalabalık Şubedeki Öğrenci Sayısı", "ders.enKalabalikSube"),
      S("t", "Teorik Ders saati", "ders.teorik"),
      S("u", "Uygulama Saati", "ders.uygulama"),
      S("l", "Laboratuvar saati", "ders.laboratuvar"),
      S("diger", "Diğer", null),
    ],
    notlar: ["Şube bilgisi öğrenci bilgi sisteminden gelir; aktarılmamışsa EKSİK çıkar."],
  },
  {
    kod: "mudek-lisans.3.1.2",
    cerceveKod: "mudek-lisans",
    baslik: "Program çıktıları ile MÜDEK Çıktıları ilişkisi",
    baslikDurumu: "ic",
    kaynak: B.mudekOdr31,
    sayfa: null,
    bolum: "Ölçüt 3, 3.1.2",
    dayanak:
      "Eğer program çıktıları, MÜDEK Çıktılarından farklı bir biçimde tanımlanmışsa, çıktı bileşeni temelinde ayrıntılı bir çapraz ilişki tablosu kullanılmalıdır.",
    duzen: "pc-kurul",
    sutunlar: [],
    notlar: ["X: program çıktısı bu MÜDEK Çıktısını kapsıyor (kurumun onayladığı eşleme)."],
  },
  {
    kod: "mudek-lisans.5.1.2",
    cerceveKod: "mudek-lisans",
    baslik: "Derslerin program çıktılarına katkısı",
    baslikDurumu: "ic",
    kaynak: B.mudekOdr31,
    sayfa: null,
    bolum: "Ölçüt 5, 5.1.2",
    dayanak:
      "Burada, eğitim planında yer alan her dersin program çıktıları bileşenlerine katkılarını gösteren bir tablo kullanılması önerilir.",
    duzen: "ders-pc",
    sutunlar: [],
    notlar: ["Değerler Bologna ders-program çıktısı matrisinden alınır (1-5; - ilişkisiz)."],
  },
  {
    kod: "fedek-lisans.4.1",
    cerceveKod: "fedek-lisans",
    baslik: "Tablo 4.1 Lisans Öğretim Planı",
    baslikDurumu: "resmi",
    kaynak: B.fedekOdr31,
    sayfa: null,
    bolum: "Ölçüt 4",
    dayanak: "Tablo 4.1 Lisans Öğretim Planı",
    duzen: "ders",
    kategoriler: ["TO", "AO", "SAI", "SAD", "D"],
    sutunlar: [
      S("kod", "Ders Kodu", "ders.kod"),
      S("ad", "Ders adı", "ders.ad"),
      S("dil", "Öğretim Dili", "ders.dil"),
      kategoriSutunu("TO", "Alanına uygun temel öğretim", "akts"),
      kategoriSutunu("AO", "Alanına uygun öğretim", "akts"),
      kategoriSutunu("SAI", "Seçmeli Dersler (Alan içi)", "akts", "Alan içi"),
      kategoriSutunu("SAD", "Seçmeli Dersler (Alan dışı)", "akts", "Alan dışı"),
      kategoriSutunu("D", "Diğer", "akts"),
    ],
    notlar: [
      "Kategori hücreleri AKTS kredisidir.",
      "Ders kategorisi kurumun onayladığı eşlemeden gelir; eşlemesi olmayan ders EKSİK çıkar.",
    ],
  },
  {
    kod: "fedek-lisans.4.4",
    cerceveKod: "fedek-lisans",
    baslik: "Tablo 4.4 Ders ve Sınıf Büyüklükleri",
    baslikDurumu: "resmi",
    kaynak: B.fedekOdr31,
    sayfa: null,
    bolum: "Ölçüt 4",
    dayanak: "Tablo 4.4 Ders ve Sınıf Büyüklükleri",
    duzen: "ders",
    sutunlar: [
      S("kod", "Dersin kodu", "ders.kod"),
      S("ad", "Dersin adı", "ders.ad"),
      S("sube", "Son İki Yarıyılda Açılan Şube Sayısı", "ders.subeSayisi"),
      S("kalabalik", "En Kalabalık Şubedeki Öğrenci Sayısı", "ders.enKalabalikSube"),
      S("t", "Sınıf Dersi teorik", "ders.teorik", { belgeMetni: "Sınıf Dersiteorik" }),
      S("u", "Uygulama", "ders.uygulama"),
      S("l", "Laboratuvar", "ders.laboratuvar"),
      S("diger", "Diğer", null),
      S("akts", "AKTS", "ders.akts", { bicim: "akts", toplanir: true }),
    ],
    notlar: ["Şube bilgisi öğrenci bilgi sisteminden gelir; aktarılmamışsa EKSİK çıkar."],
  },
  {
    kod: "fedek-lisans.3.1",
    cerceveKod: "fedek-lisans",
    baslik: "Program çıktıları ile FEDEK Çıktıları ilişkisi",
    baslikDurumu: "ic",
    kaynak: B.fedekOdr31,
    sayfa: null,
    bolum: "Ölçüt 3",
    dayanak:
      "Eğer program çıktıları, FEDEK Çıktılarından farklı bir şekilde tanımlanmışsa, bileşen bazında ayrıntılı bir çapraz ilişki tablosu kullanılmalıdır.",
    duzen: "pc-kurul",
    sutunlar: [],
    notlar: ["X: program çıktısı bu FEDEK Çıktısını kapsıyor (kurumun onayladığı eşleme)."],
  },
  {
    kod: "fedek-lisans.4.1.2",
    cerceveKod: "fedek-lisans",
    baslik: "Derslerin program çıktılarına katkısı",
    baslikDurumu: "ic",
    kaynak: B.fedekOdr31,
    sayfa: null,
    bolum: "Ölçüt 4",
    dayanak:
      "Burada, öğretim planında yer alan her dersin, program öğretim amaçları ve program çıktıları bileşenlerine katkılarını gösteren bir tablo kullanılması önerilir.",
    duzen: "ders-pc",
    sutunlar: [],
    notlar: ["Değerler Bologna ders-program çıktısı matrisinden alınır (1-5; - ilişkisiz)."],
  },
  {
    kod: "sabak-genel.odr-1",
    cerceveKod: "sabak-genel",
    baslik: "ÖDR- Tablo 1. Eğitim planı",
    baslikDurumu: "resmi",
    kaynak: B.sabakOdrR5,
    sayfa: 48,
    bolum: "ÖDR TABLOLARI",
    dayanak: "(**)Ders türü: Temel dersler (T), Genel dersler (G), Mesleki dersler (M)",
    duzen: "ders",
    turler: ["T", "G", "M"],
    sutunlar: [
      S("ad", "Dersin adı", "ders.ad"),
      S("t", "Teorik", "ders.teorik"),
      S("ul", "Lab/Uyg", "ders.uygulamaLab"),
      S("akts", "AKTS", "ders.akts", { bicim: "akts", toplanir: true }),
      S("zs", "Z/S", "ders.zorunluSecmeli"),
      S("tur", "Ders türü", "ders.turu"),
    ],
    notlar: [
      "Şablonda Güz ve Bahar dönemleri yan yanadır; burada yarıyıl sırasıyla alt alta verilir.",
      "Ders türü kurumun onayladığı eşlemeden gelir; eşlemesi olmayan ders EKSİK çıkar.",
    ],
  },
  {
    kod: "sabak-genel.2.6",
    cerceveKod: "sabak-genel",
    baslik: "Program çıktıları ile SABAK Çıktıları ilişkisi",
    baslikDurumu: "ic",
    kaynak: B.sabakR4,
    sayfa: 4,
    bolum: "Ölçüt 2.6",
    dayanak: "Program çıktıları Tablo 1’de sıralanan SABAK çıktılarını içerecek biçimde tanımlanmalıdır.",
    duzen: "pc-kurul",
    sutunlar: [],
    notlar: ["X: program çıktısı bu SABAK çıktısını kapsıyor (kurumun onayladığı eşleme)."],
  },
  {
    kod: "sabak-genel.2.4",
    cerceveKod: "sabak-genel",
    baslik: "Derslerin program çıktılarına katkısı",
    baslikDurumu: "ic",
    kaynak: B.sabakR4,
    sayfa: 4,
    bolum: "Ölçüt 2.4",
    dayanak:
      "Programın yeterliliklerin hangi eylemlerle kazandırılabileceği (yeterlik-ders- öğretim yöntemi matrisleri)",
    duzen: "ders-pc",
    sutunlar: [],
    notlar: ["Değerler Bologna ders-program çıktısı matrisinden alınır (1-5; - ilişkisiz)."],
  },
  {
    kod: "epdad-ogretmen.ek-1.1",
    cerceveKod: "epdad-ogretmen",
    baslik: "EK I.1 Lisans Eğitim Programı",
    baslikDurumu: "resmi",
    kaynak: B.epdadOdr13,
    sayfa: 29,
    bolum: "EK I – Programa İlişkin Ek Bilgiler",
    dayanak:
      "Öğrenci başarı hesaplamalarında kredi ve AKTS kredisinden hangisi kullanılıyorsa bu tabloda sadece onu kullanınız.",
    duzen: "ders",
    kategoriler: ["GK", "OMB", "AB", "D"],
    sutunlar: [
      S("kod", "Ders Kodu", "ders.kod"),
      S("ad", "Ders Adı", "ders.ad"),
      S("dil", "Öğretim Dili", "ders.dil"),
      kategoriSutunu("GK", "Genel Kültür", "akts"),
      kategoriSutunu("OMB", "Öğretmenlik Meslek Bilgisi", "akts"),
      kategoriSutunu("AB", "Alan Bilgisi", "akts"),
      kategoriSutunu("D", "Diğer", "akts"),
    ],
    notlar: [
      "Kategori hücreleri AKTS kredisidir.",
      "Ders kategorisi kurumun onayladığı eşlemeden gelir; eşlemesi olmayan ders EKSİK çıkar.",
    ],
  },
];

/** Bütün tablo tanımları. Yükleme sırasında şemadan geçer: özeti olmayan belgeye dayanan tanım yüklenemez. */
export const TABLO_TANIMLARI: readonly TabloTanimi[] = TANIM_GIRDILERI.map((t) => tabloTanimiSemasi.parse(t));

/** Tablo tanımını doğrular ve yükler; hata iletisi Türkçedir. */
export function tabloTanimiYukle(girdi: unknown): TabloTanimi {
  return tabloTanimiSemasi.parse(girdi);
}
