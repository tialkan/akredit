// Ders dosyası (DOCX modeli) ve ölçme raporu (XLSX sayfaları) üretimi (saf mantık, İP-16).
//
// Sayılar yalnız `@akredit/olcme` sonucundan (`DersOlcmeSonucu`) ve etkileşim ölçümünden gelir; burada hesap
// yapılmaz, yalnız biçimlenir. Her tablonun açıklamasında ölçme sonucunun kimliği, hesap sürümü ve girdi özeti
// yazılır: rapordaki her sayı bu kayda izlenebilir. Onay yoksa belge "Taslak — onaylanmadı" üst bilgisi taşır.

import type { DocxBolumu, DocxModeli, HucreDegeri, XlsxSayfasi } from "@akredit/belge";
import type { DersOlcmeSonucu } from "@akredit/olcme";
import type { EslemeSatiri } from "./esleme.ts";
import { soruAdi } from "./esleme.ts";
import type { EtkilesimOzeti } from "./etkilesim.ts";

export interface DosyaOnayi {
  onaylayan: string;
  zaman: Date;
  sonuc: "onaylandi" | "duzeltildi";
  dayanak: "dogrudan" | "politika";
}

export interface DosyaGirdisi {
  kurumAdi: string;
  ders: { kod: string; ad: string; akts: number };
  donem: string;
  sorumlular: string[];
  ciktilar: { kod: string; metin: string }[];
  araclar: { id: string; ad: string; tur: string; agirlik: number; sorular: { no: string; tamPuan: number }[] }[];
  esleme: EslemeSatiri[];
  eslemeOnayi: DosyaOnayi | null;
  sonuc: DersOlcmeSonucu;
  olcmeSonucuId: string;
  /** Derse bağlı kanıtlar (izlence, sınav, cevap anahtarı …): ad ve özet. */
  kanitlar: { dosyaAdi: string; ozet: string }[];
  etkilesim: EtkilesimOzeti;
  dosyaOnayi: DosyaOnayi | null;
  /** Kâğıt taraması yüklenmiş örnek öğrencilerin takma adları. */
  taranmisKagitlar?: string[];
}

/** Sayıyı Türkçe biçimde yazar (iki ondalık, virgül); yoksa "—". */
export function sayiYaz(x: number | null | undefined, basamak = 2): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return x.toFixed(basamak).replace(".", ",");
}
const yuzde = (x: number | null) => (x === null ? "—" : `%${sayiYaz(x * 100, 1)}`);
const tarihYaz = (d: Date) => d.toISOString().replace("T", " ").slice(0, 16);
const kisaTakma = (t: string | null) => (t ? `Öğrenci ${t.slice(0, 8)}` : "—");

/** İzlenebilirlik dipnotu: her tablonun altında. */
export function kaynakNotu(g: Pick<DosyaGirdisi, "olcmeSonucuId" | "sonuc">): string {
  return `Kaynak: ölçme sonucu ${g.olcmeSonucuId} · hesap ${g.sonuc.hesapSurumu} · girdi özeti ${g.sonuc.girdiOzeti}`;
}

const ARAC_ADI: Record<string, string> = {
  ara_sinav: "Ara sınav",
  yariyil_sonu: "Yarıyıl sonu sınavı",
  butunleme: "Bütünleme",
  kisa_sinav: "Kısa sınav",
  odev: "Ödev",
  proje: "Proje",
  uygulama: "Uygulama",
  laboratuvar: "Laboratuvar",
  sunum: "Sunum",
  diger: "Diğer",
};

const IYILESTIRME: Record<string, string> = {
  "ck-esik-alti": "Bu çıktıya ayrılan ders saatini ve etkinlikleri gözden geçirin; ek alıştırma planlayın.",
  "ck-olculmemis": "Bu çıktıyı ölçen en az bir soru ya da etkinlik ekleyin.",
  "ck-tek-soru": "Bu çıktıyı birden çok soruyla ölçmeyi düşünün.",
  "soru-negatif-ayirt": "Sorunun metnini ve cevap anahtarını yeniden inceleyin.",
  "soru-cok-kolay": "Sorunun güçlüğünü artırmayı düşünün.",
  "soru-cok-zor": "Sorunun açıklığını ve derste işlenme düzeyini gözden geçirin.",
  "arac-dusuk-guvenirlik": "Sınavın soru sayısını ve soruların tutarlılığını gözden geçirin.",
  "soru-eslemesiz": "Soruyu ilgili ders çıktısına eşleyin.",
};

