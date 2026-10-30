// BU DOSYA BELGELERDEN ÇIKARILDI, ELLE YAZILMADI. Metinler kaynaklar/resmi/ altındaki resmî belgelerin
// @akredit/belge metinCikar çıktısından (boşluklar tekleştirilmiş) sınır işaretleriyle kesilmiştir.
// Her satır test/program-tablolari-resmi.test.ts ile belgenin kaynak sayfasında birebir aranır.
// Sayfa: PDF dosyasının fiziksel sayfa numarası (1'den başlar), basılı sayfa numarası değil.

export interface ProgramOlcutHam {
  kod: string;
  baslik: string;
  metin: string;
  sayfa: number;
}

export interface KanitHam {
  metin: string;
  sayfa: number;
}

export interface AltStandartHam extends ProgramOlcutHam {
  kanitlar: readonly KanitHam[];
}

/** Sayfa başındaki üst bilgi (yinelenen başlık); metin kesilirken ve doğrulanırken sayfa başından silinir. */
export const UST_BILGI: Readonly<Record<string, RegExp>> = {
  "mudek/mudek-degerlendirme-olcutleri-3.1.pdf":
    /^MÜDEK – Mühendislik Lisans Programları Değerlendirme Ölçütleri \(Sürüm 3\.1 – 05\.12\.2025\) Sayfa \S+/u,
  "mudek/mudek-yl-degerlendirme-olcutleri-2.0.pdf":
    /^MÜDEK – Mühendislik Yüksek Lisans Programları Değerlendirme Ölçütleri \(Sürüm 2\.0 – 05\.12\.2025\) Sayfa \S+/u,
  "fedek/fedek-degerlendirme-olcutleri-4.1.pdf":
    /^FEDEK - Lisans Programları Değerlendirme Ölçütleri Sürüm 4\.1 - 14\.09\.2024 \d+/u,
  "epdad/epdad-rpd-lisans-egitimi-standartlari.pdf":
    /^(REHBERLİK VE PSİKOLOJİK DANIŞMA \(RPD\) LİSANS EĞİTİMİ STANDARTLARI )?Alan Başlangıç Standartları Süreç Standartları Ürün Standartları/u,
  "epdad/epdad-standartlar-1.1-kilavuz.pdf": /^\d+ /u,
};

/** MÜDEK Mühendislik Lisans Programları Değerlendirme Ölçütleri Sürüm 3.1 (mudek/mudek-degerlendirme-olcutleri-3.1.pdf). */
export const MUDEK_LISANS_3_1_HAM: readonly ProgramOlcutHam[] = [
  { kod: "1", baslik: "Öğrenciler", metin: "Öğrenciler", sayfa: 6 },
  {
    kod: "1.1",
    baslik: "1.1",
    metin:
      "Programa kabul edilen öğrenciler, programın kazandırmayı hedeflediği çıktıları (beceri, bilgi ve farkındalıkları) öngörülen sürede edinebilecek altyapıya sahip olmalıdır. Öğrencilerin programa kabulünde göz önüne alınan göstergeler izlenmeli ve bunların yıllara göre değişimi değerlendirilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.2",
    baslik: "1.2",
    metin:
      "Yatay ve dikey geçişle öğrenci kabulü, çift ana dal, yan dal ve öğrenci değişimi uygulamaları ile başka kurumlarda ve/veya programlarda alınmış dersler ve kazanılmış kredilerin değerlendirilmesinde uygulanan politikalar ayrıntılı olarak tanımlanmış ve uygulanıyor olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "1.3",
    baslik: "1.3",
    metin:
      "Kurum ve/veya program tarafından başka kurumlarla yapılacak anlaşmalar ve kurulacak ortaklıklar ile öğrenci hareketliliğini teşvik edecek ve sağlayacak önlemler alınmalıdır.",
    sayfa: 6,
  },
  {
    kod: "1.4",
    baslik: "1.4",
    metin:
      "Öğrencilerin derslerdeki başarı durumunu izleyecek ve onları ders ve kariyer planlaması konularında yönlendirecek akademik danışmanlık hizmeti öğretim üyeleri/doktoralı öğretim görevlileri tarafından verilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.5",
    baslik: "1.5",
    metin:
      "Öğrencilerin program kapsamındaki tüm dersler ve diğer etkinliklerdeki başarıları şeffaf, adil ve tutarlı yöntemlerle ölçülmeli ve değerlendirilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.6",
    baslik: "1.6",
    metin:
      "Öğrencilerin mezuniyetlerine karar verebilmek için, programın gerektirdiği tüm koşulların yerine getirildiğini belirleyecek güvenilir yöntemler geliştirilmiş ve uygulanıyor olmalıdır.",
    sayfa: 6,
  },
  { kod: "2", baslik: "Program Eğitim Amaçları", metin: "Program Eğitim Amaçları", sayfa: 6 },
  {
    kod: "2.1",
    baslik: "2.1",
    metin: "Değerlendirilecek her mühendislik lisans programı için program eğitim amaçları tanımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "2.2",
    baslik: "2.2",
    metin:
      "Bu amaçlar; a) MÜDEK program eğitim amaçları tanımına uymalıdır (program eğitim amaçları program çıktılarını çağrıştırmamalı ve program çıktıları ile benzer biçimde tanımlanmamalıdır.), b) kurumun, fakültenin ve bölümün özgörevleriyle uyumlu olmalıdır, c) programın çeşitli iç ve dış paydaşlarını sürece dahil ederek belirlenmeli, belirli aralıklarla gözden geçirilmeli ve gerekirse güncellenmelidir, d) kolayca erişilebilecek biçimde yayımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "2.3",
    baslik: "2.3",
    metin:
      "Eğitim amaçlarına ne ölçüde ulaşıldığını izlemek için kullanılan bir ölçme ve değerlendirme süreci kurulmuş ve işletiliyor olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3",
    baslik: "MÜDEK Program Çıktıları",
    metin:
      "MÜDEK Program Çıktıları 4 ana grup altında tanımlanmış, 11 çıktıdan oluşmaktadır. Program 11 MÜDEK Çıktısını kapsamak ve tüm mezunlarına 11 MÜDEK Çıktısının her birini kazandırdığını kanıtlamak zorundadır. 4 ana grup altındaki 11 MÜDEK Çıktısı aşağıda listelenmiştir. Mühendisler için Temel Nitelikler: İlk üç MÜDEK Çıktısı mühendislerde aranan temel niteliklerdir. Mühendislik Problemlerini İnceleme Araç ve Yöntemleri: Dördüncü ve beşinci sıradaki MÜDEK Çıktıları, bir mühendisin problemleri analiz ederken ve bunlara çözümler geliştirirken gereksinim duyacağı ek bilgi ve becerileri tanımlamaktadır. Mühendislik Uygulamalarının Etkileri: Altıncı ve yedinci sıradaki MÜDEK Çıktıları, bir mühendisin çözüm geliştirirken özellikle dikkat etmesi gereken iki konuyla, bu çözümlerin dünyaya etkisi ve çözümlerin etik boyutu ile ilgilidir. Bireysel ve Yönetimsel Nitelikler: Sekiz, dokuz, on ve on birinci sıradaki MÜDEK Çıktıları, bir mühendisin görevini başarılı bir biçimde yerine getirebilmesi için teknik bilgi ve becerilerin yanı sıra sahip olması gereken bireysel nitelikleri tamamlamaktadır. Çıktılar: 1. Mühendislik Bilgisi 2. Problem Analizi 3. Mühendislik Tasarımı 4. Teknik ve Araçların Kullanımı 5. Araştırma ve İnceleme 6. Mühendislik Uygulamalarının Küresel Etkisi 7. Mühendislik Etiği 8. Bireysel ve Takım Çalışması 9. Sözlü ve Yazılı İletişim 10. Proje Yönetimi 11. Yaşam Boyu Öğrenme",
    sayfa: 7,
  },
  {
    kod: "3.1",
    baslik: "3.1",
    metin:
      "Program çıktıları, program eğitim amaçlarına ulaşabilmek için gerekli beceri, bilgi ve farkındalık bileşenlerinin tümünü kapsamalı ve Tablo 3.1’de sıralanan MÜDEK Çıktılarının tümünü kapsayacak biçimde tanımlanmalıdır. Programlar, program eğitim amaçlarıyla tutarlı olmak koşuluyla, kendilerine özgü ek program çıktıları tanımlayabilir. (Her ne kadar programlar kendi program çıktılarını tanımlayabilirlerse de, bu program çıktıları MÜDEK Çıktılarının tümünü kapsamalıdır.)",
    sayfa: 7,
  },
  {
    kod: "3.C1",
    baslik: "Mühendislik Bilgisi",
    metin:
      "Matematik, fen bilimleri, temel mühendislik, bilgisayarla hesaplama ve ilgili mühendislik disiplinine özgü konularda bilgi; bu bilgileri, karmaşık mühendislik problemlerinin çözümünde kullanabilme becerisi.",
    sayfa: 7,
  },
  {
    kod: "3.C2",
    baslik: "Problem Analizi",
    metin:
      "Karmaşık mühendislik problemlerini, temel bilim, matematik ve mühendislik bilgilerini kullanarak ve ele alınan problemle ilgili BM Sürdürülebilir Kalkınma Amaçlarını* gözeterek tanımlama, formüle etme ve analiz becerisi. *: Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C3",
    baslik: "Mühendislik Tasarımı",
    metin:
      "Karmaşık mühendislik problemlerine yaratıcı çözümler tasarlama becerisi; karmaşık sistemleri, süreçleri, cihazları veya ürünleri gerçekçi kısıtları ve koşulları* gözeterek, mevcut ve gelecekteki gereksinimleri karşılayacak biçimde tasarlama becerisi. *: Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C4",
    baslik: "Teknik ve Araçların Kullanımı",
    metin:
      "Karmaşık mühendislik problemlerinin analizi ve çözümüne yönelik, tahmin ve modelleme de dahil olmak üzere, uygun teknikleri, kaynakları ve modern mühendislik ve bilişim araçlarını, sınırlamalarının da farkında olarak seçme ve kullanma becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C5",
    baslik: "Araştırma ve İnceleme",
    metin:
      "Karmaşık mühendislik problemlerinin incelenmesi için literatür araştırması, deney tasarlama, deney yapma, veri toplama, sonuçları analiz etme ve yorumlama dahil, araştırma yöntemlerini kullanma becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C6",
    baslik: "Mühendislik Uygulamalarının Küresel Etkisi",
    metin:
      "Mühendislik uygulamalarının BM Sürdürülebilir Kalkınma Amaçları* kapsamında, topluma, sağlık ve güvenliğe, ekonomiye, sürdürülebilirlik ve çevreye etkileri hakkında bilgi; mühendislik çözümlerinin hukuksal sonuçları konusunda farkındalık. *: Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C7",
    baslik: "Mühendislik Etiği",
    metin:
      "Mühendislik meslek ilkelerine* uygun davranma, etik sorumluluk hakkında bilgi; hiçbir konuda ayrımcılık yapmadan, tarafsız davranma ve çeşitliliği kapsayıcı olma konularında farkındalık. *: Tanımlara bakınız",
    sayfa: 8,
  },
  {
    kod: "3.C8",
    baslik: "Bireysel ve Takım Çalışması",
    metin:
      "Bireysel olarak ve disiplin içi ve çok disiplinli takımlarda (yüz yüze, uzaktan veya karma) takım üyesi veya lideri olarak etkin biçimde çalışabilme becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C9",
    baslik: "Sözlü ve Yazılı İletişim",
    metin:
      "Hedef kitlenin çeşitli farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konularda sözlü, yazılı etkin iletişim kurma becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C10",
    baslik: "Proje Yönetimi",
    metin:
      "Proje yönetimi ve ekonomik yapılabilirlik analizi gibi iş hayatındaki uygulamalar hakkında bilgi; girişimcilik ve yenilikçilik hakkında farkındalık.",
    sayfa: 8,
  },
  {
    kod: "3.C11",
    baslik: "Yaşam Boyu Öğrenme",
    metin:
      "Bağımsız ve sürekli öğrenebilme, yeni ve gelişmekte olan teknolojilere uyum sağlayabilme ve teknolojik değişimlerle ilgili sorgulayıcı düşünebilmeyi kapsayan yaşam boyu öğrenme becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.2",
    baslik: "3.2",
    metin:
      "Program çıktılarının sağlanma düzeyini dönemsel olarak belirlemek ve belgelemek için her bir program çıktısının ve varsa çıktı bileşenlerinin niteliğine bağlı olarak kurgulanmış ölçme ve değerlendirme süreçleri oluşturulmuş ve işletiliyor olmalıdır. (Bu süreçler yukarıdaki tanımlar bölümünde beceri, bilgi ve farkındalık için verilen tanımlara uygun olmalıdır.)",
    sayfa: 8,
  },
  {
    kod: "3.3",
    baslik: "3.3",
    metin:
      "Mühendislik programları mezuniyet aşamasına gelmiş öğrencilerinin program çıktılarını bileşen bazında sağladığını kanıtlamalıdır.",
    sayfa: 8,
  },
  { kod: "4", baslik: "Sürekli İyileştirme", metin: "Sürekli İyileştirme", sayfa: 9 },
  {
    kod: "4.1",
    baslik: "4.1",
    metin:
      "Programın sürekli iyileştirilmesine yönelik olarak kullanılan bir sürecin varlığına ilişkin kanıtlar sunulmalıdır.",
    sayfa: 9,
  },
  {
    kod: "4.2",
    baslik: "4.2",
    metin:
      "Sürekli iyileştirme çalışmaları, başta Ölçüt 2 ve Ölçüt 3 ile ilgili alanlar olmak üzere, programın gelişmeye açık tüm alanları ile ilgili, sistematik bir biçimde toplanmış, somut verilere dayalı olmalıdır.",
    sayfa: 9,
  },
  { kod: "5", baslik: "Eğitim Planı", metin: "Eğitim Planı", sayfa: 9 },
  {
    kod: "5.1",
    baslik: "5.1",
    metin:
      "Her programın, program eğitim amaçlarını ve program çıktılarını destekleyen bir eğitim planı (müfredatı) olmalıdır. Eğitim planı bu ölçütte verilen ortak bileşenler ve EK-1’de verilen disipline özgü konuları içermelidir. Bir programın, adı nedeniyle, birden fazla disiplin kümesine ilişkin olması durumunda, söz konusu programın eğitim planının EK-1’de belirtilen ilgili her kümedeki konuları içermesi gerekir. (Not: EK-1’de belirtilen disipline özgü eğitim planı konuları “Program Çıktısı” değildir.)",
    sayfa: 9,
  },
  {
    kod: "5.2",
    baslik: "5.2.",
    metin:
      "Eğitim planının uygulanmasında kullanılacak eğitim yöntemleri, istenen beceri, bilgi ve farkındalık ögelerinin öğrencilere kazandırılmasını garanti edebilmelidir.",
    sayfa: 9,
  },
  {
    kod: "5.3",
    baslik: "5.3",
    metin:
      "Eğitim planının öngörüldüğü biçimde uygulanmasını güvence altına alacak ve sürekli gelişimini sağlayacak bir eğitim yönetim sistemi bulunmalı ve uygulanmalıdır.",
    sayfa: 9,
  },
  {
    kod: "5.4",
    baslik: "5.4",
    metin:
      "Eğitim planı aşağıdaki bileşenleri içermelidir: a) En az 32 yerel kredi veya en az 60 AKTS kredisi tutarında matematik ve temel bilim eğitimi. Temel bilim eğitimi ilgili disipline uygun olmalı ve deneysel çalışmalarla desteklenmelidir. b) En az 48 yerel kredi veya en az 90 AKTS kredisi tutarında temel mühendislik bilimleri ve ilgili disipline uygun mühendislik meslek eğitimi. c) Eğitim programının mesleki içeriğini bütünleyen genel eğitim. d) Türkçe eğitim yapan programlar giriş düzeyinde en az 9 yerel kredi veya 12 AKTS kredisi tutarında yabancı dil dersi içermelidir.",
    sayfa: 9,
  },
  {
    kod: "5.5",
    baslik: "5.5",
    metin:
      "Öğrenciler, önceki derslerde edindikleri bilgi ve becerileri kullanacakları, mühendislik standartlarını ve gerçekçi kısıtları ve koşulları içerecek bir ana tasarım deneyimiyle, mühendislik uygulamasına hazır hale getirilmelidir.",
    sayfa: 9,
  },
  { kod: "6", baslik: "Öğretim Kadrosu", metin: "Öğretim Kadrosu", sayfa: 9 },
  {
    kod: "6.1",
    baslik: "6.1",
    metin:
      "Öğretim kadrosu sayıca yeterli olmalıdır. Bu sayı: a) her biri yeterli düzeyde olmak üzere, öğretim üyesi-öğrenci ilişkisini, öğrenci danışmanlığını, üniversiteye hizmeti, mesleki gelişimi, sanayi, mesleki kuruluşlar ve işverenlerle ilişkiyi sürdürebilmeyi sağlamalı ve b) programın tüm alanlarını kapsamalıdır.",
    sayfa: 9,
  },
  {
    kod: "6.2",
    baslik: "6.2",
    metin:
      "Öğretim kadrosu yeterli niteliklere sahip olmalı ve programın etkin bir biçimde sürdürülmesini, değerlendirilmesini ve geliştirilmesini sağlamalıdır.",
    sayfa: 9,
  },
  {
    kod: "6.3",
    baslik: "6.3",
    metin:
      "Öğretim üyesi atama ve yükseltme kriterleri yukarıda sıralananları sağlamaya ve geliştirmeye yönelik olarak belirlenmiş ve uygulanıyor olmalıdır.",
    sayfa: 9,
  },
  { kod: "7", baslik: "Altyapı", metin: "Altyapı", sayfa: 9 },
  {
    kod: "7.1",
    baslik: "7.1",
    metin:
      "Sınıflar, laboratuvarlar ve diğer teçhizat, eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli ve öğrenmeye yönelik bir atmosfer hazırlamaya yardımcı olmalıdır.",
    sayfa: 9,
  },
  {
    kod: "7.2",
    baslik: "7.2",
    metin:
      "Öğrencilerin ders dışı etkinlikler yapmalarına olanak veren, sosyal ve kültürel gereksinimlerini karşılayan, mesleki etkinliklere ortam yaratarak, mesleki gelişimlerini destekleyen ve öğrenci- öğretim üyesi ilişkilerini canlandıran uygun altyapı mevcut olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.3",
    baslik: "7.3",
    metin:
      "Programlar öğrencilerine modern mühendislik araçlarını kullanmayı öğrenebilecekleri olanakları sağlamalıdır. Bilgisayar ve bilişim altyapıları, programın eğitim amaçlarını destekleyecek doğrultuda, öğrenci ve öğretim üyelerinin bilimsel ve eğitsel çalışmaları için yeterli düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.4",
    baslik: "7.4",
    metin:
      "Öğrencilere sunulan kütüphane olanakları eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.5",
    baslik: "7.5",
    metin:
      "Öğrencilere laboratuvar, atölye gibi fiziksel altyapının doğru ve güvenli kullanımı için gerekli eğitim verilmeli, iş sağlığı ve güvenliği önlemleri için gerekli düzenlemeler bulunmalıdır. Engelliler için altyapı düzenlemesi yapılmış olmalıdır.",
    sayfa: 10,
  },
  { kod: "8", baslik: "Kurum Desteği ve Parasal Kaynaklar", metin: "Kurum Desteği ve Parasal Kaynaklar", sayfa: 10 },
  {
    kod: "8.1",
    baslik: "8.1",
    metin:
      "Üniversitenin idari desteği, yapıcı liderliği, parasal kaynaklar ve dağıtımında izlenen strateji, programın kalitesini ve bunun sürdürülebilmesini sağlayacak düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.2",
    baslik: "8.2",
    metin:
      "Kaynaklar, nitelikli bir öğretim kadrosunu çekecek, tutacak ve mesleki gelişimini sürdürmesini sağlayacak yeterlilikte olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.3",
    baslik: "8.3",
    metin:
      "Program için gereken altyapıyı temin etmeye, bakımını yapmaya ve işletmeye yetecek parasal kaynak sağlanmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.4",
    baslik: "8.4",
    metin:
      "Program gereksinimlerini karşılayacak destek personeli ve kurumsal hizmetler sağlanmalıdır. Teknik ve idari kadrolar, program çıktılarını sağlamaya destek verecek sayı ve nitelikte olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "9",
    baslik: "Organizasyon ve Karar Alma Süreçleri",
    metin:
      "Yükseköğretim kurumunun organizasyonu ile rektörlük, fakülte, bölüm ve varsa diğer alt birimlerin kendi içlerindeki ve aralarındaki tüm karar alma süreçleri, program çıktılarının gerçekleştirilmesini ve eğitim amaçlarına ulaşılmasını destekleyecek biçimde düzenlenmelidir",
    sayfa: 10,
  },
];

