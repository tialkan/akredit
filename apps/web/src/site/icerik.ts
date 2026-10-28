// Tanıtım sitesinin tek doğruluk kaynağı: sayfa başlıkları, açıklamalar ve uzun içerik.
// Her cümle depodaki bir özelliğe dayanır; dayanağı yorumda yazılıdır. Garanti dili yoktur.
// Yazım: kısa cümle, em dash yok, yasak kelime yok (src/site/kurallar.test.ts denetler).

export const SITE_ADRESI = "https://akredit.org";
export const SON_GUNCELLEME = "2026-10-28";

export interface SayfaBilgisi {
  yol: string;
  /** Menü ve kırıntı yolundaki kısa ad. */
  ad: string;
  /** Sayfanın h1 başlığı. */
  baslik: string;
  /** <title> (şablon " · Akredit" ekler). */
  title: string;
  /** Arama sonucu açıklaması: 150-160 karakter civarı, sayfaya özgü. */
  aciklama: string;
}

export const SAYFALAR = {
  ana: {
    yol: "/",
    ad: "Ana sayfa",
    baslik: "Akreditasyon dosyasını sistem hazırlar. Siz yalnız onaylarsınız.",
    title: "Akredit: kalite ve akreditasyon işlerini kanıtla hazırlayan açık kaynak platform",
    aciklama:
      "Akredit, üniversitelerde kalite güvencesi ve akreditasyon işlerini kanıttan hazırlar. Sistem toplar, hesaplar, atıflı taslak yazar; beyan ve onay insanda kalır.",
  },
  neYapar: {
    yol: "/ne-yapar",
    ad: "Ne yapar",
    baslik: "Ne yapar",
    title: "Ne yapar: kanıt toplama, ölçme, ders dosyası, ÖDR ve KİDR",
    aciklama:
      "Akredit modülleri tek tek: bağlayıcılar, ÇK ve PÇ ölçme motoru, ders dosyası, anket, toplantı, ÖDR, BİDR ve KİDR, göstergeler, değerlendirici portalı, mobil onay.",
  },
  nasil: {
    yol: "/nasil-calisir",
    ad: "Nasıl çalışır",
    baslik: "Nasıl çalışır",
    title: "Nasıl çalışır: kanıttan onaya, değiştirilemez günlüğe",
    aciklama:
      "Kanıt, hesap, atıflı taslak, denetim, onay ve değiştirilemez günlük. Risk düzeyleri, yetki devri politikası ve hiç esnemeyen ilkeler bu sayfada.",
  },
  kimler: {
    yol: "/kimler-icin",
    ad: "Kimler için",
    baslik: "Kimler için",
    title: "Kimler için: öğretim elemanı, kalite komisyonu, değerlendirici",
    aciklama:
      "Öğretim elemanı, program akreditasyon sorumlusu, birim kalite komisyonu, kurum kalite koordinatörlüğü ve değerlendirici Akredit'te ne görür, ne yapar.",
  },
  cerceveler: {
    yol: "/cerceveler",
    ad: "Çerçeveler",
    baslik: "Desteklenen çerçeveler",
    title: "Desteklenen çerçeveler: YÖKAK 3.3 ve KİDR 3.2.1",
    aciklama:
      "YÖKAK Değerlendirme Programları Kılavuzu 3.3 (14 ölçüt, 46 alt ölçüt) ve KİDR Hazırlama Kılavuzu 3.2.1. Resmî metin belgeden alınır, kaynağı ve özetiyle saklanır.",
  },
  yz: {
    yol: "/yapay-zeka",
    ad: "Yapay zekâ ve anahtar",
    baslik: "Yapay zekâ ve kendi anahtarınız",
    title: "Yapay zekâ ve anahtar: OpenRouter ile kendi anahtarınızı getirin",
    aciklama:
      "Akredit ilk etapta ücretsizdir. Kurum kendi OpenRouter anahtarını getirir. Anahtar nerede girilir, nasıl saklanır, modele hangi veri gider, maliyet kime aittir.",
  },
  giris: {
    yol: "/giris-ve-hesap",
    ad: "Giriş ve hesap",
    baslik: "Giriş ve hesap",
    title: "Giriş ve hesap: parolasız bağlantı, kurum tek oturumu, davetle hesap",
    aciklama:
      "Akredit'e parola olmadan girilir: kurumsal e-postaya tek kullanımlık bağlantı ya da kurumun tek oturum sistemi. İlk yönetici kurumu açar, diğerleri davetle katılır.",
  },
  guvenlik: {
    yol: "/guvenlik",
    ad: "Güvenlik ve KVKK",
    baslik: "Güvenlik ve kişisel veriler",
    title: "Güvenlik ve KVKK: değiştirilemez kayıt, kurum yalıtımı, maskeleme",
    aciklama:
      "Kanıtlar özetle saklanır ve silinmez, kurumlar birbirinden yalıtılır, öğrenci kimliği takma adla tutulur. Hukuk metinleri taslaktır, avukat incelemesi bekler.",
  },
  sinirlar: {
    yol: "/sinirlar",
    ad: "Sınırlar",
    baslik: "Akredit neyi yapmaz",
    title: "Sınırlar: akreditasyon garantisi yok, resmî bağ yok",
    aciklama:
      "Akredit akreditasyon sonucu için garanti vermez. YÖKAK ya da başka bir kuruluşla bağı yoktur. Kurum adına beyan ve son gönderim her zaman bir kişinin kararıdır.",
  },
  sss: {
    yol: "/sss",
    ad: "SSS",
    baslik: "Sık sorulan sorular",
    title: "Sık sorulan sorular",
    aciklama:
      "Akredit hakkında sık sorulanlar: ücret, anahtar, öğrenci verisi, yapay zekânın yaptığı ve yapmadığı işler, kurum içi kurulum, şu anki durum.",
  },
  iletisim: {
    yol: "/iletisim",
    ad: "İletişim",
    baslik: "İletişim",
    title: "İletişim",
    aciklama: "Akredit proje sahibine ulaşma yolu, pilot uygulama durumu ve güvenlik açığı bildirimi.",
  },
  acikKaynak: {
    yol: "/acik-kaynak",
    ad: "Açık kaynak",
    baslik: "Açık kaynak",
    title: "Açık kaynak: Apache-2.0 lisansı",
    aciklama:
      "Akredit'in kodu Apache-2.0 lisansıyla açıktır. Kurumlar sistemin ne yaptığını kendileri inceleyebilir ve tek bir firmaya bağlı kalmaz.",
  },
  kvkk: {
    yol: "/kvkk",
    ad: "KVKK",
    baslik: "Kişisel verilerin korunması",
    title: "KVKK (taslak)",
    aciklama:
      "Akredit'te kişisel verilerin işlenmesine ilişkin taslak bilgilendirme. Avukat incelemesinden geçmemiştir.",
  },
  gizlilik: {
    yol: "/gizlilik",
    ad: "Gizlilik",
    baslik: "Gizlilik politikası",
    title: "Gizlilik politikası (taslak)",
    aciklama: "akredit.org gizlilik politikasının taslağı. Avukat incelemesinden geçmemiştir.",
  },
  kosullar: {
    yol: "/kosullar",
    ad: "Kullanım koşulları",
    baslik: "Kullanım koşulları",
    title: "Kullanım koşulları (taslak)",
    aciklama: "akredit.org kullanım koşullarının taslağı. Avukat incelemesinden geçmemiştir.",
  },
  kurumAc: {
    yol: "/kurum-ac",
    ad: "Kurumunuzu açın",
    baslik: "Kurumunuzu açın",
    title: "Kurumunuzu açın: kurumsal e-postayla doğrulama ve kurulum sihirbazı",
    aciklama:
      "Akredit'te kurumunuzu teknik yardım almadan açın: kurumsal e-posta doğrulaması, OpenRouter anahtarı, Bologna'dan program ve ders önerisi, hocaların daveti.",
  },
  belgeler: {
    yol: "/belgeler",
    ad: "Kılavuzlar",
    baslik: "Kılavuzlar",
    title: "Kılavuzlar: öğretim elemanı, kalite birimi, bilgi işlem",
    aciklama:
      "Öğretim elemanı, kalite birimi ve bilgi işlem için görev kılavuzları: karar vermek, belge eklemek, ders dosyası, rapor taslakları.",
  },
} as const satisfies Record<string, SayfaBilgisi>;

