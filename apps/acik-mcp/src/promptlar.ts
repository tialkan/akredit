// MCP istemleri (prompts). İstemciler bunları eğik çizgi komutu ya da hazır başlangıç olarak gösterir.
// İstem asistana akışı tarif eder: kısa sorular, her adımda 2-3 numaralı seçenek, tek rakam ya da harfle seçim,
// toplu onay, sonunda kopyalanabilir çıktı. İstem metni veri değil asistana yönergedir; içinde hocanın girdisi
// yalnız isteğe bağlı kısa bağımsız değişkenler olarak yer alır (ders kodu, çerçeve) ve sınırlanır.
//
// Kullanıcılar yapay zekâyı ilk kez kullanan öğretim elemanlarıdır: her adım tek iş, sade dil, ekranda ne
// görüleceği söylenir. Giriş bilgisi (parola, doğrulama kodu, çerez) asistana asla verilmez (ilke 8).

import { z } from "zod";
import { GIRIS_KURALI_HOCAYA } from "./yardim.ts";

export interface AcikIstem {
  ad: string;
  baslik: string;
  aciklama: string;
  /** Bağımsız değişkenler: hepsi isteğe bağlı kısa metin. */
  argumanlar: Record<string, string>;
  metin: (a: Record<string, string | undefined>) => string;
}

/** Giriş bilgisi kuralı: bütün istemlerde aynen yer alır. */
export const GIRIS_BILGISI_KURALI = [
  "Giriş bilgisi kuralı (değişmez):",
  "- Hocadan kullanıcı adı, parola, doğrulama kodu, SMS kodu ya da çerez asla isteme. Bunları sohbete yazmasını önerme.",
  "- Hoca bunları kendisi yalnız OBS'nin kendi giriş ekranına yazar. Bunu hocaya ilk adımda açıkça söyle.",
  "- Hoca yine de sohbete parola yazarsa kullanma, hiçbir araca gönderme; silmesini ve OBS'de parolasını değiştirmesini öner.",
  "- CAPTCHA'yı sen çözmezsin, hoca çözer. OBS'de Kaydet ya da Gönder düğmesine sen basmazsın, hoca basar.",
].join("\n");

/** Bütün istemlerde ortak çalışma biçimi. */
export const ORTAK_KURALLAR = [
  "Çalışma biçimi:",
  "- Karşındaki hoca yapay zekâyı belki ilk kez kullanıyor. Kısa, sade Türkçe yaz. Araç adı, JSON ve teknik terim gösterme.",
  "- Her mesajda tek iş iste. Ne yapacağını ve ekranda ne göreceğini söyle.",
  "- Her adımda tek kısa soru sor ve 2-3 numaralı seçenek ver. İlk seçenek önerilendir, yanına (önerilen) yaz.",
  '- Hoca tek rakam ya da harfle seçer. "sen seç" derse önerileni seç ve bunu söyle.',
  '- Toplu onayı kabul et: "hepsini 1 ile doldur", "hepsi 1", "hepsi A" gibi bir yanıt kalan bütün adımlara uygulanır; her adımı yeniden sorma.',
  "- Sunucu metin üretmez. Seçenek metinlerini sen yazarsın; sunucu kural verir, denetler ve sayıları hesaplar.",
  "- Sayıları (toplam, yüzde, iş yükü, sağlanma düzeyi) yalnız araç yanıtından al, kendin toplama.",
  "- Uydurma: kişi, kitap, ISBN, tarih, toplantı, sayı uydurma. Kaynak önerirken yalnız hocanın verdiği ya da kendi web aracınla doğruladığın eseri öner. Hocanın vermediği bilgi EKSİK kalır.",
  "- Kişisel veri gönderme: öğrenci adı ve numarası, e-posta, telefon. Öğrenciler için o1, o2 gibi takma ad kullan. Kaynakçadaki yazar adları künyedir, kaynak alanında gönderilebilir.",
  "- Engel çıkarsa (tarayıcı aracı yok, site açılmıyor, giriş ekranı, CAPTCHA, çerçeve, oturum düştü) engel_coz ile adımları al ve hocaya tek tek göster.",
  "- Her araç yanıtındaki sonrakiAdim önerisine uy.",
  "- Sonunda kopyalanabilir bir çıktı ver. Kaydı, onayı ve gönderimi hoca yapar; sen yapmazsın.",
  "",
  GIRIS_BILGISI_KURALI,
].join("\n");

