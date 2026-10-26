# Akredit ana planı

- **Sürüm:** 1 (2026-10-23)
- **Sahibi:** Tarık İsmet ALKAN · Kulular Teknoloji
- **Yayın adresi:** akredit.org
- **Bu belge yaşayan belgedir.** Alt ajanlar ve geliştiriciler işe buradan başlar. Durum tablosunu (§8) orkestratör günceller; İP ayrıntıları `plan/ip/` altındadır.

## 0. Bir bakışta

**Ne:** Akredit, Türk yükseköğretiminde kalite güvencesi ve akreditasyon süreçlerini uçtan uca yürüten, yapay zekâ destekli, açık kaynak bir platformdur. Kanıtı kaynağından toplar, ölçer, raporu atıflı yazar, eksikleri bulur, süreçleri takvimine göre yürütür ve her adımı değiştirilemez biçimde kaydeder.

**Neden:** Akreditasyon hazırlığı bugün öğretim elemanlarının dönemde onlarca saatini alıyor: Bologna sayfaları, ders dosyaları, ÇK/PÇ hesapları, anketler, tutanaklar, öz değerlendirme raporları. Bu işin büyük kısmı veri taşıma, hesap ve yazımdır; makine yapabilir.

**Hedef:** Hocanın akreditasyon ve kalite iş yükünü sıfıra yaklaştırmak. Hocaya kalan iş: eğitimi yapmak ve önüne gelen önerilere tek dokunuşla karar vermek.

**Nasıl:** Mevcut Akreddit motoru (kanıt kaydı, Bologna denetimi, matris, atıf denetimi, onaylı yazma, değiştirilemez günlük) çekirdek olur; üstüne çok kiracılı web platformu, kanıt hattı, ölçme motoru, süreç motoru, rapor üreticileri ve onay kutusu kurulur.

**Ne değildir:** Akreditasyon garantisi vermez. Hiçbir akreditasyon kuruluşuyla bağı yoktur. Yapılmamış bir faaliyeti yapılmış gibi yazmaz; bunun yerine faaliyeti planlar ve yürütür.

| Faz | Amaç | Durum |
|---|---|---|
| 0 Hazırlık | Depo, plan, kurallar, sözleşmeler, CI | tamam |
| 1 Temeller | Çekirdek, veritabanı, YZ katmanı, belge, bağlayıcılar, ölçme, web iskeleti | devam |
| 2 Platform omurgası | Kimlik, kanıt hattı, çerçeveler, API, onay ve yetki devri, süreç motoru | bekliyor |
| 3 Ders düzeyi | Bologna otomasyonu, ders dosyası, anketler, toplantı asistanı | bekliyor |
| 4 Program ve kurum | ÖDR, BİDR/KİDR, göstergeler, değerlendirici portalı, bağlayıcılar II, CLI, MCP | bekliyor |
| 5 Yayın | Üretim altyapısı, güvenlik denetimi, KVKK, belgeler, pilot | bekliyor |
| 6 Ölçek | Kıyaslama, mobil onay, kurum içi kurulum paketi | bekliyor |

## 1. Başarı ölçütleri

| Ölçüt | Hedef | Nasıl ölçülür |
|---|---|---|
| Hoca başına dönemlik kalite/akreditasyon işi | ≤ 15 dakika (yalnız kararlar) | Onay ekranında geçen süre (insan dakikası), pilotta önce/sonra karşılaştırması |
| Kanıtların hocadan istenmeden gelme oranı | ≥ %80 | Kanıt kaynak türü dağılımı |
| Atıf geçerliliği (yayımlanan her rapor) | %100 | Atıf denetimi; altında kalan rapor dışa aktarılamaz |
| Kanıtsız iddia | 0 | Rapor denetimi + değerlendirme düzeneği |
| KİDR/ÖDR taslağının kanıtlar hazırken üretim süresi | < 1 gün | Süreç kayıtları |
| Kiracılar arası erişim | 0 | Otomatik testler + bağımsız sızma testi |
| Erişilebilirlik | WCAG 2.2 AA | Otomatik + elle denetim |
| Öneri kabul oranı (onay + küçük düzeltme) | ≥ %85 | Karar kayıtları; ret oranı yüksekse hız kazancı başarı sayılmaz |

