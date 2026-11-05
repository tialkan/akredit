# @akredit/acik-mcp

Yükseköğretimde kalite güvencesi ve akreditasyon işleri için herkese açık, ücretsiz MCP sunucusu. Kendi yapay zekâ aracınıza (Claude, ChatGPT, Claude Code, Cursor, VS Code) bağlanır; hazır başlangıçlar (istemler) ve on sekiz araç verir.

İlke: süreci sıfır kullanıcı müdahalesiyle, hızlıca ama denetimli ve teyitli tamamlamak. Akredit özgür yazılımdır; halüsinasyona yer yoktur.

## İlk 2 dakika

1. Asistanınıza `https://akredit.org/mcp` adresini ekleyin (aşağıda "Bağlantı") ya da yerelde `npx -y @akredit/acik-mcp` çalıştırın.
2. Yeni sohbette `akredit` yazın ya da hazır başlangıçlardan `akredit` komutunu seçin. Claude'da "+" altında Akredit, Cursor ve Claude Code'da eğik çizgi (/) ile görünür. Görünmüyorsa "Akredit ile başlayalım" yazın.
3. Odağınızı seçin. Her menünün son satırı "4) Hepsini akıllıca doldur"dur: asistan her alanı kendisi doldurur, denetler, geçmeyeni düzeltir ve sonunda tek özet gösterir. Değiştirmek istediğiniz alanın numarasını yazarsınız; sonradan da kolayca güncellersiniz.

## Hiç bilmeyenler için

Yapay zekâyı ilk kez kullanıyorsanız bu adımları sırayla izleyin. Her adım tek iştir. Menü adları sürüme göre biraz farklı olabilir.

1. Claude'a Akredit'i ekleyin. claude.ai'de sol alttaki adınıza tıklayın, Settings (Ayarlar), sonra Connectors (Bağlayıcılar). Add custom connector düğmesine basın. Ad: Akredit. Adres: `https://akredit.org/mcp`. Add deyin. Listede Akredit görünür.
2. Yeni sohbet açın ve `akredit` yazın. Ekranda hangi aracı kullanmak istediğinizi soran bir menü görürsünüz. Bologna için 1 yazın.
3. OBS'nize kendiniz girin. Asistan OBS adresinizi sorar ve tarayıcı aracı varsa sayfayı kenarda açar. Kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Asistana, sohbete ya da Akredit'e asla yazmayın. Doğrulama kodu ve "Ben robot değilim" kutusu da sizindir. Girince asistana yalnız "girdim" yazın.
4. Kenardaki tarayıcı. Claude in Chrome eklentisi, Claude masaüstü uygulamasının tarayıcı paneli ya da ChatGPT'nin ajan modu sayfayı okuyabilir. Asistan ders listenizi numaralı gösterir, siz dersin numarasını yazarsınız.
5. Seçin. Asistan eksik alanları listeler. 4 yazarsanız hepsini akıllıca doldurur ve tek özet gösterir; isterseniz alan alan seçenek de görebilirsiniz. Kaynakları size sormaz: ders içeriğine uygun eserleri kendi web aramasıyla bulur, Akredit'in kaynak doğrulayıcısından geçirir ve bağlantısıyla gösterir. Doğrulanamayan kaynak önerilmez.
6. OBS'ye yazma. Üç yol var: 1) asistan formu doldurur, Kaydet'e siz basarsınız 2) asistan doldurur ve sizin açık izninizle kaydeder (her sekmeden önce özet gösterip "evet" ister ya da bir kez "hepsini kaydet" izni alır) 3) alan alan kopyalarsınız. Tarayıcı aracı yoksa 3. yol kullanılır. Parolanız yine yalnız sizdedir.
7. Engel olursa. Tarayıcı aracı yoksa, site açılmıyorsa, CAPTCHA ya da oturum düşmesi olursa asistana ne olduğunu yazın; adım adım çözüm verir. Hiçbiri olmazsa yedek yol hep var: OBS'de ders sayfasında Ctrl+A, Ctrl+C, sohbete Ctrl+V.

## Hazır başlangıçlar (istemler)

