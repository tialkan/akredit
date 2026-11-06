// MCP istemleri (prompts). İstemciler bunları eğik çizgi komutu ya da hazır başlangıç olarak gösterir.
// İlke (İP-49): sıfır kullanıcı müdahalesiyle süreci hızlıca ama denetimli, teyitli tamamlamak. Varsayılan yol
// "4) Hepsini akıllıca doldur"dur: asistan her alan için en iyi seçeneği kendisi seçer, sunucu denetiminden
// geçmeyeni düzeltip yeniden denetler, sonunda tek bir özet gösterir. Hoca isterse numarayla düzeltir.
// Halüsinasyona yer yok: kitap, kişi, tarih, sayı uydurulmaz; kaynaklar kaynak_dogrula'dan geçmeden önerilmez.
//
// Dış inceleme 2026-11-05: akıllı doldurma kalır, ama bilinmesi mümkün olmayan ve resmî taahhüt olan bilgiler
// (değerlendirme yöntemi ve yüzdeleri, uygulama/lab, kullanılan kaynaklar, sayfada yoksa amaç ve içerik) sayfadan
// okunur; yoksa asistan bunları TEK mesajda, numaralı ve varsayılan seçenekli sorar, uydurmaz. Ders adından
// üretilen her şey "öneri" etiketiyle gösterilir. OBS'ye yazmadan önce alan alan önceki/yeni değer özeti gösterilir,
// hoca bir kez "kaydet" der; kayıttan sonra sayfa geri okunur ve obs_karsilastir ile doğrulanır.
//
// İstem metni veri değil asistana yönergedir; içinde hocanın girdisi yalnız isteğe bağlı kısa bağımsız
// değişkenler olarak yer alır (ders kodu, çerçeve) ve sınırlanır. Giriş bilgisi (parola, doğrulama kodu,
// çerez) istenmez; görülürse reddedilir ve kaydedilmez (ilke 8).

import { z } from "zod";
import { arac, KOD_KAYNAGI } from "./temel.ts";
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
  "- CAPTCHA'yı sen çözmezsin, hoca çözer.",
  '- OBS\'de Kaydet düğmesine yalnız hocanın açık izniyle basarsın: önce alan alan önceki ve yeni değer özetini gösterirsin, hoca bir kez "kaydet" der. İzin yoksa basmazsın. Onaya ya da dış kuruma Gönder düğmesine hiç basmazsın; onu hoca basar.',
].join("\n");

/** Akıllı doldurma kısayolu: bütün menülerde aynı numara ve aynı anlam. */
export const AKILLI_DOLDURMA_SECENEGI = "4) Hepsini akıllıca doldur (önerilen)";

/** "4) Hepsini akıllıca doldur" seçildiğinde (ya da hoca "sen seç", "hepsi" derse) izlenecek yol. */
/** Bilinmesi mümkün olmayan ve resmî taahhüt olan bilgiler: sayfadan okunur, yoksa tek mesajda sorulur. */
export const TEYIT_SORULARI = [
  "Teyit gerektiren bilgiler (asla tahmin etme):",
  "- Değerlendirme yöntemleri ve yüzdeleri (vize, final, ödev, proje...).",
  "- Dersin uygulama ya da laboratuvar içerip içermediği.",
  "- Derste gerçekten kullanılan kaynaklar ve ders notları.",
  "- Sayfada yoksa dersin amacı ve içeriği.",
  "Bunları önce sayfadan oku. Sayfada olmayanları hocaya TEK mesajda, birlikte, numaralı ve her birine varsayılan seçenekle sor. Örnek:",
  '  "Birkaç bilgiyi yalnız siz bilebilirsiniz. Numarayla yanıtlayın; boş bırakırsanız parantezdeki varsayılanı kullanırım.',
  "   1) Değerlendirme: a) Vize %40, Final %60 (varsayılan) b) Vize %30, Ödev %20, Final %50 c) başka: yazın",
  "   2) Uygulama ya da laboratuvar var mı? a) yok (varsayılan, T+U+L'ye göre) b) var",
  '   3) Kullandığınız kitap ya da notlar: a) önereyim, siz seçin (varsayılan) b) şunları kullanıyorum: yazın"',
  "Hocanın seçtiği varsayılan da hoca teyidi sayılır (degerlendirmeDayanagi: 'hoca'). Yanıt gelmeden değerlendirme yüzdesi yazma paketine girmez.",
].join("\n");