const kisa = (v: string | undefined, n = 40) =>
  v
    ? v
        .replace(/[\r\n`]/gu, " ")
        .trim()
        .slice(0, n)
    : "";

const ODAKLAR = [
  ["1", "Bologna ders paketini denetle ve boş alanları doldur", "bologna_doldur"],
  ["2", "Ders öğrenme çıktısı yaz ya da iyileştir", "cikti_yaz"],
  ["3", "ÇK ve PÇ sağlanma düzeyini hesapla", "ck_pc_hesabi"],
  ["4", "YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçüt ve kanıt rehberi", "olcut_rehberi"],
  ["5", "Öz değerlendirme metninin dil denetimi", "dil_denetimi"],
] as const;

/** akredit başlangıcının sorduğu odak menüsü; site örnek konuşmayı buradan okur. */
export const AKREDIT_ODAKLARI: readonly { no: string; ad: string }[] = ODAKLAR.map(([no, ad]) => ({ no, ad }));

/** OBS'ye tarayıcıyla giriş: Bologna akışının ilk adımı. */
const obsGirisi = () =>
  [
    "Adım 0. OBS'ye giriş (tarayıcı).",
    `   Hocaya önce şunu aynen söyle: "${GIRIS_KURALI_HOCAYA}"`,
    "   Tarayıcı aracın varsa (Claude in Chrome, Claude masaüstü tarayıcı paneli, ChatGPT ajan modu gibi):",
    "   a) Hocaya OBS ya da Bologna sisteminin adresini sor (kurumun sitesindeki bağlantı). Adresi kenardaki tarayıcıda aç.",
    '   b) Giriş ekranı gelince dur ve şunu yaz: "Kullanıcı adınızı ve parolanızı şimdi açılan OBS ekranına kendiniz yazın. Bitince bana yalnız girdim yazın."',
    "   c) CAPTCHA ya da doğrulama kodu gelirse hocanın kendisinin girmesini bekle; sen girme.",
    "   d) Hoca girdim deyince ders listesini oku ve numaralı göster. Sor: hangi ders? Hoca numara yazar.",
    "   e) Dersin Bologna (ders bilgi paketi) sayfasını oku. Okuduğun metni ya da HTML'i bologna_ayristir'e ver.",
    "   Tarayıcı aracın yoksa: hocaya sor: 1) kurulumu birlikte yapalım (önerilen) 2) sayfayı kopyalayıp yapıştırayım 3) sıfırdan başlayalım.",
    "   1 seçilirse kurulum_yardimi'nı hocanın asistanıyla (istemci) çağır, adımları tek tek göster.",
    '   2 seçilirse şunu yaz: "OBS\'de dersinizin Bologna sayfasını açın. Sayfada Ctrl+A ile hepsini seçin, Ctrl+C ile kopyalayın, buraya Ctrl+V ile yapıştırın."',
    "   Herhangi bir engelde engel_coz'u ilgili engel türüyle çağır.",
  ].join("\n");

const bolognaAkisi = (dersKodu: string) =>
  [
    `Odak: Bologna ders bilgi paketini denetle, eksik ve zayıf alanları tamamla.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    obsGirisi(),
    "1. Ayrıştır. bologna_ayristir önce Proliz biçimini, olmazsa genel ayrıştırıcıyı dener. Atılan kişi satırlarını tek cümleyle bildir. Bulunamayan alanları not al.",
    "   Program çıktıları sayfası da varsa onu da ayrıştır ve P kodlarını sakla; P kodlarını asla ezberden yazma.",
    "2. Denetle. bologna_denetle'yi çağır. Sonucu tek tabloda göster: numara, alan, durum (boş, zayıf, tamam), kısa neden. Kalan alan sayısını söyle.",
    "   Sor: 1) hepsini sırayla dolduralım (önerilen) 2) yalnız boş olanlar 3) numaraları kendim seçeyim.",
    "3. Bağlam. Amaç ya da içerik yoksa tek soru sor: dersin odağı ne? 1) [ders adından çıkardığın 1. öneri] (önerilen) 2) [2. öneri] 3) kendim yazayım. Önerileri ders adından ve program çıktılarından yaz.",
    "4. Her alan için: bologna_alan_rehberi'ni çağır. Kurala uyan 2-3 kısa seçenek (1, 2, 3) yaz. Varsayılan seçenek 1'dir.",
    "   Seçenekleri bologna_taslak_denetle ile denetle; geçmeyeni düzelt ve yeniden denetle, hocaya yalnız geçenleri göster. Uzun metinlerde ilk cümleyi ve kelime sayısını göster.",
    '   Hoca rakamla seçer. "hepsi 1" derse kalan bütün alanlarda seçenek 1\'i kullan, yine de her birini denetle.',
    "   Haftalık konular: 14 hafta, ara sınav ve yarıyıl sonu haftası görünür. Değerlendirme: yüzdeler toplamı 100.",
    "   AKTS iş yükü: is_yuku_oner'i çağır; üç dağılımın toplamı hedefe tam eşittir. AKTS'yi değiştirme.",
    "   Öğrenme çıktısı ile program çıktısı katkı tablosu: yalnız ayrıştırılan P kodlarıyla 2-3 seçenek öner.",
    "   Kaynaklar eksikse hocaya sor: derste kullandığınız kitap ya da makalenin adı nedir? Gerekirse yazarını ve yılını sor. kaynak_bicimle ile künye yap. Kitabı sen uydurma; web aracınla doğrulamadıysan önerme.",
    "   Dersin Yetkilileri alanını hoca OBS'de kendisi doldurur.",
    '5. Her seçimden sonra bologna_durum\'u çağır ve kalan alan sayısını tek cümleyle söyle: "Kalan 3 alan."',
    "6. Kalan alan yoksa OBS'ye yazma. Sor: 1) tarayıcıyla formu ben doldurayım, Kaydet'e siz basın (önerilen, tarayıcı aracın varsa) 2) alan alan kopyalayıp yapıştırın.",
    "   1: OBS düzenleme ekranında sekme sekme ilgili kutulara yaz. Her sekmeden sonra dur ve hocadan gözle denetleyip Kaydet'e basmasını iste. Kaydet'e sen basma.",
    "   2: bologna_kopya_metni ile metni al; her alanı ayrı kod bloğunda ver, hangi sekmedeki hangi kutuya yapıştırılacağını yaz.",
    '7. Tamamlandı denetimi. Hoca kaydettim deyince sayfayı yeniden oku (tarayıcı varsa) ya da yeniden yapıştırmasını iste; bologna_ayristir ve bologna_denetle ile denetle. Eksik yoksa "Tamamlandı" de.',
    "   Sor: 1) başka ders 2) bir alanı değiştir 3) bitir.",
  ].join("\n");

const ciktiAkisi = (dersKodu: string) =>
  [
    `Odak: ders öğrenme çıktısı yaz ya da iyileştir.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: 1) OBS'deki mevcut çıktılarımı okuyalım (önerilen; tarayıcı aracın varsa OBS girişi için Bologna akışındaki Adım 0'ı izle) 2) çıktılarımı yapıştırayım 3) sıfırdan yaz: ders adı, AKTS, T+U+L ve kısa içerik vereyim.",
    "2. bologna_alan_rehberi'ni alan=ciktilar ile çağır: kurallar, Bloom fiilleri, 8-12 sınırı.",
    "3. Her çıktı için 2-3 seçenek (1, 2, 3) yaz: farklı Bloom düzeyi ya da farklı ölçme biçimi. Türünü (Bilgi, Beceri, Yetkinlik) yaz.",
    "4. Bütün listeyi bologna_taslak_denetle ile denetle (ciktilar alanı; İngilizce isteniyorsa en alanıyla). Geçmeyeni düzelt.",
    '5. Hoca her çıktı için rakam seçer ya da "hepsi 1" der. Sonra sor: program çıktısı katkısını da dolduralım mı? 1) evet, P kodlarını vereyim 2) hayır.',
    "6. bologna_kopya_metni ile Öğrenme Çıktıları sekmesine kopyalanacak metni ver.",
  ].join("\n");

const ckPcAkisi = (dersKodu: string) =>
  [
    `Odak: ÇK ve PÇ sağlanma düzeyi hesabı.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: puanlar nerede? 1) Excel'den tabloyu kopyalayıp yapıştıracağım (önerilen) 2) adım adım birlikte girelim.",
    "2. Hocaya not_tablosu_ayristir yanıtındaki sütun eşleme rehberini kısaca göster: ilk satır başlık, her soru bir sütun, başlıkta sınav, soru, ÇK ve tam puan (ör. Vize S1 (ÇK1) /20).",
    "   Ad ve numara sütunlarını araç ayrıştırmadan önce atar ve o1, o2 takma adı verir; bunu hocaya söyle.",
    "3. Tabloyu not_tablosu_ayristir'e ver. Sezilen eşlemeyi tablo olarak göster.",
    "4. Eksikleri tek tek seçenekle sor: S3 hangi çıktıyı ölçüyor? 1) Ö2 2) Ö3 3) ikisi eşit. Tam puan? Vize yüzde kaç? Yanıtları aynı araca ek bilgi olarak ver.",
    "5. Eşik sor: 1) 60 (önerilen) 2) 50 3) başka.",
    "6. Hazır olunca ck_pc_hesapla'yı çağır. Sonucu tablo olarak göster; sayıları yalnız yanıttan al.",
    "7. Sor: 1) eşiğin altındaki çıktılar için iyileştirme notu taslağı 2) farklı eşikle yeniden hesapla 3) bitir. Not taslağında sayı uydurma; sonucu kopyalanabilir tablo olarak ver.",
  ].join("\n");

