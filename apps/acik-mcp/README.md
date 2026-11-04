# @akredit/acik-mcp

Yükseköğretimde kalite güvencesi ve akreditasyon işleri için herkese açık, ücretsiz MCP sunucusu. Kendi yapay zekâ aracınıza (Claude, ChatGPT, Claude Code, Cursor, VS Code) bağlanır; hazır başlangıçlar (istemler) ve on yedi araç verir.

## İlk 2 dakika

1. Asistanınıza `https://akredit.org/mcp` adresini ekleyin (aşağıda "Bağlantı") ya da yerelde `npx -y @akredit/acik-mcp` çalıştırın.
2. Yeni sohbette `basla` yazın ya da hazır başlangıçlardan `basla` komutunu seçin. Claude'da "+" altında Akredit, Cursor ve Claude Code'da eğik çizgi (/) ile görünür. Görünmüyorsa "Akredit ile başlayalım" yazın.
3. Odağınızı seçin. Asistan her adımda 2-3 numaralı seçenek sunar; tek rakamla seçersiniz. "hepsi 1" kalan adımların hepsine uygulanır.

## Hiç bilmeyenler için

Yapay zekâyı ilk kez kullanıyorsanız bu adımları sırayla izleyin. Her adım tek iştir. Menü adları sürüme göre biraz farklı olabilir.

1. Claude'a Akredit'i ekleyin. claude.ai'de sol alttaki adınıza tıklayın, Settings (Ayarlar), sonra Connectors (Bağlayıcılar). Add custom connector düğmesine basın. Ad: Akredit. Adres: `https://akredit.org/mcp`. Add deyin. Listede Akredit görünür.
2. Yeni sohbet açın ve `basla` yazın. Ekranda beş seçenekli bir menü görürsünüz. Bologna için 1 yazın.
3. OBS'nize kendiniz girin. Asistan OBS adresinizi sorar ve tarayıcı aracı varsa sayfayı kenarda açar. Kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Asistana, sohbete ya da Akredit'e asla yazmayın. Doğrulama kodu ve "Ben robot değilim" kutusu da sizindir. Girince asistana yalnız "girdim" yazın.
4. Kenardaki tarayıcı. Claude in Chrome eklentisi, Claude masaüstü uygulamasının tarayıcı paneli ya da ChatGPT'nin ajan modu sayfayı okuyabilir. Asistan ders listenizi numaralı gösterir, siz dersin numarasını yazarsınız.
5. Seçin. Asistan eksik alanları listeler ve her alan için 2-3 seçenek sunar. Bir rakam yazın ya da "hepsi 1" deyin. Her seçimden sonra kaç alan kaldığını söyler.
6. OBS'ye yazma. Tarayıcı aracı varsa asistan formu doldurur; siz alanlara göz atıp Kaydet'e kendiniz basarsınız. Yoksa asistan alan alan kopyalanacak metni verir, siz yapıştırırsınız.
7. Engel olursa. Tarayıcı aracı yoksa, site açılmıyorsa, CAPTCHA ya da oturum düşmesi olursa asistana ne olduğunu yazın; adım adım çözüm verir. Hiçbiri olmazsa yedek yol hep var: OBS'de ders sayfasında Ctrl+A, Ctrl+C, sohbete Ctrl+V.

## Hazır başlangıçlar (istemler)

| İstem | Ne yapar |
|---|---|
| `basla` | Odak menüsü: Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi, dil denetimi. |
| `baslangic` | `basla` ile aynı; eski adıdır, geriye uyum için durur. |
| `bologna_doldur` | OBS'nize kendiniz girersiniz; asistan Bologna sayfanızı okur, eksikleri seçenekle tamamlar, formu doldurur ya da kopya metni verir. Kaydet'e siz basarsınız. |
| `cikti_yaz` | Ders öğrenme çıktılarını ölçülebilir fiillerle yazar ya da iyileştirir. |
| `ck_pc_hesabi` | Excel not tablonuzu yapıştırırsınız; ad ve numaralar atılır, ÇK ve PÇ sağlanma düzeyi hesaplanır. |
| `olcut_rehberi` | YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçütünü resmî metniyle bulur, kanıt listesi çıkarır. |
| `dil_denetimi` | Rapor metnini denetler, düzeltme seçenekleri sunar. |

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
| `kaynak_bicimle` | Hocanın verdiği kitap ya da makaleyi APA 7'ye benzer künyeye çevirir; eksik bilgiyi [EKSİK] yazar, uydurmaz. |
| `not_tablosu_ayristir` | Excel ya da CSV not tablosunu ÇK/PÇ hesabına hazırlar; ad ve numara sütunlarını atar, başlıklardan soru ve çıktı eşlemesini sezer. |
| `ck_pc_hesapla` | Ders öğrenme çıktısı ve program çıktısı sağlanma düzeyini hesaplar. |
| `rapor_dil_denetle` | Rapor metninde kanıtsız üstünlük, belirsiz özne gibi dil sorunlarını işaretler. |
| `kurulum_yardimi` | Bağlayıcı ekleme ve OBS'ye tarayıcıyla giriş için istemciye göre adım adım rehber. |
| `engel_coz` | Tarayıcı aracı yok, site açılmıyor, CAPTCHA, çerçeve, oturum düşmesi gibi engeller için numaralı çözüm adımları. |