export const AKILLI_DOLDURMA = [
  "Hepsini akıllıca doldur (seçenek 4):",
  "- Önce teyit gerektiren bilgileri sayfadan oku; sayfada olmayanları hocaya TEK mesajda birlikte sor (aşağıdaki kural). Bundan sonra ara soru sorma.",
  "- Kalan her alan için seçeneklerini kendin yaz ve en iyisini kendin seç. Ders adından ve program çıktılarından ürettiğin her şeyi 'öneri' etiketiyle göster.",
  "- Her seçimi ilgili araçla denetle (bologna_taslak_denetle, bologna_durum, rapor_dil_denetle). Geçmeyeni düzelt ve yeniden denetle; geçene kadar hocaya gösterme. Üç denemede geçmezse o alanı EKSİK bırak.",
  "- Sayıları (toplam, yüzde, iş yükü, sağlanma düzeyi) yalnız araç yanıtından al.",
  "- Uydurma yok: hocanın vermediği ve doğrulayamadığın bilgi (kişi, kitap, tarih, sayı, toplantı) EKSİK kalır. Kaynaklar yalnız kaynak_dogrula'dan 'dogrulandi' dönenlerdir.",
  "- Araç sonucunu 'geçer' diye sunma: 'biçim denetiminden geçti; içerik teyidi: hoca' de.",
  "- Bitince tek bir özet göster: numara, alan, ne yazdığın (ilk cümle ya da kısa özet), kaynağı (sayfa, hoca ya da öneri), biçim denetimi sonucu. Altına şunu yaz:",
  '  "Şu alanları şöyle doldurdum; öneri yazanlar benim önerimdir, içeriği siz teyit edersiniz. Değiştirmek istediğiniz alanın numarasını yazın; yoksa devam diyebilirsiniz."',
  "",
  TEYIT_SORULARI,
].join("\n");

