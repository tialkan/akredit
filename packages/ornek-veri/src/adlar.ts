// Örnek Üniversitesi'nin adları. Hepsi uydurmadır: kurum adı "Örnek Üniversitesi", kişi soyadları açıkça
// kurgu sözcüklerdir (Örnek, Deneme, Kurgu...). Ders ve program adları genel alan adlarıdır; hiçbir kurumun
// resmî ders kataloğundan alınmamıştır.

export const KURUM_ADI = "Örnek Üniversitesi";
export const KURUM_KISA_ADI = "ÖRNEK";

/** Kişi soyadları: bilerek kurgu olduğu ilk bakışta anlaşılan sözcükler. */
export const UYDURMA_SOYADLAR = [
  "Örnek",
  "Deneme",
  "Kurgu",
  "Taslak",
  "Sentetik",
  "Uydurma",
  "Varsayım",
  "Prototip",
  "Benzetim",
  "Model",
] as const;

export const ADLAR = [
  "Ayşe",
  "Mert",
  "Selin",
  "Emre",
  "Zeynep",
  "Can",
  "Elif",
  "Burak",
  "Deniz",
  "Ece",
  "Kerem",
  "Nil",
  "Onur",
  "Pelin",
  "Tolga",
  "Yasemin",
] as const;

export const UNVANLAR = ["Prof. Dr.", "Doç. Dr.", "Dr. Öğr. Üyesi", "Öğr. Gör."] as const;

export interface ProgramTanimi {
  anahtar: string;
  ad: string;
  kodOneki: string;
  /** Program çıktılarında geçen alan adı ("bilgisayar mühendisliği alanında"). */
  alan: string;
  dersler: readonly string[];
}

export interface FakulteTanimi {
  anahtar: string;
  ad: string;
  kod: string;
  programlar: readonly ProgramTanimi[];
}

