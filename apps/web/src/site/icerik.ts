// Tanıtım sitesinin tek doğruluk kaynağı: sayfa başlıkları, açıklamalar ve uzun içerik.
// Her cümle depodaki bir özelliğe dayanır; dayanağı yorumda yazılıdır. Garanti dili yoktur.
// Yazım: kısa cümle, em dash yok, yasak kelime yok (src/site/kurallar.test.ts denetler).

export const SITE_ADRESI = "https://akredit.org";
export const SON_GUNCELLEME = "2026-10-28";

/** Açık kaynak deposu. Dayanaklar son kullanıcıya depo yolu yazmaz; bu adrese bağlanır. */
export const DEPO_ADRESI = "https://github.com/tialkan/akredit";

/** Depodaki bir dosya ya da klasörün GitHub adresi. Yol yalnız bağlantıda durur, metinde görünmez. */
export function depo(yol: string): string {
  const tur = /\.[a-z]+$/u.test(yol) ? "blob" : "tree";
  return `${DEPO_ADRESI}/${tur}/main/${yol}`;
}

/** Sayfa sonundaki dayanak: insan diliyle başlık ve kaynağın adresi. */
export interface DayanakKaynagi {
  baslik: string;
  adres: string;
  /** Bağlantı metni; yoksa "Kaynağı açın". */
  bag?: string;
}

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
      "Akredit akreditasyon dosyasını kanıttan hazırlar: toplar, hesaplar, yazar, takip eder. Hocaya sıfır evrak işi kalır; beyan ve karar yetkili kişidedir.",
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
    title: "Kimler için: rektörlük, kalite komisyonu, bölüm başkanı, öğretim elemanı",
    aciklama:
      "Rektörlük, kalite komisyonu, bölüm başkanı ve öğretim elemanı için Akredit: neyi sistem yapar, kime hangi karar kalır, risk ve KVKK nasıl yönetilir.",
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
      "Kayıtlar iz bırakmadan değiştirilemez, kurumlar birbirinden yalıtılır, öğrenci kimliği takma adla tutulur, KVKK silme hakkı korunur. Hukuk metinleri taslaktır.",
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
  mcpKullan: {
    yol: "/mcp-kullan",
    ad: "Kendi yapay zekânızla",
    baslik: "Akredit araçlarını kendi yapay zekânızla kullanın",
    title: "Akredit MCP: YÖKAK ölçütleri ve denetim araçları, ücretsiz ve hesapsız",
    aciklama:
      "Claude, ChatGPT, Cursor ya da VS Code'a akredit.org/mcp adresini ekleyin: YÖKAK ölçüt metni, Bologna denetimi, ÇK/PÇ hesabı ve rapor dil denetimi. Ücretsiz, hesapsız, salt okuma.",
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
  yolHaritasi: {
    yol: "/yol-haritasi",
    ad: "Yol haritası",
    baslik: "Yol haritası",
    title: "Yol haritası: şimdi yapılan ve sıradaki işler",
    aciklama:
      "Akredit'te şu an yapılan ve sıradaki işler sade dille: sessiz devir, karar katmanları, kişisel veri, örnek üniversite, sınav taraması, saha ziyareti hazırlığı.",
  },
  pilot: {
    yol: "/pilot",
    ad: "Pilot başvurusu",
    baslik: "Pilot kurum olun",
    title: "Pilot başvurusu: Akredit'i kurumunuzda gerçek veriyle deneyin",
    aciklama:
      "Akredit'i kurumunuzda gerçek veriyle deneyen ilk kurumlardan olun. Kurum, birim, rol ve hangi süreçle başlamak istediğinizi yazın; size dönüş yapılır.",
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
  {
    baslik: "Ürün",
    sayfalar: [SAYFALAR.neYapar, SAYFALAR.nasil, SAYFALAR.kimler, SAYFALAR.cerceveler, SAYFALAR.yolHaritasi],
  },
  {
    baslik: "Kullanım",
    sayfalar: [
      SAYFALAR.pilot,
      SAYFALAR.kurumAc,
      SAYFALAR.mcpKullan,
      SAYFALAR.yz,
      SAYFALAR.giris,
      SAYFALAR.belgeler,
      SAYFALAR.sss,
    ],
  },
  {
    baslik: "Güven",
    sayfalar: [SAYFALAR.guvenlik, SAYFALAR.sinirlar, SAYFALAR.kvkk, SAYFALAR.gizlilik, SAYFALAR.kosullar],
  },
  { baslik: "Proje", sayfalar: [SAYFALAR.acikKaynak, SAYFALAR.iletisim] },
];

// Dayanak: İP-35 (kurum açılışı, kurulum sihirbazı, davet uçtan uca testli). Panel sayfaları örnek kipte derlenir.
export const DURUM_NOTU =
  "Akredit geliştirme aşamasındadır. Kurum açılışı, kurulum sihirbazı ve hoca daveti çalışır. Panel kurumun kendi kayıtlarıyla açılır. Arka plan işleri kendiliğinden çalışır: gelen belgeler okunur ve ölçüt önerisi onayınıza düşer, süreç hatırlatmaları gider. Panelden toplu belge yükleme ve bağlayıcıları açma ekranları henüz yok.";

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
  /** Bugünkü durum. Gerekçesi MODUL_DURUMU_DAYANAGI'nda (site.test.ts denetler). */
  durum: ModulDurumu;
}

export type ModulDurumu = "yayinda" | "pilotta" | "yapimda";

