// Hazır süreçler. Tarih yazılmaz: her süreç takvim anahtarı kullanır, tarih kurum ayarından
// (`kurum.ayarlar.surec.takvim`) ya da çerçeve verisinden gelir. Gün farkları kurumun ayarıyla
// değiştirilebilecek başlangıç önerileridir, mevzuat hükmü değildir.

import { SurecTanimi, type SurecTanimiGirdisi } from "./tanim.ts";

const ham: SurecTanimiGirdisi[] = [
  {
    kod: "donem_sonu_ders_dosyasi",
    ad: "Dönem sonu ders dosyası ve ölçme",
    aciklama: "Dönem bitince her ders için ölçme sonuçlarını ve ders dosyasını toplar.",
    baslatma: { tur: "tarih", nokta: { anahtar: "donem_sonu", gunFark: 0 } },
    takvimAnahtarlari: { donem_sonu: "Dönem sonu", not_giris_son: "Not girişi son günü" },
    adimlar: [
      {
        kod: "notlar",
        ad: "Notların aktarılması",
        puko: "uygula",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Ders notlarını aktarın", rol: "ogretim_elemani" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "not_giris_son", gunFark: 2 } },
        enAzKanit: 1,
        hatirlatmalar: [3, 1],
        yukseltme: { gunSonra: 3, rol: "program_sorumlusu" },
      },
      {
        kod: "ders_dosyasi",
        ad: "Ders dosyasının tamamlanması",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["notlar"] } },
        gorev: { baslik: "Ders dosyasını gözden geçirip onaylayın", rol: "ogretim_elemani" },
        sonTarih: { tur: "sure", gun: 14 },
        enAzKanit: 1,
        hatirlatmalar: [7, 1],
        yukseltme: { gunSonra: 3, rol: "program_sorumlusu" },
      },
      {
        kod: "program_degerlendirme",
        ad: "Program düzeyinde değerlendirme",
        puko: "onlem_al",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["ders_dosyasi"] } },
        gorev: { baslik: "Ders dosyalarını program düzeyinde değerlendirin", rol: "program_sorumlusu" },
        sonTarih: { tur: "sure", gun: 21 },
        enAzKanit: 1,
        hatirlatmalar: [7, 1],
      },
    ],
  },
  {
    kod: "kidr_bidr_takvimi",
    ad: "Yıllık KİDR ve BİDR takvimi",
    baslatma: { tur: "tarih", nokta: { anahtar: "kidr_son", gunFark: -120 } },
    takvimAnahtarlari: { bidr_son: "BİDR teslim tarihi", kidr_son: "KİDR son tarihi" },
    adimlar: [
      {
        kod: "bidr",
        ad: "Birim iç değerlendirme raporları",
        puko: "kontrol_et",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Birim iç değerlendirme raporunu hazırlayın", rol: "birim_kalite_sorumlusu" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "bidr_son", gunFark: 0 } },
        hatirlatmalar: [30, 7, 1],
        yukseltme: { gunSonra: 2, rol: "kalite_komisyonu_baskani" },
      },
      {
        kod: "kidr_taslak",
        ad: "KİDR taslağı",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["bidr"] } },
        gorev: { baslik: "Kurum iç değerlendirme raporu taslağını hazırlayın", rol: "kalite_komisyonu_uyesi" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "kidr_son", gunFark: -14 } },
        hatirlatmalar: [14, 3],
      },
      {
        kod: "kidr_onay",
        ad: "KİDR onayı ve gönderim",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["kidr_taslak"] } },
        gorev: {
          baslik: "KİDR'yi inceleyip onaylayın; gönderimi siz yapın",
          aciklama: "Dış kuruma gönderim insan kararıdır; sistem göndermez.",
          rol: "kalite_komisyonu_baskani",
        },
        sonTarih: { tur: "takvim", nokta: { anahtar: "kidr_son", gunFark: 0 } },
        hatirlatmalar: [7, 2, 1],
        yukseltme: { gunSonra: 0, rol: "kurum_yoneticisi" },
      },
    ],
  },
  {
    kod: "anket_dongusu",
    ad: "Anket döngüsü",
    baslatma: { tur: "tarih", nokta: { anahtar: "anket_baslangic", gunFark: 0 } },
    takvimAnahtarlari: { anket_baslangic: "Anket dönemi başlangıcı", anket_bitis: "Anket dönemi bitişi" },
    adimlar: [
      {
        kod: "anket_hazirlik",
        ad: "Anketlerin hazırlanması",
        puko: "planla",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Bu dönemin anketlerini gözden geçirip yayımlayın", rol: "kalite_komisyonu_uyesi" },
        sonTarih: { tur: "sure", gun: 7 },
      },
      {
        kod: "anket_sonuc",
        ad: "Sonuçların değerlendirilmesi",
        puko: "kontrol_et",
        tetikleyici: { tur: "tarih", nokta: { anahtar: "anket_bitis", gunFark: 1 } },
        gorev: { baslik: "Anket sonuçlarını değerlendirin", rol: "kalite_komisyonu_uyesi" },
        sonTarih: { tur: "sure", gun: 21 },
      },
      {
        kod: "anket_eylem",
        ad: "İyileştirme eylemleri",
        puko: "onlem_al",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["anket_sonuc"] } },
        gorev: { baslik: "Sonuçlara göre iyileştirme eylemlerini belirleyin", rol: "program_sorumlusu" },
        sonTarih: { tur: "sure", gun: 30 },
      },
    ],
  },
  {
    kod: "danisma_kurulu",
    ad: "Danışma kurulu toplantısı",
    baslatma: { tur: "tarih", nokta: { anahtar: "danisma_kurulu", gunFark: -30 } },
    takvimAnahtarlari: { danisma_kurulu: "Danışma kurulu toplantısı" },
    adimlar: [
      {
        kod: "gundem",
        ad: "Gündem ve davet",
        puko: "planla",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Danışma kurulu gündemini hazırlayıp davetleri gönderin", rol: "program_sorumlusu" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "danisma_kurulu", gunFark: -14 } },
      },
      {
        kod: "tutanak",
        ad: "Tutanak",
        puko: "kontrol_et",
        tetikleyici: { tur: "tarih", nokta: { anahtar: "danisma_kurulu", gunFark: 0 } },
        gorev: { baslik: "Toplantı tutanağını yükleyin", rol: "program_sorumlusu" },
        sonTarih: { tur: "sure", gun: 7 },
      },
      {
        kod: "kararlar",
        ad: "Kararların eyleme dönüşmesi",
        puko: "onlem_al",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["tutanak"] } },
        gorev: { baslik: "Toplantı kararlarını eylem planına işleyin", rol: "program_sorumlusu" },
        sonTarih: { tur: "sure", gun: 14 },
      },
    ],
  },
  {
    kod: "puko_eylem_izleme",
    ad: "PUKÖ eylem izleme",
    baslatma: { tur: "olay", olay: "eylem_acildi" },
    adimlar: [
      {
        kod: "uygula",
        ad: "Eylemin uygulanması",
        puko: "uygula",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Eylemi uygulayıp kanıtını yükleyin", rol: "birim_kalite_sorumlusu" },
        sonTarih: { tur: "sure", gun: 60 },
        hatirlatmalar: [14, 3],
        yukseltme: { gunSonra: 7, rol: "kalite_komisyonu_baskani" },
      },
      {
        kod: "kontrol",
        ad: "Etkinliğin kontrolü",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["uygula"] } },
        gorev: { baslik: "Eylemin sonucunu ölçüp değerlendirin", rol: "kalite_komisyonu_uyesi" },
        sonTarih: { tur: "sure", gun: 30 },
      },
    ],
  },
  {
    kod: "program_akreditasyonu",
    ad: "Program akreditasyonu başvuru, ÖDR ve ziyaret",
    takvimAnahtarlari: {
      akreditasyon_basvuru: "Akreditasyon başvuru son tarihi",
      odr_teslim: "Öz değerlendirme raporu teslim tarihi",
      ziyaret: "Değerlendirme ziyareti",
    },
    adimlar: [
      {
        kod: "basvuru",
        ad: "Başvuru",
        puko: "planla",
        tetikleyici: { tur: "baslangic" },
        gorev: {
          baslik: "Başvuru belgelerini hazırlayın; gönderimi siz yapın",
          rol: "program_sorumlusu",
        },
        sonTarih: { tur: "takvim", nokta: { anahtar: "akreditasyon_basvuru", gunFark: 0 } },
        hatirlatmalar: [30, 7, 1],
        yukseltme: { gunSonra: 0, rol: "kurum_yoneticisi" },
      },
      {
        kod: "odr",
        ad: "Öz değerlendirme raporu",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["basvuru"] } },
        gorev: { baslik: "Öz değerlendirme raporunu tamamlayın", rol: "program_sorumlusu" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "odr_teslim", gunFark: 0 } },
        hatirlatmalar: [60, 30, 7, 1],
        yukseltme: { gunSonra: 0, rol: "kalite_komisyonu_baskani" },
      },
      {
        kod: "ziyaret_hazirlik",
        ad: "Ziyaret hazırlığı",
        puko: "uygula",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["odr"] } },
        gorev: { baslik: "Ziyaret programını ve kanıt dosyasını hazırlayın", rol: "program_sorumlusu" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "ziyaret", gunFark: -7 } },
      },
    ],
  },
  {
    kod: "bologna_guncelleme",
    ad: "Bologna güncelleme haftası",
    baslatma: { tur: "tarih", nokta: { anahtar: "bologna_hafta", gunFark: 0 } },
    takvimAnahtarlari: { bologna_hafta: "Bologna güncelleme haftası başlangıcı" },
    adimlar: [
      {
        kod: "ders_bilgi_paketi",
        ad: "Ders bilgi paketlerinin güncellenmesi",
        puko: "planla",
        tetikleyici: { tur: "baslangic" },
        gorev: { baslik: "Ders bilgi paketinizi gözden geçirip güncelleyin", rol: "ogretim_elemani" },
        sonTarih: { tur: "takvim", nokta: { anahtar: "bologna_hafta", gunFark: 7 } },
        hatirlatmalar: [3, 1],
        yukseltme: { gunSonra: 2, rol: "program_sorumlusu" },
      },
      {
        kod: "program_onay",
        ad: "Program düzeyinde kontrol",
        puko: "kontrol_et",
        tetikleyici: { tur: "kosul", kosul: { tur: "adimlar_tamam", adimlar: ["ders_bilgi_paketi"] } },
        gorev: { baslik: "Programın ders paketlerini kontrol edin", rol: "program_sorumlusu" },
        sonTarih: { tur: "sure", gun: 7 },
      },
    ],
  },
];

export const HAZIR_SURECLER: readonly SurecTanimi[] = ham.map((t) => SurecTanimi.parse(t));

export function hazirSurec(kod: string): SurecTanimi | undefined {
  return HAZIR_SURECLER.find((t) => t.kod === kod);
}