/** Bütün istemlerde ortak çalışma biçimi. */
export const ORTAK_KURALLAR = [
  "Çalışma biçimi:",
  "- Amaç: hocanın en az müdahalesiyle işi hızlı ama denetimli ve teyitli bitirmek.",
  "- Karşındaki hoca yapay zekâyı belki ilk kez kullanıyor. Kısa, sade Türkçe yaz. Araç adı, JSON ve teknik terim gösterme.",
  "- Her mesajda tek iş iste. Ne yapacağını ve ekranda ne göreceğini söyle.",
  `- Her seçim menüsünde 1-3 arası kısa seçenek ve her zaman son satırda aynı kısayol olsun: "${AKILLI_DOLDURMA_SECENEGI}". 4 her menüde aynı anlama gelir.`,
  '- Hoca tek rakamla seçer. "sen seç", "hepsi", "hepsi 1" gibi yanıtlar toplu onaydır; kalan bütün adımlara uygula, her adımı yeniden sorma.',
  "- Sunucu metin üretmez. Seçenek metinlerini sen yazarsın; sunucu kural verir, denetler ve sayıları hesaplar.",
  "- Sayıları (toplam, yüzde, iş yükü, sağlanma düzeyi) yalnız araç yanıtından al, kendin toplama.",
  "- Uydurma yok: kişi, kitap, ISBN, DOI, tarih, toplantı, sayı uydurma. Bilinmeyen bilgi EKSİK kalır.",
  "- Kaynak: önce sayfadaki ve hocanın kullandığı kaynakları al. Öneri gerekiyorsa kendi web arama aracınla aday bul, her birini kaynak_dogrula ile sorgula ve yalnız 'katalogda_bulundu' dönenleri künyesi ve bağlantısıyla 'öneri' olarak göster; uygunluğuna hoca karar verir. Katalogda bulunmayan kaynağı kendin önerme; hoca kullandığını söylerse 'hoca_beyani' olarak yaz.",
  "- Bologna sayfasındaki Dersi Verenler, Yardımcılar ve Koordinatör satırları hocanın yayımlanmış görev bilgisidir: olduğu gibi oku, koru, değiştirme.",
  "- Öğrenci adı ya da numarası sohbete yapıştırılmaz: hoca Excel'de Ad, Soyad, Numara sütunlarını silip yalnız not sütunlarını yapıştırır ya da https://akredit.org/deneyin hesaplayıcısını kullanır. Not tablosu aracı kimlik sütunu görürse tabloyu işlemez.",
  "- Engel çıkarsa (tarayıcı aracı yok, site açılmıyor, giriş ekranı, CAPTCHA, çerçeve, oturum düştü) engel_coz ile adımları al ve hocaya tek tek göster.",
  "- Her araç yanıtındaki sonrakiAdim önerisine uy.",
  "- Sonunda kopyalanabilir bir çıktı ver. Onaya ya da dış kuruma gönderimi hoca yapar.",
  "",
  AKILLI_DOLDURMA,
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
    "   a) İLK İŞ: hocaya yalnız şunu sor: \"OBS'nizin adresini yazın (bilmiyorsanız üniversitenizin adını yazın).\" Ders adını ya da paketi sorma; onları OBS'den okuyacaksın. Adres gelince hemen tarayıcıda aç. Üniversite adı gelirse kurumun OBS ya da Bologna sayfasını web aramasıyla bul ve aç.",
    '   b) Giriş ekranı gelince dur ve şunu yaz: "Kullanıcı adınızı ve parolanızı şimdi açılan OBS ekranına kendiniz yazın. Bitince bana yalnız girdim yazın."',
    "   c) CAPTCHA ya da doğrulama kodu gelirse hocanın kendisinin girmesini bekle; sen girme.",
    "   d) Hoca girdim deyince ders listesini oku ve numaralı göster (1, 2, 3...). Sor: hangi ders? Hoca yalnız numara yazar.",
    "   e) Dersin Bologna (ders bilgi paketi) sayfasını oku. Okuduğun metni ya da HTML'i bologna_ayristir'e ver.",
    "   Tarayıcı aracın yoksa: hocaya sor: 1) kurulumu birlikte yapalım (önerilen) 2) sayfayı kopyalayıp yapıştırayım 3) sıfırdan başlayalım.",
    "   1 seçilirse kurulum_yardimi'nı hocanın asistanıyla (istemci) çağır, adımları tek tek göster.",
    '   2 seçilirse şunu yaz: "OBS\'de dersinizin Bologna sayfasını açın. Sayfada Ctrl+A ile hepsini seçin, Ctrl+C ile kopyalayın, buraya Ctrl+V ile yapıştırın."',
    "   Herhangi bir engelde engel_coz'u ilgili engel türüyle çağır.",
  ].join("\n");

/** Kaynak: önce sayfadaki ve hocanın kullandığı; öneri yalnız katalogda bulunan, "öneri" etiketiyle. */
const KAYNAK_ADIMI = [
  "   Kaynaklar: önce sayfadaki kaynakları al; derste kullanılan kaynakları teyit sorularıyla birlikte (tek mesajda) sor.",
  "   Öneri gerekiyorsa kendi web arama aracınla 4-6 aday eser bul; her adayı DOI, ISBN ya da başlık, yazar, tür ve biliniyorsa yılla kaynak_dogrula'ya ver (çağrı başına en çok 5).",
  "   Yalnız 'katalogda_bulundu' dönenleri 'öneri' etiketiyle, künyesi ve bağlantısıyla göster; uygunluğuna hoca karar verir. Bologna araçlarına kaynağı { kunye, dogrulama: { durum, baglanti, imza } } olarak aynen ver.",
  "   Katalogda bulunmayan eseri kendin önerme. Hoca bir eseri kullandığını söylerse (çoğu Türkçe kitap katalogda yoktur) künyeyi yalnız hocanın verdiği bilgiyle yaz ve dogrulama: 'hoca_beyani' ver; eksik alanı uydurma, EKSİK bırak.",
].join("\n");