| İstem | Ne yapar |
|---|---|
| `akredit` | Araç menüsü: önce hangi aracı kullanacağınızı sorar (Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi, dil denetimi ya da başka bir araç). |
| `bologna_doldur` | OBS'nize kendiniz girersiniz; asistan Bologna sayfanızı okur, eksikleri akıllıca tamamlayıp denetler, tek özet gösterir; formu doldurur ya da kopya metni verir. Kaydet'e siz basarsınız ya da açık izninizle asistan basar. |
| `cikti_yaz` | Ders öğrenme çıktılarını ölçülebilir fiillerle tek adımda yazar ya da iyileştirir, denetler, özet gösterir. |
| `ck_pc_hesabi` | Excel not tablonuzu yapıştırırsınız; öğrencilere takma ad verilir, ÇK ve PÇ sağlanma düzeyi hesaplanır. |
| `olcut_rehberi` | YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçütünü resmî metniyle bulur, kanıt listesi çıkarır. |
| `dil_denetimi` | Rapor metnini denetler, bulguları düzeltip yeniden denetler, tek özet gösterir. |

## Araçlar

| Araç | Ne yapar |
|---|---|
| `olcut_ara` | YÖKAK ya da program akreditasyonu (MÜDEK, FEDEK, SABAK, EPDAD) ölçütlerinde arar. |
| `olcut_getir` | Bir ölçütün resmî metnini kaynak sayfasıyla getirir. |
| `olgunluk_duzeyleri` | Alt ölçütün olgunluk düzeylerini ve örnek kanıtlarını getirir. |
| `oz_degerlendirme_iskeleti` | Öz değerlendirme raporu iskeletini çıkarır; her bölüm EKSİK işaretli gelir. |
| `bologna_ayristir` | Yapıştırılan ya da tarayıcıyla okunan Bologna sayfasını çözer. Önce Proliz, olmazsa her OBS için genel ayrıştırıcı (HTML ya da düz metin, Türkçe ya da İngilizce). Bulunan ve bulunamayan alanları ve güven düzeyini söyler. Adres çekmez. |
| `bologna_denetle` | Bologna ders paketini denetler; boş, zayıf ve tamam alanları numaralı verir. |
| `bologna_alan_rehberi` | Bir alanın doldurma kurallarını, sınırlarını, kalıplarını ve Bloom fiillerini verir. |
| `bologna_taslak_denetle` | Asistanın yazdığı 1-3 seçeneği kurallarla denetler: geçer ya da eksik nedenleri. Toplamları kendisi hesaplar. |
| `is_yuku_oner` | AKTS ve T+U+L'den toplamı hedefe tam eşit üç iş yükü dağılımı önerir. |
| `bologna_durum` | Seçilen alanların bütününe bakar: kaç alan kaldı, tamamlandı mı. |
| `bologna_kopya_metni` | Seçilen alanları OBS'ye alan alan kopyalanacak düz metin olarak verir. |
| `kaynak_bicimle` | Kitap ya da makale bilgisini APA 7'ye benzer künyeye çevirir; eksik bilgiyi [EKSİK] yazar, uydurmaz. |
| `kaynak_dogrula` | DOI, ISBN ya da başlık ile yazarı açık kataloglarda (Crossref, Open Library, Google Books) arar. Bulursa doğrulanmış künye ve bağlantı, bulamazsa "doğrulanamadı" döner; doğrulanamayan kaynak önerilmez. |
| `not_tablosu_ayristir` | Excel ya da CSV not tablosunu ÇK/PÇ hesabına hazırlar; ad ve numara sütunlarını atıp öğrencilere takma ad verir, başlıklardan soru ve çıktı eşlemesini sezer. |
| `ck_pc_hesapla` | Ders öğrenme çıktısı ve program çıktısı sağlanma düzeyini hesaplar. |
| `rapor_dil_denetle` | Rapor metninde kanıtsız üstünlük, belirsiz özne gibi dil sorunlarını işaretler. |
| `kurulum_yardimi` | Bağlayıcı ekleme ve OBS'ye tarayıcıyla giriş için istemciye göre adım adım rehber. |
| `engel_coz` | Tarayıcı aracı yok, site açılmıyor, CAPTCHA, çerçeve, oturum düşmesi gibi engeller için numaralı çözüm adımları. |