/** Bulgulardan iyileştirme önerisi taslağı (kural tablosundan; model metni yok). */
export function iyilestirmeTaslagi(s: DersOlcmeSonucu): string[] {
  return s.bulgular
    .filter((b) => IYILESTIRME[b.kural])
    .map((b) => `${b.konu ? `${b.konu}: ` : ""}${b.aciklama} Öneri: ${IYILESTIRME[b.kural]}`);
}

function onaySatiri(o: DosyaOnayi | null, ne: string): DocxBolumu["icerik"][number] {
  if (!o) return { tur: "paragraf", metin: `EKSİK: ${ne} henüz onaylanmadı.`, vurgu: "eksik" };
  return {
    tur: "paragraf",
    metin: `${ne}: ${o.sonuc === "duzeltildi" ? "düzeltilerek onaylandı" : "onaylandı"} · ${o.onaylayan} · ${tarihYaz(o.zaman)} · dayanak: ${o.dayanak === "politika" ? "yetki devri politikası" : "doğrudan karar"}`,
  };
}

export function dersDosyasiModeli(g: DosyaGirdisi): DocxModeli {
  const s = g.sonuc;
  const not = kaynakNotu(g);
  const n = s.notIstatistikleri;
  const bolumler: DocxBolumu[] = [
    {
      baslik: "1. Ders bilgileri ve izlence",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Alan", "Değer"],
          satirlar: [
            ["Ders", `${g.ders.kod} ${g.ders.ad}`],
            ["Dönem", g.donem],
            ["AKTS", String(g.ders.akts)],
            ["Sorumlu", g.sorumlular.join(", ") || "EKSİK"],
          ],
        },
        { tur: "paragraf", metin: "Ders öğrenme çıktıları:" },
        g.ciktilar.length
          ? { tur: "madde", maddeler: g.ciktilar.map((c) => `${c.kod}: ${c.metin}`) }
          : { tur: "paragraf", metin: "EKSİK: dersin öğrenme çıktıları kayıtlı değil.", vurgu: "eksik" },
      ],
    },
    {
      baslik: "2. Sınavlar, cevap anahtarları ve belgeler",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Araç", "Tür", "Ağırlık (%)", "Soru sayısı"],
          satirlar: g.araclar.map((a) => [
            a.ad,
            ARAC_ADI[a.tur] ?? a.tur,
            sayiYaz(a.agirlik),
            String(a.sorular.length),
          ]),
        },
        g.kanitlar.length
          ? { tur: "madde", maddeler: g.kanitlar.map((k) => `${k.dosyaAdi} (özet ${k.ozet.slice(0, 12)})`) }
          : {
              tur: "paragraf",
              metin: "EKSİK: derse bağlı izlence, sınav ya da cevap anahtarı belgesi yok.",
              vurgu: "eksik",
            },
      ],
    },
    {
      baslik: "3. Soru ve ders çıktısı eşlemesi",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Soru", "Ders çıktıları", "Kaynak"],
          satirlar: g.esleme.map((e) => [
            soruAdi(e.aracAdi, e.soruNo),
            e.ckKodlari.join(", ") || "EKSİK",
            { onceki_donem: "önceki dönem", yz: "öneri", yok: "—", insan: "öğretim elemanı" }[e.kaynak],
          ]),
        },
        onaySatiri(g.eslemeOnayi, "Eşleme"),
      ],
    },
    {
      baslik: "4. Sonuçlar",
      duzey: 1,
      icerik: [
        {
          tur: "paragraf",
          metin: `Yöntem: ${s.yontem} · başarı eşiği: ${sayiYaz(s.esik)} · öğrenci: ${s.ogrenciSayisi}`,
        },
        {
          tur: "tablo",
          basliklar: ["Ders çıktısı", "Soru", "n", "Ortalama", "Std. sapma", "Eşiği geçen"],
          satirlar: s.ckBasarilari.map((c) => [
            c.ckKod,
            String(c.soruSayisi),
            String(c.n),
            sayiYaz(c.ortalama),
            sayiYaz(c.standartSapma),
            yuzde(c.esikGecenOrani),
          ]),
          aciklama: not,
        },
        {
          tur: "tablo",
          basliklar: ["Program çıktısı", "Sağlanma", "Katkı toplamı", "ÇK sayısı"],
          satirlar: s.pcSaglanmasi.map((p) => [p.pcKod, sayiYaz(p.deger), sayiYaz(p.katkiToplami), String(p.ckSayisi)]),
          aciklama: not,
        },
        {
          tur: "tablo",
          basliklar: ["İstatistik", "Değer"],
          satirlar: [
            ["n", String(n.n)],
            ["Ortalama", sayiYaz(n.ortalama)],
            ["Ortanca", sayiYaz(n.ortanca)],
            ["Std. sapma", sayiYaz(n.standartSapma)],
            ["En küçük", sayiYaz(n.enKucuk)],
            ["En büyük", sayiYaz(n.enBuyuk)],
            ["Geçme oranı", yuzde(n.gecmeOrani)],
          ],
          aciklama: `${not} · harf tablosu: ${n.harfTablosuAdi}`,
        },
      ],
    },
    {
      baslik: "5. Grafikler",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Not aralığı", "Öğrenci", "Dağılım"],
          satirlar: n.histogram.map((h) => [`${h.alt}-${h.ust}`, String(h.sayi), "█".repeat(h.sayi)]),
          aciklama: not,
        },
        {
          tur: "tablo",
          basliklar: ["Ders çıktısı", "Ortalama", "Çubuk"],
          satirlar: s.ckBasarilari.map((c) => [
            c.ckKod,
            sayiYaz(c.ortalama),
            "█".repeat(Math.round((c.ortalama ?? 0) / 5)),
          ]),
          aciklama: `${not} · her █ 5 puan`,
        },
      ],
    },
    {
      baslik: "6. Madde analizi",
      duzey: 1,
      icerik: s.maddeAnalizi.map((a) => ({
        tur: "tablo" as const,
        basliklar: ["Soru", "n", "Güçlük (p)", "Ayırt edicilik (D)", "Madde-toplam r"],
        satirlar: a.maddeler.map((m) => [
          m.soruNo,
          String(m.n),
          sayiYaz(m.guclukIndeksi),
          sayiYaz(m.ayirtEdicilik),
          sayiYaz(m.maddeToplamKorelasyonu),
        ]),
        aciklama: `${g.araclar.find((x) => x.id === a.aracId)?.ad ?? a.aracId} · Cronbach alfa ${sayiYaz(a.cronbachAlfa)} · ${not}`,
      })),
    },
    {
      baslik: "7. Örnek kâğıtlar",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Seçim", "Öğrenci (takma ad)", "Tarama"],
          satirlar: (
            [
              ["En yüksek", s.ornekKagitlar.enYuksek],
              ["Ortanca", s.ornekKagitlar.ortanca],
              ["En düşük", s.ornekKagitlar.enDusuk],
            ] as const
          ).map(([ad, t]) => [ad, kisaTakma(t), t && g.taranmisKagitlar?.includes(t) ? "Var" : "EKSİK"]),
        },
        {
          tur: "paragraf",
          metin: "Öğretim elemanından yalnız bu üç kâğıdın taraması istenir.",
          vurgu: "not",
        },
      ],
    },
    {
      baslik: "8. İyileştirme önerisi (taslak)",
      duzey: 1,
      icerik: (() => {
        const m = iyilestirmeTaslagi(s);
        return m.length
          ? [
              { tur: "madde" as const, maddeler: m },
              { tur: "paragraf" as const, metin: "Bu bölüm bulgulardan üretilmiş taslaktır.", vurgu: "not" as const },
            ]
          : [{ tur: "paragraf" as const, metin: "Bulgulardan iyileştirme gerektiren bir durum çıkmadı." }];
      })(),
    },
    {
      baslik: "9. Hazırlık etkileşimi",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Ölçüm", "Değer"],
          satirlar: [
            ["İnsan adımı", String(g.etkilesim.adimSayisi)],
            ["Karar", String(g.etkilesim.kararSayisi)],
            ["Yükleme", String(g.etkilesim.yuklemeSayisi)],
            ["Karar ekranında geçen süre (dk)", sayiYaz(g.etkilesim.toplamSureMs / 60_000, 1)],
          ],
          aciklama: "Kaynak: değiştirilemez günlük",
        },
      ],
    },
    {
      baslik: "10. İmza",
      duzey: 1,
      icerik: [onaySatiri(g.dosyaOnayi, "Ders dosyası"), { tur: "paragraf", metin: "İmza: ______________________" }],
    },
  ];
  return {
    baslik: `${g.ders.kod} ${g.ders.ad} ders dosyası`,
    altBaslik: g.donem,
    ustBilgi: g.dosyaOnayi ? g.kurumAdi : `${g.kurumAdi} · Taslak — onaylanmadı`,
    altBilgi: kaynakNotu(g),
    bolumler,
  };
}