/** OBS'ye yazma: önce önceki/yeni özeti, tek "kaydet", sonra geri okuma ve obs_karsilastir. */
const OBS_YAZMA = [
  "6. OBS'ye yazma.",
  "   Önce bologna_kopya_metni'ni çağır (OBS'deki şimdiki değerleri oncekiDegerler olarak ver). Yazma paketine alınmayanları (doğrulanmamış kaynak, teyitsiz değerlendirme yüzdesi) hocaya söyle; onları yazma.",
  "   Hocaya degisiklikOzeti'ni alan alan göster: numara, sekme, alan, önceki değer, yeni değer (uzunsa ilk cümle).",
  "   Tarayıcı aracın yoksa doğrudan 3'ü uygula. Varsa sor:",
  "   1) Formu ben doldurayım, Kaydet'e siz basın",
  '   2) Formu ben doldurup kaydedeyim: yukarıdaki özeti onaylıyorsanız bir kez "kaydet" yazın',
  "   3) Alan alan kopyalayın",
  "   1: OBS düzenleme ekranında sekme sekme ilgili kutulara yaz. Her sekmeden sonra dur ve hocadan gözle denetleyip Kaydet'e basmasını iste.",
  '   2: Yalnız hoca "kaydet" yazdıysa, yalnız özetteki alanları yaz ve kaydet. Her sekmeden önce ders kodunu ve dönemi sayfada denetle; beklenenden farklıysa yazmayı durdur ve hocaya söyle.',
  "   3: bologna_kopya_metni metnini her alan ayrı kod bloğunda ver, hangi sekmedeki hangi kutuya yapıştırılacağını yaz.",
  "   Kayıttan sonra (1 ve 2): sayfayı geri oku, obs_karsilastir'e obsKarsilastirGirdisi'ni ve okuduğun metni ver. dur true ise yazmayı bırak, nedenini söyle. Farklı alanları hocaya göster.",
  "   Her durumda: Dersin Yetkilileri satırlarına dokunma, OBS'deki hâliyle kalsın. Parolayı asla isteme; o yalnız hocadadır. Onaya gönderme (Gönder) düğmesine sen basma.",
].join("\n");