/** Üst menü: en çok yedi öğe. */
export const UST_MENU = [
  SAYFALAR.neYapar,
  SAYFALAR.nasil,
  SAYFALAR.kimler,
  SAYFALAR.cerceveler,
  SAYFALAR.yz,
  SAYFALAR.guvenlik,
  SAYFALAR.sss,
];

/** Alt menü: bütün sayfalar, gruplu. */
export const ALT_MENU: { baslik: string; sayfalar: SayfaBilgisi[] }[] = [
  { baslik: "Ürün", sayfalar: [SAYFALAR.neYapar, SAYFALAR.nasil, SAYFALAR.kimler, SAYFALAR.cerceveler] },
  {
    baslik: "Kullanım",
    sayfalar: [SAYFALAR.kurumAc, SAYFALAR.yz, SAYFALAR.giris, SAYFALAR.belgeler, SAYFALAR.sss],
  },
  {
    baslik: "Güven",
    sayfalar: [SAYFALAR.guvenlik, SAYFALAR.sinirlar, SAYFALAR.kvkk, SAYFALAR.gizlilik, SAYFALAR.kosullar],
  },
  { baslik: "Proje", sayfalar: [SAYFALAR.acikKaynak, SAYFALAR.iletisim] },
];

// Dayanak: İP-35 (kurum açılışı, kurulum sihirbazı, davet uçtan uca testli). Panel sayfaları örnek kipte derlenir.
export const DURUM_NOTU =
  "Akredit geliştirme aşamasındadır. Kurum açılışı, kurulum sihirbazı ve hoca daveti çalışır. Bu sitedeki panel ekranları kurgu örnek veriyle gösterilen bir önizlemedir.";

