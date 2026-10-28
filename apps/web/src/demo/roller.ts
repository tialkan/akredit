// Demo rolleri, rehber turu ve demo oturumunun sınırları (İP-41). Saf veri; test edilir.
//
// Demo oturumu her zaman sentetik Örnek Üniversitesi'ne bağlıdır. Rolün kurum içindeki yetkisi ayrıca bu
// listeyle kesişir: okuma ve kendi kapsamındaki öneriye karar. Yükleme, davet, rol atama, ayar, API anahtarı,
// politika imzası ve dış gönderim demo oturumunda yoktur (e-posta ve dış yapay zekâ çağrısı doğurmasınlar diye).

import type { Eylem } from "@akredit/yetki";

export const DEMO_ROLLERI = [
  "ogretim_elemani",
  "bolum_baskani",
  "kalite_komisyonu",
  "rektorluk",
  "dis_degerlendirici",
] as const;
export type DemoRolu = (typeof DEMO_ROLLERI)[number];

/** Demo oturumunun süresi: 2 saat. */
export const DEMO_SURESI_MS = 2 * 60 * 60 * 1000;

/** Demo oturumunda izin verilen eylemlerin üst sınırı. */
export const DEMO_EYLEMLERI: readonly Eylem[] = [
  "kanit.oku",
  "oneri.oku",
  "rapor.oku",
  "olcme.oku",
  "gunluk.oku",
  "karar.ver",
];

/** Demo ziyaretçi adreslerinin alan adı. `.invalid` hiçbir zaman teslim edilemeyen ayrılmış bir ad alanıdır. */
export const DEMO_EPOSTA_ALANI = "demo.akredit.invalid";
export const demoEpostasiMi = (eposta: string): boolean => eposta.toLowerCase().endsWith(`@${DEMO_EPOSTA_ALANI}`);

export const DEMO_SERIDI = "Örnek veri, gerçek kurum değildir.";

export interface TurAdimi {
  baslik: string;
  metin: string;
  yol: string;
}

export interface DemoRolBilgisi {
  rol: DemoRolu;
  /** Düğme metni. */
  dugme: string;
  /** Rolün kısa adı (panel başlığında). */
  ad: string;
  aciklama: string;
  tur: TurAdimi[];
}

