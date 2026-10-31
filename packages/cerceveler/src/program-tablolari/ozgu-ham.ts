// BU DOSYA BELGELERDEN ÇIKARILDI, ELLE YAZILMADI (İP-47). Metinler kaynaklar/resmi/ altındaki resmî belgelerin
// @akredit/belge metinCikar çıktısından (boşluklar tekleştirilmiş, sayfa üst bilgisi silinmiş) kesilmiştir.
// EPDAD göstergelerinde sütun sınırları PDF'deki sözcük konumlarından (pdfplumber) bulundu, metin yine
// metinCikar çıktısından alındı. Her öğe test/program-ozgu-resmi.test.ts ile kaynak sayfada birebir aranır.
// Sayfa: PDF dosyasının fiziksel sayfa numarası (1'den başlar).

export interface OzguKonuHam {
  metin: string;
  sayfa: number;
  /** Belgedeki alt başlık (ör. "Ortak Konular:"); yoksa konu bölümün tamamı için geçerlidir. */
  grup?: string;
}

export interface OzguBolumHam {
  kod: string;
  baslik: string;
  giris: string;
  sayfa: number;
  konular: readonly OzguKonuHam[];
}

export interface GostergeHam {
  altStandart: string;
  no: number;
  metin: string;
  sayfa: number;
  /**
   * Dört düzey tanımı, sırasıyla İleri Düzeyde, Oldukça Gelişmiş, Gelişmeye Açık, Başlangıç Düzeyinde.
   * null: satır iki sayfaya bölündüğü ya da hücre sınırı belgeden güvenle ayrılamadığı için alınmadı.
   */
  duzeyler: readonly [string, string, string, string] | null;
}

/** MÜDEK lisans 3.1, II. EK-1 giriş notu (s. 11). */
export const MUDEK_EK1_NOT = {
  metin:
    "Not: Bu ekte değişik disiplinlerdeki programların eğitim planlarında yer alması beklenen disipline özgü konular yer almaktadır. Bu konular eğitim planında ayrı birer ders kapsamında yer alabilecekleri gibi, değişik derslerin içinde kapsanan konular arasında da yer alabilir.",
  sayfa: 11,
} as const;

/** MÜDEK lisans 3.1, II. EK-1 Disipline Özgü Eğitim Planı Konuları (s. 11-23). */
export const MUDEK_LISANS_3_1_EK1_HAM: readonly OzguBolumHam[] = [
  {
    kod: "bilgisayar-yazilim",
    baslik: "BİLGİSAYAR, YAZILIM VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      'Bu eğitim planı konuları adında “bilgisayar”, “yazılım”, “yapay zekâ" ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.',
    sayfa: 11,
    konular: [
      {
        metin:
          "Ayrık matematik, doğrusal cebir ve türevsel denklemleri kapsayan ileri matematik, disipline özgü uygulamaları da içeren olasılık ve istatistik; deneysel çalışmaları ile fizik,",
        sayfa: 11,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Algoritma analizi, yazılım geliştirme süreçleri, karmaşık veri yapıları, veri saklama (depolama: veritabanı, bellek konuları karmaşık sistemlerin yazılım ve donanımlarının analizi ya da tasarımı konuları.",
        sayfa: 11,
        grup: "Ortak Konular:",
      },
      {
        metin: "Laboratuvar uygulamaları ile desteklenen sayısal sistem tasarımı konuları.",
        sayfa: 11,
        grup: "Adında “bilgisayar” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Gereksinim analizi, doğrulaması, sınaması, yönetimi, testi gibi tüm aşamalarını da içeren gereksinim mühendisliği,",
        sayfa: 11,
        grup: "Adında “yazılım” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Yazılım mimarisi,",
        sayfa: 11,
        grup: "Adında “yazılım” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Yazılım kalite güvencesi, karmaşık yazılım sistemlerinin doğrulanması, sınanması ve yönetimi süreçlerini de kapsayan uygulamalar içeren meslek konuları.",
        sayfa: 11,
        grup: "Adında “yazılım” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Yapay zekâ kuramsal temelleri,",
        sayfa: 11,
        grup: 'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      },
      {
        metin: "Veri bilimi, büyük veri analitiği, veri madenciliği,",
        sayfa: 11,
        grup: 'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      },
      {
        metin: "Doğal dil işleme, pekiştirmeli öğrenme, derin öğrenme,",
        sayfa: 11,
        grup: 'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      },
      {
        metin: "Bilgisayarlı görü, öneri sistemleri,",
        sayfa: 11,
        grup: 'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      },
      {
        metin: "Yapay zekâ yönetişimi.",
        sayfa: 11,
        grup: 'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      },
    ],
  },
  {
    kod: "biyomuhendislik-biyomedikal",
    baslik:
      "BİYOMÜHENDİSLİK, BİYOMEDİKAL VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları, adında “biyomühendislik”, “biyomedikal”, “genetik ve biyomühendislik” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 11,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik, genel kimya, biyoloji ve fizyoloji,",
        sayfa: 12,
      },
      {
        metin:
          "Mühendislik bilgilerinin, biyolojik sınırlamalar ve etik ilkeler gözetilerek yaşam bilimleri alanına uygulanma konuları,",
        sayfa: 12,
      },
      {
        metin:
          "Canlı sistemler ve bunlardan elde edilen biyolojik materyaller (organeller, dokular, plazmidler, virüsler, enzimler, vb.) üzerinde ölçüm konuları,",
        sayfa: 12,
      },
      {
        metin:
          "Canlı ve cansız malzemeler ve sistemler arasındaki biyouyumluluk, biyotoksisite, biyoyararlanım, biyobüzünürlük ve benzeri etkileşim konuları.",
        sayfa: 12,
      },
    ],
  },
  {
    kod: "cevre",
    baslik: "ÇEVRE VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “çevre” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 12,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya; çevre kimyası, yer bilimi (jeoloji, meteoroloji, toprak bilimi gibi), biyoloji (çevre mikrobiyolojisi, çevre biyolojisi, ekoloji, toksikoloji gibi) konuları,",
        sayfa: 12,
      },
      {
        metin:
          "Termodinamik, akışkanlar mekaniği ve hidrolik, çevre mühendisliğinin temel odaklanma alanları olan su, hava ve yer sistemleri alanlarında, ilgili çevre sorunlarını, etkilerini ve kontrolünü de kapsayan, ayrıca bu temel odaklanma alanlarının en az birinde derinlik sağlayan mesleki eğitim konuları,",
        sayfa: 12,
      },
      {
        metin:
          "Çevre Mühendisliğinin temel odaklanma alanlarının en az birinde derinlik sağlayacak laboratuvar uygulamaları,",
        sayfa: 12,
      },
      {
        metin:
          "Sürdürülebilirlik, yaşam döngüsü ilkeleri, kaynak verimliliği, çevresel etkiler ve değerlendirmesi gibi konular,",
        sayfa: 12,
      },
      {
        metin: "Kamu ve özel kuruluşların çevre yönetimi uygulamalarındaki sorumluluklarıyla ilgili konular.",
        sayfa: 12,
      },
    ],
  },
  {
    kod: "deri",
    baslik: "DERİ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      'Bu eğitim planı konuları adında "deri" ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.',
    sayfa: 12,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve kimya;",
        sayfa: 12,
      },
      { metin: "Mekanik, mukavemet, malzeme ve termodinamik,", sayfa: 12 },
      {
        metin: "Deri teknolojisi ve malzemeleri alanında ürün, süreç veya sistem analizi ve tasarlama konular,",
        sayfa: 12,
      },
      {
        metin:
          "Deri üretim süreçleri ile kullanılan malzemelere ilişkin değişkenlerin ölçülmesi, kontrol edilmesi ve değerlendirilmesi konuları,",
        sayfa: 12,
      },
      {
        metin:
          "Deri, tabaklama, finisaj deri makinaları, deri konfeksiyon, ayakkabı ve saraciye gibi temel teknolojik alanların en az birinde uygulamaları da içeren konular.",
        sayfa: 12,
      },
    ],
  },
  {
    kod: "elektrik-elektronik",
    baslik: "ELEKTRİK, ELEKTRONİK VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “elektrik”, “elektronik”, “haberleşme”, “telekomünikasyon”, “kontrol” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 13,
    konular: [
      {
        metin:
          "Doğrusal cebir ve türevsel denklemler konularını kapsayan ileri matematik, disipline özgü uygulamaları da içerecek biçimde olasılık ve istatistik, ayrık matematik, kompleks değişkenler; her biri deneysel çalışmaları da içeren mekanik ve elektrik fiziği;",
        sayfa: 13,
        grup: "Ortak Konular:",
      },
      {
        metin: "Elektrik devreleri, elektromanyetik kuramı, ayrık-zaman işaretleri konuları.",
        sayfa: 13,
        grup: "Ortak Konular:",
      },
      {
        metin: "Elektrik ve elektromekanik enerji dönüşümü.",
        sayfa: 13,
        grup: "Adında “elektrik” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Sayısal elektronik.",
        sayfa: 13,
        grup: "Adında “elektronik” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Sayısal haberleşme.",
        sayfa: 13,
        grup: "Adında “haberleşme” ya da “telekomünikasyon” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Sayısal kontrol ve kontrol sistem tasarımı.",
        sayfa: 13,
        grup: "Adında “kontrol” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "endustri",
    baslik: "ENDÜSTRİ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “endüstri” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 13,
    konular: [
      {
        metin:
          "Türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; deneysel çalışmaları da içeren fizik,",
        sayfa: 13,
      },
      {
        metin:
          "İnsan, malzeme, bilgi, teçhizat ve enerji içeren bütünleşmiş sistemlerin tasarlanması, geliştirilmesi, uygulanması ve iyileştirilmesi konuları,",
        sayfa: 13,
      },
      {
        metin:
          "Sistem entegrasyonunu sağlamaya yönelik, uygun bilgisayar ve yazılım teknolojilerini de içeren analitik ve deneysel yöntemler ile hesaplama yöntemleri konuları,",
        sayfa: 13,
      },
      {
        metin:
          "Yöneylem araştırması, mühendislik ekonomisi, sistem benzetimi/, üretim ve operasyonların planlanması ve yönetimi konuları.",
        sayfa: 13,
      },
    ],
  },
  {
    kod: "enerji",
    baslik: "ENERJİ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      'Bu eğitim planı konuları adında "enerji", “enerji sistemleri”, “nükleer enerji” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.',
    sayfa: 14,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 14,
        grup: "Ortak Konular:",
      },
      {
        metin: "Termodinamik, kütle ve enerji denklikleri, ısı ve kütle transferi, akışkanlar mekaniği.",
        sayfa: 14,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Enerji sistemleri için güç elektroniği uygulamaları, enerji sistemlerinde ölçme, izleme ve kontrol teknolojileri, elektrik makinaları,",
        sayfa: 14,
        grup: "Adında “enerji sistemleri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Fosil ve yenilenebilir kaynaklardan enerjinin verimli bir biçimde üretilmesi, iletimi, dağıtımı ve tüketimi,",
        sayfa: 14,
        grup: "Adında “enerji sistemleri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Enerji sistemlerinde teknoloji-çevre-ekonomi ilişkilerini ve geleceğe yönelik öngörüleri içeren modelleme ve analiz konuları,",
        sayfa: 14,
        grup: "Adında “enerji sistemleri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "En az bir tür (güneş, rüzgâr, biyo, jeotermal, dalga, foto-voltaik veya termal, hidrolik, nükleer gibi) enerji sistemini tasarlama veya analiz konuları,",
        sayfa: 14,
        grup: "Adında “enerji sistemleri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Akıllı şebeke, enerji yönetimi, enerji ekonomisi, enerji politikaları, karbon ticareti gibi konulardan en az biri.",
        sayfa: 14,
        grup: "Adında “enerji sistemleri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Atom ve çekirdek fiziği ile radyasyonun madde ile taşınımı ve etkileşimi,",
        sayfa: 14,
        grup: "Adında “nükleer enerji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Nükleer sistem ve süreçler, ulusal ve uluslararası nükleer mevzuat,",
        sayfa: 14,
        grup: "Adında “nükleer enerji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Nükleer yakıt (Uranyum-Toryum) çevrimi, nükleer atık yönetimi,",
        sayfa: 14,
        grup: "Adında “nükleer enerji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Nükleer ve radyoaktif süreçlerin denetimi, ölçümü ve izlenmesi.",
        sayfa: 14,
        grup: "Adında “nükleer enerji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "fizik",
    baslik: "FİZİK VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “fizik” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 14,
    konular: [
      {
        metin:
          "Doğrusal cebir ve türevsel denklemler konularını kapsayan ileri matematik, olasılık ve istatistik, kompleks değişkenler; her biri deneysel çalışmaları da içeren fizik ve genel kimya.",
        sayfa: 14,
      },
      { metin: "Klasik mekanik, elektromanyetik, kuantum fiziği ve istatistiksel termodinamik,", sayfa: 14 },
      {
        metin:
          "Aşağıda gruplanmış alanlardan en az birisinde mühendislik problemlerinin analizi ve çözümü konuları: o Yoğun madde fiziği, yarı iletkenler fiziği, ince film teknolojisi, üstün iletkenlik, malzeme fiziği ve nanoteknoloji ve benzeri konular, o Sağlık fiziği, görüntüleme fiziği, biyofizik, radyasyon fiziği, nükleer bilimler ve teknoloji, x-ışınları, NMR ve ESR spektroskopisi, IR spektroskopisi ve benzeri konular, o Hesaplamalı fizik, sayısal çözümleme-modelleme ve simülasyon teknikleri, kuantum mühendisliği, kalite kontrol sistemleri, iletişim sistemleri, yüksek enerji ve plazma fiziği, hızlandırıcı fiziği, parçacık fiziği ve benzeri konular, o Optik, optoelektronik, fotonik, lazer fiziği, kuantum optik, akustik ve benzeri konular.",
        sayfa: 14,
      },
    ],
  },
  {
    kod: "gemi-deniz",
    baslik: "GEMİ, DENİZ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “gemi inşaatı”, “deniz” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 15,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik, olasılık ve istatistik, kompleks değişkenler; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 15,
      },
      { metin: "Gemi inşaatı,", sayfa: 15 },
      {
        metin: "Deniz araçları kapsamında hesaplamalı akışkanlar dinamiği ve benzetim içeren akışkanlar mekaniği,",
        sayfa: 15,
      },
      { metin: "Deniz araçları kapsamında dinamik, yapısal mekanik,", sayfa: 15 },
      { metin: "Gemi yardımcı makinaları,", sayfa: 15 },
      { metin: "Gemi direnci ve sevki,", sayfa: 15 },
      { metin: "Gemi elektriği ve elektroniği,", sayfa: 15 },
      {
        metin: "Deniz araçlarına ilişkin kompozit ve çevre dostu malzemeleri de içeren malzeme özellikleri,",
        sayfa: 15,
      },
      { metin: "Deniz araçları kapsamında hibrit ve elektrikli sistemleri de kapsayacak sevk sistemleri,", sayfa: 15 },
      { metin: "Gemi inşaatı ve deniz mühendisliğine ilişkin cihazlar.", sayfa: 15 },
    ],
  },
  {
    kod: "gemi-makinalari-isletme",
    baslik: "GEMİ MAKİNALARI İŞLETME ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “gemi makinaları işletme” nitelemesi bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 15,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 15,
      },
      { metin: "Deniz araçları kapsamında akışkanlar mekaniği, dinamik, yapısal mekanik,", sayfa: 15 },
      { metin: "Deniz araçları kapsamında sevk sistemleri,", sayfa: 15 },
      { metin: "Deniz hukuku ve uluslararası denizcilik sözleşmeleri", sayfa: 15 },
      {
        metin: "Gemi makinaları, gemi makinaları operasyonu ve bakımı, gemi yardımcı makinaları, makine elemanları",
        sayfa: 15,
      },
      { metin: "Gemi elektriği ve otomasyonu,", sayfa: 15 },
      { metin: "Gemi makina dairesi kaynakları yönetimi ve simülatör uygulamaları,", sayfa: 15 },
      { metin: "Deniz araçları kapsamında ısı transferi, termodinamik", sayfa: 16 },
      { metin: "Deniz araçlarına ilişkin malzeme özellikleri.", sayfa: 16 },
    ],
  },
  {
    kod: "geomatik-harita",
    baslik: "GEOMATİK, HARİTA VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “geomatik”, “harita”, “jeodezi”, “fotogrametri” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 16,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik, olasılık ve istatistik, kompleks değişkenler; mekânsal istatistik, veri analizi ve modelleme; mekanik, dalga, optik ve elektromanyetizma konuları başta olmak üzere deneysel çalışmaları ile fizik",
        sayfa: 16,
      },
      {
        metin:
          "Ülkemizde gerçekleştirilen mühendislik çalışmalarında gereken nitelikleri karşılayacak derecede, aşağıdaki alanların en az dördünde derinlik: o Mühendislik ölçmeleri konuları, o Fotogrametri ve uzaktan algılama konuları, o Jeodezi, jeodezik ölçmeler ve ülke ölçmeleri konuları, o Projeksiyon ve koordinat sistemleri ile haritacılık, o Veri bilimi ve coğrafi bilgi sistemleri, o İmar ve kadastro uygulamaları konuları, o Taşınmaz değerleme/geliştirme konuları.",
        sayfa: 16,
      },
    ],
  },
  {
    kod: "gida",
    baslik: "GIDA VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “gıda” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 16,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik; her biri deneysel çalışmaları da içeren fizik ve genel kimya; temel biyoloji; organik kimya konularını içeren ileri kimya,",
        sayfa: 16,
      },
      {
        metin: "Tepkime kinetiği, kütle ve enerji denklikleri, akışkanlar mekaniği, ısı ve kütle transferi,",
        sayfa: 16,
      },
      { metin: "Bilişim sistemleri, veri analizi, süreç yönetimi ve kontrolu,", sayfa: 16 },
      { metin: "Gıda standartları, gıda güvenliği yönetimi,", sayfa: 16 },
      { metin: "İleri gıda işleme teknolojileri; biyoteknolojik uygulamalar,", sayfa: 16 },
      { metin: "Gıda işleme sistemleri uygulama ve tasarlama konuları.", sayfa: 16 },
    ],
  },
  {
    kod: "havacilik",
    baslik: "HAVACILIK VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “havacılık”, “uçak”, “uzay” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 17,
    konular: [
      {
        metin:
          "Türevsel denklemler konularını kapsayan ileri matematik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 17,
        grup: "Ortak Konular:",
      },
      {
        metin: "Havacılık veya uzay sistemlerinin entegrasyonuna ve kontrolüne yönelik tasarım konuları.",
        sayfa: 17,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Yörünge mekaniği, uzay çevresi, konum belirlenmesi ve denetim, telekomünikasyon, uzay yapıları ve roket itkisi konuları.",
        sayfa: 17,
        grup: "Adında “uzay” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Aerodinamik, havacılıkta kullanılan malzemeler, yapılar, itki, uçuş mekaniği, kararlılık ve kontrol konuları.",
        sayfa: 17,
        grup: "Adında “havacılık” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Yukarıda belirtilen alanlardan birine ilişkin tüm ve diğer alana ilişkin konulardan en az ikisi.",
        sayfa: 17,
        grup: "Adında “havacılık ve uzay” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "imalat",
    baslik: "İMALAT VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “imalat” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 17,
    konular: [
      {
        metin:
          "Türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 17,
      },
      { metin: "Malzeme bilgisi ve üretim süreçleri,", sayfa: 17 },
      { metin: "Montaj süreçleri ve bağlantı elemanları,", sayfa: 17 },
      { metin: "Ürün tasarımı ve imalatı için gereken alet, teçhizat ve çevre koşulları konuları,", sayfa: 17 },
      { metin: "İmalatta rekabet: imalat planlaması, stratejisi ve denetimi konuları,", sayfa: 17 },
      { metin: "İmalat sistemleri tasarımı konuları,", sayfa: 17 },
      { metin: "İstatistik ve ileri matematiğe dayalı yöntemlerle benzetim konuları,", sayfa: 17 },
      {
        metin: "Bilgi teknolojilerinden yararlanarak imalat işlemlerinin analiz, sentez ve kontrolü konuları,",
        sayfa: 17,
      },
      {
        metin:
          "Bir imalat laboratuvarında imalat süreci değişkenlerini ölçme ve süreç hakkında teknik çıkarımlar yapma konularında laboratuvar çalışmaları.",
        sayfa: 17,
      },
    ],
  },
  {
    kod: "insaat",
    baslik: "İNŞAAT VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “inşaat” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 18,
    konular: [
      {
        metin:
          "Türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; sayısal yöntemler; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 18,
      },
      {
        metin: "Statik, mukavemet, yapı mekaniği, akışkanlar mekaniği, zemin mekaniği, malzeme bilimi ve mekaniği,",
        sayfa: 18,
      },
      {
        metin:
          "İnşaat mühendisliğinin, hidrolik, yapı ve zemin mekaniği uzmanlık alanlarına ek olarak, ulaştırma; su kaynakları; kıyı ve deniz; yapı malzemeleri ile yapı yönetimi uzmanlık alanlarından ikisini de içerecek biçimde, en az toplam 5 uzmanlık alanına ilişkin meslek konuları,",
        sayfa: 18,
      },
      {
        metin:
          "Şantiye yönetiminin kavram ve prensiplerinin açıklandığı konular; teklif verme ve iş alma süreçleri, modern teknoloji ve yeni nesil üretim tekniklerini de içeren bir projeyi tamamlamak için tasarımcı ve uygulayıcıların nasıl etkileştikleri gibi uygulama konuları,",
        sayfa: 18,
      },
      { metin: "İnşaat Mühendisliğinde sürdürülebilirlik ve afetlere karşı dayanıklılık konuları,", sayfa: 18 },
      {
        metin: "İnşaat mühendisliğinin yapı, zemin ve hidrolik alanlarının her birinde laboratuvar uygulamaları.",
        sayfa: 18,
      },
    ],
  },
  {
    kod: "jeofizik",
    baslik: "JEOFİZİK VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “jeofizik” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 18,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 18,
      },
      { metin: "Malzeme, statik, mukavemet, jeoloji, hidrojeoloji ve jeomekanik,", sayfa: 18 },
      {
        metin:
          "Aşağıdaki hususlardan en az birini içerecek mühendislik problemlerine çözümler tasarlamak için gereken mühendislik meslek konuları: o Yer kabuğundaki maddelerin fiziksel ve kimyasal özelliklerinin dağılımı (hidrojeoloji dahil), o Yüzeyde ve yüzey yakınlarında gerçekleşen doğal süreçlerin etkileri, o İnşaat projelerinin, doğal kaynakların aranması ve kullanılmasının, atık sistemlerinin ve diğer etkinliklerin yer kabuğundaki maddeler ve süreçler üzerindeki etkileri.",
        sayfa: 18,
      },
      {
        metin:
          "Deprem ve doğal afetler, zemin, çevre ve mühendislik yapıları ile ilgili sorunlar ile doğal kaynaklar ve arkeolojik eserlerin aranması ile ilgili sorunların gravite, manyetik, elektrik, elektromanyetik, sismik, sismolojik ve kuyu logları gibi, jeofiziğin ana yöntemleri ile çözülmesi, sayısal analiz, sinyal analizi ve modelleme konuları; küresel konumlama (GPS) konuları, bu bilgileri jeofizik veri toplama, veri işleme ve yorumlama amacı ile kaynaştırma, jeofizik yazılımlarını kullanma ve etütlerini tasarlama konuları.",
        sayfa: 18,
      },
    ],
  },
  {
    kod: "jeoloji-hidrojeoloji",
    baslik: "JEOLOJİ, HİDROJEOLOJİ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “jeoloji”, “hidrojeoloji” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 19,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 19,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Kimyasal denge ve kinetik, akışkanlar mekaniği, malzeme özellikleri, statik, mukavemet, jeoloji, hidrojeoloji ve jeomekanik,",
        sayfa: 19,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Jeolojik süreçleri, kayaç oluşturan mineraller ile kayaçların mikroskop altında laboratuvar ve saha ölçeğinde tanımlanmasını vurgulayan jeoloji bilimi konuları, stratigrafi ilkeleri ve yöntemlerine ilişkin paleontoloji ve diğer yaş tayini yöntemlerini de içeren konular.",
        sayfa: 19,
        grup: "Ortak Konular:",
      },
      {
        metin:
          "Jeoloji mühendisliğinin inşaat, maden, jeoarkeoloj, jeofizik disiplinlerinin en az biri ile etkileşimini içeren tasarım konuları.",
        sayfa: 19,
        grup: "Adında “jeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Kütle enerji dengeleri, üç fazlı ortamlarda, (gaz, sıvı ve katı) kirleticilerin değişim/dönüşümü ve taşınımı,",
        sayfa: 19,
        grup: "Adında “hidrojeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Araştırma, gözlem/izleme, üretim, depolama, susuzlaştırma vb. amaçlı kuyuların yer seçimi ve tasarımı ile kuyuları delme, geliştirme, tamamlama ve testlerine ilişkin süreçler,",
        sayfa: 19,
        grup: "Adında “hidrojeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Akifer/yeraltısuyu sistemlerinin geliştirmesi ve sürdürülebilir yönetimini sağlamak için “yeraltısuyu rezervuar mühendisliği” ilkelerinin ve uygulamalarının kullanımı,",
        sayfa: 19,
        grup: "Adında “hidrojeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Kentsel, tarımsal ve susuzlaştırma amaçlı projelerin tasarlanarak su ihtiyaçlarının hesaplanması ve debi-düşüm analizleri,",
        sayfa: 19,
        grup: "Adında “hidrojeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Hidrolojik analizler ve hidrojeolojik modelleme (yeraltısuyu akım ve taşınım modelleri) araçları konuları.",
        sayfa: 19,
        grup: "Adında “hidrojeoloji” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "kimya",
    baslik: "KİMYA VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “kimya” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 19,
    konular: [
      {
        metin:
          "Türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya; fiziksel ve organik kimya gibi ileri kimya konuları.",
        sayfa: 19,
      },
      {
        metin:
          "Kimyasal süreçlere ilişkin kütle ve enerji denklikleri, kimyasal süreçlerde güvenlik ve çevresel etkiler, fiziksel ve kimyasal denge termodinamiği, ısı, kütle ve momentum transferi konuları, kimyasal reaksiyon mühendisliği, sürekli ve kademeli ayırma işlemleri, süreç dinamiği ve kontrolü ile süreç tasarımını da içeren temel mühendislik ve mühendislik meslek konuları.",
        sayfa: 19,
      },
      {
        metin:
          "Isı, kütle ve momentum transferi ile kimyasal reaksiyon mühendisliği konularını da içerecek biçimde kimya mühendisliği laboratuvar çalışması.",
        sayfa: 20,
      },
      {
        metin: "Temel biyoloji,",
        sayfa: 20,
        grup: "Adında “biyoloji” geçen “kimya mühendisliği” nitelemesi bulunan programları için yukarıdaki konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Programın eğitim amaçlarına uygun biyolojik bilimler (örneğin; biyokimya, moleküler biyoloji, vb.) konuları,",
        sayfa: 20,
        grup: "Adında “biyoloji” geçen “kimya mühendisliği” nitelemesi bulunan programları için yukarıdaki konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Mühendisliğin biyolojik sistemlere uygulamaları.",
        sayfa: 20,
        grup: "Adında “biyoloji” geçen “kimya mühendisliği” nitelemesi bulunan programları için yukarıdaki konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "maden",
    baslik: "MADEN VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “maden” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 20,
    konular: [
      {
        metin:
          "Türevsel denklemleri de kapsayan ileri matematik, maden mühendisliği problemlerine uygulanabilen olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 20,
      },
      {
        metin:
          "Maden yataklarının karakterizasyonu, fiziksel jeoloji, yapısal ya da mühendislik jeolojisi ve mineral ve kayaçları tanıma ve özellikleri gibi jeoloji konuları,",
        sayfa: 20,
      },
      {
        metin:
          "Statik, dinamik, mukavemet, akışkanlar mekaniği, termodinamik ve elektrik devrelerini içeren mühendislik konuları,",
        sayfa: 20,
      },
      {
        metin:
          "Madencilik yöntemleri, planlama zemin kontrolü, kaya mekaniği, iş sağlığı ve güvenliği, çevre sorunları, elleçleme ve maden havalandırması konularını içerecek biçimde yüzey ve yeraltı madenciliği ile ilgili mühendislik tasarımı konuları,",
        sayfa: 20,
      },
      {
        metin:
          "Program eğitim amaçlarına uygun olarak delme-patlatma, cevher veya kömür hazırlama, maden topoğrafyası, maden değerlemesi ve kaynak/rezerv tahmini, maden sürdürülebilirliği ve maden otomasyonu konuları,",
        sayfa: 20,
      },
      {
        metin:
          "Jeolojik kavramlar, kaya mekaniği, maden havalandırması ve programın eğitim amaçlarına uygun diğer mühendislik konularında laboratuvar uygulamaları.",
        sayfa: 20,
      },
    ],
  },
  {
    kod: "makina",
    baslik: "MAKİNA VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “makina” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 20,
    konular: [
      {
        metin:
          "Çok değişkenli matematik, türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; genel kimya, deneysel çalışmaları ile fizik;",
        sayfa: 20,
      },
      { metin: "Isıl sistemler tasarımı konuları,", sayfa: 20 },
      { metin: "Mekanik sistemler tasarımı konuları.", sayfa: 20 },
    ],
  },
  {
    kod: "mekatronik",
    baslik: "MEKATRONİK VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      'Bu eğitim planı konuları adında "mekatronik" ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.',
    sayfa: 21,
    konular: [
      {
        metin:
          "Çok değişkenli matematik, türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, kompleks değişkenler, istatistik ve en iyileme (optimizasyon); deneysel çalışmaları ile fizik;",
        sayfa: 21,
      },
      { metin: "Sensör ve eyleyici teknolojileri,", sayfa: 21 },
      { metin: "Bilgisayar ve yazılım ile yapay zekâ konuları,", sayfa: 21 },
      { metin: "Kontrol teorisi,", sayfa: 21 },
      { metin: "Mekatronik sistemler, bilgisayar kontrollü elektromekanik sistemler,", sayfa: 21 },
      { metin: "Akıllı ve otonom sistemlerle ilgili algoritmalar,", sayfa: 21 },
      {
        metin:
          "Çevresi ile iletişim ve etkileşim sağlayabilen akıllı mühendislik sistemlerini tasarlama, gerçekleştirme ve kullanma konuları.",
        sayfa: 21,
      },
    ],
  },
  {
    kod: "metalurji-malzeme",
    baslik: "METALURJİ, MALZEME VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “malzeme”, “metalurji”, “seramik” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 21,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 21,
      },
      { metin: "Temel termodinamik ilkeler ve alana özgü termodinamik bilgiler,", sayfa: 21 },
      { metin: "Malzeme sistemleri (metal, seramik ve polimer malzemeler),", sayfa: 21 },
      {
        metin:
          "Alanla ilgili olarak malzeme sistemlerinin dört temel konusu: yapıları, özellikleri, üretim/imalat süreçleri ve performansları,",
        sayfa: 21,
      },
      { metin: "Malzeme sistemlerinin test ve karakterizasyon teknikleri,", sayfa: 21 },
      { metin: "Alanla ilgili olarak bilgisayar destekli analiz ve tasarım yöntemleri,", sayfa: 21 },
      {
        metin: "Malzeme sistemlerinin dört temel konusunda uygulamaya yönelik malzeme seçimi ve tasarım konuları.",
        sayfa: 21,
      },
    ],
  },
  {
    kod: "orman-orman-endustri",
    baslik: "ORMAN, ORMAN ENDÜSTRİ VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      'Bu eğitim planı konuları, adında "orman mühendisliği", "orman endüstri mühendisliği" ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.',
    sayfa: 21,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya.",
        sayfa: 21,
        grup: "Ortak Konular:",
      },
      {
        metin: "Ekolojik, biyolojik, silvikültürel, teknik, sosyo-ekonomik, hukuki ve yönetsel konular,",
        sayfa: 22,
        grup: "Adında “orman” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Orman kaynakları ve ilgili ekosistem hizmetleri konuları,",
        sayfa: 22,
        grup: "Adında “orman” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Bilgisayar destekli analiz yöntemleri ve modelleme konuları,",
        sayfa: 22,
        grup: "Adında “orman” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Sürdürülebilir orman yönetimi ve planlaması konuları,",
        sayfa: 22,
        grup: "Adında “orman” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "İklim değişikliğinin orman ve biyolojik çeşitliliğe etkileri konuları.",
        sayfa: 22,
        grup: "Adında “orman” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Ahşap, kâğıt ve lignoselüloz esaslı malzemelerin anatomik, fiziksel, kimyasal, mekanik ve diğer teknolojik özellikleri, karantina uygulamaları, kullanım ömrünün artırılması ve ahşap kültürel mirasın sürdürülebilirliği kapsamında koruma teknolojisi konuları,",
        sayfa: 22,
        grup: "Adında “orman endüstri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Odun ve odun dışı orman ürünlerinin işleme teknolojileri, depolanması ve standardizasyonu,",
        sayfa: 22,
        grup: "Adında “orman endüstri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Ahşap, kâğıt ve lignoselüloz esaslı malzemelerin özelliklerini ve üretim süreçlerindeki değişkenleri ölçebilme, kontrol edebilme ve teknik olarak yorumlayabilme ve üretim sürecinde olan değişkenleri ve bu malzemelerin davranış özelliklerine olan etkilerini değerlendirme konuları,",
        sayfa: 22,
        grup: "Adında “orman endüstri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Ahşap, kâğıt ve lignoselüloz temelli ürünler ile odun dışı orman ürünlerinin üretimi ve değerlendirilmesi ile ilgili tasarım, planlama, kontrol, yönetim ve işletmeciliğin gerektirdiği teknik, ekonomik, sosyal, kültürel, etik ve yasal boyutlarla ilgili konular.",
        sayfa: 22,
        grup: "Adında “orman endüstri” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "otomotiv",
    baslik: "OTOMOTİV VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “otomotiv” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 22,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 22,
      },
      { metin: "Malzemelerin yapıları ve özellikleri,", sayfa: 22 },
      { metin: "Dinamik, yapısal mekanik, akışkanlar mekaniği, ısı transferi,", sayfa: 22 },
      { metin: "Elektronik ve kontrol konuları.", sayfa: 22 },
      {
        metin:
          "Taşıt ve taşıt elemanları tasarımı, ürün geliştirme sistematiği, taşıt dinamiği, taşıt tahrik ve güç sistemleri konuları,",
        sayfa: 22,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Elektrikli araç tasarım prensipleri, araç ve batarya yönetim sistemleri, güvenliği ve çevresel etkiler,",
        sayfa: 22,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Otonom araç tasarımı, donanım ve yazılımı, güvenliği, sensörler ve yapay zekâ kullanımı konuları,",
        sayfa: 22,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Otomotiv alanındaki teknik mevzuat (fonksiyonel ve siber güvenlik konuları dahil) ve taşıt doğrulama testleri konuları,",
        sayfa: 22,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin:
          "Kuramsal, deneysel ve benzetim yöntemleri ile bilgisayar destekli tasarım tekniklerinin otomotiv mühendisliği alanında kullanımı konuları,",
        sayfa: 23,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
      {
        metin: "Üretim teknolojileri, yalın üretim, akıllı üretim, prototip ve eklemeli imalat konuları.",
        sayfa: 23,
        grup: "Adında “otomotiv” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      },
    ],
  },
  {
    kod: "petrol",
    baslik: "PETROL VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “petrol”, “doğalgaz” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 23,
    konular: [
      {
        metin:
          "Türevsel denklemleri kapsayan ileri matematik, olasılık ve istatistik; sayısal analiz, her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 23,
      },
      { metin: "Petrol jeolojisi, uygulama çalışmaları içeren genel jeoloji,", sayfa: 23 },
      {
        metin: "Akışkanlar mekaniği, statik, mukavemet, termodinamik ve mühendisler için bilgisayar programlama,",
        sayfa: 23,
      },
      {
        metin:
          "Kuyu açma, kuyu tamamlama, kuyu tasarımı ve kuyu kontrolüne yönelik sistem ve süreçlerin analizi ve tasarımı konuları,",
        sayfa: 23,
      },
      {
        metin:
          "Akışkan enerji kaynakları içeren formasyonların değerlendirilmesi konuları (kayaç örnek analizi, zaman değişimli basınç analizleri kuyu kayıtlama, vb.),",
        sayfa: 23,
      },
      {
        metin:
          "Rezervuar akışkanlarının üretilmesi, enjeksiyonu, arıtılması ve taşınması için gereken sistemlerin analiz ve tasarımı ile üretim eniyileme (optimizasyon) konuları,",
        sayfa: 23,
      },
      {
        metin:
          "Rezervuar mühendisliği ilkeleri ve yöntemleri kullanılarak akışkan enerji kaynaklarının saha geliştirilmesi, üretim ve rezervuar izleme ve kurtarım eniyilemesi teknikleri konuları,",
        sayfa: 23,
      },
      {
        metin:
          "Petrol varlıkları değerlemesi yöntemlerini kullanarak risk ve belirsizlik ortamlarında güvenlik ve çevresel etkileri de gözeterek tasarım yapma ve karar vermeye yönelik konular.",
        sayfa: 23,
      },
    ],
  },
  {
    kod: "tekstil",
    baslik: "TEKSTİL VE BENZERİ ADLI MÜHENDİSLİK PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI",
    giris:
      "Bu eğitim planı konuları adında “tekstil” ve benzeri nitelemeler bulunan programlar içindir. Eğitim planı, adında geçen mühendislik alanı yelpazesi içerisinde genişlik ve derinlik sağlayacak biçimde olmalı ve aşağıdaki konuları kapsamalıdır.",
    sayfa: 23,
    konular: [
      {
        metin:
          "Türevsel denklemler ve doğrusal cebir konularını kapsayan ileri matematik, olasılık ve istatistik; her biri deneysel çalışmaları da içeren fizik ve genel kimya;",
        sayfa: 23,
      },
      { metin: "Mekanik, mukavemet, malzeme ve termodinamik,", sayfa: 23 },
      {
        metin: "Tekstil malzemeleri ve teknolojisi alanlarında ürün, süreç veya sistem tasarlama konuları,",
        sayfa: 23,
      },
      {
        metin:
          "Tekstil malzemelerinin özelliklerini ve üretim süreçlerindeki değişkenleri ölçebilme, kontrol edebilme ve teknik olarak yorumlama konuları,",
        sayfa: 23,
      },
      { metin: "Tekstil ürünleri üretim süreçleri konuları,", sayfa: 23 },
      {
        metin:
          "Elyaf, iplik, kumaş, terbiye ve konfeksiyon gibi temel teknolojik alanların en az birinde uygulamaları da içeren konular.",
        sayfa: 23,
      },
    ],
  },
];