/** MÜDEK Mühendislik Yüksek Lisans Programları Değerlendirme Ölçütleri Sürüm 2.0 (mudek/mudek-yl-degerlendirme-olcutleri-2.0.pdf). */
export const MUDEK_YL_2_0_HAM: readonly ProgramOlcutHam[] = [
  { kod: "1", baslik: "Öğrenciler", metin: "Öğrenciler", sayfa: 6 },
  {
    kod: "1.1",
    baslik: "1.1",
    metin:
      "Programa kabul edilen öğrenciler, programın kazandırmayı hedeflediği çıktıları (beceri, bilgi ve farkındalıkları) öngörülen sürede edinebilecek altyapıya sahip olmalıdır. Öğrencilerin programa kabulünde göz önüne alınan göstergeler izlenmeli ve bunların yıllara göre değişimi değerlendirilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.2",
    baslik: "1.2",
    metin:
      "Bilimsel Hazırlık Programındaki her bir öğrenciye uygulanacak program, öğrencilerin önceki lisans ve varsa lisansüstü eğitimleri göz önüne alınarak ayrıntılı olarak belirlenmeli ve uygulanmalıdır. Bilimsel Hazırlık Programının genel ilkeleri yayımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "1.3",
    baslik: "1.3",
    metin:
      "Yatay geçişle öğrenci kabulünde, tezsiz ve tezli programlar arası geçişte, özel öğrenci olarak ders alınmasında, öğrenci değişimi uygulamalarında ve başka kurumlarla yürütülen ortak diploma programlarında, bu kurumlarda ve programlarda alınmış dersler ve kazanılmış kredilerin değerlendirilmesinde uygulanan kurallar ve politikalar ayrıntılı olarak tanımlanmalı ve uygulanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "1.4",
    baslik: "1.4",
    metin:
      "Öğrencilerin derslerdeki başarı durumunu izleyecek, onları ders ve kariyer planlaması konularında yönlendirecek, tez veya dönem projesi çalışmalarını yönetecek akademik danışmanlık hizmeti verilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.5",
    baslik: "1.5",
    metin:
      "Öğrencilerin program kapsamındaki tüm dersler ve diğer etkinliklerdeki başarıları; şeffaf, adil ve tutarlı yöntemlerle ölçülmeli ve değerlendirilmelidir.",
    sayfa: 6,
  },
  {
    kod: "1.6",
    baslik: "1.6",
    metin:
      "Öğrencilerin mezuniyetlerine karar verebilmek için, programın gerektirdiği tüm koşulların yerine getirildiğini belirleyecek güvenilir yöntemler geliştirilmiş ve uygulanıyor olmalıdır.",
    sayfa: 6,
  },
  { kod: "2", baslik: "Program Eğitim Amaçları", metin: "Program Eğitim Amaçları", sayfa: 6 },
  {
    kod: "2.1",
    baslik: "2.1",
    metin: "Değerlendirilecek her yüksek lisans programı için program eğitim amaçları tanımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "2.2",
    baslik: "2.2",
    metin:
      "Bu amaçlar; a) MÜDEK program eğitim amaçları tanımına uymalıdır (program eğitim amaçları program çıktılarını çağrıştırmamalı ve program çıktıları ile benzer biçimde tanımlanmamalıdır), b) Kurumun ve enstitünün özgörevleriyle uyumlu olmalıdır, c) Programın çeşitli iç ve dış paydaşlarını sürece dahil ederek belirlenmeli, belirli aralıklarla gözden geçirilmeli ve gerekirse güncellenmelidir ve d) Kolayca erişilebilecek biçimde yayımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "2.3",
    baslik: "2.3",
    metin:
      "Eğitim amaçlarına ne ölçüde ulaşıldığını izlemek için kullanılan bir ölçme ve değerlendirme süreci kurulmuş ve işletiliyor olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3",
    baslik: "Program Çıktıları",
    metin:
      "MÜDEK Yüksek Lisans Program Çıktıları 4 ana grup altında tanımlanmış, 11 çıktıdan oluşmaktadır. Program, 11 MÜDEK Çıktısını kapsamak ve tüm mezunlarına 11 MÜDEK Çıktısının her birini kazandırdığını kanıtlamak zorundadır. 4 ana grup altındaki 11 MÜDEK Çıktısı aşağıda listelenmiştir. Mühendislikte Yüksek Lisans için Temel Nitelikler: İlk üç MÜDEK Çıktısı mühendislikte yüksek lisans için aranan temel niteliklerdir. Mühendislik Problemlerini İnceleme Araç ve Yöntemleri: Dördüncü ve beşinci sıradaki MÜDEK Çıktıları, yüksek lisans mezununun problemleri analiz ederken ve bunlara çözümler geliştirirken gereksinim duyacağı ek bilgi ve becerileri tanımlamaktadır. Mühendislik Uygulamalarının Etkileri: Altıncı ve yedinci sıradaki MÜDEK Çıktıları, yüksek lisans mezununun çözüm geliştirirken özellikle dikkat etmesi gereken iki konuyla, bu çözümlerin dünyaya etkisi ve çözümlerin etik boyutu ile ilgilidir. Bireysel ve Yönetimsel Nitelikler: Sekiz, dokuz, on ve on birinci sıradaki MÜDEK Çıktıları, yüksek lisans mezununun görevini başarılı bir biçimde yerine getirebilmesi için teknik bilgi ve becerilerin yanı sıra sahip olması gereken bireysel nitelikleri tamamlamaktadır. Çıktılar: 1. Mühendislik Bilgisi 2. Problem ve Sistem Analizi 3. Mühendislik Tasarımı 4. Teknik ve Araçların Kullanımı 5. Araştırma ve İnceleme 6. Mühendislik Uygulamalarının Küresel Etkisi 7. Mühendislik Etiği 8. Takım Çalışması 9. Sözlü ve Yazılı İletişim 10. Proje Yönetimi 11. Yaşam Boyu Öğrenme",
    sayfa: 7,
  },
  {
    kod: "3.1",
    baslik: "3.1",
    metin:
      "Program çıktıları, program eğitim amaçlarına ulaşabilmek için gerekli beceri, bilgi ve farkındalık bileşenlerinin tümünü kapsamalı ve Tablo 3.1’de sıralanan MÜDEK Yüksek Lisans Program Çıktılarının tümünü kapsayacak biçimde tanımlanmalıdır. Programlar, program eğitim amaçlarıyla tutarlı olmak koşuluyla, kendilerine özgü ek program çıktıları tanımlayabilir. (Her ne kadar programlar kendi program çıktılarını tanımlayabilirlerse de program çıktıları MÜDEK Yüksek Lisans Program Çıktılarının tümünü eksiksiz olarak kapsamalıdır.)",
    sayfa: 7,
  },
  {
    kod: "3.C1",
    baslik: "Mühendislik Bilgisi",
    metin:
      "Uzmanlık alanına ilişkin matematik, fen bilimleri, bilgisayarla hesaplama ve mühendislik konularında, karmaşık mühendislik problemlerinin çözümünde kullanabilecek düzeyde derinlemesine bilgi*; uzmanlık alanındaki güncel ve önde gelen gelişmeler konularında farkındalık; mühendislik ile diğer bilim ve meslek alanlarının kesişiminde doğabilecek bilgiye dayalı konularda farkındalık. * Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C2",
    baslik: "Problem ve Sistem Analizi",
    metin:
      "Uzmanlık alanının yeni, güncel veya gelişen alanlarında tam tanımlanmamış veya çelişen gereksinimlerin göz önüne alınmasını gerektiren karmaşık mühendislik problemlerini ilgili BM Sürdürülebilir Kalkınma Amaçlarını* gözeterek belirleme, tanımlama ve analiz etme becerisi; geniş veya çok-disiplinli çerçevede yeni ve karmaşık mühendislik ürün, süreç veya sistemleri için kavramsal model oluşturma ve analiz etme becerisi. * Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C3",
    baslik: "Mühendislik Tasarımı",
    metin:
      "Farklı alanlardan bilginin bütünleştirilmesini gerektiren, özellikleri tam olarak tanımlanmamış veya çelişen gereksinimleri olan karmaşık mühendislik problemlerine, yeni ve karmaşık ürün, süreç veya sistemlere, ilgili mühendislik uzmanlık alanındaki güncel bilgileri kullanarak ve gerçekçi kısıtları ve koşulları* gözeterek çözüm tasarlama ve sonuçlarını eleştirel biçimde yorumlama becerisi. * Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C4",
    baslik: "Teknik ve Araçların Kullanımı",
    metin:
      "Bilimsel araştırma teknikleri ve kısıtları hakkında derinlemesine bilgi; karmaşık mühendislik problemlerinin incelenmesi, analizi ve çözümü için tahmin ve modelleme dahil uygun yöntem ve teknikleri, gereçleri ve bilişim teknolojilerini -sınırlamalarının da farkında olarak- seçme ve kullanma becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C5",
    baslik: "Araştırma ve İnceleme",
    metin:
      "Veri toplama, literatür tarama, veri tabanı gibi bilgi kaynaklarını etkin kullanma becerisi; karmaşık mühendislik problemlerinin derinlemesine incelenmesine yönelik benzetim yapma, uygulama ve güvenlik kurallarını da dikkate alarak deneysel çalışma yürütme, elde edilen verileri eleştirel biçimde yorumlama ve sonuç üretme becerisi; yenilikçi akımların ve gelişmekte olan teknolojilerin araştırma alanına uygulamasını inceleme ve sorgulama becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C6",
    baslik: "Mühendislik Uygulamalarının Küresel Etkisi",
    metin:
      "BM Sürdürülebilir Kalkınma Amaçlarını* gözeterek mühendislik uygulamalarının teknik olmayan – toplumsal, sağlık ve güvenlik, çevresel, ekonomik ve endüstriyel – etkilerine ilişkin bilgi. * Tanımlara bakınız.",
    sayfa: 8,
  },
  {
    kod: "3.C7",
    baslik: "Mühendislik Etiği",
    metin:
      "Mühendislik meslek ilkelerine* uygun olarak ürettiği çözümlerde, yaptığı araştırmalarda ve bu araştırma sonuçlarını yorumlama ve yaymada sosyal ve etik sorumlulukları gözetme becerisi. * Tanımlara bakınız",
    sayfa: 8,
  },
  {
    kod: "3.C8",
    baslik: "Takım Çalışması",
    metin:
      "Farklı disiplin ve eğitim seviyelerinde, ulusal ve uluslararası çerçevede oluşabilecek takımlarda takım üyesi veya lider olarak (yüz yüze, uzaktan veya karma) etkin çalışabilme becerisi.",
    sayfa: 8,
  },
  {
    kod: "3.C9",
    baslik: "Sözlü ve Yazılı İletişim",
    metin:
      "Hedef kitlenin farklılıklarını (eğitim, dil, meslek gibi) dikkate alarak, teknik konulardaki yorum ve bilgileri, sözlü ve yazılı etkin iletişim kurarak açık ve anlaşılır bir biçimde aktarma becerisi.",
    sayfa: 9,
  },
  {
    kod: "3.C10",
    baslik: "Proje Yönetimi",
    metin:
      "Yeni stratejik yaklaşımlar gerektirebilecek karmaşık projeleri veya teknik çalışmaları planlama ve yönetebilme becerisi.",
    sayfa: 9,
  },
  {
    kod: "3.C11",
    baslik: "Yaşam Boyu Öğrenme",
    metin:
      "Bağımsız ve sürekli öğrenebilme, kendi alanındaki bilimsel ve teknolojik gelişmeleri yakından izleyebilme becerisi.",
    sayfa: 9,
  },
  {
    kod: "3.2",
    baslik: "3.2",
    metin:
      "MÜDEK Yüksek Lisans Program Çıktılarının sağlanma düzeyini dönemsel olarak belirlemek ve belgelemek için her bir program çıktısının ve varsa çıktı bileşenlerinin niteliğine bağlı olarak kurgulanmış ölçme ve değerlendirme süreçleri oluşturulmuş ve işletiliyor olmalıdır. (Bu süreçler yukarıdaki tanımlar bölümünde beceri, bilgi ve farkındalık için verilen tanımlara uygun olmalıdır.)",
    sayfa: 9,
  },
  {
    kod: "3.3",
    baslik: "3.3",
    metin:
      "Program, mezuniyet aşamasına gelmiş olan öğrencilerinin program çıktılarını bileşen bazında sağladığını kanıtlamalıdır.",
    sayfa: 9,
  },
  { kod: "4", baslik: "Sürekli İyileştirme", metin: "Sürekli İyileştirme", sayfa: 9 },
  {
    kod: "4.1",
    baslik: "4.1",
    metin:
      "Programın sürekli iyileştirilmesine yönelik olarak kullanılan bir sürecin varlığına ilişkin kanıtlar sunulmalıdır.",
    sayfa: 9,
  },
  {
    kod: "4.2",
    baslik: "4.2",
    metin:
      "Sürekli iyileştirme çalışmaları, başta Ölçüt 2 ve Ölçüt 3 ile ilgili alanlar olmak üzere, programın gelişmeye açık tüm alanları ile ilgili, sistematik bir biçimde toplanmış, somut verilere dayalı olmalıdır.",
    sayfa: 9,
  },
  { kod: "5", baslik: "Eğitim Planı", metin: "Eğitim Planı", sayfa: 9 },
  {
    kod: "5.1",
    baslik: "5.1",
    metin:
      "Her programın, program eğitim amaçlarını ve program çıktılarını destekleyen bir eğitim planı (müfredatı) olmalıdır. Programı tamamlama koşulları (kredili dersler, seminer, tez veya projeden başarılı sayılma kuralları gibi) tanımlanmış olmalıdır. Eğitim planı lisansüstü düzeydeki konuları ve etkinlikleri kapsamalıdır. Öğrenciye özel bilimsel hazırlık programı oluşturulması durumunda, bu hazırlık programı eğitim planının gereklerini yerine getirecek biçimde lisans ve/veya lisansüstü düzeydeki konuları içermelidir.",
    sayfa: 9,
  },
  {
    kod: "5.2",
    baslik: "5.2",
    metin:
      "Eğitim planının uygulanmasında kullanılacak eğitim yöntemleri, istenen beceri, bilgi ve farkındalık ögelerinin öğrencilere kazandırılmasını garanti edebilmelidir.",
    sayfa: 9,
  },
  {
    kod: "5.3",
    baslik: "5.3",
    metin:
      "Eğitim planının öngörüldüğü biçimde uygulanmasını güvence altına alacak ve sürekli gelişimini sağlayacak bir eğitim yönetim sistemi bulunmalıdır ve uygulanıyor olmalıdır.",
    sayfa: 9,
  },
  {
    kod: "5.4",
    baslik: "5.4",
    metin:
      "Eğitim planı, tezli programlarda en az 60 AKTS ağırlığında tez çalışmasını ve tezsiz programlarda en az 15 AKTS ağırlığında proje çalışmasını içermelidir.",
    sayfa: 9,
  },
  { kod: "6", baslik: "Öğretim Kadrosu", metin: "Öğretim Kadrosu", sayfa: 9 },
  {
    kod: "6.1",
    baslik: "6.1",
    metin:
      "Programı yürüten öğretim kadrosu sayıca yeterli olmalıdır. Bu sayı: a) Her biri yeterli düzeyde olmak üzere, öğretim üyesi-öğrenci ilişkisini, öğrenci danışmanlığını, tez yöneticiliğini/dönem projesini, üniversiteye hizmeti, mesleki gelişimi, araştırma etkinliklerini, programla ilişkili sanayi ve kamu kuruluşları ile ilişkileri sürdürebilmeyi sağlamalı ve b) Programın tüm alanlarını kapsamalıdır.",
    sayfa: 9,
  },
  {
    kod: "6.2",
    baslik: "6.2",
    metin:
      "Öğretim kadrosu yeterli niteliklere sahip olmalı ve programın etkin bir biçimde sürdürülmesini, değerlendirilmesini ve geliştirilmesini sağlamalıdır.",
    sayfa: 10,
  },
  {
    kod: "6.3",
    baslik: "6.3",
    metin:
      "Öğretim üyesi atama ve yükseltme kriterleri yukarıda sıralananları sağlamaya ve geliştirmeye yönelik olarak belirlenmiş ve uygulanıyor olmalıdır.",
    sayfa: 10,
  },
  { kod: "7", baslik: "Altyapı", metin: "Altyapı", sayfa: 10 },
  {
    kod: "7.1",
    baslik: "7.1",
    metin:
      "Sınıflar, laboratuvarlar ve araştırma donanımı, eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli, öğrenmeye ve araştırmaya yönelik bir atmosfer hazırlamaya yardımcı olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.2",
    baslik: "7.2",
    metin:
      "Öğrencilerin ders dışı etkinlikler yapmalarına olanak veren, sosyal ve kültürel gereksinimlerini karşılayan, mesleki etkinliklere ortam yaratarak, mesleki gelişimlerini destekleyen ve öğrenci- öğretim üyesi ilişkilerini canlandıran uygun altyapı mevcut olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.3",
    baslik: "7.3",
    metin:
      "Programlar, öğrencilerine eğitim ve araştırma için gereken modern mühendislik araçlarına erişim olanakları sağlamalıdır. Bilgisayar ve bilişim altyapıları, programın eğitim amaçlarını destekleyecek doğrultuda, öğrenci ve öğretim üyelerinin bilimsel ve eğitsel çalışmaları için yeterli düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.4",
    baslik: "7.4",
    metin:
      "Öğrencilere sunulan kütüphane olanakları, bilimsel yayınların veri tabanlarına erişimi de kapsayacak biçimde, eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "7.5",
    baslik: "7.5",
    metin:
      "Öğrencilere laboratuvar, atölye gibi fiziksel altyapının doğru ve güvenli kullanımı için gerekli eğitim verilmeli, iş sağlığı ve güvenliği önlemleri için gerekli düzenlemeler bulunmalıdır. Engelliler için altyapı düzenlemesi yapılmış olmalıdır.",
    sayfa: 10,
  },
  { kod: "8", baslik: "Kurum Desteği ve Parasal Kaynaklar", metin: "Kurum Desteği ve Parasal Kaynaklar", sayfa: 10 },
  {
    kod: "8.1",
    baslik: "8.1",
    metin:
      "Üniversitenin idari desteği, yapıcı liderliği, parasal kaynaklar ve dağıtımında izlenen strateji, programın kalitesini ve bunun sürdürülebilmesini sağlayacak düzeyde olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.2",
    baslik: "8.2",
    metin:
      "Kaynaklar, nitelikli bir öğretim kadrosunu çekecek, tutacak ve mesleki gelişimini sürdürmesini sağlayacak, öğrencilerin araştırma çıktılarının yaygınlaştırılmasını destekleyecek yeterlikte olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.3",
    baslik: "8.3",
    metin:
      "Program için gereken altyapıyı temin etmeye, bakımını yapmaya ve işletmeye yetecek parasal kaynak sağlanmalıdır.",
    sayfa: 10,
  },
  {
    kod: "8.4",
    baslik: "8.4",
    metin:
      "Program gereksinimlerini karşılayacak destek personeli ve kurumsal hizmetler sağlanmalıdır. Teknik ve idari kadrolar, program çıktılarını sağlamaya destek verecek sayı ve nitelikte olmalıdır.",
    sayfa: 10,
  },
  {
    kod: "9",
    baslik: "Organizasyon ve Karar Alma Süreçleri",
    metin:
      "Yükseköğretim kurumunun organizasyonu ile rektörlük, enstitü, anabilim dalı ve diğer birimlerin kendi içlerindeki ve aralarındaki tüm karar alma süreçleri, program çıktılarının gerçekleştirilmesini ve eğitim amaçlarına ulaşılmasını destekleyecek biçimde düzenlenmelidir.",
    sayfa: 10,
  },
];

