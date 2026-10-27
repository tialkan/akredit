// Kullanıcı kılavuzları (İP-29). Metinler veridir: sayfalar bunlardan çizilir, testler sadelik ve dürüstlük
// kurallarını bunlar üzerinde denetler. Her kılavuz yalnız bugün çalışan özellikleri anlatır; henüz olmayanlar
// "Şu an yapılamayanlar" bölümünde açıkça yazılır.

export type Okur = "hoca" | "kalite" | "bilgi-islem";

export interface Bolum {
  baslik: string;
  paragraflar?: string[];
  adimlar?: string[];
}

export interface Kilavuz {
  yol: string;
  baslik: string;
  okur: Okur;
  ozet: string;
  /** Okuma süresi (dakika): kelime sayısından hesaplanmaz, elle yazılır ve testte üst sınırla denetlenir. */
  dakika: number;
  bolumler: Bolum[];
  /** Bugün çalışmayan ya da yalnız örnek veriyle görünen kısımlar. Boş bırakılamaz: dürüstlük gereği. */
  sinirlar: string[];
  /** Panelde ilgili sayfa (varsa). */
  panel?: string;
}

export const OKUR_ADI: Record<Okur, string> = {
  hoca: "Öğretim elemanları için",
  kalite: "Kalite birimi ve komisyonlar için",
  "bilgi-islem": "Bilgi işlem için",
};