/**
 * "Kurumunuzu açın" adımları. Dayanak: apps/web/src/kimlik/kurum-acilisi.ts, packages/servis/src/kurum-acilisi.ts,
 * packages/servis/src/kurulum/index.ts, apps/web/src/app/kurulum. Süreler koddaki sabitlerdir.
 */
export const KURUM_ACILIS_ADIMLARI: { baslik: string; metin: string }[] = [
  {
    baslik: "Başvuru",
    metin:
      "Kurumun adını, kurumsal e-posta alan adını (ör. ornek.edu.tr) ve ilk yöneticinin adıyla e-postasını yazın. E-posta bu alan adında olmalı. Genel e-posta hizmetleri kabul edilmez.",
  },
  {
    baslik: "E-posta doğrulaması",
    metin:
      "Yöneticinin kurumsal e-postasına tek kullanımlık bir bağlantı gider. Bağlantı 30 dakika geçerlidir. Bir alan adına yalnız bir kurum açılır.",
  },
  {
    baslik: "Giriş",
    metin: "Bağlantıyı açınca kurum ve yönetici hesabı oluşur. Ardından parolasız giriş bağlantısı gönderilir.",
  },
  {
    baslik: "Yapay zekâ anahtarı",
    metin:
      "Kurumun OpenRouter anahtarını girin ve OpenRouter hesabında bir harcama sınırı koyun. Anahtar şifreli saklanır, bütün yapay zekâ işleri bu anahtarla yapılır. Anahtar yoksa iş durur ve size bildirim düşer.",
  },
  {
    baslik: "Yurt dışı aktarım kararı",
    metin:
      "Verinin maskelenerek yurt dışındaki yapay zekâ hizmetlerine gidip gitmeyeceğine karar verin. Karar metnini okuyup adınızla imzalarsınız, karar günlüğe yazılır.",
  },
  {
    baslik: "Birim ve program",
    metin:
      "Programın Bologna sayfasının adresini yapıştırın. Program çıktıları ve dersler öneri olarak gelir. Siz onaylayınca kaydedilir.",
  },
  {
    baslik: "Hocaların daveti",
    metin:
      "Bologna'daki dersi verenlerin adları öneri olarak gelir. E-posta adreslerini siz yazarsınız ya da CSV dosyasından yapıştırırsınız. Sistem addan e-posta üretmez.",
  },
  {
    baslik: "Çerçeve",
    metin: "Kurumunuzun izleyeceği çerçeveyi seçin, örneğin YÖKAK Değerlendirme Programları Kılavuzu 3.3.",
  },
];

// ---------------------------------------------------------------- Ana sayfa