/** Ölçme raporu sayfaları. Hücreler sayıdır; yuvarlanmaz. */
export function olcmeRaporuSayfalari(g: DosyaGirdisi): XlsxSayfasi[] {
  const s = g.sonuc;
  const n = s.notIstatistikleri;
  const sayfalar: XlsxSayfasi[] = [
    {
      ad: "Özet",
      basliklar: ["Alan", "Değer"],
      satirlar: [
        ["Ders", `${g.ders.kod} ${g.ders.ad}`],
        ["Dönem", g.donem],
        ["Öğrenci", s.ogrenciSayisi],
        ["Ortalama", n.ortalama],
        ["Std. sapma", n.standartSapma],
        ["Geçme oranı", n.gecmeOrani],
        ["Ölçme sonucu", g.olcmeSonucuId],
        ["Hesap sürümü", s.hesapSurumu],
        ["Girdi özeti", s.girdiOzeti],
        ["Onay", g.dosyaOnayi ? `${g.dosyaOnayi.onaylayan} ${tarihYaz(g.dosyaOnayi.zaman)}` : "Onaylanmadı"],
      ],
    },
    {
      ad: "ÇK",
      basliklar: ["ÇK", "Soru", "n", "Ortalama", "Ortanca", "Std. sapma", "Eşiği geçen oranı"],
      satirlar: s.ckBasarilari.map((c) => [
        c.ckKod,
        c.soruSayisi,
        c.n,
        c.ortalama,
        c.ortanca,
        c.standartSapma,
        c.esikGecenOrani,
      ]),
    },
    {
      ad: "PÇ",
      basliklar: ["PÇ", "Sağlanma", "Katkı toplamı", "ÇK sayısı"],
      satirlar: s.pcSaglanmasi.map((p) => [p.pcKod, p.deger, p.katkiToplami, p.ckSayisi]),
    },
    {
      ad: "Madde analizi",
      basliklar: ["Araç", "Soru", "Tam puan", "n", "Ortalama", "p", "D", "r", "Alfa"],
      satirlar: s.maddeAnalizi.flatMap((a) =>
        a.maddeler.map((m): HucreDegeri[] => [
          g.araclar.find((x) => x.id === a.aracId)?.ad ?? a.aracId,
          m.soruNo,
          m.tamPuan,
          m.n,
          m.ortalama,
          m.guclukIndeksi,
          m.ayirtEdicilik,
          m.maddeToplamKorelasyonu,
          a.cronbachAlfa,
        ]),
      ),
    },
    {
      ad: "Dağılım",
      basliklar: ["Alt", "Üst", "Öğrenci"],
      satirlar: n.histogram.map((h) => [h.alt, h.ust, h.sayi]),
    },
    {
      ad: "Bulgular",
      basliklar: ["Düzey", "Kural", "Konu", "Açıklama"],
      satirlar: s.bulgular.map((b) => [b.duzey, b.kural, b.konu ?? "", b.aciklama]),
    },
  ];
  return sayfalar;
}
