# Açık MCP: bir öğretim elemanının gözünden eleştiri (İP-49)

Tarih: 2026-11-04. İncelenen sürüm: `@akredit/acik-mcp` 0.1.0 (7 araç, istem yok). Yöntem: üç gerçekçi hoca akışı istemci istemci yürütüldü; her adımda hocanın ne yazdığı, asistanın neyi bilip neyi bilemediği, sunucunun ne döndürdüğü not edildi. Örnek ders kurgudur (KRG101 Kurgu Bilimine Giriş).

## Hoca kim, ne istiyor

Ders yükü yüksek, OBS ve Bologna ekranlarından bıkmış, MCP sözcüğünü ilk kez duyan bir öğretim elemanı. İstediği: "Bologna paketim eksik diyorlar, şunu 15 dakikada bitireyim." Teknik terim, JSON, araç adı görmek istemez. Her soruya tek rakamla cevap vermek ister.

## Akış 1: Claude (claude.ai), Bologna paketini denetle ve doldur

1. Bağlayıcıyı ekler (5 adım, sayfada iyi anlatılmış). Sohbeti açar ve ne yazacağını bilmez. Sunucu hiçbir hazır başlangıç (prompt) sunmuyor; "+" menüsünde Akredit altında seçilecek bir şey yok. Sürtünme: boş sayfa.
2. "Bologna paketimi denetle" yazar. Asistan `bologna_denetle` aracının JSON girdisini (kod, tul, isyuku dizisi, katkı kaydı) hocadan ister. Hoca bunları bilmez. Asistan Bologna adresini sorar; hoca adresi verir. Claude web aracıyla sayfayı okuyabilir ama tablo yapısı metne dönerken bozulur. Sunucuda yapıştırılan sayfayı ayrıştıran araç yok. Sürtünme: veri girişi.
3. Sayfa metni hoca tarafından yapıştırılırsa içinde "Dersi Verenler: Dr. Öğr. Üyesi ..." ve yardımcının e-postası vardır. Kişisel veri süzgeci bütün çağrıyı reddeder; ileti hangi satırın sorun olduğunu söylemez. Hoca neyi sileceğini bilmez. Sürtünme: yanlış anlaşılabilir ret.
4. Denetim geçerse yanıt yalnız "bulgular" listesidir: "akts-isyuku", "ders-ciktisi" gibi kural kodları. Boş alanlar (amaç, içerik, haftalık konular) listelenmez, çünkü girdi şemasında bu alanlar yok. Hoca "neyi doldurmam gerek" sorusuna cevap alamaz. Eksik çıktı: alan bazında boş/zayıf listesi.
5. Doldurma: asistan amaç ve çıktı metinlerini kendi bilgisiyle yazar. Sunucu hangi kurala göre yazılacağını (kelime aralığı, ölçülebilir fiil, 8-12 çıktı, iş yükü = AKTS x 30) söylemez; bu kurallar yalnız Claude Code eklentisinde (`apps/cli/skills/bologna-doldur`) ve `@akredit/cekirdek` taslak denetiminde var. Asistanın ürettiğini sunucuya denetletecek araç da yok. Eksik araç: alan rehberi ve taslak denetimi.
6. İş yükü: asistan "14 x 3 = 42, toplam 150" diye kendisi toplar. Bu ilke 2'ye aykırı bir alışkanlığı besler: sayı modelden gelir. Eksik: deterministik iş yükü hesabı.
7. Sonuç sohbet içinde dağınık kalır. OBS'de sekmeler (Ders Bilgileri, Öğrenme Çıktıları, Ders Akışı, Prg.Çıktısına Katkısı) ayrıdır; hocanın her alanı bulup kopyalayacağı düzenli bir çıktı yok. Eksik çıktı: alan alan kopya metni.

## Akış 2: ChatGPT (geliştirici kipi), ders öğrenme çıktısı yazma