/** FEDEK Lisans Programları Değerlendirme Ölçütleri Sürüm 4.1 (fedek/fedek-degerlendirme-olcutleri-4.1.pdf). */
export const FEDEK_4_1_HAM: readonly ProgramOlcutHam[] = [
  {
    kod: "1",
    baslik: "ÖĞRENCİLER",
    metin:
      "Bir FEF programının değerlendirilmesinde, öğrencilerin niteliği, gelişimi ve başarıları önemlidir. Bu nedenle:",
    sayfa: 3,
  },
  {
    kod: "1.1",
    baslik: "1.1.",
    metin:
      "Programa kabul edilen öğrenciler, programın kazandırmayı hedeflediği çıktıları öngörülen sürede edinebilecek altyapıya sahip olmalıdırlar. Öğrencilerin kabulünde göz önüne alınan göstergeler izlenmeli ve bunların yıllara göre değişimi değerlendirilmelidir.",
    sayfa: 3,
  },
  {
    kod: "1.2",
    baslik: "1.2.",
    metin:
      "Yatay ve dikey geçişle öğrenci kabulü, çift anadal ve yandal uygulamaları ile başka kurumlarda ve/veya programlarda alınmış dersler ve kazanılmış kredilerin değerlendirilmesinde uygulanan ölçütler ayrıntılı olarak tanımlanmış ve uygulanıyor olmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.3",
    baslik: "1.3.",
    metin:
      "Kurum ve/veya program tarafından başka kurumlarla yapılacak ulusal ve uluslararası anlaşmalar ve kurulacak ortaklıklar ile öğrenci hareketliliğini teşvik edecek ve sağlayacak çalışmalar yapılmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.4",
    baslik: "1.4.",
    metin: "Öğrencileri ders ve kariyer planlaması konularında yönlendirecek danışmanlık hizmeti verilmelidir.",
    sayfa: 3,
  },
  {
    kod: "1.5",
    baslik: "1.5.",
    metin:
      "Öğrencilerin program kapsamındaki tüm dersler ve diğer etkinliklerdeki başarıları şeffaf ve tutarlı yöntemlerle ölçülmeli ve değerlendirilmelidir.",
    sayfa: 3,
  },
  {
    kod: "1.6",
    baslik: "1.6.",
    metin:
      "Öğrenci memnuniyetinin değerlendirilmesi mutlaka yapılmalı, bu çıktıların çeşitli yönetim aşamalarında değerlendirilmesi ve değerlendirme sonuçlarının ilgili birim ve bireylere geri dönüşümü sağlanmalıdır.",
    sayfa: 4,
  },
  {
    kod: "1.7",
    baslik: "1.7.",
    metin:
      "Öğrencilerin mezuniyetlerine karar verebilmek için, programın gerektirdiği tüm koşulların yerine getirildiğini belirleyecek güvenilir yöntemler geliştirilmiş ve uygulanıyor olmalıdır.",
    sayfa: 4,
  },
  { kod: "2", baslik: "PROGRAM ÖĞRETİM AMAÇLARI", metin: "PROGRAM ÖĞRETİM AMAÇLARI", sayfa: 4 },
  {
    kod: "2.1",
    baslik: "2.1.",
    metin: "Değerlendirilecek her program için program öğretim amaçları tanımlanmış olmalıdır.",
    sayfa: 4,
  },
  {
    kod: "2.2",
    baslik: "2.2.",
    metin:
      "Bu amaçlar; (a) FEDEK program öğretim amaçları tanımına uymalıdır, (b) kurumun, fakültenin ve bölümün özgörevleriyle uyumlu olmalıdır, (c) programın çeşitli iç ve dış paydaşlarını sürece dahil ederek belirlenmelidir, (d) kolayca erişilebilecek şekilde yayımlanmış olmalıdır, (e) programın iç ve dış paydaşlarının gereksinimleri doğrultusunda uygun aralıklarla güncellenmelidir.",
    sayfa: 4,
  },
  {
    kod: "2.3",
    baslik: "2.3.",
    metin:
      "Öğretim amaçlarına ulaşıldığını belirlemek ve belgelemek için kullanılan bir ölçme ve değerlendirme süreci kurulmuş ve işletiliyor olmalıdır. Bu süreç yardımıyla program eğitim amaçlarına ulaşıldığı kanıtlanmalıdır.",
    sayfa: 4,
  },
  { kod: "3", baslik: "PROGRAM ÇIKTILARI", metin: "PROGRAM ÇIKTILARI", sayfa: 4 },
  {
    kod: "3.1",
    baslik: "3.1.",
    metin:
      "Program çıktıları, program öğretim amaçlarına ulaşabilmek için gerekli bilgi, beceri ve davranış bileşenlerinin tümünü kapsamalı ve Tablo 3.1’de sıralanan FEDEK çıktılarını içerecek biçimde tanımlanmalıdır. Programlar, öğretim amaçlarıyla tutarlı olmak koşuluyla, kendilerine özgü ek çıktılar tanımlayabilirler.",
    sayfa: 4,
  },
  {
    kod: "3.C1",
    baslik: "I.",
    metin:
      "Kendi programları ile ilgili alanlarında yeterli bilgi birikimi ile kuramsal ve uygulamalı bilgilerini alanlarında kullanabilme becerisi.",
    sayfa: 4,
  },
  {
    kod: "3.C2",
    baslik: "II.",
    metin:
      "Alanlarındaki problemleri saptama, tanımlama, yorumlama, formüle etme ve çözme becerisi; bu amaçla uygun analiz ve modelleme yöntemlerini seçme ve uygulama becerisi.",
    sayfa: 4,
  },
  {
    kod: "3.C3",
    baslik: "III.",
    metin:
      "Bir süreci, olayı, olguyu, donanımı veya ürünü anlama, yorumlama, ilgili sorunları çağdaş yöntemlerle çözme becerisi",
    sayfa: 4,
  },
  { kod: "3.C4", baslik: "IV.", metin: "Öğretim programlarında en az iki adet alan dışı ders almış olması.", sayfa: 4 },
  {
    kod: "3.C5",
    baslik: "V.",
    metin:
      "Alan uygulamaları için gerekli olan çağdaş araçları seçme, kullanma, geliştirme ve bilişim teknolojilerini etkin bir şekilde kullanma becerisi.",
    sayfa: 4,
  },
  {
    kod: "3.C6",
    baslik: "VI.",
    metin:
      "Alanlarına göre tasarlama, deney yapma, alan çalışması, veri toplama, sonuçları analiz etme, arşivleme, metin çözme ve/veya yorumlama becerisi.",
    sayfa: 4,
  },
  { kod: "3.C7", baslik: "VII.", metin: "Bireysel olarak ve takımlarda etkin biçimde çalışabilme becerisi.", sayfa: 4 },
  {
    kod: "3.C8",
    baslik: "VIII.",
    metin: "Türkçe sözlü ve yazılı etkin iletişim kurma becerisi; en az bir yabancı dil bilgisi.",
    sayfa: 4,
  },
  {
    kod: "3.C9",
    baslik: "IX.",
    metin:
      "Yaşam boyu öğrenme bilinci, bilgiye erişebilme, bilim ve teknolojideki gelişmeleri izleme ve kendini sürekli yenileme becerisi.",
    sayfa: 5,
  },
  { kod: "3.C10", baslik: "X.", metin: "Mesleki etik ve sorumluluk bilinci.", sayfa: 5 },
  {
    kod: "3.C11",
    baslik: "XI.",
    metin:
      "Alan uygulamalarının evrensel ve toplumsal boyutlardaki etkileri (Çevre sorunları, ekonomi, sürdürülebilirlik vb.) ve hukuksal sonuçları konusunda farkındalık.",
    sayfa: 5,
  },
  {
    kod: "3.2",
    baslik: "3.2.",
    metin:
      "Program çıktılarının gerçekleştirilme düzeyini dönemsel olarak belirlemek ve belgelemek için kullanılan bir ölçme ve değerlendirme süreci oluşturulmuş ve işletiliyor olmalıdır.",
    sayfa: 5,
  },
  {
    kod: "3.3",
    baslik: "3.3.",
    metin:
      "Mezuniyet aşamasına gelmiş öğrencilerin program çıktılarını sağladıklarını kanıtlamak için izleme yöntemleri uygulanmalıdır.",
    sayfa: 5,
  },
  { kod: "4", baslik: "ÖĞRETİM PLANI", metin: "ÖĞRETİM PLANI", sayfa: 5 },
  {
    kod: "4.1",
    baslik: "4.1.",
    metin:
      "Program öğretim amaçlarını ve program çıktılarını destekleyen bir öğretim planı olmalı ve öğretim planı bu ölçütte verilen ortak bileşenleri içermelidir.",
    sayfa: 5,
  },
  {
    kod: "4.2",
    baslik: "4.2.",
    metin:
      "Öğretim planının uygulanmasında kullanılacak eğitim yöntemleri, istenen bilgi, beceri ve davranışların öğrencilere kazandırılmasını garanti edebilmelidir.",
    sayfa: 5,
  },
  {
    kod: "4.3",
    baslik: "4.3.",
    metin:
      "Öğretim planının öngörüldüğü biçimde uygulanmasını güvence altına alacak ve sürekli gelişimini sağlayacak bir öğretim sistemi bulunmalıdır.",
    sayfa: 5,
  },
  {
    kod: "4.4",
    baslik: "4.4.",
    metin:
      "Öğrencileri, önceki derslerde edindikleri bilgi ve becerileri kullanacakları, ilgili alan yeterliliklerini ve gerçekçi koşulları/kısıtları (ekonomi, çevre sorunları, sürdürülebilirlik, üretilebilirlik, etik, sağlık, güvenlik, sosyal ve politik sorunlar gibi) içerecek bilgi ve deneyimle çalıştığı alanda uygulamaya hazır hale getirmelidir",
    sayfa: 5,
  },
  {
    kod: "4.5",
    baslik: "4.5.",
    metin:
      "Öğretim planı aşağıdaki bileşenleri içermelidir: (a) İlgili bilim alanına uygun temel öğretim (b) İlgili bilim alanına uygun öğretim (c) Program amaçları doğrultusunda programın içeriğini bütünleyen en az %25 oranında seçmeli ders. (d) Dört yıllık lisans programlarının mezuniyet kredisi en az 240 AKTS, olmalıdır.",
    sayfa: 5,
  },
  {
    kod: "5",
    baslik: "ÖĞRETİM KADROSU",
    metin: "Öğretim kadrosu bir öğretim programının temel unsurudur. Bu nedenle,",
    sayfa: 5,
  },
  {
    kod: "5.1",
    baslik: "5.1.",
    metin:
      "Öğretim kadrosu, yeterli akademik düzeye sahip ve programın tüm alanlarını kapsayacak sayıda olmalıdır. Öğretim kadrosu programın etkin bir şekilde sürdürülmesini, değerlendirilmesini ve geliştirilmesini sağlamalıdır. Öğretim kadrosu, ilgili sektör, mesleki kuruluşlar ve işverenlerle ilişkileri sürdürebilecek nitelikte olmalıdır",
    sayfa: 5,
  },
  {
    kod: "5.2",
    baslik: "5.2.",
    metin:
      "Öğretim elemanları, öğretim programlarının yürütülmesinin yanında, bilimsel araştırma yapma, öğretim elemanı-öğrenci ilişkisi, öğrenci danışmanlığı, üniversiteye hizmet ve mesleki gelişim hizmetlerinin yerine getirilmesi gibi konularda etkin olmalıdır.",
    sayfa: 5,
  },
  { kod: "5.3", baslik: "5.3.", metin: "Atama ve yükseltme yöntemleri var olmalı ve uygulanmalıdır.", sayfa: 5 },
  {
    kod: "5.4",
    baslik: "5.4.",
    metin: "Öğretim hizmetlerine destek olarak dışarıdan alınacak bireylerde gerekli yeterlilik şartı aranmalıdır.",
    sayfa: 5,
  },
  { kod: "6", baslik: "YÖNETİM YAPISI", metin: "YÖNETİM YAPISI", sayfa: 6 },
  {
    kod: "6.1",
    baslik: "6.1.",
    metin:
      "Kuruluş ve yönetim yapısı, bu yapının ana kuruluş içindeki yeri, öğretim faaliyetleri ve destek hizmetleri arasındaki ilişkiler tanımlanmış olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "6.2",
    baslik: "6.2.",
    metin:
      "Öğretim sonuçlarının değerlendirilebilmesi için gereken tüm strateji, program ve yöntemler belgelendirilmelidir. Yönetim sistemine ait bu belgeler ilgili bireylere iletilmiş, anlaşılır, ulaşılabilir ve uygulanabilir olmalıdır.",
    sayfa: 6,
  },
  { kod: "6.3", baslik: "6.3.", metin: "Arşivler, çağdaş kayıt teknikleri kullanılarak tutulmalıdır.", sayfa: 6 },
  {
    kod: "6.4",
    baslik: "6.4.",
    metin: "Yönetim, iç işleyişi denetleyecek, sorgulayacak ve düzeltebilecek yöntemleri kurmuş, çalışıyor olmalıdır.",
    sayfa: 6,
  },
  { kod: "7", baslik: "ALT YAPI", metin: "ALT YAPI", sayfa: 6 },
  {
    kod: "7.1",
    baslik: "7.1.",
    metin:
      "Sınıflar, laboratuvarlar ve gerekli donanım, öğretim amaçlarına ve program çıktılarına ulaşmak için yeterli olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "7.2",
    baslik: "7.2.",
    metin:
      "Öğrencilerin, alan dışı sosyal ve kültürel gereksinimlerini karşılayan, alanındaki faaliyetlere ortam yaratarak gelişimlerini destekleyen ve öğrenci-öğretim elemanı ilişkilerini canlı tutan uygun altyapı var olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "7.3",
    baslik: "7.3.",
    metin:
      "Birimler öğrencilerine ilgili alan donanımlarını sağlamalıdır. Bilgisayar ve bilişim altyapıları, programın öğretim amaçlarını destekleyecek doğrultuda tasarımlanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "7.4",
    baslik: "7.4.",
    metin:
      "Öğrencilere sunulan kütüphane olanakları öğretim amaçlarına ve program çıktılarına ulaşmak için yeterli düzeyde olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "7.5",
    baslik: "7.5.",
    metin: "Öğrencilerin öğrenim ve yaşam ortamlarında gerekli güvenlik önlemleri alınmış olmalıdır.",
    sayfa: 6,
  },
  { kod: "7.6", baslik: "7.6.", metin: "Engelliler için altyapı düzenlemesi yapılmış olmalıdır.", sayfa: 6 },
  { kod: "8", baslik: "KURUM DESTEĞİ VE PARASAL KAYNAKLAR", metin: "KURUM DESTEĞİ VE PARASAL KAYNAKLAR", sayfa: 6 },
  {
    kod: "8.1",
    baslik: "8.1.",
    metin:
      "Üniversitenin idari desteği, yapıcı liderliği, parasal kaynaklar ve bunların dağıtımında izlenen strateji, programın kalitesini ve sürdürülebilmesini sağlayacak düzeyde olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "8.2",
    baslik: "8.2.",
    metin:
      "Kaynaklar, nitelikli bir öğretim kadrosunu çekecek, tutacak ve akademik gelişiminin sürdürülmesini sağlayacak yeterlilikte olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "8.3",
    baslik: "8.3.",
    metin:
      "Program için gereken altyapıyı temin etmeye, bakımını yapmaya ve işletmeye yetecek parasal kaynak sağlanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "8.4",
    baslik: "8.4.",
    metin:
      "Program gereksinimlerini karşılayacak destek personeli ve kurumsal hizmetler sağlanmalıdır. Teknik ve idari kadrolar, program çıktılarını sağlamaya destek verecek sayı ve nitelikte olmalıdır.",
    sayfa: 6,
  },
  { kod: "9", baslik: "SÜREKLİ İYİLEŞTİRME", metin: "SÜREKLİ İYİLEŞTİRME", sayfa: 6 },
  {
    kod: "9.1",
    baslik: "9.1.",
    metin:
      "Kurulan ölçme ve değerlendirme sistemlerinden elde edilen sonuçların programın sürekli iyileştirilmesine yönelik olarak kullanıldığına ilişkin kanıtlar sunulmalıdır.",
    sayfa: 6,
  },
  {
    kod: "9.2",
    baslik: "9.2.",
    metin:
      "Bu iyileştirme çalışmaları, başta Ölçüt 2 ve Ölçüt 3 ile ilgili alanlar olmak üzere, programın tüm gelişmeye açık alanları ile ilgili, sistematik bir biçimde toplanmış, somut verilere dayalı olmalıdır",
    sayfa: 6,
  },
  { kod: "10", baslik: "PROGRAMA ÖZGÜ ÖLÇÜTLER", metin: "PROGRAMA ÖZGÜ ÖLÇÜTLER", sayfa: 6 },
  { kod: "10.1", baslik: "10.1.", metin: "Programa özgü ölçütlerin sağlandığı kanıtlanmış", sayfa: 6 },
  {
    kod: "10.2",
    baslik: "10.2.",
    metin:
      "Bir programın, adı nedeniyle, birden fazla ölçüt kümesine ait olması durumunda, ilgili her kümedeki ölçütleri sağlaması gerekir.",
    sayfa: 6,
  },
];

