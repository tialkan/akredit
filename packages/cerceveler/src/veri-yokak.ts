// ÜRETİLDİ: scripts/yokak-uret.ts. Elle değiştirmeyin.
// Metinler aşağıdaki resmî belgelerden çıkarılmıştır (CLAUDE.md ilke 6).
// yokak-degerlendirme-olcutleri-3.1-2026-10-27.pdf sha256 cecefe54ded832d3739e8728bd06b0dc396ea9a6564b9b2cd9a150cf72bb303f
// yokak-degerlendirme-programlari-kilavuzu-3.3-2026-10-27.pdf sha256 cfa3de9bf3c2ed456502ef6a17378df7ecf8a4ddf78ceafb0773a4aefd8f0dfa

import type { AltOlcutHam, UstOlcutHam } from "./yokak-anahtar.ts";

export const YOKAK_OLCUTLER_3_1_HAM: readonly UstOlcutHam[] = [
  {
    kod: "A",
    baslik: "LİDERLİK, YÖNETİŞİM ve KALİTE",
    metin: "",
    sayfa: 2,
  },
  {
    kod: "A.1",
    baslik: "Liderlik ve Kalite",
    metin:
      "Kurum, kurumsal dönüşümünü sağlayacak yönetişim modeline sahip olmalı, liderlik yaklaşımları uygulamalı, iç kalite güvence mekanizmalarını oluşturmalı ve kalite güvence kültürünü içselleştirmelidir.",
    sayfa: 2,
  },
  {
    kod: "A.2",
    baslik: "Misyon ve Stratejik Amaçlar",
    metin:
      "Kurum; vizyon, misyon ve amacını gerçekleştirmek üzere politikaları doğrultusunda oluşturduğu stratejik amaçlarını ve hedeflerini planlayarak uygulamalı, performans yönetimi kapsamında sonuçlarını izleyerek değerlendirmeli ve kamuoyuyla paylaşmalıdır.",
    sayfa: 2,
  },
  {
    kod: "A.3",
    baslik: "Yönetim Sistemleri",
    metin:
      "Kurum, stratejik hedeflerine ulaşmayı nitelik ve nicelik olarak güvence altına almak amacıyla mali, beşerî ve bilgi kaynakları ile süreçlerini yönetmek üzere bir sisteme sahip olmalıdır.",
    sayfa: 2,
  },
  {
    kod: "A.4",
    baslik: "Paydaş Katılımı",
    metin:
      "Kurum, iç ve dış paydaşlarının stratejik kararlara ve süreçlere katılımını sağlamak üzere geri bildirimlerini almak, yanıtlamak ve kararlarında kullanmak için gerekli sistemleri oluşturmalı ve yönetmelidir.",
    sayfa: 2,
  },
  {
    kod: "A.5",
    baslik: "Uluslararasılaşma",
    metin:
      "Kurum, uluslararasılaşma stratejisi ve hedefleri doğrultusunda süreçlerini yönetmeli, organizasyonel yapılanmasını oluşturmalı ve sonuçlarını periyodik olarak izleyerek değerlendirmelidir.",
    sayfa: 2,
  },
  {
    kod: "B",
    baslik: "EĞİTİM VE ÖĞRETİM",
    metin: "",
    sayfa: 2,
  },
  {
    kod: "B.1",
    baslik: "Program Tasarımı, Değerlendirmesi ve Güncellenmesi",
    metin:
      "Kurum, öğretim programlarını Türkiye Yükseköğretim Yeterlilikleri Çerçevesi ile uyumlu; öğretim amaçlarına ve öğrenme çıktılarına uygun olarak tasarlamalı, öğrencilerin ve toplumun ihtiyaçlarına cevap verdiğinden emin olmak için periyodik olarak değerlendirmeli ve güncellemelidir.",
    sayfa: 2,
  },
  {
    kod: "B.2",
    baslik: "Programların Yürütülmesi (Öğrenci Merkezli Öğrenme Öğretme ve Değerlendirme)",
    metin:
      "Kurum, hedeflediği nitelikli mezun yeterliliklerine ulaşmak amacıyla öğrenci merkezli ve yetkinlik temelli öğretim, ölçme ve değerlendirme yöntemlerini uygulamalıdır. Kurum, öğrenci kabulleri, diploma, derece ve diğer yeterliliklerin tanınması ve sertifikalandırılmasına yönelik açık kriterler belirlemeli; önceden tanımlanmış ve ilan edilmiş kuralları tutarlı şekilde uygulamalıdır.",
    sayfa: 3,
  },
  {
    kod: "B.3",
    baslik: "Öğrenme Kaynakları ve Akademik Destek Hizmetleri",
    metin:
      "Kurum, hedeflediği nitelikli mezun yeterliliklerine ulaşmak ve eğitim- öğretim faaliyetlerini yürütmek için uygun altyapıya, kaynaklara ve ortamlara sahip olmalı ve öğrenme olanaklarının tüm öğrenciler için yeterli ve erişilebilir olmasını güvence altına almalıdır. Kurum öğrencilerin akademik gelişimi ve kariyer planlamasına yönelik destek hizmetleri sağlamalıdır.",
    sayfa: 3,
  },
  {
    kod: "B.4",
    baslik: "Öğretim Kadrosu",
    metin:
      "Kurum, öğretim elemanlarının işe alınması, atanması, yükseltilmesi ve ders görevlendirmesi ile ilgili tüm süreçlerde adil ve açık olmalıdır. Hedeflenen nitelikli mezun yeterliliklerine ulaşmak amacıyla, öğretim elemanlarının eğitim-öğretim yetkinliklerini sürekli geliştirmek için olanaklar sunmalıdır.",
    sayfa: 3,
  },
  {
    kod: "C",
    baslik: "ARAŞTIRMA VE GELİŞTİRME",
    metin:
      "(Sanat alanları bulunan yükseköğretim kurumlarında Araştırma ve Geliştirme başlığı altında sanat faaliyetleri de bu kapsamda değerlendirilmelidir.)",
    sayfa: 3,
  },
  {
    kod: "C.1",
    baslik: "Araştırma Süreçlerinin Yönetimi ve Araştırma Kaynakları",
    metin:
      "Kurum, araştırma faaliyetlerini stratejik planı çerçevesinde belirlenen akademik öncelikleri ile yerel, bölgesel ve ulusal kalkınma hedefleriyle uyumlu, değer üretebilen ve toplumsal faydaya dönüştürülebilen biçimde yönetmelidir. Bu faaliyetler için uygun fiziki altyapı ve mali kaynaklar oluşturmalı ve bunların etkin şekilde kullanımını sağlamalıdır.",
    sayfa: 3,
  },
  {
    kod: "C.2",
    baslik: "Araştırma Yetkinliği, İş birlikleri ve Destekler",
    metin:
      "Kurum, öğretim elemanları ve araştırmacıların araştırma yetkinliğini sürdürmek ve iyileştirmek için olanaklar (eğitim, iş birlikleri, destekler vb.) sunmalıdır.",
    sayfa: 3,
  },
  {
    kod: "C.3",
    baslik: "Araştırma Performansı",
    metin:
      "Kurum, araştırma faaliyetlerini verilere dayalı ve periyodik olarak ölçmeli, değerlendirmeli ve sonuçlarını yayımlamalıdır. Elde edilen bulgular, kurumun araştırma ve geliştirme performansının periyodik olarak gözden geçirilmesi ve sürekli iyileştirilmesi için kullanılmalıdır.",
    sayfa: 3,
  },
  {
    kod: "D",
    baslik: "TOPLUMSAL KATKI",
    metin: "",
    sayfa: 4,
  },
  {
    kod: "D.1",
    baslik: "Toplumsal Katkı Süreçlerinin Yönetimi ve Toplumsal Katkı Kaynakları",
    metin:
      "Kurum, toplumsal katkı faaliyetlerini stratejik amaçları ve hedefleri doğrultusunda yönetmelidir. Bu faaliyetler için uygun fiziki altyapı ve mali kaynaklar oluşturmalı ve bunların etkin şekilde kullanımını sağlamalıdır.",
    sayfa: 4,
  },
  {
    kod: "D.2",
    baslik: "Toplumsal Katkı Performansı",
    metin:
      "Kurum, toplumsal katkı stratejisi ve hedefleri doğrultusunda yürüttüğü faaliyetleri periyodik olarak izlemeli ve sürekli iyileştirmelidir.",
    sayfa: 4,
  },
];