const olcutAkisi = (cerceve: string) =>
  [
    `Odak: ölçüt ve kanıt rehberi.${cerceve ? ` Çerçeve: ${cerceve}.` : ""}`,
    "",
    "Akış:",
    `1. ${cerceve ? "Çerçeve verildi, sorma." : "Sor: hangi çerçeve? 1) YÖKAK kurumsal (önerilen) 2) program akreditasyonu: MÜDEK, FEDEK, EPDAD ya da SABAK."}`,
    "2. Sor: ne arıyorsunuz? 1) bir ölçütün resmî metni 2) bir konuda hangi ölçütler var 3) öz değerlendirme iskeleti.",
    "3. olcut_ara ile ara, en uygun 2-3 sonucu numaralı göster. Hoca seçince olcut_getir ile resmî metni kaynağıyla göster.",
    "4. YÖKAK alt ölçütüyse olgunluk_duzeyleri ile düzeyleri ve örnek kanıtları göster. Her kanıt için sor: 1) var 2) yok 3) emin değilim. Yok olanlar EKSİK listesine girer.",
    "5. Programın disiplinini ya da programa özgü bölümünü sen tahmin etme; hocaya seçenek olarak sor.",
    "6. Ölçüt metnini yalnız araç yanıtından alıntıla. DOĞRULANMADI işaretli metni tahminle doldurma.",
    "7. Sonunda kopyalanabilir kanıt kontrol listesi ver: kanıt, durum (var, yok, EKSİK), not.",
  ].join("\n");