/** FEDEK 4.1, II. Programa Özgü Ölçütler (s. 7-17). */
export const FEDEK_4_1_PROGRAMA_OZGU_HAM: readonly OzguBolumHam[] = [
  {
    kod: "alman-dili-ve-edebiyati",
    baslik: "ALMAN DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Alman Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 7,
    konular: [
      { metin: "Alman Tarihi ve Alman Dili ve Edebiyatının geçirdiği gelişim süreci hakkında bilgili olma;", sayfa: 7 },
      {
        metin:
          "Alman Dili ve Edebiyatı alanındaki güncel bilgileri içeren ders kitapları, uygulama araç- gereçleri ve diğer kaynaklarda desteklenen ileri düzeydeki kuramsal ve uygulamalı bilgilere sahip olma; bu bilgileri kullanabilme; bunlar aracılığıyla verileri yorumlayabilme, değerlendirebilme, analiz edebilme;",
        sayfa: 7,
      },
      {
        metin:
          "Avrupa kültür ve medeniyet tarihinde önemli sanat anlayışları, Rönesans, Reform ve Aydınlanma çağı hakkında bilgi sahibi olma;",
        sayfa: 7,
      },
      { metin: "Diğer Avrupa dillerinden biri hakkında yeterli bilgiye sahip olma;", sayfa: 7 },
      {
        metin:
          "Edebi metinlerin çözümlenmesi ve edebi metinlere eleştirel yaklaşım, dil eğitimi ve öğretimi gibi alanlarda yeterli bilgiye sahip olma;",
        sayfa: 7,
      },
      { metin: "Almancanın ses bilimi, morfolojik, semantik, etimolojik özellikleri hakkında yeterli olma;", sayfa: 7 },
      {
        metin:
          "Alman Dili ve Edebiyatı araştırmalarında bilgi toplama, sınıflandırma, analiz ve güvenilir yazılar oluşturma süreçleri hakkında yeterli olma;",
        sayfa: 7,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 7 },
    ],
  },
  {
    kod: "amerikan-kultur-ve-edebiyati",
    baslik: "AMERİKAN KÜLTÜR VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Amerikan Kültür ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 7,
    konular: [
      {
        metin: "Kuruluşundan günümüze Amerika Birleşik Devletleri’nin tarihsel gelişimi hakkında bilgi sahibi olma;",
        sayfa: 7,
      },
      {
        metin:
          "Amerikan Kültürü ve Edebiyatı alanındaki güncel bilgileri içeren ders kitapları, uygulama araç- gereçleri ve diğer kaynaklarda desteklenen ileri düzeydeki kuramsal ve uygulamalı bilgilere sahip olma; bu bilgileri kullanabilme; bunlar aracılığıyla verileri yorumlayabilme, değerlendirebilme, analiz edebilme;",
        sayfa: 7,
      },
      { metin: "İngiliz Kültürü Edebiyatı ve Tarihi hakkında bilgi sahibi olma;", sayfa: 7 },
      {
        metin:
          "Amerikan edebiyat ve kültür tarihinin dönem ve akımlarını, tarihsel, felsefi, dinsel, toplumsal, sanatsal ve politik geleneklerin oluşumu ve günümüze değin gelişimini kavrama;",
        sayfa: 7,
      },
      {
        metin:
          "Edebiyat türlerinin belirgin özelliklerini tanıyabilme ve ilgili edebiyat gelenekleriyle ilişkilendirme;",
        sayfa: 7,
      },
      {
        metin:
          "Edebiyat ve kültür ürünlerine eleştiri kuramları ışığı altında bakabilme ve bu metinleri uygun terminolojiyi kullanarak inceleyebilme;",
        sayfa: 7,
      },
      { metin: "Sözlü iletişim becerilerini sunum ve grup çalışmalarında ortaya koyabilme;", sayfa: 7 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 7 },
    ],
  },
  {
    kod: "antropoloji",
    baslik: "ANTROPOLOJİ",
    giris:
      "Bu program ölçütleri, başlığında “Antropoloji” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 7,
    konular: [
      { metin: "Antropolojinin uygulama alanları hakkında bilgi sahibi olma;", sayfa: 7 },
      { metin: "Biyolojik ve sosyokültürel antropoloji hakkında bilgi sahibi olma;", sayfa: 7 },
      {
        metin:
          "Geçmişte ve günümüzde toplumlar arasındaki kültürel ve biyolojik çeşitlilikleri anlama ve yorumlayabilme;",
        sayfa: 7,
      },
      {
        metin: "Gerek teorik gerekse saha pratiği açısından tam bir kaynaştırıcı ve açıklayıcı donanıma sahip olma;",
        sayfa: 8,
      },
      {
        metin:
          "Antropoloji kuramlarını bilme ve araştırma geleneği kapsamında teorik çerçeve/zemin hazırlama düşünce ve yeteneğine sahip olma;",
        sayfa: 8,
      },
      {
        metin:
          "Kalitatif araştırma yöntemleri ve analizler hakkında bilgi sahibi olma; insan ve kültür ilişkisine etnosentrik bakmama, tüm kültürlere ve içerdiği insan ilişkilerine üstün bir bakış açısı ile yaklaşmadan saygı, merak ve anlayışla yaklaşma;",
        sayfa: 8,
      },
      { metin: "Sosyal proje geliştirme, proje teklifi hazırlama ve sunma bilgisine sahip olma;", sayfa: 8 },
      {
        metin:
          "Antropolojinin disiplinler arası nitelikte bir bilim dalı olduğunun kabulünde, çok disiplinli çalışma gruplarına katılabilme;",
        sayfa: 8,
      },
      {
        metin:
          "Bibliyografya ve arşiv kaynakları gibi bilgiye ulaşım araçlarını kullanabilme ve uygun şekilde kataloglama becerisi;",
        sayfa: 8,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 8 },
    ],
  },
  {
    kod: "arap-dili-ve-edebiyati",
    baslik: "ARAP DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Arap Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 8,
    konular: [
      {
        metin:
          "Dili, sözlü ve yazılı olarak etkin kullanabilme ve mesleğini icra ederken etik kurallara riayet etme sorumluluğu;",
        sayfa: 8,
      },
      {
        metin:
          "İnternet ve bilgisayar vasıtasıyla Arapça basın dilini kavrayabilme, gündemi Arapça yayınlardan takip edebilme;",
        sayfa: 8,
      },
      {
        metin: "Arap coğrafyasının, kültür ve medeniyetinin kavranması konusunda dijital ortamdan yararlanabilme;",
        sayfa: 8,
      },
      {
        metin:
          "Arap Edebiyatının bilinen en eski döneminden günümüze kadar geçirmiş olduğu tarihî ve edebî evreleri hakkında gerekli kültürel donanıma sahip olma;",
        sayfa: 8,
      },
      {
        metin: "Arap Tarihi ve Arap Dili ve Edebiyatının geçirdiği gelişim süreci hakkında bilgi sahibi olma.",
        sayfa: 8,
      },
      { metin: "Arapçanın ses bilimi, morfolojik, semantik, etimolojik özelliklerini kavrayabilme;", sayfa: 8 },
      { metin: "Edebi metinlerin çözümlenmesi ve değerlendirilmesi hususunda yeterli olma;", sayfa: 8 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 8 },
    ],
  },
  {
    kod: "arkeoloji",
    baslik: "ARKEOLOJİ",
    giris:
      "Bu program ölçütleri, başlığında “Arkeoloji” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 8,
    konular: [
      {
        metin:
          "Paleolitik’ten başlayarak Anadolu başta olmak üzere Mezopotamya, İran, Kafkasya, Balkanlar, Ege Dünyası ve Doğu Akdeniz çevre kültürlerinin tarih ve kültürleri hakkında bilgi sahibi olma;",
        sayfa: 8,
      },
      { metin: "Arkeolojik terminolojiyi kullanabilme;", sayfa: 8 },
      { metin: "Arkeolojik sorunların farkında olma;", sayfa: 8 },
      { metin: "Anadolu ve çevre kültür bölgelerinde sözlü ve yazılı olarak kullanılmış dilleri tanıma;", sayfa: 8 },
      {
        metin:
          "Bireysel ya da kolektif çalışma yeteneğinin yanı sıra araştırmayı disiplinler arası bilgiyle destekleyebilme;",
        sayfa: 8,
      },
      {
        metin:
          "Sistemli bir araştırma yürütebilme; arkeolojik buluntuları, tasvirleri ya da belgeleri değerlendirebilme, sınıflandırabilme, karşılaştırabilme uygun şekilde kataloglarda sunabilme;",
        sayfa: 8,
      },
      {
        metin:
          "Kazı, yüzey araştırması gibi belirli bir alan çalışmasında buluntuları sistemli olarak toplayabilme ve belgeleyebilme;",
        sayfa: 8,
      },
      {
        metin: "Arkeolojik buluntu ya da kalıntıların restorasyonu ve/veya korunmasına ilişkin bilgi sahibi olma;",
        sayfa: 8,
      },
      {
        metin:
          "Arkeolojik buluntuların depolanması, korunması, sergilenmesi ve tanıtılmasına ilişkin çağdaş müzecilik yöntemleri hakkında bilgi sahibi olma;",
        sayfa: 8,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 8 },
    ],
  },
  {
    kod: "astronomi-ve-uzay-bilimleri",
    baslik: "ASTRONOMİ VE UZAY BİLİMLERİ",
    giris:
      "Bu program ölçütleri, başlığında “Astronomi ve Uzay Bilimleri” nitelemesi bulunan programlar için geçerlidir. Doğası gereği, lisans astronomi eğitim-öğretimi; yoğun biçimde matematik ve fizik derslerinin alınmasını gerekli kılmaktadır. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 9,
    konular: [
      { metin: "Program için gerekli, Temel Fizik ve Lab., Temel Kimya ve Lab.;", sayfa: 9 },
      { metin: "Temel Matematik Dersleri ( Matematik I ve II, Lineer Cebir);", sayfa: 9 },
      { metin: "Bilgisayar Programlama;", sayfa: 9 },
      { metin: "Astrofizik I ve II;", sayfa: 9 },
      {
        metin:
          "Astronomi I ve II; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte; Atom ve Molekül Fiziği, Yüksek Enerji Fiziği, Lineer Cebir, Analitik Geometri, Diferansiyel Denklemler, Olasılık-İstatistik, Güneş Fiziği, Güneş Sistemi, Gök Mekaniği, Çift Yıldızlar, Değişen Yıldızlar, Gökadalar, Yıldızlararası Madde, Yüksek Enerji Astrofiziği, Uzun Dalgaboyu Astrofiziği, Yıldızların İç Yapısı, Yıldızların Evrimi, Gözlem Teknikleri, Veri İndirgenmesi ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle ve Bitirme Tezi/Seminer ile alınacak bilgiler.",
        sayfa: 9,
      },
    ],
  },
  {
    kod: "bilgi-ve-belge-yonetimi",
    baslik: "BİLGİ VE BELGE YÖNETİMİ",
    giris:
      "Bu program ölçütleri, başlığında “Bilgi ve Belge Yönetimi” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 9,
    konular: [
      {
        metin:
          "Bilgi ve belge yönetimi, bilişim, kütüphanecilik, arşivcilik, dokümantasyon, bilgi teknolojileri gibi alanlarda ileri düzeyde kuramsal ve uygulamalı bilgilere ve becerilere sahip olma;",
        sayfa: 9,
      },
      {
        metin:
          "Yazılı, basılı ve elektronik ortamlarda yayımlanan bilgi birikiminden bireysel, örgütsel ve toplumsal bağlamda en üst düzeyde yararın sağlanması için uygun bilgi sistemlerini tasarlayabilme;",
        sayfa: 9,
      },
      {
        metin:
          "Kullanıcıların bilgi gereksinimlerini karşılamak için bilgi teknolojilerinden de yararlanarak bilgi kaynaklarını keşfedebilme, tanımlama, düzenleyebilme, sınıflayabilme, hizmete sunabilme ve bu tür hizmetler veren kütüphane, arşiv, bilgi merkezi ve müzeleri yönetebilme;",
        sayfa: 9,
      },
      {
        metin:
          "İlgili alanlardaki sorunları saptayabilme, bu sorunları çözmek için veri toplayabilme, analiz edebilme, yorumlayabilme ve çözüm önerileri sunabilme;",
        sayfa: 9,
      },
      {
        metin:
          "Bilgi arama, bulma, değerlendirme, düzenleme, kullanma, yönetme ve bilgi/bilgisayar/medya okuryazarlığı bilgi ve becerilerine sahip olma;",
        sayfa: 9,
      },
      { metin: "Eleştirel düşünme, analiz ve sentez yapma becerilerine sahip olma;", sayfa: 9 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 9 },
    ],
  },
  {
    kod: "bilgisayar-bilimleri",
    baslik: "BİLGİSAYAR BİLİMLERİ",
    giris:
      "Bu program ölçütleri, başlığında “Bilgisayar Bilimleri” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 9,
    konular: [
      { metin: "Algoritma;", sayfa: 9 },
      { metin: "Bilgisayar Mimarisi;", sayfa: 9 },
      { metin: "İşletim Sistemleri;", sayfa: 9 },
      { metin: "Bilgisayar Ağları;", sayfa: 9 },
      { metin: "Veri yapıları;", sayfa: 9 },
      { metin: "Bilgisayar Programlama;", sayfa: 9 },
      { metin: "Veri tabanı;", sayfa: 9 },
      { metin: "Sistem Analizi ve Tasarımı;", sayfa: 9 },
      { metin: "Veri Madenciliği;", sayfa: 10 },
      { metin: "Yapay Zeka;", sayfa: 10 },
      { metin: "Bilgi Güvenliği;", sayfa: 10 },
      { metin: "Bilişim Hukuku;", sayfa: 10 },
      {
        metin:
          "Bilişim Etiği; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, Özgür Yazılım Felsefesi, Makine Öğrenmesi, Görüntü İşleme, Sinyal İşleme, Bilgisayarlı Görü, Metin Madenciliği, İnsan Bilgisayar Etkileşimi, Dijital Dönüşüm, Doğal Dil İşleme, Sürdürülebilir Bilişim, Mantık ve Bilgisayar, Algoritmik Düşünme ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 10,
      },
    ],
  },
  {
    kod: "biyoloji",
    baslik: "BİYOLOJİ",
    giris:
      "Bu program ölçütleri, başlığında “Biyoloji” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 10,
    konular: [
      {
        metin:
          "Program için gerekli Temel Matematik, Temel Fizik ve Laboratuvarı, Temel Kimya ve Laboratuvarı, Organik Kimya ve Laboratuvarı;",
        sayfa: 10,
      },
      { metin: "Hayvan ve bitki morfoloji, anatomi ve fizyolojisi;", sayfa: 10 },
      { metin: "Hücre biyolojisi;", sayfa: 10 },
      { metin: "Ekoloji;", sayfa: 10 },
      { metin: "Biyometri;", sayfa: 10 },
      { metin: "Genetik;", sayfa: 10 },
      { metin: "Evrim;", sayfa: 10 },
      { metin: "Biyokimya;", sayfa: 10 },
      { metin: "Mikrobiyoloji;", sayfa: 10 },
      {
        metin:
          "Bitki ve hayvan sistematiği; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, hayvan davranışı, bitki sosyolojisi, biyoçeşitlilik, çevre biyolojisi, bağışıklık, nörobiyoloji, viroloji, endokrinoloji, biyomedikal malzeme, bulaşıcı hastalıklar, beslenme, rekombinant DNA teknikleri, klinik biyokimya, moleküler farmakoloji, biyoteknoloji, ornitoloji, sulak alanlar ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 10,
      },
    ],
  },
  {
    kod: "cografya",
    baslik: "COĞRAFYA",
    giris:
      "Bu program ölçütleri, başlığında “Coğrafya” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 10,
    konular: [
      {
        metin: "Yerel coğrafya, Ülke coğrafyası, Avrupa, Türk Dünyası ve Dünya coğrafyası hakkında bilgi sahibi olma;",
        sayfa: 10,
      },
      { metin: "Fiziki çevre ve insan çevresi arasındaki karşılıklı ilişkiyi anlama;", sayfa: 10 },
      { metin: "Mekânsal ilişkilerin değişik ölçeklerdeki ilişkilerini anlama;", sayfa: 10 },
      { metin: "Bölgeler, yerler ve mahaller arasındaki farklılık ve dayanışmayı anlama ve açıklayabilme;", sayfa: 10 },
      {
        metin:
          "Bilgiyi derleyebilme, diğer disiplinlerin farklı yaklaşımlarını anlama ve bunları coğrafi kavramlara uygulayabilme;",
        sayfa: 10,
      },
      { metin: "Coğrafi kavramları anlayabilme;", sayfa: 10 },
      { metin: "Yeryüzü şekillerini yorumlayabilme;", sayfa: 10 },
      { metin: "Coğrafi bilgiyi toplayabilme, karşılaştırma, analiz etme ve sunabilme;", sayfa: 10 },
      { metin: "Coğrafi terminolojiyi uygun şekilde kullanabilme;", sayfa: 10 },
      {
        metin:
          "Coğrafi fikirleri, prensipleri ve teorileri etkin ve düzgün bir şekilde yazılı, sözlü ve görsel manada ifade edebilme;",
        sayfa: 10,
      },
      { metin: "Değişimin tabiatını anlayabilme;", sayfa: 10 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 11 },
    ],
  },
  {
    kod: "cagdas-turk-lehceleri-ve-edebiyatlari",
    baslik: "ÇAĞDAŞ TÜRK LEHÇELERİ VE EDEBİYATLARI",
    giris:
      "Bu program ölçütleri, başlığında “Çağdaş Türk Lehçeleri ve Edebiyatları bölümü” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 11,
    konular: [
      {
        metin:
          "Türk Dünyasının dili, edebiyatı, kültürü, tarihi ve coğrafyası ile ilgili konular üzerinde bilgi sahibi olma,",
        sayfa: 11,
      },
      { metin: "Tarihi ve Çağdaş Türk Lehçeleri ile Edebiyatları hakkında bilgi sahibi olma;", sayfa: 11 },
      { metin: "Bu lehçelerden Türkçeye çeviri yapabilme becerisi;", sayfa: 11 },
      { metin: "Farklı alfabelerle yazılmış metinleri inceleme becerisi;", sayfa: 11 },
      { metin: "Türk lehçelerini art-zamanlı ve eş-zamanlı karşılaştırmalı yöntemle inceleme;", sayfa: 11 },
      { metin: "Türk Dünyasının ortak kültürünü ve farklılıklarını açıklama;", sayfa: 11 },
      {
        metin: "Çağdaş Türk Lehçelerinden en az bir tanesini okuma, yazma, konuşma ve dinleme becerilerine sahip olma;",
        sayfa: 11,
      },
      {
        metin:
          "Bugünkü Türk halkları ve topluluklarının kültürlerini araştırma ve Türkiye’de Türk Devlet ve topluluklarının tanıtılması becerisine sahip olma;",
        sayfa: 11,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 11 },
    ],
  },
  {
    kod: "cagdas-yunan-dili-ve-edebiyati",
    baslik: "ÇAĞDAŞ YUNAN DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Çağdaş Yunan Dili ve Edebiyatı Bölümü” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 11,
    konular: [
      {
        metin:
          "Çağdaş Yunan Dili ve edebiyatı alanında yeterli, güncel ve nitelikli bilgi birikimi ve dil yeterliliği kazandırma;",
        sayfa: 11,
      },
      {
        metin:
          "Öğrencilere, edindikleri kuramsal ve uygulamalı bilgi ve becerileri dilbilim, yabancı dil öğretimi, Çağdaş Yunan Edebiyatı eleştirisi ve Türkçeye çeviri alanlarında kullanabilme yetkinliği kazandırma;",
        sayfa: 11,
      },
      {
        metin:
          "Çağdaş Yunan Edebiyatı eserlerini kronolojik bir bütünlük içinde sosyal, kültürel, tarihsel ve kuramsal bağlamda keşfetmelerini sağlama;",
        sayfa: 11,
      },
      {
        metin:
          "Öğrencilere, eserleri anlama, analiz etme ve yorumlama için gerekli edebiyat kuramları, yaklaşım ve yöntemler aracılığı ile eleştirel bakış açıları kazandırma;",
        sayfa: 11,
      },
      {
        metin:
          "Çağdaş Yunan dilinin doğasını ve dili oluşturan farklı unsurları dil bilim, ses bilgisi, söz dizim, anlam bilim, biçim bilim gibi ilgili disiplinler yolu ile kavramalarına ve incelemelerine yardımcı olma;",
        sayfa: 11,
      },
      {
        metin:
          "Çağdaş Yunancadan Türkçeye farklı seviye, alan ve disiplinlerde metinleri çevirebilmek için gerekli teori, teknik ve becerilerle donatma;",
        sayfa: 11,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 11 },
    ],
  },
  {
    kod: "felsefe",
    baslik: "FELSEFE",
    giris:
      "Bu program ölçütleri, başlığında “Felsefe” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 11,
    konular: [
      { metin: "Eskiçağdan günümüze felsefe tarihine ilişkin bilgi sahibi olma;", sayfa: 11 },
      { metin: "Filozofların temel metinlerini okuma ve temel kavramlarını belirleme;", sayfa: 11 },
      { metin: "Felsefe tarihindeki temel problemleri öğrenme;", sayfa: 11 },
      { metin: "Her bir dönemin felsefe tarihindeki özel yerini ayırt etme;", sayfa: 11 },
      {
        metin:
          "Felsefenin belli başlı alanlarını, bu alanlarındaki temel problemleri, bu problemlere önerilen belli başlı çözümleri öğrenme;",
        sayfa: 11,
      },
      { metin: "Felsefeyi öteki bilgi alanlarından ayırabilme becerisi edinme;", sayfa: 11 },
      {
        metin:
          "Bilginin olanağı, kaynağı, sınırları, kesinliği ile ilgili sorunları hem felsefe hem de diğer. bilgisel etkinlikler bakımından tartışabilme;",
        sayfa: 12,
      },
      {
        metin: "Doğa bilimleri ile sosyal bilimleri birbirinden ayıran nesne ve yöntem farklılıklarını kavrama;",
        sayfa: 12,
      },
      {
        metin: "Doğruluk ve yöntem sorunları üzerine düşünebilme; var olanlara ontolojik açıdan bakabilme;",
        sayfa: 12,
      },
      { metin: "Yabancı dilde bir felsefe metnini anlayabilme ve çevirebilme; akademik konuşma ve yazma;", sayfa: 12 },
      { metin: "Tutarlı, eleştirel, yöntemli, kavramsal düşünebilme ve ayrımlar yapabilme;", sayfa: 12 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 12 },
    ],
  },
  {
    kod: "fizik",
    baslik: "FİZİK",
    giris:
      "Bu program ölçütleri, başlığında “Fizik” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 12,
    konular: [
      {
        metin: "Program için gerekli Temel Matematik, Fizik ve Fizik Laboratuvarı, Temel Kimya ve Laboratuvarı;",
        sayfa: 12,
      },
      { metin: "Klasik mekanik;", sayfa: 12 },
      { metin: "Elektrik ve elektromanyetizma;", sayfa: 12 },
      { metin: "Termodinamik;", sayfa: 12 },
      { metin: "İstatistiksel fizik;", sayfa: 12 },
      { metin: "Yoğun Madde fiziği;", sayfa: 12 },
      { metin: "Kuantum mekaniği;", sayfa: 12 },
      {
        metin:
          "Nükleer fizik; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, sağlık fiziği, biyofizik, nanofizik, yüksek enerji fiziği, yenilenebilir enerji, , görecelik, plazma fiziği, astrofizik, yarıiletkenler, optik, optoelektronik, parçacık, atomik fizik, reaktör fiziği, ölçüm bilimi (metroloji) ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 12,
      },
    ],
  },
  {
    kod: "fransiz-dili-ve-edebiyati",
    baslik: "FRANSIZ DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Fransız Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 12,
    konular: [
      { metin: "Fransız Dili ve Edebiyatının geçirdiği tarihi gelişim süreci hakkında yeterli olma;", sayfa: 12 },
      {
        metin:
          "Fransız Dili ve Edebiyatı alanındaki güncel bilgileri içeren ders kitapları, uygulama araçgereçleri ve diğer kaynaklarda desteklenen ileri düzeydeki kuramsal ve uygulamalı bilgilere sahip olma;",
        sayfa: 12,
      },
      {
        metin:
          "Avrupa kültür ve medeniyet tarihinde önemli sanat anlayışları, Rönesans, Reformasyon ve Aydınlanma çağı hakkında bilgi sahibi olma;",
        sayfa: 12,
      },
      { metin: "Diğer Avrupa dillerinden biri hakkında yeterli bilgiye sahip olma;", sayfa: 12 },
      {
        metin:
          "Edebi metinlerin çözümlenmesi ve edebi metinlere eleştirel yaklaşım, dil eğitimi ve öğretimi gibi alanlarda yeterli bilgiye sahip olma;",
        sayfa: 12,
      },
      {
        metin: "Fransızcanın ses bilimi, morfolojik, semantik, etimolojik özelliklerini hakkında yeterli olma;",
        sayfa: 12,
      },
      {
        metin:
          "Fransızca kelimelerin doğru telaffuzu ve karşılıklı metin tercümelerinin gerektirdiği bilgi birikimine sahip olma;",
        sayfa: 12,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 12 },
    ],
  },
  {
    kod: "ingiliz-dili-ve-edebiyati",
    baslik: "İNGİLİZ DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “İngiliz Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 12,
    konular: [
      { metin: "İngiliz Dili ve Edebiyatının geçirdiği tarihi gelişim süreci hakkında bilgi sahibi olma;", sayfa: 12 },
      {
        metin:
          "İngiliz Dili ve Edebiyatı alanındaki güncel bilgileri içeren ders kitapları, uygulama araç gereçleri ve diğer kaynaklarda desteklenen ileri düzeydeki kuramsal ve uygulamalı bilgilere sahip olma;",
        sayfa: 13,
      },
      { metin: "Amerikan Kültürü, Edebiyatı ve Tarihi hakkında bilgi sahibi olma;", sayfa: 13 },
      {
        metin:
          "Avrupa kültür ve medeniyet tarihinde önemli sanat anlayışları, Rönesans, Reform ve Aydınlanma çağı hakkında bilgi sahibi olma;",
        sayfa: 13,
      },
      { metin: "Diğer Avrupa dillerinden biri hakkında yeterli bilgiye sahip olma;", sayfa: 13 },
      {
        metin:
          "Edebi metinlerin çözümlenmesi ve edebi metinlere eleştirel yaklaşım, dil eğitimi ve öğretimi gibi alanlarda yeterli bilgiye sahip olma;",
        sayfa: 13,
      },
      {
        metin: "İngilizcenin ses bilimi, morfolojik, semantik, etimolojik özelliklerini hakkında yeterli olma;",
        sayfa: 13,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 13 },
    ],
  },
  {
    kod: "istatistik",
    baslik: "İSTATİSTİK",
    giris:
      "Bu program ölçütleri, başlığında “İstatistik” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 13,
    konular: [
      { metin: "Veri düzenlenmesi ve yorumlanması;", sayfa: 13 },
      { metin: "Olasılık kuramı;", sayfa: 13 },
      { metin: "İstatistik kuramı;", sayfa: 13 },
      { metin: "Tahmin;", sayfa: 13 },
      { metin: "Hipotez testleri;", sayfa: 13 },
      { metin: "Parametrik olmayan testler;", sayfa: 13 },
      { metin: "Lineer modeller;", sayfa: 13 },
      { metin: "Varyans Analizi;", sayfa: 13 },
      {
        metin:
          "Çok değişkenli analiz. Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, matris kuramı, optimizasyon, kategorik veri analizi, örnekleme ve anket tasarımı, istatistiksel paket programlar, nümerik analiz ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 13,
      },
    ],
  },
  {
    kod: "kimya",
    baslik: "KİMYA",
    giris:
      "Bu program ölçütleri, başlığında “Kimya” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 13,
    konular: [
      {
        metin: "Program için gerekli Temel Matematik, Fizik ve Fizik Laboratuvarı, Temel Kimya ve Laboratuvarı;",
        sayfa: 13,
      },
      { metin: "Temel ve enstrümantal analitik kimya;", sayfa: 13 },
      { metin: "Anorganik kimya;", sayfa: 13 },
      { metin: "Organik kimya;", sayfa: 13 },
      { metin: "Biyokimya;", sayfa: 13 },
      {
        metin:
          "Fizikokimya ve kuantum kimyası; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte ayırma teknikleri, elektro analitik kimya, çevre, gıda, yüzey kimyası, nanokimya, elektrokimya, endüstriyel kimya, polimer kimya, örnekleme ve örnek hazırlama, laboratuvar ve iş güvenliği, kemometri ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 13,
      },
    ],
  },
  {
    kod: "matematik",
    baslik: "MATEMATİK",
    giris:
      "Bu program ölçütleri, başlığında “Matematik” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 13,
    konular: [
      { metin: "Program için gerekli Temel Matematik, Fizik ve Fizik Laboratuvarı;", sayfa: 13 },
      { metin: "Analiz;", sayfa: 14 },
      { metin: "Analitik Geometri;", sayfa: 14 },
      { metin: "Sayılar Kuramı;", sayfa: 14 },
      { metin: "Soyut Matematik;", sayfa: 14 },
      { metin: "Cebir;", sayfa: 14 },
      { metin: "Diferansiyel Denklemler;", sayfa: 14 },
      { metin: "Olasılık-İstatistik;", sayfa: 14 },
      { metin: "Kompleks Analiz;", sayfa: 14 },
      { metin: "Fonksiyonel Analiz;", sayfa: 14 },
      {
        metin:
          "Topoloji. Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, nümerik analiz, matris kuramı, işlemsel matematik, kodlama teorisi, kombinatorik, doğrusal programlama, cisimler kuramı, çizge kuramı, ölçüm kuramı, topolojik uzaylar, bilgisayar programlama dilleri, bilgisayarda veri yapıları, internet tabanlı programlama ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 14,
      },
    ],
  },
  {
    kod: "molekuler-biyoloji-ve-genetik",
    baslik: "MOLEKÜLER BİYOLOJİ ve GENETİK",
    giris:
      "Bu program ölçütleri, başlığında “Moleküler Biyoloji ve Genetik” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 14,
    konular: [
      {
        metin: "Program için gerekli Temel Matematik, Temel Fizik ve Lab., Temel Kimya ve Lab., Organik Kimya ve Lab;",
        sayfa: 14,
      },
      { metin: "Moleküler Hücre Biyolojisi;", sayfa: 14 },
      { metin: "Genetik, Moleküler Genetik;", sayfa: 14 },
      { metin: "Biyoistatistik;", sayfa: 14 },
      { metin: "Biyoinformatik;", sayfa: 14 },
      { metin: "Biyokimya;", sayfa: 14 },
      { metin: "Fizyoloji;", sayfa: 14 },
      { metin: "Mikrobiyoloji;", sayfa: 14 },
      { metin: "Popülasyon Genetiği;", sayfa: 14 },
      { metin: "Evrim ve Biyoçeşitlilik;", sayfa: 14 },
      {
        metin:
          "Ekoloji; Yukarıdaki alanları daha ayrıntılı şekilde genişletecek ve tamamlayacak nitelikte, moleküler biyoteknolojii, moleküler viroloji, bitki biyolojisi, transgenik bitki teknolojisi, kök hücre biyolojisi, gelişim biyolojisi, gen teknolojisi ve DNA onarımı ve benzeri ilgili konularda seçmeli ve/veya zorunlu derslerle alınacak bilgiler.",
        sayfa: 14,
      },
    ],
  },
  {
    kod: "mutercim-tercumanlik-bolumu",
    baslik: "MÜTERCİM TERCÜMANLIK BÖLÜMÜ",
    giris:
      "Bu program ölçütleri, başlığında “Mütercim Tercümanlık” ve “Çeviribilim” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 14,
    konular: [
      {
        metin: "Mütercim-Tercümanlığın geçirdiği tarihi gelişim süreci hakkında yeterli bilgi sahibi olma;",
        sayfa: 14,
      },
      { metin: "Bütün üslup düzeyleri dâhil olmak üzere, anadili ve kültürüne hâkim olma;", sayfa: 14 },
      { metin: "En az iki yabancı dili çok iyi bilme;", sayfa: 14 },
      { metin: "Üçüncü bir yabancı dili anadile doğru çeviri yapabilecek düzeyde bilme;", sayfa: 14 },
      { metin: "Kaynak dildeki bir metni anlayarak erek dile hatasız aktarabilme;", sayfa: 14 },
      {
        metin:
          "Çeviride kalite ve tutarlılığı artırmak amacıyla, terminoloji çalışması hakkında gerekli kuramsal bilgiye ve yöntemlere sahip olma;",
        sayfa: 14,
      },
      { metin: "İletişimde kültürel farklılıkları bilme;", sayfa: 14 },
      { metin: "Bildiği yabancı dillerin kültürlerini iyi tanıma ve izleme;", sayfa: 14 },
      { metin: "Bilgiye erişebilecek araştırma ve bilgi edinme yeterliliğine sahip olma;", sayfa: 15 },
      {
        metin: "Çeviri sürecinde kullanılan sözlük, ansiklopedi, bilgisayar ve iletişim teknolojilerini kullanabilme;",
        sayfa: 15,
      },
      {
        metin:
          "Sözlü ya da yazılı çevirmenlik mesleğinin değişik alanlarda uygulanış şekilleri hakkında bilgiye sahip olma;",
        sayfa: 15,
      },
      { metin: "Çevirmenlik mesleği ve yasal çerçevesi hakkında bilgi sahibi olma;", sayfa: 15 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 15 },
    ],
  },
  {
    kod: "psikoloji",
    baslik: "PSİKOLOJİ",
    giris:
      "Bu program ölçütleri, başlığında “Psikoloji” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 15,
    konular: [
      {
        metin:
          "Psikolojinin temel kavram ve terimlerini tanımlayabilme; ilgili kuram bilgisine ve farklı yaklaşım ve bakış açılarına sahip olma;",
        sayfa: 15,
      },
      {
        metin:
          "Psikolojinin, bilimsel bir disiplin olarak konumlanışını, davranışsal ve zihinsel süreçleri tarihsel bir perspektifle nasıl ele aldığını ve hangi yöntemlerle incelediğini bilme;",
        sayfa: 15,
      },
      { metin: "Genel psikoloji tarihini bilme; psikoloji ile ilgili diğer alanları tanıma;", sayfa: 15 },
      { metin: "Psikolojinin konuları ve diğer bilimsel alanlarla olan bağlantılarını kurabilme;", sayfa: 15 },
      {
        metin:
          "Temel kuramsal yaklaşım ve bakış açılarının (davranışsal, biyolojik, bilişsel, evrimsel, hümanistik, psikodinamik ve sosyokültürel) belirgin vurgularını bilme;",
        sayfa: 15,
      },
      {
        metin: "Uzmanlık eğitimi sürecine temel oluşturacak, ilgi alanına yönelik uygulama alanlarıyla tanışma;",
        sayfa: 15,
      },
      { metin: "Psikolojik değerlendirmenin temel ilkelerini bilme;", sayfa: 15 },
      {
        metin:
          "Alanda sık kullanılan ölçüm araçlarına ilişkin temel düzey bilgilere ve psikolojinin farklı alt dallarındaki uygulamaların yürütülmesi açısından temel düzey görüşme becerilerine sahip olma;",
        sayfa: 15,
      },
      {
        metin:
          "Psikoloji araştırmalarında araştırma desenini oluşturma, veri toplama, yorumlama, rapora dönüştürme ve tartışma beceri ve deneyimine sahip olma;",
        sayfa: 15,
      },
      {
        metin: "Bilimsel düşünce anlayışına, öğrenme, eleştirel düşünme ve muhakeme becerilerine sahip olma;",
        sayfa: 15,
      },
      {
        metin: "Psikolojinin etik ilke ve değerlerini, etik uygulamaları ve bilimsel sorgu biçimlerini bilme;",
        sayfa: 15,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 15 },
    ],
  },
  {
    kod: "rus-dili-ve-edebiyati",
    baslik: "RUS DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Rus Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 15,
    konular: [
      { metin: "Rusya tarihi, Rus dili ve edebiyatının geçirdiği gelişim süreci hakkında bilgili olma;", sayfa: 15 },
      {
        metin:
          "Rus Dili ve Edebiyatı alanındaki güncel bilgileri içeren ders kitapları, uygulama araç gereçleri ve diğer kaynaklarda desteklenen ileri düzeydeki kuramsal ve uygulamalı bilgilere sahip olma; bu bilgileri kullanabilme, bunlar aracılığıyla verileri yorumlayabilme, değerlendirebilme, analiz edebilme;",
        sayfa: 15,
      },
      {
        metin:
          "Avrupa kültür ve medeniyet tarihinde önemli sanat anlayışları, Rönesans, Reform ve Aydınlanma çağı hakkında bilgi sahibi olma;",
        sayfa: 15,
      },
      { metin: "Diğer Avrupa dillerinden biri hakkında yeterli bilgiye sahip olma;", sayfa: 15 },
      {
        metin:
          "Edebi metinlerin çözümlenmesi ve edebi metinlere eleştirel yaklaşım, dil eğitimi ve öğretimi gibi alanlarda yeterli bilgiye sahip olma;",
        sayfa: 15,
      },
      {
        metin: "Rusçanın ses bilimi, morfolojik, semantik, etimolojik özellikleri hakkında yeterli bilgiye sahip olma;",
        sayfa: 15,
      },
      {
        metin:
          "Rus Dili ve Edebiyatı araştırmalarında bilgi toplama, sınıflandırma, analiz ve güvenilir yazılar oluşturma süreçleri hakkında yeterli olma;",
        sayfa: 15,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 16 },
    ],
  },
  {
    kod: "sanat-tarihi",
    baslik: "SANAT TARİHİ",
    giris:
      "Bu program ölçütleri, başlığında “Sanat Tarihi” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 16,
    konular: [
      { metin: "Batı ve Çağdaş Sanatlar ile Türk İslam Sanatları hakkında bilgi sahibi olma;", sayfa: 16 },
      {
        metin:
          "Verilen ders programları içeriğinde farklı coğrafya ve tarihi kesitlerde üretilmiş yapıtları kültürel ve toplumsal bağlamı içinde kuramsal yöntemlerle değerlendirebilme becerisine sahip olma;",
        sayfa: 16,
      },
      {
        metin:
          "Sanat, kültür ve yaşamın bütünlüğünü güncellenmiş bilgilerle öğrenmeye ve kültür varlıklarını koruma, sahip çıkma ve tanıtma bilincini kazandırmaya sahip olma;",
        sayfa: 16,
      },
      {
        metin:
          "Hayat boyu öğrenmenin gerekliğinden yola çıkarak almış olduğu eğitim paralelinde bilgilerin güncelliğini sağlayacak yöntemleri kullanabilme;",
        sayfa: 16,
      },
      {
        metin: "Bibliyografya ve arşiv kaynakları gibi bilgiye ulaşma yollarını etkin olarak kullanabilme;",
        sayfa: 16,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 16 },
    ],
  },
  {
    kod: "sosyoloji",
    baslik: "SOSYOLOJİ",
    giris:
      "Bu program ölçütleri, başlığında “Sosyoloji” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 16,
    konular: [
      {
        metin:
          "Genel, Kurumlar, Aile, Ekonomi, Siyaset, Eğitim, Sağlık, Din, Hukuk, Uygulamalı Sosyoloji gibi sosyolojinin temel alanları hakkında bilgi sahibi olma;",
        sayfa: 16,
      },
      {
        metin:
          "Sosyolojinin ve sosyolojik çözümlemenin tarihsel gelişimi, insan toplumsal hayatının anlaşılması ve açıklanmasında sosyolojik çözümlemeyi ilgilendiren temel ontolojik, epistemolojik, metodolojik ve kuramsal sorunlar, istihdam edilen başlıca bakış açıları, temel kavramlar, kuramlar, metodolojik yaklaşımlar, araştırma ve veri analiz yöntemleri hakkında bilgi sahibi olma;",
        sayfa: 16,
      },
      {
        metin:
          "Diğer alanlardaki meslektaşları ve ilgili kişilerle birlikte çalışarak toplumsal ilişkiler, süreçler ve yapıların işleyiş biçimlerini, toplumsal politikaların etki ve sonuçlarını değerlendirebilme;",
        sayfa: 16,
      },
      {
        metin:
          "Yeni politika önerileri geliştirebilmek için temel veya uygulamalı araştırma projeleri tasarlayabilme, uygulayabilme ve elde edilen verileri uygun yöntem ve teknikleri kullanarak analiz edebilme;",
        sayfa: 16,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 16 },
    ],
  },
  {
    kod: "tarih",
    baslik: "TARİH",
    giris:
      "Bu program ölçütleri, başlığında “Tarih” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 16,
    konular: [
      { metin: "Yerel tarih hakkında bilgi sahibi olma;", sayfa: 16 },
      { metin: "Türkiye tarihi hakkında bilgi sahibi olma;", sayfa: 16 },
      { metin: "Avrupa ve Dünya kronolojisi hakkında bilgi sahibi olma;", sayfa: 16 },
      { metin: "Toplumların, kültürlerin ve kurumların zamana bağlı değişme süreçlerinin farkında olma;", sayfa: 16 },
      { metin: "Değişik zaman dilimleri ve metinlerdeki farklı tarihsel yaklaşımların farkında olma;", sayfa: 16 },
      { metin: "Belirli tarihsel gelişmeleri ve bunları geniş anlamda tanımlama ve açıklayabilme;", sayfa: 16 },
      { metin: "Temel tarihsel bilgiyi anlama yeteneğine sahip olma;", sayfa: 16 },
      { metin: "Tarihi olayların sebep ve sonuçlarını belirleme ve analiz edebilme;", sayfa: 16 },
      { metin: "Tarihi olaylar hakkında güvenilebilir raporlar planlama ve üretebilme;", sayfa: 16 },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 16 },
    ],
  },
  {
    kod: "turk-dili-ve-edebiyati",
    baslik: "TÜRK DİLİ VE EDEBİYATI",
    giris:
      "Bu program ölçütleri, başlığında “Türk Dili ve Edebiyatı” nitelemesi bulunan programlar için geçerlidir. Mezunların, programın öngördüğü amaçlar doğrultusunda aşağıdaki bilgi, beceri ve yetkinlikleri kazandığı verilen dersler ve/veya ders içerikleriyle kanıtlanmalıdır.",
    sayfa: 17,
    konular: [
      { metin: "Türk Dili ve Edebiyatının tarihî gelişimi ve güncel konumu hakkında bilgi sahibi olma;", sayfa: 17 },
      {
        metin:
          "Eski/yeni Türk Dili/Edebiyatı, Türk Halk Edebiyatı, Çağdaş Türk Edebiyatı ile Çağdaş Türk Lehçeleri ve Edebiyatları hakkında genel bilgi sahibi olma;",
        sayfa: 17,
      },
      { metin: "Türk Dili ve Edebiyatının ürünlerini bilimsel ölçütler çerçevesinde anlama ve inceleme;", sayfa: 17 },
      {
        metin:
          "Türkçeyi güzel ve doğru bir şekilde kullanabilme; dil ve edebiyat bilgilerini kullanabilme becerisine sahip olma;",
        sayfa: 17,
      },
      {
        metin: "Dil ve edebiyat problemlerinin çözümüne yönelik olarak disiplinler arası yaklaşıma sahip olma;",
        sayfa: 17,
      },
      { metin: "Çağın getirdiği güncel dil ve edebiyat alanlarındaki problemlerin farkında olma;", sayfa: 17 },
      {
        metin:
          "Temel dil ve edebiyat bilgilerini kavrama becerisini kazanmış ve alan bilgilerini eğitim öğretim amacına yönelik olarak kullanabilecek durumda olma;",
        sayfa: 17,
      },
      { metin: "Sosyal/insani bilimler alanlarından faydalanabilme.", sayfa: 17 },
    ],
  },
];