/** Sistemin yaptığı işler (plan.md §2 tablosu; ADR 0004). */
export const SISTEMIN_ISI = [
  {
    is: "Kanıt toplar",
    ayrinti: "Bologna sayfaları, not dökümleri, e-posta ekleri, EBYS paketleri ve bulut klasörlerinden.",
  },
  {
    is: "Hesaplar",
    ayrinti: "Ders ve program çıktılarının sağlanma düzeyini, not istatistiklerini, göstergeleri. Sayıyı model yazmaz.",
  },
  {
    is: "Taslak yazar",
    ayrinti: "Ders sayfası, ders dosyası, tutanak ve rapor bölümü. Her olgusal cümle bir kanıta bağlanır.",
  },
  {
    is: "Denetler",
    ayrinti: "Kaynaksız cümleyi, dayanaksız sayıyı ve eksik kanıtı işaretler. Bağlanamayan içerik EKSİK yazılır.",
  },
  {
    is: "Takip eder",
    ayrinti: "Süreç takvimini, son tarihleri ve hatırlatmaları. Geciken iş sorumlusunun üstüne bildirilir.",
  },
];

export const INSANIN_ISI = [
  "Önerileri kanıtıyla görür; onaylar, düzeltir ya da reddeder.",
  "Kurum adına beyanı, olgunluk düzeyini ve dış kuruma son gönderimi kendisi yapar. Bu işler devredilemez.",
  "Eğitimi, araştırmayı ve toplantının kendisini yapar. Sistem yapılmamış bir faaliyeti yazmaz.",
];

// ---------------------------------------------------------------- Ne yapar

export interface Modul {
  kimlik: string;
  ad: string;
  ozet: string;
  girer: string[];
  cikar: string[];
  hoca: string;
  not?: string;
}