const bolognaAkisi = (dersKodu: string) =>
  [
    `Odak: Bologna ders bilgi paketini denetle, eksik ve zayıf alanları tamamla.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    obsGirisi(),
    "1. Ayrıştır. bologna_ayristir önce Proliz biçimini, olmazsa genel ayrıştırıcıyı dener (sekmeli düz metin de olur). Bulunamayan alanları ve ingilizce değerini not al; sonraki araçlara ingilizce değerini aynen ver.",
    "   Dersi Verenler, Yardımcılar ve Koordinatör satırları yetkililer alanında olduğu gibi gelir; onları değiştirme, sonraki çağrılarda aynen geri ver.",
    "   Program çıktıları sayfası da varsa onu da ayrıştır ve P kodlarını sakla; P kodlarını asla ezberden yazma.",
    "2. Denetle. bologna_denetle'yi çağır. Sonucu tek tabloda göster: numara, alan, durum (boş, zayıf, tamam), kısa neden. Kalan alan sayısını söyle.",
    `   Sor: 1) alan alan seçenek göstererek dolduralım 2) yalnız boş olanlar 3) numaraları kendim seçeyim ${AKILLI_DOLDURMA_SECENEGI}.`,
    "3. Teyit. Değerlendirme yöntemi ve yüzdeleri, uygulama/lab, kullanılan kaynaklar ve (sayfada yoksa) amaç ve içerik yalnız hocanın bilebileceği bilgilerdir. Sayfada olmayanları hocaya TEK mesajda, numaralı ve varsayılan seçenekli sor (akıllı doldurmada da). Uydurma.",
    "   Amaç ve içerik için hocanın verdiği kısa odak yoksa ders adından ve program çıktılarından 'öneri' yaz ve öneri olduğunu söyle.",
    "4. Her alan için: bologna_alan_rehberi'ni çağır. Kurala uyan 2-3 kısa seçenek yaz.",
    "   Seçenekleri bologna_taslak_denetle ile denetle; biçim denetiminden geçmeyeni düzelt ve yeniden denetle. Uzun metinlerde ilk cümleyi ve kelime sayısını göster. Sonucu 'biçim denetiminden geçti; içerik teyidi: hoca' diye sun.",
    "   Akıllı doldurmada (4) en iyi seçeneği kendin seç ve hocaya alan alan sorma; sonunda tek özet göster.",
    "   Haftalık konular: 14 hafta, ara sınav ve yarıyıl sonu haftası görünür. Değerlendirme: yalnız sayfadan ya da hocadan; degerlendirmeDayanagi'ni ('sayfa' ya da 'hoca') ver.",
    "   AKTS iş yükü: is_yuku_oner'i sayfadaki değerlendirme kalemleriyle çağır; derste olmayan etkinliğe satır açılmaz. Sayfadan okunan iş yüküyle öneriyi ayrı göster. AKTS'yi değiştirme.",
    "   Öğrenme çıktısı ile program çıktısı katkı tablosu: yalnız ayrıştırılan P kodlarıyla öner.",
    KAYNAK_ADIMI,
    '5. Her alandan sonra bologna_durum\'u çağır. Alan alan ilerliyorsan kalan alan sayısını tek cümleyle söyle: "Kalan 3 alan."',
    OBS_YAZMA,
    '7. Doğrulama. Kayıttan sonra sayfayı yeniden oku (tarayıcı varsa) ya da yeniden yapıştırmasını iste; obs_karsilastir ve bologna_denetle ile denetle. Fark yoksa "Kaydedildi ve geri okunarak doğrulandı; içerik teyidi sizde" de.',
    "   Sor: 1) başka ders 2) bir alanı değiştir 3) bitir.",
  ].join("\n");

const ciktiAkisi = (dersKodu: string) =>
  [
    `Odak: ders öğrenme çıktısı yaz ya da iyileştir.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: 1) OBS'deki mevcut çıktılarımı okuyalım (tarayıcı aracın varsa OBS girişi için Bologna akışındaki Adım 0'ı izle) 2) çıktılarımı yapıştırayım 3) sıfırdan yaz: ders adı, AKTS, T+U+L ve kısa içerik vereyim.",
    "2. bologna_alan_rehberi'ni alan=ciktilar ile çağır: kurallar, Bloom fiilleri, 4-10 sınırı (5-8 önerilir).",
    `3. Sor: 1) her çıktı için seçenek göstereyim 2) yalnız zayıf olanları iyileştireyim 3) numaraları kendim seçeyim ${AKILLI_DOLDURMA_SECENEGI}.`,
    "   1-3: her çıktı için 2-3 seçenek yaz (farklı Bloom düzeyi ya da ölçme biçimi), türünü (Bilgi, Beceri, Yetkinlik) yaz.",
    "   4: her çıktı için en iyi ifadeyi kendin seç; hocaya ara soru sorma.",
    "4. Bütün listeyi bologna_taslak_denetle ile denetle (ciktilar alanı; İngilizce isteniyorsa en alanıyla). Geçmeyeni düzelt ve yeniden denetle.",
    "5. Tek özet göster: numara, çıktı, tür, denetim sonucu. Değiştirmek istediği numarayı sor.",
    "   Program çıktısı katkısı: P kodları ayrıştırıldıysa onlarla doldur; yoksa P kodu uydurma, hocadan program çıktıları sayfasını iste.",
    "6. bologna_kopya_metni ile Öğrenme Çıktıları sekmesine kopyalanacak metni ver ya da Bologna akışındaki OBS'ye yazma adımını izle.",
  ].join("\n");