/** SABAK Sağlık Bilimleri Eğitim Programları Değerlendirme Ölçütleri R4 (sabak/sabak-genel-degerlendirme-olcutleri-r4.pdf). */
export const SABAK_R4_HAM: readonly ProgramOlcutHam[] = [
  { kod: "1", baslik: "EĞİTİM PROGRAMI", metin: "EĞİTİM PROGRAMI", sayfa: 2 },
  {
    kod: "1.1",
    baslik: "1.1.",
    metin:
      "SABAK tanımında olduğu gibi, programın eğitim amaçları program mezunlarının erişmeleri beklenen kariyer hedeflerine ve mesleki beklentilerine odaklı olarak belirlenmelidir. Bu amaçlar;",
    sayfa: 2,
  },
  {
    kod: "1.1.1",
    baslik: "1.1.1",
    metin: "Kurumun, fakültenin, bölümün misyon ve vizyonu ile uyumlu olmalıdır.",
    sayfa: 2,
  },
  {
    kod: "1.1.2",
    baslik: "1.1.2",
    metin:
      "Programın iç ve dış paydaşlarının gereksinimleri dikkate alınarak, bu paydaşların katkı ve katılımları ile belirlenmelidir.",
    sayfa: 2,
  },
  {
    kod: "1.1.3",
    baslik: "1.1.3",
    metin: "Tüm paydaşlar tarafından kolayca erişilebilecek şekilde yayımlanmış olmalıdır.",
    sayfa: 2,
  },
  {
    kod: "1.1.4",
    baslik: "1.1.4",
    metin:
      "Programın iç ve dış paydaşlarının gereksinimleri küresel olarak değişen yaşam koşulları ve eğitim sistemi doğrultusunda uygun aralıklarla güncellenmelidir.",
    sayfa: 2,
  },
  {
    kod: "1.2",
    baslik: "1.2.",
    metin:
      "Program eğitim amaçlarına ulaşıldığını belirlemek ve belgelemek için ölçme ve değerlendirme süreci olmalıdır. Bu amaçla mezun izleme sistemi, paydaş anketleri vb. gibi kullanılan ölçme ve değerlendirme süreci sistematik olmalı ve somut verilere dayanmalıdır. Uzaktan eğitim sürecinde eğitim amaçlarına ulaşıldığını garanti altına alan yöntemler (çevrimiçi toplantılar vb.) ve uzaktan yapılan ölçme değerlendirme sistemleri tanımlanmış olmalıdır.",
    sayfa: 2,
  },
  {
    kod: "1.3",
    baslik: "1.3.",
    metin:
      "Programlar, yasal süreçleri sağlamak koşuluyla, belirlediği temel amaçlar doğrultusunda kendi eğitim programlarını düzenlemek ve uygulamak konusunda özerktir.",
    sayfa: 2,
  },
  {
    kod: "1.4",
    baslik: "1.4.",
    metin:
      "Her programın, program eğitim amaçlarını ve program çıktılarını destekleyen bir eğitim planı olmalıdır. Eğitim planının bu ölçütte verilen ortak bileşenlerin yanı sıra Ulusal Çekirdek Eğitim Programı ile uyumlu olduğu ve Disipline Özgü Ölçütlerdeki bileşenleri içerdiği somut verilerle gösterilmelidir.",
    sayfa: 2,
  },
  {
    kod: "1.4.1",
    baslik: "1.4.1.",
    metin: "Eğitim planı temel, mesleki ve genel eğitim alanlarına ayrılmalıdır",
    sayfa: 3,
  },
  {
    kod: "1.4.2",
    baslik: "1.4.2.",
    metin:
      "Eğitim planının, öğrenciyi meslek kariyerine veya aynı disiplinde eğitimini sürdürmeye nasıl hazırladığını, program eğitim amaçlarına ve program çıktılarına erişimi nasıl desteklediği açıklanmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.4.3",
    baslik: "1.4.3.",
    metin:
      "Eğitim planının Disipline Özgü Bileşenleri içerdiği ve Ulusal Çekirdek Eğitim Programı ile uyumu gösterilmelidir.",
    sayfa: 3,
  },
  {
    kod: "1.4.4",
    baslik: "1.4.4.",
    metin: "Eğitim planında yer alan tüm derslerin (bölüm dışı dersler dahil) izlenceleri verilmelidir.",
    sayfa: 3,
  },
  { kod: "1.5", baslik: "Eğitim Programı Bileşenleri", metin: "Eğitim Programı Bileşenleri", sayfa: 3 },
  {
    kod: "1.5.1",
    baslik: "1.5.1.",
    metin:
      "İlgili bilim alanına uygun temel öğretim (1 yıl süreli) olduğunu, eğitim planının temel sağlık bilimleri, ilgili disipline uygun meslek eğitimi ve genel eğitim bileşenlerini nasıl sağladığı sayısal veriler de kullanarak açıklanmalıdır",
    sayfa: 3,
  },
  {
    kod: "1.5.2",
    baslik: "1.5.2.",
    metin: "İlgili bilim alanına uygun eğitim (en az 1.5 yıl süreli) verildiği müfredat programı ile gösterilmelidir.",
    sayfa: 3,
  },
  {
    kod: "1.5.3",
    baslik: "1.5.3",
    metin:
      "Eğitim programlarında yapılanma, dikey (dört yıl boyunca) (ilk yıllar temel bilimler, 3 ve 4. sınıflarda klinik ve uygulamalı dersler vb.) ve yatay (aynı yıl içinde) (X ders I ve ikinci dönem X ders II gibi veya ön koşullu dersler vb.) olarak, program amaçlarına ulaşmasını sağlayacak uyumlu bir bütünlük içerisinde olmalıdır. Yüz yüze/karma/uzaktan eğitim oranı (teorik, uygulamalı, seçmeli ders, mesleki uygulama ve staj için) YÖK’ün aldığı kararlar ile uyumlu olmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.5.4",
    baslik: "1.5.4.",
    metin:
      "Program eğitim amaçları doğrultusunda programın içeriğini bütünleyen düzeyde ve Ulusal Çekirdek Eğitim Programı ve bağlı olduğu üniversite tarafından alınan karar ile uyumlu seçmeli dersleri göstermelidir.",
    sayfa: 3,
  },
  {
    kod: "1.5.5",
    baslik: "1.5.5.",
    metin:
      "Örgün eğitimde, yüzyüze/karma/uzaktan eğitim oranı en az (teorik, uygulamalı ders, mesleki uygulama ve staj için) YÖK’ün aldığı güncel kararlar ile uyumlu olmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.6",
    baslik: "Eğitim Planının Kredilendirilmesi",
    metin: "Dört yıllık lisans programlarının mezuniyet kredileri:",
    sayfa: 3,
  },
  {
    kod: "1.6.1",
    baslik: "1.6.1.",
    metin: "AKTS kredisi temel alındığında, en az 240 AKTS’ den oluşmalıdır.",
    sayfa: 3,
  },
  {
    kod: "1.6.2",
    baslik: "1.6.2.",
    metin: "Ulusal Kredi sistemi temel alındığında, en az 120 krediden oluşmalıdır.",
    sayfa: 3,
  },
  { kod: "1.7", baslik: "1.7.", metin: "Eğitim programı klinik karar verme deneyimi kazandırmış olmalıdır.", sayfa: 3 },
  {
    kod: "1.7.1",
    baslik: "1.7.1",
    metin:
      "Öğrencileri, önceki derslerde edindikleri bilgi ve becerileri, ilgili alanın yeterliliklerini ve gerçekçi koşulları/kısıtlılıkları (etik, sağlık, güvenlik, sürdürülebilirlik, üretkenlik, yenilikçilik, çevre sorunları, sosyoekonomik ve politik sorunlar gibi) dikkate alarak uygulamaya hazır hale getirmelidir. Karar verme deneyiminin uzaktan eğitim süreci kapsamında hangi eğitim yöntemi ve hangi eylemlerle kazandırıldığı belirtilmelidir.",
    sayfa: 3,
  },
  { kod: "1.8", baslik: "1.8.", metin: "Eğitim yöntemlerinin açıklanması:", sayfa: 4 },
  {
    kod: "1.8.1",
    baslik: "1.8.1.",
    metin:
      "Eğitim planının uygulanmasında kullanılacak uzaktan eğitim de dahil olmak üzere, tüm eğitim yöntemleri, ayrı ayrı açıklanmalı ve istenen bilgi, beceri ve davranışların öğrencilere kazandırılmasını garanti edebilmelidir.",
    sayfa: 4,
  },
  {
    kod: "1.8.2",
    baslik: "1.8.2",
    metin:
      "Eğitim planının uygulanmasında kullanılan eğitim yöntemleri (derse dayalı, modüler, probleme dayalı, uygulamalı, gibi) açıklanmalıdır.",
    sayfa: 4,
  },
  {
    kod: "1.9",
    baslik: "1.9",
    metin:
      "Eğitim planının öngördüğü biçimde uygulanmasını güvence altına alacak ve sürekli gelişimini sağlayacak bir yönetim sistemi bulunmalıdır. Uzaktan eğitim sisteminin işlemesi ve örgün süreçlerle bütünleşik biçimde ilerlemesi için gereken süreçler ve organizasyonel yapılanma tanımlanmış olmalıdır.",
    sayfa: 4,
  },
  { kod: "2", baslik: "PROGRAM ÇIKTILARI", metin: "PROGRAM ÇIKTILARI", sayfa: 4 },
  {
    kod: "2.1",
    baslik: "2.1.",
    metin:
      "Öğrencilerin programdan mezun oluncaya kadar kazanmaları gereken bilgi, beceri ve davranışları tanımlayan program çıktıları, programın eğitim amaçlarına ulaşabilmek için gerekli bilgi, beceri ve davranış̧ bileşenlerinin tümünü̈ kapsamalıdır.",
    sayfa: 4,
  },
  {
    kod: "2.2",
    baslik: "2.2.",
    metin:
      "Program çıktılarını belirleme yöntemi (müfredat/eğitim komisyonu, bölüm kurulları, iç ve dış̧ paydaş̧ görüşleri vb.) olmalıdır.",
    sayfa: 4,
  },
  {
    kod: "2.3",
    baslik: "2.3.",
    metin:
      "Program çıktıları, ilgili alana ilişkin tüm yetkinlikleri kapsamalıdır. Türkiye Yükseköğretim Yeterlilikler Çerçevesinde tanımlanan yetkinliklerin göz önünde bulundurulduğu somut veriler ile gösterilmelidir.",
    sayfa: 4,
  },
  {
    kod: "2.4",
    baslik: "2.4.",
    metin:
      "Programlar, program çıktılarını sağladıklarını kanıtlamak için ölçme-değerlendirme ve izleme yöntemlerini geliştirmiş olmalıdır; kullanılan uzaktan eğitim yöntemi sistemleri de açıklanmalıdır. Programın yeterliliklerin hangi eylemlerle kazandırılabileceği (yeterlik-ders- öğretim yöntemi matrisleri) ve bu eylemlerin hangi eğitim türüyle (yüz yüze, karma vb.) mümkün olacağı gösterilmelidir.",
    sayfa: 4,
  },
  {
    kod: "2.4.1",
    baslik: "2.4.1.",
    metin:
      "Her bir program çıktısı için ayrı ayrı olmak üzere, mezuniyet aşamasına gelmiş olan her bir öğrencinin o program çıktısına ne düzeyde ulaştığını açıklanmalıdır.",
    sayfa: 4,
  },
  {
    kod: "2.4.2",
    baslik: "2.4.2.",
    metin:
      "Programlar, her bir program çıktılarını sağladıklarını kanıtlamak için hazırladıkları izleme yöntemlerini göstermelidir. İzlem sonuçlarının analizi ve karar süreçlerine yansımasını kanıtlarla göstermelidir.",
    sayfa: 4,
  },
  {
    kod: "2.5",
    baslik: "2.5.",
    metin: "Her bir dönem için program çıktılarının gerçekleştirilme düzeyi belirlenmeli ve belgelenmelidir.",
    sayfa: 4,
  },
  {
    kod: "2.6",
    baslik: "2.6.",
    metin:
      "Program çıktıları Tablo 1’de sıralanan SABAK çıktılarını içerecek biçimde tanımlanmalıdır. Programlar, eğitim amaçlarıyla tutarlı olmak koşuluyla, kendilerine özgü̈ ek çıktılar tanımlayabilirler.",
    sayfa: 4,
  },
  {
    kod: "2.6.1",
    baslik: "2.6.1.",
    metin: "Program, öğrencilerin SABAK çıktılarına ulaşmasını garanti altına aldığını kanıtlamalıdır.",
    sayfa: 5,
  },
  {
    kod: "2.C1",
    baslik: "I",
    metin:
      "Temel sağlık alanı ve ilgili meslek alanı konularında yeterli bilgi birikimi ile kuramsal ve uygulamalı bilgilerini kendi alanlarında kullanabilme becerisi",
    sayfa: 5,
  },
  {
    kod: "2.C2",
    baslik: "II",
    metin:
      "Alanlarındaki problemleri saptama, tanımlama, yorumlama, formüle etme ve çözme becerisi; bu amaçla uygun analiz ve müdahale yaklaşımlarını seçme ve uygulama becerisi",
    sayfa: 5,
  },
  {
    kod: "2.C3",
    baslik: "III",
    metin:
      "Bir süreci, olayı, vakayı, donanımı veya ürünü anlama, yorumlama, ilgili sorunları bütüncül bakış açısı ve çağdaş yöntemlerle çözme becerisi",
    sayfa: 5,
  },
  { kod: "2.C4", baslik: "IV", metin: "Bireysel olarak ve ekiplerde etkin biçimde çalışabilme becerisi", sayfa: 5 },
  { kod: "2.C5", baslik: "V", metin: "Eğitim programlarında en az iki adet alan dışı ders almış olması", sayfa: 5 },
  {
    kod: "2.C6",
    baslik: "VI",
    metin:
      "Alan uygulamaları için gerekli olan güncel ve işlevsel araçları geliştirme, seçme ve kullanma becerisi yanı sıra bilişim teknolojilerini etkin bir şekilde kullanma becerisi",
    sayfa: 5,
  },
  {
    kod: "2.C7",
    baslik: "VII",
    metin: "Türkçe sözlü ve yazılı etkin iletişim kurma becerisi, en az bir yabancı dil bilgisi",
    sayfa: 5,
  },
  {
    kod: "2.C8",
    baslik: "VIII",
    metin:
      "Yaşam boyu öğrenme bilinci, bilgiye erişebilme, bilim ve teknolojideki gelişmeleri izleme ve kendini sürekli yenileme becerisi",
    sayfa: 5,
  },
  {
    kod: "2.C9",
    baslik: "IX.",
    metin:
      "Disipline özgü konularda deney/alan çalışması tasarlama, veri toplama, sonuçları analiz etme, yorumlama ve raporlama becerisi",
    sayfa: 5,
  },
  {
    kod: "2.C10",
    baslik: "X.",
    metin:
      "Alan uygulamalarının evrensel ve toplumsal boyutlardaki etkileri ve hukuksal sonuçları konusunda farkındalık",
    sayfa: 5,
  },
  { kod: "2.C11", baslik: "XI.", metin: "Mesleki etik ve sorumluluk bilinci", sayfa: 5 },
  { kod: "3", baslik: "ÖĞRENCİLER", metin: "ÖĞRENCİLER", sayfa: 5 },
  {
    kod: "3.1",
    baslik: "3.1.",
    metin:
      "Programa hangi süreçler ile öğrenci kabul edildiğini açıklayınız. Öğrencilerin programa kabulünde göz önüne alınan göstergeler (kontenjan, bursluluk, başarı sıralaması) izlenmeli ve bunların yıllara göre gelişimi değerlendirilmelidir",
    sayfa: 5,
  },
  {
    kod: "3.1.1",
    baslik: "3.1.1.",
    metin:
      "Programa hangi süreçlerle (merkezi yerleştirme, yatay/dikey geçiş, lisans tamamlama, vb,) öğrenci kabul edildiği açıklanmalıdır.",
    sayfa: 5,
  },
  {
    kod: "3.1.2",
    baslik: "3.1.2",
    metin:
      "Son beş yıla ilişkin kontenjanları, programa yeni kayıt yaptıran öğrencilerin sayıları, Üniversiteye giriş sınavı puanlarını/türleri ve başarı sıralaması, hazırlık sınıfı öğrencisi dahil olmak üzere, lisans tamamlama kapsamında kayıt yapılan öğrenci sayıları da eklenerek Tablo 3.1’de verilmelidir.",
    sayfa: 5,
  },
  {
    kod: "3.1.3",
    baslik: "3.1.3.",
    metin:
      "Kontenjanlar ve programa kabul edilen öğrenci sayılarıyla bu öğrenciler ile ilgili göstergelerin yıllara göre değişimi verilmelidir. Programa kabul edilen öğrencilerin, programın kazandırmayı hedeflediği çıktıları (bilgi, beceri ve davranışları) öngörülen sürede edinebilecek altyapıya ne düzeyde sahip oldukları açıklanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.1.4",
    baslik: "3.1.4.",
    metin:
      "Programa kabul edilen öğrenciler için hazırlık sınıfları var ise bu uygulama ile ilgili düzenlemeler açıklanmalıdır, program öğrencilerinin hazırlık sınıfındaki başarı durumuna ilişkin istatistiksel bilgi verilmelidir.",
    sayfa: 6,
  },
  {
    kod: "3.2",
    baslik: "3.2.",
    metin:
      "Yatay ve dikey geçişle öğrenci kabulü, çift ana dal, yan dal ve öğrenci değişimi uygulamaları ile başka kurumlarda ve/veya programlarda alınmış dersler ve kazanılmış kredilerin değerlendirilmesine ilişkin kurallar ayrıntılı olarak tanımlanmış ve uygulanıyor olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.2.1",
    baslik: "3.2.1.",
    metin: "Yatay ve dikey geçiş ile öğrenci kabulü, çift ana dal, yan dal bilgileri tablo ile verilmelidir.",
    sayfa: 6,
  },
  {
    kod: "3.2.2",
    baslik: "3.2.2.",
    metin:
      "Yatay geçiş, dikey geçiş, çift ana dal ve yan dal uygulamaları ile başka programlarda ve/veya kurumlarda alınmış dersler ve kazanılmış kredilerin değerlendirilmesinde uygulanan politikalar ve bunların uygulamaları açıklanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.3",
    baslik: "3.3.",
    metin:
      "Diğer yükseköğretim kurumları ile yapılacak ulusal/uluslararası anlaşmalar ve kurulacak ortaklıklar ile öğrenci hareketliliği sağlanmalı ve teşvik edilmelidir.",
    sayfa: 6,
  },
  {
    kod: "3.4",
    baslik: "3.4.",
    metin:
      "Öğrencileri ders ve kariyer planlaması konularında yönlendirecek düzenli danışmanlık hizmeti uzaktan eğitim süreci de dahil verilmelidir.",
    sayfa: 6,
  },
  {
    kod: "3.4.1",
    baslik: "3.4.1.",
    metin:
      "Öğrencilerin, ders seçimi, ders/sınıf geçme, yan dal, ana dal, yatay geçiş, değişim programları vb. program ile ilgili akademik unsurlar ve bilimsel faaliyetlere katılmaları yönündeki danışmanlık süreçleri açıklanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.4.2",
    baslik: "3.4.2.",
    metin: "Öğretim üyelerinin danışmanlık hizmetlerine katkıları sayısal ve niteliksel olarak açıklanmlıdır.",
    sayfa: 6,
  },
  {
    kod: "3.4.3",
    baslik: "3.4.3.",
    metin:
      "Öğrencilerin mezuniyet sonrası iş ve akademik kariyer gelişimlerine katkısı olabilecek iş alanından ve akademik alandan profesyonellerle buluşturulması sağlanmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.5",
    baslik: "3.5.",
    metin:
      "Öğrencilerin program kapsamında verilen tüm dersler ve diğer etkinliklerdeki başarıları uzaktan eğitim süreci de dahil olmak üzere, şeffaf, adil ve tutarlı yöntemlerle ölçülmeli, değerlendirilmeli ve öğrenciler ile paylaşılmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.6",
    baslik: "3.6.",
    metin:
      "Öğrencilerin mezuniyetine karar verebilmek için programın gerektirdiği tüm koşulların (AKTS, sınavlar, projeler vb) yerine getirildiğini belirleyecek güvenilir yöntemler geliştirilmiş ve uygulanıyor olmalıdır.",
    sayfa: 6,
  },
  {
    kod: "3.7",
    baslik: "3.7.",
    metin:
      "Eğitim-öğretim ile ilgili uzaktan eğitim de dahil tüm süreçlerde, eğitimin önemli bir paydaşı olarak öğrenci temsiliyeti sağlanmalıdır. Bu amaçla kurullarda/ komisyonlarda/ komitelerde öğrencilerin; katkı ve katılımları sağlanmalı ve belgelendirilmelidir.",
    sayfa: 6,
  },
  {
    kod: "3.8",
    baslik: "3.8.",
    metin:
      "Öğrencilere; sosyal, kültürel, sanatsal ve sportif olanaklar sağlanmalıdır. Öğrencilerin bu olanaklardan yararlanması teşvik edilmeli, yararlanma biçimi ve oranı uzaktan eğitim de dahil izlenmelidir.",
    sayfa: 7,
  },
  {
    kod: "3.9",
    baslik: "3.9.",
    metin:
      "Öğrenci memnuniyeti uzaktan eğitim de dahil olmak üzere, düzenli olarak değerlendirilmeli, sonuçlar çeşitli yönetim aşamalarında izlenmeli, ilgililere geri bildirim sağlanmalı ve eğitim programına yansıtılmalıdır.",
    sayfa: 7,
  },
  { kod: "4", baslik: "ÖĞRETİM ELEMANLARI", metin: "ÖĞRETİM ELEMANLARI", sayfa: 7 },
  {
    kod: "4.1",
    baslik: "4.1.",
    metin:
      "Öğretim kadrosu, programın eğitim verdiği mesleki alanda yeterli akademik düzeye sahip ve programın tüm alanlarını kapsayacak sayıda olmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.1.1",
    baslik: "4.1.1.",
    metin:
      "Öğretim kadrosu, programın etkin bir şekilde sürdürülmesini, değerlendirilmesini ve geliştirilmesini sağlamalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.1.2",
    baslik: "4.1.2.",
    metin:
      "Öğretim kadrosu, ilgili mesleki kuruluşları, sektör, sivil toplum örgütleri ve işverenler ile iletişim ve işbirliği içerisinde olmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.2",
    baslik: "4.2.",
    metin:
      "Öğretim elemanları, eğitim programlarının yürütülmesinin yanı sıra, bilimsel araştırma yapma, öğretim elemanı-öğrenci iletişimi, öğrenci danışmanlığı, üniversiteye hizmet ve mesleki gelişim hizmetlerinin yerine getirilmesi gibi konularda etkin olmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.2.1",
    baslik: "4.2.1.",
    metin:
      "Öğretim kadrosunun sahip olduğu niteliklerin yeterliği ve programın sürdürülmesi, değerlendirilmesi ve geliştirilmesi yönündeki yaklaşım ve uygulamaları açıklanmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.2.2",
    baslik: "4.2.2",
    metin:
      "Ders vermekle yükümlü olan öğretim üyesi, öğretim görevlilerinin ve Bölüm Başkanının özet özgeçmişlerini belirtilen formata uygun olarak Ek I.2’de verilmelidir.",
    sayfa: 7,
  },
  {
    kod: "4.2.3",
    baslik: "4.2.3.",
    metin:
      "Öğretim elemanları programın tüm alanlarını kapsayacak şekilde bilgi ve deneyime sahip olduğu, etkin öğretme, uzaktan eğitim becerileri, iletişim, program geliştirme ve araştırma ile ilgili bilgi, beceri ve deneyime sahip olduğu, varsa mesleki kuruluşlara üyelikleri gibi hususlar açıklanmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.3",
    baslik: "4.3.",
    metin:
      "Öğretim elemanı seçimi, ataması ve akademik yükseltmelerinde üniversitenin belirlediği sistematik kriterler ve akademik liyakat göz önüne alınmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.4",
    baslik: "4.4.",
    metin:
      "Program kadro gelişimine yönelik gerçekçi bir stratejik planlama yapmalıdır. Eğitim, araştırma ve hizmet kalitesini geliştirecek stratejileri oluşturmalı, bu stratejiler ölçülebilir hedeflere dönüştürülmeli ve uygulama sonuçları performans göstergelerine göre sürekli izlenmelidir.",
    sayfa: 7,
  },
  {
    kod: "4.5",
    baslik: "4.5.",
    metin: "Öğretim elemanlarının eğitsel performansları izlenmeli, değerlendirilmeli ve ödüllendirmelidir.",
    sayfa: 7,
  },
  {
    kod: "4.5.1",
    baslik: "4.5.1.",
    metin:
      "Akademik kadrolarının eğitici niteliklerini iyileştirmeye yönelik eğiticilerin eğitimi programları olmalıdır.",
    sayfa: 7,
  },
  {
    kod: "4.5.2",
    baslik: "4.5.2.",
    metin:
      "Mesleki ve eğitsel gelişim programlarına katılım özendirilmeli, finansal ve idari destek sağlanmalı ve ilgili programa etki ve etkinliği değerlendirilmelidir.",
    sayfa: 8,
  },
  {
    kod: "4.6",
    baslik: "4.6",
    metin:
      "Öğretim hizmetlerine destek olarak dışarıdan görevlendirecek öğretim elemanlarında aranacak nitelikler ile ilgili programın belirlediği bir yöntem olmalı ve uygulanmalıdır.",
    sayfa: 8,
  },
  { kod: "5", baslik: "ALTYAPI", metin: "ALTYAPI", sayfa: 8 },
  {
    kod: "5.1",
    baslik: "5.1.",
    metin:
      "Sınıflar, laboratuvarlar, klinik alanlar ve diğer gerekli ekipman/donanımlar, eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.2",
    baslik: "5.2.",
    metin:
      "Program, öğrencilerin ders veya alan dışı etkinlikler yapmalarına olanak veren, sosyal ve kültürel gereksinimlerini karşılayan, alanındaki faaliyetlere ortam yaratarak mesleki gelişimlerini destekleyen ve öğrenci-öğretim elemanı iletişimini dinamik tutan ve arttırmayı sağlayan uygun altyapıya sahip olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.3",
    baslik: "5.3.",
    metin:
      "Programlar öğrencilerine ilgili alanın profesyonelleri tarafından kullanılan mesleki ekipman/donanımları kullanmayı öğrenecekleri olanakları sağlamalıdır. Bilgisayar ve bilişim altyapıları, programın eğitim amaçlarını destekleyecek doğrultuda tasarlanmalı, öğrenci ve öğretim elemanlarının bilimsel ve eğitsel çalışmaları için yeterli düzeyde olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.4",
    baslik: "5.4.",
    metin:
      "Öğrencilere sunulan kütüphane olanakları eğitim amaçlarına ve program çıktılarına ulaşmak için yeterli düzeyde olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.5",
    baslik: "5.5.",
    metin: "Öğrencilerin öğrenim ve yaşam ortamlarında gerekli güvenlik önlemleri alınmış olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.6",
    baslik: "5.6.",
    metin:
      "Özel gereksinimli bireyler için altyapı, eğitim materyallerine ulaşım ve sınavlar ile ilgili uyarlamalar yapılmış olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "5.7",
    baslik: "5.7.",
    metin:
      "Üniversitenin uzaktan eğitimde sunduğu altyapı olanakları açıklanmalıdır, programın eğitiminin öngörüldüğü biçimde sürdürülmesi konusundaki etkililiği ve yararlanma durumunu açıklayınız.",
    sayfa: 8,
  },
  { kod: "6", baslik: "YÖNETİM YAPISI", metin: "YÖNETİM YAPISI", sayfa: 8 },
  {
    kod: "6.1",
    baslik: "6.1.",
    metin:
      "Kuruluş ve yönetim yapısı; Rektörlük, fakülte, bölüm ve diğer alt birimler düzeyindeki karar alma ve yürütme süreçleri, program çıktılarının gerçekleştirilmesini ve eğitim amaçlarına ulaşılmasını destekleyecek şekilde düzenlenmiş olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "6.2",
    baslik: "6.2.",
    metin:
      "Eğitim programının üst yöneticisi (bölüm başkanı), ilgili alanda doktora derecesine sahip ve tam zamanlı olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "6.3",
    baslik: "6.3.",
    metin:
      "Eğitim sonuçlarının değerlendirilebilmesi için gereken tüm strateji, program ve yöntemler belgelendirilmelidir. Yönetim sistemine ait bu belgeler ilgili bireylere iletilmiş, ulaşılabilir ve uygulanabilir olmalıdır. Programa özgü belirlenen stratejik plan, amaç, hedefler vb. için geliştirilen rehber, yönerge, yönlendirme, iş akış şemaları tanımlanmış, ulaşılabilir ve uygulanıyor olmalıdır.",
    sayfa: 8,
  },
  {
    kod: "6.4",
    baslik: "6.4.",
    metin:
      "Yönetim sistemine ait tüm belgelerin ilgili birim (kurumlar) ve personele ve öğrencilere iletildiği ve ulaşabilir olduğu kanıtlanmalıdır.",
    sayfa: 9,
  },
  { kod: "6.5", baslik: "6.5.", metin: "Programın kendine ait güncel ve ulaşılabilir arşivi olmalıdır.", sayfa: 9 },
  {
    kod: "6.6",
    baslik: "6.6.",
    metin:
      "Yönetim, iç işleyişi denetleyecek ve sorgulayabilecek, sürdürebilecek ve düzeltebilecek kendi iç denetim mekanizmasını kurmuş olmalıdır.",
    sayfa: 9,
  },
  { kod: "7", baslik: "KURUM DESTEĞİ VE MADDİ KAYNAKLAR", metin: "KURUM DESTEĞİ VE MADDİ KAYNAKLAR", sayfa: 9 },
  {
    kod: "7.1",
    baslik: "7.1.",
    metin:
      "Yönetim mali kaynakların dağıtımında strateji ve program kalitesinin sürdürebilmesini sağlayabilecek şekilde adil ve tutarlı olmalıdır.",
    sayfa: 9,
  },
  {
    kod: "7.2",
    baslik: "7.2.",
    metin:
      "Yönetimin desteği, nitelikli bir öğretim kadrosunu çekme, tutma ve mesleki gelişimi sürdürme açısından yeterli olmalıdır.",
    sayfa: 9,
  },
  {
    kod: "7.3",
    baslik: "7.3.",
    metin:
      "Program için gereken altyapıyı temin etmeye, bakımını yapmaya ve işletmeye yetecek maddi kaynak sağlanmalıdır.",
    sayfa: 9,
  },
  {
    kod: "7.4",
    baslik: "7.4.",
    metin:
      "Yüzyüze/karma/uzaktan eğitim süreçlerinde, program gereksinimlerini karşılayacak destek personeli ve kurumsal hizmetler sağlanmalıdır. Teknik ve idari kadrolar, program çıktılarını sağlamaya destek verecek sayı ve nitelikte olmalıdır.",
    sayfa: 9,
  },
  { kod: "8", baslik: "SÜREKLİ YENİLEME VE GELİŞİM", metin: "SÜREKLİ YENİLEME VE GELİŞİM", sayfa: 9 },
  {
    kod: "8.1",
    baslik: "8.1.",
    metin:
      "Tüm ölçütler için kurulan ölçme ve değerlendirme sistemlerinden elde edilen sonuçların programın sürekli iyileştirilmesine yönelik olarak kullanıldığına ilişkin kanıtlar sunulmalıdır.",
    sayfa: 9,
  },
  {
    kod: "8.2",
    baslik: "8.2.",
    metin:
      "İyileştirme çalışmaları, programın tüm alanları ile ilgili gelişmeleri sistematik ve somut verilere dayalı olarak göstermelidir. Planla-Uygula-Kontrol Et-Önlem Al (PUKÖ) döngüsü işletilmelidir.",
    sayfa: 9,
  },
  { kod: "9", baslik: "DİSİPLİNE ÖZGÜ ÖLÇÜTLER", metin: "DİSİPLİNE ÖZGÜ ÖLÇÜTLER", sayfa: 9 },
  {
    kod: "9.1",
    baslik: "9.1.",
    metin: "Her programın kendine özgü ölçütleri olmalıdır. Bu ölçütlerin nasıl sağlandığı açıklanmalıdır.",
    sayfa: 9,
  },
];