/** Her modülün dayanağı: docs/raporlar/IP-xx.md. */
export const MODULLER: Modul[] = [
  {
    kimlik: "kanit",
    ad: "Kanıt hattı",
    ozet: "Bir belge, kimseden ek iş istemeden kanıta dönüşür.", // İP-10
    girer: ["PDF, Word, Excel, PowerPoint ve görüntü dosyaları", "Bağlayıcılardan gelen dosyalar"],
    cikar: [
      "İçerik özetiyle (SHA-256) saklanan, üzerine yazılamayan ve silinemeyen kanıt",
      "Sayfa ve bölüm atıflı metin parçaları",
      "Kişisel veri taraması sonucu",
      "Kanıtın hangi ölçüte ait olduğuna dair bir etiket önerisi",
    ],
    hoca: "Etiket önerisini onaylar. Düşük riskli olduğu için toplu onaylanabilir.",
    not: "Aynı dosya ikinci kez eklenmez. Taranmış belge kurum içinde metne çevrilir.",
  },
  {
    kimlik: "baglayicilar",
    ad: "Bağlayıcılar",
    ozet: "Kanıt, kurumun zaten kullandığı sistemlerden gelir.", // İP-05, İP-23
    girer: [
      "Bologna (Proliz) ders bilgi paketi sayfaları",
      "OBS not dökümü (soru bazlı, CSV ya da Excel)",
      "UBYS ve diğer öğrenci bilgi sistemlerinin not listeleri",
      "AVESİS açık profil sayfaları",
      "YÖK Atlas program bilgileri: kontenjan, yerleşen, taban puan",
      "EBYS e-Yazışma paketleri (.eyp)",
      "Kurum e-posta kutusuna iletilen ekler",
      "Google Drive ve OneDrive klasörleri",
    ],
    cikar: ["Kaynağı, okunma zamanı ve adresi yazılı kanıt kaydı"],
    hoca: "Bir şey yapmaz. Bağlantıyı kurum bir kez kurar.",
    not: "Not listesinde öğrenci numarası takma ada çevrilir; ad, T.C. kimlik ve e-posta sütunları okunmaz. E-postada yalnız ekler alınır, gövde metni alınmaz. Gizlilik dereceli EBYS paketi reddedilir. Bulut hesapları yalnız yetkilendirmeyle bağlanır; parola alınmaz, erişim belirteci şifreli saklanır.",
  },
  {
    kimlik: "olcme",
    ad: "Ölçme motoru (ÇK ve PÇ)",
    ozet: "Ders ve program çıktılarının sağlanma düzeyini not verisinden hesaplar.", // İP-06
    girer: ["Soru bazlı not dökümü", "Soru ile ders çıktısı (ÇK) eşlemesi", "Ders ile program çıktısı (PÇ) matrisi"],
    cikar: ["ÇK ve PÇ sağlanma düzeyi", "Not istatistikleri", "Madde analizi"],
    hoca: "İlk dönem soru ile ÇK eşlemesini onaylar.",
    not: "Hesap belirlenimcidir: aynı veri her zaman aynı sonucu verir. Yapay zekâ bu sayılara dokunmaz.",
  },
  {
    kimlik: "bologna",
    ad: "Ders bilgi paketi (Bologna)",
    ozet: "Ders sayfasını okur, denetler ve eksiksiz bir taslak hazırlar.", // İP-15
    girer: ["Programın Bologna sayfaları", "Hocanın kısa beyanı (ör. projenin olup olmadığı)"],
    cikar: ["Kurallardan geçmiş ders sayfası taslağı", "Hangi alana ne yazılacağını gösteren aktarım planı"],
    hoca: "Taslağı onaylar. Sayfayı öğrenci bilgi sisteminde son kez kaydetmek insanda kalır.",
  },
  {
    kimlik: "ders-dosyasi",
    ad: "Ders dosyası",
    ozet: "Not dökümünden ve sınav belgelerinden ders dosyası çıkarır.", // İP-16
    girer: ["OBS not dökümü", "Sınav kâğıtları ve cevap anahtarı gibi belgeler"],
    cikar: ["Word biçiminde ders dosyası", "ÇK sonuçları", "Bir sonraki dönem için iyileştirme önerisi"],
    hoca: "Toplam üç adım: bir yükleme ve iki onay.",
    not: "Onaylanmamış dosyanın başında taslak olduğu yazar ve imza yeri boş kalır.",
  },
  {
    kimlik: "anket",
    ad: "Anketler",
    ozet: "Paydaş anketlerini gönderir, hatırlatır ve analiz eder.", // İP-17
    girer: [
      "Altı hazır şablon: ders değerlendirme, AKTS iş yükü, mezun izleme, işveren, danışma kurulu, iç paydaş",
      "Davetli liste ya da açık bağlantı",
    ],
    cikar: [
      "Soru bazlı istatistik",
      "Açık uçlu yanıtların atıflı özeti",
      "AKTS iş yükü ile ders sayfasının karşılaştırması",
    ],
    hoca: "Bir şey yapmaz.",
    not: "Yanıt hiçbir yerde kişiye bağlanmaz. Açık uçlu yanıt özeti sayı içeremez; her cümle yanıtlara atıf verir.",
  },
  {
    kimlik: "toplanti",
    ad: "Toplantı asistanı",
    ozet: "Danışma kurulu ve komisyon toplantılarını planlar.", // İP-18
    girer: ["Açık eylemler ve görevler", "Katılımcı listesi", "Toplantı notları"],
    cikar: ["Gündem (geciken işler önce)", "Takvim daveti", "Tutanak taslağı", "Kararlardan çıkan eylemler"],
    hoca: "Toplantıya katılır, tutanağı onaylar.",
    not: "Kayıtta adı geçmeyen kişi katıldı diye yazılmaz. Eylemin hedef tarihi yalnız karar metninde yazılıysa girer.",
  },
  {
    kimlik: "odr",
    ad: "Öz değerlendirme raporu (ÖDR)",
    ozet: "Programın raporunu kanıttan, ölçmeden ve süreç kayıtlarından kurar.", // İP-19
    girer: ["Onaylı kanıt ve ölçüt bağları", "Ölçme sonuçları", "Süreç ve eylem kayıtları"],
    cikar: ["Ölçüt kapsama haritası", "Eksik analizi", "Atıflı rapor taslağı (Word)"],
    hoca: "Komisyon bölümleri onaylar. Son gönderimi yetkili kişi yapar.",
  },
  {
    kimlik: "kidr",
    ad: "BİDR ve KİDR",
    ozet: "Birim ve kurum iç değerlendirme raporlarını derler.", // İP-20
    girer: ["Birimlerin onaylı kanıtları", "YÖKAK KİDR 3.2.1 şablonu"],
    cikar: [
      "Her alt ölçüt için kayıtlı kanıtları listeleyen bölüm",
      "Kanıtı olmayan alt ölçütte EKSİK işareti",
      "Olgunluk düzeyi önerisi",
    ],
    hoca: "Olgunluk düzeyine yetkili kişi karar verir. Bu yüksek riskli bir karardır, devredilemez.",
    not: "Derlenen bölüm faaliyet, sayı ya da sonuç uydurmaz; yalnız kayıtlı kanıtı anar.",
  },
  {
    kimlik: "gosterge",
    ad: "Performans göstergeleri",
    ozet: "Stratejik plan ve faaliyet raporu göstergelerini veriden hesaplar.", // İP-21
    girer: ["Gösterge tanımı ve hedefi", "Bağlayıcı, anket ya da ölçme verisi", "Elle giriş (kanıt zorunlu)"],
    cikar: ["Dönem değeri, hedefe göre durum ve eğilim", "Her değerin kaynak izi"],
    hoca: "Hedefleri yönetim belirler.",
  },
  {
    kimlik: "surec",
    ad: "Süreç takvimi",
    ozet: "Kalite döngülerini insan hatırlamadan yürütür.", // İP-14
    girer: ["Süreç tanımı: adımlar, son tarihler, gereken kanıt sayısı"],
    cikar: ["Görevler, hatırlatmalar, geciken işin üst kişiye bildirilmesi"],
    hoca: "Kendisine düşen görevi yapar.",
  },
  {
    kimlik: "degerlendirici",
    ad: "Değerlendirici portalı",
    ozet: "Dış değerlendiriciye süreli, salt okunur bir kanıt odası açar.", // İP-22
    girer: ["Kurumun açtığı süreli değerlendirici hesabı (en çok 120 gün)"],
    cikar: ["Ölçüte göre düzenli kanıt odası", "Soru ve yanıt alanı", "Kurumun görebildiği erişim günlüğü"],
    hoca: "Bir şey yapmaz. Değerlendiricinin sorusunu ilgili kişi yanıtlar.",
  },
  {
    kimlik: "mobil",
    ad: "Mobil onay",
    ozet: "Onay kutusu telefona uygulama gibi eklenir.", // İP-33
    girer: ["Bekleyen öneriler"],
    cikar: ["Telefonda onay listesi"],
    hoca: "Telefondan karar verir.",
    not: "Bağlantı yokken liste görülebilir ama karar verilemez. Karar, verildiği an adla ve zamanla kaydedilir.",
  },
  {
    kimlik: "arac",
    ad: "Komut satırı ve MCP",
    ozet: "Teknik kullanıcılar için aynı kuralları uygulayan araçlar.", // İP-24, İP-25
    girer: ["Kişiye bağlı API anahtarı"],
    cikar: [
      "akredit komut satırı aracı: çevrim dışı çalışma paketi ve eşitleme",
      "MCP sunucusu: yapay zekâ istemcilerinin kurum verisini okuması",
    ],
    hoca: "Kullanmak zorunda değildir.",
    not: "API anahtarıyla karar verilemez, politika imzalanamaz, dış gönderim yapılamaz.",
  },
];