Sunucu model çağırmaz ve metin üretmez. Bologna seçeneklerini sizin asistanınız yazar; Akredit kural ve kalıp verir, yazılanı denetler, sayıları hesaplar. Kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir; kurumunuzun yönergesi önceliklidir.

## Örnek konuşma (kurgu ders)

```
Hoca:     akredit
Asistan:  Neye odaklanalım? 1) Bologna paketi 2) Öğrenme çıktısı 3) ÇK/PÇ 4) Ölçüt rehberi 5) Dil denetimi
Hoca:     1
Asistan:  Önce bir kural: kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi ekranına, kendiniz yazın.
          Bana asla yazmayın. OBS adresiniz nedir?
Hoca:     obs.kurgu.edu.tr
Asistan:  OBS giriş ekranını kenarda açtım. Bilgilerinizi oraya yazın, bitince bana yalnız "girdim" yazın.
Hoca:     girdim
Asistan:  Dersleriniz: 1) KRG204 Kurgu Ölçme Yöntemleri 2) KRG305 Kurgu Veri Çözümlemesi. Hangisi?
Hoca:     1
Asistan:  Sayfayı okudum. 9 alan eksik ya da zayıf:
          1) Amaç (boş) 2) İçerik (8 kelime) 3) Çıktılar (2 var, 8-12 olmalı) 4) Haftalar (3 var) ...
          1) Alan alan seçenek göstereyim 2) Yalnız boşlar 3) Kendim seçeyim 4) Hepsini akıllıca doldur (önerilen)
Hoca:     4
Asistan:  Şu alanları şöyle doldurdum, hepsi denetimden geçti:
          1) Amaç: "Bu ders, kurgu ölçme kavramlarını ..." (66 kelime)
          2) İçerik: ... 3) Çıktılar: 8 çıktı ... 9) Kaynaklar: 2 eser, ikisi de katalogda doğrulandı:
             Deneme, C. (2019). Kurgu istatistiği. Kurgu Akademi. https://books.google.com/books?id=...
          Değiştirmek istediğiniz alanın numarasını yazın; yoksa devam diyebilirsiniz.
          Bunları daha sonra da kolayca güncelleyebilirsiniz.
Hoca:     devam
Asistan:  OBS'ye nasıl yazalım? 1) Formu ben doldurayım, Kaydet'e siz basın
          2) Formu ben doldurup kaydedeyim (her sekmeden önce evet isterim) 3) Alan alan kopyalayın
          4) Hepsini akıllıca doldur ve kaydet (önerilen)
Hoca:     4
Asistan:  Bütün sekmeleri doldurup kaydetmem için izin veriyor musunuz? hepsini kaydet / hayır
Hoca:     hepsini kaydet
Asistan:  Üç sekmeyi doldurdum ve kaydettim. Dersi Verenler satırına dokunmadım.
Asistan:  Sayfayı yeniden okudum ve denetledim: Tamamlandı.
```

## Salt okuma ve güvenlik