export const KILAVUZLAR: Kilavuz[] = [
  {
    yol: "onay-vermek",
    baslik: "Önerilere karar vermek",
    okur: "hoca",
    ozet: "Akredit işi hazırlar, size yalnız karar kalır. Bu kılavuz onay kutusunu anlatır.",
    dakika: 3,
    panel: "/panel/onaylar",
    bolumler: [
      {
        baslik: "Onay kutusu nedir?",
        paragraflar: [
          "Akredit'in hazırladığı her şey önce size öneri olarak gelir. Siz onaylamadan hiçbir öneri kesinleşmez.",
          "Her önerinin yanında dayandığı belge ve o belgeden kısa bir alıntı vardır. Kararı vermeden önce alıntıya bakabilirsiniz.",
        ],
      },
      {
        baslik: "Bir öneriye karar vermek",
        adimlar: [
          "Sol menüden Onaylar sayfasını açın.",
          "Öneriyi ve dayandığı alıntıyı okuyun.",
          "Doğruysa Onayla düğmesine basın.",
          "Küçük bir yanlış varsa Düzelt'e basın, metni düzeltin ve kaydedin.",
          "Yanlışsa Reddet'e basın ve kısa bir gerekçe yazın.",
        ],
      },
      {
        baslik: "Risk düzeyleri",
        paragraflar: [
          "Öneriler düşük, orta ve yüksek risk olarak işaretlenir. Renk, simge ve yazı birlikte gösterilir.",
          "Düşük ve orta riskli önerileri seçip birlikte onaylayabilirsiniz.",
          "Yüksek riskli öneriler tek tek onaylanır. Kurum adına beyan, ders dosyasının son onayı ve toplantı tutanağı bu gruptadır.",
        ],
      },
      {
        baslik: "Klavyeyle hızlı çalışmak",
        paragraflar: [
          "J sonraki öneriye, K önceki öneriye gider. A onaylar, D düzeltir, R reddeder, X seçer. Soru işareti kısayol listesini açar.",
          "Kısayollar bir yazı alanına yazarken çalışmaz.",
        ],
      },
      {
        baslik: "Kararınız nereye yazılır?",
        paragraflar: [
          "Her karar adınız ve saatiyle kalıcı olarak kaydedilir. Kayıt sonradan değiştirilemez. Fikrinizi değiştirirseniz yeni bir karar kaydı eklenir.",
        ],
      },
    ],
    sinirlar: [
      "E-postadaki bağlantıyla karar verme altyapısı hazırdır, ancak kurumunuzda e-posta gönderimi açılmadıysa bu e-postalar gelmez.",
      "Telefon için ayrı bir uygulama yoktur. Onay kutusu telefon tarayıcısında çalışır.",
    ],
  },
  {
    yol: "belge-eklemek",
    baslik: "Belge eklemek",
    okur: "hoca",
    ozet: "Belgeler Akredit'te kanıt olarak saklanır. Bu kılavuz belgelerin nasıl geldiğini ve bugün neler yapılabildiğini anlatır.",
    dakika: 3,
    panel: "/panel/kanitlar",
    bolumler: [
      {
        baslik: "Kanıt nedir?",
        paragraflar: [
          "Kanıt, bir raporda ya da öneride söylenenin dayandığı belgedir: sınav kâğıdı, not listesi, toplantı notu, ders bilgi paketi gibi.",
          "Eklenen belge silinmez ve üzerine yazılmaz. Yeni bir sürüm eklerseniz ayrı kayıt olur.",
        ],
      },
      {
        baslik: "Belgeler bugün hangi yollarla gelir?",
        adimlar: [
          "Ders sayfasındaki Ders dosyası kartından dönem sonu not dökümünü yüklediğinizde döküm kanıt olur.",
          "Kalite birimi programın ders bilgi paketlerini okuttuğunda bu sayfalar kanıt olur.",
          "Toplantı notları kanıt olarak eklenir ve tutanak taslağı bunlardan hazırlanır.",
        ],
      },
      {
        baslik: "Kanıtları görmek",
        adimlar: [
          "Sol menüden Kanıtlar sayfasını açın.",
          "Arama kutusuna belge adını ya da bir kelime yazın.",
          "Bir kanıta tıklayınca içeriğini, nereden geldiğini ve işlenme durumunu görürsünüz.",
        ],
      },
      {
        baslik: "Kişisel veriler",
        paragraflar: [
          "Öğrenci numaraları kaydedilmeden önce takma ada çevrilir. Öğrenci adları okunmaz.",
          "Kişisel veri içeren belgeler, kurumunuz izin vermedikçe yurt dışındaki bir yapay zekâ hizmetine gönderilmez.",
        ],
      },
    ],
    sinirlar: [
      "Kanıtlar sayfasındaki Kanıt yükle alanı şu an yalnız ön izlemedir: dosya kaydedilmez. Belgeyi ders dosyası kartından ya da kalite birimi aracılığıyla ekleyin.",
      "E-postayla ve bulut klasöründen belge alma hazırlanmıştır, ancak kurumunuz için ayrıca açılması gerekir.",
    ],
  },
  {
    yol: "ders-dosyasi",
    baslik: "Ders dosyası hazırlamak",
    okur: "hoca",
    ozet: "Dönem sonunda tek bir yükleme ve iki onayla ders dosyanız ve ölçme raporunuz hazır olur.",
    dakika: 4,
    panel: "/panel/dersler",
    bolumler: [
      {
        baslik: "Ne hazırlanır?",
        paragraflar: [
          "Word biçiminde ders dosyası: ders bilgileri, sınavlar, soru ve öğrenme çıktısı eşlemesi, sonuçlar, örnek kâğıtlar, iyileştirme taslağı ve imza sayfası.",
          "Excel biçiminde ölçme raporu: öğrenme çıktılarının ve program çıktılarının sağlanma düzeyi, not dağılımı, soru analizi.",
          "Bütün sayılar notlarınızdan hesapla bulunur. Yapay zekâ sayı yazmaz.",
        ],
      },
      {
        baslik: "Adımlar",
        adimlar: [
          "Dersler sayfasından dersinizi açın.",
          "Ders dosyası kartında, öğrenci bilgi sisteminden aldığınız soru bazlı not dökümünü seçip Dökümü yükle'ye basın.",
          "Onaylar sayfasında soru ve öğrenme çıktısı eşlemesi önerisini kontrol edin; doğruysa onaylayın, değilse düzeltin.",
          "Eşleme onaylanınca hesaplar kendiliğinden yapılır ve ders dosyası hazırlanır.",
          "Ders dosyasını indirip okuyun. Onaylar sayfasında ders dosyası onayını verin.",
        ],
      },
      {
        baslik: "Sonraki dönemler",
        paragraflar: [
          "Bir sonraki dönem aynı dersin onaylı eşlemesi yeniden önerilir. Sınav yapınız değişmediyse yalnız onaylamanız yeterlidir.",
        ],
      },
      {
        baslik: "Taslak ve onaylı dosya farkı",
        paragraflar: [
          "Onay verilmeden indirilen dosyanın başında “Taslak — onaylanmadı” yazar ve imza sayfası boş kalır. Onaydan sonra onaylayanın adı ve tarihi yazılır.",
        ],
      },
    ],
    sinirlar: [
      "Bu özellik yalnız kurumunuzun gerçek verisiyle çalışır. Tanıtım sitesindeki örnek panelde yükleme yapılamaz.",
      "Not dökümünde her sorunun tam puanı bulunmalıdır. Bulunamazsa yükleme ne yapılacağını söyleyen bir iletiyle durur.",
      "Aynı dönemin dökümü ikinci kez yüklenemez.",
    ],
  },
  {
    yol: "rapor",
    baslik: "Rapor taslaklarını okumak",
    okur: "hoca",
    ozet: "Raporlarda her paragraf bir kanıta bağlıdır. Bağlanamayan yerler EKSİK diye işaretlenir.",
    dakika: 3,
    panel: "/panel/raporlar",
    bolumler: [
      {
        baslik: "Bir raporu açmak",
        adimlar: [
          "Sol menüden Raporlar sayfasını açın.",
          "Raporun adına tıklayın. Başlığın altında kaç paragrafın kanıta bağlı, kaçının eksik olduğu yazar.",
          "Bir paragrafın yanındaki kaynak bağlantısına basınca dayandığı belgeyi ve alıntıyı görürsünüz.",
        ],
      },
      {
        baslik: "EKSİK işareti ne demek?",
        paragraflar: [
          "Akredit, belgesi olmayan bir şeyi yapılmış gibi yazmaz. Belgesi bulunamayan yer EKSİK olarak bırakılır.",
          "EKSİK bir yeri tamamlamak için ilgili belgeyi ekleyin ya da o işin yapılması için bir eylem planlayın.",
        ],
      },
      {
        baslik: "Kim gönderir?",
        paragraflar: [
          "Raporun dış kuruma gönderimi her zaman yetkili bir kişinin kararıdır. Akredit raporu sizin yerinize göndermez.",
        ],
      },
    ],
    sinirlar: [
      "Program öz değerlendirme raporu ve kurum iç değerlendirme raporu üretimi henüz yapım aşamasındadır. Raporlar sayfası şu an örnek taslaklarla çalışır.",
      "Hazır olan rapor belgeleri ders dosyası ve ölçme raporudur.",
    ],
  },
  {
    yol: "kalite-birimi",
    baslik: "Kalite birimi kılavuzu",
    okur: "kalite",
    ozet: "Çerçeve seçimi, süreç takvimi ve yetki politikaları: kalite biriminin Akredit'te karar verdiği konular.",
    dakika: 6,
    panel: "/panel/ayarlar",
    bolumler: [
      {
        baslik: "Çerçeve seçimi",
        paragraflar: [
          "Çerçeve, kurumunuzun ya da programınızın uyduğu akreditasyon ölçütleri takımıdır. Akredit ölçütlerin resmî metnini yalnız resmî belgeden alır; metni hafızadan yazmaz.",
          "Raporlar ve kanıt etiketleri seçilen çerçevenin ölçütlerine bağlanır.",
        ],
      },
      {
        baslik: "Süreç takvimi",
        paragraflar: [
          "Kalite işleri hazır süreçlerle yürür. Hazır süreçler: dönem sonu ders dosyası ve ölçme, yıllık birim ve kurum iç değerlendirme takvimi, anket döngüsü, danışma kurulu toplantısı, iyileştirme eylemi izleme, program akreditasyonu başvurusu ve Bologna güncelleme haftası.",
          "Her adımın sorumlusu, son tarihi ve gereken en az kanıtı vardır. Kanıt bağlanmadan görev kapanmaz.",
          "Hatırlatmalar sessiz saatlere uyar. Gecikmede görev bir üst sorumluya bildirilir. Akademik takvim dosyası içe aktarılabilir; görevler takvim dosyası olarak dışa verilebilir.",
        ],
        adimlar: [
          "Takvim ve görevler sayfasında yaklaşan son tarihleri ve sorumluları izleyin.",
          "Geciken görevlerin sorumlusuyla görüşün; gerekirse sorumluyu değiştirin.",
        ],
      },
      {
        baslik: "Yetki politikaları",
        paragraflar: [
          "Politika, belirli türdeki önerilerin bir yetkili adına kendiliğinden onaylanmasıdır. Hocanın iş yükünü en çok azaltan ayardır.",
          "Politika ancak yetkili kişi adını yazarak imzaladığında yürürlüğe girer. İmza adıyla ve tarihiyle kaydedilir.",
          "Politikanın kapsamı bellidir: hangi öneri türleri, en yüksek hangi risk, en düşük hangi güven oranı.",
          "Yüksek riskli işler hiçbir politikayla onaylanamaz. İmzalayanın yetkisi biterse politika da işlemez.",
        ],
        adimlar: [
          "Ayarlar sayfasında Yetki politikaları bölümünü açın.",
          "İmza bekleyen politikanın türlerini ve sınırlarını okuyun.",
          "Uygunsa adınızı yazıp İmzala'ya basın.",
        ],
      },
      {
        baslik: "Yapay zekâ hizmeti ve kişisel veri",
        paragraflar: [
          "Ayarlar sayfasında önerileri hazırlayan hizmeti seçersiniz. Varsayılan olarak yurt dışındaki hizmetler kapalıdır.",
          "Yurt dışı izni kurumun veri sorumlusuyla birlikte verilmelidir. İzin açıkken bile öğrenci kimlikleri takma adla gider.",
        ],
      },
      {
        baslik: "Dış değerlendirici erişimi",
        paragraflar: [
          "Dış değerlendiriciye süreli ve yalnız okunabilir bir erişim verilebilir. Değerlendirici hiçbir kaydı değiştiremez.",
          "Değerlendiricinin baktığı her belge ve sorduğu her soru kaydedilir. Bu kayıtları erişim günlüğünde görürsünüz.",
        ],
      },
      {
        baslik: "Hoca başına harcanan süre",
        paragraflar: [
          "Karar ekranında geçen süre kaydedilir. Bu sayede hocaların kalite işlerine ayırdığı zaman ölçülür ve pilot sonunda raporlanır.",
        ],
      },
    ],
    sinirlar: [
      "Çerçeve seçimi ve süreç takviminin ayarlanması şu an panelden yapılamaz; kurulum sırasında birlikte tanımlanır.",
      "Çerçeve ölçüt verisi bir kalite uzmanının doğrulamasını beklemektedir.",
      "Göstergeler ve takvim sayfaları şu an örnek veriyle görünür.",
      "Kurum iç değerlendirme raporu ve olgunluk değerlendirmesi yapım aşamasındadır.",
    ],
  },
  {
    yol: "bilgi-islem",
    baslik: "Bilgi işlem kılavuzu",
    okur: "bilgi-islem",
    ozet: "Kurumsal giriş, kurulum, yapay zekâ hizmeti ve yedekleme hakkında bilgi işlem birimlerinin bilmesi gerekenler.",
    dakika: 5,
    bolumler: [
      {
        baslik: "Kurumsal giriş",
        paragraflar: [
          "Kullanıcılar e-postalarına gelen tek kullanımlık bağlantıyla ya da kurumunuzun kendi giriş sistemiyle girer. Akredit parola saklamaz.",
          "Kurumsal giriş için iki yaygın standart desteklenir. Kurumunuzun giriş sistemi bilgilerini bizimle paylaşmanız yeterlidir; ayrıntılı ayarlar depodaki bilgi işlem belgesindedir.",
          "Giriş bilgileri, oturum bilgileri ve doğrulama kodları kayıtlara ve yapay zekâya hiçbir zaman verilmez.",
        ],
      },
      {
        baslik: "Barındırma ve kurulum",
        paragraflar: [
          "akredit.org Türkiye'deki bir veri merkezinde, her kurum için ayrı tutulan verilerle çalışacak biçimde hazırlanmıştır.",
          "Kurulum, yayın ve geri alma adımları depoda yazılıdır.",
        ],
      },
      {
        baslik: "Yapay zekâ hizmeti",
        paragraflar: [
          "Akredit belirli bir yapay zekâ firmasına bağlı değildir. Yurt içi bir hizmet, kurumunuzun kendi model sunucusu ya da izin verilirse yurt dışı bir hizmet kullanılabilir.",
          "Belgelerdeki metinler yapay zekâya talimat olarak verilmez; yalnız veri olarak işlenir.",
        ],
      },
      {
        baslik: "Yedekleme",
        paragraflar: [
          "Bütün kayıtlar sürekli yedeklenir; hedeflenen en büyük veri kaybı birkaç dakikadır. Yedekler Türkiye'de ikinci bir konumda, silinemez biçimde tutulur.",
          "Geri dönüş deneme ortamında sınanmıştır.",
        ],
      },
    ],
    sinirlar: [
      "Kurum içi kurulum paketi ve kurum kendi model sunucusuyla hazır kurulum henüz yoktur; yol haritasındadır.",
      "Gerçek sunucu kurulumu ve canlı ortamda geri dönüş denemesi henüz yapılmamıştır.",
      "Bağımsız güvenlik testi henüz yapılmamıştır.",
    ],
  },
];

export function kilavuzBul(yol: string): Kilavuz | undefined {
  return KILAVUZLAR.find((k) => k.yol === yol);
}

/** Kılavuzun bütün düz metinleri (başlıklar dahil). Testler sadelik denetimini bunun üzerinde yapar. */
export function metinleri(k: Kilavuz): string[] {
  return [
    k.baslik,
    k.ozet,
    ...k.bolumler.flatMap((b) => [b.baslik, ...(b.paragraflar ?? []), ...(b.adimlar ?? [])]),
    ...k.sinirlar,
  ];
}
