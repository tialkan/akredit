// Hazır anket şablonları. Soru metinleri Akredit'in kendi önerisidir; resmî bir ölçüt ya da mevzuat metni
// değildir, kurum değiştirebilir. AKTS iş yükü etkinlik adları Bologna ders bilgi paketi iş yükü tablosunda
// sık görülen başlıklardır; eşleşme ders sayfasındaki adlarla yapılır.

import { AnketTanimi, type AnketTanimiGirdisi } from "./sema.ts";

export const LIKERT_5 = [
  "Kesinlikle katılmıyorum",
  "Katılmıyorum",
  "Kararsızım",
  "Katılıyorum",
  "Kesinlikle katılıyorum",
];

const likert = (kod: string, metin: string, zorunlu = false) => ({
  kod,
  metin,
  tur: "likert" as const,
  secenekler: LIKERT_5,
  zorunlu,
});
const acik = (kod: string, metin: string) => ({ kod, metin, tur: "acik" as const });

/** AKTS iş yükü anketinin etkinlikleri: soru kodu → Bologna iş yükü tablosundaki etkinlik adı. */
export const ISYUKU_ETKINLIKLERI: readonly { kod: string; etkinlik: string; metin: string }[] = [
  { kod: "ders_suresi", etkinlik: "Ders süresi", metin: "Dönem boyunca derse (sınıf içi) toplam kaç saat ayırdınız?" },
  {
    kod: "sinif_disi",
    etkinlik: "Sınıf dışı ders çalışma süresi",
    metin: "Dönem boyunca sınıf dışında derse toplam kaç saat çalıştınız?",
  },
  { kod: "odev", etkinlik: "Ödevler", metin: "Ödevlere toplam kaç saat ayırdınız?" },
  { kod: "proje", etkinlik: "Proje", metin: "Projeye toplam kaç saat ayırdınız?" },
  { kod: "ara_sinav", etkinlik: "Ara sınavlar", metin: "Ara sınavlara hazırlık ve sınava toplam kaç saat ayırdınız?" },
  {
    kod: "final",
    etkinlik: "Yarıyıl sonu sınavı",
    metin: "Dönem sonu sınavına hazırlık ve sınava toplam kaç saat ayırdınız?",
  },
];

const ham: Record<string, AnketTanimiGirdisi> = {
  ders_degerlendirme: {
    sablon: "ders_degerlendirme",
    baslik: "Ders değerlendirme anketi",
    hedefKitle: "ogrenci",
    sorular: [
      likert("hedef", "Dersin öğrenme çıktıları dönem başında açıkça anlatıldı.", true),
      likert("icerik", "Ders içeriği öğrenme çıktılarıyla uyumluydu.", true),
      likert("olcme", "Sınav ve ödevler öğrenme çıktılarını ölçtü.", true),
      likert("geri_bildirim", "Çalışmalarıma zamanında geri bildirim aldım.", true),
      likert("genel", "Genel olarak dersten memnunum.", true),
      acik("guclu", "Dersin en güçlü yanı neydi?"),
      acik("oneri", "Ders için iyileştirme öneriniz nedir?"),
    ],
  },
  akts_isyuku: {
    sablon: "akts_isyuku",
    baslik: "AKTS iş yükü anketi",
    aciklama: "Bu derse dönem boyunca ayırdığınız gerçek süreyi saat olarak yazın. Tahmini değer yeterlidir.",
    hedefKitle: "ogrenci",
    sorular: [
      ...ISYUKU_ETKINLIKLERI.map((e) => ({
        kod: e.kod,
        metin: e.metin,
        tur: "isyuku" as const,
        etkinlik: e.etkinlik,
        enAz: 0,
        enCok: 1000,
      })),
      acik("not", "Ders yükü hakkında eklemek istediğiniz bir şey var mı?"),
    ],
  },
  mezun_izleme: {
    sablon: "mezun_izleme",
    baslik: "Mezun izleme anketi",
    hedefKitle: "mezun",
    sorular: [
      {
        kod: "durum",
        metin: "Şu anki durumunuz nedir?",
        tur: "tek_secim",
        secenekler: ["Alanımda çalışıyorum", "Alan dışında çalışıyorum", "Lisansüstü eğitim", "İş arıyorum", "Diğer"],
        zorunlu: true,
      },
      {
        kod: "ilk_is_ay",
        metin: "Mezuniyetten sonra ilk işinizi kaç ayda buldunuz?",
        tur: "sayi",
        enAz: 0,
        enCok: 120,
      },
      likert("hazirlik", "Program beni mesleğe iyi hazırladı.", true),
      likert("ciktilar", "Program çıktıları işimde gereken yetkinliklerle örtüşüyor."),
      acik("eksik", "Programda eksik bulduğunuz konu nedir?"),
    ],
  },
  isveren: {
    sablon: "isveren",
    baslik: "İşveren görüş anketi",
    hedefKitle: "isveren",
    sorular: [
      likert("bilgi", "Mezunlarımızın alan bilgisi yeterli.", true),
      likert("iletisim", "Mezunlarımızın iletişim ve takım çalışması becerisi yeterli.", true),
      likert("etik", "Mezunlarımız meslek etiğine uygun davranıyor.", true),
      likert("tercih", "Yeni alımlarda bu programın mezunlarını tercih ederim."),
      acik("beklenti", "Programdan beklediğiniz yetkinlikler nelerdir?"),
    ],
  },
  danisma_kurulu: {
    sablon: "danisma_kurulu",
    baslik: "Danışma kurulu görüş anketi",
    hedefKitle: "danisma_kurulu",
    sorular: [
      likert("ciktilar_guncel", "Program çıktıları sektörün güncel ihtiyaçlarını karşılıyor.", true),
      likert("mufredat", "Müfredat çıktılara ulaşmak için uygun.", true),
      acik("oneri", "Program için önerileriniz nelerdir?"),
    ],
  },
  ic_paydas: {
    sablon: "ic_paydas",
    baslik: "İç paydaş memnuniyet anketi",
    hedefKitle: "ic_paydas",
    sorular: [
      {
        kod: "rol",
        metin: "Kurumdaki göreviniz",
        tur: "tek_secim",
        secenekler: ["Akademik personel", "İdari personel", "Öğrenci"],
        zorunlu: true,
      },
      likert("katilim", "Kalite süreçlerine katılabildiğimi düşünüyorum.", true),
      likert("bilgilendirme", "Kalite çalışmalarının sonuçları hakkında bilgilendiriliyorum.", true),
      likert("genel", "Genel olarak kurumdan memnunum.", true),
      acik("oneri", "Önerileriniz nelerdir?"),
    ],
  },
};

export const HAZIR_SABLONLAR: Readonly<Record<string, AnketTanimi>> = Object.fromEntries(
  Object.entries(ham).map(([k, v]) => [k, AnketTanimi.parse(v)]),
);

export function sablon(kod: string): AnketTanimi | undefined {
  return HAZIR_SABLONLAR[kod];
}