// ---------------------------------------------------------------- Nasıl çalışır

export const AKIS = [
  { ad: "Kanıt", metin: "Belge ya da veri gelir. İçerik özetiyle saklanır, değiştirilemez." },
  { ad: "Hesap", metin: "Sayılar ölçme motorunda belirlenimci olarak hesaplanır." },
  { ad: "Atıflı taslak", metin: "Yapay zekâ taslak yazar. Her olgusal cümle bir kanıta bağlanır." },
  { ad: "Denetim", metin: "Atıfsız cümle, dayanaksız sayı ve eksik kanıt işaretlenir." },
  { ad: "Onay", metin: "Yetkili kişi kanıtı görerek onaylar, düzeltir ya da reddeder." },
  { ad: "Günlük", metin: "Karar ad, zaman ve dayanakla değiştirilemez günlüğe eklenir." },
];

/** ONERI_RISKI (@akredit/cekirdek) ile aynı sınıflama; örnekler ayarlar ekranındaki türlerdendir. */
export const RISKLER = [
  {
    duzey: "Düşük",
    ornek: "Kanıt etiketi",
    kural: "Toplu onaylanabilir. İmzalı bir politikayla otomatik onaylanabilir.",
  },
  {
    duzey: "Orta",
    ornek: "Matris katkısı, rapor bölümü",
    kural: "Toplu onaylanabilir, kanıt tek tıkla açılır. İmzalı politikayla otomatik onaylanabilir.",
  },
  {
    duzey: "Yüksek",
    ornek: "Olgunluk düzeyi, kurum sistemine yazma, dış kuruma gönderim",
    kural: "Her zaman tek tek ve kanıt açıkken onaylanır. Hiçbir politikaya bağlanamaz.",
  },
];