1. Geliştirici kipini açmak kurumsal hesaplarda yönetici işi; sayfa bunu doğru söylüyor.
2. ChatGPT istem (prompt) desteği istemciye göre değişir; araçlar görünür, istemler görünmeyebilir. Bu yüzden istemler tek başına yetmez: sunucu talimatı ve her araç yanıtındaki "sonraki adım" önerisi akışı istem olmadan da taşımalı.
3. Hoca "çıktılarımı iyileştir" der. Bloom düzeyleri ve ölçülebilir fiil listesi için kaynak yok; asistan kendi bildiğini yazar. Taslak denetimi olmadığından "bilgi sahibi olur" gibi kalıplar geri dönebilir.
4. Seçenek sunma: asistan uzun paragraflarla tek öneri yazar; hoca her seferinde "kısalt", "başka" der. Hızlı seçim kalıbı (A/B/C, "hepsi A") sunucu tarafından önerilmiyor.

## Akış 3: Cursor, ÇK/PÇ hesabı ve dil denetimi

1. Cursor istemleri eğik çizgi komutu olarak gösterir; istem olmadığı için hoca araç adını bilmek zorunda.
2. `ck_pc_hesapla` girdisi çok ayrıntılı (araçlar, sorular, eşlemeler, puanlar). Hoca Excel'inden ne kopyalayacağını bilmez. İstem, tablonun hangi sütunlarla hazırlanacağını adım adım sormalı.
3. `rapor_dil_denetle` iyi çalışıyor; ancak yanıt düzeltme önermez (doğru: metni değiştirmez) ve sonraki adımı söylemez.

## Bulgular ve öncelik

| No | Bulgu | Tür | Öncelik |
|---|---|---|---|
| 1 | Hazır başlangıç (MCP prompts) yok; hoca boş sohbetle kalıyor, odak seçemiyor | Sürtünme | Yüksek |
| 2 | `bologna_denetle` boş ve zayıf alanları listelemiyor; amaç, içerik, yöntem, notlar, kaynak girdisi yok | Eksik çıktı | Yüksek |
| 3 | Doldurma kuralları ve sınırları (kelime aralığı, 8-12 çıktı, Bloom fiilleri, iş yükü kuralı) MCP'den alınamıyor | Eksik araç | Yüksek |
| 4 | Asistanın ürettiği taslağı kurallara göre denetleyen araç yok; iş yükü toplamı modelden geliyor | Eksik araç, ilke 2 riski | Yüksek |
| 5 | OBS'ye alan alan kopyalanacak düzenli çıktı yok | Eksik çıktı | Yüksek |
| 6 | Yapıştırılan Bologna sayfasını ayrıştıran araç yok; JSON'u hoca ya da asistan elle kuruyor | Sürtünme | Orta |
| 7 | Kişisel veri reddi hangi satırın sorun olduğunu ve Bologna sayfasında neyin çıkarılacağını söylemiyor | Yanlış anlaşılabilir çıktı | Orta |
| 8 | Yanıtlarda "sonraki adım" yok; istem desteklemeyen istemcide akış kopuyor | Sürtünme | Orta |
| 9 | Araç açıklamaları uzun ve teknik ("deterministik", "matris tutarlılığı"); hocanın dili değil | Dil | Orta |
| 10 | Site ve README npm paketini "henüz yayımlanmadı" diye anlatıyor; paket yayımlandı | Yanlış bilgi | Orta |
| 11 | Kaynak (kitap) ve yetkili alanları kişi adı içerir; süzgeç bunları reddeder | İlke sınırı | Düşük (tasarımla çözülür) |

## Güvenlik ve ilke sınırları (değişmez)

