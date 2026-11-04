# @akredit/acik-mcp

Yükseköğretimde kalite güvencesi ve akreditasyon işleri için herkese açık, ücretsiz MCP sunucusu. Kendi yapay zekâ aracınıza (Claude, ChatGPT, Claude Code, Cursor, VS Code) bağlanır; hazır başlangıçlar (istemler) ve on bir araç verir.

## İlk 2 dakika

1. Asistanınıza `https://akredit.org/mcp` adresini ekleyin (aşağıda "Bağlantı") ya da yerelde `npx -y @akredit/acik-mcp` çalıştırın.
2. Yeni sohbette hazır başlangıçlardan `baslangic` komutunu seçin. Claude'da "+" altında Akredit, Cursor ve Claude Code'da eğik çizgi (/) ile görünür. Görünmüyorsa "Akredit ile başlayalım" yazın.
3. Odağınızı seçin. Asistan her adımda 2-3 numaralı seçenek sunar; tek rakam ya da harfle seçersiniz. "hepsi A" kalan adımların hepsine uygulanır.

## Hazır başlangıçlar (istemler)

| İstem | Ne yapar |
|---|---|
| `baslangic` | Odak menüsü: Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi, dil denetimi. |
| `bologna_doldur` | Bologna paketindeki boş ve zayıf alanları bulur, her alan için seçenek sunar, OBS'ye kopyalanacak metni verir. |
| `cikti_yaz` | Ders öğrenme çıktılarını ölçülebilir fiillerle yazar ya da iyileştirir. |
| `ck_pc_hesabi` | Takma adlı puan tablosundan ÇK ve PÇ sağlanma düzeyini hesaplatır. |
| `olcut_rehberi` | YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçütünü resmî metniyle bulur, kanıt listesi çıkarır. |
| `dil_denetimi` | Rapor metnini denetler, düzeltme seçenekleri sunar. |

## Araçlar

| Araç | Ne yapar |
|---|---|
| `olcut_ara` | YÖKAK ya da program akreditasyonu (MÜDEK, FEDEK, SABAK, EPDAD) ölçütlerinde arar. |
| `olcut_getir` | Bir ölçütün resmî metnini kaynak sayfasıyla getirir. |
| `olgunluk_duzeyleri` | Alt ölçütün olgunluk düzeylerini ve örnek kanıtlarını getirir. |
| `oz_degerlendirme_iskeleti` | Öz değerlendirme raporu iskeletini çıkarır; her bölüm EKSİK işaretli gelir. |
| `bologna_ayristir` | Yapıştırılan Bologna (Proliz) sayfası HTML'ini çözer. Adres çekmez. |
| `bologna_denetle` | Bologna ders paketini denetler; boş, zayıf ve tamam alanları numaralı verir. |
| `bologna_alan_rehberi` | Bir alanın doldurma kurallarını, sınırlarını, kalıplarını ve Bloom fiillerini verir; iş yükü hedefini hesaplar. |
| `bologna_taslak_denetle` | Asistanın yazdığı 1-3 seçeneği kurallarla denetler: geçer ya da eksik nedenleri. Toplamları kendisi hesaplar. |
| `bologna_kopya_metni` | Seçilen alanları OBS'ye alan alan kopyalanacak düz metin olarak verir. |
| `ck_pc_hesapla` | Ders öğrenme çıktısı ve program çıktısı sağlanma düzeyini hesaplar. |
| `rapor_dil_denetle` | Rapor metninde kanıtsız üstünlük, belirsiz özne gibi dil sorunlarını işaretler. |

Sunucu model çağırmaz ve metin üretmez. Bologna seçeneklerini sizin asistanınız yazar; Akredit kural ve kalıp verir, yazılanı denetler, sayıları hesaplar. Kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir; kurumunuzun yönergesi önceliklidir.

## Örnek konuşma (kurgu ders)

```
Hoca:     /baslangic
Asistan:  Bugün neye odaklanalım? 1) Bologna paketi 2) Öğrenme çıktısı 3) ÇK/PÇ 4) Ölçüt rehberi 5) Dil denetimi
Hoca:     1
Asistan:  Ders sayfasını nasıl alalım? 1) Adresi verin, ben okuyayım (önerilen) 2) Kaynağını yapıştırın 3) Sıfırdan
Hoca:     1, KRG101 Kurgu Bilimine Giriş sayfası
Asistan:  6 alan doldurulmalı: 1) Amaç (boş) 2) Çıktılar (2 var, 8-12 olmalı) 3) Haftalar (3 var) ...
          1) Hepsini sırayla (önerilen) 2) Yalnız boşlar 3) Kendim seçeyim
Hoca:     1
Asistan:  Amaç için üç seçenek, üçü de kurallardan geçti: A) Kavram ağırlıklı (78 kelime, önerilen) B) ... C) ...
Hoca:     hepsi A
Asistan:  İş yükü 150 saat, hedef 5 x 30 = 150, uyumlu. Kaynakları ve yetkilileri OBS'de kendiniz yazın.
          OBS'ye kopyalanacak metin: [Ders Bilgileri > Dersin Amacı (Türkçe) ...]
```

## Salt okuma

- Bütün araçlar salt okumadır ve aynı girdiye aynı sonucu verir.
- Hesap ve anahtar gerekmez. Kurum verisine erişmez, hiçbir yere yazmaz, yapay zekâ modeli çağırmaz.
- Ölçüt metinleri resmî belgeden alınmıştır. Her yanıt kaynağını (belge adresi, sayfa, SHA-256) taşır. Belgeden alınamayan metin DOĞRULANMADI olarak döner.
- Sayılar yalnız hesaptan gelir; araçlar metin uydurmaz.
- Araçlara öğrenci adı, numarası ya da başka kişisel veri göndermeyin; görülürse çağrı reddedilir. Bologna sayfasında Dersi Verenler ve Dersin Yardımcıları satırlarını çıkarın. Bağladığınız yapay zekâ hizmeti girdiyi kendi koşullarıyla işler.
- Sunucu adres çekmez. Bologna sayfasını siz yapıştırırsınız ya da asistanınız kendi web aracıyla okur.

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