const ckPcAkisi = (dersKodu: string) =>
  [
    `Odak: ÇK ve PÇ sağlanma düzeyi hesabı.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    '1. Hocaya önce şunu söyle: "Kişisel veriyi yapay zekâ sohbetine yapıştırmayın: Excel\'de Ad, Soyad, Numara sütunlarını silip yalnız not sütunlarını yapıştırın ya da verinin tarayıcınızdan çıkmadığı hesaplayıcıyı kullanın: https://akredit.org/deneyin"',
    "   Sonra yalnız not sütunlarını yapıştırmasını iste. İlk satır başlık, her soru bir sütun; başlıkta sınav, soru, ÇK ve tam puan olursa iş biter (ör. Vize S1 (ÇK1) /20). Öğrenciler o1, o2 takma adı alır.",
    "2. Tabloyu not_tablosu_ayristir'e ver.",
    `3. Sor: 1) eşlemeyi tek tek gözden geçirelim 2) yalnız eksikleri soralım 3) eşlemeyi kendim yazayım ${AKILLI_DOLDURMA_SECENEGI}.`,
    "   4: başlıktan okunan eşlemeyi ve varsayılanları kullan: eşik 60, sınav ağırlıkları tablodan. Başlıkta olmayan soru-çıktı eşlemesini ve tam puanı tahmin etme; bunları tek mesajda topluca sor.",
    "4. Hazır olunca ck_pc_hesapla'yı çağır. Sonucu tablo olarak göster; sayıları yalnız yanıttan al.",
    "5. Tek özet: hangi eşlemeyi ve eşiği kullandığını, eşiğin altında kalan çıktıları yaz. Değiştirmek istediği numarayı sor.",
    "6. Sor: 1) eşiğin altındaki çıktılar için iyileştirme notu taslağı 2) farklı eşikle yeniden hesapla 3) bitir. Not taslağında sayı uydurma; sonucu kopyalanabilir tablo olarak ver.",
  ].join("\n");

const olcutAkisi = (cerceve: string) =>
  [
    `Odak: ölçüt ve kanıt rehberi.${cerceve ? ` Çerçeve: ${cerceve}.` : ""}`,
    "",
    "Akış:",
    `1. ${cerceve ? "Çerçeve verildi, sorma." : "Sor: hangi çerçeve? 1) YÖKAK kurumsal 2) program akreditasyonu: MÜDEK, FEDEK, EPDAD ya da SABAK. Hoca söylemezse YÖKAK kurumsal ile başla."}`,
    `2. Sor: 1) bir ölçütün resmî metni 2) bir konuda hangi ölçütler var 3) öz değerlendirme iskeleti ${AKILLI_DOLDURMA_SECENEGI.replace("doldur", "hazırla")}: konuya uyan ölçütleri bulup resmî metinleri ve kanıt kontrol listesini tek seferde çıkarırım.`,
    "3. olcut_ara ile ara, en uygun sonuçları al. olcut_getir ile resmî metni kaynağıyla göster. Akıllı hazırlamada en uygun 2-3 ölçütü kendin seç.",
    "4. YÖKAK alt ölçütüyse olgunluk_duzeyleri ile düzeyleri ve örnek kanıtları al. Kanıtın kurumda olup olmadığını tahmin etme: kontrol listesinde 'hocaya sorulacak' yaz; hoca isterse tek mesajda 'var olanların numaraları' diye sor.",
    "5. Programın disiplinini ya da programa özgü bölümünü sen tahmin etme; bilmiyorsan tek soruyla sor.",
    "6. Ölçüt metnini yalnız araç yanıtından alıntıla. DOĞRULANMADI işaretli metni tahminle doldurma.",
    "7. Sonunda tek özet ve kopyalanabilir kanıt kontrol listesi ver: ölçüt, kanıt, durum (var, yok, hocaya sorulacak, EKSİK), not.",
  ].join("\n");

const dilAkisi = () =>
  [
    "Odak: öz değerlendirme ya da faaliyet raporu metninin dil denetimi.",
    "",
    "Akış:",
    "1. Hocadan metni yapıştırmasını iste. Öğrenci adı ya da numarası varsa göndermeden önce o1, o2 gibi takma adla değiştir.",
    "2. Rapor dönemini metinden çıkar; çıkaramazsan tek soruyla sor.",
    "3. rapor_dil_denetle'yi çağır.",
    `4. Sor: 1) bulguları tek tek göstereyim 2) yalnız önemli olanları düzelteyim 3) numaraları kendim seçeyim ${AKILLI_DOLDURMA_SECENEGI.replace("doldur", "düzelt")}.`,
    "   4: her bulgu için en iyi düzeltmeyi kendin seç. Kanıt ya da sayı gerektiren düzeltmede bilgi uydurma; o yere EKSİK yaz.",
    "5. Düzeltilmiş metni yeniden rapor_dil_denetle ile denetle; kalan bulguları düzelt.",
    "6. Tek özet göster: numara, eski ifade, yeni ifade. Değiştirmek istediği numarayı sor. Sonunda düzeltilmiş metnin tamamını kopyalanabilir biçimde ver.",
  ].join("\n");

const AKISLAR: Record<string, (a: Record<string, string | undefined>) => string> = {
  bologna_doldur: (a) => bolognaAkisi(kisa(a.ders_kodu)),
  cikti_yaz: (a) => ciktiAkisi(kisa(a.ders_kodu)),
  ck_pc_hesabi: (a) => ckPcAkisi(kisa(a.ders_kodu)),
  olcut_rehberi: (a) => olcutAkisi(kisa(a.cerceve)),
  dil_denetimi: () => dilAkisi(),
};

const akreditMenusu = (odak: string) => {
  const secilen = ODAKLAR.find(([no, , ad]) => odak === no || odak === ad);
  if (secilen) return AKISLAR[secilen[2]]?.({}) ?? "";
  return [
    "Akredit açık araçlarıyla hocaya yardım edeceksin. Önce hangi aracı kullanmak istediğini sor.",
    "Hoca seçmeden hiçbir akışa başlama: OBS girişi isteme, sayfa açma, araç çağırma.",
    "",
    "Hocaya tam olarak şunu göster ve yanıtını bekle:",
    "",
    "Merhaba. Neye odaklanalım? Numarasını yazmanız yeter.",
    ...ODAKLAR.map(([no, ad]) => `${no}) ${ad}`),
    `${ODAKLAR.length + 1}) Başka bir şey: tüm araçları kısaca listele`,
    "",
    `Seçim ${ODAKLAR.length + 1} ise sunucudaki araçları adlarıyla değil, ne işe yaradıklarıyla birer cümlede numaralı listele ve yeniden seçtir.`,
    "Bu ilk menüde 4 bir odaktır (ölçüt rehberi); akıllı doldurma kısayolu odak seçildikten sonraki menülerde geçerlidir.",
    "",
    "Seçime göre aşağıdaki akışlardan ilgili olanı izle:",
    "",
    ...ODAKLAR.map(([no, , ad]) => `Seçim ${no}:\n${AKISLAR[ad]?.({}) ?? ""}\n`),
  ].join("\n");
};

const ile = (govde: string) => `${govde}\n\n${ORTAK_KURALLAR}`;

export const ACIK_ISTEMLER: readonly AcikIstem[] = [
  {
    ad: "akredit",
    baslik: "Akredit: hangi aracı kullanalım?",
    aciklama:
      "Akredit ile ilk adım. Önce hangi aracı kullanacağınızı seçersiniz: Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi, dil denetimi ya da başka bir araç.",
    argumanlar: { odak: "İsteğe bağlı: 1-5 arası odak numarası" },
    metin: (a) => ile(akreditMenusu(kisa(a.odak, 20))),
  },
  {
    ad: "bologna_doldur",
    baslik: "Bologna paketini denetle ve doldur",
    aciklama:
      "OBS'nize kendiniz girersiniz; asistan Bologna sayfanızı okur, boş ve zayıf alanları bulur, hepsini akıllıca doldurup denetler ve tek özet gösterir. Formu doldurur; Kaydet'e siz basarsınız ya da açık izninizle o basar.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu, ör. KRG101" },
    metin: (a) => ile(bolognaAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "cikti_yaz",
    baslik: "Öğrenme çıktısı yaz ya da iyileştir",
    aciklama:
      "Ders öğrenme çıktılarını ölçülebilir fiillerle yazar ya da iyileştirir; hepsini tek adımda yazıp denetler, isterseniz numarayla düzeltirsiniz.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu" },
    metin: (a) => ile(ciktiAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "ck_pc_hesabi",
    baslik: "ÇK ve PÇ sağlanma hesabı",
    aciklama:
      "Excel not tablonuzu yapıştırırsınız; öğrencilere takma ad verilir, ders ve program çıktısı sağlanma düzeyi hesaplanır.",
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
    aciklama:
      "Rapor metnindeki kanıtsız üstünlük, belirsiz özne gibi sorunları bulur, hepsini düzeltip yeniden denetler ve tek özet gösterir.",
    argumanlar: {},
    metin: () => ile(dilAkisi()),
  },
];

/** Kısa kurallar: akredit_basla yanıtında (istem desteklemeyen istemciler için) yer alır. */
export const KISA_KURALLAR = [
  "Hoca seçmeden hiçbir akışa başlama; menüyü aynen göster ve numara bekle.",
  "Her soruyu numaralı seçeneklerle sor; hoca yalnız numara yazarak ilerleyebilsin.",
  "Bologna (1) seçilince tarayıcın varsa ilk iş OBS adresini isteyip açmak; ders adını sorma, OBS'den oku.",
  "Kısa, sade Türkçe yaz; araç adı, JSON ve teknik terim gösterme. Her mesajda tek iş iste.",
  "Uydurma yok: kişi, kitap, ISBN, DOI, tarih, sayı uydurma. Bilinmeyen EKSİK kalır.",
  "Değerlendirme yöntem ve yüzdeleri, uygulama/lab, kullanılan kaynaklar ve sayfada yoksa amaç/içerik sayfadan okunur; yoksa hocaya TEK mesajda, numaralı ve varsayılan seçenekli sorulur.",
  "Ders adından ürettiğin her şeyi 'öneri' etiketiyle göster. Araç sonucu 'biçim denetiminden geçti; içerik teyidi: hoca' diye sunulur.",
  "Sayıları yalnız araç yanıtından al.",
  "Kaynak yalnız 'katalogda_bulundu' ise öneri olarak, ya da hoca kullandığını söylerse 'hoca_beyani' olarak yazılır.",
  "Giriş bilgisi (parola, doğrulama kodu, çerez) istenmez; hoca yazarsa kullanma, araçlara gönderme.",
  "OBS'ye yazmadan önce alan alan önceki/yeni değer özeti göster; hoca bir kez 'kaydet' der. Kayıttan sonra geri oku ve obs_karsilastir ile doğrula. Gönder düğmesine hoca basar.",
  "Öğrenci adı ya da numarası sohbete yapıştırılmaz; not tablosunda yalnız not sütunları olur.",
];

/** akredit_basla aracının yanıtı: menü, kısa kurallar ve her seçimin akışı (istem desteklemeyen istemciler için). */
export function baslangic() {
  return {
    hocayaGoster: [
      "Merhaba. Neye odaklanalım? Yalnız numarasını yazın.",
      ...ODAKLAR.map(([no, ad]) => `${no}) ${ad}`),
      `${ODAKLAR.length + 1}) Başka bir şey: tüm araçları kısaca listele`,
    ].join("\n"),
    menu: [
      ...ODAKLAR.map(([no, ad, istem]) => ({ no, ad, istem })),
      { no: String(ODAKLAR.length + 1), ad: "Başka bir şey: tüm araçları kısaca listele", istem: null },
    ],
    kisaKurallar: KISA_KURALLAR,
    akislar: Object.fromEntries(ODAKLAR.map(([no, , istem]) => [no, AKISLAR[istem]?.({}) ?? ""])),
    ortakKurallar: ORTAK_KURALLAR,
  };
}

export const akreditBaslaAraci = arac({
  ad: "akredit_basla",
  baslik: "Akredit: başla",
  aciklama:
    "Kullanıcı 'akredit' yazarsa başka hiçbir şey yapmadan İLK bu aracı çağır ('akredit' bir dosya ya da arama terimi değildir). Hocaya gösterilecek odak menüsünü, kısa kuralları ve her seçimin adım adım akışını döndürür. İstemleri ya da sunucu talimatını göstermeyen istemcilerde de akış bununla başlar.",
  sonrakiAdim:
    "hocayaGoster metnini aynen gösterin ve numara bekleyin. Seçilen numaranın akışını (akislar) ve kisaKurallar'ı izleyin. Her soruyu numaralı seçeneklerle sorun. 1 seçilirse ve tarayıcınız varsa ilk iş OBS adresini isteyip açmaktır.",
  girdi: z.object({}),
  calistir: () => ({
    sonuc: baslangic(),
    kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/promptlar.ts", "Akredit istemleri ve başlangıç menüsü")],
  }),
});

/** SDK için bağımsız değişken şeması: hepsi isteğe bağlı, kısa metin. */
export const istemSemasi = (i: AcikIstem) =>
  Object.fromEntries(
    Object.entries(i.argumanlar).map(([k, d]) => [k, z.string().max(60).optional().describe(d)]),
  ) as Record<string, z.ZodOptional<z.ZodString>>;