- Sunucu model çağırmaz. Bu yüzden seçenekleri (amaç metni, çıktı cümleleri, haftalık konular) sunucu üretemez. Tasarım: asistan üretir, sunucu kural, kalıp ve sınır verir, üretileni denetler, sayıları hesaplar. Bu ayrım her araç yanıtında ve istemde açıkça yazılı olmalı.
- Sayılar (iş yükü toplamı, AKTS başına saat, değerlendirme toplamı, ders süresi satırı) yalnız sunucu hesabından alınır. Asistan toplamı kendisi yazmaz.
- Sunucu rastgele adres çekmez (SSRF). Bologna sayfası ya hoca tarafından yapıştırılır ya da asistanın kendi web aracıyla okunur. Ayrıştırıcı yalnız yapıştırılan HTML'i işler, ağ yoktur.
- Kişisel veri reddi esnemez. Bologna sayfasındaki "Dersi Verenler", "Dersin Yardımcıları" satırları ve kaynaklardaki yazar adları gönderilmeden önce çıkarılır. Güncelleme: `bologna_ayristir` bu bilinen kişi satırlarını, e-posta ve telefonları ayrıştırmadan önce bellekte atar, yazmaz, atılan alan adlarını yanıtta söyler; kalan metin yine KVKK desenlerine takılırsa reddeder. Diğer araçlarda ret aynen sürer. Kaynaklar ve yetkililer bu yüzden MCP'nin kopya metninde yoktur; hoca OBS'ye kendisi yazar.
- Uydurma yok: kaynak kitap, ISBN, kişi ve tarih uydurulmaz. Hocanın vermediği bilgi EKSİK kalır. Resmî AKTS ya da YÖKAK metni hafızadan yazılmaz; rehberdeki kurallar Akredit'in iç kurallarıdır ve öyle etiketlenir.
- OBS'ye son kayıt hocanındır. MCP yazmaz, göndermez.

## Önerilen tasarım (bu İP'de uygulandı)

1. İstemler: `baslangic` (odak menüsü) ve her odak için ayrı istem: `bologna_doldur`, `cikti_yaz`, `ck_pc_hesabi`, `olcut_rehberi`, `dil_denetimi`. Ortak kurallar: kısa soru, her adımda 2-3 numaralı seçenek (ilki önerilen), tek rakam ya da harfle seçim, "hepsi 1" toplu onay, "sen seç" önerileni seçer, sonunda kopyalanabilir çıktı.
2. `bologna_denetle` genişledi: amaç, içerik, yöntem, notlar ve kaynak sayısı girdisi; yanıtta alan alan durum (boş, zayıf, tamam), her alanın doldurma kuralı ve sınırı, numaralı doldurma listesi.
3. `bologna_alan_rehberi`: alan bazında Akredit kuralı, sınırlar, örnek kalıplar, Bloom fiilleri, AKTS iş yükü hesabı (AKTS ve T+U+L verilirse hedef saat, ders süresi satırı ve kalan saat hesaplanır). Resmî dayanak DOĞRULANMADI olarak işaretlidir.
4. `bologna_taslak_denetle`: asistanın ürettiği 1-3 seçeneği denetler; puan değil, geçer ya da eksik nedenleri döndürür; iş yükünü ve toplamları hesaplar.
5. `bologna_ayristir`: yapıştırılan Proliz Bologna ders ya da program çıktıları sayfası HTML'ini `@akredit/baglayicilar` ayrıştırıcısıyla çözer; ağ yok.
6. `bologna_kopya_metni`: seçilen alanları OBS sekmesi ve alan adıyla sıralı düz metin olarak verir; iş yükü toplamlarını kendisi hesaplar, kalan eksikleri de yazar.
7. Her yanıtta `sonrakiAdim` önerisi; araç açıklamaları kısaltıldı.

## Kalanlar

- ChatGPT ve Cursor'da istemlerin nasıl göründüğü canlı istemcide denenmedi.
- Bologna sayfası Proliz dışındaki OBS'lerde (UBYS vb.) ayrıştırılamaz; bu durumda asistan alanları elle verir.
- Kaynak ve yetkili alanları MCP'de denetlenmez (kişisel veri sınırı); kaynak sayısı yalnız sayı olarak denetlenir.
- `ck_pc_hesapla` için Excel'den tablo hazırlama hâlâ en zor adım; bir sonraki iş olarak sütun eşleme rehberi önerilir.

## Güncelleme: sürüm 0.3.0 (2026-11-04)