const dilAkisi = () =>
  [
    "Odak: öz değerlendirme ya da faaliyet raporu metninin dil denetimi.",
    "",
    "Akış:",
    "1. Hocadan metni yapıştırmasını iste. Kişi adı ve e-posta varsa göndermeden önce [KİŞİ-1] gibi maskele.",
    "2. Rapor dönemini sor: 1) 2025-2026 (önerilen) 2) başka.",
    "3. rapor_dil_denetle'yi çağır. Bulguları önem sırasıyla numaralı göster.",
    "4. Her bulgu için 2-3 düzeltme seçeneği (1, 2, 3) yaz. Kanıt ya da sayı ekleyen seçenekte, eklenecek şeyi hocadan iste; uydurma, gerekiyorsa EKSİK yaz.",
    '5. Hoca rakamla seçer; "hepsi 1" toplu onaydır. Düzeltilmiş metni yeniden denetle.',
    "6. Sonunda düzeltilmiş metnin tamamını kopyalanabilir biçimde ver.",
  ].join("\n");

const basla = (odak: string) => {
  const secilen = ODAKLAR.find(([no, , ad]) => odak === no || odak === ad);
  if (secilen) return AKISLAR[secilen[2]]?.({}) ?? "";
  return [
    "Akredit açık araçlarıyla hocaya yardım edeceksin. Önce hangi aracı kullanmak istediğini sor.",
    "Hoca seçmeden hiçbir akışa başlama: OBS girişi isteme, sayfa açma, araç çağırma.",
    "",
    "Hocaya tam olarak şunu göster ve yanıtını bekle:",
    "",
    "Merhaba. Bugün neye odaklanalım? Numarasını yazmanız yeter.",
    ...ODAKLAR.map(([no, ad]) => `${no}) ${ad}`),
    `${ODAKLAR.length + 1}) Başka bir şey: tüm araçları kısaca listele`,
    "",
    `Seçim ${ODAKLAR.length + 1} ise sunucudaki araçları adlarıyla değil, ne işe yaradıklarıyla birer cümlede numaralı listele ve yeniden seçtir.`,
    "",
    "Seçime göre aşağıdaki akışlardan ilgili olanı izle:",
    "",
    ...ODAKLAR.map(([no, , ad]) => `Seçim ${no}:\n${AKISLAR[ad]?.({}) ?? ""}\n`),
  ].join("\n");
};