## 2. İlkeler

Değişmez ilkeler `CLAUDE.md` başındadır ve kodla uygulanır: kanıtsız iddia yok, uydurma yok, beyan ve son gönderim insanda, değiştirilemez kayıt, belge veridir, resmî metin hafızadan yazılmaz, en az kişisel veri, giriş bilgisi YZ'ye verilmez.

**"Sıfır iş yükü" nasıl tanımlanır** (ayrıntı: `docs/adr/0004-sifir-is-yuku-ve-insan-karari.md`):

| İş | Kim yapar |
|---|---|
| Kanıt toplama (OBS, Bologna, AVESİS, e-posta, belgeler) | Sistem |
| Hesap (ÇK/PÇ, not istatistikleri, göstergeler, anket istatistikleri) | Sistem (deterministik) |
| Taslak (ders sayfası, ders dosyası, tutanak, rapor bölümü, eylem planı) | Sistem (YZ, atıflı) |
| Denetim (kurallar, atıf, sayı, eksik, tutarlılık) | Sistem |
| Süreç yürütme (takvim, davet, anket gönderimi, hatırlatma, yükseltme) | Sistem |
| Düşük ve orta riskli kararlar | Hoca tek dokunuşla ya da komisyon başkanının imzaladığı yetki politikası |
| Yüksek riskli kararlar (kurum adına beyan, olgunluk düzeyi, kurum sistemine yazma, dış kuruma gönderim) | Yetkili kişi, tek tek, devredilemez |
| Eğitim, araştırma, toplantıya katılım (faaliyetin kendisi) | İnsan |

## 3. Kapsam: süreç kataloğu

| # | Süreç | Düzey | Bugün | Akredit'te | İnsana kalan | İP |
|---|---|---|---|---|---|---|
| 1 | Bologna ders bilgi paketi | Ders | Hoca her dersi OBS'de elle doldurur | Okur, denetler, eksiksiz taslak yazar, K1-K12'den geçirir, aktarım planı | Taslağa tek onay; OBS'de son kaydet | 15 |
| 2 | Ders dosyası | Ders | Kâğıt, not listesi, ÇK hesabı elle toplanır | Not dökümü ve sınav belgelerinden dosya, sonuç, iyileştirme önerisi | İlk dönem soru-ÇK eşlemesine ve dosyaya onay | 16 |
| 3 | ÇK ve PÇ ölçme | Ders, program | Excel formülleri | Deterministik ölçme motoru | — | 06, 16 |
| 4 | AKTS iş yükü doğrulama | Ders | Çoğu zaman yapılmaz | Öğrenci iş yükü anketi + Bologna karşılaştırması | — | 17 |
| 5 | Ders değerlendirme anketi analizi | Ders | Rapora bakılır | Analiz, ders dosyasına ekleme | — | 17 |
| 6 | Ders-program çıktısı matrisi | Program | Komisyon tabloyu elle doldurur | Kanıta dayalı öneri, şişirme denetimi | Toplu onay | 01, 19 |
| 7 | Danışma kurulu ve paydaş toplantıları | Program | Davet, gündem, tutanak elle | Planlama, gündem, tutanak taslağı, karar → eylem | Katılım; tutanağa onay | 18 |
| 8 | Mezun, işveren, iç paydaş anketleri | Program, kurum | Dağınık, düşük yanıt | Gönderir, hatırlatır, analiz eder | — | 17, 14 |
| 9 | PUKÖ eylem takibi | Program, birim | Excel listeleri, unutulur | Eylemler süreç motorunda, kanıt bağlanır | Eylemin kendisi | 14 |
| 10 | Kanıt toplama ve arşiv | Hepsi | Klasörler, e-posta ekleri | Kanıt hattı; özetli, değişmez | İsteğe bağlı: belgeyi kurum adresine iletmek | 10 |
| 11 | Program öz değerlendirme raporu (ÖDR) | Program | Komisyon aylarca yazar | Kapsama haritası, eksik analizi, atıflı taslak | Bölüm onayı; son gönderim | 19 |
| 12 | Birim iç değerlendirme raporu (BİDR) | Birim | Birim komisyonu yazar | Otomatik derleme | Onay | 20 |
| 13 | Kurum iç değerlendirme raporu (KİDR) | Kurum | Kalite birimi birimlerden toplar | Birleştirme, olgunluk önerisi, eksik analizi | Olgunluk kararları; son gönderim | 20 |
| 14 | Dış değerlendirme ziyareti hazırlığı | Kurum, program | Kanıt odası, program elle | Sanal kanıt odası, değerlendirici portalı | Görüşmeler | 22 |
| 15 | Ara değerlendirme ve izleme yanıtları | Kurum, program | Elle | Gelişmeye açık yönler → eylem planı → kanıt | Onay | 20 |
| 16 | Performans göstergeleri, stratejik plan | Kurum | Excel | Veriden hesap, hedef izleme | Hedef belirleme | 21 |
| 17 | Akademik faaliyet kanıtları (AVESİS) | Kişi | Elle giriş | Okuma; gerekirse onaylı yazma | Onay | 23 |
| 18 | Takvim ve son tarihler | Hepsi | Hatırlamaya dayalı | Süreç motoru | — | 14 |