Kurucunun istekleriyle akış, ilk kez yapay zekâ kullanan hoca için uçtan uca kuruldu.

1. Ana istem `basla`. `baslangic` aynı metni verir, açıklaması "basla ile aynı"; site, README, llms.txt ve testler `basla` der.
2. OBS tarayıcı akışı (`basla` ve `bologna_doldur`, Adım 0): asistan önce giriş kuralını hocaya söyler; tarayıcı aracı varsa (Claude in Chrome, Claude masaüstü tarayıcı paneli, ChatGPT ajan modu) OBS'yi kenarda açar; hoca kullanıcı adı ve parolasını yalnız OBS ekranına kendisi yazar, asistana "girdim" der. Asistan ders listesini ve Bologna sayfasını okur. CAPTCHA'yı ve Kaydet düğmesini hoca yapar. Tarayıcı aracı yoksa kurulum ya da kopyala-yapıştır yedeği (Ctrl+A, Ctrl+C, Ctrl+V).
3. `kurulum_yardimi` (istemci: Claude web, masaüstü, Claude in Chrome, ChatGPT, Cursor, VS Code, Claude Code) ve `engel_coz` (tarayıcı aracı yok, site açılmıyor, giriş ekranı, CAPTCHA, çerçeve, oturum düştü, sayfa okunamıyor, Kaydet, Akredit görünmüyor): numaralı adımlar, her adımda ne görüleceği; doğrulanmamış menü adları `degisebilir` işaretli.
4. Giriş bilgisi yasağı kodla da uygulanır: parola, doğrulama kodu, çerez, oturum kimliği ya da erişim belirteci deseni görülen çağrı reddedilir, değer yanıta girmez. `bologna_ayristir` yapıştırılan sayfadaki oturum kimliklerini ve parola kutularını bellekte atar. Bütün istemler aynı giriş kuralını taşır; test, istemlerde giriş bilgisi isteyen cümle olmadığını sınar.
5. Kaynaklar: künye kuralı. Kaynak alanlarında yazar adı kişisel veri sayılmaz (yayımlanmış künye); e-posta, telefon ve kimlik numarası yine reddedilir. `bologna_ayristir` kaynak satırlarını atmaz, künye listesi olarak verir; yalnız öğretim elemanı ve iletişim satırlarını atar. `kaynak_bicimle` APA 7'ye benzer künyeyi deterministik dizer; eksik bilgiyi [EKSİK] yazar. Asistan yalnız hocanın verdiği ya da kendi web aracıyla doğruladığı eseri önerir.
6. Proliz dışı sistemler: `bologna_ayristir` önce Proliz'i dener, olmazsa genel ayrıştırıcı (HTML ya da düz metin; Amaç/Objective, İçerik/Content, Öğrenme Çıktıları/Learning Outcomes, Haftalık Konular/Weekly Topics, Değerlendirme/Assessment, AKTS İş Yükü/Workload, Kaynaklar/References, Yöntemler, Ön koşul, Dil, Tür, T+U+L, Kredi, AKTS). Yanıtta bulunan ve bulunamayan alanlar ile güven düzeyi (yüksek, orta, düşük). Kurgu ÜBYS benzeri tablo, düz metin ve İngilizce örneklerle sınandı.
7. Uçtan uca tamamlama: ayrıştır, eksik listesi, alan başına 2-3 seçenek (varsayılan 1), sunucu denetimi, "hepsi 1", her seçimden sonra `bologna_durum` ile kalan alan sayısı, eksik kalmayınca OBS'ye yazma (tarayıcıyla, Kaydet hocada; ya da `bologna_kopya_metni`), sonra yeniden okuyup "tamamlandı" denetimi. `is_yuku_oner` hedefe tam eşit üç dağılım verir (deterministik; son kalem artığı alır).
8. ÇK/PÇ: `not_tablosu_ayristir` Excel ya da CSV yapıştırmasından ad, soyad ve numara sütunlarını ayrıştırmadan önce atar, o1, o2 takma adı verir; başlıklardan sınav, soru, tam puan ve ÇK eşlemesini sezer ("Vize S1 (ÇK1) /20"); eksikleri listeler; sütun eşleme rehberi yanıtta.
9. Site /mcp-kullan ve README: "Hiç bilmeyenler için" yedi adım ve kurgu ders ile OBS girişinden "tamamlandı"ya kadar örnek konuşma.