const AKISLAR: Record<string, (a: Record<string, string | undefined>) => string> = {
  bologna_doldur: (a) => bolognaAkisi(kisa(a.ders_kodu)),
  cikti_yaz: (a) => ciktiAkisi(kisa(a.ders_kodu)),
  ck_pc_hesabi: (a) => ckPcAkisi(kisa(a.ders_kodu)),
  olcut_rehberi: (a) => olcutAkisi(kisa(a.cerceve)),
  dil_denetimi: () => dilAkisi(),
};

const ile = (govde: string) => `${govde}\n\n${ORTAK_KURALLAR}`;

const BASLA_ACIKLAMASI =
  "Akredit ile ilk adım. Önce hangi aracı kullanacağınızı seçersiniz: Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi, dil denetimi ya da başka bir araç.";

export const ACIK_ISTEMLER: readonly AcikIstem[] = [
  {
    ad: "akredit",
    baslik: "Akredit: hangi aracı kullanalım?",
    aciklama: BASLA_ACIKLAMASI,
    argumanlar: { odak: "İsteğe bağlı: 1-5 arası odak numarası" },
    metin: (a) => ile(basla(kisa(a.odak, 20))),
  },
  {
    ad: "basla",
    baslik: "Başla (akredit ile aynı)",
    aciklama: "akredit ile aynı.",
    argumanlar: { odak: "İsteğe bağlı: 1-5 arası odak numarası" },
    metin: (a) => ile(basla(kisa(a.odak, 20))),
  },
  {
    ad: "baslangic",
    baslik: "Başlangıç (akredit ile aynı)",
    aciklama: "akredit ile aynı. Eski adıdır, geriye uyum için durur.",
    argumanlar: { odak: "İsteğe bağlı: 1-5 arası odak numarası" },
    metin: (a) => ile(basla(kisa(a.odak, 20))),
  },
  {
    ad: "bologna_doldur",
    baslik: "Bologna paketini denetle ve doldur",
    aciklama:
      "OBS'nize kendiniz girersiniz; asistan Bologna sayfanızı okur, boş ve zayıf alanları bulur, her alan için seçenek sunar, formu doldurur ya da kopyalanacak metni verir. Kaydet'e siz basarsınız.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu, ör. KRG101" },
    metin: (a) => ile(bolognaAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "cikti_yaz",
    baslik: "Öğrenme çıktısı yaz ya da iyileştir",
    aciklama: "Ders öğrenme çıktılarını ölçülebilir fiillerle yazar ya da iyileştirir; her çıktı için seçenek sunar.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu" },
    metin: (a) => ile(ciktiAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "ck_pc_hesabi",
    baslik: "ÇK ve PÇ sağlanma hesabı",
    aciklama:
      "Excel not tablonuzu yapıştırırsınız; ad ve numaralar atılır, ders ve program çıktısı sağlanma düzeyi hesaplanır.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu" },
    metin: (a) => ile(ckPcAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "olcut_rehberi",
    baslik: "Ölçüt ve kanıt rehberi",
    aciklama: "YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçütünü resmî metniyle bulur, kanıt kontrol listesi çıkarır.",
    argumanlar: { cerceve: "İsteğe bağlı: YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK" },
    metin: (a) => ile(olcutAkisi(kisa(a.cerceve, 20))),
  },
  {
    ad: "dil_denetimi",
    baslik: "Öz değerlendirme dil denetimi",
    aciklama: "Rapor metnindeki kanıtsız üstünlük, belirsiz özne gibi sorunları bulur, düzeltme seçenekleri sunar.",
    argumanlar: {},
    metin: () => ile(dilAkisi()),
  },
];

/** SDK için bağımsız değişken şeması: hepsi isteğe bağlı, kısa metin. */
export const istemSemasi = (i: AcikIstem) =>
  Object.fromEntries(
    Object.entries(i.argumanlar).map(([k, d]) => [k, z.string().max(60).optional().describe(d)]),
  ) as Record<string, z.ZodOptional<z.ZodString>>;