export const FAKULTELER: readonly FakulteTanimi[] = [
  {
    anahtar: "muh",
    ad: "Mühendislik ve Doğa Bilimleri Fakültesi",
    kod: "MDBF",
    programlar: [
      {
        anahtar: "blm",
        ad: "Bilgisayar Mühendisliği",
        kodOneki: "BLM",
        alan: "bilgisayar mühendisliği",
        dersler: [
          "Programlamaya Giriş",
          "Ayrık Matematik",
          "Veri Yapıları",
          "Sayısal Tasarım",
          "Algoritma Analizi",
          "Veri Tabanı Sistemleri",
          "İşletim Sistemleri",
          "Bilgisayar Ağları",
          "Yazılım Mühendisliği",
          "Biçimsel Diller ve Otomatlar",
          "Yapay Öğrenmeye Giriş",
          "Bitirme Projesi",
        ],
      },
      {
        anahtar: "ins",
        ad: "İnşaat Mühendisliği",
        kodOneki: "INS",
        alan: "inşaat mühendisliği",
        dersler: [
          "Statik",
          "Mukavemet",
          "Yapı Malzemesi",
          "Akışkanlar Mekaniği",
          "Zemin Mekaniği",
          "Yapı Statiği",
          "Betonarme",
          "Hidrolik",
          "Ulaştırma Planlaması",
          "Çelik Yapılar",
          "Temel İnşaatı",
          "Mesleki Tasarım Projesi",
        ],
      },
      {
        anahtar: "mat",
        ad: "Matematik",
        kodOneki: "MAT",
        alan: "matematik",
        dersler: [
          "Analiz I",
          "Analiz II",
          "Lineer Cebir",
          "Soyut Matematik",
          "Diferansiyel Denklemler",
          "Olasılık",
          "Cebir",
          "Reel Analiz",
          "Sayısal Analiz",
          "Topoloji",
          "Kompleks Analiz",
          "Matematik Seminerleri",
        ],
      },
      {
        anahtar: "mbg",
        ad: "Moleküler Biyoloji ve Genetik",
        kodOneki: "MBG",
        alan: "moleküler biyoloji ve genetik",
        dersler: [
          "Genel Biyoloji",
          "Genel Kimya",
          "Hücre Biyolojisi",
          "Organik Kimya",
          "Biyokimya",
          "Genetik",
          "Mikrobiyoloji",
          "Moleküler Biyoloji",
          "Biyoistatistik",
          "Gen Teknolojileri",
          "Biyoinformatiğe Giriş",
          "Araştırma Projesi",
        ],
      },
    ],
  },
  {
    anahtar: "iib",
    ad: "İktisadi ve İdari Bilimler Fakültesi",
    kod: "IIBF",
    programlar: [
      {
        anahtar: "ikt",
        ad: "İktisat",
        kodOneki: "IKT",
        alan: "iktisat",
        dersler: [
          "İktisada Giriş",
          "Matematiksel İktisat",
          "Mikro İktisat",
          "Makro İktisat",
          "İstatistik",
          "Ekonometri",
          "Para Teorisi",
          "Uluslararası İktisat",
          "Kamu Maliyesi",
          "Kalkınma İktisadı",
          "İktisadi Düşünce Tarihi",
          "Uygulamalı İktisat Semineri",
        ],
      },
      {
        anahtar: "isl",
        ad: "İşletme",
        kodOneki: "ISL",
        alan: "işletme",
        dersler: [
          "İşletme Bilimine Giriş",
          "Genel Muhasebe",
          "Pazarlama İlkeleri",
          "Örgütsel Davranış",
          "Maliyet Muhasebesi",
          "Finansal Yönetim",
          "Üretim Yönetimi",
          "İnsan Kaynakları Yönetimi",
          "Pazarlama Araştırması",
          "Stratejik Yönetim",
          "Girişimcilik",
          "İşletme Uygulama Projesi",
        ],
      },
      {
        anahtar: "kmy",
        ad: "Kamu Yönetimi",
        kodOneki: "KMY",
        alan: "kamu yönetimi",
        dersler: [
          "Kamu Yönetimine Giriş",
          "Siyaset Bilimi",
          "Anayasa Hukuku",
          "Yönetim Tarihi",
          "İdare Hukuku",
          "Yerel Yönetimler",
          "Kamu Politikası",
          "Karşılaştırmalı Kamu Yönetimi",
          "Kentleşme ve Çevre",
          "Kamu Personel Yönetimi",
          "Sosyal Politika",
          "Kamu Yönetimi Semineri",
        ],
      },
    ],
  },
  {
    anahtar: "sag",
    ad: "Sağlık Bilimleri Fakültesi",
    kod: "SBF",
    programlar: [
      {
        anahtar: "hem",
        ad: "Hemşirelik",
        kodOneki: "HEM",
        alan: "hemşirelik",
        dersler: [
          "Anatomi",
          "Fizyoloji",
          "Hemşirelik Esasları",
          "Mikrobiyoloji ve Enfeksiyon",
          "İç Hastalıkları Hemşireliği",
          "Farmakoloji",
          "Cerrahi Hastalıkları Hemşireliği",
          "Kadın Sağlığı Hemşireliği",
          "Çocuk Sağlığı Hemşireliği",
          "Ruh Sağlığı Hemşireliği",
          "Halk Sağlığı Hemşireliği",
          "Hemşirelikte Yönetim",
        ],
      },
      {
        anahtar: "bsd",
        ad: "Beslenme ve Diyetetik",
        kodOneki: "BSD",
        alan: "beslenme ve diyetetik",
        dersler: [
          "Beslenme İlkeleri",
          "Genel Kimya",
          "Besin Kimyası",
          "Fizyoloji",
          "Anne ve Çocuk Beslenmesi",
          "Toplu Beslenme Sistemleri",
          "Besin Mikrobiyolojisi",
          "Hastalıklarda Diyet Tedavisi",
          "Toplum Beslenmesi",
          "Beslenme Eğitimi",
          "Sporcu Beslenmesi",
          "Mesleki Uygulama",
        ],
      },
      {
        anahtar: "ftr",
        ad: "Fizyoterapi ve Rehabilitasyon",
        kodOneki: "FTR",
        alan: "fizyoterapi ve rehabilitasyon",
        dersler: [
          "Anatomi",
          "Fizyoloji",
          "Kinesiyoloji",
          "Biyomekanik",
          "Elektroterapi",
          "Egzersiz Fizyolojisi",
          "Ortopedik Rehabilitasyon",
          "Nörolojik Rehabilitasyon",
          "Kardiyopulmoner Rehabilitasyon",
          "Pediatrik Rehabilitasyon",
          "Sporcu Sağlığı",
          "Klinik Uygulama",
        ],
      },
    ],
  },
];

/** Ders öğrenme çıktısı kalıpları ({ders} dersin adıyla doldurulur). Akredit'in kendi örnek metnidir. */
export const OC_KALIPLARI = [
  "{ders} konusundaki temel kavramları açıklar.",
  "{ders} yöntemlerini verilen bir probleme uygular.",
  "{ders} kapsamında elde ettiği sonuçları yorumlar.",
  "{ders} ile ilgili bir çalışmayı yazılı olarak raporlar.",
] as const;

/** Program çıktısı kalıpları ({alan} program alanıyla doldurulur). */
export const PC_KALIPLARI = [
  "{alan} alanının temel kuramsal bilgisini kullanır.",
  "{alan} alanında bir problemi tanımlar ve çözüm yöntemi seçer.",
  "Veri toplar, çözümler ve sonuçlarını yorumlar.",
  "Ekip içinde ve disiplinler arası çalışır.",
  "Yazılı ve sözlü olarak etkili iletişim kurar.",
  "Mesleki ve etik sorumluluk bilinciyle davranır.",
] as const;