Testler: acik-mcp 56 test (yeni: genel ayrıştırıcı, künye kuralı, kaynak biçimi, iş yükü, not tablosu, kurulum ve engel, giriş bilgisi yasağı, SDK istemcisiyle tam Bologna turu: ayrıştır, eksik, hepsi 1, tamamlandı).

### Kalanlar (0.3.0)

- Tarayıcı akışı canlı istemcilerde (Claude in Chrome, Claude masaüstü, ChatGPT ajan modu) gerçek bir OBS ile denenmedi. Menü ve düğme adları `degisebilir` işaretli; doğrulanınca işaret kaldırılmalı.
- Genel ayrıştırıcı etiket eşlemeye dayanır; etiketsiz ya da görsel düzene dayalı sayfalarda alan bulamayabilir. O zaman güven "düşük" döner ve asistan alanları hocaya sorar.
- Katkı tablosu ve ders yapısı genel ayrıştırıcıda okunmaz; Proliz sayfasında okunur.
- `is_yuku_oner` oranları Akredit'in örnek oranlarıdır, resmî değildir.

## Dış inceleme 2026-11-05 (sürüm 0.5.0)

İki bağımsız dış incelemenin (`docs/danismanlik/2026-11-05-dis-inceleme-1.md`, `-2.md`) açık MCP ve çekirdek Bologna kurallarına dair bulguları önce kodda doğrulandı, sonra düzeltildi. Site, KVKK metinleri ve `/deneyin` bu bölümün dışındadır (web işi ayrı yürüdü). Karar: düzeltildi, kısmen ya da yanlış bulgu. Kanıt: değişen dosya ve onu sınayan test.