## 4. Mevcut durum: Akreddit'ten ne geliyor

`apps/cli` altında, git geçmişiyle birlikte (3 commit, 23 test, hepsi geçiyor):

| Bileşen | Dosya | Akredit'teki yeri |
|---|---|---|
| Kanıt kaydı (SHA-256, salt okunur), adım günlüğü, değiştirilemez SQLite tabloları | `bin/akreddit` | Model → `packages/vt` (PostgreSQL), mantık → `packages/cekirdek` |
| Çıktılar, öneri/karar, matris, rapor atıf denetimi, pilot ölçümü | `bin/akreddit` | `packages/cekirdek` (İP-01) |
| Onaylı yazma planı + tarayıcı koruma kancası | `bin/akreddit`, `scripts/koruma.mjs` | Korunur; platformda İP-15 ve İP-24 |
| Bologna (Proliz) okuyucu ve denetleyici | `lib/bologna.mjs` | Okuyucu → `packages/baglayicilar` (İP-05), denetim → `packages/cekirdek` (İP-01) |
| Ders sayfası taslak denetimi (K1-K12) | `lib/bologna-taslak.mjs` | `packages/cekirdek` (İP-01) |
| OpenAI uyumlu ajan, EVREN ayarı, kurulum sihirbazı | `lib/ajan.mjs`, `lib/model.mjs`, `lib/kurulum.mjs` | Desen → `packages/yz` (İP-03) |
| PDF/Word okuma | `lib/belge.mjs` | `packages/belge` (İP-04) |
| Claude Code becerileri ve sistem haritaları (OBS, AVESİS, Bologna) | `skills/`, `bilgi/` | Korunur; görev istemleri ve bağlayıcılar için kaynak |

İskelette hazırlananlar (Faz 0): pnpm çalışma alanı, TypeScript ve Biome ayarları, paket iskeletleri, `@akredit/cekirdek` tür sözleşmesi, atıf sözdizimi, Türkçe normalleştirme, kanonik JSON ve özet, UUID v7, `@akredit/belge` arayüz imzaları, Next.js 16 iskeleti, CI, ADR'ler, bu plan ve İP dosyaları.

## 5. Mimari

Ayrıntı: `docs/mimari.md`. Özet:

