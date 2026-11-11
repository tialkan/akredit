// MCP istemleri (prompts). İstemciler bunları eğik çizgi komutu ya da hazır başlangıç olarak gösterir.
// İlke (İP-49): en az kullanıcı müdahalesiyle süreci hızlıca ama denetimli, teyitli tamamlamak. Varsayılan yol
// akıllı doldurmadır (hocaya alan alan menü sorulmaz): asistan her alan için en iyi seçeneği kendisi seçer, sunucu
// denetiminden geçmeyeni düzeltip yeniden denetler, sonunda tek bir özet gösterir. Hoca isterse numarayla düzeltir.
// Halüsinasyona yer yok: kitap, kişi, tarih, sayı uydurulmaz; kaynaklar kaynak_dogrula'dan geçmeden önerilmez.
//
// Dış inceleme 2026-11-05: akıllı doldurma kalır, ama bilinmesi mümkün olmayan ve resmî taahhüt olan bilgiler
// (değerlendirme yöntemi ve yüzdeleri, kullanılan kaynaklar) sayfadan okunur; yoksa asistan bunları TEK mesajda,
// numaralı sorar, uydurmaz ve yüzdeye varsayılan koymaz (06.11.2026). Uygulama/lab T+U+L'den okunur; amaç ve içerik
// sayfada yoksa "öneri" olarak yazılıp son özette teyide sunulur. Ders adından üretilen her şey "öneri" etiketiyle
// gösterilir. OBS'ye yazmadan önce alan alan önceki/yeni değer özeti gösterilir, hoca bir kez "kaydet" der; kayıttan
// sonra sayfa geri okunur ve obs_karsilastir ile doğrulanır.
//
// Peşin onay (0.8.0): hoca başta "hepsini yap ve kaydet" derse ara durak olmaz; teyit sorulmaz (EKSİK kalır), özet
// sondaki tek raporda verilir. Onaya Gönder yine hocadadır.
//
// İstem metni veri değil asistana yönergedir; içinde hocanın girdisi yalnız isteğe bağlı kısa bağımsız
// değişkenler olarak yer alır (ders kodu, çerçeve) ve sınırlanır. Giriş bilgisi (parola, doğrulama kodu,
// çerez) istenmez; görülürse reddedilir ve kaydedilmez (ilke 8).

import { z } from "zod";
import { arac, KOD_KAYNAGI, pesinOnayVar, TARAMA_SECENEKLERI } from "./temel.ts";
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
  '- OBS\'de Kaydet düğmesine yalnız hocanın açık izniyle basarsın: önce alan alan önceki ve yeni değer özetini gösterirsin, hoca bir kez "kaydet" der. Hoca başta peşin onay verdiyse ("hepsini yap ve kaydet") izin odur; özet sondaki raporda verilir. İzin yoksa basmazsın. Onaya ya da dış kuruma Gönder düğmesine hiç basmazsın; onu hoca basar.',
].join("\n");

/** Akıllı doldurma kuralı: varsayılan yol; bütün istemlerde ve sunucu talimatında aynen geçer. */
export const AKILLI_DOLDURMA_KURALI =
  "Varsayılan akıllı doldurmadır; hocaya alan alan menü sorulmaz: her alan için en iyisini sen seçersin, araçla denetlersin, geçmeyeni düzeltip yeniden denetlersin, sonda tek özet gösterirsin.";