/** EPDAD RPD Lisans Eğitimi Standartları (epdad/epdad-rpd-lisans-egitimi-standartlari.pdf), 1-3. sayfalardaki standart tablosu. */
export const EPDAD_RPD_HAM: readonly ProgramOlcutHam[] = [
  {
    kod: "1",
    baslik: "Öğretimin planlanması, uygulanması ve değerlendirilmesi.",
    metin: "Öğretimin planlanması, uygulanması ve değerlendirilmesi.",
    sayfa: 1,
  },
  {
    kod: "1.1.1",
    baslik: "1.1.1",
    metin:
      "Türkiye Yükseköğretim Yeterlikler Çerçevesi ve Alan Yeterlikleri ile ilişkilendirilerek hazırlanmış lisans programının izlenmesi.",
    sayfa: 1,
  },
  {
    kod: "1.1.2",
    baslik: "1.1.2",
    metin:
      "Ders öğretim programlarında kazanım, içerik, eğitim durumu ve değerlendirme arasında iç tutarlılık bulunması.",
    sayfa: 1,
  },
  {
    kod: "1.1.3",
    baslik: "1.1.3",
    metin: "Ders öğretim programlarının etkili RPD eğitimini gerçekleştirecek nitelikte olması.",
    sayfa: 1,
  },
  { kod: "1.2.1", baslik: "1.2.1", metin: "Ders öğretim programları ile uygulama arasında uygunluk.", sayfa: 1 },
  {
    kod: "1.2.2",
    baslik: "1.2.2",
    metin:
      "Öğrencilerin fakültede, okullarda ve uygulama yapılan diğer kurumlarda (Rehberlik ve Araştırma Merkezleri, özel eğitim kurumları, özel uygulama merkezleri, kadın danışma merkezleri vb.) nitelikli psikolojik danışma ve rehberlik (PDR) hizmetlerini gözleyebilme olanağı.",
    sayfa: 1,
  },
  {
    kod: "1.2.3",
    baslik: "1.2.3",
    metin:
      "Öğrencilere gerçek ortamlarda PDR hizmetlerine ilişkin becerilerini uygulama olanağı ile performansları hakkında sürekli ve nitelikli geribildirim fırsatı sağlanması.",
    sayfa: 1,
  },
  {
    kod: "1.2.4",
    baslik: "1.2.4",
    metin:
      "Öğrenci çalışmalarının kendi gelişimlerine yardımcı olacak ve onlara yararlı dönütler sağlayacak şekilde değerlendirilmesi.",
    sayfa: 1,
  },
  { kod: "1.3.1", baslik: "1.3.1", metin: "Öğrencilerin mesleki yeterlik düzeyine ulaşmaları.", sayfa: 1 },
  { kod: "2", baslik: "Öğretim elemanları", metin: "Öğretim elemanları", sayfa: 2 },
  {
    kod: "2.1.1",
    baslik: "2.1.1",
    metin: "Programı yürüten öğretim elemanlarının nicelik ve nitelik bakımından yeterli olması.",
    sayfa: 2,
  },
  {
    kod: "2.1.2",
    baslik: "2.1.2",
    metin:
      "Öğretim elemanlarına mesleki alanda kendilerini yenilemeleri ve araştırma yapmaları için olanak sağlanması.",
    sayfa: 2,
  },
  { kod: "2.2.1", baslik: "2.2.1", metin: "Öğretim elemanlarının mesleki gelişim göstermesi.", sayfa: 2 },
  {
    kod: "2.2.2",
    baslik: "2.2.2",
    metin:
      "Öğretim elemanlarının öğretme, rehberlik yapma, eleman yetiştirme, okullarda ve uygulama yapılan diğer kurumlarda çalışma, araştırma ve program liderliği ile birlikte tüm görev ve sorumlulukları yerine getirmesi.",
    sayfa: 2,
  },
  { kod: "2.3.1", baslik: "2.3.1", metin: "Öğretim elemanlarının nitelikli eğitim- öğretim yapması.", sayfa: 2 },
  {
    kod: "2.3.2",
    baslik: "2.3.2",
    metin:
      "Nitelikli bilimsel araştırmalar ve yayınlar yapılması ve bunların ilgili programın nitel gelişimini desteklemesi.",
    sayfa: 2,
  },
  { kod: "2.3.3", baslik: "2.3.3", metin: "Öğretim elemanlarının toplum yararına çalışmalar yapması.", sayfa: 2 },
  { kod: "3", baslik: "Öğrenciler", metin: "Öğrenciler", sayfa: 2 },
  {
    kod: "3.1.1",
    baslik: "3.1.1",
    metin: "Öğrencilerin programa başlayabilmesi için gerekli niteliklere sahip olması.",
    sayfa: 2,
  },
  {
    kod: "3.2.1",
    baslik: "3.2.1",
    metin:
      "Öğrencilerin mesleki gelişimlerini destekleyecek akademik, sosyal, kültürel vb. etkinliklere aktif katılım göstermesi ve bunun için gerekli akademik danışmanlık ve rehberlik hizmetlerinin sunulması.",
    sayfa: 2,
  },
  {
    kod: "3.3.1",
    baslik: "3.3.1",
    metin: "Mezuniyet aşamasına gelmiş öğrencilerin ve/ veya mesleğe başlayan mezunların başarılı olması.",
    sayfa: 2,
  },
  { kod: "4", baslik: "Fakülte-Okul İşbirliği", metin: "Fakülte-Okul İşbirliği", sayfa: 2 },
  {
    kod: "4.1.1",
    baslik: "4.1.1",
    metin:
      "Okullardaki ve uygulama yapılan diğer kurumlardaki (Rehberlik ve Araştırma Merkezi, özel eğitim kurumları, özel uygulama merkezleri, kadın danışma merkezleri vb.) çalışmalara ilişkin yönetsel düzenlemelerin ve belgelerin varlığı.",
    sayfa: 2,
  },
  {
    kod: "4.1.2",
    baslik: "4.1.2",
    metin: "Uygulama kurumlarının seçiminde ilgili yönerge ve yasal düzenlemelere ve ölçütlere uygunluk.",
    sayfa: 2,
  },
  {
    kod: "4.2.1",
    baslik: "4.2.1",
    metin:
      "Fakülte ile İl/İlçe Milli Eğitim Müdürlüğü ve uygulama yapılan diğer kurumlardaki yöneticiler (Rehberlik ve Araştırma Merkezi, özel eğitim kurumları, özel uygulama merkezleri, kadın danışma merkezleri vb.), öğretim elemanları, kurum psikolojik danışmanları ve öğrenciler arasında işbirliğinin varlığı.",
    sayfa: 2,
  },
  {
    kod: "4.2.2",
    baslik: "4.2.2",
    metin: "Uygulama okullarında ve uygulama yapılan diğer kurumlarda öğrencilere uygun ortamın sağlanması.",
    sayfa: 2,
  },
  {
    kod: "4.3.1",
    baslik: "4.3.1",
    metin:
      "Uygulama okullarında ve uygulama yapılan diğer kurumlardaki çalışmalar sonucunda öğrencilerin alanlarında hizmet sunacak yeterliğe ulaşması.",
    sayfa: 2,
  },
  { kod: "5", baslik: "Tesisler, Kütüphane ve Donanım", metin: "Tesisler, Kütüphane ve Donanım", sayfa: 3 },
  {
    kod: "5.1.1",
    baslik: "5.1.1",
    metin: "Dersliklerin ilgili dersler için yeterli sayıya, büyüklüğe ve altyapıya sahip olması.",
    sayfa: 3,
  },
  {
    kod: "5.1.2",
    baslik: "5.1.2",
    metin:
      "Kütüphanede bulunan kitaplar, süreli yayınlar, abone olunan e- kaynaklar, bilgisayar ve diğer materyallerin varlığı ve bunların öğretim programlarını destekleme derecesi.",
    sayfa: 3,
  },
  {
    kod: "5.1.3",
    baslik: "5.1.3.",
    metin:
      "Fakültenin programı yürütebilecek tesis (PDR uygulamaları için gerekli eğitim- öğretim amaçlı mekânlar) ve donanımlara sahip olması.",
    sayfa: 3,
  },
  {
    kod: "5.1.4",
    baslik: "5.1.4",
    metin: "Öğretim elemanlarının çalışmalarını yapacak ofis, donanım ve diğer desteklere sahip olması.",
    sayfa: 3,
  },
  {
    kod: "5.2.1",
    baslik: "5.2.1",
    metin: "Fakülte tesis ve donanımları ile dersliklerin tam kapasite ile etkin biçimde kullanılması.",
    sayfa: 3,
  },
  {
    kod: "5.2.2",
    baslik: "5.2.2",
    metin: "Kütüphanenin öğrenciler tarafından amaca uygun ve etkili olarak kullanılması.",
    sayfa: 3,
  },
  {
    kod: "5.3.1",
    baslik: "5.3.1",
    metin:
      "Öğrencilerin Psikolojik Danışma Birimi/Merkezi ve teknoloji kaynaklarını etkin biçimde kullanma düzeyine ulaşmış olmaları.",
    sayfa: 3,
  },
  {
    kod: "5.3.2",
    baslik: "5.3.2",
    metin: "Öğrencilerin kütüphane kaynaklarını etkin biçimde kullanma düzeyine ulaşmış olmaları.",
    sayfa: 3,
  },
  { kod: "6", baslik: "Yönetim", metin: "Yönetim", sayfa: 3 },
  {
    kod: "6.1.1",
    baslik: "6.1.1",
    metin: "Fakültenin yönetim yapısı ve anlayışının etkin bir yönetim için elverişliliği.",
    sayfa: 3,
  },
  {
    kod: "6.1.2",
    baslik: "6.1.2",
    metin: "Fakültenin RPD eğitimi konusunda bir vizyon ve misyona sahip olması.",
    sayfa: 3,
  },
  {
    kod: "6.2.1",
    baslik: "6.2.1",
    metin: "Yönetim birimlerinin işlevlerini etkin bir biçimde yerine getirmesi.",
    sayfa: 3,
  },
  { kod: "6.2.2", baslik: "6.2.2", metin: "Fakülte yönetiminin RPD eğitiminin gelişimini desteklemesi.", sayfa: 3 },
  {
    kod: "6.2.3",
    baslik: "6.2.3",
    metin: "Fakültenin ulusal/uluslararası kurum ve kuruluşlarla ilişkilere sahip olması.",
    sayfa: 3,
  },
  { kod: "6.3.1", baslik: "6.3.1", metin: "Yönetimin gerekli kaynakları sağlaması ve etkili kullanması.", sayfa: 3 },
  { kod: "7", baslik: "Kalite güvencesi", metin: "Kalite güvencesi", sayfa: 3 },
  {
    kod: "7.1.1",
    baslik: "7.1.1",
    metin: "Fakülte düzeyinde kalite güvence (KG) politikası ve uygulama yöntemlerinin olması.",
    sayfa: 3,
  },
  {
    kod: "7.2.1",
    baslik: "7.2.1",
    metin: "Fakültenin bir bütün olarak geliştirilmesinde kalite güvence (KG) bulgularının kullanılması.",
    sayfa: 3,
  },
  {
    kod: "7.3.1",
    baslik: "7.3.1",
    metin: "Mezunların izlenmesinden elde edilen bilgi ve bulguların kalite güvence (KG) sistemine yansıtılması.",
    sayfa: 3,
  },
];