/** EPDAD Öğretmen Eğitimi Standartları 1.1 Kılavuzu: göstergeler ve dörtlü dereceli puanlama tanımları (s. 8-57). */
export const EPDAD_OGRETMEN_1_1_GOSTERGE_HAM: readonly GostergeHam[] = [
  {
    altStandart: "1.1.1",
    no: 1,
    metin: "Lisans programının Türkiye Yükseköğretim Yeterlilikler Çerçevesi (TYYÇ) ile uyumlu olması",
    sayfa: 8,
    duzeyler: [
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile tamamen uyumludur.",
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile büyük ölçüde uyumludur.",
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile kısmen uyumludur.",
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile uyumlu değildir.",
    ],
  },
  {
    altStandart: "1.1.1",
    no: 2,
    metin: "Lisans programında yer alan derslerin öğrenme çıktılarının, program yeterlikleriyle uyumlu olması",
    sayfa: 8,
    duzeyler: null,
  },
  {
    altStandart: "1.1.1",
    no: 3,
    metin:
      "Lisans programında yer alan genel kültür, alan eğitimi ve öğretmenlik meslek bilgisi derslerinin oranlarının mevzuata uygun olması",
    sayfa: 9,
    duzeyler: [
      "Lisans programında yer alan genel kültür, alan eğitimi ve öğretmenlik meslek bilgisi derslerinin oranları mevzuat ile tamamen uyumludur.",
      "Lisans programında yer alan genel kültür, alan eğitimi ve öğretmenlik meslek bilgisi derslerinin oranları mevzuat ile büyük ölçüde uyumludur.",
      "Lisans programında yer alan genel kültür, alan eğitimi ve öğretmenlik meslek bilgisi derslerinin oranları mevzuat ile kısmen uyumludur.",
      "Lisans programında yer alan genel kültür, alan eğitimi ve öğretmenlik meslek bilgisi derslerinin oranları mevzuat ile uyumlu değildir.",
    ],
  },
  {
    altStandart: "1.1.1",
    no: 4,
    metin:
      "Lisans programının, Millî Eğitim Bakanlığı (MEB) Öğretmenlik Mesleği Genel Yeterliklerini kazandıracak ders çeşitliliğine sahip olması",
    sayfa: 9,
    duzeyler: [
      "Lisans programı, Millî Eğitim Bakanlığı (MEB) Öğretmenlik Mesleği Genel Yeterliklerini kazandıracak ders çeşitliliğine tamamen sahiptir.",
      "Lisans programı Millî Eğitim Bakanlığı (MEB) Öğretmenlik Mesleği Genel Yeterliklerini kazandıracak ders çeşitliliğine büyük ölçüde sahiptir.",
      "Lisans programı Millî Eğitim Bakanlığı (MEB) Öğretmenlik Mesleği Genel Yeterliklerini kazandıracak ders çeşitliliğine kısmen sahiptir.",
      "Lisans programı Millî Eğitim Bakanlığı (MEB) Öğretmenlik Mesleği Genel Yeterliklerini kazandıracak ders çeşitliliğine sahip değildir.",
    ],
  },
  {
    altStandart: "1.1.2",
    no: 1,
    metin:
      "Derslerin öğrenme çıktıları, içeriği, öğretim yöntem ve teknikleri, ölçme- değerlendirme yöntem ve teknikleri arasında tutarlılık olması",
    sayfa: 9,
    duzeyler: [
      "Öğretim programının ögeleri tam bir uyum içindedir.",
      "Öğretim programının ögeleri büyük ölçüde uyum içindedir.",
      "Öğretim programının ögeleri kısmen uyum içindedir.",
      "Öğretim programının ögeleri birbiriyle uyumlu değildir.",
    ],
  },
  {
    altStandart: "1.1.3",
    no: 1,
    metin: "Derslerin öğrenme çıktılarının etkili öğretmenlik için gerekli bilgi, beceri, tutum ve değerleri içermesi",
    sayfa: 10,
    duzeyler: [
      "Dersler; iyi bir öğretmen yetiştirmek için gerekli öğrenme çıktılarını tümüyle içermektedir.",
      "Dersler; iyi bir öğretmen yetiştirmek için gerekli öğrenme çıktılarını büyük ölçüde içermektedir.",
      "Dersler; iyi bir öğretmen yetiştirmek için gerekli tüm öğrenme çıktılarını kısmen içermektedir.",
      "Dersler; iyi bir öğretmen yetiştirmek için gerekli öğrenme çıktılarını içermemektedir.",
    ],
  },
  {
    altStandart: "1.1.3",
    no: 2,
    metin: "Öğretim programını destekleyici farklı öğretim yöntem ve tekniklerinin kullanımının planlanmış olması",
    sayfa: 10,
    duzeyler: [
      "Öğretim programı, destekleyici farklı öğretim yöntem ve teknikleri kullanılarak planlanmıştır.",
      "Öğretim programı, büyük ölçüde destekleyici farklı öğretim yöntem ve teknikleri kullanılarak planlanmıştır.",
      "Öğretim programı, kısmen destekleyici farklı öğretim yöntem ve teknikleri kullanılarak planlanmıştır.",
      "Öğretim programı planlanırken destekleyici farklı öğretim yöntem ve teknikleri kullanılmamıştır.",
    ],
  },
  {
    altStandart: "1.1.3",
    no: 3,
    metin: "Öğretim programını destekleyici farklı kaynak ve materyal kullanımının planlanmış olması",
    sayfa: 10,
    duzeyler: null,
  },
  {
    altStandart: "1.1.3",
    no: 4,
    metin:
      "Ölçme- değerlendirme etkinlikleri ve sürecinin, öğretim hizmetinin niteliğini artıracak şekilde planlanmış olması",
    sayfa: 11,
    duzeyler: [
      "Ölçme- değerlendirme etkinlikleri ve süreci tamamen öğretim hizmetinin niteliğini artırmaya yöneliktir.",
      "Ölçme- değerlendirme etkinlikleri ve süreci; büyük ölçüde öğretim hizmetinin niteliğini artırmaya yöneliktir.",
      "Ölçme- değerlendirme etkinlikleri ve süreci; kısmen öğretim hizmetinin niteliğini artırmaya yöneliktir.",
      "Ölçme- değerlendirme etkinlikleri ve süreci; öğretim hizmetinin niteliğini artırmaya yönelik değildir.",
    ],
  },
  {
    altStandart: "1.1.3",
    no: 5,
    metin: "Ölçme- değerlendirme sürecinde öğrencilere geri bildirim vermeye yönelik düzenlemeler olması",
    sayfa: 11,
    duzeyler: [
      "Ölçme- değerlendirme sürecinde öğrencilere geri bildirim vermeye yönelik düzenlemeler bulunmaktadır.",
      "Ölçme- değerlendirme sürecinde öğrencilere geri bildirim vermeye yönelik düzenlemeler büyük ölçüde bulunmaktadır.",
      "Ölçme- değerlendirme sürecinde kısmen öğrencilere geri bildirim vermeye yönelik düzenlemeler bulunmaktadır.",
      "Ölçme- değerlendirme sürecinde öğrencilere geri bildirim vermeye yönelik düzenlemeler bulunmamaktadır.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 1,
    metin: "Öğretim elemanları ve öğrencilerin, lisans programı ve program yeterliliklerinin farkında olması",
    sayfa: 12,
    duzeyler: [
      "Öğretim elemanları ve öğrenciler, lisans programı ve program yeterliliklerinin tam olarak farkındadır.",
      "Öğretim elemanları ve öğrenciler, lisans programı ve program yeterliliklerinin büyük ölçüde farkındadır.",
      "Öğretim elemanları ve öğrenciler, lisans programı ve program yeterliliklerinin kısmen farkındadır.",
      "Öğretim elemanları ve öğrenciler, lisans programı ve program yeterliliklerinin farkında değildir.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 2,
    metin: "Derslerin, lisans programının yeterliliklerine uygun olarak yürütülmesi",
    sayfa: 12,
    duzeyler: [
      "Dersler, lisans programının yeterliliklerine tamamen uygun olarak yürütülmektedir.",
      "Dersler, lisans programının yeterliliklerine büyük ölçüde uygun olarak yürütülmektedir.",
      "Dersler, lisans programının yeterliliklerine kısmen uygun olarak yürütülmektedir.",
      "Dersler, lisans programının yeterliliklerine uygun olarak yürütülmemektedir.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 3,
    metin: "Derslerin, ders öğrenme çıktılarına uygun olarak yürütülmesi",
    sayfa: 12,
    duzeyler: [
      "Dersler, ders öğrenme çıktılarına tamamen uygun olarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına büyük ölçüde uygun olarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına kısmen uygun olarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına uygun olarak yürütülmemektedir.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 4,
    metin: "Derslerin, ders öğretim programının içeriğine uygun olarak yürütülmesi",
    sayfa: 12,
    duzeyler: [
      "Dersler, ders öğretim programının içeriğine tamamen uygun olarak yürütülmektedir.",
      "Dersler, ders öğretim programının içeriğine büyük ölçüde uygun olarak yürütülmektedir.",
      "Dersler, ders öğretim programının içeriğine kısmen uygun olarak yürütülmektedir.",
      "Dersler, ders öğretim programının içeriğine uygun olarak yürütülmemektedir.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 5,
    metin: "Derslerde, ders öğrenme çıktılarına uygun yöntem ve tekniklerin uygulanması",
    sayfa: 12,
    duzeyler: [
      "Dersler, ders öğrenme çıktılarına tam olarak uygun yöntem ve teknikler uygulanarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına büyük ölçüde uygun yöntem ve teknikler uygulanarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına kısmen uygun yöntem ve teknikler uygulanarak yürütülmektedir.",
      "Dersler, ders öğrenme çıktılarına uygun yöntem ve teknikler uygulanarak yürütülmemektedir.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 6,
    metin: "Derslerde, ders öğrenme çıktılarına uygun kaynak ve materyallerin kullanılması",
    sayfa: 12,
    duzeyler: [
      "Derslerde, ders öğrenme çıktılarına tam olarak uygun kaynak ve materyaller kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına büyük ölçüde uygun kaynak ve materyaller kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına kısmen uygun kaynak ve materyaller kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına uygun olmayan kaynak ve materyaller kullanılmaktadır.",
    ],
  },
  {
    altStandart: "1.2.1",
    no: 7,
    metin: "Derslerde, ders öğrenme çıktılarına uygun ölçme- değerlendirme yöntem ve tekniklerinin kullanılması",
    sayfa: 12,
    duzeyler: [
      "Derslerde, ders öğrenme çıktılarına tam olarak uygun ölçme- değerlendirme yöntem ve teknikleri kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına büyük ölçüde uygun ölçme- değerlendirme yöntem ve teknikleri kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına kısmen uygun ölçme- değerlendirme yöntem ve teknikleri kullanılmaktadır.",
      "Derslerde, ders öğrenme çıktılarına uygun olmayan ölçme- değerlendirme yöntem ve teknikleri kullanılmaktadır.",
    ],
  },
  {
    altStandart: "1.2.2",
    no: 1,
    metin: "Öğrencilere, zamanında ve etkili geri bildirim verilmesi",
    sayfa: 13,
    duzeyler: [
      "Öğretim üyesi, öğrencilere her zaman etkili ve zamanında geri bildirim vermektedir.",
      "Öğretim üyesi, öğrencilere çoğunlukla etkili ve zamanında geri bildirim vermektedir.",
      "Öğretim üyesi, öğrencilere bazen etkili ve zamanında geri bildirim vermektedir.",
      "Öğretim üyesi, öğrencilere, etkili ve zamanında geri bildirim vermemektedir.",
    ],
  },
  {
    altStandart: "1.2.2",
    no: 2,
    metin: "Geri bildirime bağlı olarak öğrencilerin gelişiminin desteklenmesi",
    sayfa: 13,
    duzeyler: [
      "Öğretim üyesi, geri bildirime bağlı olarak öğrencilerin gelişimini tam olarak desteklemektedir.",
      "Öğretim üyesi, geri bildirime bağlı olarak öğrencilerin gelişimini büyük ölçüde desteklemektedir.",
      "Öğretim üyesi, geri bildirime bağlı olarak öğrencilerin gelişimini kısmen desteklemektedir.",
      "Öğretim üyesi, geri bildirime bağlı olarak öğrencilerin gelişimini desteklememektedir.",
    ],
  },
  {
    altStandart: "1.3.1",
    no: 1,
    metin: "Öğrencilerin; alanında kuramsal, metodolojik ve olgusal bilgiye sahip olması",
    sayfa: 14,
    duzeyler: [
      "Öğrenciler; alanında kuramsal, metodolojik ve olgusal bilgiye tam olarak sahiptir.",
      "Öğrenciler; alanında kuramsal, metodolojik ve olgusal bilgiye büyük ölçüde sahiptir.",
      "Öğrenciler; alanında kuramsal, metodolojik ve olgusal bilgiye kısmen sahiptir.",
      "Öğrenciler; alanında kuramsal, metodolojik ve olgusal bilgiye sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.1",
    no: 2,
    metin: "Öğrencilerin; alanının öğretim programı ve pedagojik alan bilgisi yeterliklerine sahip olması",
    sayfa: 14,
    duzeyler: [
      "Öğrenciler; alanının öğretim programı ve pedagojik alan bilgisi yeterliklerine tam olarak sahiptir.",
      "Öğrenciler; alanının öğretim programı ve pedagojik alan bilgisi yeterliklerine büyük ölçüde sahiptir.",
      "Öğrenciler; alanının öğretim programı ve pedagojik alan bilgisi yeterliklerine kısmen sahiptir.",
      "Öğrenciler; alanının öğretim programı ve pedagojik alan bilgisi yeterliklerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.2",
    no: 1,
    metin: "Öğrencilerin, öğretim süreçlerini planlama becerilerine sahip olması",
    sayfa: 15,
    duzeyler: [
      "Öğrenciler, öğretim süreçlerini planlama becerilerine tam olarak sahiptir.",
      "Öğrenciler, öğretim süreçlerini planlama becerilerine büyük ölçüde sahiptir.",
      "Öğrenciler, öğretim süreçlerini planlama becerilerine kısmen sahiptir.",
      "Öğrenciler, öğretim süreçlerini planlama becerilerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.2",
    no: 2,
    metin: "Öğrencilerin, etkili öğrenme ortamları oluşturma becerilerine sahip olması",
    sayfa: 15,
    duzeyler: [
      "Öğrenciler, etkili öğrenme ortamları oluşturma becerilerine tam olarak sahiptir.",
      "Öğrenciler, etkili öğrenme ortamları oluşturma becerilerine büyük ölçüde sahiptir.",
      "Öğrenciler, etkili öğrenme ortamları oluşturma becerilerine kısmen sahiptir.",
      "Öğrenciler, etkili öğrenme ortamları oluşturma becerilerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.2",
    no: 3,
    metin: "Öğrencilerin, öğretme-öğrenme sürecini yönetme becerilerine sahip olması",
    sayfa: 15,
    duzeyler: [
      "Öğrenciler, öğretme-öğrenme sürecini yönetme becerilerine tam olarak sahiptir.",
      "Öğrenciler, öğretme-öğrenme sürecini yönetme becerilerine büyük ölçüde sahiptir.",
      "Öğrenciler, öğretme-öğrenme sürecini yönetme becerilerine kısmen sahiptir.",
      "Öğrenciler, öğretme-öğrenme sürecini yönetme becerilerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.2",
    no: 4,
    metin: "Öğrencilerin, öğretim materyali hazırlama ve kullanma becerilerine sahip olması",
    sayfa: 15,
    duzeyler: [
      "Öğrenciler, öğretim materyali hazırlama ve kullanma becerilerine tam olarak sahiptir.",
      "Öğrenciler, öğretim materyali hazırlama ve kullanma becerilerine büyük ölçüde sahiptir.",
      "Öğrenciler, öğretim materyali hazırlama ve kullanma becerilerine kısmen sahiptir.",
      "Öğrenciler, öğretim materyali hazırlama ve kullanma becerilerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.2",
    no: 5,
    metin: "Öğrencilerin, ölçme- değerlendirme becerilerine sahip olması",
    sayfa: 15,
    duzeyler: [
      "Öğrenciler, ölçme- değerlendirme becerilerine tam olarak sahiptir.",
      "Öğrenciler, ölçme- değerlendirme becerilerine büyük ölçüde sahiptir.",
      "Öğrenciler, ölçme- değerlendirme becerilerine kısmen sahiptir.",
      "Öğrenciler, ölçme- değerlendirme becerilerine sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.3",
    no: 1,
    metin: "Öğrencilerin; milli, manevi, evrensel, etik ve bilimsel değerlere sahip olması.",
    sayfa: 16,
    duzeyler: [
      "Öğrenciler; milli, manevi, evrensel, etik ve bilimsel değerlere tam olarak sahiptir.",
      "Öğrenciler; milli, manevi, evrensel, etik ve bilimsel değerlere büyük ölçüde sahiptir.",
      "Öğrenciler; milli, manevi, evrensel, etik ve bilimsel değerlere kısmen sahiptir.",
      "Öğrenciler; milli, manevi, evrensel, etik ve bilimsel değerlere sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.3",
    no: 2,
    metin: "Görev yapacağı alandaki öğrencilerin gelişimini desteklemeye yönelik motivasyona sahip olması",
    sayfa: 16,
    duzeyler: [
      "Öğrencilerinin gelişimini desteklemeye yönelik motivasyona tam olarak sahiptir.",
      "Öğrencilerinin gelişimini desteklemeye yönelik motivasyona büyük ölçüde sahiptir.",
      "Öğrencilerinin gelişimini desteklemeye yönelik motivasyona kısmen sahiptir.",
      "Öğrencilerinin gelişimini desteklemeye yönelik motivasyona sahip değildir.",
    ],
  },
  {
    altStandart: "1.3.3",
    no: 3,
    metin: "Öğrencilerin, iletişim ve iş birliğine açık olması",
    sayfa: 16,
    duzeyler: [
      "Öğrenciler; tam olarak iletişim ve iş birliğine açıktır.",
      "Öğrenciler; büyük ölçüde iletişim ve iş birliğine açıktır.",
      "Öğrenciler; kısmen iletişim ve iş birliğine açıktır.",
      "Öğrenciler; iletişim ve iş birliğine açık değildir.",
    ],
  },
  {
    altStandart: "1.3.3",
    no: 4,
    metin: "Öğrencilerin, kişisel ve mesleki gelişime yönelik çalışmalara katılması",
    sayfa: 16,
    duzeyler: [
      "Öğrenciler; kişisel ve mesleki gelişime yönelik tüm çalışmalara katılmaktadır.",
      "Öğrenciler; kişisel ve mesleki gelişime yönelik çalışmalara büyük ölçüde katılmaktadır.",
      "Öğrenciler; kişisel ve mesleki gelişime yönelik çalışmalara kısmen katılmaktadır.",
      "Öğrenciler; kişisel ve mesleki gelişime yönelik çalışmaya katılmamaktadır.",
    ],
  },
  {
    altStandart: "1.3.3",
    no: 5,
    metin:
      "Öğrencilerin, öğretmenlik mesleği ile ilgili hak ve sorumluluklarına ilişkin mevzuat hakkında bilgi sahibi olması",
    sayfa: 16,
    duzeyler: [
      "Öğrenciler; öğretmenlik mesleği ile ilgili hak ve sorumluluklarına ilişkin mevzuat hakkında tam olarak bilgi sahibidir.",
      "Öğrenciler; öğretmenlik mesleği ile ilgili hak ve sorumluluklarına ilişkin mevzuat hakkında büyük ölçüde bilgi sahibidir.",
      "Öğrenciler; öğretmenlik mesleği ile ilgili hak ve sorumluluklarına ilişkin mevzuat hakkında kısmen bilgi sahibidir.",
      "Öğrencilerin; öğretmenlik mesleği ile ilgili hak ve sorumluluklarına ilişkin mevzuat hakkında bilgisi bulunmamaktadır.",
    ],
  },
  {
    altStandart: "2.1.1",
    no: 1,
    metin: "Programı yürüten öğretim elemanı sayısının yeterli olması",
    sayfa: 18,
    duzeyler: null,
  },
  {
    altStandart: "2.1.1",
    no: 2,
    metin: "Öğretim elemanlarının öğretmenlik ya da öğretmenlik uygulaması dersi deneyiminin olması",
    sayfa: 18,
    duzeyler: null,
  },
  {
    altStandart: "2.1.1",
    no: 3,
    metin: "Öğretim elemanlarının mesleki deneyim ve çalışma alanlarının, yürüttükleri derslerle uyumlu olması",
    sayfa: 18,
    duzeyler: [
      "Öğretim elemanlarının mesleki deneyim ve çalışma alanları, yürüttükleri derslerle uyumludur.",
      "Öğretim elemanlarının mesleki deneyim ve çalışma alanları, yürüttükleri derslerle büyük ölçüde uyumludur.",
      "Öğretim elemanlarının mesleki deneyim ve çalışma alanları, yürüttükleri derslerle kısmen uyumludur.",
      "Öğretim elemanlarının mesleki deneyim ve çalışma alanları, yürüttükleri derslerle uyumlu değildir.",
    ],
  },
  {
    altStandart: "2.1.1",
    no: 4,
    metin: "Öğretim elemanlarının uzmanlık alanlarında ve ders verdikleri alanlarda araştırma ve yayınlarının olması",
    sayfa: 18,
    duzeyler: [
      "Öğretim elemanlarının araştırma ve yayınları, uzmanlık alanlarında ve ders verdikleri alanlardadır.",
      "Öğretim elemanlarının araştırma ve yayınları, büyük ölçüde uzmanlık alanlarında ve ders verdikleri alanlardadır.",
      "Öğretim elemanlarının araştırma ve yayınları, kısmen uzmanlık alanlarında ve ders verdikleri alanlardadır.",
      "Öğretim elemanlarının araştırma ve yayınları, uzmanlık alanlarında ve ders verdikleri alanlarda değildir.",
    ],
  },
  {
    altStandart: "2.1.1",
    no: 5,
    metin:
      "Öğretim elemanlarının haftalık ders yükünün, bilimsel çalışmalar ile akademik danışmanlık hizmetlerini yürütebilmelerine olanak sağlaması",
    sayfa: 18,
    duzeyler: null,
  },
  {
    altStandart: "2.1.2",
    no: 1,
    metin: "Öğretim elemanlarının mesleki gelişim ve araştırmalarının desteklenmesi",
    sayfa: 19,
    duzeyler: null,
  },
  {
    altStandart: "2.1.2",
    no: 2,
    metin: "Öğretim elemanlarına verilen ek görevlerin mesleki gelişimlerini engellemeyecek şekilde düzenlenmesi",
    sayfa: 19,
    duzeyler: [
      "Öğretim elemanlarına verilen ek görevler, onların tam olarak mesleki gelişimlerini engellemeyecek şekilde düzenlenmektedir.",
      "Öğretim elemanlarına verilen ek görevler, onların büyük ölçüde mesleki gelişimlerini engellemeyecek şekilde düzenlenmektedir.",
      "Öğretim elemanlarına verilen ek görevler, onların kısmen mesleki gelişimlerini engellemeyecek şekilde düzenlenmektedir.",
      "Öğretim elemanlarına verilen ek görevler, onların mesleki gelişimlerini engelleyecek şekilde düzenlenmektedir.",
    ],
  },
  {
    altStandart: "2.1.2",
    no: 3,
    metin: "Öğretim elemanlarının, mesleki gelişim fırsatları hakkında bilgilendirilmesi",
    sayfa: 19,
    duzeyler: null,
  },
  {
    altStandart: "2.1.2",
    no: 4,
    metin: "Öğretim elemanlarının, mesleki gelişim programlarına katılması",
    sayfa: 20,
    duzeyler: [
      "Öğretim elemanları, mesleki gelişim programlarına tam olarak katılmaktadır.",
      "Öğretim elemanları, mesleki gelişim programlarına büyük ölçüde katılmaktadır.",
      "Öğretim elemanları, mesleki gelişim programlarına kısmen katılmaktadır.",
      "Öğretim elemanları, mesleki gelişim programlarına katılmamaktadır.",
    ],
  },
  {
    altStandart: "2.2.1",
    no: 1,
    metin:
      "Öğretim elemanlarının akademik, kültürel, sanatsal, toplumsal vb. etkinliklerin gerçekleştirilmes inde düzenleyici, yürütücü ve katılımcı olarak rol alması",
    sayfa: 20,
    duzeyler: [
      "Öğretim elemanlarının tamamı; akademik, kültürel, sanatsal, toplumsal vb. etkinliklerin gerçekleştirilmesin de düzenleyici, yürütücü ve katılımcı olarak rol almaktadır.",
      "Öğretim elemanlarının büyük bir kısmı akademik, kültürel, sanatsal, toplumsal vb. etkinliklerin gerçekleştirilmesin de düzenleyici, yürütücü ve katılımcı olarak rol almaktadır.",
      "Öğretim elemanlarının bir kısmı; akademik, kültürel, sanatsal, toplumsal vb. etkinliklerin gerçekleştirilmesin de düzenleyici, yürütücü ve katılımcı olarak rol almaktadır.",
      "Öğretim elemanları; akademik, kültürel, sanatsal, toplumsal vb. etkinliklerin gerçekleştirilmesin de düzenleyici, yürütücü ve katılımcı olarak rol almamaktadır.",
    ],
  },
  {
    altStandart: "2.2.1",
    no: 2,
    metin: "Öğretim elemanlarının yürüttüğü görevlerin uzmanlık alanları ve deneyimleriyle uyumlu olması",
    sayfa: 20,
    duzeyler: null,
  },
  {
    altStandart: "2.2.1",
    no: 3,
    metin: "Öğretim elemanlarının göreve yeni başlayan meslektaşlarını yetiştirmeye yönelik katkı yapması",
    sayfa: 21,
    duzeyler: [
      "Öğretim elemanları; göreve yeni başlayan meslektaşlarını yetiştirmeye yönelik tam olarak katkı sunmaktadır.",
      "Öğretim elemanları; göreve yeni başlayan meslektaşlarını yetiştirmeye yönelik büyük ölçüde katkı sunmaktadır.",
      "Öğretim elemanları; göreve yeni başlayan meslektaşlarını yetiştirmeye yönelik kısmen katkı sunmaktadır.",
      "Öğretim elemanları; göreve yeni başlayan meslektaşlarını yetiştirmeye yönelik katkı sunmamaktadır.",
    ],
  },
  {
    altStandart: "2.2.1",
    no: 4,
    metin: "Öğretim elemanlarının “uygulama öğretim elemanı” olarak görev alması",
    sayfa: 21,
    duzeyler: [
      "Öğretim elemanlarının tamamı, “uygulama öğretim elemanı” olarak görev almaktadır.",
      "Öğretim elemanlarının büyük bir kısmı, “uygulama öğretim elemanı” olarak görev almaktadır.",
      "Öğretim elemanlarının bir kısmı “uygulama öğretim elemanı” olarak görev almaktadır.",
      "Öğretim elemanları, “uygulama öğretim elemanı” olarak görev almamaktadır.",
    ],
  },
  {
    altStandart: "2.2.1",
    no: 5,
    metin: "Öğretim elemanlarının akademik danışmanlık hizmetlerini yürütmesi",
    sayfa: 21,
    duzeyler: [
      "Öğretim elemanlarının tamamı, akademik danışmanlık hizmeti yürütmektedir.",
      "Öğretim elemanlarının büyük bir kısmı, akademik danışmanlık hizmeti yürütmektedir.",
      "Öğretim elemanlarının bir kısmı, akademik danışmanlık hizmeti yürütmektedir.",
      "Öğretim elemanları, akademik danışmanlık hizmeti yürütmemektedir.",
    ],
  },
  {
    altStandart: "2.2.2",
    no: 1,
    metin: "Öğretim elemanlarının, eğitim/uzmanlık alanlarındaki gelişmeleri takip etmesi",
    sayfa: 21,
    duzeyler: null,
  },
  {
    altStandart: "2.2.2",
    no: 2,
    metin: "Öğretim elemanlarının mesleki gelişimlerini destekleyen ulusal ve uluslararası faaliyetlere katılması",
    sayfa: 22,
    duzeyler: [
      "Öğretim elemanlarının tamamı mesleki gelişimlerini destekleyen ulusal ve uluslararası faaliyetlere katılmaktadır.",
      "Öğretim elemanları, mesleki gelişimlerini destekleyen ulusal ve uluslararası faaliyetlere büyük ölçüde katılmaktadır.",
      "Öğretim elemanları, mesleki gelişimlerini destekleyen ulusal ve uluslararası faaliyetlere kısmen katılmaktadır.",
      "Öğretim elemanları, mesleki gelişimlerini destekleyen ulusal ve uluslararası faaliyetlere katılmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.1",
    no: 1,
    metin: "Öğrencilerin program yeterliklerine ulaşma düzeyinin yüksek olması",
    sayfa: 22,
    duzeyler: [
      "Öğrencilerin tamamının program yeterliliklerine ulaşma düzeyi yüksektir.",
      "Öğrencilerin büyük bir kısmının program yeterliklerine ulaşma düzeyi yüksektir.",
      "Öğrencilerin bir kısmının program yeterliklerine ulaşma düzeyi yüksektir.",
      "Öğrenciler, program yeterliklerine yüksek düzeyde ulaşamamıştır.",
    ],
  },
  {
    altStandart: "2.3.1",
    no: 2,
    metin: "Öğretim elemanları tarafından sağlanan eğitim- öğretimin, program yeterlilikleri ile uyumlu olması",
    sayfa: 22,
    duzeyler: null,
  },
  {
    altStandart: "2.3.1",
    no: 3,
    metin: "Öğretim elemanlarının öğretme- öğrenme süreçlerinde farklı yöntem ve teknikleri kullanması.",
    sayfa: 23,
    duzeyler: [
      "Öğretim elemanları; öğretme-öğrenme süreçlerinde farklı yöntem ve teknikler kullanmaktadır.",
      "Öğretim elemanları; öğretme-öğrenme süreçlerinde büyük ölçüde farklı yöntem ve teknikler kullanmaktadır.",
      "Öğretim elemanları; öğretme-öğrenme süreçlerinde kısmen farklı yöntem ve teknikler kullanmaktadır.",
      "Öğretim elemanları; öğretme-öğrenme süreçlerinde farklı yöntem ve teknikler kullanmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.1",
    no: 4,
    metin: "Öğretim elemanlarının öğretimi destekleyen sınıf, laboratuvar vb. dışında da etkinlikler düzenlemesi",
    sayfa: 23,
    duzeyler: [
      "Öğretim elemanlarının; öğretimi destekleyen sınıf dışı etkinlikler düzenlemesi tam olarak yeterlidir.",
      "Öğretim elemanlarının; öğretimi destekleyen sınıf dışı etkinlikler düzenlemesi büyük ölçüde yeterlidir.",
      "Öğretim elemanlarının; öğretimi destekleyen sınıf dışı etkinlikler düzenlemesi kısmen yeterlidir.",
      "Öğretim elemanlarının; öğretimi destekleyen sınıf dışı etkinlikler düzenlememektedir.",
    ],
  },
  {
    altStandart: "2.3.1",
    no: 5,
    metin: "Öğretim elemanlarının farklı ölçme- değerlendirme yöntem ve tekniklerini kullanması",
    sayfa: 23,
    duzeyler: [
      "Öğretim elemanları, farklı ölçme- değerlendirme yöntem ve tekniklerini tam olarak kullanmaktadır.",
      "Öğretim elemanları, farklı ölçme- değerlendirme yöntem ve tekniklerini büyük ölçüde kullanmaktadır.",
      "Öğretim elemanları, farklı ölçme- değerlendirme yöntem ve tekniklerini kısmen kullanmaktadır.",
      "Öğretim elemanları, farklı ölçme- değerlendirme yöntem ve tekniklerini kullanmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.1",
    no: 6,
    metin: "Öğretim elemanlarının, mesleki gelişim programlarından edinimlerini öğretim süreçlerine yansıtması",
    sayfa: 23,
    duzeyler: [
      "Öğretim elemanları; mesleki gelişim programlarından edinimlerini öğretim süreçlerine tam olarak yansıtmaktadır.",
      "Öğretim elemanları; mesleki gelişim programlarından edinimlerini öğretim süreçlerine büyük ölçüde yansıtmaktadır.",
      "Öğretim elemanları; mesleki gelişim programlarından edinimlerini öğretim süreçlerine kısmen yansıtmaktadır.",
      "Öğretim elemanları; mesleki gelişim programlarından edinimlerini öğretim süreçlerine yansıtmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.2",
    no: 1,
    metin: "Öğretim elemanlarının, alanlarıyla ilgili bilimsel araştırmalar ve projeler yapması",
    sayfa: 24,
    duzeyler: [
      "Öğretim elemanlarının tamamı, alanlarıyla ilgili bilimsel araştırmalar ve projeler yapmaktadır.",
      "Öğretim elemanlarının büyük bir kısmı, alanlarıyla ilgili bilimsel araştırmalar ve projeler yapmaktadır.",
      "Öğretim elemanlarının bir kısmı, alanlarıyla ilgili bilimsel araştırmalar ve projeler yapmaktadır.",
      "Öğretim elemanları, alanlarıyla ilgili bilimsel araştırma ve proje yapmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.2",
    no: 2,
    metin: "Öğretim elemanlarının, yaptıkları araştırmaları yayına dönüştürmesi ve paylaşması",
    sayfa: 24,
    duzeyler: [
      "Öğretim elemanlarının tamamı, yaptıkları araştırmaları yayına dönüştürmekte ve paylaşmaktadır.",
      "Öğretim elemanlarının büyük bir kısmı, yaptıkları araştırmaları yayına dönüştürmekte ve paylaşmaktadır.",
      "Öğretim elemanlarının bir kısmı, yaptıkları araştırmaları yayına dönüştürmekte ve paylaşmaktadır.",
      "Öğretim elemanları, yaptıkları araştırmaları yayına dönüştürmemekte ve paylaşmamaktadır.",
    ],
  },
  {
    altStandart: "2.3.3",
    no: 1,
    metin:
      "Öğretim elemanlarının; öğretmenlere, yöneticilere ve diğer paydaşlara yönelik mesleki gelişim programlarında görev alması",
    sayfa: 24,
    duzeyler: null,
  },
  {
    altStandart: "2.3.3",
    no: 2,
    metin:
      "Öğretim elemanlarının; toplumun sosyal, kültürel, ekonomik vb. gelişimini destekleyecek etkinliklerde görev alması",
    sayfa: 25,
    duzeyler: [
      "Öğretim elemanlarının tamamı toplumun sosyal, kültürel, ekonomik vb. gelişimini destekleyecek etkinliklerde görev almaktadır.",
      "Öğretim elemanlarının büyük bir kısmı toplumun sosyal, kültürel, ekonomik vb. gelişimini destekleyecek etkinliklerde görev almaktadır.",
      "Öğretim elemanlarının bir kısmı toplumun sosyal, kültürel, ekonomik vb. gelişimini destekleyecek etkinliklerde görev almaktadır.",
      "Öğretim elemanları; toplumun sosyal, kültürel, ekonomik vb. gelişimini destekleyecek etkinliklerde görev almamaktadır.",
    ],
  },
  {
    altStandart: "2.3.3",
    no: 3,
    metin: "Öğretim elemanlarının, toplum yararına yapılan çalışmalarda paydaşlarla iş birliği yapması",
    sayfa: 25,
    duzeyler: [
      "Öğretim elemanlarının tamamı; toplum yararına yapılan çalışmalarda paydaşlarla iş birliği yapmaktadır.",
      "Öğretim elemanlarının büyük bir kısmı toplum yararına yapılan çalışmalarda paydaşlarla iş birliği yapmaktadır.",
      "Öğretim elemanlarının bir kısmı toplum yararına yapılan çalışmalarda paydaşlarla iş birliği yapmaktadır.",
      "Öğretim elemanları; toplum yararına yapılan çalışmalarda paydaşlarla iş birliği yapmamaktadır.",
    ],
  },
  {
    altStandart: "3.1.1",
    no: 1,
    metin: "Öğrencilerin, program yeterliliklerine sahip olması",
    sayfa: 26,
    duzeyler: [
      "Öğrenciler, program yeterliliklerin tamamına sahiptir.",
      "Öğrenciler, program yeterliliklerine büyük ölçüde sahiptir.",
      "Öğrenciler, program yeterliliklerine kısmen sahiptir.",
      "Öğrenciler, program yeterliliklerine sahip değildir.",
    ],
  },
  {
    altStandart: "3.1.1",
    no: 2,
    metin: "Öğrencilerin, öğretmenlik mesleğine yönelik yeterli motivasyona sahip olması",
    sayfa: 26,
    duzeyler: [
      "Öğrencilerin öğretmenlik mesleğine yönelik motivasyonları yüksektir.",
      "Öğrencilerin öğretmenlik mesleğine yönelik motivasyonları orta düzeydedir.",
      "Öğrencilerin öğretmenlik mesleğine yönelik motivasyonları düşüktür.",
      "Öğrencilerin öğretmenlik mesleğine yönelik motivasyonları çok düşüktür.",
    ],
  },
  {
    altStandart: "3.2.1",
    no: 1,
    metin: "Öğrencilerin derslere katılım göstermesi",
    sayfa: 27,
    duzeyler: [
      "Öğrencilerin derslere katılım düzeyi yüksektir.",
      "Öğrencilerin derslere katılımı orta düzeydedir.",
      "Öğrencilerin derslere katılımı düşüktür.",
      "Öğrencilerin derslere katılımı çok düşüktür.",
    ],
  },
  {
    altStandart: "3.2.1",
    no: 2,
    metin: "Öğrencilerin kişisel ve mesleki gelişimlerine katkı sağlayan etkinliklere katılması",
    sayfa: 27,
    duzeyler: [
      "Öğrenciler, kişisel ve mesleki gelişimlerine katkı sağlayan etkinliklere tam olarak katılır.",
      "Öğrenciler, kişisel ve mesleki gelişimlerine katkı sağlayan etkinliklere büyük ölçüde katılır.",
      "Öğrenciler, kişisel ve mesleki gelişimlerine katkı sağlayan etkinliklere kısmen katılır.",
      "Öğrenciler, kişisel ve mesleki gelişimlerine katkı sağlayan etkinliklere katılmaz.",
    ],
  },
  {
    altStandart: "3.2.1",
    no: 3,
    metin: "Öğrencilerin akademik danışmanlık hizmetlerinden yararlanması",
    sayfa: 27,
    duzeyler: [
      "Öğrencilerin akademik danışmanlık ihtiyaçları tam olarak karşılanır.",
      "Öğrencilerin akademik danışmanlık ihtiyaçları büyük ölçüde karşılanır.",
      "Öğrencilerin akademik danışmanlık ihtiyaçları kısmen karşılanır.",
      "Öğrencilerin akademik danışmanlık ihtiyaçları karşılanmaz.",
    ],
  },
  {
    altStandart: "3.2.1",
    no: 4,
    metin: "Öğrencilerin rehberlik ve psikolojik danışmanlık hizmetlerinden yararlanması",
    sayfa: 27,
    duzeyler: [
      "Öğrenciler, rehberlik ve psikolojik danışmanlık hizmetlerinden tam olarak yararlanır.",
      "Öğrenciler, rehberlik ve psikolojik danışmanlık hizmetlerinden büyük ölçüde yararlanır.",
      "Öğrenciler, rehberlik ve psikolojik danışmanlık hizmetlerden kısmen yararlanır.",
      "Öğrenciler, rehberlik ve psikolojik danışmanlık hizmetlerden yararlanmaz.",
    ],
  },
  {
    altStandart: "3.3.1",
    no: 1,
    metin: "Öğrencilerin programı zamanında tamamlama oranlarının yüksek olması",
    sayfa: 28,
    duzeyler: [
      "Öğrencilerin tamamı programı zamanında tamamlamıştır.",
      "Öğrencilerin büyük bir kısmı programı zamanında tamamlamıştır.",
      "Öğrencilerin bir kısmı programı zamanında tamamlamıştır.",
      "Öğrenciler, programı zamanında tamamlamamıştır.",
    ],
  },
  {
    altStandart: "3.3.1",
    no: 2,
    metin: "Mezunların istihdam oranlarının yüksek olması",
    sayfa: 28,
    duzeyler: [
      "Mezunların istihdam oranları yüksektir.",
      "Mezunların istihdam oranları orta düzeydedir.",
      "Mezunların istihdam oranları düşüktür.",
      "Mezunların istihdam oranları çok düşüktür.",
    ],
  },
  {
    altStandart: "3.3.1",
    no: 3,
    metin: "Mezunların, başarılı bir kariyer gelişimi göstermesi",
    sayfa: 28,
    duzeyler: [
      "Mezunların tamamı başarılı bir kariyer gelişimi gösterir.",
      "Mezunların büyük bir kısmı başarılı bir kariyer gelişimi gösterir.",
      "Mezunların bir kısmı başarılı bir kariyer gelişimi gösterir.",
      "Mezunlar, başarılı bir kariyer gelişimi göstermez.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 1,
    metin:
      "Fakülte ve İl Millî Eğitim Müdürlüğü uygulama koordinatörleri tarafından yönetsel düzenlemelerin gerçekleştirilmiş olması",
    sayfa: 30,
    duzeyler: [
      "Fakülte ve İl Millî Eğitim Müdürlüğü uygulama koordinatörleri tarafından yönetsel düzenlemelerin tamamı gerçekleştirilmiştir.",
      "Fakülte ve İl Millî Eğitim Müdürlüğü uygulama koordinatörleri tarafından yönetsel düzenlemelerin büyük bir kısmı gerçekleştirilmiştir.",
      "Fakülte ve İl Millî Eğitim Müdürlüğü uygulama koordinatörleri tarafından yönetsel düzenlemelerin bir kısmı gerçekleştirilmişti r.",
      "Fakülte ve İl Millî Eğitim Müdürlüğü uygulama koordinatörleri tarafından yönetsel düzenlemeler gerçekleştirilmemişt ir.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 2,
    metin: "Fakülte-okul iş birliği sürecinde tanımlanmış görev ve sorumlulukların ilgili paydaşlara dağıtılmış olması",
    sayfa: 30,
    duzeyler: [
      "Fakülte-okul iş birliği sürecinde tanımlanmış görev ve sorumluluklar tam olarak ilgili paydaşlara dağıtılmıştır.",
      "Fakülte-okul iş birliği sürecinde tanımlanmış görev ve sorumluluklar büyük ölçüde ilgili paydaşlara dağıtılmıştır.",
      "Fakülte-okul iş birliği sürecinde tanımlanmış görev ve sorumluluklar kısmen ilgili paydaşlara dağıtılmıştır.",
      "Fakülte-okul iş birliği sürecinde tanımlanmış görev ve sorumluluklar ilgili paydaşlara dağıtılmamıştır.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 3,
    metin: "Fakülte ve okul uygulama koordinatörleri ile uygulama öğretim elemanı ve öğretmeninin iş birliği yapması",
    sayfa: 30,
    duzeyler: null,
  },
  {
    altStandart: "4.1.1",
    no: 4,
    metin: "Uygulama okulları/ kurumları ile yazışmaların yönergeye uygun yapılması",
    sayfa: 31,
    duzeyler: [
      "Uygulama okulları/ kurumları ile yazışmaların tamamı yönergeye uygun olarak yapılmıştır.",
      "Uygulama okulları/ kurumları ile yazışmaların büyük bir kısmı yönergeye uygun olarak yapılmıştır.",
      "Uygulama okulları/ kurumları ile yazışmaların bir kısmı yönergeye uygun olarak yapılmıştır.",
      "Uygulama okulları/ kurumları ile yazışmalar yönergeye uygun olarak yapılmamıştır.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 5,
    metin:
      "Öğretmenlik uygulaması çalışmalarının yönergede belirtilen uygulama öğretmeni-öğrenci oranlarına göre planlanması",
    sayfa: 31,
    duzeyler: [
      "Öğretmenlik uygulaması çalışmaları, tam olarak yönergede belirtilen uygulama öğretmeni-öğrenci oranlarına göre planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, büyük ölçüde yönergede belirtilen uygulama öğretmeni-öğrenci oranlarına göre planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, kısmen yönergede belirtilen uygulama öğretmeni- öğrenci oranlarına göre planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, yönergede belirtilen uygulama öğretmeni-öğrenci oranlarına göre planlanmamıştır.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 6,
    metin:
      "Öğretmenlik uygulaması çalışmalarının, yönergede belirtilen süre doğrultusunda haftalık olarak planlanmış olması",
    sayfa: 31,
    duzeyler: [
      "Öğretmenlik uygulaması çalışmaları, yönergede belirtilen süre doğrultusunda haftalık olarak planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, yönergede belirtilen süre doğrultusunda büyük ölçüde haftalık olarak planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, yönergede belirtilen süre doğrultusunda kısmen haftalık olarak planlanmıştır.",
      "Öğretmenlik uygulaması çalışmaları, yönergede belirtilen süre doğrultusunda haftalık olarak planlanmamıştır.",
    ],
  },
  {
    altStandart: "4.1.1",
    no: 7,
    metin: "Uygulama öğrencilerinin uygulama ile ilgili yönetsel düzenlemelere ilişkin farkındalıklarının olması",
    sayfa: 31,
    duzeyler: [
      "Uygulama öğrencilerinin uygulama ile ilgili yönetsel düzenlemelere ilişkin farkındalıkları yüksektir.",
      "Uygulama öğrencilerinin uygulama ile ilgili yönetsel düzenlemelere ilişkin farkındalıkları orta düzeydedir.",
      "Uygulama öğrencilerinin uygulama ile ilgili yönetsel düzenlemelere ilişkin farkındalıkları düşüktür.",
      "Uygulama öğrencilerinin uygulama ile ilgili yönetsel düzenlemelere ilişkin farkındalıkları çok düşüktür.",
    ],
  },
  {
    altStandart: "4.2.1",
    no: 1,
    metin: "Fakülte-okul iş birliğinin ilgili paydaşların iş birliği ile gerçekleştirilmesi",
    sayfa: 32,
    duzeyler: [
      "Fakülte-okul iş birliği, ilgili paydaşların tam olarak iş birliği ile gerçekleşmiştir.",
      "Fakülte-okul iş birliği, ilgili paydaşların büyük ölçüde iş birliği ile gerçekleşmiştir.",
      "Fakülte-okul iş birliği, ilgili paydaşların kısmen iş birliği ile gerçekleşmiştir.",
      "Fakülte-okul iş birliği, ilgili paydaşların iş birliği ile gerçekleşmemiştir.",
    ],
  },
  {
    altStandart: "4.2.1",
    no: 2,
    metin: "İlgili paydaşların görev ve sorumluluklarını zamanında ve uygun şekilde yerine getirmesi",
    sayfa: 32,
    duzeyler: [
      "İlgili paydaşlar görev ve sorumluluklarını tam olarak zamanında ve uygun şekilde yerine getirmiştir.",
      "İlgili paydaşlar görev ve sorumluluklarını büyük ölçüde zamanında ve uygun şekilde yerine getirmiştir.",
      "İlgili paydaşlar görev ve sorumluluklarını kısmen zamanında ve uygun şekilde yerine getirmiştir.",
      "İlgili paydaşlar görev ve sorumluluklarını zamanında ve uygun şekilde yerine getirmemiştir.",
    ],
  },
  {
    altStandart: "4.2.1",
    no: 3,
    metin:
      "İlgili paydaşların desteğiyle uygulama öğrencilerinin uygulama okullarında gelişmeleri için olanak sağlanması",
    sayfa: 32,
    duzeyler: [
      "İlgili paydaşların desteğiyle uygulama öğrencilerinin uygulama okullarında gelişmeleri için olanaklar tam olarak sağlanmıştır.",
      "İlgili paydaşların desteğiyle uygulama öğrencilerinin uygulama okullarında gelişmeleri için olanaklar büyük ölçüde sağlanmıştır.",
      "İlgili paydaşların desteğiyle uygulama öğrencilerinin uygulama okullarında gelişmeleri için olanaklar kısmen sağlanmıştır.",
      "İlgili paydaşların desteğiyle uygulama öğrencilerinin uygulama okullarında gelişmeleri için olanaklar sağlanmamıştır.",
    ],
  },
  {
    altStandart: "4.2.1",
    no: 4,
    metin: "Uygulama öğretmenlerinin mesleki gelişimlerine yönelik çalışmaların olması",
    sayfa: 32,
    duzeyler: null,
  },
  {
    altStandart: "4.2.1",
    no: 5,
    metin: "Uygulama sürecinde, ilgili paydaşlarla birlikte paylaşım ve geribildirim toplantıları düzenlenmesi",
    sayfa: 33,
    duzeyler: [
      "Uygulama sürecinde, ilgili paydaşlarla birlikte paylaşım ve geribildirim için düzenlenen toplantılar tam olarak yeterlidir.",
      "Uygulama sürecinde, ilgili paydaşlarla birlikte paylaşım ve geribildirim için düzenlenen toplantılar büyük ölçüde yeterlidir.",
      "Uygulama sürecinde, ilgili paydaşlarla birlikte paylaşım ve geribildirim için düzenlenen toplantılar kısmen yeterlidir.",
      "Uygulama sürecinde, ilgili paydaşlarla birlikte paylaşım ve geribildirim için düzenlenen toplantılar yeterli değildir.",
    ],
  },
  {
    altStandart: "4.2.2",
    no: 1,
    metin: "Uygulama okulu koordinatörleri ve öğretmenlerinin, uygulama öğrencilerini desteklemesi",
    sayfa: 33,
    duzeyler: null,
  },
  {
    altStandart: "4.2.2",
    no: 2,
    metin: "Uygulama öğrencilerine, etkileşim için yeterli zamanın sağlanması",
    sayfa: 34,
    duzeyler: [
      "Uygulama öğrencilerine, etkileşim için yeterli zaman sağlanmıştır.",
      "Uygulama öğrencilerine, etkileşim için büyük ölçüde zaman sağlanmıştır.",
      "Uygulama öğrencilerine, etkileşim için kısmen zaman sağlanmıştır.",
      "Uygulama öğrencilerine, etkileşim için zaman sağlanmamıştır.",
    ],
  },
  {
    altStandart: "4.2.2",
    no: 3,
    metin: "Uygulama öğrencilerine, alanlarına uygun öğrenci grubu ile çalışma olanağının sağlanması",
    sayfa: 34,
    duzeyler: [
      "Uygulama öğrencilerine, alanlarına uygun öğrenci grubu ile tam olarak çalışma olanağı sağlanmıştır.",
      "Uygulama öğrencilerine, alanlarına uygun öğrenci grubu ile çoğu zaman çalışma olanağı sağlanmıştır.",
      "Uygulama öğrencilerine, alanlarına uygun öğrenci grubu ile ara sıra çalışma olanağı sağlanmıştır.",
      "Uygulama öğrencilerine, alanlarına uygun öğrenci grubu ile çalışma olanağı sağlanmamıştır.",
    ],
  },
  {
    altStandart: "4.2.2",
    no: 4,
    metin: "Uygulama ortamlarının ilgili paydaşların iş birliği ile hazırlanması",
    sayfa: 34,
    duzeyler: [
      "Uygulama ortamlarının tamamı ilgili paydaşların iş birliği ile hazırlanmıştır.",
      "Uygulama ortamları büyük ölçüde ilgili paydaşların iş birliği ile hazırlanmıştır.",
      "Uygulama ortamları kısmen ilgili paydaşların iş birliği ile hazırlanmıştır.",
      "Uygulama ortamları ilgili paydaşların iş birliği ile hazırlanmamıştır.",
    ],
  },
  {
    altStandart: "4.2.2",
    no: 5,
    metin: "Uygulama öğrencilerine, branşlarına uygun alt yapı olanaklarının sağlanması",
    sayfa: 34,
    duzeyler: [
      "Uygulama öğrencilerine, branşlarına uygun alt yapı olanakları tam olarak sağlanmıştır.",
      "Uygulama öğrencilerine, branşlarına uygun alt yapı olanakları büyük ölçüde sağlanmıştır.",
      "Uygulama öğrencilerine, branşlarına uygun alt yapı olanakları kısmen sağlanmıştır.",
      "Uygulama öğrencilerine, branşlarına uygun alt yapı olanakları sağlanmamıştır.",
    ],
  },
  {
    altStandart: "4.3.1",
    no: 1,
    metin: "Uygulama öğrencilerinin, öğretim ilkelerine uygun ders planı hazırlaması",
    sayfa: 35,
    duzeyler: [
      "Uygulama öğrencileri, öğretim ilkelerine tam olarak uygun ders planı hazırlamıştır.",
      "Uygulama öğrencileri, öğretim ilkelerine büyük ölçüde uygun ders planı hazırlamıştır.",
      "Uygulama öğrencileri, öğretim ilkelerine kısmen uygun ders planı hazırlamıştır.",
      "Uygulama öğrencileri, öğretim ilkelerine uygun ders planı hazırlamamıştır.",
    ],
  },
  {
    altStandart: "4.3.1",
    no: 2,
    metin: "Uygulama öğrencilerinin, hazırladıkları ders planını etkili bir şekilde uygulaması",
    sayfa: 35,
    duzeyler: [
      "Uygulama öğrencileri, hazırladıkları ders planını etkili bir şekilde uygulamıştır.",
      "Uygulama öğrencileri, hazırladıkları ders planını oldukça etkili bir şekilde uygulamıştır.",
      "Uygulama öğrencileri, hazırladıkları ders planını kısmen etkili bir şekilde uygulamıştır.",
      "Uygulama öğrencileri, hazırladıkları ders planını etkili bir şekilde uygulamamıştır.",
    ],
  },
  {
    altStandart: "4.3.1",
    no: 3,
    metin:
      "Uygulama öğrencilerinin, öğrenme sürecinde amacına uygun ölçme- değerlendirme yöntemlerini etkili bir şekilde kullanması",
    sayfa: 35,
    duzeyler: [
      "Uygulama öğrencileri, öğrenme sürecinde amacına uygun ölçme- değerlendirme yöntemlerini etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğrenme sürecinde amacına uygun ölçme- değerlendirme yöntemlerini oldukça etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğrenme sürecinde amacına uygun ölçme- değerlendirme yöntemlerini kısmen etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğrenme sürecinde amacına uygun ölçme- değerlendirme yöntemlerini etkili bir şekilde kullanmamıştır.",
    ],
  },
  {
    altStandart: "4.3.1",
    no: 4,
    metin: "Uygulama öğrencilerinin, değerlendirme ve geribildirimleri uygulama sürecini geliştirmede kullanması",
    sayfa: 35,
    duzeyler: [
      "Uygulama öğrencileri, öğretme- öğrenme süreçlerini geliştirmek için değerlendirme ve geribildirimleri etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğretme-öğrenme süreçlerini geliştirmek için değerlendirme ve geribildirimleri oldukça etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğretme-öğrenme süreçlerini geliştirmek için değerlendirme ve geribildirimleri kısmen etkili bir şekilde kullanmıştır.",
      "Uygulama öğrencileri, öğretme- öğrenme süreçlerini geliştirmek için değerlendirme ve geribildirimleri etkili bir şekilde kullanmamıştır.",
    ],
  },
  {
    altStandart: "5.1.1",
    no: 1,
    metin:
      "Tesislerin, eğitim programını etkin bir biçimde uygulamak için gerekli fiziksel ve teknik altyapıya sahip olması",
    sayfa: 37,
    duzeyler: [
      "Tesisler, eğitim programını etkin bir biçimde uygulamak için gerekli fiziksel ve teknik altyapıya sahiptir.",
      "Tesisler, eğitim programını etkin bir biçimde uygulamak için gerekli fiziksel ve teknik altyapıya büyük ölçüde sahiptir.",
      "Tesisler, eğitim programını etkin bir biçimde uygulamak için gerekli fiziksel ve teknik altyapıya kısmen sahiptir.",
      "Tesisler, eğitim programını etkin bir biçimde uygulamak için gerekli fiziksel ve teknik altyapıya sahip değildir.",
    ],
  },
  {
    altStandart: "5.1.1",
    no: 2,
    metin: "Tesislerde olası tehlikeler ve kazalara karşı gerekli önlemlerin alınmış olması",
    sayfa: 37,
    duzeyler: [
      "Tesislerde olası tehlikeler ve kazalara karşı gerekli önlemler alınmıştır.",
      "Tesislerde olası tehlikeler ve kazalara karşı gerekli önlemler büyük ölçüde alınmıştır.",
      "Tesislerde olası tehlikeler ve kazalara karşı gerekli önlemler kısmen alınmıştır.",
      "Tesislerde olası tehlikeler ve kazalara karşı gerekli önlemler alınmamıştır.",
    ],
  },
  {
    altStandart: "5.1.1",
    no: 3,
    metin: "Tesislerde çalışma ve mevcut donanımın kullanımı ile ilgili esasların belirlenmiş olması",
    sayfa: 37,
    duzeyler: [
      "Tesislerde çalışma ve mevcut donanımın kullanımı ile ilgili esaslar belirlenmiştir.",
      "Tesislerde çalışma ve mevcut donanımın kullanımı ile ilgili esaslar büyük ölçüde belirlenmiştir.",
      "Tesislerde çalışma ve mevcut donanımın kullanımı ile ilgili esaslar kısmen belirlenmiştir.",
      "Tesislerde çalışma ve mevcut donanımın kullanımı ile ilgili esaslar belirlenmemiştir.",
    ],
  },
  {
    altStandart: "5.1.1",
    no: 4,
    metin: "Tesislerde sorumlu personelin bulunması",
    sayfa: 37,
    duzeyler: [
      "Tesislerde bulunan sorumlu personel sayısı yeterlidir.",
      "Tesislerde bulunan sorumlu personel sayısı büyük ölçüde yeterlidir.",
      "Tesislerde bulunan sorumlu personel sayısı kısmen yeterlidir.",
      "Tesislerde bulunan sorumlu personel sayısı yeterli değildir.",
    ],
  },
  {
    altStandart: "5.1.1",
    no: 5,
    metin: "Tesislere fiziksel erişimin kolay olması",
    sayfa: 37,
    duzeyler: [
      "Tesislere fiziksel erişim kolaydır.",
      "Tesislere fiziksel erişim büyük ölçüde kolaydır.",
      "Tesislere fiziksel erişim kısmen kolaydır.",
      "Tesislere fiziksel erişim kolay değildir.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 1,
    metin: "Kütüphanedeki kitap, süreli yayın ve veri tabanlarının nicelik ve nitelik açısından programı desteklemesi",
    sayfa: 38,
    duzeyler: [
      "Kütüphanedeki kitap, süreli yayın ve veri tabanlarının nicelik ve nitelik açısından programı desteklemektedir.",
      "Kütüphanedeki kitap, süreli yayın ve veri tabanlarının nicelik ve nitelik açısından programı büyük ölçüde desteklemektedir.",
      "Kütüphanedeki kitap, süreli yayın ve veri tabanlarının nicelik ve nitelik açısından programı kısmen desteklemektedir.",
      "Kütüphanedeki kitap, süreli yayın ve veri tabanlarının nicelik ve nitelik açısından programı desteklememektedir.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 2,
    metin: "Kütüphane erişim sisteminin etkin olarak çalışması",
    sayfa: 38,
    duzeyler: [
      "Kütüphane erişim sistemi etkin olarak çalışmaktadır.",
      "Kütüphane erişim sistemi büyük ölçüde çalışmaktadır.",
      "Kütüphane erişim sistemi kısmen çalışmaktadır.",
      "Kütüphane erişim sistemi çalışmamaktadır.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 3,
    metin: "Çevrimiçi kaynakların çeşitlilik göstermesi ve bu kaynaklara erişilebilmesi",
    sayfa: 38,
    duzeyler: null,
  },
  {
    altStandart: "5.1.2",
    no: 4,
    metin: "Kütüphanenin açık olduğu saatlerin öğrenci ihtiyacını karşılayacak düzeyde olması",
    sayfa: 39,
    duzeyler: [
      "Kütüphanenin açık olduğu saatler öğrenci ihtiyacını karşılayacak düzeydedir.",
      "Kütüphanenin açık olduğu saatler öğrenci ihtiyacını büyük ölçüde karşılayacak düzeydedir.",
      "Kütüphanenin açık olduğu saatler öğrenci ihtiyacını kısmen karşılayacak düzeydedir.",
      "Kütüphanenin açık olduğu saatler öğrenci ihtiyacını karşılayacak düzeyde değildir.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 5,
    metin: "Öğrencilere, kütüphanenin kullanımı konusunda etkin rehberlik hizmeti sunulması",
    sayfa: 39,
    duzeyler: null,
  },
  {
    altStandart: "5.1.2",
    no: 6,
    metin:
      "Kütüphanenin, talepleri düzenli olarak karşılayabilecek kitap ve süreli yayın istem/talep sistemine sahip olması",
    sayfa: 39,
    duzeyler: [
      "Kütüphane, talepleri düzenli olarak karşılayabilecek kitap ve süreli yayın istem/talep sistemine sahiptir.",
      "Kütüphane, talepleri düzenli olarak karşılayabilecek kitap ve süreli yayın istem/talep sistemine büyük ölçüde sahiptir.",
      "Kütüphane, talepleri düzenli olarak karşılayabilecek kitap ve süreli yayın istem/talep sistemine kısmen sahiptir.",
      "Kütüphane, talepleri düzenli olarak karşılayabilecek kitap ve süreli yayın istem/talep sistemine sahip değildir.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 7,
    metin: "Fotokopi olanakları ve internet erişiminin yeterli olması",
    sayfa: 39,
    duzeyler: [
      "Fotokopi olanakları ve internet erişimi yeterlidir.",
      "Fotokopi olanakları ve internet erişimi büyük ölçüde yeterlidir.",
      "Fotokopi olanakları ve internet erişimi kısmen yeterlidir.",
      "Fotokopi olanakları ve internet erişimi yeterli değildir.",
    ],
  },
  {
    altStandart: "5.1.2",
    no: 8,
    metin: "Kütüphaneye fiziksel erişimin kolay olması",
    sayfa: 39,
    duzeyler: [
      "Kütüphaneye fiziksel erişim kolaydır.",
      "Kütüphaneye fiziksel erişim büyük ölçüde kolaydır.",
      "Kütüphaneye fiziksel erişim kısmen kolaydır.",
      "Kütüphaneye fiziksel erişim kolay değildir.",
    ],
  },
  {
    altStandart: "5.1.3",
    no: 1,
    metin: "Derslik sayısının, programda yer alan derslerin yürütülmesi için yeterli olması",
    sayfa: 40,
    duzeyler: [
      "Derslik sayısı, programda yer alan derslerin yürütülmesi için yeterlidir.",
      "Derslik sayısı, programda yer alan derslerin yürütülmesi için büyük ölçüde yeterlidir.",
      "Derslik sayısı, programda yer alan derslerin yürütülmesi için kısmen yeterlidir.",
      "Derslik sayısı, programda yer alan derslerin yürütülmesi için yeterli değildir.",
    ],
  },
  {
    altStandart: "5.1.3",
    no: 2,
    metin: "Derslik başına düşen öğrenci sayısının uygun olması",
    sayfa: 40,
    duzeyler: [
      "Derslik başına düşen öğrenci sayısı uygundur.",
      "Derslik başına düşen öğrenci sayısı büyük ölçüde uygundur.",
      "Derslik başına düşen öğrenci sayısı kısmen uygundur.",
      "Derslik başına düşen öğrenci sayısı uygun değildir.",
    ],
  },
  {
    altStandart: "5.1.3",
    no: 3,
    metin: "Öğretme- öğrenme ortamını etkileyen ısı, ışık ve gürültü düzeyi gibi çevresel faktörlerin uygun olması",
    sayfa: 40,
    duzeyler: [
      "Öğretme-öğrenme ortamını etkileyen ısı, ışık ve gürültü düzeyi gibi çevresel faktörler uygundur.",
      "Öğretme- öğrenme ortamını etkileyen ısı, ışık ve gürültü düzeyi gibi çevresel faktörler büyük ölçüde uygundur.",
      "Öğretme-öğrenme ortamını etkileyen ısı, ışık ve gürültü düzeyi gibi çevresel faktörler kısmen uygundur.",
      "Öğretme-öğrenme ortamını etkileyen ısı, ışık ve gürültü düzeyi gibi çevresel faktörler uygun değildir.",
    ],
  },
  {
    altStandart: "5.1.3",
    no: 4,
    metin:
      "Dersliklerin farklı öğretim yöntemlerinin uygulanabilmesi için gerekli fiziksel özelliklere ve donanıma sahip olması",
    sayfa: 40,
    duzeyler: [
      "Dersliklerin tamamı farklı öğretim yöntemlerinin uygulanabilmesi için gerekli fiziksel özelliklere ve donanıma sahiptir.",
      "Dersliklerin çoğunluğu farklı öğretim yöntemlerinin uygulanabilmesi için gerekli fiziksel özelliklere ve donanıma sahiptir.",
      "Dersliklerin bir kısmı farklı öğretim yöntemlerinin uygulanabilmesi için gerekli fiziksel özelliklere ve donanıma sahiptir.",
      "Derslikler farklı öğretim yöntemlerinin uygulanabilmesi için gerekli fiziksel özelliklere ve donanıma sahip değildir.",
    ],
  },
  {
    altStandart: "5.1.4",
    no: 1,
    metin:
      "Öğretim elemanlarının, yeterli sayıda çalışma odasına ve görevlerini etkin bir biçimde yerine getirmeleri için gerekli donanıma sahip olması",
    sayfa: 41,
    duzeyler: [
      "Öğretim elemanlarının tamamı, yeterli sayıda çalışma odasına ve görevlerini etkin bir biçimde yerine getirmeleri için gerekli donanıma sahiptir.",
      "Öğretim elemanlarının çoğunluğu, yeterli sayıda çalışma odasına ve görevlerini etkin bir biçimde yerine getirmeleri için gerekli donanıma sahiptir.",
      "Öğretim elemanlarının bir kısmı, yeterli sayıda çalışma odasına ve görevlerini etkin bir biçimde yerine getirmeleri için gerekli donanıma sahiptir.",
      "Öğretim elemanları, yeterli sayıda çalışma odasına ve görevlerini etkin bir biçimde yerine getirmeleri için gerekli donanıma sahip değildir.",
    ],
  },
  {
    altStandart: "5.1.4",
    no: 2,
    metin:
      "Kütüphane, faks, fotokopi, çevrimiçi hizmetler vb. donanımların öğretim elemanlarının kullanımına açık olması",
    sayfa: 41,
    duzeyler: [
      "Kütüphane, faks, fotokopi, çevrimiçi hizmetler vb. donanımlar öğretim elemanlarının kullanımına açıktır.",
      "Kütüphane, faks, fotokopi, çevrimiçi hizmetler vb. donanımlar öğretim elemanlarının kullanımına büyük ölçüde açıktır.",
      "Kütüphane, faks, fotokopi, çevrimiçi hizmetler vb. donanımlar öğretim elemanlarının kullanımına kısmen açıktır.",
      "Kütüphane, faks, fotokopi, çevrimiçi hizmetler vb. donanımlar öğretim elemanlarının kullanımına açık değildir.",
    ],
  },
  {
    altStandart: "5.1.4",
    no: 3,
    metin: "Programa destek veren idari ve teknik destek personelin bulunması",
    sayfa: 41,
    duzeyler: [
      "Programa destek veren idari ve teknik destek personeli sayısı yeterlidir.",
      "Programa destek veren idari ve teknik destek personeli büyük ölçüde yeterlidir.",
      "Programa destek veren idari ve teknik destek personeli kısmen yeterlidir.",
      "Programa destek veren idari ve teknik destek personeli sayısı yeterli değildir.",
    ],
  },
  {
    altStandart: "5.1.4",
    no: 4,
    metin:
      "Üniversite/Fakülte kaynaklarının (ekonomik, fiziki, teknik kaynaklar ve öğrenme ortamlarının donanımı vb.) eğitim programıyla uyumlu olması",
    sayfa: 41,
    duzeyler: [
      "Üniversite/Fakülte kaynakları eğitim programıyla uyumludur.",
      "Üniversite/Fakülte kaynakları eğitim programıyla büyük ölçüde uyumludur.",
      "Üniversite/Fakülte kaynakları eğitim programıyla kısmen uyumludur.",
      "Üniversite/Fakülte kaynakları eğitim programıyla uyumlu değildir.",
    ],
  },
  {
    altStandart: "5.1.5",
    no: 1,
    metin: "Tesislerin, özel gereksinimli bireylere uygun olarak düzenlenmiş olması",
    sayfa: 42,
    duzeyler: [
      "Tesisler, özel gereksinimli bireylere uygun olarak düzenlenmiştir.",
      "Tesisler, özel gereksinimli bireylere büyük ölçüde uygun olarak düzenlenmiştir.",
      "Tesisler, özel gereksinimli bireylere kısmen uygun olarak düzenlenmiştir.",
      "Tesisler, özel gereksinimli bireylere uygun olarak düzenlenmemiştir.",
    ],
  },
  {
    altStandart: "5.1.5",
    no: 2,
    metin: "Öğrenme ortamlarının, özel gereksinimli bireylere uygun olarak düzenlenmiş olması",
    sayfa: 42,
    duzeyler: [
      "Öğrenme ortamları, özel gereksinimli bireylere uygun olarak düzenlenmiştir.",
      "Öğrenme ortamları, özel gereksinimli bireylere büyük ölçüde uygun olarak düzenlenmiştir.",
      "Öğrenme ortamları, özel gereksinimli bireylere kısmen uygun olarak düzenlenmiştir.",
      "Öğrenme ortamları, özel gereksinimli bireylere uygun olarak düzenlenmemiştir.",
    ],
  },
  {
    altStandart: "5.1.5",
    no: 3,
    metin: "Öğrenme kaynaklarının, özel gereksinimli bireylere uygun olarak düzenlenmiş olması",
    sayfa: 42,
    duzeyler: [
      "Öğrenme kaynakları, özel gereksinimli bireylere uygun olarak düzenlenmiştir.",
      "Öğrenme kaynakları, özel gereksinimli bireylere büyük ölçüde uygun olarak düzenlenmiştir.",
      "Öğrenme kaynakları, özel gereksinimli bireylere kısmen uygun olarak düzenlenmiştir.",
      "Öğrenme kaynakları, özel gereksinimli bireylere uygun olarak düzenlenmemiştir.",
    ],
  },
  {
    altStandart: "5.2.1",
    no: 1,
    metin: "Eğitim- öğretim amaçlı ortamların ve dersliklerin kullanımının planlanmış olması",
    sayfa: 43,
    duzeyler: [
      "Eğitim-öğretim amaçlı ortamların ve dersliklerin tamamının kullanımı planlanmıştır.",
      "Eğitim-öğretim amaçlı ortamların ve dersliklerin çoğunluğunun kullanımı planlanmıştır.",
      "Eğitim-öğretim amaçlı ortamların ve dersliklerin bir kısmının kullanımı planlanmıştır.",
      "Eğitim-öğretim amaçlı ortamların ve dersliklerin kullanımı planlanmamıştır.",
    ],
  },
  {
    altStandart: "5.2.1",
    no: 2,
    metin: "Öğretim faaliyetlerinin uygun ortamlarda yapılması",
    sayfa: 43,
    duzeyler: [
      "Öğretim faaliyetleri uygun ortamlarda yapılmaktadır.",
      "Öğretim faaliyetleri büyük ölçüde uygun ortamlarda yapılmaktadır.",
      "Öğretim faaliyetleri kısmen uygun ortamlarda yapılmaktadır.",
      "Öğretim faaliyetleri uygun ortamlarda yapılmamaktadır.",
    ],
  },
  {
    altStandart: "5.2.1",
    no: 3,
    metin: "Öğrencilerin, eğitim tesis ve donanımlarını kendi eğitsel amaçları doğrultusunda kullanması",
    sayfa: 43,
    duzeyler: [
      "Öğrenciler, eğitim tesis ve donanımlarını kendi eğitsel amaçları doğrultusunda kullanmaktadır.",
      "Öğrenciler, eğitim tesis ve donanımlarını büyük ölçüde kendi eğitsel amaçları doğrultusunda kullanmaktadır.",
      "Öğrenciler, eğitim tesis ve donanımlarını kısmen kendi eğitsel amaçları doğrultusunda kullanmaktadır.",
      "Öğrenciler, eğitim tesis ve donanımlarını kendi eğitsel amaçları doğrultusunda kullanmamaktadır.",
    ],
  },
  {
    altStandart: "5.2.1",
    no: 4,
    metin: "Öğrencilere öğretme- öğrenme sürecinde gerekli teknolojik desteğin sağlanması",
    sayfa: 43,
    duzeyler: [
      "Öğrencilere öğretme-öğrenme sürecinde gerekli teknolojik destek sağlanmaktadır.",
      "Öğrencilere öğretme-öğrenme sürecinde gerekli teknolojik destek büyük ölçüde sağlanmaktadır.",
      "Öğrencilere öğretme-öğrenme sürecinde gerekli teknolojik destek kısmen sağlanmaktadır.",
      "Öğrencilere öğretme- öğrenme sürecinde gerekli teknolojik destek sağlanmamaktadır.",
    ],
  },
  {
    altStandart: "5.2.1",
    no: 5,
    metin: "Öğrencilerin, sosyal ve kültürel etkinlikler için üniversite ve fakülte tesislerinden yararlanması",
    sayfa: 43,
    duzeyler: null,
  },
  {
    altStandart: "5.2.2",
    no: 1,
    metin: "Öğrencilerin, kütüphane kaynaklarını etkili şekilde kullanması",
    sayfa: 44,
    duzeyler: [
      "Öğrenciler, kütüphane kaynaklarını etkili kullanmaktadır.",
      "Öğrenciler, kütüphane kaynaklarını büyük ölçüde etkili kullanmaktadır.",
      "Öğrenciler, kütüphane kaynaklarını kısmen etkili kullanmaktadır.",
      "Öğrenciler, kütüphane kaynaklarını etkili kullanmamaktadır.",
    ],
  },
  {
    altStandart: "5.2.2",
    no: 2,
    metin: "Öğretim elemanlarının, kütüphane kaynaklarını etkili şekilde kullanması",
    sayfa: 44,
    duzeyler: [
      "Öğretim elemanları, kütüphane kaynaklarını etkili kullanmaktadır.",
      "Öğretim elemanları, kütüphane kaynaklarını büyük ölçüde kullanmaktadır.",
      "Öğretim elemanları, kütüphane kaynaklarını kısmen kullanmaktadır.",
      "Öğretim elemanları, kütüphane kaynaklarını kullanmamaktadır.",
    ],
  },
  {
    altStandart: "5.2.2",
    no: 3,
    metin: "Kütüphaneden talep edilen teknik desteğin sağlanması",
    sayfa: 44,
    duzeyler: [
      "Kütüphaneden talep edilen teknik destek sağlanmaktadır.",
      "Kütüphaneden talep edilen teknik destek büyük ölçüde sağlanmaktadır.",
      "Kütüphaneden talep edilen teknik destek kısmen sağlanmaktadır.",
      "Kütüphaneden talep edilen teknik destek sağlanmamaktadır.",
    ],
  },
  {
    altStandart: "5.3.1",
    no: 1,
    metin: "Derslik, tesis ve kütüphane kaynaklarının kullanımının izlenmesi ve paydaşlarla değerlendirilme si",
    sayfa: 45,
    duzeyler: [
      "Derslik, tesis ve kütüphane kaynaklarının kullanımı izlenmekte ve paydaşlarla değerlendirilmekted ir.",
      "Derslik, tesis ve kütüphane kaynaklarının kullanımı büyük ölçüde izlenmekte ve paydaşlarla değerlendirilmekted ir.",
      "Derslik, tesis ve kütüphane kaynaklarının kullanımı kısmen izlenmekte ve paydaşlarla değerlendirilmekted ir.",
      "Derslik, tesis ve kütüphane kaynaklarının kullanımı izlenmemekte ve paydaşlarla değerlendirilmemekte dir.",
    ],
  },
  {
    altStandart: "5.3.1",
    no: 2,
    metin:
      "Derslik, tesis ve kütüphane kaynakları ve kullanımına ilişkin değerlendirme sonuçlarına göre gerekli önlemlerin alınması",
    sayfa: 45,
    duzeyler: [
      "Derslik, tesis ve kütüphane kaynakları ve kullanımına ilişkin değerlendirme sonuçlarına göre gerekli önlemler alınmaktadır.",
      "Derslik, tesis ve kütüphane kaynakları ve kullanımına ilişkin değerlendirme sonuçlarına göre gerekli önlemler büyük ölçüde alınmaktadır.",
      "Derslik, tesis ve kütüphane kaynakları ve kullanımına ilişkin değerlendirme sonuçlarına göre gerekli önlemler kısmen alınmaktadır.",
      "Derslik, tesis ve kütüphane kaynakları ve kullanımına ilişkin değerlendirme sonuçlarına göre gerekli önlemler alınmamaktadır.",
    ],
  },
  {
    altStandart: "6.1.1",
    no: 1,
    metin: "Fakültenin vizyon ve misyonunun görünür olması ve paydaşları tarafından bilinmesi",
    sayfa: 47,
    duzeyler: [
      "Fakültenin vizyon ve misyonu görünür olup paydaşları tarafından tam olarak bilinmektedir.",
      "Fakültenin vizyon ve misyonu görünür olup paydaşları tarafından büyük ölçüde bilinmektedir.",
      "Fakültenin vizyon ve misyonu görünür olup paydaşları tarafından kısmen bilinmektedir.",
      "Fakültenin vizyon ve misyonu görünür olup paydaşlar tarafından bilinmemektedir.",
    ],
  },
  {
    altStandart: "6.1.1",
    no: 2,
    metin:
      "Fakülte vizyon ve misyonunun paydaş görüşleri ve yeni eğilimler doğrultusunda elde edilen verilere dayalı olarak güncellenmesi",
    sayfa: 47,
    duzeyler: [
      "Fakülte vizyon ve misyonu, tam olarak paydaş görüşleri ve yeni eğilimler doğrultusunda elde edilen verilere dayalı olarak güncellenmektedir.",
      "Fakülte vizyon ve misyonu, büyük ölçüde paydaş görüşleri ve yeni eğilimler doğrultusunda elde edilen verilere dayalı olarak güncellenmektedir.",
      "Fakülte vizyon ve misyonu, kısmen paydaş görüşleri ve yeni eğilimler doğrultusunda elde edilen verilere dayalı olarak güncellenmektedir.",
      "Fakülte vizyon ve misyonu, paydaş görüşleri ve yeni eğilimler doğrultusunda elde edilen verilere dayalı olarak güncellenmemektedir.",
    ],
  },
  {
    altStandart: "6.1.1",
    no: 3,
    metin: "Program yeterlilikleri ile fakülte vizyon ve misyonunun tutarlı olması",
    sayfa: 47,
    duzeyler: [
      "Program yeterlilikleri ile fakülte vizyon ve misyonu tam olarak tutarlıdır.",
      "Program yeterlilikleri ile fakülte vizyon ve misyonu büyük ölçüde tutarlıdır.",
      "Program yeterlilikleri ile fakülte vizyon ve misyonu kısmen tutarlıdır.",
      "Program yeterlilikleri ile fakülte vizyon ve misyonu tutarlı değildir.",
    ],
  },
  {
    altStandart: "6.1.2",
    no: 1,
    metin:
      "Öğretmen eğitimindeki gelişmelerle ilgili fakültenin vizyon ve misyonuna uygun çalışma grupları veya komisyonların bulunması",
    sayfa: 48,
    duzeyler: [
      "Öğretmen eğitimindeki gelişmelerle ilgili fakültenin vizyon ve misyonuna uygun çalışma grupları veya komisyonlar bulunmaktadır.",
      "Öğretmen eğitimindeki gelişmelerle ilgili fakültenin vizyon ve misyonuna büyük ölçüde uygun çalışma grupları veya komisyonlar bulunmaktadır.",
      "Öğretmen eğitimindeki gelişmelerle ilgili fakültenin vizyon ve misyonuna kısmen uygun çalışma grupları veya komisyonlar bulunmaktadır.",
      "Öğretmen eğitimindeki gelişmelerle ilgili fakültenin vizyon ve misyonuna uygun çalışma grupları veya komisyonlar bulunmamaktadır.",
    ],
  },
  {
    altStandart: "6.1.2",
    no: 2,
    metin:
      "Öğrencilerin ve öğretim elemanlarının karar alma süreçlerine katılımını sağlamak için düzenlemelerin yapılmış olması.",
    sayfa: 48,
    duzeyler: [
      "Öğrencilerin ve öğretim elemanlarının karar alma süreçlerine katılımını sağlamak için düzenlemeler yapılmıştır.",
      "Öğrencilerin ve öğretim elemanlarının karar alma süreçlerinin katılımını sağlamak için büyük ölçüde düzenlemeler yapılmıştır.",
      "Öğrencilerin ve öğretim elemanlarının karar alma süreçlerine katılımını sağlamak için kısmen düzenlemeler yapılmıştır.",
      "Öğrencilerin ve öğretim elemanlarının karar alma süreçlerine katılımını sağlamak için düzenlemeler yapılmamıştır.",
    ],
  },
  {
    altStandart: "6.1.2",
    no: 3,
    metin: "Fakülte genelinde etkin bir iletişim ağının olması",
    sayfa: 48,
    duzeyler: [
      "Fakültede etkin bir iletişim ağı mevcuttur.",
      "Fakültede etkin bir iletişim ağı büyük ölçüde mevcuttur.",
      "Fakültede etkin bir iletişim ağı kısmen mevcuttur.",
      "Fakültede etkin bir iletişim ağı mevcut değildir.",
    ],
  },
  {
    altStandart: "6.2.1",
    no: 1,
    metin: "Yönetim birimlerinin düzenli olarak toplanması ve iş birliği içinde çalışması.",
    sayfa: 49,
    duzeyler: [
      "Yönetim birimleri düzenli olarak toplanmakta ve iş birliği içinde çalışmaktadır.",
      "Yönetim birimleri genellikle toplanmakta ve iş birliği içinde çalışmaktadır.",
      "Yönetim birimleri nadiren toplanmakta ve sınırlı bir iş birliği içinde çalışmaktadır.",
      "Yönetim birimleri düzenli olarak toplanmamakta ve iş birliği içinde çalışmamaktadır.",
    ],
  },
  {
    altStandart: "6.2.1",
    no: 2,
    metin: "Karar süreçlerine ilgili tüm birimlerin katılması",
    sayfa: 49,
    duzeyler: [
      "Karar süreçlerine ilgili tüm birimler katılmaktadır.",
      "Karar süreçlerine ilgili birimlerin çoğunluğu katılmaktadır.",
      "Karar süreçlerine ilgili birimlerin bir kısmı katılmaktadır.",
      "Karar süreçlerine ilgili birimler katılmamaktadır.",
    ],
  },
  {
    altStandart: "6.2.1",
    no: 3,
    metin: "Yönetimin ulaşılabilir olması",
    sayfa: 49,
    duzeyler: [
      "Yönetim ulaşılabilirdir.",
      "Yönetim büyük ölçüde ulaşılabilirdir.",
      "Yönetim kısmen ulaşılabilirdir.",
      "Yönetim ulaşılabilir değildir.",
    ],
  },
  {
    altStandart: "6.2.1",
    no: 4,
    metin: "Düzenli bir arşiv ve kayıt sisteminin bulunması",
    sayfa: 49,
    duzeyler: [
      "Arşiv ve kayıt sistemi düzenlidir.",
      "Arşiv ve kayıt sistemi büyük ölçüde düzenlidir.",
      "Arşiv ve kayıt sistemi kısmen düzenlidir.",
      "Arşiv ve kayıt sistemi düzenli değildir.",
    ],
  },
  {
    altStandart: "6.2.2",
    no: 1,
    metin:
      "Fakülte yönetiminin, ulusal düzeyde öğretmen eğitimi politikalarını geliştirmeye yönelik çalışmalarının olması",
    sayfa: 50,
    duzeyler: [
      "Fakülte yönetiminin, ulusal düzeyde öğretmen eğitimi politikalarını geliştirmeye yönelik çalışmaları bulunmaktadır.",
      "Fakülte yönetiminin, ulusal düzeyde öğretmen eğitimi politikalarını geliştirmeye yönelik çalışmaları büyük ölçüde bulunmaktadır.",
      "Fakülte yönetiminin, ulusal düzeyde öğretmen eğitimi politikalarını geliştirmeye yönelik çalışmaları kısmen bulunmaktadır.",
      "Fakülte yönetiminin, ulusal düzeyde öğretmen eğitimi politikalarını geliştirmeye yönelik çalışmaları bulunmamaktadır.",
    ],
  },
  {
    altStandart: "6.2.2",
    no: 2,
    metin:
      "Fakülte yönetiminin, öğretmen eğitiminin geliştirilmesi için hedefler belirlemesi ve eylem planı oluşturması",
    sayfa: 50,
    duzeyler: [
      "Fakülte yönetimi öğretmen eğitiminin geliştirilmesi için etkili hedefler ve eylem planı oluşturmuştur.",
      "Fakülte yönetimi öğretmen eğitiminin geliştirilmesi için oldukça etkili hedefler ve eylem planı oluşturmuştur.",
      "Fakülte yönetimi öğretmen eğitiminin geliştirilmesi için kısmen etkili hedefler ve eylem planı oluşturmuştur.",
      "Fakülte yönetimi öğretmen eğitiminin geliştirilmesi için etkili hedefler ve eylem planı oluşturmamıştır.",
    ],
  },
  {
    altStandart: "6.2.2",
    no: 3,
    metin: "Fakülte yönetiminin, öğretmen eğitimine yönelik bilimsel çalışmaları desteklemesi",
    sayfa: 50,
    duzeyler: [
      "Fakülte yönetimi öğretmen eğitimine yönelik bilimsel çalışmaları desteklemektedir.",
      "Fakülte yönetimi öğretmen eğitimine yönelik bilimsel çalışmaları büyük ölçüde desteklemektedir.",
      "Fakülte yönetimi öğretmen eğitimine yönelik bilimsel çalışmaları kısmen desteklemektedir.",
      "Fakülte yönetimi öğretmen eğitimine yönelik bilimsel çalışmaları desteklememektedir.",
    ],
  },
  {
    altStandart: "6.2.3",
    no: 1,
    metin:
      "Fakültenin, ulusal ve uluslararası kurum ve kuruluşlarla öğrenci ve öğretim elemanı değişim program ve anlaşmalarının olması",
    sayfa: 51,
    duzeyler: [
      "Fakültede ulusal ve uluslararası kurum ve kuruluşlarla öğrenci ve öğretim elemanı değişim program ve anlaşmaları yapılmıştır.",
      "Fakültede ulusal ve uluslararası kurum ve kuruluşlarla öğrenci ve öğretim elemanı değişim program ve anlaşmaları büyük ölçüde yapılmıştır.",
      "Fakültede, ulusal ve uluslararası kurum ve kuruluşlarla öğrenci ve öğretim elemanı değişim program ve anlaşmaları kısmen yapılmıştır.",
      "Fakültede, ulusal ve uluslararası kurum ve kuruluşlarla öğrenci ve öğretim elemanı değişim program ve anlaşmaları yapılmamıştır.",
    ],
  },
  {
    altStandart: "6.2.3",
    no: 2,
    metin: "Fakültenin, ulusal ve uluslararası resmi ve/veya özel kurum ve kuruluşlarla ortak çalışmalarının olması",
    sayfa: 51,
    duzeyler: [
      "Fakültenin, ulusal ve uluslararası resmi ve/veya özel kurum ve kuruluşlarla ortak çalışmaları bulunmaktadır.",
      "Fakültenin, ulusal ve uluslararası resmi ve/veya özel kurum ve kuruluşlarla büyük ölçüde ortak çalışmaları bulunmaktadır.",
      "Fakültenin, ulusal ve uluslararası resmi ve/veya özel kurum ve kuruluşlarla kısmen ortak çalışmaları bulunmaktadır.",
      "Fakültenin, ulusal ve uluslararası resmi ve/veya özel kurum ve kuruluşlarla ortak çalışmaları bulunmamaktadır.",
    ],
  },
  {
    altStandart: "6.2.3",
    no: 3,
    metin:
      "Fakülte personeli ve öğrencilerinin ulusal ve uluslararası değişim programlarına etkin katılımını sağlayacak mekanizmaların bulunması",
    sayfa: 51,
    duzeyler: [
      "Fakülte personeli ve öğrencilerin ulusal ve uluslararası değişim programlarına etkin katılımını sağlayacak mekanizmalar bulunmaktadır.",
      "Fakülte personeli ve öğrencilerin ulusal ve uluslararası değişim programlarına katılımını sağlayacak mekanizmalar büyük ölçüde bulunmaktadır.",
      "Fakülte personeli ve öğrencilerin ulusal ve uluslararası değişim programlarına katılımını sağlayacak mekanizmalar kısmen bulunmaktadır.",
      "Fakülte personeli ve öğrencilerinin ulusal ve uluslararası değişim programlarına katılımını sağlayacak mekanizmalar bulunmamaktadır.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 1,
    metin: "Yönetimin, yeterli sayı ve nitelikte personel istihdam etmesi ve sürdürülebilirliğini sağlaması",
    sayfa: 52,
    duzeyler: [
      "Yönetim, yeterli sayı ve nitelikte personel istihdam etmekte ve sürdürülebilirliğini sağlamaktadır.",
      "Yönetim, yeterli sayı ve nitelikte personel büyük ölçüde istihdam etmekte ve sürdürülebilirliğini sağlamaktadır.",
      "Yönetim, yeterli sayı ve nitelikte personel kısmen istihdam etmekte ve sürdürülebilirliğini sağlamaktadır.",
      "Yönetim, yeterli sayı ve nitelikte personel istihdam edememekte ve sürdürülebilirliğini sağlamamaktadır.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 2,
    metin: "Yönetim ve idari/destek personelinin yeterli olması ve birimler arasında dengeli dağılması",
    sayfa: 52,
    duzeyler: [
      "Yönetim ve idari/destek personelinin sayısı yeterlidir ve birimler arasında dengeli şekilde dağılmaktadır.",
      "Yönetim ve idari/destek personelinin sayısı büyük ölçüde yeterlidir ve birimler arasında dengeli şekilde dağılmaktadır.",
      "Yönetim ve idari/destek personelinin sayısı kısmen yeterlidir ve birimler arasında dengeli şekilde dağılmaktadır.",
      "Yönetim ve idari/destek personelinin sayısı yeterli değildir ve birimler arasında dengeli şekilde dağılmamaktadır.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 3,
    metin:
      "Yöneticilerin ve öğretim elemanlarının, öğretmen eğitiminin geliştirilmesi için kaynak yaratmada girişimci olması",
    sayfa: 52,
    duzeyler: [
      "Yöneticiler ve öğretim elemanları, öğretmen eğitiminin geliştirilmesi için kaynak yaratmada girişimcidir.",
      "Yöneticiler ve öğretim elemanları, öğretmen eğitiminin geliştirilmesi için kaynak yaratmada büyük ölçüde girişimcidir.",
      "Yöneticiler ve öğretim elemanları, öğretmen eğitiminin geliştirilmesi için kaynak yaratmada kısmen girişimcidir.",
      "Yöneticiler ve öğretim elemanları, öğretmen eğitiminin geliştirilmesi için kaynak yaratmada girişimci değildir.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 4,
    metin: "Programların gelişmesine dengeli destek verilmesi",
    sayfa: 52,
    duzeyler: [
      "Programların gelişmesine verilen destek dengelidir.",
      "Programların gelişmesine verilen destek oldukça dengelidir.",
      "Programların gelişmesine verilen destek kısmen dengelidir.",
      "Programların gelişmesine verilen destek dengeli değildir.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 5,
    metin: "Yönetimin fakülteyi geliştirmek için çeşitli kaynaklardan gelir sağlaması",
    sayfa: 52,
    duzeyler: [
      "Yönetim fakülteyi geliştirmek için çeşitli kaynaklardan gelir sağlamaktadır.",
      "Yönetim fakülteyi geliştirmek için çeşitli kaynaklardan büyük ölçüde gelir sağlamaktadır.",
      "Yönetim fakülteyi geliştirmek için çeşitli kaynaklardan kısmen gelir sağlamaktadır.",
      "Yönetim fakülteyi geliştirmek için çeşitli kaynaklardan gelir sağlamamaktadır.",
    ],
  },
  {
    altStandart: "6.3.1",
    no: 6,
    metin:
      "Yönetimin, Bilgi İletişim Teknolojilerinin (BİT) edinilmesi ve etkin kullanılması konusunda politikalarının olması",
    sayfa: 52,
    duzeyler: [
      "Yönetimin, Bilgi İletişim Teknolojilerinin (BİT) edinilmesi ve etkin kullanılması konusunda politikaları bulunmaktadır.",
      "Yönetimin, Bilgi İletişim Teknolojilerinin (BİT) edinilmesi ve etkin kullanılması konusunda büyük ölçüde politikaları bulunmaktadır.",
      "Yönetimin, Bilgi İletişim Teknolojilerinin (BİT) edinilmesi ve etkin kullanılması konusunda kısmen politikaları bulunmaktadır.",
      "Yönetimin, Bilgi İletişim Teknolojilerinin (BİT) edinilmesi ve etkin kullanılması konusunda politikaları bulunmamaktadır.",
    ],
  },
  {
    altStandart: "7.1.1",
    no: 1,
    metin: "Etkili ve sürdürülebilir bir kalite güvencesi politikasının bulunması",
    sayfa: 54,
    duzeyler: [
      "Etkili ve sürdürülebilir bir kalite güvencesi politikası bulunmaktadır.",
      "Oldukça etkili ve sürdürülebilir bir kalite güvencesi politikası bulunmaktadır.",
      "Kısmen etkili ve sürdürülebilir bir kalite güvencesi politikası bulunmaktadır.",
      "Etkili ve sürdürülebilir bir kalite güvencesi politikası bulunmamaktadır.",
    ],
  },
  {
    altStandart: "7.1.1",
    no: 2,
    metin: "Öğretim elemanı seçimi, akademik yükseltme ve atamada tanımlanmış süreçlerin yeterli olması",
    sayfa: 54,
    duzeyler: [
      "Öğretim elemanı seçimi, akademik yükseltme ve atamada tanımlanmış süreçler yeterlidir.",
      "Öğretim elemanı seçimi, akademik yükseltme ve atamada tanımlanmış süreçler büyük ölçüde yeterlidir.",
      "Öğretim elemanı seçimi, akademik yükseltme ve atamada tanımlanmış süreçler kısmen yeterlidir.",
      "Öğretim elemanı seçimi, akademik yükseltme ve atamada tanımlanmış süreçler yeterli değildir.",
    ],
  },
  {
    altStandart: "7.1.1",
    no: 3,
    metin: "Öğretim elemanlarının gelişimlerinin izlenmesi",
    sayfa: 54,
    duzeyler: [
      "Öğretim elemanlarının gelişim süreci izlenmektedir.",
      "Öğretim elemanlarının gelişim süreci büyük ölçüde izlenmektedir.",
      "Öğretim elemanlarının gelişim süreci kısmen izlenmektedir.",
      "Öğretim elemanlarının gelişim süreci izlenmemektedir.",
    ],
  },
  {
    altStandart: "7.1.1",
    no: 4,
    metin: "Öğrencilerin program yeterliliklerine ulaşma düzeylerinin izlenmesi",
    sayfa: 54,
    duzeyler: [
      "Öğrencilerin program yeterliliklerine ulaşma düzeyleri izlenmektedir.",
      "Öğrencilerin program yeterliliklerine ulaşma düzeyleri büyük ölçüde izlenmektedir.",
      "Öğrencilerin program yeterliliklerine ulaşma düzeyleri kısmen izlenmektedir.",
      "Öğrencilerin program yeterliliklerine ulaşma düzeyleri izlenmemektedir.",
    ],
  },
  { altStandart: "7.1.1", no: 5, metin: "Öğretme- öğrenme sürecinin değerlendiril mesi", sayfa: 54, duzeyler: null },
  {
    altStandart: "7.1.1",
    no: 6,
    metin: "Fakültenin, ulusal ve uluslararası benzeri kurumlarla karşılaştırılma sı",
    sayfa: 55,
    duzeyler: [
      "Fakültenin, ulusal ve uluslararası benzeri kurumlarla karşılaştırılması yapılmaktadır.",
      "Fakültenin, ulusal ve uluslararası benzeri kurumlarla büyük ölçüde karşılaştırılması yapılmaktadır.",
      "Fakültenin, ulusal ve uluslararası benzeri kurumlarla kısmen karşılaştırılması yapılmaktadır.",
      "Fakültenin, ulusal ve uluslararası benzeri kurumlarla karşılaştırılması yapılmamaktadır.",
    ],
  },
  {
    altStandart: "7.2.1",
    no: 2,
    metin: "Öğretme- öğrenme sürecinin kalite güvencesi bulguları doğrultusunda geliştirilmesi",
    sayfa: 56,
    duzeyler: [
      "Öğretme-öğrenme süreci, kalite güvencesi bulguları doğrultusunda geliştirilmektedir.",
      "Öğretme-öğrenme süreci, kalite güvencesi bulguları doğrultusunda büyük ölçüde geliştirilmektedir.",
      "Öğretme-öğrenme süreci, kalite güvencesi bulguları doğrultusunda kısmen geliştirilmektedir.",
      "Öğretme-öğrenme süreci kalite güvencesi bulguları doğrultusunda geliştirilmemektedir.",
    ],
  },
  {
    altStandart: "7.2.1",
    no: 3,
    metin: "Öğretim elemanı ve öğrencilerin, kalite güvencesi bulgularına göre desteklenmesi",
    sayfa: 56,
    duzeyler: [
      "Öğretim elemanı ve öğrenciler, kalite güvencesi bulgularına göre desteklenmektedir.",
      "Öğretim elemanı ve öğrenciler, büyük ölçüde kalite güvencesi bulgularına dayalı olarak desteklenmektedir.",
      "Öğretim elemanı ve öğrenciler, kısmen kalite güvencesi bulgularına dayalı olarak desteklenmektedir.",
      "Öğretim elemanı ve öğrenciler, kalite güvencesi bulgularına dayalı desteklenmemektedir.",
    ],
  },
  {
    altStandart: "7.2.1",
    no: 4,
    metin: "Ulusal ve uluslararası benzeri kurumlarla karşılaştırma sistemlerinin işletilmesi",
    sayfa: 56,
    duzeyler: [
      "Ulusal ve uluslararası benzeri kurumlarla karşılaştırma sistemleri işletilmektedir.",
      "Ulusal ve uluslararası benzeri kurumlarla karşılaştırma sistemleri büyük ölçüde işletilmektedir.",
      "Ulusal ve uluslararası benzeri kurumlarla karşılaştırma sistemleri kısmen işletilmektedir.",
      "Ulusal ve uluslararası benzeri kurumlarla karşılaştırma sistemleri işletilmemektedir.",
    ],
  },
  {
    altStandart: "7.2.1",
    no: 5,
    metin: "Yönetimin, alınan kararları uygulaması ve iyileştirme çalışmalarını yapması",
    sayfa: 56,
    duzeyler: [
      "Yönetim, alınan kararları ve iyileştirme çalışmalarını uygulamaktadır.",
      "Yönetim, alınan kararları ve iyileştirme çalışmalarını büyük ölçüde uygulamaktadır.",
      "Yönetim, alınan kararları ve iyileştirme çalışmalarını kısmen uygulamaktadır.",
      "Yönetim, alınan kararları ve iyileştirme çalışmalarını uygulamamaktadır.",
    ],
  },
  {
    altStandart: "7.3.1",
    no: 1,
    metin: "Mezun izleme çalışmalarının düzenli olarak yapılması",
    sayfa: 57,
    duzeyler: [
      "Mezun izleme çalışmaları düzenli yapılmaktadır.",
      "Mezun izleme çalışmaları büyük ölçüde düzenli yapılmaktadır.",
      "Mezun izleme çalışmaları kısmen düzenli yapılmaktadır.",
      "Mezun izleme çalışmaları düzenli yapılmamaktadır.",
    ],
  },
  {
    altStandart: "7.3.1",
    no: 2,
    metin: "Mezun izleme çalışmalarından elde edilen bulguların uygulamalara yansıtılması",
    sayfa: 57,
    duzeyler: [
      "Mezun izleme çalışmalarından elde edilen bulgular uygulamalara yansıtılmaktadır.",
      "Mezun izleme çalışmalarından elde edilen bulgular büyük ölçüde uygulamalara yansıtılmaktadır.",
      "Mezun izleme çalışmalarından elde edilen bulgular kısmen uygulamalara yansıtılmaktadır.",
      "Mezun izleme çalışmalarından elde edilen bulgular uygulamalara yansıtılmamaktadır.",
    ],
  },
];