/** CLAUDE.md değişmez ilkeler, sade dille. */
export const ILKELER = [
  {
    ad: "Kanıtsız iddia yok",
    metin:
      "Her olgusal cümle dosya ve sayfa, bölüm ya da satırla bir kanıta bağlanır. Bağlanamayan içerik EKSİK yazılır.",
  },
  {
    ad: "Sayılar modelden gelmez",
    metin: "Rapordaki her sayı hesaplamadan gelir. Modelin yazdığı sayı rapora, matrise ya da göstergeye girmez.",
  },
  {
    ad: "Beyan insanda",
    metin: "Kurum adına beyan, akreditasyonu etkileyen onay ve dış kuruma son gönderim bir kişinin kararıdır.",
  },
  {
    ad: "Kayıt değişmez",
    metin:
      "Kanıt silinmez, üzerine yazılmaz. Öneri, karar ve günlük kayıtları yalnız eklenir. Düzeltme yeni kayıtla yapılır.",
  },
  {
    ad: "Belge veridir",
    metin: "Belgedeki, web sayfasındaki ya da e-postadaki metin yapay zekâya talimat olarak geçmez.",
  },
  {
    ad: "Resmî metin belgeden",
    metin: "Ölçüt metni hafızadan yazılmaz. Resmî belgeden alınır, adresi ve dosya özetiyle saklanır.",
  },
  {
    ad: "En az kişisel veri",
    metin: "Öğrenci kimliği takma adla tutulur. Kişisel veri, kurum izin vermedikçe yurt dışına gönderilmez.",
  },
  { ad: "Giriş bilgisi korunur", metin: "Parola, doğrulama kodu ve oturum çerezi yapay zekâya ve günlüğe girmez." },
];

// ---------------------------------------------------------------- Kimler için

export interface RolAnlatimi {
  ad: string;
  roller: string[];
  gorur: string;
  yapar: string;
}

/** Rol adları @akredit/yetki ROLLER ile; yetki tablosu sayfada ROL_EYLEMLERI'nden üretilir. */
export const ROL_ANLATIMLARI: RolAnlatimi[] = [
  {
    ad: "Öğretim elemanı",
    roller: ["ogretim_elemani"],
    gorur: "Kendi derslerinin kanıtlarını, önerilerini, ölçme sonuçlarını ve raporlarını.",
    yapar:
      "Kendi dersi için belge yükler, not verisi girer, önerilere karar verir. Dönemde birkaç onay dışında iş beklenmez.",
  },
  {
    ad: "Bölüm ya da program akreditasyon sorumlusu",
    roller: ["program_sorumlusu"],
    gorur: "Programdaki bütün derslerin kanıtını, matrisi, ölçme sonuçlarını ve ÖDR taslağını.",
    yapar: "Rapor bölümlerini düzenler, programdaki önerilere karar verir.",
  },
  {
    ad: "Birim kalite komisyonu",
    roller: ["birim_kalite_sorumlusu", "kalite_komisyonu_uyesi"],
    gorur: "Biriminin kanıtlarını, raporlarını ve birim sorumlusu için günlüğü.",
    yapar: "Birim sorumlusu süreç takvimini yönetir ve birime kişi davet eder. Üyeler rapor düzenler ve karar verir.",
  },
  {
    ad: "Kurum kalite koordinatörlüğü",
    roller: ["kalite_komisyonu_baskani", "kurum_yoneticisi"],
    gorur: "Kurumun bütün verisini ve değiştirilemez günlüğü.",
    yapar:
      "Komisyon başkanı yetki devri politikasını imzalar ve dış gönderimi yapar. Kurum yöneticisi ayarları, yapay zekâ anahtarını ve kullanıcıları yönetir.",
  },
  {
    ad: "Değerlendirici",
    roller: ["degerlendirici"],
    gorur: "Yalnız kendisine açılan kapsamdaki kanıtları, raporları ve ölçme sonuçlarını.",
    yapar: "Okur ve soru sorar. Hesabı süreli açılır, en çok 120 gün sonra kendiliğinden kapanır.",
  },
];

export const ROL_ADI: Record<string, string> = {
  kurum_yoneticisi: "Kurum yöneticisi",
  kalite_komisyonu_baskani: "Kalite komisyonu başkanı",
  kalite_komisyonu_uyesi: "Kalite komisyonu üyesi",
  birim_kalite_sorumlusu: "Birim kalite sorumlusu",
  program_sorumlusu: "Program sorumlusu",
  ogretim_elemani: "Öğretim elemanı",
  degerlendirici: "Değerlendirici",
  gozlemci: "Gözlemci",
};