| No | Bulgu | Doğrulama | Karar | Kanıt |
|---|---|---|---|---|
| 1 | `istemciAdresi` x-forwarded-for'un ilk öğesini alıyor, sahtelenebilir | Doğru: `split(",")[0]` | Düzeltildi | `http.ts` `istemciAdresi`: cf-connecting-ip, x-real-ip, sonra XFF'nin sondan `guvenilenVekil` (varsayılan 1) öğesi. Test: sahte ilk öğeyle 6 istek, 4.-6. istek 429. Web `/mcp` rotası işlevi doğrudan çağırmıyor; imza değişmedi, rota dosyasına dokunulmadı. |
| 2 | `AdresKovasi` 10.000 kayıtta en eskiyi silerek sayaç sıfırlatılabiliyor | Doğru | Düzeltildi | Dolunca jetonu yeniden dolmuş kayıtlar temizlenir; yine doluysa yeni adres reddedilir. Test: dolu tabloda yeni adres reddedilir, eski adresin sayacı korunur. |
| 3 | `govdeOku` chunked gövdeyi tümüyle belleğe alıyor; şema sınırı 2 MB, HTTP 512 KB | Doğru | Düzeltildi | `govdeOku` akışı bayt sayarak okur, sınırda `cancel()` ve 413. `not_tablosu_ayristir` en çok 400.000 karakter. Test: content-length'siz sonsuz akış 1 MB'a varmadan kesilir. |
| 4 | `kaynak_dogrula` kötüye kullanımla dış API'lere yük bindirebilir | Doğru | Düzeltildi | Adres başına ayrı kota (dakikada 5 çağrı, HTTP katmanında), süreç genelinde 4 eşzamanlı dış istek (semafor), çağrı başına en çok 5 kaynak, katalog yanıtı akışla sınırlı. Testler: 6. ve 7. çağrı 429; 15 eşzamanlı istekte en çok 4 süren; akış 1 MB'da kesilir. |
| 5 | Bologna araçlarında kapsam "yok"; not tablosu kişisel veriyi sohbete taşıtıyor; "giriş bilgisi sunucuya hiç girmez" iddiası | Doğru (ikinci kısım mimari gerçek: tablo sohbete yapıştırıldığında sağlayıcıya gitmiştir) | Düzeltildi | Bologna araçları "ogrenci" kapsamında: T.C. kimlik no, öğrenci no, IBAN reddedilir; kaynak ve görev satırlarında ad ve uzun numara (ISBN, telefon) serbest. `not_tablosu_ayristir` kimlik sütunu ya da 9-11 haneli numara görürse işlemez ve istenen iletiyi aynen verir. Talimat, istemler, README ve hata iletisi "istenmez, görülürse reddedilir, kaydedilmez" diye daraltıldı. |
| 6 | `maskele()` büyük girdide olay döngüsünü kilitleyebilir | Kısmen doğru | Kısmen | HTML'de yalnız görünen metin taranır (betik, stil, etiket, öznitelik atılır). Ölçüm: 512 KB Bologna HTML'i "ogrenci" kapsamında ~30 ms (test sınırı 300 ms). "tam" kapsamında 512 KB düzyazı ~460 ms sürüyor; bu kapsam yalnız `not_tablosu_ayristir` (kimlik sütunu varsa ağır taramadan önce reddedilir; sayısal 480 KB tablo ~70 ms) ve `ck_pc_hesapla` (yapılandırılmış sayılar) içindir. |
| 7 | Düz "akredit" yazmak istemi tetiklemez | Doğru | Düzeltildi | Yeni parametresiz `akredit_basla` aracı (listede ilk): menü, kısa kurallar ve her seçimin akışını yapılandırılmış döndürür. Talimat bu aracı ilk çağırtır. Test: SDK ile parametresiz çağrı. |
| 8 | "Hepsini akıllıca doldur" uydurmaya itiyor | Doğru | Düzeltildi (istem düzeyi) | Seçenek 4 kaldı. Değerlendirme yöntem ve yüzdeleri, uygulama/lab, kullanılan kaynaklar ve sayfada yoksa amaç/içerik sayfadan okunur; yoksa TEK mesajda numaralı ve varsayılanlı sorulur. Ders adından üretilen her şey "öneri". Araç yanıtları `bicimDenetimi: geçti/geçmedi` ve `icerikTeyidi: hoca` döner; "geçer" yok. Kodla uygulanan kısım: teyitsiz değerlendirme yüzdesi yazma paketine girmez (bkz. 10). |
| 9 | `is_yuku_oner` derste olmayan etkinlik ekliyor | Doğru | Düzeltildi | Satırlar yalnız verilen değerlendirme kalemlerinden; her satırda `kaynak` ve `varsayim`; sayfadan okunan iş yükü `sayfadanOkunan` olarak ayrı. Değerlendirme verilmezse etkinlik satırı yok, `eksik` iletisi var. Testler el hesabıyla. |
| 10 | OBS'ye yazma güvencesi yok | Doğru | Düzeltildi (sunucu kapısı) / kısmen (tarayıcı eylemi asistanda) | "Formu ben doldurup kaydedeyim" kaldı; `bologna_kopya_metni` `degisiklikOzeti` (önceki/yeni), `yazilamayan` ve `obsKarsilastirGirdisi` döndürür. Yeni `obs_karsilastir` geri okunan sayfayı alan alan karşılaştırır, ders kodu ya da dönem farklıysa `dur: true`. Doğrulanmamış kaynak ve teyitsiz yüzde pakete giremez (test). Kaydet düğmesine basmayı sunucu engelleyemez; istem tek "kaydet" onayı ister. |
| 11 | Taslak denetimi kaynakların doğrulandığına bakmıyor | Doğru | Düzeltildi | Kaynak `{ kunye, dogrulama }`: `kaynak_dogrula` sonucu (durum, baglanti, imza) ya da `hoca_beyani`. İmza süreç anahtarıyla HMAC'tir; asistan üretemez. Düz metin, imzasız ya da sahte imzalı kaynak "doğrulanmamış kaynak yazılamaz" hatası verir. Test: altı kaynak türü. |
| 12 | `kaynak_dogrula` gevşek eşleşme, tür ve yıl yok | Doğru | Düzeltildi | Tam soyad belirteci, iki sözcüklü başlıkta birebir küme, kayıt türü (kitap aranırken makale kabul edilmez), yıl birebir, ISBN sağlama basamağı. Sonuçta `kimlik_eslesmesi`, `bibliyografik_tamlik`, `ders_kaynagi_uygunlugu: hoca karar verir` ayrı; durumlar `katalogda_bulundu` / `bulunamadi`. Türkçe kitap katalogda yoksa yalnız hoca beyanıyla yazılır. TOKAT gibi ulusal katalog eklenmedi. |
| 13 | Taslak kuralları (8-12 ÖÇ, yalnız geniş zaman, tam AKTS eşitliği, İngilizce varsayılan) | Doğru | Düzeltildi | `taslakDenetle` "guncel" kural seti (açık MCP bunu kullanır): ÖÇ 4-10 geçerli, 5-8 dışı uyarı; "-ebilme/-abilme" kabul; "sahip ol, farkında ol, haberdar ol, vakıf ol" ölçülemez; iş yükü AKTS başına 25-30 saat, kurum değeri (bolen) verilirse tam o değer; sayfa denetimi aynı aralığı ve `kurumBoleni`'ni kullanır. Her bulgu `kuralTuru` (resmî, kurum, Akredit önerisi) ve `dayanak` taşır; hiçbiri resmî belgeyle doğrulanmadığı için "resmî" yok. İngilizce varsayılanı false; `bologna_ayristir` sayfada İngilizce alan varsa `ingilizce: true` döndürür. Varsayılan "cli" seti CLI ile eşdeğer kaldı (eşdeğerlik testleri değişmedi). |
| 14 | Ctrl+A/Ctrl+C düz metninde katkı matrisi ve ders yapısı okunmuyor | Doğru | Düzeltildi | Sekmeli matris satırlarında boş hücre korunur; başlıkta en az iki P kodu, altında Ö ve "Tüm" satırları; etiket sütunu yoksa kaydırma. Ders yapısı etiketi eklendi. Proliz düz metni `proliz_duz_metin` olarak tanınır. Test: kurgu Proliz düz metni. |

