# İP-07: Web iskeleti, tasarım sistemi ve onay kutusu arayüzü

- **Durum:** hazır
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (veri sahte kaynaktan; gerçek bağlantı İP-12'de)
- **Sahip olduğu yollar:** `apps/web/**`, `docs/raporlar/IP-07.md`
- **Büyüklük:** büyük

## Amaç

akredit.org'un yüzü: kurumlara ürünü dürüstçe anlatan tanıtım sitesi ve hocanın neredeyse tek dokunduğu yer olan **onay kutusu** başta olmak üzere uygulama panelinin arayüzü. Veri katmanı arayüzle ayrılır; şimdilik sahte, belirlenimci örnek veriyle çalışır.

## Tasarım yönü

- Kurumsal, sakin, güven veren; yapay zekâ klişesi (mor degrade, parıltı, robot) yok. Okunabilirlik önce gelir: hocalar uzun metin ve tablo okuyacak.
- Türkçe karakterleri tam destekleyen bir yazı tipi; ağ olmadan derlenebilmesi için npm'den yerel paket (ör. `@fontsource-variable/...`), `next/font/google` kullanılmaz.
- Açık ve koyu tema; renkler CSS değişkenleri olarak; WCAG 2.2 AA kontrast.
- Risk düzeyleri hem renk hem metin/simgeyle ayırt edilir (renk körlüğü).
- Masaüstü öncelikli ama 360 px telefonda onay kutusu rahat kullanılır (hocalar onayı telefondan verecek).
- `frontend-design` becerisi varsa oku ve uygula.

## Kapsam

1. **Tasarım sistemi** (`src/bilesenler/`): düğme, metin alanı, seçim, onay kutusu, rozet (risk), kart, tablo (sıralanabilir başlık, klavye), sekmeler, iletişim kutusu (odak tuzağı, Esc), bildirim (toast), boş durum, iskelet yükleme, kırıntı yolu, kenar çubuğu. Her bileşen klavye ve ekran okuyucuyla kullanılabilir.
2. **Tanıtım sitesi** (Türkçe, sunucu bileşenleri, istemci JS'i en az):
   - `/`: ne yaptığı (kanıt toplar, ölçer, yazar, denetler, hatırlatır), hocanın ne yaptığı (yalnız onay) ve sistemin ne yaptığı yan yana; nasıl çalıştığı 4 adım; güvenlik ve KVKK özeti; açık kaynak; kurumlar için; SSS.
   - `/nasil-calisir`, `/guvenlik`, `/kvkk` (taslak olduğu açıkça yazılı yer tutucu; hukuk incelemesi İP-28), `/acik-kaynak`, `/iletisim`.
   - Dürüstlük kuralları: akreditasyon garantisi verilmez; hiçbir akreditasyon kuruluşuyla bağ iması yok; uydurma müşteri, logo, yorum ya da istatistik yok. Mevcut Akreddit sayfasındaki SSS dili örnek alınabilir.
3. **Veri katmanı** (`src/veri/`): `VeriKaynagi` arayüzü (onaylar, kanıtlar, programlar, dersler, raporlar, süreçler, ayarlar için okuma ve `kararVer`, `topluKararVer`, `politikaTaslagiOlustur` gibi yazma işlevleri). `src/veri/ornek.ts`: kurgu "Örnek Üniversitesi", "Bilgisayar Programcılığı" önlisans programı, 6 ders, program ve ders çıktıları, 20 kanıt, her risk düzeyinden 15+ öneri, 2 rapor, takvim. Türler `@akredit/cekirdek`'ten gelir (`Oneri`, `Karar`, `Kanit`, `Cikti`, `MatrisDegeri`, `RiskDuzeyi`, ...).
4. **Panel** (`/panel`, giriş yokken sahte kullanıcı):
   - `/panel`: bugün bekleyen kararlar (risk düzeyine göre sayılar), yaklaşan son tarihler, ölçüt kapsaması, "bu dönem harcadığınız süre" kutusu.
   - `/panel/onaylar` (**en önemli ekran**): risk düzeyine göre gruplar; düşük ve orta risk için toplu seçip onaylama; her satırda önerinin özü, gerekçe, güven, kanıt atıfları (alıntı ve sayfa, tıklayınca kanıt görüntüleyici); onayla / düzelt (satır içi düzenleme) / reddet (isteğe bağlı gerekçe); yüksek risk tek tek ve kanıtlar açık; "bu türü bundan sonra otomatik onayla" → yetki politikası taslağı (imza gerektirir, yüksek risk için seçenek yok). Klavye kısayolları (j/k gezinme, a onay, d düzelt, r ret, x seç) ve ekranda yardım.
   - `/panel/kanitlar` (filtre, arama, sürükle-bırak yükleme arayüzü), `/panel/kanitlar/[id]` (çapalı metin görüntüleyici, bağlı ölçütler).
   - `/panel/programlar/[id]`: çıktılar, matris (erişilebilir ısı tablosu: sayı + renk), ölçme özeti (ÇK/PÇ çubukları, eşik çizgisi).
   - `/panel/dersler/[id]`: Bologna sayfası durumu, ders dosyası durumu.
   - `/panel/raporlar` ve `/panel/raporlar/[id]`: bölümler ve kapsama, atıf çipleri, `EKSİK` işaretleri vurgulu.
   - `/panel/surecler`: takvim ve görev listesi.
   - `/panel/ayarlar`: kurum bilgisi; YZ sağlayıcısı (EVREN, kurum sunucusu, Ollama, diğer) ve "yurt dışı sağlayıcıya izin" anahtarı (açıklamalı); yetki politikaları listesi ve yeni politika formu.
   - `/giris`: arayüz (e-posta bağlantısı ve kurum ile giriş düğmeleri), işlevi İP-09'da.
5. **Testler**: yardımcı işlevler için Vitest; Playwright uçtan uca duman testi (ana sayfa, panel gezinme, onay akışı sahte veride) ve `@axe-core/playwright` ile ana sayfalarda ciddi/kritik erişilebilirlik ihlali olmaması. Bu ortamda Chromium `/opt/pw-browsers` altında kuruludur (`PLAYWRIGHT_BROWSERS_PATH`); sürüm uyuşmazsa `executablePath` ile oradaki Chromium'u kullan, tarayıcı indirmeye çalışma.

## Kabul ölçütleri

- [ ] `pnpm --filter @akredit/web build` ağ olmadan başarılı.
- [ ] Onay kutusunda toplu onay, düzeltme, ret ve politika taslağı akışları sahte veride çalışıyor; yüksek risk toplu onaylanamıyor ve politikaya bağlanamıyor (arayüz + `VeriKaynagi` düzeyinde).
- [ ] Playwright duman testleri ve axe denetimi geçiyor.
- [ ] Bütün metinler Türkçe; tanıtım sayfalarında doğrulanmamış iddia yok.
- [ ] `pnpm verify` temiz.

## Kapsam dışı

Gerçek kimlik doğrulama (İP-09), gerçek API (İP-12), dosya yüklemenin sunucu tarafı (İP-10).

## Günlük

- 2026-10-23: İP tanımlandı; Next.js 16 iskeleti derleniyor.