/** Bilinmesi mümkün olmayan ve resmî taahhüt olan bilgiler: sayfadan okunur, yoksa tek mesajda sorulur. */
export const TEYIT_SORULARI = [
  "Teyit gerektiren bilgiler (asla tahmin etme):",
  "- Değerlendirme yöntemleri ve yüzdeleri (vize, final, ödev, proje...).",
  "- Derste gerçekten kullanılan kaynaklar ve ders notları.",
  "Bunları önce sayfadan oku; sayfada doluysa SORMA. Uygulama/lab sorulmaz: T+U+L'den okunur (U+L > 0 ise var). Amaç ve içerik sayfada yoksa önden sorulmaz; 'öneri' olarak yazılıp son özette teyide sunulur.",
  "Sayfada olmayan değerlendirme ve kaynakları hocaya TEK mesajda sor. Değerlendirme yüzdesine varsayılan uydurma; hoca yazar. Örnek:",
  '  "İki bilgiyi yalnız siz bilebilirsiniz:',
  "   1) Değerlendirme yöntemleri ve yüzdeleri: yazın (ör. Vize 40, Final 60)",
  '   2) Kaynaklar: a) katalogdan doğrulayıp önereyim (önerilen) b) şunları kullanıyorum: yazın"',
  "Yanıt gelmeden değerlendirme yüzdesi yazma paketine girmez. Hocanın yanıtını degerlendirmeKaniti'ne olduğu gibi yazın (degerlendirmeDayanagi: 'hoca'); sayfadan okunduysa sayfadaki tablo metnini (degerlendirmeDayanagi: 'sayfa'). Yüzdeler bu metinde geçmezse sunucu teyitsiz sayar.",
].join("\n");

/** Akıllı doldurmanın (varsayılan yol) ayrıntısı. */
export const AKILLI_DOLDURMA = [
  "Akıllı doldurma (varsayılan):",
  "- Önce teyit gerektiren bilgileri sayfadan oku; sayfada olmayanları hocaya TEK mesajda birlikte sor (aşağıdaki kural). Bundan sonra ara soru sorma.",
  "- Kalan her alan için seçeneklerini kendin yaz ve en iyisini kendin seç. Ders adından ve program çıktılarından ürettiğin her şeyi 'öneri' etiketiyle göster.",
  "- Her seçimi ilgili araçla denetle (bologna_taslak_denetle, bologna_durum, rapor_dil_denetle). Geçmeyeni düzelt ve yeniden denetle; geçene kadar hocaya gösterme. Üç denemede geçmezse o alanı EKSİK bırak.",
  "- Sayıları (toplam, yüzde, iş yükü, sağlanma düzeyi) yalnız araç yanıtından al.",
  "- Uydurma yok: hocanın vermediği ve doğrulayamadığın bilgi (kişi, kitap, tarih, sayı, toplantı) EKSİK kalır. Kaynaklar yalnız kaynak_dogrula'dan 'katalogda_bulundu' dönenler ya da hocanın kullandığını söyledikleridir ('hoca_beyani').",
  "- Araç sonucunu 'geçer' diye sunma: 'biçim denetiminden geçti; içerik teyidi: hoca' de.",
  "- Bitince tek bir özet göster: numara, alan, ne yazdığın (ilk cümle ya da kısa özet), kaynağı (sayfa, hoca ya da öneri), biçim denetimi sonucu.",
  "- Ara özet gösterip 'devam' bekleme: OBS'ye yazılacaksa özet, yazma onayıyla aynı mesajdadır (OBS'ye yazma adımı). Özetin altına yaz:",
  "  \"Öneri yazanlar benim önerimdir, içeriği siz teyit edersiniz. 1) OBS'ye yaz ve kaydet 2) formu doldur, Kaydet'e ben basayım 3) kopya metni ver. Değiştirmek istediğiniz alan varsa numarasını yazın.\"",
  "",
  TEYIT_SORULARI,
].join("\n");