export const YOKAK_ANAHTAR_3_3_HAM: readonly AltOlcutHam[] = [
  {
    kod: "A.1.1",
    baslik: "Yönetişim modeli ve idari yapı",
    metin:
      "Kurumdaki yönetişim modeli ve idari yapı (yasal düzenlemeler çerçevesinde kurumsal yaklaşım, gelenekler, tercihler); karar verme mekanizmaları, kontrol ve denge unsurları; kurulların çok sesliliği ve bağımsız hareket kabiliyeti, paydaşların temsil edilmesi; öngörülen yönetişim modeli ile gerçekleşmenin karşılaştırılması, modelin kurumsallığı ve sürekliliği yerleşmiş ve benimsenmiştir. Vakıf yükseköğretim kurumlarında mütevelli heyet, devlet yükseköğretim kurumlarında rektör yardımcıları ve danışmanlarının (üst yönetimin) çalışma tarzı, yetki ve sorumlulukları, kurumun akademik camiasıyla iletişimi; üst yönetim tarzının hedeflenen kurum kimliği ile uyumu yerleşmiş ve benimsenmiştir. Organizasyon şeması ve bağlı olma/rapor verme ilişkileri; görev tanımları, iş akış süreçleri vardır ve gerçeği yansıtmaktadır; ayrıca bunlar yayımlanmış ve işleyişin paydaşlarca bilinirliği sağlanmıştır.",
    duzeyler: [
      "Kurumun misyonuyla uyumlu ve stratejik hedeflerini gerçekleştirmeyi sağlayacak bir yönetişim modeli ve organizasyonel yapılanması bulunmamaktadır.",
      "Kurumun misyon ve stratejik hedeflerine ulaşmasını güvence altına alan ve süreçleriyle uyumlu yönetişim modeli ve idari yapılanması belirlenmiştir.",
      "Kurumun yönetişim modeli ve organizasyonel yapılanması birim ve alanların genelini kapsayacak şekilde faaliyet göstermektedir.",
      "Kurumun yönetişim ve organizasyonel yapılanmasına ilişkin uygulamaları izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Yönetişim modeli ve organizasyon şeması",
      "Kurumun yönetişim ve idari alanlarla ilgili politikasını ve stratejik amaçlarını uyguladığına dair uygulamalar/kanıtlar",
      "Yönetişim ve organizasyonel yapılanma uygulamalarına ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 38,
  },
  {
    kod: "A.1.2",
    baslik: "Liderlik",
    metin:
      "Kurumda rektörün ve süreç liderlerinin yükseköğretim ekosistemindeki değişim, belirsizlik ve karmaşıklığı dikkate alan bir kalite güvencesi sistemi ve kültürü oluşturma konusunda sahipliği ve motivasyonu yüksektir. Bu süreçler çevik bir liderlik yaklaşımıyla yönetilmektedir. Birimlerde liderlik anlayışı ve koordinasyon kültürü yerleşmiştir. Liderler kurumun değerleri ve hedefleri doğrultusunda stratejilerinin yanı sıra; yetki paylaşımını, ilişkileri, zamanı, kurumsal motivasyon ve stresi de etkin ve dengeli biçimde yönetmektedir. Akademik ve idari birimler ile yönetim arasında etkin bir iletişim ağı oluşturulmuştur. Liderlik süreçleri ve kalite güvencesi kültürünün içselleştirilmesi sürekli değerlendirilmektedir.",
    duzeyler: [
      "Kurumda kalite güvencesi sisteminin yönetilmesi ve kalite kültürünün içselleştirilmesini destekleyen etkin bir liderlik yaklaşımı bulunmamaktadır.",
      "Kurumda liderlerin kalite güvencesi sisteminin yönetimi ve kültürünün içselleştirilmesi konusunda sahipliği ve motivasyonu bulunmaktadır.",
      "Kurumun geneline yayılmış, kalite güvencesi sistemi ve kültürünün gelişimini destekleyen etkin liderlik uygulamaları bulunmaktadır.",
      "Liderlik uygulamaları ve bu uygulamaların kalite güvencesi sistemi ve kültürünün gelişimine katkısı izlenmekte ve bağlı iyileştirmeler gerçekleştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Kalite güvencesi kültürünü geliştirmek üzere yapılan planlamalar ve uygulamalar",
      "Kurumun yöneticilerinin liderlik özelliklerini ve yetkinliklerini ölçmek ve izlemek için kullanılan yöntemler, elde edilen izleme sonuçları ve bağlı iyileştirmeler",
      "Kurumdaki kalite kültürünün gelişimini ölçmek ve izlemek için kullanılan yöntemler, elde edilen izleme sonuçları ve bağlı iyileştirmeler",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 39,
  },
  {
    kod: "A.1.3",
    baslik: "Kurumsal dönüşüm kapasitesi",
    metin:
      "Yükseköğretim ekosistemi içerisindeki değişimleri, küresel eğilimleri, ulusal hedefleri ve paydaş beklentilerini dikkate alarak kurumun geleceğe hazır olmasını sağlayan çevik yönetim yetkinliği vardır. Geleceğe uyum için amaç, misyon ve hedefler doğrultusunda kurumu dönüştürmek üzere değişim yönetimi, kıyaslama, yenilik yönetimi gibi yaklaşımları kullanır ve kurumsal özgünlüğü güçlendirir.",
    duzeyler: [
      "Kurumda değişim yönetimi bulunmamaktadır.",
      "Kurumda değişim ihtiyacı belirlenmiştir.",
      "Kurumda değişim yönetimi yaklaşımı kurumun geneline yayılmış ve bütüncül olarak yürütülmektedir.",
      "Amaç, misyon ve hedefler doğrultusunda gerçekleştirilen değişim yönetimi uygulamaları izlenmekte ve önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Değişim yönetim modeli",
      "Değişim planları, yol haritaları",
      "Yükseköğretim ekosisteminde ve temel fonksiyonları çevresinde meydana gelen değişime yönelik analiz raporları",
      "Gelecek senaryoları",
      "Kıyaslama raporları",
      "Yenilik yönetim sistemi",
      "Değişim ekipleri belgeleri",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 40,
  },
  {
    kod: "A.1.4",
    baslik: "İç kalite güvencesi mekanizmaları",
    metin:
      "PUKÖ çevrimleri itibarı ile takvim yılı temelinde hangi işlem, süreç, mekanizmaların devreye gireceği planlanmış, akış şemaları belirlidir. Sorumluluklar ve yetkiler tanımlanmıştır. Gerçekleşen uygulamalar değerlendirilmektedir. Takvim yılı temelinde tasarlanmayan diğer kalite döngülerinin ise tüm katmanları içerdiği kanıtları ile belirtilmiştir, gerçekleşen uygulamalar değerlendirilmektedir. Kuruma ait kalite güvencesi rehberi gibi, politika ayrıntılarının yer aldığı erişilebilen ve güncellenen bir doküman bulunmaktadır. Kurumun Kalite Komisyonunun süreç ve uygulamaları tanımlıdır, kurum çalışanlarınca bilinir. Komisyon iç kalite güvencesi sisteminin oluşturulması ve geliştirilmesinde etkin rol alır, program akreditasyonu süreçlerine destek verir. Komisyon gerçekleştirilen etkinliklerin sonuçlarını değerlendirir. Bu değerlendirmeler karar alma mekanizmalarını etkiler.",
    duzeyler: [
      "Kurumun tanımlanmış bir iç kalite güvencesi sistemi bulunmamaktadır.",
      "Kurumun iç kalite güvencesi süreç ve mekanizmaları tanımlanmıştır.",
      "İç kalite güvencesi sistemi kurumun geneline yayılmış, şeffaf ve bütüncül olarak yürütülmektedir.",
      "İç kalite güvencesi sistemi mekanizmaları izlenmekte ve ilgili paydaşlarla birlikte iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Kalite güvencesi rehberi gibi tanımlı süreç belgeleri, Kalite Komisyonu çalışma usul ve esasları",
      "İş akış şemaları, takvim, görev ve sorumluluklar ve paydaşların rollerini gösteren kanıtlar",
      "Bilgi Yönetim Sistemi",
      "Geri bildirim yöntemleri",
      "Paydaş katılımına ilişkin belgeler",
      "Yıllık izleme ve iyileştirme raporları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 41,
  },
  {
    kod: "A.1.5",
    baslik: "Kamuoyunu bilgilendirme ve hesap verebilirlik",
    metin:
      "Kamuoyunu bilgilendirme ilkesel olarak benimsenmiştir, hangi kanalların nasıl kullanılacağı tasarlanmıştır, erişilebilir olarak ilan edilmiştir ve tüm bilgilendirme adımları sistematik olarak atılmaktadır. Kurum web sayfası doğru, güncel, ilgili ve kolayca erişilebilir bilgiyi vermektedir; bunun sağlanması için gerekli mekanizma mevcuttur. Kurumsal özerklik ile hesap verebilirlik kavramlarının birbirini tamamladığına ilişkin bulgular mevcuttur. İçe ve dışa hesap verme yöntemleri kurgulanmıştır ve uygulanmaktadır. Sistematiktir, ilan edilen takvim çerçevesinde gerçekleştirilir, sorumluları nettir. Alınan geri beslemeler ile etkinliği değerlendirilmektedir. Kurumun bölgesindeki dış paydaşları, ilişkili olduğu yerel yönetimler, diğer üniversiteler, kamu kurumu kuruluşları, sivil toplum kuruluşları, sanayi ve yerel halk ile ilişkileri değerlendirilmektedir.",
    duzeyler: [
      "Kurumda kamuoyunu bilgilendirmek ve hesap verebilirliği gerçekleştirmek üzere mekanizmalar bulunmamaktadır.",
      "Kurumda şeffaflık ve hesap verebilirlik ilkeleri doğrultusunda kamuoyunu bilgilendirmek üzere tanımlı süreçler bulunmaktadır.",
      "Kurum tanımlı süreçleri doğrultusunda kamuoyunu bilgilendirme ve hesap verebilirlik mekanizmalarını işletmektedir.",
      "Kurumun kamuoyunu bilgilendirme ve hesap verebilirlik mekanizmaları izlenmekte ve paydaş görüşleri doğrultusunda iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Kamuoyunu bilgilendirme ve hesap verebilirlik ile ilişkili olarak benimsenen ilke, kural ve yöntemler",
      "Kamuoyunu bilgilendirme ve hesap verebilirliğe ilişkin uygulama örnekleri",
      "İç ve dış paydaşların kamuoyunu bilgilendirme ve hesap verebilirlikle ilgili memnuniyeti ve geri bildirimleri",
      "Kamuoyunu bilgilendirme ve hesap verebilirlik mekanizmalarına ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 42,
  },
  {
    kod: "A.2.1",
    baslik: "Misyon, vizyon ve politikalar",
    metin:
      "Misyon ve vizyon ifadesi tanımlanmıştır, kurum çalışanlarınca bilinir ve paylaşılır. Kuruma özeldir, sürdürülebilir bir gelecek yaratmak için yol göstericidir. Kalite güvencesi politikası vardır, paydaşların görüşü alınarak hazırlanmıştır. Politika kurum çalışanlarınca bilinir ve paylaşılır. Politika belgesi yalın, somut, gerçekçidir. Sürdürülebilir kalite güvencesi sistemini ana hatlarıyla tarif etmektedir. Kalite güvencesinin yönetim şekli, yapılanması, temel mekanizmaları, merkezi kurgu ve birimlere erişimi açıklanmıştır. Aynı şekilde eğitim ve öğretim (uzaktan eğitimi de kapsayacak şekilde), araştırma ve geliştirme, toplumsal katkı, yönetişim sistemi ve uluslararasılaşma politikaları vardır ve kalite güvencesi politikası için sayılan özellikleri taşır. Bu politika ifadelerinin somut sonuçları, uygulamalara yansıyan etkileri vardır; örnekleri sunulabilir.",
    duzeyler: [
      "Kurumda tanımlanmış misyon, vizyon ve politikalar bulunmamaktadır.",
      "Kurumun tanımlanmış ve kuruma özgü misyon, vizyon ve politikaları bulunmaktadır.",
      "Kurumun genelinde misyon, vizyon ve politikalarla uyumlu uygulamalar bulunmaktadır.",
      "Misyon, vizyon ve politikalar doğrultusunda gerçekleştirilen uygulamalar izlenmekte ve paydaşlarla birlikte değerlendirilerek önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Misyon ve vizyon",
      "Politika belgeleri (Eğitim ve öğretim politika belgesi uzaktan eğitimi de içermelidir)",
      "Politika belgelerinin ilgili paydaş katılımıyla hazırlandığını kanıtlayan belgeler",
      "Politika belgelerinde bütüncül ilişkiyi gösteren ifadeler ve uygulama örnekleri (Eğitim programlarında araştırma vurgusu, araştırma süreçlerinde topluma hizmet vurgusu, uzaktan eğitim vurgusu)",
      "Politikaların izlendiğine ve değerlendirildiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 43,
  },
  {
    kod: "A.2.2",
    baslik: "Stratejik amaç ve hedefler",
    metin:
      "Stratejik Plan* kültürü ve geleneği vardır, mevcut dönemi kapsayan, kısa/orta uzun vadeli amaçlar, hedefler, alt hedefler, eylemler ve bunların zamanlaması, önceliklendirilmesi, sorumluları, mali kaynakları bulunmaktadır, tüm paydaşların görüşü alınarak (özellikle stratejik paydaşlar) hazırlanmıştır. Mevcut stratejik plan hazırlanırken bir öncekinin ayrıntılı değerlendirilmesi yapılmış ve kullanılmıştır; yıllık gerçekleşme takip edilerek ilgili kurullarda tartışılmakta ve gerekli önlemler alınmaktadır. * Vakıf yükseköğretim kurumları için stratejik amaç ve hedefleri ile performans göstergelerinin tanımlandığı dökumandır.",
    duzeyler: [
      "Kurumun stratejik planı bulunmamaktadır.",
      "Kurumun ilan edilmiş bir stratejik planı bulunmaktadır.",
      "Kurumun bütünsel, tüm birimleri tarafından benimsenmiş ve paydaşlarınca bilinen stratejik planı ve bu planıyla uyumlu uygulamaları vardır.",
      "Kurum uyguladığı stratejik planı izlemekte ve ilgili paydaşlarla birlikte değerlendirerek gelecek planlarına yansıtılmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Stratejik plan ve geliştirilme süreci",
      "Performans raporları",
      "Kurumun stratejik planına planlama, uygulama, kontrol etme ve önlem alma aşamalarında iç ve dış paydaş katılımını gösteren kanıtlar",
      "Stratejik plan ve hedeflerin, Birleşmiş Milletler Sürdürülebilir Kalkınma Amaçları’yla uyumunu gösteren kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 44,
  },
  {
    kod: "A.2.3",
    baslik: "Performans yönetimi",
    metin:
      "Kurumda performans yönetim sistemleri bütünsel bir yaklaşımla ele alınmaktadır. Bu sistemler kurumun stratejik amaçları doğrultusunda sürekli iyileşmesine ve geleceğe hazırlanmasına yardımcı olur. Bilişim sistemleriyle desteklenerek performans yönetiminin doğru ve güvenilir olması sağlanmaktadır. Kurumun stratejik bakış açısını yansıtan performans yönetimi süreç odaklı ve paydaş katılımıyla sürdürülmektedir. Tüm temel etkinlikleri kapsayan kurumsal (genel, anahtar, uzaktan eğitim vb.) performans göstergeleri tanımlanmış ve paylaşılmıştır. Performans göstergelerinin iç kalite güvencesi sistemi ile nasıl ilişkilendirildiği tanımlanmış ve yazılıdır. Kararlara yansıma örnekleri mevcuttur. Yıllar içinde nasıl değiştiği takip edilmektedir, bu izlemenin sonuçları yazılıdır ve gerektiği şekilde kullanıldığına dair kanıtlar mevcuttur.",
    duzeyler: [
      "Kurumda performans yönetimi bulunmamaktadır.",
      "Kurumda performans göstergeleri ve performans yönetimi mekanizmaları tanımlanmıştır.",
      "Kurumun geneline yayılmış performans yönetimi uygulamaları bulunmaktadır.",
      "Kurumda performans göstergelerinin işlerliği ve performans yönetimi mekanizmaları izlenmekte ve izlem sonuçlarına göre iyileştirmeler gerçekleştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Performans göstergeleri ve anahtar performans göstergeleri",
      "Performans yönetiminde kullanılan mekanizmalar",
      "Performans programı raporu",
      "Performans yönetimi mekanizmalarının iyileştirildiğine dair kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 45,
  },
  {
    kod: "A.3.1",
    baslik: "Bilgi yönetim sistemi",
    metin:
      "Kurumun önemli etkinlikleri ve süreçlerine ilişkin veriler toplanmakta, analiz edilmekte, raporlanmakta ve stratejik yönetim için kullanılmaktadır. Akademik ve idari birimlerin kullandıkları Bilgi Yönetim Sistemi entegredir ve kalite yönetim süreçlerini beslemektedir. Bilgi Yönetim Sistemi güvenliği, gizliliği ve güvenilirliği sağlanmıştır.",
    duzeyler: [
      "Kurumda bilgi yönetim sistemi bulunmamakta dır.",
      "Kurumda kurumsal bilginin edinimi, saklanması, kullanılması, işlenmesi ve değerlendirilmesine destek olacak bilgi yönetim sistemleri oluşturulmuştur.",
      "Kurum genelinde temel süreçleri (eğitim ve öğretim, araştırma ve geliştirme, toplumsal katkı, kalite güvencesi) destekleyen entegre bilgi yönetim sistemi işletilmektedir.",
      "Kurumda entegre bilgi yönetim sistemi izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Bilgi Yönetim Sistemi ve bu sistemin fonksiyonları",
      "Bilginin elde edilmesi, kayıt edilmesi, güncellenmesi, işlenmesi, değerlendirilmesi ve paylaşılmasına ilişkin tanımlı süreçler",
      "Bilgi Yönetim Sistemi’nin izlenmesi ve iyileştirilmesine ilişkin kanıtlar",
      "Bilgi güvenliğini ve güvenirliğini sağlamaya yönelik süreçler ve uygulamalar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 46,
  },
  {
    kod: "A.3.2",
    baslik: "İnsan kaynakları yönetimi",
    metin:
      "İnsan kaynakları yönetimine ilişkin kurallar ve süreçler bulunmaktadır. Şeffaf şekilde yürütülen bu süreçler kurumda herkes tarafından bilinmektedir. Eğitim ve liyakat öncelikli kriter olup, yetkinliklerin arttırılması temel hedeftir.Ç alışan (akademik-idari) memnuniyet, şikayet ve önerilerini belirlemek ve izlemek amacıyla geliştirilmiş olan yöntem ve mekanizmalar uygulanmakta ve sonuçları değerlendirilerek iyileştirilmektedir.",
    duzeyler: [
      "Kurumda insan kaynakları yönetimine ilişkin tanımlı süreçler bulunmamaktadır.",
      "Kurumda stratejik hedefleriyle uyumlu insan kaynakları yönetimine ilişkin tanımlı süreçler bulunmaktadır.",
      "Kurumun genelinde insan kaynakları yönetimi doğrultusunda uygulamalar tanımlı süreçlere uygun bir biçimde yürütülmektedir.",
      "Kurumda insan kaynakları yönetimi uygulamaları izlenmekte ve ilgili iç paydaşlarla değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "İnsan kaynakları politikası ve hedefleri ve bunlara ilişkin uygulamalar (Yetkinlik, işe alınma, hizmet içi eğitim, teşvik ve ödüllendirme vb.)",
      "Çalışan (akademik ve idari) memnuniyeti anketleri, uygulama sistematiği ve anket sonuçları",
      "İnsan kaynakları yönetimi uygulamalarına ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 47,
  },
  {
    kod: "A.3.3",
    baslik: "Finansal yönetim",
    metin:
      "Temel gelir ve gider kalemleri tanımlanmıştır ve yıllar içinde izlenmektedir. Toplam Cari Bütçe (gelir) = Devlet eğitim katkısı (merkezi bütçeden gelen ve araştırma-geliştirme kategorisindeki faaliyetlere ait olmayan tüm gelirler) + öğrenci gelirleri (kaynağı öğrenci olan tüm gelirler: 1. ve 2. öğretim, tezsiz yüksek lisans, yaz okulu, hizmetler/harçlar, yemek-barınma ücreti vb.) + araştırma gelirleri (devletten merkezi bütçe içinde gelen + ulusal tahsis -yarışmasız projeler-) + ulusal yarışmacı araştırma destekleri + uluslararası araştırma destekleri [özel hesap, döner sermaye, vakıftan gelen veya başkaca muhasebeleştirilen] + toplumsal katkı gelirleri (tıp, dişçilik vb.) fakültelerin sağlık hizmeti geliri [döner sermaye veya başkaca muhasebeleştirilen] + mühendislik, mimarlık vb fakültelerinin bilgi ve teknoloji transferi/projeler/uygulamalar geliri [döner sermaye veya başkaca muhasebeleştirilen] + erişkin eğitimi/yaşam boyu eğitim gelirleri + kira gelirleri + laboratuvar/deney/ölçüm vb gelirler [özel hesap, döner sermaye, vakıftan gelen veya başkaca muhasebeleştirilen] + bağışlar (devlet dışı, şartlı veya şartsız olarak üniversiteye aktarılan kaynak) ayrıntısında izlenmektedir ve kurum profiliyle ilişkilendirilmektedir.",
    duzeyler: [
      "Kurumda finansal kaynakların yönetimine ilişkin tanımlı süreçler bulunmamaktadır.",
      "Kurumda finansal kaynakların yönetimine ilişkin olarak stratejik hedefler ile uyumlu tanımlı süreçler bulunmaktadır.",
      "Kurumun genelinde finansal kaynakların yönetime ilişkin uygulamalar tanımlı süreçlere uygun biçimde yürütülmektedir.",
      "Kurumda finansal kaynakların yönetim süreçleri izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Finansal kaynakların yönetimine ilişkin tanımlı süreçler ve uygulamalar (Kaynak dağılımı, kaynakların etkin ve verimli kullanılması, kaynak çeşitliliği)",
      "Finansal kaynakların planlama, kullanım ve izleme uygulamalarının kurumun stratejik planı ile uyumu",
      "Finansal kaynakların yönetimi süreçlerine ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 48,
  },
  {
    kod: "A.3.4",
    baslik: "Süreç yönetimi",
    metin:
      "Tüm etkinliklere ait süreçler ve alt süreçler (uzaktan eğitim dahil) tanımlıdır. Süreçlerdeki sorumlular, iş akışı, yönetim, sahiplenme yazılıdır ve kurumca içselleştirilmiştir. Süreç yönetiminin başarılı olduğunun kanıtları vardır. Sürekli süreç iyileştirme döngüsü kurulmuştur.",
    duzeyler: [
      "Kurumda eğitim ve öğretim, araştırma ve geliştirme, toplumsal katkı ve yönetim sistemine ilişkin süreçler tanımlanmamıştır.",
      "Kurumda eğitim ve öğretim, araştırma ve geliştirme, toplumsal katkı ve yönetim sistemi süreç ve alt süreçleri tanımlanmıştır.",
      "Kurumun genelinde tanımlı süreçler yönetilmektedir.",
      "Kurumda süreç yönetimi mekanizmaları izlenmekte ve ilgili paydaşlarla değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Süreç Yönetimi El Kitabı",
      "Süreç yönetimi modeli ve uygulamaları, ilgili sistemler, yönetim mekanizmaları (Uzaktan eğitim dahil)",
      "Paydaş katılımına ilişkin kanıtlar",
      "Süreç yönetim mekanizmalarının izlenmesi ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 49,
  },
  {
    kod: "A.4.1",
    baslik: "İç ve dış paydaş katılımı",
    metin:
      "İç ve dış paydaşların karar alma, yönetişim ve iyileştirme süreçlerine katılım mekanizmaları tanımlanmıştır. Gerçekleşen katılımın etkinliği, kurumsallığı ve sürekliliği irdelenmektedir. Uygulama örnekleri, iç kalite güvencesi sisteminde özellikle öğrenci ve dış paydaş katılımı ve etkinliği mevcuttur. Sonuçlar değerlendirilmekte ve bağlı iyileştirmeler gerçekleştirilmektedir.",
    duzeyler: [],
    ornekKanitlar: [
      "Kurumun süreçlerine özgü oluşturulmuş iç ve dış paydaş listesi ile paydaşların önceliklendirilmesine ilişkin kanıtlar",
      "Paydaş görüşlerinin alınması sürecinde kullanılan veri toplama araçları ve yöntemi (Anketler, odak grup toplantıları, çalıştaylar, bilgi yönetim sistemi vb.)",
      "Karar alma süreçlerinde paydaş katılımının sağlandığını gösteren belgeler",
      "Paydaş katılım mekanizmalarının işleyişine ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 50,
  },
  {
    kod: "A.4.2",
    baslik: "Öğrenci geri bildirimleri",
    metin:
      "Öğrenci görüşü (ders, dersin öğretim elemanı, diploma programı, hizmet ve genel memnuniyet seviyesi, vb) sistematik olarak ve çeşitli yollarla alınmakta, etkin kullanılmakta ve sonuçları paylaşılmaktadır. Kullanılan yöntemlerin geçerli ve güvenilir olması, verilerin tutarlı ve temsil eder olması sağlanmıştır. Öğrenci şikayetleri ve/veya önerileri için muhtelif kanallar vardır, öğrencilerce bilinir, bunların adil ve etkin çalıştığı denetlenmektedir. Kurumda öğrenci geri bildirimlerinin alınmasına yönelik mekanizmalar bulunmamaktadır. Kurumda öğretim süreçlerine ilişkin olarak öğrencilerin geri bildirimlerinin (ders, dersin öğretim elemanı, program, öğrenci iş yükü* vb.)",
    duzeyler: [
      "alınmasına ilişkin ilke ve kurallar oluşturulmuştur.",
      "Programların genelinde öğrenci geri bildirimleri (her yarıyıl ya da her akademik yıl sonunda) alınmaktadır.",
      "Tüm programlarda öğrenci geri bildirimlerinin alınmasına ilişkin uygulamalar izlenmekte ve öğrenci katılımına dayalı biçimde iyileştirilmektedir.",
      "Geri bildirim sonuçları karar alma süreçlerine yansıtılmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğrenci geri bildirimi elde etmeye ilişkin ilke ve kurallar",
      "Tanımlı öğrenci geri bildirim mekanizmalarının tür, yöntem ve çeşitliliğini gösteren kanıtlar (Uzaktan/karma eğitim dahil)",
      "Öğrenci geri bildirimleri kapsamında gerçekleştirilen iyileştirmelere ilişkin uygulamalar",
      "Öğrencilerin karar alma mekanizmalarına katılımı örnekleri",
      "Öğrenci geri bildirim mekanizmasının izlenmesi ve iyileştirilmesine yönelik kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 51,
  },
  {
    kod: "A.4.3",
    baslik: "Mezun ilişkileri yönetimi",
    metin:
      "Mezunların işe yerleşme, eğitime devam, gelir düzeyi, işveren/ mezun memnuniyeti gibi istihdam bilgileri sistematik ve kapsamlı olarak toplanmakta, değerlendirilmekte, kurum gelişme stratejilerinde kullanılmaktadır.",
    duzeyler: [
      "Kurumda mezun izleme sistemi bulunmamaktadır.",
      "Programların amaç ve hedeflerine ulaşılıp ulaşılmadığının irdelenmesi amacıyla bir mezun izleme sistemine ilişkin planlama bulunmaktadır.",
      "Kurumdaki programların genelinde mezun izleme sistemi uygulamaları vardır.",
      "Mezun izleme sistemi uygulamaları izlenmekte ve ihtiyaçlar doğrultusunda programlarda güncellemeler yapılmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Mezun izleme sisteminin özellikleri",
      "Mezunların sahip olduğu yeterlilikler ve programın amaç ve hedeflerine ulaşılmasına ilişkin memnuniyet düzeyi",
      "Mezun izleme sistemi kapsamında programlarda gerçekleştirilen güncelleme çalışmaları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 52,
  },
  {
    kod: "A.5.1",
    baslik: "Uluslararasılaşma süreçlerinin yönetimi",
    metin:
      "Uluslararasılaşma süreçlerinin yönetimi ve organizasyonel yapısı kurumsallaşmıştır. Kurumun uluslararasılaşma politikası ile uyumludur. Yönetim ve organizasyonel yapının işleyişi ve etkinliği irdelenmektedir.",
    duzeyler: [
      "Kurumun uluslararasılaşma süreçlerine ilişkin yönetsel ve organizasyonel yapılanması bulunmamaktadır.",
      "Kurumun uluslararasılaşma süreçlerinin yönetim ve organizasyonel yapısına ilişkin planlamalar bulunmaktadır.",
      "Kurumda uluslararasılaşma süreçlerinin yönetimine ilişkin organizasyonel yapılanma tamamlanmış olup; şeffaf, kapsayıcı ve katılımcı biçimde işlemektedir.",
      "Uluslararasılaşma süreçlerinin yönetsel ve organizasyonel yapılanması izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Uluslararasılaşma süreçlerinin yönetimi ve organizasyonel yapısı",
      "Yönetim ve organizasyonel yapıya ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 53,
  },
  {
    kod: "A.5.2",
    baslik: "Uluslararasılaşma kaynakları",
    metin:
      "Uluslararasılaşmaya ayrılan kaynaklar (mali, fiziksel, insan gücü) belirlenmiş, paylaşılmış, kurumsallaşmıştır. Bu kaynaklar nicelik ve nitelik bağlamında izlenmekte ve değerlendirilmektedir.",
    duzeyler: [
      "Kurumun uluslararasılaşma faaliyetlerini sürdürebilmesi için yeterli kaynak bulunmamaktadır.",
      "Kurumun uluslararasılaşma faaliyetlerini sürdürebilmek için uygun nitelik ve nicelikte fiziki, teknik ve mali kaynakların oluşturulmasına yönelik planları bulunmaktadır.",
      "Kurumun uluslararaslaşma kaynakları birimler arası denge gözetilerek yönetilmektedir.",
      "Kurumda uluslararasılaşma kaynaklarının dağılımı izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Uluslararası çalışmalar için ayrılan kaynaklarının yönetimine ilişkin belgeler (Erasmus vb. bütçelerin kulanım oranı, AB proje bütçelerinin yönetimi ve ikili protokoller kapsamında gerçekleşen kaynakların yönetimine ilişkin belgeler gibi)",
      "Uluslararasılaşma kaynakların dağılımının izlenmesi ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 54,
  },
  {
    kod: "A.5.3",
    baslik: "Uluslararasılaşma performansı",
    metin:
      "Uluslararasılaşma performansı izlenmektedir. İzlenme mekanizma ve süreçleri yerleşiktir, sürdürülebilirdir, iyileştirme adımlarının kanıtları vardır.",
    duzeyler: [
      "Kurumda uluslararasılaşma faaliyeti bulunmamaktadır.",
      "Kurumda uluslararasılaşma politikasıyla uyumlu faaliyetlere yönelik planlamalar bulunmaktadır.",
      "Kurumun geneline yayılmış uluslararasılaşma faaliyetleri bulunmaktadır.",
      "Kurumda uluslararasılaşma faaliyetleri izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Uluslararasılaşma faaliyetleri",
      "Kurumun uluslararasılaşma performansını izlemek üzere kullandığı göstergeler",
      "Uluslararasılaşma hedeflerine ulaşılıp ulaşılmadığını izlemek üzere oluşturulan mekanizmalar",
      "Uluslararasılaşma süreçlerine ilişkin yıllık öz değerlendirme raporları ve iyileştirme çalışmaları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 55,
  },
  {
    kod: "B.1.1",
    baslik: "Programların tasarımı ve onayı",
    metin:
      "Programların amaçları ve öğrenme çıktıları (kazanımları) oluşturulmuş, TYYÇ ile uyumu belirtilmiş, kamuoyuna ilan edilmiştir. Program yeterlilikleri belirlenirken kurumun misyon- vizyonu göz önünde bulundurulmuştur. Ders bilgi paketleri varsa ulusal çekirdek programı, varsa ölçütler (örneğin akreditasyon ölçütleri vb.) dikkate alınarak hazırlanmıştır. Kazanımların ifade şekli öngörülen bilişsel, duyuşsal ve devinimsel seviyeyi açıkça belirtmektedi. Program çıktılarının gerçekleştiğinin nasıl izleneceğine dair planlama yapılmıştır, özellikle kurumun ortak çıktıların irdelenme yöntem ve süreci ayrıntılı belirtilmektedir. Öğrenme çıktılarının ve gerekli öğretim süreçlerinin yapılandırılmasında bölüm bazında ilke ve kurallar bulunmaktadır. Program düzeyinde yeterliliklerin hangi eylemlerle kazandırılabileceği (yeterlilik-ders-öğretim yöntemi matrisleri) belirlenmiştir. Alan farklılıklarına göre yeterliliklerin hangi eğitim türlerinde (örgün, karma, uzaktan) kazandırılabileceği tanımlıdır. Programların tasarımında, fiziksel ve teknolojik olanaklar dikkate alınmaktadır (erişim, sosyal mesafe vb.).",
    duzeyler: [
      "Kurumda programların tasarımı ve onayına ilişkin süreçler tanımlanmamıştır.",
      "Kurumda programların tasarımı ve onayına ilişkin ilke, yöntem, TYYÇ ile uyum ve paydaş katılımını içeren tanımlı süreçler bulunmaktadır.",
      "Tanımlı süreçler doğrultusunda; Kurumun genelinde, tasarımı ve onayı gerçekleşen programlar, programların amaç ve öğrenme çıktılarına uygun olarak yürütülmektedir.",
      "Programların tasarım ve onay süreçleri sistematik olarak izlenmekte ve ilgili paydaşlarla birlikte değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Program tasarımı ve onayı için kullanılan tanımlı süreçler (Eğitim politikasıyla uyumu, el kitabı, kılavuz, usul ve esas vb.)",
      "Program tasarımı ve onayı süreçlerinin yönetsel ve organizasyonel yapısı (Komisyonlar, süreç sorumluları, süreç akışı vb.)",
      "Program amaç ve çıktılarının TYYÇ ile uyumunu gösteren kanıtlar",
      "Uzaktan-karma program tasarımında bölüm/alan bazlı uygulama çeşitliliğine ilişkin kanıtlar (bölümlerin farklı uzaktan eğitim taleplerinin dikkate alındığına ilişkin kanıtlar vb.)",
      "Program tasarım süreçlerine paydaş katılımını gösteren kanıtlar",
      "Programların tasarım ve onay sürecinin izlendiği ve iyileştirildiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 56,
  },
  {
    kod: "B.1.2",
    baslik: "Programın ders dağılım dengesi",
    metin:
      "Programın ders dağılımına ilişkin ilke, kural ve yöntemler tanımlıdır. Ders dağılımında öğretim elemanlarının uzmanlık alanları ve iş yükleri gözetilir ve ders dağılımı katılımcı bir şekilde belirlenir. Öğretim programı (müfredat) yapısı zorunlu-seçmeli ders, alan-alan dışı ders dengesini gözetmekte, kültürel derinlik ve farklı disiplinleri tanıma imkânı vermektedir. Ders sayısı ve haftalık ders saati öğrencinin akademik olmayan etkinliklere de zaman ayırabileceği şekilde düzenlenmiştir. Bu kapsamda geliştirilen ders bilgi paketlerinin amaca uygunluğu ve işlerliği izlenmekte ve bağlı iyileştirmeler yapılmaktadır.",
    duzeyler: [
      "Ders dağılımına ilişkin, ilke ve yöntemler tanımlanmamıştır.",
      "Ders dağılımına ilişkin olarak; öğretim elemanlarının uzmanlık alanına, alan/meslek bilgisi/genel kültür, zorunlu- seçmeli ders dengesine, kültürel derinlik kazanma, farklı disiplinleri tanıma imkânları gibi boyutlara yönelik ilke ve yöntemleri içeren tanımlı süreçler bulunmaktadır.",
      "Ders dağılımı dengesine ilişkin tanımlı süreçlere uygun olarak kurum genelinde uygulamalar bulunmaktadır.",
      "Programlarda ders dağılım dengesi izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Ders dağılımına ilişkin ilke ve yöntemler ile buna ilişkin kanıtlar",
      "İlan edilmiş ders bilgi paketlerinde ders dağılım dengesinin gözetildiğine ilişkin kanıtlar",
      "Eğitim komisyonu kararı, senato kararları vb",
      "Ders dağılım dengesinin izlenmesine ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 57,
  },
  {
    kod: "B.1.3",
    baslik: "Ders kazanımlarının program çıktılarıyla uyumu",
    metin:
      "Derslerin öğrenme kazanımları (karma ve uzaktan eğitim de dahil) tanımlanmış ve program çıktıları ile ders kazanımları eşleştirmesi oluşturulmuş ve ilan edilmiştir. Kazanımların ifade şekli öngörülen bilişsel, duyuşsal ve devinimsel seviyeyi açıkça belirtmektedir. Ders öğrenme kazanımlarının gerçekleştiğinin nasıl izleneceğine dair planlama yapılmıştır, özellikle alana özgü olmayan (genel) kazanımların irdelenme yöntem ve süreci ayrıntılı belirtilmektedir.",
    duzeyler: [
      "Ders kazanımları program çıktıları ile eşleştirilmemiştir.",
      "Ders kazanımlarının oluşturulması ve program çıktılarıyla uyumlu hale getirilmesine ilişkin ilke, yöntem ve sınıflamaları içeren tanımlı süreçler bulunmaktadır.",
      "Ders kazanımları programların genelinde program çıktılarıyla uyumlandırılmıştır ve ders bilgi paketleri ile paylaşılmaktadır.",
      "Ders kazanımlarının program çıktılarıyla uyumu izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Program çıktıları ve ders kazanımlarının ilişkilendirilmesi",
      "Program dışından alınan derslerin (örgün veya uzaktan) program çıktılarıyla uyumunu gösteren kanıtlar",
      "Ders kazanımların program çıktılarıyla uyumunun izlenmesine ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 58,
  },
  {
    kod: "B.1.4",
    baslik: "Öğrenci iş yüküne dayalı ders tasarımı",
    metin:
      "Tüm derslerin AKTS değeri web sayfası üzerinden paylaşılmakta, öğrenci iş yükü takibi ile doğrulanmaktadır. Staj ve mesleğe ait uygulamalı öğrenme fırsatları mevcuttur ve yeterince öğrenci iş yükü ve kredi çerçevesinde değerlendirilmektedir. Gerçekleşen uygulamanın niteliği irdelenmektedir. Öğrenci iş yüküne dayalı tasarımda uzaktan eğitimle ortaya çıkan çeşitlilikler de göz önünde bulundurulmaktadır.",
    duzeyler: [
      "Dersler öğrenci iş yüküne dayalı olarak tasarlanmamıştır.",
      "Öğrenci iş yükünün nasıl hesaplanacağına ilişkin staj, mesleki uygulama hareketlilik gibi boyutları içeren ilke ve yöntemlerin yer aldığı tanımlı süreçler* bulunmaktadır.",
      "Dersler öğrenci iş yüküne uygun olarak tasarlanmış, ilan edilmiş ve uygulamaya konulmuştur.",
      "Programlarda öğrenci iş yükü izlenmekte ve buna göre ders tasarımı güncellenmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "AKTS ders bilgi paketleri* (Uzaktan ve karma eğitim programları dahil)",
      "Öğrenci iş yükü kredisinin mesleki uygulamalar, değişim programları, staj ve projeler için tanımlandığını gösteren kanıtlar*",
      "İş yükü temelli kredilerin transferi ve tanınmasına ilişkin tanımlı süreçleri içeren belgeler",
      "Programlarda öğrenci İş yükünün belirlenmesinde öğrenci katılımının sağlandığına ilişkin belgeler ve mekanizmalar",
      "Diploma Eki",
      "İş yükü temelli kredilerin geribildirimler doğrultusunda güncellendiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 59,
  },
  {
    kod: "B.1.5",
    baslik: "Programların izlenmesi ve güncellenmesi",
    metin:
      "Her program ve ders için (örgün, uzaktan, karma, açıktan) program amaçlarının ve öğrenme çıktılarının izlenmesi planlandığı şekilde gerçekleşmektedir. Bu sürecin isleyişi ve sonuçları paydaşlarla birlikte değerlendirilmektedir. Eğitim ve öğretim ile ilgili istatistiki göstergeler (her yarıyıl açılan dersler, öğrenci sayıları, başarı durumları, geri besleme sonuçları, ders çeşitliliği, lab uygulama, lisans/lisansüstü dengeleri, ilişki kesme sayıları/nedenleri, vb) periyodik ve sistematik şekilde izlenmekte, tartışılmakta, değerlendirilmekte, karşılaştırılmakta ve kaliteli eğitim yönündeki gelişim sürdürülmektedir. Program akreditasyonu planlaması, teşviki ve uygulaması vardır; kurumun akreditasyon stratejisi belirtilmiş ve sonuçları tartışılmıştır. Akreditasyonun getirileri, iç kalite güvencesi sistemine katkısı değerlendirilmektedir.",
    duzeyler: [
      "Program çıktılarının izlenmesine ve güncellenmesine ilişkin mekanizma bulunmamaktadır.",
      "Program çıktılarının izlenmesine ve güncellenmesine ilişkin periyot, ilke, kural ve göstergeler oluşturulmuştur.",
      "Programların genelinde program çıktılarının izlenmesine ve güncellenmesine ilişkin mekanizmalar işletilmektedir.",
      "Program çıktıları bu mekanizmalar ile izlenmekte ve ilgili paydaşların görüşleri de alınarak güncellenmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Programların izlenmesi ve güncellenmesine ilişkin periyot (yıllık ve program süresinin sonunda) ilke, kural, gösterge, plan ve uygulamalar",
      "Kurumun misyon, vizyon ve hedefleri doğrultusunda programlarını güncellemek üzere kurduğu mekanizma örnekleri",
      "Programların yıllık öz değerlendirme raporları (Program çıktıları açısından değerlendirme)",
      "Program çıktılarına ulaşılıp ulaşılmadığını izleyen sistemler (Bilgi Yönetim Sistemi)",
      "Programların yıllık ve program süresi temelli izlemelerden hareketle yapılan iyileştirmeler",
      "Yapılan iyileştirmeler ve değişiklikler konusunda paydaşların bilgilendirildiği uygulamalar",
      "Programın amaçlarına ulaşıp ulaşmadığına ilişkin geri bildirimler",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 60,
  },
  {
    kod: "B.1.6",
    baslik: "Eğitim ve öğretim süreçlerinin yönetimi",
    metin:
      "Kurum, eğitim ve öğretim süreçlerini bütüncül olarak yönetmek üzere; organizasyonel yapılanma (üniversite eğitim ve öğretim komisyonu, öğrenme ve öğretme merkezi, vb.), bilgi yönetim sistemi ve uzman insan kaynağına sahiptir. Eğitim ve öğretim süreçleri üst yönetimin koordinasyonunda yürütülmekte olup; bu süreçlere ilişkin görev ve sorumluluklar tanımlanmıştır. Eğitim ve öğretim programlarının tasarlanması, yürütülmesi, değerlendirilmesi ve güncellenmesi faaliyetlerine ilişkin kurum genelinde ilke, esaslar ile takvim belirlidir. Programlarda öğrenme kazanımı, öğretim programı (müfredat), eğitim hizmetinin verilme biçimi (örgün, uzaktan, karma, açıktan), öğretim yöntemi ve ölçme-değerlendirme uyumu ve tüm bu süreçlerin koordinasyonu üst yönetim tarafından takip edilmektedir.",
    duzeyler: [
      "Kurumda eğitim ve öğretim süreçlerini bütüncül olarak yönetmek üzere bir sistem bulunmamaktadır.",
      "Kurumda eğitim ve öğretim süreçlerini bütüncül olarak yönetmek üzere sistem, ilke ve kurallar bulunmaktadır.",
      "Kurumun genelinde eğitim ve öğretim süreçleri belirlenmiş ilke ve kuralara uygun yönetilmektedir.",
      "Kurumda eğitim ve öğretim yönetim sistemine ilişkin uygulamalar izlenmekte ve izlem sonuçlarına göre iyileştirme yapılmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Eğitim ve öğretim süreçlerinin yönetimine ilişkin organizasyonel yapılanma ve iş akış şemaları",
      "Eğitim ve öğretim ile ölçme ve değerlendirme süreçlerinin yönetimine ilişkin ilke, kurallar ve takvim",
      "Bilgi Yönetim Sistemi",
      "Eğitim ve öğretim süreçlerinin yönetimine ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 61,
  },
  {
    kod: "B.2.1",
    baslik: "Öğretim yöntem ve teknikleri",
    metin:
      "Öğretim yöntemi öğrenciyi aktif hale getiren ve etkileşimli öğrenme odaklıdır. Tüm eğitim türleri içerisinde (örgün, uzaktan, karma) o eğitim türünün doğasına uygun; öğrenci merkezli, yetkinlik temelli, süreç ve performans odaklı disiplinlerarası, bütünleyici, vaka/uygulama temelinde öğrenmeyi önceleyen yaklaşımlara yer verilir. Bilgi aktarımından çok derin öğrenmeye, öğrenci ilgi, motivasyon ve bağlılığına odaklanılmıştır. Örgün eğitim süreçleri ön lisans, lisans ve lisansüstü öğrencilerini kapsayan; teknolojinin sunduğu olanaklar ve ters yüz öğrenme, proje temelli öğrenme gibi yaklaşımlarla zenginleştirilmektedir. Öğrencilerinin araştırma süreçlerine katılımı müfredat, yöntem ve yaklaşımlarla desteklenmektedir. Tüm bu süreçlerin uygulanması, kontrol edilmesi ve gereken önlemlerin alınması sistematik olarak değerlendirilmektedir.",
    duzeyler: [
      "Öğrenme-öğretme süreçlerinde öğrenci merkezli yaklaşımlar bulunmamaktadır.",
      "Öğrenme-öğretme süreçlerinde öğrenci merkezli yaklaşımın uygulanmasına yönelik ilke, kural ve planlamalar bulunmaktadır.",
      "Programların genelinde öğrenci merkezli öğretim yöntem teknikleri tanımlı süreçler doğrultusunda uygulanmaktadır.",
      "Öğrenci merkezli uygulamalar izlenmekte ve ilgili iç paydaşların katılımıyla iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Ders bilgi paketlerinde öğrenci merkezli öğretim yöntemlerinin varlığı",
      "Uzaktan eğitime özgü öğretim materyali geliştirme ve öğretim yöntemlerine ilişkin ilkeler, mekanizmalar",
      "Aktif ve etkileşimli öğretme yöntemlerine ilişkin tanımlı süreçler ve uygulamalar",
      "Eğiticilerin eğitimi program içeriğinde öğrenci merkezli öğrenme-öğretme yaklaşımına ilişkin uygulamalar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 62,
  },
  {
    kod: "B.2.2",
    baslik: "Ölçme ve değerlendirme",
    metin:
      "Öğrenci merkezli ölçme ve değerlendirme, yetkinlik ve performans temelinde yürütülmekte ve öğrencilerin kendini ifade etme olanakları mümkün olduğunca çeşitlendirilmektedir. Ölçme ve değerlendirmenin sürekliliği çoklu sınav olanakları ve bazıları süreç odaklı (formatif) ödev, proje, portfolyo gibi yöntemlerle sağlanmaktadır. Ders kazanımlarına ve eğitim türlerine (örgün, uzaktan, karma) uygun sınav yöntemleri planlamakta ve uygulanmaktadır. Sınav uygulama ve güvenliği (örgün/çevrimiçi sınavlar, dezavantajlı gruplara yönelik sınavlar) mekanizmaları bulunmaktadır. Ölçme ve değerlendirme uygulamalarının zaman ve kişiler arasında tutarlılığı ve güvenirliği sağlanmaktadır. Kurum, ölçme- değerlendirme yaklaşım ve olanaklarını öğrenci-öğretim elemanı geri bildirimine dayalı biçimde iyileştirmektedir Bu iyileştirmelerin duyurulması, uygulanması, kontrolü, hedeflerle uyumu ve alınan önlemler irdelenmektedir.",
    duzeyler: [],
    ornekKanitlar: [
      "Programlardaki ölçme ve değerlendirme çeşitliliğine ilişkin uygulama örnekleri",
      "Örgün/uzaktan/karma derslerde kullanılan sınav örnekleri (programda yer verilen farklı ölçme araçlarına ilişkin)",
      "Ölçme ve değerlendirme uygulamalarının ders kazanımları ve program yeterlilikleriyle ilişkilendirildiğini, öğrenci iş yükünü temel aldığını* gösteren ders bilgi paketi örnekleri",
      "Dezavantajlı gruplar ve çevrimiçi sınavlar gibi özel ölçme türlerine ilişkin mekanizmalar",
      "Sınav güvenliği mekanizmaları",
      "İzleme ve paydaş katılımına dayalı iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 63,
  },
  {
    kod: "B.2.3",
    baslik: "Öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesi",
    metin:
      "Öğrenci kabulüne (merkezi yerleştirmeyle gelen öğrenci grupları dışında kalan öğrenciler dahil) ilişkin ilke ve kuralları tanımlanmış ve ilan edilmiştir. Bu ilke ve kurallar birbiri ile tutarlı olup, uygulamalar şeffaftır. Diploma, sertifika gibi belge talepleri titizlikle takip edilmektedir. Önceki öğrenmenin (örgün, yaygın, uzaktan/karma eğitim ve serbest öğrenme yoluyla edinilen bilgi ve becerilerin) tanınması ve kredilendirilmesi yapılmaktadır. Uluslararasılaşma politikasına paralel hareketlilik destekleri, öğrenciyi teşvik, kolaylaştırıcı önlemler bulunmaktadır ve hareketlilikte kredi kaybı olmaması yönünde uygulamalar vardır.",
    duzeyler: [
      "Kurumda öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesine ilişkin süreçler tanımlanmamıştır.",
      "Kurumda öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesine ilişkin ilke, kural ve bağlı planlar bulunmaktadır.",
      "Kurumun genelinde öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesine ilişkin planlar dahilinde uygulamalar bulunmaktadır.",
      "Öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesine ilişkin süreçler izlenmekte, iyileştirilmekte ve güncellemeler ilan edilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğrenci kabulü, önceki öğrenmenin tanınması ve kredilendirilmesine ilişkin ilke ve kurallar",
      "Önceki öğrenmelerin tanınmasında öğrenci iş yükü temelli kredilerin kullanıldığına dair belgeler",
      "Uygulamaların tanımlı süreçlerle uyumuna ve sürekliliğine ilişkin kanıtlar,",
      "Paydaşların bilgilendirildiği mekanizmalar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 64,
  },
  {
    kod: "B.2.4",
    baslik: "Yeterliliklerin sertifikalandırılması ve diploma",
    metin:
      "Yeterliliklerin onayı, mezuniyet koşulları, mezuniyet karar süreçleri açık, anlaşılır, kapsamlı ve tutarlı şekilde tanımlanmış ve kamuoyu ile paylaşılmıştır. Sertifikalandırma ve diploma işlemleri bu tanımlı sürece uygun olarak yürütülmekte, izlenmekte ve gerekli önlemler alınmaktadır.",
    duzeyler: [
      "Kurumda diploma onayı ve diğer yeterliliklerin sertifikalandırılmasına ilişkin süreçler tanımlanmamıştır.",
      "Kurumda diploma onayı ve diğer yeterliliklerin sertifikalandırılması na ilişkin kapsamlı, tutarlı ve ilan edilmiş ilke, kural ve süreçler bulunmaktadır.",
      "Kurumun genelinde diploma onayı ve diğer yeterliliklerin sertifikalandırılmasın a ilişkin uygulamalar bulunmaktadır.",
      "Uygulamalar izlenmekte ve tanımlı süreçler iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğrencinin akademik ve kariyer gelişimini izlemek, diploma onayı ve yeterliliklerin sertifikalandırılmasına ilişkin tanımlı süreçler ve mevcut uygulamalar",
      "Merkezi yerleştirmeyle gelen öğrenci grupları dışında kalan yatay geçiş, yabancı uyruklu öğrenci sınavı (YÖS), çift anadal programı (ÇAP), yandal öğrenci kabullerinde uygulanan kriterler",
      "Öğrenci iş yükü kredisinin değişim programlarında herhangi bir ek çalışmaya gerek kalmaksızın tanındığını gösteren belgeler*",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 65,
  },
  {
    kod: "B.3.1",
    baslik: "Öğrenme ortam ve kaynakları",
    metin:
      "Sınıf, laboratuvar, kütüphane, stüdyo; ders kitapları, çevrimiçi (online) kitaplar/belgeler/videolar vb. kaynaklar uygun nitelik ve niceliktedir, erişilebilirdir ve öğrencilerin bilgisine/kullanımına sunulmuştur. Öğrenme ortamı ve kaynaklarının kullanımı izlenmekte ve iyileştirilmektedir. Kurumda eğitim-öğretim ihtiyaçlarına tümüyle cevap verebilen, kullanıcı dostu, ergonomik, eş zamanlı ve eş zamansız öğrenme, zenginleştirilmiş içerik geliştirme ayrıca ölçme ve değerlendirme ve hizmet içi eğitim olanaklarına sahip bir öğrenme yönetim sistemi bulunmaktadır. Öğrenme ortamı ve kaynakları öğrenci-öğrenci, öğrenci- öğretim elemanı ve öğrenci-materyal etkileşimini geliştirmeye yönelmektedir.",
    duzeyler: [
      "Kurumun eğitim- öğretim faaliyetlerini sürdürebilmek için yeterli kaynağı bulunmamaktadır.",
      "Kurumun eğitim-öğretim faaliyetlerini sürdürebilmek için uygun nitelik ve nicelikte öğrenme kaynaklarının (sınıf, laboratuvar, stüdyo, öğrenme yönetim sistemi, basılı/e-kaynak ve materyal, insan kaynakları vb.) oluşturulmasına yönelik planları vardır.",
      "Kurumun genelinde öğrenme kaynaklarının yönetimi alana özgü koşullar, erişilebilirlik ve birimler arası denge gözetilerek gerçekleştirilmektedir.",
      "Öğrenme kaynaklarının geliştirilmesine ve kullanımına yönelik izleme ve iyileştirilme yapılmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğrenme kaynakları ve bu kaynakların yeterlilik durumu, geliştirilmesine ilişkin planlamalar ve uygulamalar",
      "Öğrenme kaynaklarına erişilebilirlik kanıtları (Uzaktan eğitim dahil)",
      "Öğrenme yönetim sistemi uygulamalarına ilişkin örnekler",
      "Öğrencilere sunulan öğrenme kaynakları ile ilgili öğrenci geri bildirim araçları (Anketler vb.)",
      "Öğrenme kaynaklarının düzenli iyileştirildiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 66,
  },
  {
    kod: "B.3.2",
    baslik: "Akademik destek hizmetleri",
    metin:
      "Öğrencinin akademik gelişimini takip eden, yön gösteren, akademik sorunlarına ve kariyer planlamasına destek olan bir danışman öğretim üyesi bulunmaktadır. Danışmanlık sistemi öğrenci portfolyosu gibi yöntemlerle takip edilmekte ve iyileştirilmektedir. Öğrencilerin danışmanlarına erişimi kolaydır ve çeşitli erişimi olanakları (yüz yüze, çevrimiçi) bulunmaktadır. Psikolojik danışmanlık ve kariyer merkezi hizmetleri vardır, erişilebilirdir (yüz yüze ve çevrimiçi) ve öğrencilerin bilgisine sunulmuştur. Hizmetlerin yeterliliği takip edilmektedir.",
    duzeyler: [
      "Kurumda öğrencilerin akademik gelişimi ve kariyer planlamasına yönelik destek hizmetileri bulunmamaktadır.",
      "Kurumda öğrencilerin akademik gelişimi ve kariyer planlaması süreçlerine ilişkin tanımlı ilke ve kurallar bulunmaktadır.",
      "Kurumda öğrencilerin akademik gelişim ve kariyer planlamasına yönelik destek hizmetleri tanımlı ilke ve kurallar dahilinde yürütülmektedir.",
      "Kurumda öğrencilerin akademik gelişimi ve kariyer planlamasına ilişkin uygulamalar izlenmekte ve öğrencilerin katılımıyla iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğrenci danışmanlık sisteminde kullanılan tanımlı süreçler",
      "Varsa uzaktan eğitimde akademik ve teknik öğrenci danışmanlığı mekanizmaları ve tanımlı süreçler",
      "Öğrencilerin danışmanlara erişimine ilişkin mekanizmalar",
      "Rehberlik, psikolojik danışmanlık ve kariyer hizmetlerine ilişkin planlama ve uygulamalar",
      "Kariyer merkezi uygulamaları",
      "Öğrencilerin katılımına ilişkin kanıtlar",
      "Öğrencilere sunulan hizmetlerle ilgili öğrenci geri bildirim araçları (anketler vb.) sonuçları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 67,
  },
  {
    kod: "B.3.3",
    baslik: "Tesis ve altyapılar",
    metin:
      "Tesis ve altyapılar (yemekhane, yurt, teknoloji donanımlı çalışma alanları; sağlık, ulaşım, bilişim hizmetleri, uzaktan eğitim altyapısı) ihtiyaca uygun nitelik ve niceliktedir, erişilebilirdir ve öğrencilerin bilgisine/kullanımına sunulmuştur. Tesis ve altyapıların kullanımı irdelenmektedir. Kurumda uygun nitelik ve nicelikte tesisler ve altyapı bulunmamaktadır.",
    duzeyler: [
      "Kurumda uygun nitelik ve nicelikte tesis ve altyapının (yemekhane, yurt, sağlık, kütüphane, ulaşım, bilgi ve iletişim altyapısı, uzaktan eğitim altyapısı vb.)",
      "kurulmasına ve kullanımına ilişkin planlamalar bulunmaktadır.",
      "Kurumun genelinde tesis ve altyapı erişilebilirdir ve bunlardan fırsat eşitliğine dayalı olarak yararlanılmaktadır.",
      "Tesis ve altyapının kullanımı izlenmekte ve ihtiyaçlar doğrultusunda iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Tesis ve altyapının kullanımına yönelik ilke ve kurallar",
      "Erişim ve kullanıma ilişkin uygulamalar",
      "Tesis ve altyapının kurumsal büyüme ile ilişkili olarak gelişim durumu (Örneğin, birim sayısındaki artış ile fiziksel alanlardaki artış arasındaki ilişki gibi)",
      "Kurumda uzaktan eğitim programları ve uygulamaları varsa; bunlara yönelik alt yapı, tesis, donanım ve yazılım durumları",
      "Tesis ve altyapı hizmetlerinin izlenmesi, çeşitlendirilmesi ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 68,
  },
  {
    kod: "B.3.4",
    baslik: "Dezavantajlı gruplar",
    metin:
      "Dezavantajlı, kırılgan ve az temsil edilen grupların (engelli, yoksul, azınlık, göçmen vb.) eğitim olanaklarına erişimi eşitlik, hakkaniyet, çeşitlilik ve kapsayıcılık gözetilerek sağlanmaktadır. Uzaktan eğitim alt yapısı bu grupların ihtiyacı dikkate alınarak oluşturulmuştur. Üniversite yerleşkelerinde ihtiyaçlar doğrultusunda engelsiz üniversite uygulamaları bulunmaktadır. Bu grupların eğitim olanaklarına erişimi izlenmekte ve geri bildirimleri doğrultusunda iyileştirilmektedir.",
    duzeyler: [
      "Kurumda dezavantajlı grupların eğitim olanaklarına erişimine ilişkin planlamalar bulunmamaktadır.",
      "Dezavantajlı grupların eğitim olanaklarına nitelikli ve adil erişimine ilişkin planlamalar bulunmaktadır.",
      "Dezavantajlı grupların eğitim olanaklarına erişimine ilişkin uygulamalar yürütülmektedir.",
      "Dezavantajlı grupların eğitim olanaklarına erişimine yönelik uygulamalar izlenmekte ve dezavantajlı grupların görüşleri de alınarak iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Dezavantajlı öğrenci gruplarına sunulacak hizmetlerle ilgili planlama ve uygulamalar (Kurullarda temsil, engelsiz üniversite uygulamaları, varsa uzaktan eğitim süreçlerindeki uygulamalar vb.)",
      "Geri bildirimlerin iyileştirme mekanizmalarında kullanıldığına ilişkin belgeler",
      "Engelsiz üniversite uygulamalarına ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 69,
  },
  {
    kod: "B.3.5",
    baslik: "Sosyal, kültürel, sportif faaliyetler",
    metin:
      "Öğrenci toplulukları ve bu toplulukların etkinlikleri, sosyal, kültürel ve sportif faaliyetlerine yönelik mekân, bütçe ve rehberlik desteği vardır. Ayrıca sosyal, kültürel, sportif faaliyetleri yürüten ve yöneten idari örgütlenme mevcuttur. Gerçekleştirilen faaliyetler izlenmekte, ihtiyaçlar doğrultusunda iyileştirilmektedir.",
    duzeyler: [
      "Kurumda uygun nitelik ve nicelikte sosyal, kültürel ve sportif faaliyet olanakları bulunmamaktadır.",
      "Sosyal, kültürel ve sportif faaliyet olanaklarının yaratılmasına ilişkin planlamalar bulunmaktadır.",
      "Kurumun genelinde sosyal, kültürel ve sportif faaliyetler erişilebilirdir ve bunlardan fırsat eşitliğine dayalı olarak yararlanılmaktadır.",
      "Sosyal, kültürel ve sportif faaliyet mekanizmaları izlenmekte, İhtiyaçlar/talepler doğrultusunda faaliyetler çeşitlendirilmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Sosyal, kültürel ve sportif faaliyetlerin planlanması ve yürütülmesine ilişkin kanıtlar",
      "Yıl içerisinde öğrencilere yönelik yıllık sportif, kültürel, sosyal faaliyetlerin listesi (Faaliyet türü, konusu, katılımcı sayısı vb. bilgilerle)",
      "Faaliyetlerin erişilebilirliği ve fırsat eşitliğini gözettiğine dair kanıt örnekleri",
      "Sosyal, kültürel ve sportif faaliyetlerin izlenmesine ilişkin araçlar, izleme raporları, iyileştirme ve çeşitlendirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 70,
  },
  {
    kod: "B.4.1",
    baslik: "Atama, yükseltme ve görevlendirme kriterleri",
    metin:
      "Öğretim elemanı (uluslararası öğretim elemanları dahil) atama, yükseltme ve görevlendirme süreç ve kriterleri belirlenmiş ve kamuoyuna açıktır. İlgili süreç ve kriterler akademik liyakati gözetip, fırsat eşitliğini sağlayacak niteliktedir. Uygulamanın kriterlere uygun olduğu kanıtlanmaktadır. Öğretim elemanı ders yükü ve dağılım dengesi şeffaf olarak paylaşılır. Kurumun öğretim üyesinden beklentisi bireylerce bilinir. Kurum dışından ders vermek üzere görevlendirilenlerin seçiminde liyakate dikkat edilir ve yarıyıl sonunda performanslarının değerlendirilmesi şeffaf ve etkindir. Kurumda eğitim-öğretim ilkelerine ve kültürüne uyum gözetilmektedir. Kurumun atama, yükseltme ve görevlendirme süreçleri tanımlanmamı ştır.",
    duzeyler: [
      "Kurumun atama, yükseltme ve görevlendirme kriterleri tanımlanmış; ancak planlamada alana özgü ihtiyaçlar irdelenmemiştir.",
      "Kurumun tüm alanlar için tanımlı ve paydaşlarca bilinen atama, yükseltme ve görevlendirme kriterleri uygulanmakta ve karar almalarda (eğitim-öğretim kadrosunun işe alınması, atanması, yükseltilmesi ve ders görevlendirmeleri vb.)",
      "kullanılmaktadır.",
      "Atama, yükseltme ve görevlendirme uygulamalarının sonuçları izlenmekte ve izlem sonuçları değerlendirilerek önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Atama, yükseltme ve görevlendirme kriterleri",
      "Akademik kadronun uzmanlık alanı ile yürüttükleri ders arasında uyumun sağlanmasına yönelik uygulamalar",
      "İzleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 71,
  },
  {
    kod: "B.4.2",
    baslik: "Öğretim yetkinlikleri ve gelişimi",
    metin:
      "Öğretim yetkinliği geliştirme süreçleri ihtiyaç analizleri temelinde planlanır, yaygın biçimde yürütülür ve etkililiği düzenli olarak izlenir. Tüm öğretim elemanlarının etkileşimli- aktif ders verme yöntemlerini ve uzaktan eğitim süreçlerini öğrenmeleri ve kullanmaları için sistematik eğiticilerin eğitimi etkinlikleri (kurs, çalıştay, ders, seminer vb) ve bunu üstlenecek/ gerçekleştirecek öğretme-öğrenme merkezi yapılanması vardır. Öğretim elemanlarının pedagojik ve teknolojik yeterlilikleri artırılmaktadır. Kurumun öğretim yetkinliği geliştirme performansı değerlendirilmektedir.",
    duzeyler: [
      "Kurumda öğretim elemanlarının öğretim yetkinliğini geliştirmek üzere planlamalar bulunmamaktadır.",
      "Kurumun öğretim elemanlarının; öğrenci merkezli öğrenme, uzaktan eğitim, ölçme değerlendirme, materyal geliştirme ve kalite güvencesi sistemi gibi alanlardaki yetkinliklerinin geliştirilmesine ilişkin planlar bulunmaktadır.",
      "Kurumun genelinde öğretim elemanlarının öğretim yetkinliğini geliştirmek üzere uygulamalar vardır.",
      "Öğretim yetkinliğini geliştirme uygulamalarından elde edilen bulgular izlenmekte ve izlem sonuçları öğretim elamanları ile birlikte irdelenerek önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Eğiticilerin eğitimi uygulamalarına (Uzaktan eğitim uygulamaları dahil) ilişkin planlama (kapsamı, veriliş yöntemi, katılım bilgileri vb.) ve uygulamalara ilişkin kanıtlar",
      "Öğrenme öğretme merkezi uygulamalarına ilişkin kanıtlar",
      "Eğitim kadrosunun eğitim-öğretim performansını izleme süreçlerini gösteren belgeler ve dokümanlar (Atama-yükseltme kriterleri vb.)",
      "Öğretim elemanlarının izleme ve iyileştirme süreçlerine katılımını gösteren kanıtlar",
      "Öğretim yetkinliği geliştirme süreçlerine ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 72,
  },
  {
    kod: "B.4.3",
    baslik: "Eğitim faaliyetlerine yönelik teşvik ve ödüllendirme",
    metin:
      "Öğretim elemanları için yaratıcı/yenilikçi eğitimi uygulamalarını ve bu alandarekabeti arttırmak üzere “iyi eğitim ödülü” gibi teşvik ve ödüllendirme süreçleri vardır. Eğitim ve öğretimi önceliklendirmek üzere atama ve yükseltme kriterlerinde yaratıcı eğitim faaliyetlerine yer verilir.",
    duzeyler: [
      "Öğretim kadrosuna yönelik teşvik ve ödüllendirilme mekanizmaları bulunmamaktadır.",
      "Teşvik ve ödüllendirme mekanizmalarının; yetkinlik temelli, adil ve şeffaf biçimde oluşturulmasına yönelik planlar bulunmaktadır.",
      "Teşvik ve ödüllendirme uygulamaları kurum geneline yayılmıştır.",
      "Teşvik ve ödül uygulamaları izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Eğitim kadrosunun eğitim-öğretim performansını takdir-tanıma ve ödüllendirmek üzere yapılan planlama, uygulama ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 73,
  },
  {
    kod: "C.1.1",
    baslik: "Araştırma süreçlerinin yönetimi",
    metin:
      "Araştırma süreçlerin yönetimine ilişkin benimsenen yaklaşımlar, motivasyon ve yönlendirme işlevinin nasıl tasarlandığı, kısa ve uzun vadeli hedeflerin net ve kesin nasıl tanımlandığı, araştırma yönetimi ekibi ve görev tanımları belirlenmiştir; uygulamalar bu kurumsal tercihler yönünde gelişmektedir. Bilimsel araştırma ve sanatsal süreçlerin yönetiminin etkinliği ve başarısı izlenmekte ve iyileştirilmektedir.",
    duzeyler: [
      "Kurumda araştırma süreçlerinin yönetimi ve organizasyonel yapısına ilişkin bir planlama bulunmamaktad ır.",
      "Kurumun araştırma süreçlerinin yönetimi ve organizasyonel yapısına ilişkin yönlendirme ve motive etme gibi hususları dikkate alan planlamaları bulunmaktadır.",
      "Kurumun genelinde araştırma süreçlerin yönetimi ve organizasyonel yapısı kurumsal tercihler yönünde uygulanmaktadır.",
      "Kurumda araştırma süreçlerinin yönetimi ve organizasyonel yapısının işlerliği ile ilişkili sonuçlar izlenmekte ve önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Araştırma süreçlerin yönetimi ve organizasyon yapısı",
      "Araştırma yönetişim modeli ve uygulamaları",
      "Araştırma yönetimi ve organizasyonel yapının işlerliğinin izlendiği ve iyileştirildiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 74,
  },
  {
    kod: "C.1.2",
    baslik: "İç ve dış kaynaklar",
    metin:
      "Kurumun fiziki, teknik ve mali araştırma kaynakları misyon, hedef ve stratejileriyle uyumlu ve yeterlidir. Kaynakların çeşitliliği ve yeterliliği izlenmekte ve iyileştirilmektedir. Araştırmaya yeni başlayanlar için üniversite içi çekirdek fonlar vardır ve erişimi kolaydır. Araştırma potansiyelini geliştirmek üzere proje, konferans katılımı, seyahat, uzman daveti destekleri, kişisel fonlar, motivasyonu arttırmak üzere ödül ve rekabetçi yükseltme kriterleri vardır. Üniversite içi kaynakların yıllar içindeki değişimi; bu imkanların etkinliği, yeterliliği, gelişime açık alanları, beklentileri karşılama düzeyi değerlendirilmektedir. Misyon ve hedeflerle uyumlu olarak üniversite dışı kaynaklara yönelme desteklenmektedir. Bu amaçla çalışan destek birimleri ve yöntemleri tanımlıdır ve araştırmacılarca iyi bilinir.",
    duzeyler: [
      "Kurumun araştırma ve geliştirme faaliyetlerini sürdürebilmesi için yeterli kaynağı bulunmamaktadır.",
      "Kurumun araştırma ve geliştirme faaliyetlerini sürdürebilmek için uygun nitelik ve nicelikte fiziki, teknik ve mali kaynakların oluşturulmasına yönelik planları bulunmaktadır.",
      "Kurum araştırma ve geliştirme kaynaklarını araştırma stratejisi ve birimler arası dengeyi gözeterek yönetmektedir.",
      "Kurumda araştırma kaynaklarının yeterliliği ve çeşitliliği izlenmekte ve iyileştirilmektedir .",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Araştırma-geliştirme bütçesi ve dağılımı",
      "Araştırma çerçevesinde yapılan stratejik ortaklıklar (Kamu veya özel)",
      "Araştırma-geliştirme kaynaklarının araştırma stratejisi doğrultusunda yönetildiğini gösteren kanıtlar",
      "Araştırma kaynaklarının çeşitliliği ve yeterliliğinin izlendiğine ve iyileştirildiğine ilişkin kanıtlar",
      "İç kaynaklar ve kullanımına ilişkin tanımlı süreçler (BAP Yönergesi, İç Kaynak Kullanım Yönergesi vb.)",
      "İç kaynakların birimler arası dağılımı",
      "Dış kaynakların kullanımını desteklemek üzere oluşturulmuş yöntem ve birimler",
      "Dış kaynakların dağılımını gösteren kanıtlar",
      "Dış kaynaklarda yıllar itibarıyla gerçekleşen değişimler",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 75,
  },
  {
    kod: "C.1.3",
    baslik: "Doktora programları ve doktora sonrası imkanlar",
    metin:
      "Doktora programlarının başvuru süreçleri, kayıtlı öğrencileri ve mezun sayıları ile gelişme eğilimleri izlenmektedir. Kurumda doktora sonrası (post-doc) imkanları bulunmaktadır ve kurumun kendi mezunlarını işe alma (inbreeding) politikası açıktır.",
    duzeyler: [
      "Kurumun doktora programı ve doktora sonrası imkanları bulunmamaktadır.",
      "Kurumun araştırma politikası, hedefleri ve stratejileri ile uyumlu doktora programı ve doktora sonrası imkanlarına ilişkin planlamalar bulunmaktadır.",
      "Kurumda araştırma politikası, hedefleri ve stratejileri ile uyumlu ve destekleyen doktora programları ve doktora sonrası imkanlar yürütülmektedir.",
      "Kurumda doktora programları ve doktora sonrası imkanlarının çıktıları düzenli olarak izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Doktora programları ve doktora sonrası imkanlara ilişkin kanıtlar",
      "Bu programlar ve imkanlardan yararlanan öğrenci/araştırmacı sayıları ve bunların birimlere göre dağılımı",
      "Doktora programları ve doktora sonrası imkanlara yönelik izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 76,
  },
  {
    kod: "C.2.1",
    baslik: "Araştırma yetkinlikleri ve gelişimi",
    metin:
      "Doktora derecesine sahip araştırmacı oranı, doktora derecesinin alındığı kurumların dağılımı; kümelenme/ uzmanlık birikimi, araştırma hedefleri ile örtüşme konularının analizi, hedeflerle uyumu irdelenmektedir. Akademik personelin araştırma ve geliştirme yetkinliğini geliştirmek üzere eğitim, çalıştay, proje pazarları vb. gibi sistematik faaliyetler gerçekleştirilmektedir.",
    duzeyler: [
      "Kurumda, öğretim elemanlarının araştırma yetkinliğinin geliştirilmesine yönelik mekanizmalar bulunmamaktadır.",
      "Kurumda, öğretim elemanlarının araştırma yetkinliğinin geliştirilmesine yönelik planlar bulunmaktadır.",
      "Kurumun genelinde öğretim elemanlarını n araştırma yetkinliğinin geliştirilmesi ne yönelik uygulamalar yürütülmekte dir.",
      "Kurumda, öğretim elemanlarının araştırma yetkinliğinin geliştirilmesine yönelik uygulamalar izlenmekte ve izlem sonuçları öğretim elemanları ile birlikte değerlendirilerek önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Öğretim elemanlarının araştırma yetkinliğinin geliştirilmesine yönelik planlama ve uygulamalar (destekleyici eğitimler, uluslararası fırsatlar, proje iş birliği çalışmaları vb.)",
      "Öğretim elemanlarının geri bildirimleri",
      "Öğretim elemanlarının araştırma yetkinliğinin izlenmesi ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 77,
  },
  {
    kod: "C.2.2",
    baslik: "Ulusal ve uluslararası ortak programlar ve ortak araştırma birimleri",
    metin:
      "Kurumlararası işbirliklerini, disiplinlerarası girişimleri, sinerji yaratacak ortak girişimleri özendirecek mekanizmalar mevcuttur ve etkindir. Ortak araştırma veya lisansüstü programları, araştırma ağlarına katılım, ortak araştırma birimleri varlığı, ulusal ve uluslararası işbirlikleri gibi çoklu araştırma faaliyetleri tanımlanmıştır, desteklenmektedir ve sistematik olarak izlenerek kurumun hedefleriyle uyumlu iyileştirmeler gerçekleştirilmektedir.",
    duzeyler: [
      "Kurumda ulusal ve uluslararası düzeyde ortak programlar ve ortak araştırma birimleri oluşturma yönünde mekanizmalar bulunmamaktadır.",
      "Kurumda ulusal ve uluslararası düzeyde ortak programlar ve ortak araştırma birimleri ile araştırma ağlarına katılım ve iş birlikleri kurma gibi çoklu araştırma faaliyetlerine yönelik planlamalar ve mekanizmalar bulunmaktadır.",
      "Kurumun genelinde ulusal ve uluslararası düzeyde ortak programlar ve ortak araştırma faaliyetleri yürütülmektedir.",
      "Kurumda ulusal ve uluslararası düzeyde kurum içi ve kurumlar arası ortak programlar ve ortak araştırma faaliyetleri izlenmekte ve ilgili paydaşlarla değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Ulusal ve uluslararası düzeyde ortak programlar ve ortak araştırma birimleri oluşturulmasına yönelik mekanizmalar",
      "Kurumun dahil olduğu araştırma ağları, kurumun ortak programları ve araştırma birimleri, ortak araştırmalardan üretilen çalışmalar",
      "Paydaş geri bildirimleri",
      "Ortak programlar ve ortak araştırma faaliyetlerinin izlenmesine ve iyileştirilmesine yönelik kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 78,
  },
  {
    kod: "C.3.1",
    baslik: "Araştırma performansının izlenmesi ve değerlendirilmesi",
    metin:
      "Kurum araştırma faaliyetleri yıllık bazda izlenir, değerlendirilir, hedeflerle karşılaştırılır ve sapmaların nedenleri irdelenir. Kurumun odak alanlarının üniversite içi bilinirliği, üniversite dışı bilinirliği; uluslararası görünürlük, uzmanlık iddiası konularının analizi, hedeflerle uyumu sistematik olarak analiz edilir. Performans temelinde teşvik ve takdir mekanizmaları kullanılır. Rakiplerle rekabet, seçilmiş kurumlarla kıyaslama (benchmarking) takip edilir. Performans değerlendirmelerinin sistematik ve kalıcı olması sağlanmaktadır.",
    duzeyler: [
      "Kurumda araştırma performansının izlenmesine ve değerlendirmesine yönelik mekanizmalar bulunmamaktadır.",
      "Kurumda araştırma performansının izlenmesine ve değerlendirmesine yönelik ilke, kural ve göstergeler bulunmaktadır.",
      "Kurumun genelinde araştırma performansını izlenmek ve değerlendirmek üzere oluşturulan mekanizmalar kullanılmaktadır.",
      "Kurumda araştırma performansı izlenmekte ve ilgili paydaşlarla değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Araştırma performansını izlemek üzere geçerli olan tanımlı süreçler",
      "Araştırma hedeflerine ulaşılıp ulaşılmadığını izlemek üzere oluşturulan mekanizmalar",
      "Paydaş geri bildirimleri",
      "Araştırma performansının izlenmesine ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 79,
  },
  {
    kod: "C.3.2",
    baslik: "Öğretim elemanı/araştırmacı performansının değerlendirilmesi",
    metin:
      "Öğretim elemanlarının araştırma performansını paylaşması beklenir; bunu düzenleyen tanımlı süreçler vardır ve bunlar ilgili paydaşlarca bilinir. Araştırma performansı yıl bazında izlenir, değerlendirilir ve kurumsal politikalar doğrultusunda kullanılır. Ç ıktılar, grubun ortalama değerleri ve saçılım şeffaf olarak paylaşılır. Performans değerlendirmelerinin sistematik ve kalıcı olması sağlanmıştır.",
    duzeyler: [
      "Kurumda öğretim elemanlarının araştırma performansının izlenmesine ve değerlendirmesine yönelik mekanizmalar bulunmamaktadır.",
      "Kurumda öğretim elemanlarının araştırma performansının izlenmesine ve değerlendirmesine yönelik ilke, kural ve göstergeler bulunmaktadır.",
      "Kurumun genelinde öğretim elemanlarının araştırma- geliştirme performansını izlemek ve değerlendirmek üzere oluşturulan mekanizmalar kullanılmaktadır.",
      "Öğretim elemanlarının araştırma- geliştirme performansı izlenmekte ve öğretim elemanları ile birlikte değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Akademik personelin araştırma-geliştirme performansını izlemek üzere geçerli olan tanımlı süreçler (Yönetmelik, yönerge, süreç tanımı, ölçme araçları, rehber, kılavuz, takdir-tanıma sistemi, teşvik mekanizmaları vb.)",
      "Öğretim elemanlarının araştırma performansına yönelik analiz raporları",
      "Öğretim elemanlarının geri bildirimleri",
      "Araştırma geliştirme performansına ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 80,
  },
  {
    kod: "D.1.1",
    baslik: "Toplumsal katkı süreçlerinin yönetimi",
    metin:
      "Kurumun toplumsal katkı politikası kurumun toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısı kurumsallaşmıştır. Toplumsal katkı süreçlerinin yönetim ve organizasyonel yapısı kurumun toplumsal katkı politikası ile uyumludur, görev tanımları belirlenmiştir. Yapının işlerliği izlenmekte ve bağlı iyileştirmeler gerçekleştirilmektedir.",
    duzeyler: [
      "Kurumda toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısına ilişkin bir planlama bulunmamaktadır.",
      "Kurumun toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısına ilişkin planlamaları bulunmaktadır.",
      "Kurumun genelinde toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısı kurumsal tercihler yönünde uygulanmaktadır.",
      "Kurumda toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısının işlerliği ile ilişkili sonuçlar izlenmekte ve önlemler alınmaktadır.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Toplumsal katkı süreçlerinin yönetimi ve organizasyon yapısı",
      "Toplumsal katkı yönetişim modeli",
      "Toplumsal katkı faaliyetlerini yürüten birimler ve uygulama örnekleri",
      "Toplumsal katkı süreçlerinin yönetimi ve organizasyonel yapısının işlerliğine ilişkin izleme ve iyileştirme kanıtları",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 81,
  },
  {
    kod: "D.1.2",
    baslik: "Kaynaklar",
    metin:
      "Toplumsal katkı etkinliklerine ayrılan kaynaklar (mali, fiziksel, insan gücü) belirlenmiş, paylaşılmış ve kurumsallaşmış olup, bunlar izlenmekte ve değerlendirilmektedir.",
    duzeyler: [
      "Kurumun toplumsal katkı faaliyetlerini sürdürebilmesi için yeterli kaynağı bulunmamaktadır.",
      "Kurumun toplumsal katkı faaliyetlerini sürdürebilmek için uygun nitelik ve nicelikte fiziki, teknik ve mali kaynakların oluşturulmasına yönelik planları bulunmaktadır.",
      "Kurum toplumsal katkı kaynaklarını toplumsal katkı stratejisi ve birimler arası dengeyi gözeterek yönetmektedir.",
      "Kurumda toplumsal katkı kaynaklarının yeterliliği ve çeşitliliği izlenmekte ve iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Toplumsal katkı faaliyetlerini yürüten araştırma ve uygulama merkezleri ve diğer birimler",
      "Toplumsal katkı çalışmalarına ayrılan bütçe ve yıllar içinde değişimi",
      "Toplumsal katkı kaynaklarının toplumsal katkı stratejisi doğrultusunda yönetildiğini gösteren kanıtlar",
      "Toplumsal katkı kaynaklarının çeşitliliği ve yeterliliğinin izlendiğine ve iyileştirildiğine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 82,
  },
  {
    kod: "D.2.1",
    baslik: "Toplumsal katkı performansının izlenmesi ve değerlendirilmesi",
    metin:
      "Kurum, BM Sürdürülebilir Kalkınma Amaçları ile uyumlu, dezavantajlı gruplar dahil toplumun ve çevrenin ihtiyaçlarına cevap verebilen ve değer yaratan toplumsal katkı faaliyetlerinde bulunmaktadır. Ulusal ve uluslararası düzeyde kurumsal iş birlikleri, çeşitli kamu kurum ve kuruluşlarına yapılan görevlendirmeler ile kurumun bünyesinde yer alan birimler aracılığıyla yürütülen eğitim, hizmet, araştırma, danışmanlık vb. toplumsal katkı faaliyetleri izlenmektedir. İzleme mekanizma ve süreçleri yerleşik ve sürdürülebilirdir. İyileştirme adımlarının kanıtları vardır.",
    duzeyler: [
      "Kurumda toplumsal katkı performansının izlenmesine ve değerlendirmesine yönelik mekanizmalar bulunmamaktadır.",
      "Kurumda toplumsal katkı performansının izlenmesine ve değerlendirmesine yönelik ilke, kural ve göstergeler bulunmaktadır.",
      "Kurumun genelinde toplumsal katkı performansını izlenmek ve değerlendirmek üzere oluşturulan mekanizmalar kullanılmaktadır.",
      "Kurumda toplumsal katkı performansı izlenmekte ve ilgili paydaşlarla değerlendirilerek iyileştirilmektedir.",
      "İçselleştirilmiş, sistematik, sürdürülebilir ve örnek gösterilebilir uygulamalar bulunmaktadır.",
    ],
    ornekKanitlar: [
      "Kurumun hedefleriyle uyumlu toplumsal katkı faaliyetleri",
      "Toplumsal katkı performansını izlemek üzere geçerli olan tanımlı süreçler",
      "Toplumsal katkı hedeflerine ulaşılıp ulaşılmadığını izlemek üzere oluşturulan mekanizmalar",
      "Paydaş geri bildirimleri",
      "Toplumsal katkı performansının izlenmesine ve iyileştirilmesine ilişkin kanıtlar",
      "Standart uygulamalar ve mevzuatın yanı sıra; kurumun ihtiyaçları doğrultusunda geliştirdiği özgün yaklaşım ve uygulamalarına ilişkin kanıtlar",
    ],
    sayfa: 83,
  },
];

/** Ayrıştırıcının bu belgede verdiği uyarılar (ilgili alanlar DOĞRULANMADI işaretlenir). */
export const YOKAK_ANAHTAR_3_3_UYARILAR: readonly string[] = [
  "A.4.1 (50. sayfa): düzey sütunları ayrıştırılamadı.",
  "B.2.2 (63. sayfa): düzey sütunları ayrıştırılamadı.",
];