- Bütün araçlar salt okumadır ve aynı girdiye aynı sonucu verir.
- Hesap ve anahtar gerekmez. Kurum verisine erişmez, hiçbir yere yazmaz, yapay zekâ modeli çağırmaz.
- Giriş bilgisi istenmez: parola, doğrulama kodu ya da oturum çerezi görülürse çağrı reddedilir, değer kaydedilmez ve yanıta yazılmaz. İstemler asistana hocadan giriş bilgisi istemeyi yasaklar. CAPTCHA'yı hoca çözer. OBS'de Kaydet'e hoca basar ya da hocanın açık izniyle asistan basar; onaya gönderimi hoca yapar.
- Ölçüt metinleri resmî belgeden alınmıştır. Her yanıt kaynağını (belge adresi, sayfa, SHA-256) taşır. Belgeden alınamayan metin DOĞRULANMADI olarak döner.
- Sayılar yalnız hesaptan gelir; araçlar metin uydurmaz.
- Bologna sayfasındaki Dersi Verenler, Dersin Yardımcıları ve Koordinatör satırları hocanın kendi sayfasında yayımlanmış görev bilgisidir: olduğu gibi okunur, korunur ve OBS'ye geri yazılırken değiştirilmez. Bologna araçlarında giriş bilgisi, T.C. kimlik numarası, öğrenci numarası ve IBAN reddedilir; yayımlanmış öğretim elemanı adları serbesttir.
- Öğrenci verisi sohbete yapıştırılmaz: tablo sohbete yapıştırıldığı anda yapay zekâ sağlayıcısına gitmiştir. `not_tablosu_ayristir` ad, soyad ya da numara sütunu ya da 9-11 haneli numara görürse tabloyu işlemez; hocadan bu sütunları Excel'de silmesini ya da verinin tarayıcıdan çıkmadığı https://akredit.org/deneyin hesaplayıcısını kullanmasını ister. Öbür araçlarda T.C. kimlik numarası, öğrenci numarası ve IBAN reddedilir.
- Sunucu istek içeriğini günlüğe yazmaz.
- Kaynakçadaki yazar adları yayımlanmış künyedir; kaynak alanlarında serbesttir. Kaynak uydurulmaz: asistan web aramasıyla aday bulur, her adayı `kaynak_dogrula` ile katalogda arar ve yalnız katalogda bulunanı bağlantısıyla öneri olarak gösterir; uygunluğa hoca karar verir. Katalogda olmayan eser yalnız hoca beyanıyla yazılır. Bologna araçları düz metin ya da imzasız kaynağı doğrulanmamış sayar ve OBS yazma paketine almaz.
- Sunucu kullanıcıdan adres almaz. Bologna sayfasını siz yapıştırırsınız ya da asistanınız kendi tarayıcı veya web aracıyla okur.
- Dış istek: `kaynak_dogrula` yalnız api.crossref.org, openlibrary.org ve www.googleapis.com (Books) adreslerine sorar; sunucuyu kendiniz barındırıyorsanız bu üç adrese HTTPS çıkışı açık olmalıdır. Bağladığınız yapay zekâ hizmeti girdiyi kendi koşullarıyla işler.

## Bağlantı

İki yol var: akredit.org üzerindeki uzak sunucu ya da kendi bilgisayarınızda çalışan yerel sunucu. Menü adları istemcinin sürümüne göre değişebilir.

Uzak sunucu adresi:

```
https://akredit.org/mcp
```

### Claude (claude.ai)

Customize > Connectors > + Add > Add custom connector. Adres olarak `https://akredit.org/mcp` yazın ve oturum açma gerektirmeyen seçeneği (No sign in) seçin.

### Claude Code

Uzak sunucu:

```bash
claude mcp add --transport http akredit https://akredit.org/mcp
```

Yerel sunucu (npm paketi `@akredit/acik-mcp`, Node.js 22.18 ya da üstü):

```bash
claude mcp add akredit -- npx -y @akredit/acik-mcp
```

### Cursor

`.cursor/mcp.json` (proje) ya da `~/.cursor/mcp.json` (bütün projeler):

```json
{
  "mcpServers": {
    "akredit": { "url": "https://akredit.org/mcp" }
  }
}
```

### VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "akredit": { "type": "http", "url": "https://akredit.org/mcp" }
  }
}
```

Ya da komut paletinden "MCP: Add Server".

### Yerel çalıştırma

```bash
npx -y @akredit/acik-mcp            # stdio sunucusu
npx -y @akredit/acik-mcp --http 8787 # yerel HTTP: http://localhost:8787/mcp
```

## YÖKAK ile bağı yoktur

Akredit bağımsız, açık kaynak bir araçtır. YÖKAK ya da başka bir akreditasyon kuruluşu ile bağı yoktur, onlar adına konuşmaz. Sonuçlar resmî değerlendirme yerine geçmez; beyan ve karar kurumdadır.

## Bağlantılar

- Kullanım sayfası: https://akredit.org/mcp-kullan
- Kaynak kodu: https://github.com/tialkan/akredit
- Lisans: Apache-2.0