Yanlış bulgu olarak ayrılan yok. Kısmen kalanlar: madde 6 ("tam" kapsamı büyük düzyazıda 300 ms üstü), madde 8 ve 10'un asistan davranışı (istemle yönlendirilir, sunucu yalnız paket ve karşılaştırma kapısını uygular).

Testler: acik-mcp 98 (yeni `test/dis-inceleme.test.ts` ve güncellenen akış testleri), cekirdek 127 (yeni "guncel" kural seti testleri), apps/cli 38 (eşdeğerlik değişmedi). `pnpm check` ve `pnpm typecheck` temiz (yalnız önceden var olan uyarılar).

Bilinen sınırlar:

- Kaynak imza anahtarı süreç başına rastgeledir; birden çok süreç ya da yeniden başlatma arasında geçerli olsun isteniyorsa `AKREDIT_MCP_IMZA_ANAHTARI` (en az 16 karakter) verilmeli. Anahtar değişirse kaynak yeniden sorgulanır (güvenli yön).
- cf-connecting-ip'ye ancak köken sunucuya yalnız Cloudflare üzerinden erişiliyorsa güvenilir; köken doğrudan açıksa ters vekilde bu başlık silinmeli. Canlı dağıtımda DOĞRULANMADI.
- `obs_karsilastir` metin içerme karşılaştırmasıdır; OBS'nin metni biçimlendirmesi (ör. satır sonu, yüzde işareti) farklı gösterebilir, fark hocaya gösterilir.
- Gerçek OBS'lerde uçtan uca deneme yapılmadı; katalog testleri kurgu kayıtlarla.