Sunucu model çağırmaz ve metin üretmez. Bologna seçeneklerini sizin asistanınız yazar; Akredit kural ve kalıp verir, yazılanı denetler, sayıları hesaplar. Kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir; kurumunuzun yönergesi önceliklidir.

## Örnek konuşma (kurgu ders)

```
Hoca:     basla
Asistan:  Bugün neye odaklanalım? 1) Bologna paketi 2) Öğrenme çıktısı 3) ÇK/PÇ 4) Ölçüt rehberi 5) Dil denetimi
Hoca:     1
Asistan:  Önce bir kural: kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi ekranına, kendiniz yazın.
          Bana asla yazmayın. OBS adresiniz nedir?
Hoca:     obs.kurgu.edu.tr
Asistan:  OBS giriş ekranını kenarda açtım. Bilgilerinizi oraya yazın, bitince bana yalnız "girdim" yazın.
Hoca:     girdim
Asistan:  Dersleriniz: 1) KRG204 Kurgu Ölçme Yöntemleri 2) KRG305 Kurgu Veri Çözümlemesi. Hangisi?
Hoca:     1
Asistan:  Sayfayı okudum. Dersi veren satırı kişisel veri olduğu için atıldı. 9 alan eksik ya da zayıf:
          1) Amaç (boş) 2) İçerik (8 kelime) 3) Çıktılar (2 var, 8-12 olmalı) 4) Haftalar (3 var) ...
          1) Hepsini sırayla (önerilen) 2) Yalnız boşlar 3) Kendim seçeyim
Hoca:     1
Asistan:  Amaç için üç seçenek, üçü de kurallardan geçti: 1) Kavram ağırlıklı (66 kelime, önerilen) 2) ... 3) ...
Hoca:     hepsi 1
Asistan:  Kalan alanlarda hep 1. seçenekle ilerledim, hepsini denetledim. Kalan 1 alan: Kaynaklar.
          Derste kullandığınız ikinci kitabın adı ve yazarı nedir?
Hoca:     Can Deneme, Kurgu ölçme el kitabı, 2023, Kurgu Yayınları
Asistan:  Künye: Deneme, C. (2023). Kurgu ölçme el kitabı. Kurgu Yayınları. Kalan alan yok.
          1) Formu ben doldurayım, Kaydet'e siz basın (önerilen) 2) Alan alan kopyalayın
Hoca:     1
Asistan:  Ders Bilgileri sekmesini doldurdum. Lütfen göz atıp Kaydet'e basın, sonra "kaydettim" yazın.
Hoca:     kaydettim
Asistan:  Sayfayı yeniden okudum ve denetledim: Tamamlandı.
```

## Salt okuma ve güvenlik

- Bütün araçlar salt okumadır ve aynı girdiye aynı sonucu verir.
- Hesap ve anahtar gerekmez. Kurum verisine erişmez, hiçbir yere yazmaz, yapay zekâ modeli çağırmaz.
- Giriş bilgisi hiç girmez: parola, doğrulama kodu ya da oturum çerezi görülürse çağrı reddedilir, değer yanıta yazılmaz. İstemler asistana hocadan giriş bilgisi istemeyi yasaklar. CAPTCHA'yı ve OBS'deki Kaydet düğmesini hoca yapar.
- Ölçüt metinleri resmî belgeden alınmıştır. Her yanıt kaynağını (belge adresi, sayfa, SHA-256) taşır. Belgeden alınamayan metin DOĞRULANMADI olarak döner.
- Sayılar yalnız hesaptan gelir; araçlar metin uydurmaz.
- Araçlara öğrenci adı, numarası ya da başka kişisel veri göndermeyin; görülürse çağrı reddedilir. İki istisna kendiliğinden işler: `bologna_ayristir` Dersi Verenler, Dersin Yardımcıları, Koordinatör satırlarını, e-posta ve telefonları; `not_tablosu_ayristir` ad, soyad ve numara sütunlarını ayrıştırmadan önce bellekte atar, hiçbir yere yazmaz ve yanıtta neyi attığını söyler.
- Kaynakçadaki yazar adları yayımlanmış künyedir; kaynak alanlarında serbesttir. E-posta ve telefon orada da reddedilir. Kaynak uydurulmaz: asistan yalnız hocanın verdiği ya da kendi web aracıyla doğruladığı eseri önerir.
- Sunucu adres çekmez. Bologna sayfasını siz yapıştırırsınız ya da asistanınız kendi tarayıcı veya web aracıyla okur. Bağladığınız yapay zekâ hizmeti girdiyi kendi koşullarıyla işler.

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