export const DEMO_ROL_BILGISI: Readonly<Record<DemoRolu, DemoRolBilgisi>> = {
  ogretim_elemani: {
    rol: "ogretim_elemani",
    dugme: "Öğretim elemanı olarak dene",
    ad: "Öğretim elemanı",
    aciklama: "Üç dersin sorumlusu. Önünüze yalnız kendi derslerinizin önerileri gelir.",
    tur: [
      {
        baslik: "Onay kutunuz",
        metin: "Sistemin hazırladığı öneriler burada. Her birinin dayanağı ders bilgi paketindeki satırdır.",
        yol: "/panel/onaylar",
      },
      {
        baslik: "Eşik altı bir çıktı",
        metin:
          "Algoritma Analizi dersinde ÖÇ2 eşiğin altında kaldı. Sayı not dökümünden hesaplandı, model yazmadı. Eylem önerisini onaylayın ya da düzeltin.",
        yol: "/panel/dersler",
      },
      {
        baslik: "Kanıtlar",
        metin: "Ders bilgi paketleri ve tutanaklar kanıt olarak kayıtlı. Bir öneriden kanıtın ilgili bölümüne gidebilirsiniz.",
        yol: "/panel/kanitlar",
      },
      {
        baslik: "Size kalan",
        metin: "Hepsi bu: öneriyi kanıtıyla görüp karar vermek. Kararınız adınız ve zamanıyla günlüğe yazılır.",
        yol: "/panel",
      },
    ],
  },
  bolum_baskani: {
    rol: "bolum_baskani",
    dugme: "Bölüm başkanı olarak dene",
    ad: "Bölüm başkanı",
    aciklama: "Bilgisayar Mühendisliği programının sorumlusu.",
    tur: [
      {
        baslik: "Program görünümü",
        metin:
          "Programı buradan açın: program çıktıları ve ders katkı matrisi. Matrisin her hücresi onaylı bir karara dayanır.",
        yol: "/panel/birimler",
      },
      {
        baslik: "Ders ölçme sonuçları",
        metin: "On iki dersin öğrenme çıktısı sağlanması, soru bazlı not dökümünden hesaplandı.",
        yol: "/panel/dersler",
      },
      {
        baslik: "Tutanak taslağı",
        metin: "Bölüm kurulu tutanak taslağı onayınızı bekliyor. Kararlar bölümü boşsa EKSİK yazar.",
        yol: "/panel/onaylar",
      },
    ],
  },
  kalite_komisyonu: {
    rol: "kalite_komisyonu",
    dugme: "Kalite komisyonu olarak dene",
    ad: "Kalite komisyonu üyesi",
    aciklama: "Kurum genelinde kanıt etiketleri ve anket özetleri.",
    tur: [
      {
        baslik: "Toplu onay",
        metin: "Düşük riskli kanıt etiketlerini birlikte onaylayabilirsiniz. Yüksek riskli öneri toplu onaylanamaz.",
        yol: "/panel/onaylar",
      },
      {
        baslik: "Kanıt kapsaması",
        metin: "Hangi kanıt nerede, hangisi eksik. Kamu Yönetimi danışma kurulu tutanağı bilinçli olarak eksik.",
        yol: "/panel/kanitlar",
      },
      {
        baslik: "Göstergeler",
        metin: "Program çıktısı sağlanma göstergesi derslerin ölçme sonuçlarından hesaplanır.",
        yol: "/panel/gostergeler",
      },
      {
        baslik: "Değiştirilemez günlük",
        metin: "Her karar, öneri ve yükleme günlüğe eklenir; silinemez.",
        yol: "/panel/raporlar",
      },
    ],
  },
  rektorluk: {
    rol: "rektorluk",
    dugme: "Rektörlük olarak dene",
    ad: "Rektörlük",
    aciklama: "Kurum geneli görünüm. Kurum adına beyan niteliğindeki rapor bölümü yalnız sizin kararınızla ilerler.",
    tur: [
      {
        baslik: "Kurum özeti",
        metin: "Bekleyen kararlar, yaklaşan son tarihler ve kanıt kapsaması.",
        yol: "/panel",
      },
      {
        baslik: "Yüksek riskli karar",
        metin: "Öz değerlendirme raporu bölüm taslağı yüksek risklidir: toplu onaylanamaz, yetki devriyle verilemez.",
        yol: "/panel/onaylar",
      },
      {
        baslik: "Göstergeler",
        metin: "Bütün sayılar kayıtlardan hesaplanır; kaynağı olmayan değer EKSİK görünür.",
        yol: "/panel/gostergeler",
      },
    ],
  },
  dis_degerlendirici: {
    rol: "dis_degerlendirici",
    dugme: "Dış değerlendirici olarak dene",
    ad: "Dış değerlendirici",
    aciklama: "Süreli, salt okunur erişim. Kanıtları ve raporları görürsünüz; karar veremezsiniz.",
    tur: [
      {
        baslik: "Kanıtlar",
        metin: "Kanıtlar kaynağı, tarihi ve içerik özetiyle listelenir.",
        yol: "/panel/kanitlar",
      },
      {
        baslik: "Raporlar",
        metin: "Rapordaki her cümle bir kanıta bağlanır; bağlanamayan EKSİK yazar.",
        yol: "/panel/raporlar",
      },
      {
        baslik: "Salt okuma",
        metin: "Değerlendirici erişimi süre sonunda kendiliğinden kapanır. Burada iki saat sonra kapanır.",
        yol: "/panel",
      },
    ],
  },
};

export const demoRoluMu = (x: unknown): x is DemoRolu =>
  typeof x === "string" && (DEMO_ROLLERI as readonly string[]).includes(x);