export const EYLEM_ADI: Record<string, string> = {
  "kanit.oku": "Kanıt okumak",
  "oneri.oku": "Öneri görmek",
  "rapor.oku": "Rapor okumak",
  "olcme.oku": "Ölçme sonucu görmek",
  "gunluk.oku": "Günlüğü okumak",
  "kanit.yukle": "Kanıt yüklemek",
  "olcme.veri_gir": "Not verisi girmek",
  "rapor.duzenle": "Rapor düzenlemek",
  "karar.ver": "Öneriye karar vermek",
  "surec.yonet": "Süreç takvimini yönetmek",
  "rapor.gonder": "Dış kuruma göndermek",
  "politika.imzala": "Yetki devri politikası imzalamak",
  "kullanici.davet_et": "Kişi davet etmek",
  "kullanici.ice_aktar": "Toplu kişi aktarmak",
  "rol.ata": "Rol atamak",
  "api_anahtari.yonet": "API anahtarı yönetmek",
  "kurum.ayar_yonet": "Kurum ayarlarını ve yapay zekâ anahtarını yönetmek",
};

// ---------------------------------------------------------------- SSS

export const SSS: { soru: string; cevap: string }[] = [
  {
    soru: "Akredit ücretli mi?",
    cevap:
      "İlk etapta ücretsizdir. Yapay zekâ kullanımının ücreti, kurumun kendi OpenRouter hesabına yansır. Kurum içi model kullanan kurum için bu ücret yoktur.",
  },
  {
    soru: "Akredit akreditasyon almamızı sağlar mı?",
    cevap:
      "Hayır. Akredit hazırlık işini azaltır. Değerlendirme ve karar akreditasyon kuruluşunundur. Akredit'in YÖKAK ya da başka bir kuruluşla bağı yoktur.",
  },
  {
    soru: "Yapay zekâ benim yerime karar verir mi?",
    cevap:
      "Hayır. Sistem öneri hazırlar. Düşük ve orta riskli işleri, sizin imzaladığınız bir politikayla otomatik onaylatabilirsiniz. Yüksek riskli işler her zaman bir kişinin tek tek kararıdır.",
  },
  {
    soru: "Sistem bir şey uydurursa ne olur?",
    cevap:
      "Her olgusal cümle bir kanıta bağlanmak zorundadır. Bağlanamayan içerik EKSİK işaretlenir. Sayılar modelden değil, hesaplamadan gelir.",
  },
  {
    soru: "Anahtarımızı kim görebilir?",
    cevap:
      "Anahtarı kurum yöneticisi girer. Sunucuda şifreli saklanır ve hiçbir ekrana geri gelmez. Ekranda yalnız son dört karakteri görünür. Günlüğe anahtar yazılmaz.",
  },
  {
    soru: "Öğrenci verisi nereye gider?",
    cevap:
      "Öğrenci numarası takma ada çevrilir, ad ve kimlik numarası okunmaz. Yurt dışındaki bir yapay zekâ hizmeti ancak kurum izin verirse kullanılır; o zaman da kişisel veriler maskelenerek gider.",
  },
  {
    soru: "Verimizi dışarı çıkarmadan kullanabilir miyiz?",
    cevap:
      "Evet, kurum içi kurulum paketiyle. Model kurumun sunucusunda çalışır, yurt dışı izni açılamaz. Paket yazıldı ama temiz bir sunucuda tam kurulum denemesi henüz yapılmadı.",
  },
  {
    soru: "Şu an kullanabilir miyiz?",
    cevap:
      "Kurumunuzu Kurumunuzu açın sayfasından açabilir, kurulum sihirbazıyla birim, program ve hocaları tanımlayabilirsiniz. Geliştirme sürüyor. Bu sitedeki panel ekranları kurgu örnek veriyle gösterilir.",
  },
  {
    soru: "MÜDEK ya da başka program akreditasyonları destekleniyor mu?",
    cevap:
      "Henüz değil. MÜDEK için resmî belge kütüphaneye eklenmedi, ölçüt ağacı boştur. Ölçüt metni hafızadan yazılmadığı için belge alınmadan eklenmeyecek.",
  },
  {
    soru: "Hesap nasıl açılır?",
    cevap:
      "Kurumun ilk yöneticisi, kurumsal e-postasını doğrulayarak kurumu açar. Diğer herkes davetle katılır: yönetici sizi kurumsal e-posta adresinizle davet eder. Parola yoktur.",
  },
];