/** Durum adları ve anlamları; /ne-yapar sayfasındaki açıklama bu tablodan üretilir. */
export const DURUM_ADI: Record<ModulDurumu, { ad: string; anlam: string }> = {
  yayinda: {
    ad: "Yayında",
    anlam: "Kurumunuzu açınca panelde kullanılır. Otomatik testlerle sınanır.",
  },
  pilotta: {
    ad: "Pilotta doğrulanıyor",
    anlam:
      "Yazıldı ve kayıtlı örneklerle sınandı. Gerçek kurum verisiyle doğrulaması pilot uygulamada yapılacak ya da bir ekranı eksik.",
  },
  yapimda: {
    ad: "Yapım aşamasında",
    anlam: "Çekirdeği yazıldı, bir kısmı henüz bağlanmadı ya da incelemede.",
  },
};

/**
 * Modül durumlarının koddaki gerekçesi (2026-10-28, plan.md §8 ve İP raporları). Site metnine girmez; durum
 * değiştiğinde önce bu gerekçe güncellenir.
 */
export const MODUL_DURUMU_DAYANAGI: Record<string, string> = {
  kanit: "İP-10 tamam; panelden toplu belge yükleme ekranı yok (DURUM_NOTU).",
  baglayicilar: "İP-05 tamam, İP-23 inceleme; bağlayıcı açma ekranı yok, canlı kurum sisteminde denenmedi.",
  olcme: "İP-06 tamam; belirlenimci, panelde ders ve rapor sayfalarında.",
  bologna: "İP-15 tamam, eksik giderme İP-37 tamam; canlı Bologna sayfasıyla pilot yapılmadı.",
  "kanit-avcisi": "İP-37 tamam; OpenRouter yanıtı canlı doğrulanmadı, site taraması ayar ekranı yok.",
  "word-paketi": "İP-37 tamam; gidiş-dönüş testi var, pilot yok.",
  "ders-dosyasi": "İP-16 tamam; gerçek not dökümüyle pilot yapılmadı.",
  anket: "İP-17 tamam; panel/anketler ve /anket sayfaları.",
  toplanti: "İP-18 tamam; panel/toplantilar.",
  odr: "İP-19 tamam; kuruluşların resmî ÖDR şablonları yok, gerçek veriyle pilot yapılmadı.",
  kidr: "İP-20 tamam; REST ucu ve panel sayfası yok, rubrik düzey metinleri doğrulanmadı.",
  gosterge: "İP-21 tamam; panel/gostergeler.",
  surec: "İP-14 tamam, İP-36 işçi zamanlanmış işleri; panel/surecler.",
  degerlendirici: "İP-22 tamam; /degerlendirici portalı.",
  mobil: "İP-33 tamam; onay kutusu İP-13 tamam.",
  arac: "İP-24 ve İP-25 tamam.",
};