/** Bütün istemlerde ortak çalışma biçimi. */
export const ORTAK_KURALLAR = [
  "Çalışma biçimi:",
  "- Amaç: hocanın en az müdahalesiyle işi hızlı ama denetimli ve teyitli bitirmek.",
  "- Karşındaki hoca yapay zekâyı belki ilk kez kullanıyor. Kısa, sade Türkçe yaz. Araç adı, JSON ve teknik terim gösterme.",
  "- Her mesajda tek iş iste. Ne yapacağını ve ekranda ne göreceğini söyle.",
  `- ${AKILLI_DOLDURMA_KURALI}`,
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

/** Odak menüsünün başlığı: istemde ve akredit_basla yanıtında aynı. */
const MENU_BASLIGI = "Merhaba. Neye odaklanalım? Yalnız numarasını yazın.";
const BASKA = "Başka bir şey: tüm araçları kısaca listele";

const ODAKLAR = [
  ["1", "Bologna ders paketini denetle ve boş alanları doldur", "bologna_doldur"],
  ["2", "Ders öğrenme çıktısı yaz ya da iyileştir", "cikti_yaz"],
  ["3", "ÇK ve PÇ sağlanma düzeyini hesapla", "ck_pc_hesabi"],
  ["4", "YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçüt ve kanıt rehberi", "olcut_rehberi"],
  ["5", "Öz değerlendirme metninin dil denetimi", "dil_denetimi"],
] as const;

const MENU_SATIRLARI = [MENU_BASLIGI, ...ODAKLAR.map(([no, ad]) => `${no}) ${ad}`), `${ODAKLAR.length + 1}) ${BASKA}`];

/** akredit başlangıcının sorduğu odak menüsü; site örnek konuşmayı buradan okur. */
export const AKREDIT_ODAKLARI: readonly { no: string; ad: string }[] = ODAKLAR.map(([no, ad]) => ({ no, ad }));

/** OBS'ye tarayıcıyla giriş: Bologna akışının ilk adımı. */
const obsGirisi = () =>
  [
    "Adım 0. OBS'ye giriş (tarayıcı).",
    `   Hocaya önce şunu aynen söyle: "${GIRIS_KURALI_HOCAYA}"`,
    "   Tarayıcı aracın varsa (Claude in Chrome, Claude masaüstü tarayıcı paneli, ChatGPT ajan modu gibi):",
    "   a) İLK İŞ: tarayıcıda açık sekmelere bak. Açık bir OBS ya da Bologna sayfası varsa adres ve giriş sorma, doğrudan d) adımına geç. Yoksa hocaya yalnız şunu sor: \"OBS'nizin adresini yazın (bilmiyorsanız üniversitenizin adını yazın).\" Ders adını ya da paketi sorma; onları OBS'den okuyacaksın. Adres gelince hemen tarayıcıda aç. Üniversite adı gelirse kurumun OBS ya da Bologna sayfasını web aramasıyla bul ve aç.",
    '   b) Giriş ekranı gelince dur ve şunu yaz: "Kullanıcı adınızı ve parolanızı şimdi açılan OBS ekranına kendiniz yazın. Bitince bana yalnız girdim yazın."',
    "   c) CAPTCHA ya da doğrulama kodu gelirse hocanın kendisinin girmesini bekle; sen girme.",
    "   d) Hoca girdim deyince hangi dersi incelemek istediğini SORMA. Listedeki ders kodlarını ve adlarını obs_ders_listesi'ne ver, sonra kendin tara: tarama planındaki her dersin Bologna sayfasını sırayla açıp bologna_ayristir'e ver; yanıttaki denetim eksik ve kurala uymayan alanları sayar (bologna_denetle'yi ayrıca çağırma). Liste 15'erli dilimlerle taranır; sonraki dilime obs_ders_listesi'nin verdiği baslangic değeriyle geçilir.",
    "      Peşin onay varsa obs_ders_listesi'ne pesinOnay ver ve yanıtındaki adımları izle: rapor ve seçenek durağı yoktur.",
    "      Sonra tek mesajda 'Şu eksiklikleri tespit ettim, önerilerim şunlar' başlıklı kısa bir özet ver: her ders için bir satır, eksik alan sayısı (en eksikten en tamama). Aynı mesajda, eksik derslerin sayfasında olmayan değerlendirme yüzdelerini ve kaynakları da sor (Adım 3; ayrı tur açma). Altına obs_ders_listesi yanıtındaki raporBicimi seçeneklerini aynen koy:",
    ...TARAMA_SECENEKLERI.map((t) => `      ${t}`),
    '      Eksik yoksa "Eksik görünmüyor" de ve kaliteyi artıracak 2-4 somut öneri ver (zayıf ya da kısa alanlar, öğrenme çıktılarında Bloom düzeyi ve ölçülebilirlik, iş yükü ile AKTS uyumu, kaynakların güncelliği, İngilizce alanların eksiksizliği); önerilen seçenekle numaralı sun. Hoca yalnız numara yazar.',
    "   e) Dersin Bologna (ders bilgi paketi) sayfasını oku. Okuduğun metni ya da HTML'i bologna_ayristir'e ver.",
    '   Tarayıcı aracın yoksa ÖNCE eklentiyi kurdur: engel_coz (engel: tarayici_araci_yok, istemciyi biliyorsan istemci) çağır ve şunu yaz: "Akredit OBS\'nizi Chrome eklentisiyle kendisi açar, doldurur ve kaydeder; eklenti olmadan her alanı siz kopyalarsınız. Kurulum 2 dakika: 1) kuralım (önerilen) 2) kurmadan devam, metni ben yapıştırayım." 1 gelirse adımları tek tek göster, bitince yeni sohbette akredit yazmasını söyle. Yalnız 2 gelirse ya da istemcide eklenti yoksa (ChatGPT/Codex) şunu yaz: "OBS\'de dersinizin Bologna sayfasını açın, Ctrl+A ile seçip Ctrl+C ile kopyalayın ve buraya yapıştırın."',
    "   1 gelirse kurulum_yardimi'nı hocanın asistanıyla (istemci) çağır, adımları tek tek göster.",
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
  "   Ara özet gösterip 'devam' bekleme. TEK mesajda degisiklikOzeti'ni göster (numara, sekme, alan, önceki değer, yeni değer, kaynağı: sayfa, hoca ya da öneri; toplu modda bologna_toplu_ozet ile bütün dersler tek tabloda) ve altına sor:",
  "   1) OBS'ye yaz ve kaydet (bu seçim, yukarıdaki özete 'kaydet' onayıdır)",
  "   2) Formu doldur, Kaydet'e ben basayım",
  "   3) Alan alan kopya metni ver",
  "   Değiştirmek istediğiniz alan varsa numarasını yazın.",
  "   Tarayıcı aracın yoksa yalnız 3'ü sun.",
  "   Peşin onay: hoca başta 'hepsini yap ve kaydet' gibi bir sözle onay verdiyse o metni bologna_kopya_metni'ne (toplu modda bologna_toplu_ozet'e) pesinOnay olarak ver; araç 'peşin onay var' derse özet gösterip beklemeden yaz, kaydet, geri oku, doğrula ve sonda tek rapor ver. Bilmediğin resmî bilgiyi EKSİK bırak, uydurma.",
  "   1: Yalnız hoca 1 ya da 'kaydet' yazdıysa, yalnız özetteki alanları yaz ve kaydet. Her sekmeden önce ders kodunu ve dönemi sayfada denetle; beklenenden farklıysa yazmayı durdur ve hocaya söyle.",
  "   2: OBS düzenleme ekranında sekme sekme ilgili kutulara yaz. Her sekmeden sonra dur ve hocadan gözle denetleyip Kaydet'e basmasını iste.",
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
    "2. Denetle. bologna_ayristir yanıtındaki denetim alanı eksikleri ve teyit sorulacakları verir; bologna_denetle'yi yalnız bu alan yoksa çağır. Nasıl doldurulacağını SORMA: varsayılan her zaman akıllı doldurmadır.",
    "3. Teyit. Yalnız sayfada olmayan değerlendirme yüzdeleri ve kaynaklar için hocaya TEK mesaj (toplu modda bütün dersler için tek mesaj; peşin onay varsa sorma, EKSİK bırak). Uygulama/lab T+U+L'den okunur. Uydurma.",
    "   Amaç ve içerik için hocanın verdiği kısa odak yoksa ders adından ve program çıktılarından 'öneri' yaz ve öneri olduğunu söyle.",
    "4. bologna_alan_rehberi'ni alan='hepsi' ile bir kez çağır, bütün alanları tek seferde yaz.",
    "   Seçenekleri bologna_taslak_denetle ile denetle; biçim denetiminden geçmeyeni düzelt ve yeniden denetle. Uzun metinlerde ilk cümleyi ve kelime sayısını göster. Sonucu 'biçim denetiminden geçti; içerik teyidi: hoca' diye sun.",
    "   Akıllı doldurmada (4) en iyi seçeneği kendin seç ve hocaya alan alan sorma; sonunda tek özet göster.",
    "   Haftalık konular: 14 hafta, ara sınav ve yarıyıl sonu haftası görünür. Değerlendirme: yalnız sayfadan ya da hocadan; degerlendirmeDayanagi'ni ('sayfa' ya da 'hoca') ve kanıt metnini (degerlendirmeKaniti) ver.",
    "   AKTS iş yükü: is_yuku_oner'i sayfadaki değerlendirme kalemleriyle çağır; derste olmayan etkinliğe satır açılmaz. Sayfadan okunan iş yüküyle öneriyi ayrı göster. AKTS'yi değiştirme.",
    "   Öğrenme çıktısı ile program çıktısı katkı tablosu: yalnız ayrıştırılan P kodlarıyla öner.",
    KAYNAK_ADIMI,
    "5. Hepsini yazınca bologna_durum'u çağır; geçmeyeni düzelt. Ara adımda hocaya rapor verme.",
    OBS_YAZMA,
    '7. Doğrulama. Kayıttan sonra sayfayı yeniden oku (tarayıcı varsa) ya da yeniden yapıştırmasını iste; obs_karsilastir ile denetle (sayfayı yeniden ayrıştırırsan yanıttaki denetim kalan eksiği de sayar). Fark yoksa "Kaydedildi ve geri okunarak doğrulandı; içerik teyidi sizde" de.',
    "   Toplu modda sormadan sıradaki derse geç. Tek derste kısa bir sonuç cümlesiyle bitir.",
  ].join("\n");

const ciktiAkisi = (dersKodu: string) =>
  [
    `Odak: ders öğrenme çıktısı yaz ya da iyileştir.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: 1) OBS'deki mevcut çıktılarımı okuyalım (tarayıcı aracın varsa OBS girişi için Bologna akışındaki Adım 0'ı izle) 2) çıktılarımı yapıştırayım 3) sıfırdan yaz: ders adı, AKTS, T+U+L ve kısa içerik vereyim.",
    "2. bologna_alan_rehberi'ni alan=ciktilar ile çağır: kurallar, Bloom fiilleri, 4-10 sınırı (5-8 önerilir).",
    "3. Nasıl yazılacağını SORMA: 5-8 ölçülebilir çıktıyı kendin yaz, türünü (Bilgi, Beceri, Yetkinlik) belirt; hocaya ara soru sorma.",
    "4. Bütün listeyi bologna_taslak_denetle ile denetle (ciktilar alanı; İngilizce isteniyorsa en alanıyla). Geçmeyeni düzelt ve yeniden denetle.",
    "5. Tek özet göster: numara, çıktı, tür, denetim sonucu; kopya metni de aynı mesajda ver. Değiştirmek istenen numara yazılır.",
    "   Program çıktısı katkısı: P kodları ayrıştırıldıysa onlarla doldur; tarayıcın varsa program çıktıları sayfasını kendin oku. Yoksa P kodu uydurma; katkı tablosunu EKSİK bırak, akışı durdurma.",
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
    "3. Eşleme tamamsa SORMA, doğrudan hesapla (eşik 60). Başlıkta olmayan soru-çıktı eşlemesi, tam puan ya da sınav ağırlığı varsa tahmin etme; hepsini TEK mesajda sor.",
    "4. Hazır olunca ck_pc_hesapla'yı çağır. Sonucu tablo olarak göster; sayıları yalnız yanıttan al.",
    "5. Tek mesaj: kullanılan eşleme ve eşik, sonuç tablosu, eşiğin altındaki çıktılar için kısa iyileştirme notu taslağı (sayı uydurmadan). Ayrıca soru sorma.",
  ].join("\n");

const olcutAkisi = (cerceve: string) =>
  [
    `Odak: ölçüt ve kanıt rehberi.${cerceve ? ` Çerçeve: ${cerceve}.` : ""}`,
    "",
    "Akış:",
    `1. ${cerceve ? "Çerçeve verildi, sorma." : "Tek soru sor: hangi çerçeve ve konu? 1) YÖKAK 2) MÜDEK 3) FEDEK 4) EPDAD 5) SABAK; konu ya da ölçüt kodunu yanına yazabilirsiniz. Hoca çerçeve söylemezse YÖKAK ile başla."}`,
    "2. Ne istendiğini ayrıca SORMA: her zaman hepsini hazırla (resmî metin, düzeyler, kanıt kontrol listesi).",
    "3. olcut_ara ile ara; en uygun 1-2 ölçüt için hemen olcut_getir'i çağır. Resmî metni kaynağıyla göster.",
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
    "2. Rapor dönemini metinden çıkar; çıkaramazsan sorma, dönemsiz denetle.",
    "3. rapor_dil_denetle'yi çağır.",
    "4. Nasıl düzeltileceğini SORMA: her bulguyu kendin düzelt. Kanıt ya da sayı gerektiren yerde bilgi uydurma; [EKSİK: ...] yaz.",
    "5. Düzeltilmiş metni yeniden rapor_dil_denetle ile denetle; kalan bulguları düzelt.",
    "6. Tek mesaj: numaralı eski → yeni tablosu ve düzeltilmiş metnin tamamı (kopyalanabilir). Değiştirmek istenen numara yazılır.",
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
    ...MENU_SATIRLARI,
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
  "Hoca yalnız 'akredit' yazdıysa menüyü aynen göster ve numara bekle. Niyetini yazdıysa menüyü atla, o akışa başla.",
  "Her soruyu numaralı seçeneklerle sor; hoca yalnız numara yazarak ilerleyebilsin.",
  "Bologna (1) seçilince tarayıcın varsa ilk iş OBS adresini isteyip açmak; ders adını sorma, OBS'den oku.",
  "Hocaya 'hangisi?' diye sormadan önce kendin tara ve öner: bütün dersleri denetle, eksikleri say, 'önerilen' seçenekle gel.",
  "Kısa, sade Türkçe yaz; araç adı, JSON ve teknik terim gösterme. Her mesajda tek iş iste.",
  "Uydurma yok: kişi, kitap, ISBN, DOI, tarih, sayı uydurma. Bilinmeyen EKSİK kalır.",
  "Değerlendirme yöntem ve yüzdeleri ile kullanılan kaynaklar sayfadan okunur; yoksa hocaya TEK mesajda, numaralı sorulur; yüzdeye varsayılan konmaz. Uygulama/lab T+U+L'den okunur. Amaç ve içerik sayfada yoksa 'öneri' olarak yazılıp son özette teyide sunulur.",
  "Ders adından ürettiğin her şeyi 'öneri' etiketiyle göster. Araç sonucu 'biçim denetiminden geçti; içerik teyidi: hoca' diye sunulur.",
  "Sayıları yalnız araç yanıtından al.",
  "Kaynak yalnız 'katalogda_bulundu' ise öneri olarak, ya da hoca kullandığını söylerse 'hoca_beyani' olarak yazılır.",
  "Giriş bilgisi (parola, doğrulama kodu, çerez) istenmez; hoca yazarsa kullanma, araçlara gönderme.",
  "OBS'ye yazmadan önce alan alan önceki/yeni değer özeti göster; hoca bir kez 'kaydet' der (peşin onay verdiyse durak yok, sonda tek rapor). Kayıttan sonra geri oku ve obs_karsilastir ile doğrula. Gönder düğmesine hoca basar.",
  "Öğrenci adı ya da numarası sohbete yapıştırılmaz; not tablosunda yalnız not sütunları olur.",
];

/** akredit_basla aracının yanıtı: menü, kısa kurallar ve her seçimin akışı (istem desteklemeyen istemciler için). */
export function baslangic() {
  return {
    hocayaGoster: MENU_SATIRLARI.join("\n"),
    menu: [
      ...ODAKLAR.map(([no, ad, istem]) => ({ no, ad, istem })),
      { no: String(ODAKLAR.length + 1), ad: BASKA, istem: null },
    ],
    kisaKurallar: KISA_KURALLAR,
    akislar: Object.fromEntries(ODAKLAR.map(([no, , istem]) => [no, AKISLAR[istem]?.({}) ?? ""])),
    ortakKurallar: ORTAK_KURALLAR,
  };
}

/** Kullanıcı niyetini zaten yazdıysa menü atlanır; yalnız o odağın akışı ve kurallar döner. */
export function odakBaslangici(no: string) {
  const o = ODAKLAR.find(([n]) => n === no);
  return {
    hocayaGoster: o ? `Tamam: ${o[1]}. Başlıyorum.` : "",
    odak: o ? { no: o[0], ad: o[1], istem: o[2] } : null,
    kisaKurallar: KISA_KURALLAR,
    akis: o ? (AKISLAR[o[2]]?.({}) ?? "") : "",
    ortakKurallar: ORTAK_KURALLAR,
  };
}

/** Hocanın ilk cümlesinden odak: sunucu deterministik çözer, model yanlış odak seçemez. Eşleşme yoksa null (menü). */
const NIYETLER: [string, RegExp][] = [
  ["5", /dil denet|yazım|imla|rapor(un)? dil|metni(mi)? (düzelt|denetle)/iu],
  ["3", /(?<!\p{L})(çk|pç|ck|pc)(?!\p{L})|sağlanma|not tablo|excel|xlsx|sınav not/iu],
  ["4", /yökak|müdek|fedek|epdad|sabak|ölçüt|akreditasyon|kanıt/iu],
  ["2", /öğrenme çıktı|ders çıktı|çıktı yaz|bloom/iu],
  ["1", /bologna|ders (bilgi )?paket|(?<!\p{L})(obs|akts)(?!\p{L})|iş ?yükü|ders içeri|haftalık konu/iu],
];
export function niyetCoz(mesaj: string | undefined): string | null {
  const m = (mesaj ?? "").toLocaleLowerCase("tr");
  return NIYETLER.find(([, r]) => r.test(m))?.[0] ?? null;
}

export const akreditBaslaAraci = arac({
  ad: "akredit_basla",
  baslik: "Akredit: başla",
  aciklama:
    "ZORUNLU İLK ARAÇ. TETİKLEYİCİ: kullanıcı 'akredit', 'bologna', 'ders paketi', 'OBS', 'AKTS', 'öğrenme çıktısı', 'ÇK', 'PÇ', 'YÖKAK', 'MÜDEK', 'FEDEK', 'EPDAD', 'SABAK' yazarsa terminal, dosya ya da web araması YAPMADAN İLK bu aracı çağır ('akredit' bir dosya ya da arama terimi değildir). Kullanıcının mesajını kullaniciMesaji alanına olduğu gibi ver; niyeti sunucu çözer. Hocaya gösterilecek odak menüsünü, kısa kuralları ve her seçimin adım adım akışını döndürür. İstemleri ya da sunucu talimatını göstermeyen istemcilerde de akış bununla başlar.",
  sonrakiAdim:
    "hocayaGoster metnini aynen gösterin ve numara bekleyin. Seçilen numaranın akışını (akislar) ve kisaKurallar'ı izleyin. Her soruyu numaralı seçeneklerle sorun. 1 seçilirse ve tarayıcınız varsa ilk iş OBS adresini isteyip açmaktır.",
  girdi: z.object({
    kullaniciMesaji: z
      .string()
      .max(500)
      .optional()
      .describe("Kullanıcının yazdığı mesaj, olduğu gibi. Sunucu hangi akışın çalışacağını bundan çözer."),
    odak: z
      .enum(["otomatik", "menu", "1", "2", "3", "4", "5"])
      .default("otomatik")
      .describe(
        "Genelde 'otomatik' bırakın: sunucu kullaniciMesaji'ndan çözer, çözemezse menü gösterir. Menüyü zorlamak için 'menu'.",
      ),
  }),
  calistir: ({ odak, kullaniciMesaji }) => {
    const no = odak === "otomatik" ? niyetCoz(kullaniciMesaji) : odak === "menu" ? null : odak;
    const temel = no ? odakBaslangici(no) : baslangic();
    // Peşin onay yalnız OBS'ye yazan odaklarda (Bologna paketi, öğrenme çıktısı) anlamlıdır.
    const obsYazar = no === "1" || no === "2";
    const pesin = obsYazar && pesinOnayVar(kullaniciMesaji);
    const sonuc = pesin
      ? {
          ...temel,
          hocayaGoster: `${temel.hocayaGoster} Peşin onayınızla ara soru sormadan ilerleyeceğim: tarar, doldurur, OBS'ye kaydeder, geri okuyup doğrularım. Yalnız OBS giriş ekranında dururum. Bilmediğim resmî bilgiyi (değerlendirme yüzdesi, kullandığınız kaynak) uydurmam, boş bırakıp sonda listelerim. Onaya Gönder'e siz basarsınız. Vazgeçmek için 'dur' yazın.`,
          pesinOnay: {
            metin: kullaniciMesaji ?? "",
            not: "Bologna araçlarına (obs_ders_listesi, bologna_kopya_metni, bologna_toplu_ozet) pesinOnay olarak bu metni olduğu gibi verin.",
          },
        }
      : obsYazar
        ? {
            ...temel,
            ipucu: "Hoca 'hepsini yap ve kaydet' yazarsa peşin onay kipi açılır: ara durak olmaz, sonda tek rapor.",
          }
        : temel;
    return {
      sonuc,
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/promptlar.ts", "Akredit istemleri ve başlangıç menüsü")],
      hocayaSimdiSor: !no,
      ...(no
        ? {
            sonrakiAdim: pesin
              ? "hocayaGoster cümlesini yazın ve sormadan başlayın. Bologna ise ilk iş tarayıcıda OBS'yi açmaktır; ders listesi gelince obs_ders_listesi'ni pesinOnay ile çağırın."
              : "hocayaGoster cümlesini yazın ve sormadan 'akis' adımlarını izleyin. Bologna ise ilk iş tarayıcıda OBS'yi açmaktır.",
          }
        : {}),
    };
  },
});

/** SDK için bağımsız değişken şeması: hepsi isteğe bağlı, kısa metin. */
export const istemSemasi = (i: AcikIstem) =>
  Object.fromEntries(
    Object.entries(i.argumanlar).map(([k, d]) => [k, z.string().max(60).optional().describe(d)]),
  ) as Record<string, z.ZodOptional<z.ZodString>>;