/** EPDAD Öğretmen Eğitimi Standartları Kılavuzu Sürüm 1.1 (epdad/epdad-standartlar-1.1-kilavuz.pdf); alt standart başlıkları ve KANITLAR listeleri. */
export const EPDAD_OGRETMEN_1_1_HAM: readonly AltStandartHam[] = [
  {
    kod: "1",
    baslik: "ÖĞRETİMİN PLANLANMASI, UYGULANMASI VE DEĞERLENDİRİLMESİ",
    metin: "ÖĞRETİMİN PLANLANMASI, UYGULANMASI VE DEĞERLENDİRİLMESİ",
    sayfa: 8,
    kanitlar: [],
  },
  {
    kod: "1.1.1",
    baslik:
      "Yetkili kurumlar tarafından belirlenmiş olan standart ve yeterliliklere dayalı bir lisans programının izlenmesi",
    metin:
      "Yetkili kurumlar tarafından belirlenmiş olan standart ve yeterliliklere dayalı bir lisans programının izlenmesi",
    sayfa: 8,
    kanitlar: [
      { metin: "Lisans programı", sayfa: 9 },
      { metin: "Ders bilgi paketi", sayfa: 9 },
    ],
  },
  {
    kod: "1.1.2",
    baslik: "Öğretim programının öğeleri arasında tutarlılık bulunması",
    metin: "Öğretim programının öğeleri arasında tutarlılık bulunması",
    sayfa: 9,
    kanitlar: [
      { metin: "Ders bilgi paketi", sayfa: 10 },
      { metin: "Ders izlenceleri", sayfa: 10 },
      { metin: "Ders kapsamında kullanılan eğitim materyali örnekleri", sayfa: 10 },
      { metin: "Ders kapsamında kullanılan ölçme-değerlendirme araçları", sayfa: 10 },
    ],
  },
  {
    kod: "1.1.3",
    baslik: "Öğretim programının etkili öğretmen eğitimini gerçekleştirecek nitelikte olması",
    metin: "Öğretim programının etkili öğretmen eğitimini gerçekleştirecek nitelikte olması",
    sayfa: 10,
    kanitlar: [
      { metin: "Ders bilgi paketi", sayfa: 11 },
      { metin: "Program ve ders bilgi paketlerinin ilan edildiği web sayfası", sayfa: 11 },
      {
        metin:
          "Lisans program çizelgesi (Derslerin dönemlere dağılımı; derslerin teorik-uygulama saatleri; derslerin alan eğitimi, genel kültür ve öğretmenlik meslek bilgisi dağılımı; alan ve alan dışı seçmeli derslerin çeşidi ve dönemlere göre dağılımı vb.)",
        sayfa: 11,
      },
      { metin: "Program tasarımında paydaş katılımına ilişkin kanıtlar", sayfa: 11 },
      { metin: "Haftalık ders dağılım çizelgesi (Derslerin günlere ve saatlere göre dağılımı)", sayfa: 11 },
      { metin: "Ders izlenceleri", sayfa: 11 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 11 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 11 },
    ],
  },
  {
    kod: "1.2.1",
    baslik: "Öğretim programı ile uygulanması arasında uyum olması",
    metin: "Öğretim programı ile uygulanması arasında uyum olması",
    sayfa: 11,
    kanitlar: [
      { metin: "Ders bilgi paketleri", sayfa: 12 },
      { metin: "Ders izlenceleri", sayfa: 12 },
      { metin: "Ders gözlemleri", sayfa: 12 },
      { metin: "Ders kapsamında kullanılan materyaller", sayfa: 12 },
      { metin: "Ders kapsamında kullanılan ölçme-değerlendirme araçları", sayfa: 12 },
      { metin: "Dönem sonu öğrenci ders değerlendirme anketleri", sayfa: 12 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 12 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 13 },
      {
        metin:
          "Değerlendirilmiş öğrenci çalışmaları (Ödevler, projeler, sınavlar, puanlama anahtarları ve cevap anahtarları vb.)",
        sayfa: 13,
      },
    ],
  },
  {
    kod: "1.2.2",
    baslik: "Öğrencilere, mesleki gelişimlerine katkı sağlayacak şekilde geri bildirim verilmesi",
    metin: "Öğrencilere, mesleki gelişimlerine katkı sağlayacak şekilde geri bildirim verilmesi",
    sayfa: 13,
    kanitlar: [
      { metin: "Ders gözlemleri", sayfa: 13 },
      {
        metin:
          "Değerlendirilmiş öğrenci çalışmaları (Mikro öğretim kayıtları, ödevler, sunular, projeler, sınavlar, puanlama anahtarları ve cevap anahtarları vb.)",
        sayfa: 13,
      },
      { metin: "Öğretim elemanları ve öğrenciler ile görüşmeler", sayfa: 13 },
    ],
  },
  {
    kod: "1.3.1",
    baslik: "Öğrencilerin alan eğitiminde belirlenen yeterliliklere ulaşmış olması",
    metin: "Öğrencilerin alan eğitiminde belirlenen yeterliliklere ulaşmış olması",
    sayfa: 13,
    kanitlar: [
      {
        metin:
          "Öğrencilerin çalışmalarından örnekler (Dersler için yapılan çalışmalar, proje çalışmaları, ödevler, geliştirilen materyaller, öğretmenlik uygulama dosyaları vb.)",
        sayfa: 14,
      },
      { metin: "Ders gözlemleri", sayfa: 14 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 14 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 14 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 14 },
      { metin: "Mezunlar ile görüşmeler", sayfa: 14 },
    ],
  },
  {
    kod: "1.3.2",
    baslik: "Öğrencilerin mesleki becerilerde belirlenen yeterliliklere ulaşmış olması",
    metin: "Öğrencilerin mesleki becerilerde belirlenen yeterliliklere ulaşmış olması",
    sayfa: 14,
    kanitlar: [
      {
        metin:
          "Bu alt standart için kanıt olarak; öğrencilerin çalışmalarından örnekler (Dersler için yapılan çalışmalar, proje çalışmaları, ödevler, geliştirilen materyaller, öğretmenlik uygulama dosyaları vb.), ders gözlemleri, öğretim elemanları, uygulama öğretmenleri, öğrenciler ve mezunlar ile yapılacak görüşmeler önerilmektedir.",
        sayfa: 14,
      },
    ],
  },
  {
    kod: "1.3.3",
    baslik: "Öğrencilerin, öğretmenlik mesleği genel tutum ve değerlerine sahip olması",
    metin: "Öğrencilerin, öğretmenlik mesleği genel tutum ve değerlerine sahip olması",
    sayfa: 15,
    kanitlar: [
      { metin: "Lisans programı", sayfa: 16 },
      { metin: "Ders bilgi paketi", sayfa: 16 },
      {
        metin:
          "Öğrencilerin çalışmalarından örnekler (Dersler için yapılan çalışmalar, proje çalışmaları, ödevler, geliştirilen materyaller, öğretmenlik uygulama dosyası, topluma hizmet uygulamaları kapsamında yapılan etkinlikler, topluluk çalışmaları vb.)",
        sayfa: 16,
      },
      {
        metin:
          "Öğrencilerin katıldıkları etkinlikler (Toplantı, webinar, seminer, gönüllülük faaliyetleri, eğitsel ve alan gezileri vb.)",
        sayfa: 16,
      },
      { metin: "Ders gözlemleri", sayfa: 16 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 16 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 16 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 16 },
      { metin: "Mezunlar ile görüşmeler", sayfa: 16 },
    ],
  },
  { kod: "2", baslik: "ÖĞRETİM ELEMANLARI", metin: "ÖĞRETİM ELEMANLARI", sayfa: 17, kanitlar: [] },
  {
    kod: "2.1.1",
    baslik: "Programı yürüten öğretim elemanlarının nicelik ve nitelik bakımından yeterli olması",
    metin: "Programı yürüten öğretim elemanlarının nicelik ve nitelik bakımından yeterli olması",
    sayfa: 18,
    kanitlar: [
      { metin: "Programda bulunan öğrenci ve öğretim elemanı oranı", sayfa: 19 },
      {
        metin:
          "Öğretim elemanlarının akademik unvanları, kadro durumları ve bulundukları programda çalışma sürelerini gösteren liste",
        sayfa: 19,
      },
      { metin: "Kadrolu ve sözleşmeli tüm öğretim elemanlarının özgeçmişleri", sayfa: 19 },
      { metin: "Son üç yıla ait fakülte eğitim- öğretim faaliyet raporu", sayfa: 19 },
      { metin: "Son üç yıla ait öğretim elemanı ders yüklerini gösteren formlar", sayfa: 19 },
      { metin: "Dekan ile görüşme", sayfa: 19 },
      { metin: "Öğretim elemanları ile görüşme Öğrenciler ile görüşme", sayfa: 19 },
    ],
  },
  {
    kod: "2.1.2",
    baslik: "Öğretim elemanlarına mesleki alanda kendilerini yenileme ve araştırma yapmaları için olanak sağlanması",
    metin: "Öğretim elemanlarına mesleki alanda kendilerini yenileme ve araştırma yapmaları için olanak sağlanması",
    sayfa: 19,
    kanitlar: [
      { metin: "Öğretim elemanlarının mesleki gelişimlerini destekleyen kaynak ve materyaller", sayfa: 20 },
      {
        metin:
          "Öğretim elemanlarının mesleki gelişimine ve araştırmalarına destek veren düzenleme ve uygulamalara ilişkin belgeler",
        sayfa: 20,
      },
      {
        metin: "Son üç yılda destek alan öğretim elemanları ile birlikte desteğin türü ve içeriğini gösteren listeler",
        sayfa: 20,
      },
      { metin: "Dekan, bölüm başkanı, anabilim dalı başkanı ve öğretim elemanları ile görüşmeler", sayfa: 20 },
      {
        metin: "Öğretim elemanlarının mesleki gelişimlerinin desteklendiğine ilişkin yönetim kurulu karar örnekleri",
        sayfa: 20,
      },
    ],
  },
  {
    kod: "2.2.1",
    baslik: "Öğretim elemanlarının tanımlanmış görev ve sorumlulukları yerine getirmesi",
    metin: "Öğretim elemanlarının tanımlanmış görev ve sorumlulukları yerine getirmesi",
    sayfa: 20,
    kanitlar: [
      { metin: "Öğretim elemanlarının özgeçmişleri", sayfa: 21 },
      { metin: "Öğretim elemanlarının etkinlik ve görevlerini gösteren listeler", sayfa: 21 },
      { metin: "Çalışma grupları ve komisyonlarda yer alan öğretim elemanlarının listesi", sayfa: 21 },
      { metin: "Öğretim elemanları, öğrenciler, anabilim dalı/bölüm başkanı ve dekan ile görüşmeler", sayfa: 21 },
      {
        metin:
          "Öğretim elemanlarının, öğrencilerin mesleki tutum ve becerilerinin gelişimine katkıda bulunacak akademik, kültürel, sanatsal, toplumsal vb. etkinlikler yaptıklarını gösteren kanıtlar",
        sayfa: 21,
      },
    ],
  },
  {
    kod: "2.2.2",
    baslik: "Öğretim elemanlarının mesleki gelişimini sürdürmesi",
    metin: "Öğretim elemanlarının mesleki gelişimini sürdürmesi",
    sayfa: 21,
    kanitlar: [
      { metin: "Ders gözlemleri", sayfa: 22 },
      { metin: "Öğrenci ders değerlendirme formları", sayfa: 22 },
      {
        metin:
          "Öğretim elemanlarının son üç yılda aldıkları mesleki gelişim desteğinin türü ve içeriğini gösteren listeler",
        sayfa: 22,
      },
      { metin: "Öğretim elemanlarının özgeçmişleri", sayfa: 22 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 22 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 22 },
    ],
  },
  {
    kod: "2.3.1",
    baslik: "Öğretim elemanlarının nitelikli eğitim-öğretim yapması",
    metin: "Öğretim elemanlarının nitelikli eğitim-öğretim yapması",
    sayfa: 22,
    kanitlar: [
      { metin: "Ders bilgi paketleri", sayfa: 23 },
      { metin: "Ders izlenceleri", sayfa: 23 },
      { metin: "Ders gözlemleri", sayfa: 23 },
      { metin: "Öğretim elemanları ile görüşme", sayfa: 23 },
      { metin: "Öğrenciler ile görüşme", sayfa: 23 },
      { metin: "Öğretim elemanlarının öğretimi destekleyen sınıf dışı etkinliklerinin listesi", sayfa: 23 },
      { metin: "Öğrencilerin başarı durumları", sayfa: 23 },
      { metin: "Öğrenci memnuniyet anketleri", sayfa: 23 },
      { metin: "Öğrenci ders değerlendirme formları", sayfa: 23 },
      { metin: "Öğrenci öz-değerlendirme formları", sayfa: 23 },
    ],
  },
  {
    kod: "2.3.2",
    baslik: "Öğretim elemanlarının nitelikli bilimsel araştırmalar, projeler ve yayınlar yapması",
    metin: "Öğretim elemanlarının nitelikli bilimsel araştırmalar, projeler ve yayınlar yapması",
    sayfa: 23,
    kanitlar: [
      { metin: "Ders gözlemleri", sayfa: 24 },
      { metin: "Öğrenci ders değerlendirme formları", sayfa: 24 },
      {
        metin:
          "Öğretim elemanlarının son üç yılda aldıkları mesleki gelişim desteğinin türü ve içeriğini gösteren listeler",
        sayfa: 24,
      },
      { metin: "Öğretim elemanlarının özgeçmişleri", sayfa: 24 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 24 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 24 },
    ],
  },
  {
    kod: "2.3.3",
    baslik: "Öğretim elemanlarının toplum yararına çalışmalar yapması",
    metin: "Öğretim elemanlarının toplum yararına çalışmalar yapması",
    sayfa: 24,
    kanitlar: [
      {
        metin:
          "Topluma hizmet çalışmalarına ilişkin belgeler (Görevlendirmeler, katılım belgeleri, afişler, program vb.)",
        sayfa: 25,
      },
      { metin: "Öğretim elemanlarının özgeçmişleri", sayfa: 25 },
      { metin: "Paydaşlar ile görüşmeler", sayfa: 25 },
    ],
  },
  { kod: "3", baslik: "ÖĞRENCİLER", metin: "ÖĞRENCİLER", sayfa: 26, kanitlar: [] },
  {
    kod: "3.1.1",
    baslik: "Öğrencilerin program için gerekli niteliklere sahip olması",
    metin: "Öğrencilerin program için gerekli niteliklere sahip olması",
    sayfa: 26,
    kanitlar: [
      {
        metin:
          "Son üç yılda programa yerleşen öğrenci sayıları, giriş puanları, yüzdelik dilimleri ve programı tercih etme sıraları",
        sayfa: 26,
      },
      { metin: "Programın ülke genelindeki aynı programlar arasındaki sıralaması", sayfa: 26 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 26 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 26 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 26 },
      { metin: "Öğrenci memnuniyet anketleri", sayfa: 26 },
    ],
  },
  {
    kod: "3.2.1",
    baslik:
      "Öğrencilerin; derslere ve kişisel ve mesleki gelişimlerini destekleyecek etkinliklere aktif katılım göstermesi",
    metin:
      "Öğrencilerin; derslere ve kişisel ve mesleki gelişimlerini destekleyecek etkinliklere aktif katılım göstermesi",
    sayfa: 27,
    kanitlar: [
      { metin: "Öğrencilerin devam durumlarını gösteren belgeler", sayfa: 28 },
      { metin: "Ders gözlemleri", sayfa: 28 },
      {
        metin: "Öğrencilerin kişisel ve mesleki gelişimlerini desteklemeye yönelik çalışmalara ilişkin belgeler",
        sayfa: 28,
      },
      {
        metin:
          "Öğrencilere verilen akademik danışmanlık ile rehberlik ve psikolojik danışma hizmetlerine ilişkin belgeler",
        sayfa: 28,
      },
      {
        metin:
          "Özel gereksinimli öğrencilerin derslere aktif katımlarını desteklemeye yönelik öğrenme kaynaklarının (öğretim materyali, yazılım, donanım, ölçme-değerlendirme araçları vb.) listesi",
        sayfa: 28,
      },
      { metin: "Öğrenciler tarafından son bir yılda yapılmış etkinliklerin listesi", sayfa: 28 },
      { metin: "Öğrenci topluluklarının listesi ve çalışmalarına ilişkin belgeler", sayfa: 28 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 28 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 28 },
      { metin: "Öğrenci memnuniyet anketleri", sayfa: 28 },
    ],
  },
  {
    kod: "3.3.1",
    baslik: "Mezunların kariyer süreçlerinde izlenmesi",
    metin: "Mezunların kariyer süreçlerinde izlenmesi",
    sayfa: 28,
    kanitlar: [
      { metin: "Öğrencilerin programı tamamlama süresi ve oranlarını gösteren belgeler", sayfa: 29 },
      {
        metin:
          "Mezun izleme çalışmaları (İstihdam alanları, ulusal sınavlardaki başarı oranları, kariyer süreçlerindeki başarıları, lisansüstü eğitime devam etme oranları, mezun izleme raporları vb.)",
        sayfa: 29,
      },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 29 },
      { metin: "Paydaşlar (mezun, işveren vb.) ile görüşmeler", sayfa: 29 },
    ],
  },
  { kod: "4", baslik: "FAKÜLTE-OKUL İŞBİRLİĞİ", metin: "FAKÜLTE-OKUL İŞBİRLİĞİ", sayfa: 29, kanitlar: [] },
  {
    kod: "4.1.1",
    baslik: "Uygulama okullarındaki/kurumlarındaki çalışmalara ilişkin yönetsel düzenleme ve belgelerin bulunması",
    metin: "Uygulama okullarındaki/kurumlarındaki çalışmalara ilişkin yönetsel düzenleme ve belgelerin bulunması",
    sayfa: 30,
    kanitlar: [
      { metin: "Fakülte-okul iş birliği kapsamında hazırlanan yönerge ve kılavuzlar", sayfa: 31 },
      { metin: "Fakülte-okul iş birliği ile ilgili resmi yazışmalar", sayfa: 31 },
      {
        metin:
          "Uygulama öğrencilerinin; uygulama okullarına, uygulama öğretim elemanlarına ve uygulama öğretmenlerine göre dağılım listesi",
        sayfa: 31,
      },
      { metin: "Ders bilgi paketi", sayfa: 31 },
      { metin: "Ders izlencesi", sayfa: 31 },
      { metin: "Uygulama koordinatörleri ile görüşmeler", sayfa: 31 },
      { metin: "Uygulama öğretim elemanları ile görüşmeler", sayfa: 31 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 31 },
      { metin: "Uygulama öğrencileri ile görüşmeler", sayfa: 31 },
      {
        metin:
          "Uygulama öğretmenlerine yönelik düzenlenen seminer ve diğer etkinliklere ilişkin belgeler Fakültenin ve uygulama okullarının uygulama süreci ile ilgili görüşlerini paylaştığı toplantı tutanakları",
        sayfa: 31,
      },
    ],
  },
  {
    kod: "4.2.1",
    baslik:
      "Fakülte, İl Millî Eğitim Müdürlüğü, uygulama koordinatörleri, uygulama öğretim elemanları, uygulama öğretmenleri ve uygulama öğrencileri arasında yeterli iş birliğinin olması",
    metin:
      "Fakülte, İl Millî Eğitim Müdürlüğü, uygulama koordinatörleri, uygulama öğretim elemanları, uygulama öğretmenleri ve uygulama öğrencileri arasında yeterli iş birliğinin olması",
    sayfa: 31,
    kanitlar: [
      { metin: "Fakülte, İl Millî Eğitim Müdürlüğü ve uygulama okulları arasındaki yazışmalar", sayfa: 33 },
      { metin: "Fakülte-okul iş birliği ile ilgili yapılan çalışmaların tutanakları", sayfa: 33 },
      { metin: "Uygulama değerlendirme formları", sayfa: 33 },
      {
        metin: "Uygulama öğrencilerinin izlenmesi ve değerlendirilmesi amacıyla kullanılan yöntem ve araçlar",
        sayfa: 33,
      },
      { metin: "Uygulama öğrencilerinin uygulama okulunda gözlenmesi", sayfa: 33 },
      { metin: "Uygulama öğretmenlerine yönelik düzenlenen seminer ve diğer etkinliklere ilişkin belgeler", sayfa: 33 },
      { metin: "Uygulama koordinatörleri ile görüşmeler", sayfa: 33 },
      { metin: "Uygulama öğretim elemanları ile görüşmeler", sayfa: 33 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 33 },
      { metin: "Uygulama öğrencileri ile görüşmeler", sayfa: 33 },
    ],
  },
  {
    kod: "4.2.2",
    baslik: "Uygulama okullarında/kurumlarında, uygulama öğrencilerine uygun ortam sağlanması",
    metin: "Uygulama okullarında/kurumlarında, uygulama öğrencilerine uygun ortam sağlanması",
    sayfa: 33,
    kanitlar: [
      {
        metin: "Gözlemlerle ilgili olarak uygulama öğrencilerine verilen geribildirimlere ilişkin belgeler",
        sayfa: 34,
      },
      { metin: "Öğretmenlik uygulaması dosyasından örnekler", sayfa: 34 },
      { metin: "Fakülte, bölüm ve program uygulama koordinatörlerinin kanıt dosyaları", sayfa: 34 },
      { metin: "Uygulama okulunda alt yapıya ilişkin gözlemler", sayfa: 34 },
      { metin: "Uygulama koordinatörleri ile görüşmeler", sayfa: 34 },
      { metin: "Uygulama öğretim elemanları ile görüşmeler", sayfa: 34 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 34 },
      { metin: "Uygulama öğrencileri ile görüşmeler", sayfa: 34 },
    ],
  },
  {
    kod: "4.3.1",
    baslik: "Uygulama öğrencilerinin belirlenen yeterliklere ulaşmış olması",
    metin: "Uygulama öğrencilerinin belirlenen yeterliklere ulaşmış olması",
    sayfa: 34,
    kanitlar: [
      { metin: "Uygulama öğrencilerinin değerlendirilmiş örnek uygulama dosyaları", sayfa: 35 },
      { metin: "Öğretmenlik uygulaması gözlem ve değerlendirme formları", sayfa: 35 },
      {
        metin:
          "Öğretim elemanı ve uygulama öğretmeninin Öğretmenlik Uygulaması Değerlendirme Formu üzerinde verdiği notlar ve yaptığı açıklamalar",
        sayfa: 35,
      },
      { metin: "Uygulama okulunda yapılan ders gözlemleri", sayfa: 35 },
      { metin: "Uygulama koordinatörleri ile görüşmeler", sayfa: 35 },
      { metin: "Uygulama öğretim elemanları ile görüşmeler", sayfa: 35 },
      { metin: "Uygulama öğretmenleri ile görüşmeler", sayfa: 35 },
      { metin: "Uygulama öğrencileri ile görüşmeler", sayfa: 35 },
    ],
  },
  {
    kod: "5",
    baslik: "TESİSLER, ÖĞRENME ORTAMLARI VE KAYNAKLARI",
    metin: "TESİSLER, ÖĞRENME ORTAMLARI VE KAYNAKLARI",
    sayfa: 36,
    kanitlar: [],
  },
  {
    kod: "5.1.1",
    baslik: "Eğitim programının etkili bir şekilde yürütebilmesi için gerekli tesis ve donanıma sahip olma",
    metin: "Eğitim programının etkili bir şekilde yürütebilmesi için gerekli tesis ve donanıma sahip olma",
    sayfa: 36,
    kanitlar: [
      { metin: "Tesislerin ve donanımlarının niceliksel ve niteliksel yeterliliği", sayfa: 38 },
      { metin: "Tesislere yapılan ziyaretler", sayfa: 38 },
      { metin: "Tesisler ve donanımdan sorumlu öğretim elemanlarının ve teknik personelin listesi", sayfa: 38 },
      { metin: "Bilişim alt yapısı ve erişim durumuna ilişkin belgeler", sayfa: 38 },
      { metin: "Tesislerde güvenlikle ilgili yönergeler", sayfa: 38 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 38 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 38 },
    ],
  },
  {
    kod: "5.1.2",
    baslik: "Üniversitede/ fakültede eğitim programının yürütülebilmesi için yeterli öğrenme kaynaklarının bulunması",
    metin: "Üniversitede/ fakültede eğitim programının yürütülebilmesi için yeterli öğrenme kaynaklarının bulunması",
    sayfa: 38,
    kanitlar: [
      { metin: "Kütüphane ziyareti", sayfa: 39 },
      { metin: "Kütüphane yönetiminin, koleksiyon durumuna ilişkin raporu", sayfa: 39 },
      {
        metin:
          "Kütüphanedeki program ile ilgili kitapların, süreli yayınların, veri tabanlarının ve diğer kaynakların listesi",
        sayfa: 39,
      },
      { metin: "Son üç yılda edinilen kitap ve süreli yayın sayısı", sayfa: 39 },
      { metin: "Eğitim fakültesince son üç yılda talep edilen ve karşılanan kitap ve süreli yayın listesi", sayfa: 39 },
      { metin: "Kütüphanenin açık olduğu saatleri gösteren çizelge", sayfa: 39 },
      { metin: "Kütüphane kullanımı konusunda verilen eğitimlere ilişkin dokümanlar", sayfa: 39 },
      { metin: "Kütüphane yöneticileri ile görüşmeler", sayfa: 39 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 39 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 39 },
    ],
  },
  {
    kod: "5.1.3",
    baslik: "Dersliklerin, eğitim programının uygulanması için yeterli kapasite ve niteliğe sahip olması",
    metin: "Dersliklerin, eğitim programının uygulanması için yeterli kapasite ve niteliğe sahip olması",
    sayfa: 39,
    kanitlar: [
      { metin: "Dersliklerin sayısı", sayfa: 40 },
      { metin: "Dersliklerin büyüklüğü", sayfa: 40 },
      { metin: "Dersliklerin kapasitesi ve derslik başına düşen öğrenci sayısı", sayfa: 40 },
      { metin: "Dersliklerin haftalık kullanım durumları", sayfa: 40 },
      { metin: "Dersliklere yapılan ziyaretler", sayfa: 40 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 40 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 40 },
      { metin: "Öğrenci memnuniyet anketleri", sayfa: 40 },
    ],
  },
  {
    kod: "5.1.4",
    baslik: "Öğretim elemanlarının çalışmalarını yapacakları ofis, donanım ve teknik desteğe sahip olması",
    metin: "Öğretim elemanlarının çalışmalarını yapacakları ofis, donanım ve teknik desteğe sahip olması",
    sayfa: 40,
    kanitlar: [
      { metin: "Öğretim elemanlarının ve çalışma odalarının listesi", sayfa: 42 },
      { metin: "Öğretim elemanlarının çalışma odalarına yapılan ziyaretler", sayfa: 42 },
      { metin: "Öğretim elemanlarının çalışma odalarına tahsis edilen donanımlar", sayfa: 42 },
      { metin: "Bilgisayar kapasitesi, sahip olunan yazılımlar ve öğretim materyalleri", sayfa: 42 },
      { metin: "Programa destek veren idari ve teknik personelin listesi", sayfa: 42 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 42 },
    ],
  },
  {
    kod: "5.1.5",
    baslik: "Tesis, öğrenme ortam ve kaynaklarının özel gereksinimli bireylere uygun olması",
    metin: "Tesis, öğrenme ortam ve kaynaklarının özel gereksinimli bireylere uygun olması",
    sayfa: 42,
    kanitlar: [
      { metin: "Tesis ve öğrenme ortamlarına ziyaretler", sayfa: 42 },
      {
        metin: "Özel gereksinimli bireylerle ilgili düzenlemelerde bulunan koordinatör/yöneticiler ile görüşmeler",
        sayfa: 42,
      },
      { metin: "Özel gereksinimli öğrenciler ile görüşmeler", sayfa: 42 },
    ],
  },
  {
    kod: "5.2.1",
    baslik: "Programın yürütüldüğü derslik, tesis ve donanımların etkin biçimde kullanılması",
    metin: "Programın yürütüldüğü derslik, tesis ve donanımların etkin biçimde kullanılması",
    sayfa: 43,
    kanitlar: [
      {
        metin: "Eğitim- öğretim amaçlı kullanılan derslik, laboratuvar, atölye vb. mekânların kullanım çizelgeleri",
        sayfa: 44,
      },
      { metin: "Tesislere yapılan ziyaretler", sayfa: 44 },
      {
        metin: "Öğrencilerin görüşlerini belirtmeleri için sunulan araçlar (anket, dilek-şikâyet kutusu vb.)",
        sayfa: 44,
      },
      {
        metin:
          "Öğrencilerin sosyal ve kültürel etkinlikler için üniversite ve fakülte tesislerinden yararlanma durumunu gösteren belgeler",
        sayfa: 44,
      },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 44 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 44 },
    ],
  },
  {
    kod: "5.2.2",
    baslik:
      "Kütüphane ve diğer öğrenme kaynaklarının; öğrenciler ve öğretim elemanları tarafından, amacına uygun ve etkili şekilde kullanılması",
    metin:
      "Kütüphane ve diğer öğrenme kaynaklarının; öğrenciler ve öğretim elemanları tarafından, amacına uygun ve etkili şekilde kullanılması",
    sayfa: 44,
    kanitlar: [
      { metin: "Kütüphane yöneticileri ile görüşmeler", sayfa: 45 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 45 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 45 },
      { metin: "Kütüphane ziyareti", sayfa: 45 },
      {
        metin:
          "Kütüphaneden yararlanma sıklığını gösteren belgeler (kullanıcı kayıtları, dönemlik/yıllık kullanıcı istatistikleri vb.)",
        sayfa: 45,
      },
    ],
  },
  {
    kod: "5.3.1",
    baslik: "Derslik, tesis ve kütüphane kaynaklarının etkili şekilde yönetilmesi",
    metin: "Derslik, tesis ve kütüphane kaynaklarının etkili şekilde yönetilmesi",
    sayfa: 45,
    kanitlar: [
      {
        metin:
          "Derslik, tesis ve kütüphane kaynaklarının kullanımını izleme-değerlendirme-iyileştirme çalışmalarına ilişkin belgeler",
        sayfa: 45,
      },
      {
        metin:
          "Bilişim alt yapısı ve yararlanma durumunu izleme-değerlendirme-iyileştirme çalışmalarına ilişkin belgeler",
        sayfa: 45,
      },
      { metin: "Kütüphane yöneticileri ile görüşmeler", sayfa: 45 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 45 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 45 },
    ],
  },
  { kod: "6", baslik: "YÖNETİM", metin: "YÖNETİM", sayfa: 46, kanitlar: [] },
  {
    kod: "6.1.1",
    baslik: "Fakültenin öğretmen eğitimi konusunda bir vizyon ve misyona sahip olması",
    metin: "Fakültenin öğretmen eğitimi konusunda bir vizyon ve misyona sahip olması",
    sayfa: 46,
    kanitlar: [
      { metin: "Vizyon ve misyonun geliştirilme sürecine ilişkin belgeler", sayfa: 47 },
      { metin: "Lisans programının, fakültenin vizyon ve misyonuyla tutarlılığını gösteren belgeler", sayfa: 47 },
      { metin: "Fakülte yönetimi ile görüşme", sayfa: 47 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 47 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 47 },
      { metin: "Üniversitenin/fakültenin stratejik planı", sayfa: 47 },
    ],
  },
  {
    kod: "6.1.2",
    baslik: "Fakültenin vizyon ve misyonuna uygun bir yönetim yapı ve anlayışına sahip olması",
    metin: "Fakültenin vizyon ve misyonuna uygun bir yönetim yapı ve anlayışına sahip olması",
    sayfa: 47,
    kanitlar: [
      {
        metin:
          "Fakülte Kurulu ve Yönetim Kurulunun oluşum sürecindeki belgeler, kurul üyelerinin listesi ve bölümlere göre dağılımı",
        sayfa: 48,
      },
      { metin: "Çalışma grupları ve komisyonların üye listeleri, görevleri, kararları vb.", sayfa: 48 },
      { metin: "Fakülte yönetimi ile görüşme", sayfa: 48 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 48 },
      { metin: "Öğrenciler ile görüşmeler", sayfa: 48 },
      { metin: "Fakülte web sayfası ve sosyal medya hesapları", sayfa: 48 },
    ],
  },
  {
    kod: "6.2.1",
    baslik: "Yönetim birimlerinin işlevlerini etkin bir biçimde yerine getirmesi",
    metin: "Yönetim birimlerinin işlevlerini etkin bir biçimde yerine getirmesi",
    sayfa: 48,
    kanitlar: [
      { metin: "Fakülte ve Yönetim Kurulu karar örnekleri", sayfa: 49 },
      { metin: "Bölüm ve anabilim dalı kurulu karar örnekleri", sayfa: 49 },
      { metin: "Koordinatörlük, komisyon vb. çalışma gruplarının toplantı tutanak örnekleri", sayfa: 49 },
      { metin: "Dekan ile görüşme", sayfa: 49 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 49 },
      { metin: "Arşiv ziyareti", sayfa: 49 },
      { metin: "Arşiv ve kayıt sistemlerine ilişkin belgeler Üniversitenin/fakültenin stratejik planı", sayfa: 49 },
    ],
  },
  {
    kod: "6.2.2",
    baslik: "Fakülte yönetiminin, öğretmen eğitiminin gelişimini desteklemesi",
    metin: "Fakülte yönetiminin, öğretmen eğitiminin gelişimini desteklemesi",
    sayfa: 49,
    kanitlar: [
      {
        metin: "Fakültenin, ulusal ve uluslararası düzeyde öğretmen eğitimine katkılarına ilişkin belgeler",
        sayfa: 50,
      },
      { metin: "Araştırma raporları ve proje listeleri", sayfa: 50 },
      { metin: "Kongre, panel, konferans, çalıştay vb. bilimsel çalışmalara ilişkin belgeler", sayfa: 50 },
      { metin: "Dekan ile görüşme", sayfa: 50 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 50 },
    ],
  },
  {
    kod: "6.2.3",
    baslik: "Fakültenin, ulusal ve uluslararası kurum ve kuruluşlarla iş birliği içinde olması",
    metin: "Fakültenin, ulusal ve uluslararası kurum ve kuruluşlarla iş birliği içinde olması",
    sayfa: 50,
    kanitlar: [
      {
        metin:
          "Tamamlanmış veya yürütülmekte olan ulusal/uluslararası ortak projeleri ve araştırmaları gösteren listeler",
        sayfa: 51,
      },
      { metin: "Öğrenci ve öğretim elemanlarının değişim programlarına katılımını gösteren listeler", sayfa: 51 },
      { metin: "Ulusal ve uluslararası kurum ve kuruluşlarla yapılan anlaşma ve iş birliği protokolleri", sayfa: 51 },
    ],
  },
  {
    kod: "6.3.1",
    baslik: "Yönetimin gerekli kaynakları sağlaması ve etkili kullanması",
    metin: "Yönetimin gerekli kaynakları sağlaması ve etkili kullanması",
    sayfa: 51,
    kanitlar: [
      { metin: "İlgili programdan son üç yılda ayrılan öğretim elemanı sayısı", sayfa: 53 },
      { metin: "Fakültenin bölüm ve birimlerinde çalışan sayısı ve ihtiyaçlarına ilişkin belgeler", sayfa: 53 },
      { metin: "Yönetim, idari ve destek personelin birimlere göre dağılımı", sayfa: 53 },
      { metin: "Fakültenin gelir kaynakları ve sağlanan gelirlere ilişkin belgeler", sayfa: 53 },
      { metin: "Gelirlerin dağılımı ve kullanımına ilişkin belgeler", sayfa: 53 },
      { metin: "BİT kaynaklarının sağlanmasına ilişkin belgeler", sayfa: 53 },
      { metin: "Dekan ile görüşme", sayfa: 53 },
    ],
  },
  { kod: "7", baslik: "KALİTE GÜVENCESİ", metin: "KALİTE GÜVENCESİ", sayfa: 53, kanitlar: [] },
  {
    kod: "7.1.1",
    baslik: "Üniversitenin/fakültenin kalite güvencesi politikasının ve tanımlanmış süreçlerinin olması",
    metin: "Üniversitenin/fakültenin kalite güvencesi politikasının ve tanımlanmış süreçlerinin olması",
    sayfa: 54,
    kanitlar: [
      { metin: "Üniversitenin ve/veya fakültenin kalite güvencesi politika belgesi", sayfa: 55 },
      { metin: "Ders değerlendirme formları", sayfa: 55 },
      { metin: "Öğretim elemanı performans değerlendirme formları", sayfa: 55 },
      { metin: "Öğretim elemanlarının seçimi, yükseltilmesi ve atanmasına ilişkin ölçütler", sayfa: 55 },
      { metin: "Öğrencilerin ders başarılarına ilişkin veriler", sayfa: 55 },
      { metin: "Öğretim elemanı yıllık faaliyet raporları", sayfa: 55 },
      { metin: "Kalite ve akreditasyonla ilgili komisyonlar ve etkinlikleri", sayfa: 55 },
      {
        metin: "Üniversitenin/fakültenin ulusal ve uluslararası sıralamalardaki yerine ilişkin istatistikler",
        sayfa: 55,
      },
    ],
  },
  {
    kod: "7.2.1",
    baslik: "Fakültenin, bir bütün olarak geliştirilmesini esas alan bir değerlendirme sisteminin işletilmesi",
    metin: "Fakültenin, bir bütün olarak geliştirilmesini esas alan bir değerlendirme sisteminin işletilmesi",
    sayfa: 55,
    kanitlar: [
      { metin: "Fakülte kalite güvencesi dokümanları", sayfa: 56 },
      { metin: "Fakülte ve Yönetim Kurulu kararları", sayfa: 56 },
      { metin: "Bölüm ve anabilim dalı kurulu karar örnekleri", sayfa: 56 },
      { metin: "Akademik ve idari işleyişe yönelik veri tabanları", sayfa: 56 },
      { metin: "Öğretim programlarındaki değişiklikler ve gerekçeleri", sayfa: 56 },
      {
        metin: "Üniversitenin/fakültenin ulusal ve uluslararası sıralamalardaki yerine ilişkin istatistikler",
        sayfa: 56,
      },
      { metin: "Koordinatörlük, komisyon vb. çalışma gruplarının toplantı tutanak örnekleri", sayfa: 56 },
      { metin: "Dekan ile görüşme", sayfa: 56 },
      { metin: "Öğretim elemanları ile görüşmeler", sayfa: 56 },
    ],
  },
  {
    kod: "7.3.1",
    baslik: "Mezunların izlenmesinden elde edilen bulguların, kalite güvence sistemine yansıtılması",
    metin: "Mezunların izlenmesinden elde edilen bulguların, kalite güvence sistemine yansıtılması",
    sayfa: 56,
    kanitlar: [
      { metin: "Mezun izleme çalışmalarına ilişkin rapor", sayfa: 57 },
      { metin: "Mezunların KPSS sonuçları", sayfa: 57 },
      { metin: "Lisansüstü programlara devam eden mezun verileri", sayfa: 57 },
      { metin: "Mezunları istihdam eden okul/kurum yöneticileri ile görüşmeler", sayfa: 57 },
      { metin: "Mezunların meslek içi başarıları ve ödülleri", sayfa: 57 },
    ],
  },
];