/** Her modülün dayanağı: docs/raporlar/IP-xx.md. */
export const MODULLER: Modul[] = [
  {
    kimlik: "kanit",
    durum: "pilotta",
    ad: "Kanıt hattı",
    ozet: "Bir belge, kimseden ek iş istemeden kanıta dönüşür.", // İP-10
    girer: ["PDF, Word, Excel, PowerPoint ve görüntü dosyaları", "Bağlayıcılardan gelen dosyalar"],
    cikar: [
      "İçerik özetiyle (SHA-256) saklanan kanıt. Üzerine yazılmaz; yeni sürüm ayrı kayıt olur",
      "Sayfa ve bölüm atıflı metin parçaları",
      "Kişisel veri taraması sonucu",
      "Kanıtın hangi ölçüte ait olduğuna dair bir etiket önerisi",
    ],
    hoca: "Etiket önerisini onaylar. Düşük riskli olduğu için toplu onaylanabilir.",
    not: "Aynı dosya ikinci kez eklenmez. Taranmış belge kurum içinde metne çevrilir.",
  },
  {
    kimlik: "baglayicilar",
    durum: "pilotta",
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
    durum: "yayinda",
    ad: "Ölçme motoru (ÇK ve PÇ)",
    ozet: "Ders ve program çıktılarının sağlanma düzeyini not verisinden hesaplar.", // İP-06
    girer: ["Soru bazlı not dökümü", "Soru ile ders çıktısı (ÇK) eşlemesi", "Ders ile program çıktısı (PÇ) matrisi"],
    cikar: ["ÇK ve PÇ sağlanma düzeyi", "Not istatistikleri", "Madde analizi"],
    hoca: "İlk dönem soru ile ÇK eşlemesini onaylar.",
    not: "Hesap belirlenimcidir: aynı veri her zaman aynı sonucu verir. Yapay zekâ bu sayılara dokunmaz.",
  },
  {
    kimlik: "bologna",
    durum: "pilotta",
    ad: "Ders bilgi paketi (Bologna)",
    ozet: "Ders sayfasını okur, denetler ve eksiksiz bir taslak hazırlar.", // İP-15
    girer: ["Programın Bologna sayfaları", "Hocanın kısa beyanı (ör. projenin olup olmadığı)"],
    cikar: [
      "Kurallardan geçmiş ders sayfası taslağı",
      "Hangi alana ne yazılacağını gösteren aktarım planı",
      "Eksikleri gider: son okumadaki bulgulardan (boş alan, AKTS ile iş yükü uyumsuzluğu, eksik hafta, matris çelişkisi) düzeltme taslağı", // İP-37
    ],
    hoca: "Taslağı onaylar. Sayfayı öğrenci bilgi sisteminde son kez kaydetmek insanda kalır.",
    not: "Eksik gidermede saatler ve toplamlar sistemin hesabıdır (ör. 5 AKTS için 150 saat); model bu sayıları yazmaz, taslak kurallardan geçmezse hata olarak gösterilir.",
  },
  {
    kimlik: "kanit-avcisi",
    durum: "yapimda",
    ad: "Kanıt arama",
    ozet: "Bir ölçütün kanıtını kurumun kendi belgelerinde ve sitesinde arar.", // İP-37
    girer: [
      "Ölçüt kodu ve çerçevedeki kanıt gereksinimi",
      "Kurumun kanıt havuzu",
      "Kurumun kendi web sitesi (yalnız kendi alan adı, robots.txt'ye uyarak, saniyede en çok bir istekle)",
      "İsteğe bağlı: web araması (OpenRouter)",
    ],
    cikar: [
      "Kanıt adayı önerisi: belge adı, birebir alıntı ve sayfa adresi",
      "Başka kurumlardan örnek uygulama bağlantıları, ayrı bir türde ve kanıt değildir etiketiyle",
    ],
    hoca: "Aday kanıtı onaylar ya da reddeder.",
    not: "Başka kurumun sayfası kurumunuzun kanıtı yerine geçmez. Kanıt kaydına giremez, ölçüte bağlanamaz, rapora kanıt olarak giremez; bu kural veritabanında da uygulanır. Web araması yalnız kurum yurt dışı yapay zekâ iznini verdiyse ve yönetici web aramasını açtıysa yapılır. Site tarayıcısı kayıtlı örnek sayfalarla sınandı; sunucuda düzenli çalışması için arka plan işlerine bağlanması bekliyor.",
  },
  {
    kimlik: "word-paketi",
    durum: "pilotta",
    ad: "Word paketi",
    ozet: "Ders bilgi paketini, bulguları ve kaynakçayı düzenlenebilir Word dosyası olarak verir.", // İP-37
    girer: ["Dersin son taslağı", "Bologna denetim bulguları", "Varsa ders dosyası"],
    cikar: [
      "Öğrenci bilgi sistemindeki alan sırasıyla ders bilgi paketi (.docx); birden çok belge varsa .zip",
      "Akredit'in önerdiği her alan sarı zeminle ve Akredit önerisi yazısıyla işaretli",
      "Bulgular ve kaynakça (kanıtlar özetleriyle, başka kurum örnekleri ayrı başlıkta)",
    ],
    hoca: "Word'de düzenler ve geri yükler. Sistem alan alan farkı çıkarır, hocanın kendi kararı olarak kaydeder.",
    not: "Ders kodu, AKTS ve yetkililer Word'den değiştirilemez. Biçimi okunamayan değer (ör. değerlendirme yüzdesi) kaydedilmez ve hangi alan olduğu söylenir.",
  },
  {
    kimlik: "ders-dosyasi",
    durum: "pilotta",
    ad: "Ders dosyası",
    ozet: "Not dökümünden ve sınav belgelerinden ders dosyası çıkarır.", // İP-16
    girer: ["OBS not dökümü", "Sınav kâğıtları ve cevap anahtarı gibi belgeler"],
    cikar: ["Word biçiminde ders dosyası", "ÇK sonuçları", "Bir sonraki dönem için iyileştirme önerisi"],
    hoca: "Toplam üç adım: bir yükleme ve iki onay.",
    not: "Onaylanmamış dosyanın başında taslak olduğu yazar ve imza yeri boş kalır.",
  },
  {
    kimlik: "anket",
    durum: "yayinda",
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
    durum: "yayinda",
    ad: "Toplantı asistanı",
    ozet: "Danışma kurulu ve komisyon toplantılarını planlar.", // İP-18
    girer: ["Açık eylemler ve görevler", "Katılımcı listesi", "Toplantı notları"],
    cikar: ["Gündem (geciken işler önce)", "Takvim daveti", "Tutanak taslağı", "Kararlardan çıkan eylemler"],
    hoca: "Toplantıya katılır, tutanağı onaylar.",
    not: "Kayıtta adı geçmeyen kişi katıldı diye yazılmaz. Eylemin hedef tarihi yalnız karar metninde yazılıysa girer.",
  },
  {
    kimlik: "odr",
    durum: "yapimda",
    ad: "Öz değerlendirme raporu (ÖDR)",
    ozet: "Programın raporunu kanıttan, ölçmeden ve süreç kayıtlarından kurar.", // İP-19
    girer: ["Onaylı kanıt ve ölçüt bağları", "Ölçme sonuçları", "Süreç ve eylem kayıtları"],
    cikar: ["Ölçüt kapsama haritası", "Eksik analizi", "Atıflı rapor taslağı (Word)"],
    hoca: "Komisyon bölümleri onaylar. Son gönderimi yetkili kişi yapar.",
  },
  {
    kimlik: "kidr",
    durum: "yapimda",
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
    durum: "yayinda",
    ad: "Performans göstergeleri",
    ozet: "Stratejik plan ve faaliyet raporu göstergelerini veriden hesaplar.", // İP-21
    girer: ["Gösterge tanımı ve hedefi", "Bağlayıcı, anket ya da ölçme verisi", "Elle giriş (kanıt zorunlu)"],
    cikar: ["Dönem değeri, hedefe göre durum ve eğilim", "Her değerin kaynak izi"],
    hoca: "Hedefleri yönetim belirler.",
  },
  {
    kimlik: "surec",
    durum: "yayinda",
    ad: "Süreç takvimi",
    ozet: "Kalite döngülerini insan hatırlamadan yürütür.", // İP-14
    girer: ["Süreç tanımı: adımlar, son tarihler, gereken kanıt sayısı"],
    cikar: ["Görevler, hatırlatmalar, geciken işin üst kişiye bildirilmesi"],
    hoca: "Kendisine düşen görevi yapar.",
  },
  {
    kimlik: "degerlendirici",
    durum: "yayinda",
    ad: "Değerlendirici portalı",
    ozet: "Dış değerlendiriciye süreli, salt okunur bir kanıt odası açar.", // İP-22
    girer: ["Kurumun açtığı süreli değerlendirici hesabı (en çok 120 gün)"],
    cikar: ["Ölçüte göre düzenli kanıt odası", "Soru ve yanıt alanı", "Kurumun görebildiği erişim günlüğü"],
    hoca: "Bir şey yapmaz. Değerlendiricinin sorusunu ilgili kişi yanıtlar.",
  },
  {
    kimlik: "mobil",
    durum: "pilotta",
    ad: "Mobil onay",
    ozet: "Onay kutusu telefona uygulama gibi eklenir.", // İP-33
    girer: ["Bekleyen öneriler"],
    cikar: ["Telefonda onay listesi"],
    hoca: "Telefondan karar verir.",
    not: "Bağlantı yokken liste görülebilir ama karar verilemez. Karar, verildiği an adla ve zamanla kaydedilir.",
  },
  {
    kimlik: "arac",
    durum: "yayinda",
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
  { ad: "Kanıt", metin: "Belge ya da veri gelir. İçerik özetiyle saklanır. Değişirse yeni kayıt olur." },
  { ad: "Hesap", metin: "Sayılar ölçme motorunda belirlenimci olarak hesaplanır." },
  { ad: "Atıflı taslak", metin: "Yapay zekâ taslak yazar. Her olgusal cümle bir kanıta bağlanır." },
  { ad: "Denetim", metin: "Atıfsız cümle, dayanaksız sayı ve eksik kanıt işaretlenir." },
  { ad: "Onay", metin: "Yetkili kişi kanıtı görerek onaylar, düzeltir ya da reddeder." },
  {
    ad: "Günlük",
    metin: "Karar ad, zaman ve dayanakla günlüğe eklenir. Kayıt iz bırakmadan değiştirilemez.",
  },
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
    ad: "Kayıt iz bırakmadan değişmez",
    metin:
      "Kanıtın üzerine yazılmaz. Öneri, karar ve günlük kayıtları yalnız eklenir; her kayıt öncekinin özetini taşır. Düzeltme yeni kayıtla yapılır. KVKK silme talebinde kişiyi tanıtan eşleme silinir, silme de yeni kayıt olarak görünür.",
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
    gorur: "Kurumun bütün verisini ve karar günlüğünü.",
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

/** Rol başına karar yetkisi; ROL_EYLEMLERI ile aynıdır (site.test.ts denetler). */
export const ROL_KARARI: Record<string, string> = {
  kurum_yoneticisi:
    "Her şey: ayarlar, yapay zekâ anahtarı, kullanıcılar, roller, öneri kararı, dış gönderim, politika imzası.",
  kalite_komisyonu_baskani:
    "Öneriye karar verir, dış kuruma gönderir, yetki devri politikasını imzalar, kişi davet eder, rol atar.",
  kalite_komisyonu_uyesi: "Öneriye karar verir, rapor düzenler, kanıt yükler.",
  birim_kalite_sorumlusu: "Öneriye karar verir, süreç takvimini yönetir, birimine kişi davet eder.",
  program_sorumlusu: "Programındaki önerilere karar verir, rapor düzenler, not verisi girer.",
  ogretim_elemani: "Kendi dersindeki önerilere karar verir, belge yükler, not verisi girer.",
  degerlendirici: "Karar veremez. Açılan kapsamda kanıt, rapor ve ölçme sonucunu okur, soru sorar.",
  gozlemci: "Karar veremez. Kanıt ve raporu okur.",
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
      "Kanıtı olmayan olgusal cümle rapora girmez, EKSİK olarak işaretlenir. Sayılar modelden değil, hesaplamadan gelir. Rapor resmîleşmeden önce yetkili kişi onaylar.",
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
      "Kurumunuzu Kurumunuzu açın sayfasından açabilir, kurulum sihirbazıyla birim, program ve hocaları tanımlayabilirsiniz. Belge işleme, süreç hatırlatmaları ve düzenli eşitlemeler arka planda kendiliğinden çalışır. Geliştirme sürüyor: bağlayıcıları açma ve toplu belge yükleme ekranları henüz yok, bağlayıcılar canlı kurum sistemlerinde pilotla denenmedi.",
  },
  {
    soru: "Web araması nasıl çalışır, ne kadar tutar?",
    cevap:
      "Web araması OpenRouter'ın web arama aracıyla yapılır; arama motoru varsayılan olarak modelin kendi araması, yoksa Exa'dır. OpenRouter'ın belgesine göre (28 Ekim 2026) Exa ile istek başına 0,007 dolar ödenir, 10 sonuca kadar dahildir; model kullanım ücreti ayrıca yansır. Akredit bir aramada en çok 10 sonuç ister, kurum bu sınırı daha da düşürebilir. Ücret kurumun kendi OpenRouter hesabına yansır.",
  },
  {
    soru: "Başka üniversitelerin örnekleri kanıt yerine geçer mi?",
    cevap:
      "Hayır. Web aramasıyla bulunan sayfalar ayrı bir türde, kanıt değildir etiketiyle gösterilir. Kanıt kaydına giremez, ölçüte bağlanamaz ve rapora kanıt olarak giremez. Eksik giderme taslağında bu sayfaların metni kullanılmaz; yalnız kaynakçada adresleriyle listelenir.",
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

// ---------------------------------------------------------------- Bir dönem (örnek akış)

export interface DonemAdimi {
  zaman: string;
  sistem: string;
  hoca: string;
  /** Hocanın bu adımdaki dokunuş sayısı (yükleme ya da onay). */
  dokunus: number;
}

/**
 * Bir öğretim elemanının bir dönemi. Dayanak: docs/raporlar/IP-14 (süreç takvimi), IP-15 (Bologna),
 * IP-16 (ders dosyası: bir yükleme, iki onay), IP-17 (anket), IP-18 (toplantı), IP-19 ve IP-20 (ÖDR, KİDR).
 * Zamanlar örnektir; kurumun süreç takvimi belirler.
 */
export const DONEM_AKISI: DonemAdimi[] = [
  {
    zaman: "Dönem başı",
    sistem:
      "Dersin Bologna sayfasını okur ve kurallardan geçirir. Eksik ya da çelişkili alanları işaretler, düzeltilmiş taslak hazırlar.",
    hoca: "Taslağı onaylar. Sayfayı öğrenci bilgi sisteminde son kez kendisi kaydeder.",
    dokunus: 1,
  },
  {
    zaman: "Dönem içi",
    sistem:
      "Süreç takvimindeki son tarihleri izler ve hatırlatma gönderir. Gelen belgeleri kanıt olarak saklar, ölçüt etiketi önerir.",
    hoca: "Etiket önerilerini toplu onaylar ya da imzalı bir politikaya bırakır.",
    dokunus: 1,
  },
  {
    zaman: "Son haftalar",
    sistem: "Ders değerlendirme ve AKTS iş yükü anketlerini gönderir, hatırlatır, yanıtları analiz eder.",
    hoca: "Bir şey yapmaz.",
    dokunus: 0,
  },
  {
    zaman: "Notlardan sonra",
    sistem:
      "Soru bazlı not dökümünden ÇK ve PÇ sağlanma düzeyini hesaplar. Ders dosyasını Word biçiminde, atıflı olarak hazırlar.",
    hoca: "Not dökümünü bir kez yükler, ders dosyasını iki adımda onaylar.",
    dokunus: 3,
  },
  {
    zaman: "Komisyon toplantısı",
    sistem: "Gündemi geciken işler önde olacak biçimde kurar, daveti gönderir, notlardan tutanak taslağı yazar.",
    hoca: "Toplantıya katılır, tutanağı onaylar.",
    dokunus: 1,
  },
  {
    zaman: "Yıl sonu",
    sistem:
      "ÖDR ve KİDR bölümlerini onaylı kanıttan derler. Kanıtı olmayan alt ölçüte EKSİK yazar, olgunluk düzeyi önerir.",
    hoca: "Olgunluk düzeyine yetkili kişi tek tek karar verir. Bu karar devredilemez.",
    dokunus: 0,
  },
];

// ---------------------------------------------------------------- Bağlayıcılar

/** Her bağlayıcının okuduğu ve okumadığı. Dayanak: packages/baglayicilar/src/<ad>, docs/raporlar/IP-05.md, IP-23.md. */
export const BAGLAYICILAR: { ad: string; kaynak: string; okur: string; okumaz: string }[] = [
  {
    ad: "Bologna (Proliz)",
    kaynak: "bologna-proliz",
    okur: "Ders bilgi paketi sayfaları: program çıktıları, dersler, ders çıktıları, AKTS, dersi verenlerin adları.",
    okumaz: "Giriş gerektiren sayfalar. Yalnız herkese açık sayfa okunur.",
  },
  {
    ad: "OBS not aktarımı",
    kaynak: "not-aktarimi",
    okur: "Soru bazlı not dökümü (CSV ya da Excel). Öğrenci numarası takma ada çevrilir.",
    okumaz: "Ad, T.C. kimlik numarası ve e-posta sütunları.",
  },
  {
    ad: "UBYS ve diğer öğrenci bilgi sistemleri",
    kaynak: "ubys",
    okur: "Ders not listeleri, aynı takma ad kuralıyla.",
    okumaz: "Öğrencinin kimlik bilgileri.",
  },
  {
    ad: "YÖK Atlas",
    kaynak: "yokatlas",
    okur: "Program bilgileri: kontenjan, yerleşen sayısı, taban puan.",
    okumaz: "Kişiye ait bilgi.",
  },
  {
    ad: "AVESİS",
    kaynak: "avesis",
    okur: "Öğretim elemanlarının açık profil sayfalarındaki yayın ve proje bilgileri.",
    okumaz:
      "Parola, doğrulama kodu ya da çerez. Girişli alanlar yalnız kullanıcının kendi tarayıcısında açtığı oturumla okunur.",
  },
  {
    ad: "EBYS",
    kaynak: "ebys",
    okur: "e-Yazışma paketleri (.eyp): üst veri ve ekler.",
    okumaz: "Gizlilik dereceli paketler. Bunlar reddedilir.",
  },
  {
    ad: "E-posta",
    kaynak: "eposta",
    okur: "Kurumun bu iş için açtığı kutuya iletilen e-postaların ekleri.",
    okumaz: "E-postanın gövde metni.",
  },
  {
    ad: "Google Drive ve OneDrive",
    kaynak: "bulut",
    okur: "Yetki verilen klasördeki dosyalar. Erişim belirteci şifreli saklanır.",
    okumaz: "Parola. Bağlantı yalnız hesabın kendi yetkilendirme ekranıyla kurulur.",
  },
];

// ---------------------------------------------------------------- Vaat ve sorumluluk (İP-42)

/** Ana vaatin çerçevesi (docs/danismanlik/2026-10-28-dis-incelemeler.md, kurucu kararı 1 ve 2). */
export const VAAT_CERCEVESI = "Sıfır evrak angaryası, tam akademik irade.";

/** İşin bölümü: veri, hesap, yazım ve takip sistemde; pedagojik ve kurumsal karar insanda (ADR 0004). */
export const IS_BOLUMU: { alan: string; sistem: string; insan: string }[] = [
  {
    alan: "Veri toplama",
    sistem: "Kanıtı kurumun sistemlerinden ve gelen belgelerden toplar.",
    insan: "Belge aramaz, form doldurmaz.",
  },
  {
    alan: "Hesap",
    sistem: "ÇK ve PÇ düzeyini, not istatistiğini, göstergeleri hesaplar. Sayıyı model yazmaz.",
    insan: "Tablo kurmaz, formül yazmaz.",
  },
  {
    alan: "Yazım",
    sistem: "Ders sayfası, ders dosyası, tutanak ve rapor bölümünü kanıta bağlayarak yazar.",
    insan: "Taslağa bakar, kararını verir.",
  },
  {
    alan: "Takip",
    sistem: "Son tarihleri izler, hatırlatır, geciken işi sorumlusunun üstüne bildirir.",
    insan: "Hatırlatma peşinde koşmaz.",
  },
  {
    alan: "Karar",
    sistem: "Kararı hazırlar: kanıtı, farkı ve gerekçeyi tek ekranda gösterir.",
    insan: "Pedagojik ve kurumsal kararı verir. Bu karar her zaman insandadır.",
  },
];

/** Sorumluluk kutusu: CLAUDE.md değişmez ilke 3. */
export const SORUMLULUK =
  "Resmî beyan ve sorumluluk, onaylayan kurum yetkilisindedir. Akredit kurum adına beyanda bulunmaz ve dış kuruma kendiliğinden gönderim yapmaz. Her onay, onaylayanın adı, zamanı ve dayanağıyla kaydedilir.";

// ---------------------------------------------------------------- Dört rol (İP-42)

export interface KararRolu {
  kimlik: "rektorluk" | "kalite-komisyonu" | "bolum-baskani" | "ogretim-elemani";
  ad: string;
  /** Ana sayfadaki tek satırlık yönlendirme. */
  kisa: string;
  /** Rolün sorusu: bu rol Akredit'e hangi gözle bakar. */
  soru: string;
  maddeler: { baslik: string; metin: string }[];
  /** Bu role kalan karar. */
  karar: string;
  /** Sistemdeki karşılığı (@akredit/yetki ROLLER). */
  roller: string[];
}

/**
 * Dört karar verici rolün anlatımı (kurucu kararı 4). Dayanaklar: ADR 0004 (sıfır iş yükü), İP-14 (süreç),
 * İP-19/20 (ÖDR, KİDR), İP-28 ve İP-40 (KVKK), İP-34 (kurum içi kurulum), yetki tablosu (@akredit/yetki).
 */
export const DORT_ROL: KararRolu[] = [
  {
    kimlik: "rektorluk",
    ad: "Rektörlük",
    kisa: "Kurumsal risk, maliyet, KVKK ve denetlenebilirlik.",
    soru: "Kurumu riske atmadan bu işi nasıl yükten kurtarırım?",
    maddeler: [
      {
        baslik: "Kurumsal risk",
        metin:
          "Kurum adına beyan, olgunluk düzeyi ve dış kuruma gönderim hiçbir politikaya bağlanamaz. Her biri yetkili kişinin tek tek kararıdır.",
      },
      {
        baslik: "Maliyet",
        metin:
          "Yazılım ilk etapta ücretsizdir ve açık kaynaktır. Yapay zekâ ücreti kurumun kendi OpenRouter hesabına yansır, harcama sınırını kurum koyar. Kurum içi modelde bu ücret yoktur.",
      },
      {
        baslik: "KVKK",
        metin:
          "Öğrenci numarası takma ada çevrilir; ad ve kimlik numarası okunmaz. Kişisel veri, kurum izin vermedikçe yurt dışına gitmez. İzin verilirse maskelenerek gider.",
      },
      {
        baslik: "Denetlenebilirlik",
        metin:
          "Her öneri, karar ve politika günlüğe eklenir. Kayıt iz bırakmadan değiştirilemez; her değişiklik yeni kayıt olarak görünür. Kodu kurumun bilgi işlemi inceleyebilir.",
      },
      {
        baslik: "Kurum içi kurulum",
        metin:
          "Akredit kurumun kendi sunucusuna, kendi modeliyle kurulabilir. Bu kurulumda yapay zekâ işi kurumdan çıkmaz ve yurt dışı izni açılamaz.",
      },
    ],
    karar:
      "Hangi işlerin otomatik onaylanabileceğini kurum yönergesi belirler. Yetki devri politikasını yetkili kişi adıyla imzalar.",
    roller: ["kurum_yoneticisi"],
  },
  {
    kimlik: "kalite-komisyonu",
    ad: "Kalite komisyonu",
    kisa: "Ölçüt bazında kanıt envanteri, eksik takibi, KİDR ve BİDR.",
    soru: "Hangi ölçütün kanıtı var, hangisi eksik, kim kapatacak?",
    maddeler: [
      {
        baslik: "Kanıt envanteri",
        metin:
          "YÖKAK 3.3'ün her alt ölçütü için kayıtlı kanıtlar listelenir. Her kanıtın kaynağı, okunma zamanı ve içerik özeti yazılıdır.",
      },
      {
        baslik: "Eksik takibi",
        metin:
          "Kanıtı olmayan alt ölçüt EKSİK görünür. Eksik, süreç takviminde sorumlusu ve son tarihi olan bir işe dönüşür.",
      },
      {
        baslik: "KİDR ve BİDR",
        metin:
          "Rapor birimlerin onaylı kanıtlarından derlenir. Kanıtı olmayan olgusal cümle rapora girmez. Olgunluk düzeyi önerisi gelir.",
      },
      {
        baslik: "Yetki devri",
        metin:
          "Kanıt etiketi gibi düşük riskli işleri imzalı bir politikayla otomatik onaya bırakabilirsiniz. Politika da adla imzalanır ve günlüğe girer.",
      },
    ],
    karar: "Olgunluk düzeyine ve raporun son hâline yetkili kişi tek tek karar verir.",
    roller: ["kalite_komisyonu_baskani", "kalite_komisyonu_uyesi", "birim_kalite_sorumlusu"],
  },
  {
    kimlik: "bolum-baskani",
    ad: "Bölüm başkanı",
    kisa: "Her işin sorumlusu ve son tarihi, program akreditasyonu.",
    soru: "Programımda kim neyi ne zamana kadar yapacak?",
    maddeler: [
      {
        baslik: "Sorumlu ve son tarih",
        metin:
          "Her iş bir kişiye ve bir tarihe bağlıdır. Sistem hatırlatır. Geciken iş sorumlusunun üstüne, yani size bildirilir.",
      },
      {
        baslik: "Program akreditasyonu",
        metin:
          "Öz değerlendirme raporu program kanıtından, ölçme sonuçlarından ve süreç kayıtlarından kurulur. Ölçüt kapsama haritası ve eksik analizi gelir.",
      },
      {
        baslik: "Matris ve danışma kurulu",
        metin:
          "Ders ile program çıktısı matrisine kanıta dayalı katkı önerisi gelir, toplu onaylanır. Danışma kurulunun gündemi, daveti ve tutanak taslağı hazırlanır.",
      },
      {
        baslik: "Çerçeveler",
        metin:
          "YÖKAK çerçevesi resmî metinden yüklüdür. MÜDEK ve diğer program akreditasyonu çerçeveleri resmî belge alınınca eklenecek.",
      },
    ],
    karar: "Program raporunun bölümlerini onaylar. Son gönderimi yetkili kişi yapar.",
    roller: ["program_sorumlusu"],
  },
  {
    kimlik: "ogretim-elemani",
    ad: "Öğretim elemanı",
    kisa: "Ne yapmayacağınız ve ne zaman tek dokunuş gerektiği.",
    soru: "Bu dönem benden ne istenecek?",
    maddeler: [
      { baslik: "Bologna sayfası", metin: "Sıfırdan doldurmazsınız. Sistem okur, denetler, taslağı hazırlar." },
      {
        baslik: "Ders dosyası",
        metin: "Not listesi ve ÇK tablosu hazırlamazsınız. Not dökümünü bir kez yüklersiniz.",
      },
      { baslik: "Anketler", metin: "Anket göndermez, hatırlatma yazmazsınız. Sistem gönderir ve analiz eder." },
      { baslik: "Tutanak ve rapor", metin: "Tutanak ve rapor bölümü yazmazsınız. Taslak size onay için gelir." },
    ],
    karar: "Dersinizdeki önerilere kanıtı açık tek dokunuşla karar verirsiniz: onay, düzeltme ya da ret.",
    roller: ["ogretim_elemani"],
  },
];

// ---------------------------------------------------------------- Konum (İP-42)

/**
 * Akredit mevcut sistemlerin yerine geçmez, üstünde çalışır (kurucu kararı 7). Satırlar BAGLAYICILAR ve
 * İP-05, İP-23 raporlarındaki gerçek bağlantı biçimidir. Rakip ya da karşılaştırma iddiası yoktur.
 */
export const KONUM_TABLOSU: { sistem: string; baglanti: string; sinir: string }[] = [
  {
    sistem: "OBS ve Bologna (Proliz ya da benzeri)",
    baglanti: "Herkese açık ders bilgi paketi sayfaları okunur. Not dökümü CSV ya da Excel olarak alınır.",
    sinir: "Öğrenci bilgi sisteminde son kaydı yetkili kişi yapar.",
  },
  {
    sistem: "UBYS ve diğer öğrenci bilgi sistemleri",
    baglanti: "Ders not listeleri alınır, öğrenci numarası takma ada çevrilir.",
    sinir: "Kimlik bilgisi okunmaz.",
  },
  {
    sistem: "EBYS",
    baglanti: "e-Yazışma paketleri (.eyp) kanıt olarak alınır.",
    sinir: "Gizlilik dereceli paket reddedilir.",
  },
  {
    sistem: "AVESİS",
    baglanti: "Öğretim elemanlarının açık profillerindeki yayın ve proje bilgisi okunur.",
    sinir: "Parola ve oturum bilgisi alınmaz.",
  },
  {
    sistem: "YÖK Atlas",
    baglanti: "Kontenjan, yerleşen sayısı ve taban puan okunur.",
    sinir: "Kişiye ait bilgi okunmaz.",
  },
  {
    sistem: "Kurumun kalite yönetim yazılımı (ör. ÜNİKYS)",
    baglanti: "Bağlayıcı yok. Akredit onun yerine geçmez; ürettiği raporlar indirilerek kullanılır.",
    sinir: "Kurumun kendi sistemine yükleme kurum yetkilisinin işidir.",
  },
  {
    sistem: "E-posta, Google Drive, OneDrive",
    baglanti: "Kurumun açtığı kutuya iletilen ekler ve yetki verilen klasörler alınır.",
    sinir: "E-posta gövdesi ve parola alınmaz.",
  },
];

// ---------------------------------------------------------------- Yol haritası (İP-42)

/** plan.md §8, İP-38…49, sade dille. Dalga plan tablosundaki durumdan alınmıştır (2026-10-30). */
export const YOL_HARITASI: { no: number; ad: string; metin: string; dalga: "tamam" | "simdi" | "sonra" }[] = [
  {
    no: 38,
    ad: "Sessiz devir",
    metin:
      "Önceki dönemden değişmeyen ders bilgisi yeni döneme kendiliğinden taşınır. Onaylı bilgi, kurumun yazılı izniyle kaynağına geri yazılır.",
    dalga: "tamam",
  },
  {
    no: 39,
    ad: "Üç katmanlı karar",
    metin:
      "İşler üçe ayrılır: kendiliğinden yürüyen, süre dolunca onaylanmış sayılan ve mutlaka bir kişinin vereceği karar. Zorunlu karar kısa bir karar kartıyla verilir.",
    dalga: "tamam",
  },
  {
    no: 40,
    ad: "Kişisel veri ve hukuk paketi",
    metin:
      "Kişisel veri dışarı çıkmadan çalışma, KVKK veri akış envanteri, hukuk birimi için sözleşme paketi ve yetki devri yönergesi taslağı.",
    dalga: "tamam",
  },
  {
    no: 41,
    ad: "Örnek Üniversitesi",
    metin: "Uydurma veriyle kurulmuş bir örnek kurum. Her rolün ekranını hesap açmadan deneyebilirsiniz.",
    dalga: "tamam",
  },
  {
    no: 42,
    ad: "Site metni ve pilot başvurusu",
    metin: "Dört rolün anlatımı, mevcut sistemlerle ilişki ve pilot kurum başvurusu. Bu sayfa da bu işin parçası.",
    dalga: "tamam",
  },
  {
    no: 43,
    ad: "Sınav kâğıdı taraması",
    metin: "Sınav kâğıtları toplu taranır, soru bazlı puan çıkarılır. Yalnız kurum içindeki modelle çalışır.",
    dalga: "simdi",
  },
  {
    no: 44,
    ad: "Cümleden kanıta tek tık",
    metin: "Rapordaki bir cümleden kanıtına tek tıkla gidilir. Rapor dili ayrıca denetlenir.",
    dalga: "simdi",
  },
  {
    no: 45,
    ad: "Hesapsız belge isteme",
    metin: "İdari birimlerden, onlara hesap açmadan, tek kullanımlık bağlantıyla belge istenir.",
    dalga: "tamam",
  },
  {
    no: 46,
    ad: "Toplantıdan tutanağa",
    metin: "Toplantı kaydından tutanak taslağı ve EBYS yazısı taslağı hazırlanır.",
    dalga: "sonra",
  },
  {
    no: 47,
    ad: "Program akreditasyonu tabloları",
    metin: "MÜDEK, FEDEK, EPDAD ve SABAK tabloları kanıttan hazırlanır. Resmî belge alınmadan çerçeve eklenmez.",
    dalga: "simdi",
  },
  {
    no: 48,
    ad: "Saha ziyareti hazırlığı",
    metin: "Değerlendirici ziyaretine hazırlık: olası sorular ve her birinin kanıtı üzerinden prova.",
    dalga: "simdi",
  },
  {
    no: 49,
    ad: "Kendi yapay zekânızla",
    metin:
      "Herkese açık, hesapsız araç bağlantısı: YÖKAK ölçüt metni, Bologna denetimi, ÇK/PÇ hesabı ve rapor dil denetimi kendi yapay zekânızda.",
    dalga: "simdi",
  },
];

// ---------------------------------------------------------------- Pilot başvurusu (İP-42)

/** Formdaki rol seçenekleri; sunucu şeması da bu listeyi kullanır (src/pilot/basvuru.ts). */
export const PILOT_ROLLERI = [
  { deger: "rektorluk", ad: "Rektörlük" },
  { deger: "kalite_komisyonu", ad: "Kalite komisyonu ya da kalite birimi" },
  { deger: "bolum_baskani", ad: "Bölüm başkanı ya da program sorumlusu" },
  { deger: "ogretim_elemani", ad: "Öğretim elemanı" },
  { deger: "bilgi_islem", ad: "Bilgi işlem" },
  { deger: "diger", ad: "Diğer" },
] as const;

/** Pilotla başlanacak süreç; plan.md §3 süreç kataloğundan. */
export const PILOT_SURECLERI = [
  { deger: "bologna", ad: "Bologna ders bilgi paketi" },
  { deger: "ders_dosyasi", ad: "Ders dosyası ve ÇK, PÇ ölçme" },
  { deger: "anket", ad: "Paydaş anketleri" },
  { deger: "toplanti", ad: "Danışma kurulu ve komisyon toplantıları" },
  { deger: "odr", ad: "Program öz değerlendirme raporu" },
  { deger: "kidr", ad: "BİDR ve KİDR" },
  { deger: "diger", ad: "Henüz karar vermedik" },
] as const;