- **Tek depo**, pnpm çalışma alanı, TypeScript 6 (strict), Node 22.18+ (derlemesiz), Vitest, Playwright, Biome.
- **Web:** Next.js 16 App Router (tanıtım sitesi + panel + değerlendirici portalı + `/api/v1`).
- **İşçi:** pg-boss ile arka plan işleri (kanıt hattı, OCR, YZ, bağlayıcılar, raporlar, süreçler).
- **Veri:** PostgreSQL 17 + pgvector, kiracı başına satır güvenliği, yalnız-ekleme tablolar, kurum başına özet zinciri; S3 uyumlu içerik adresli nesne deposu.
- **YZ:** sağlayıcıdan bağımsız (EVREN, kurumun vLLM sunucusu, Ollama; izinliyse yurt dışı), atıf/sayı/şema/enjeksiyon/KVKK güvenceleri kodla.
- **Dağıtım:** akredit.org (çok kiracılı, Türkiye'de) ve kurum içi kurulum (tek kiracılı, aynı kod).

## 6. Akreditasyon çerçeveleri ve mevzuat

> Bu bölüm araştırma ajanlarının bulgularıyla doldurulur (`docs/arastirma/`). Resmî metinler hafızadan yazılmaz; her bilgi kaynağıyla verilir, doğrulanmamış bilgi `DOĞRULANMADI` diye işaretlenir.

## 7. Yol haritası

Tarihler hedeftir. Yazılım işleri ajanlarla hızlı ilerler; hız sınırını insan işleri (hukuk incelemesi, sızma testi, pilot izni, uzman doğrulaması) belirler.

| Kilometre taşı | Hedef tarih | Çıkış ölçütü |
|---|---|---|
| M0 Hazırlık | 2026-10-23 | Depo, plan, sözleşmeler, CI; 1. dalga başladı |
| M1 Temeller + omurga | 2026-11 sonu | Faz 1-2 İP'leri tamam; panel gerçek veritabanıyla çalışıyor; iç demo |
| M2 Ders düzeyi | 2026-12 sonu | Bologna otomasyonu ve ders dosyası uçtan uca; Güz dönemi sonu için pilot hazır |
| M3 Kapalı beta | 2027-02 | akredit.org hazırlık ortamında pilot birim; Güz ders dosyaları üretildi; insan dakikası ölçülüyor |
| M4 Program ve kurum | 2027-04 | ÖDR, BİDR/KİDR üretimi; değerlendirici portalı |
| M5 Genel yayın | 2027-06 | Güvenlik denetimi, KVKK paketi, belgeler tamam; akredit.org üretimde |
| M6 Ölçek | 2027-2028 | Kurum içi kurulum paketi, kıyaslama, mobil onay |

## 8. İş paketleri

Durumlar: **hazır** (başlanabilir), **devam**, **inceleme**, **tamam**, **bekliyor** (bağımlılık var).

| İP | Ad | Faz | Durum | Bağımlılık |
|---|---|---|---|---|
| [01](plan/ip/IP-01-cekirdek.md) | Çekirdek alan mantığı | 1 | tamam | — |
| [02](plan/ip/IP-02-veritabani.md) | Veritabanı, kiracı yalıtımı, değiştirilemez kayıt | 1 | tamam | — |
| [03](plan/ip/IP-03-yz-katmani.md) | YZ katmanı ve güvenceler | 1 | tamam | — |
| [04](plan/ip/IP-04-belge-isleme.md) | Belge işleme | 1 | tamam | — |
| [05](plan/ip/IP-05-baglayicilar.md) | Bağlayıcılar I (Bologna, OBS not aktarımı) | 1 | tamam | — |
| [06](plan/ip/IP-06-olcme-motoru.md) | Ölçme motoru (ÇK/PÇ) | 1 | tamam | — |
| [07](plan/ip/IP-07-web-iskeleti.md) | Web iskeleti, tasarım sistemi, onay kutusu arayüzü | 1 | tamam | — |
| [08](plan/ip/IP-08-gelistirme-altyapisi.md) | Geliştirme altyapısı ve CI | 1 | inceleme | — |
| [09](plan/ip/IP-09-kimlik-ve-yetki.md) | Kimlik doğrulama, kiracı ve yetki | 2 | tamam | 02, 07 |
| [10](plan/ip/IP-10-kanit-hatti.md) | Kanıt hattı ve nesne deposu | 2 | tamam | 02, 03, 04 |
| [11](plan/ip/IP-11-cerceveler.md) | Akreditasyon çerçeve kütüphanesi | 2 | inceleme | 01, araştırma |
| [12](plan/ip/IP-12-servis-ve-api.md) | Servis katmanı ve API | 2 | devam | 01, 02, 09 |
| [13](plan/ip/IP-13-onay-ve-yetki-devri.md) | Onay kutusu arka ucu ve yetki devri | 2 | bekliyor | 12, 14 |
| [14](plan/ip/IP-14-surec-motoru.md) | Süreç motoru, takvim, bildirim | 2 | bekliyor | 02, 12 |
| [15](plan/ip/IP-15-bologna-otomasyonu.md) | Bologna ders paketi otomasyonu | 3 | bekliyor | 01, 03, 05, 12, 13 |
| [16](plan/ip/IP-16-ders-dosyasi.md) | Ders dosyası ve ölçme raporu | 3 | bekliyor | 04, 05, 06, 12, 13 |
| [17](plan/ip/IP-17-anketler.md) | Anket modülü | 3 | bekliyor | 02, 03, 09, 14 |
| [18](plan/ip/IP-18-toplanti-asistani.md) | Toplantı ve karar asistanı | 3 | bekliyor | 03, 14 |
| [19](plan/ip/IP-19-program-odr.md) | Program öz değerlendirme ve ÖDR | 4 | bekliyor | 11, 12, 16, 17 |
| [20](plan/ip/IP-20-kidr-bidr.md) | BİDR, KİDR, olgunluk değerlendirmesi | 4 | bekliyor | 11, 12, 14 |
| [21](plan/ip/IP-21-gostergeler.md) | Göstergeler ve stratejik plan | 4 | bekliyor | 05, 12 |
| [22](plan/ip/IP-22-degerlendirici-portali.md) | Değerlendirici portalı, sanal kanıt odası | 4 | bekliyor | 09, 10, 12 |
| [23](plan/ip/IP-23-baglayicilar-2.md) | Bağlayıcılar II (AVESİS, YÖK Atlas, UBYS, EBYS, e-posta, bulut) | 4 | devam | 05, 10 |
| [24](plan/ip/IP-24-cli-birlesmesi.md) | CLI ve Claude Code eklentisinin birleşmesi | 4 | bekliyor | 01, 12 |
| [25](plan/ip/IP-25-mcp-sunucusu.md) | MCP sunucusu | 4 | bekliyor | 12, 13 |
| [26](plan/ip/IP-26-uretim-altyapisi.md) | Üretim altyapısı ve akredit.org | 5 | bekliyor | 08 |
| [27](plan/ip/IP-27-guvenlik-denetimi.md) | Güvenlik sertleştirme ve bağımsız denetim | 5 | bekliyor | 09-26 |
| [28](plan/ip/IP-28-kvkk-hukuk.md) | KVKK ve hukuk paketi | 5 | devam | araştırma |
| [29](plan/ip/IP-29-belgeler-egitim.md) | Kullanıcı belgeleri ve eğitim | 5 | bekliyor | 07+ |
| [30](plan/ip/IP-30-pilot.md) | Pilot ve iş yükü ölçümü | 5 | bekliyor | Faz 3 |
| [31](plan/ip/IP-31-erisilebilirlik-performans.md) | Erişilebilirlik ve performans | 5 | bekliyor | 07, 12 |
| [32](plan/ip/IP-32-kiyaslama.md) | Kurumlar arası kıyaslama | 6 | bekliyor | 20, 21 |
| [33](plan/ip/IP-33-mobil-onay.md) | Mobil onay ve bildirim | 6 | bekliyor | 13 |
| [34](plan/ip/IP-34-kurum-ici-kurulum.md) | Kurum içi kurulum ve yerel model | 6 | bekliyor | 26 |

## 9. Alt ajan çalışma modeli

**Roller.** Bir orkestratör (ana oturum) planı ve durum tablosunu yönetir, dalgaları başlatır, dalları birleştirir, bağımsız incelemeyi başlatır. Uygulayıcı ajanlar tek bir İP üzerinde, yalnız o İP'nin sahip olduğu yollarda çalışır. İnceleme ajanı, işi yazanın bağlamını görmeden kodu ve kabul ölçütlerini denetler.

**Dalga düzeni.** Bağımlılığı olmayan İP'ler paralel dalgalarda yürür. Bir dalganın İP'leri bitince orkestratör birleştirir, `pnpm verify` çalıştırır, incelemeyi başlatır, plan tablosunu günceller ve sıradaki dalgayı açar.

- 1. dalga (başladı): İP-01 … İP-07 (+ İP-08 CI, orkestratör).
- 2. dalga: İP-08 kalan, İP-09, İP-10, İP-11 (araştırmadan sonra), İP-12.
- 3. dalga: İP-13, İP-14, İP-15, İP-16.
- Sonrası tabloya göre.

**Dal ve birleştirme.** Her ajan kendi çalışma ağacında (git worktree) `ip/<no>-<kisa-ad>` dalında çalışır, işini commit eder. Orkestratör dalları sırayla `main`'e birleştirir; `pnpm-lock.yaml` çakışmasında kilit dosyası `pnpm install` ile yeniden üretilir.

**Sözleşmeler.** Paketler arası türler `@akredit/cekirdek` (`turler.ts`, `bologna/turler.ts`, `olcme-turleri.ts`) ve `@akredit/belge` (`turler.ts`, imzalar) içindedir. Bir ajan sözleşmeye alan ekleyebilir, var olanı bozamaz. Sözleşmeyi bozan değişiklik ADR ister.

**Bitti tanımı (her İP):**

1. Kabul ölçütlerinin hepsi işaretli ve kanıtlı (test adı ya da çıktı).
2. `pnpm verify` temiz; ilgili paketin testleri ağsız çalışıyor.
3. İP dosyasında Durum ve Günlük güncel; `docs/raporlar/IP-xx.md` raporu yazılmış.
4. Kullanıcıya görünen metinler Türkçe ve sade; gizli bilgi, gerçek kişisel veri yok.
5. Bağımsız inceleme ajanının bulguları kapatılmış ya da gerekçeyle ertelenmiş.

**Yeni bir oturumda nasıl devam edilir:**

1. Depoyu aç, `pnpm install`, `pnpm verify`.
2. `plan.md` §8 tablosundan durumu **hazır** olan İP'leri seç (bağımlılıkları **tamam**).
3. Her İP için bir ajan başlat: "`CLAUDE.md` ve `plan/ip/IP-xx-*.md` dosyalarını oku, İP'yi kabul ölçütlerine göre tamamla, kendi dalında commit et, rapor yaz." Bağımsız İP'leri aynı anda başlat.
4. Bitenleri birleştir, `pnpm verify`, inceleme ajanı, tabloyu güncelle, commit.

## 10. Riskler ve önlemler

| Risk | Etki | Önlem |
|---|---|---|
| YZ uydurması ya da yanlış atıf | Akreditasyonda güven kaybı | Atıf ve sayı güvenceleri kodda; değerlendirme eşiği (%100 atıf geçerliliği); insan kararı; rapor denetimi geçmeden dışa aktarım yok |
| Kişisel veri ihlali | Hukuki ve itibar | Takma ad, maskeleme, yurt içi barındırma, kurum içi model seçeneği, hukuk paketi, en az veri |
| Kiracılar arası sızıntı | Ağır | Veritabanında satır güvenliği, otomatik testler, bağımsız sızma testi |
| Kurum sistemlerinin (OBS, AVESİS) yapı değişikliği | Bağlayıcı bozulur | Kayıtlı örneklerle testler, hata olunca insanı uyarma, birden çok sağlayıcı, elle yükleme yolu |
| Ölçüt ve mevzuat değişikliği | Eski içerik | Çerçeve sürümleme, resmî belgeden içe aktarma, uzman doğrulaması, raporun çerçeve sürümüne bağlanması |
| Değerlendiricilerin YZ ile hazırlanan rapora güvensizliği | Benimseme | Şeffaflık: her öneri, karar ve YZ katkısı kayıtlı ve görünür; insan kararı; "Akredit kullanım beyanı" şablonu |
| "Sıfır iş yükü" beklentisinin karşılanmaması | Hayal kırıklığı | İnsan dakikası ölçümü, dürüst iletişim (karar ve faaliyetin kendisi insanda kalır) |
| Yurt içi modellerin Türkçe akreditasyon metninde yetersiz kalması | Kalite | Sağlayıcı bağımsızlığı, görev bazında model seçimi, değerlendirme düzeneği, eşik altı görevlerin insana düşmesi |
| Kurumların satın alma ve benimseme hızı | Yavaş yayılım | Açık kaynak ve ücretsiz çekirdek, pilot sonuçları, kurum içi kurulum, Kulular desteği |
| Ad ve marka çakışması | Yeniden adlandırma | Marka araştırması ve tescil (kullanıcı işi) |
| Ajanlar arası tutarsızlık | Bozuk bütünleşme | Tür sözleşmeleri, yol sahipliği, CI, bağımsız inceleme |

## 11. Açık kararlar (varsayılan alındı, değiştirilebilir)

| No | Konu | Varsayılan | Not |
|---|---|---|---|
| K1 | Ürün adı | Akredit (akredit.org); CLI şimdilik `akreddit` | İP-24'te `akredit` komutu, eski ad takma ad olarak kalır |
| K2 | Depo | Yeni depo `tialkan/akredit`, Akreddit geçmişiyle | Eski depo README ile yönlendirilir |
| K3 | Lisans ve iş modeli | Bütün kod Apache-2.0; barındırılan hizmet, kurulum ve destek Kulular Teknoloji'den | Açık çekirdek ayrımı yok |
| K4 | Barındırma | Türkiye'de veri merkezi | Sağlayıcı araştırma sonrası (§6) |
| K5 | Varsayılan YZ sağlayıcısı | EVREN (yurt içi); kurum değiştirebilir; yurt dışı sağlayıcı varsayılan kapalı | — |
| K6 | Kimlik | E-posta ile sihirli bağlantı + kurum SSO (SAML/OIDC); YETKİM hedefi | Parola saklanmaz |
| K7 | İlk pilot | AYBÜ TBMYO, Bilgisayar Programcılığı | Kurum izni gerekir |
| K8 | Önlisans için çerçeve | Araştırma bulgusuna göre | §6 |

## 12. İnsan işleri (kullanıcının yapması gerekenler)

Ajanların yapamadığı, kişinin ya da kurumun yapması gereken işler:

1. **GitHub:** `tialkan/akredit` deposunu aç ve bilgisayarındaki `akredit` klasöründen it. Claude ayarlarında GitHub bağlantısını aç; bulut ajanları ancak böyle kalıcı çalışabilir.
2. **Alan adı:** akredit.org'un sahipliği ve DNS yönetimi.
3. **Barındırma hesabı:** Türkiye'de bir sağlayıcı (öneri §6'da).
4. **EVREN API anahtarı:** e-Devlet ile alınır; geliştirme ve değerlendirme için ortam değişkeni olarak verilir, depoya girmez.
5. **Resmî belgeler:** YÖKAK değerlendirme ölçütleri ve rubrik, KİDR hazırlama kılavuzu, ilgili program akreditasyon kuruluşlarının ölçüt belgeleri. Bu ortamın ağı resmî sitelere çıkamıyor; belgeleri indirip depoda `kaynaklar/resmi/` altına koy.
6. **Uzman doğrulaması:** Çerçeve verisini bir kez gözden geçirecek bir kalite uzmanı (tercihen dış değerlendirme deneyimli).
7. **Hukuk:** KVKK belgeleri ve veri işleme sözleşmesi için avukat incelemesi.
8. **Marka:** "Akredit" için marka araştırması ve tescil başvurusu.
9. **Pilot izni:** TBMYO müdürlüğü ve kalite koordinatörlüğü ile pilot kapsamı.
10. **Sızma testi:** Yayın öncesi bağımsız güvenlik testi hizmeti.

## 13. Kaynaklar

- Mevcut ürün sayfası: https://tezatlas.com/akreddit ve kurulum rehberi https://tezatlas.com/akreddit/kurulum
- Mevcut depo: https://github.com/tialkan/akreddit
- Araştırma bulguları ve kaynakları: `docs/arastirma/`
