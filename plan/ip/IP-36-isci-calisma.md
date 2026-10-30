# İP-36: İşçinin üretimde kendi kendine çalışması

- **Durum:** tamam
- **Faz:** 6
- **Bağımlılık:** İP-10, İP-14, İP-23, İP-26, İP-35
- **Sahip olduğu yollar:** `apps/isci/src/ana.ts`, `apps/isci/src/calisma/**`, `apps/isci/src/arama.ts`, `apps/isci/test/**`, `apps/isci/package.json`, `packages/vt/src/gocler/0010_isci.sql`, `infra/gelistirme/isci-uctan-uca.sh`, `infra/gelistirme/isci.Dockerfile`, `infra/gelistirme/docker-compose.yml` (işçi hizmeti), `infra/uretim/isci.Dockerfile`, işçi bölümleri: `infra/uretim/docker-compose.yml`, `infra/kurum-ici/docker-compose.yml`, `infra/kurum-ici/helm/akredit/**`, `apps/web/src/veri/kip.ts`, `apps/web/next.config.ts` (veri kipi), `apps/web/src/site/icerik.ts` (durum notları), `docs/raporlar/IP-36.md`
- **Büyüklük:** büyük

## Amaç

"Hoca hiçbir şey yapmadan sistem kendi kendine döner." `apps/isci`'nin üretimde çalışan bir giriş noktası yoktu: kanıt hattı, bağlayıcı eşitlemeleri, süreç motorunun takvim/hatırlatma/yükseltme işleri ve rapor üretimi kendiliğinden çalışmıyordu.

## Kapsam

1. `apps/isci/src/ana.ts`: zod ile ortam doğrulaması (eksik zorunlu değişkende açık hata, `/saglik` 503 ve eksik listesi), ayrıcalıksız uygulama kullanıcısıyla PostgreSQL (üretimde süper kullanıcı reddedilir), pg-boss, bütün kuyruklar (kanıt hattının 4 kuyruğu, bağlayıcı planlama/eşitleme, süreç turu, bildirim e-postası, günlük zinciri doğrulaması, KİDR raporu), `kurumFabrikasi` ile kurum anahtarı, nesne deposu sürücüsü (S3 ya da yerel), zarif kapanış (SIGTERM/SIGINT), `/saglik` (200/503).
2. pg-boss zamanlamaları: Bologna haftalık, AVESİS haftalık, YÖK Atlas yılda bir (ve elle), e-posta ve Drive 15 dakikada bir, süreç turu 5 dakikada bir, günlük zinciri doğrulaması günde bir. Kurum ayarında bağlayıcı açık değilse çalışmaz.
3. Docker (geliştirme ve üretim), Compose (geliştirme, üretim, kurum içi) ve Helm'de işçi bu giriş noktasıyla başlar; sağlık denetimi `/saglik`.
4. Gerçek PostgreSQL ve gerçek pg-boss ile uçtan uca sınama (`infra/gelistirme/isci-uctan-uca.sh`, CI postgres işinde); PGlite ile Vitest birim testleri.
5. Panelin varsayılan veri kipi gerçek veritabanı; örnek kip yalnız `AKREDIT_ORNEK_VERI=1`. Sitedeki durum notları güncel.
6. Gömme yokken kanıt arama: PostgreSQL tam metin (Türkçe kök bulucu), özellik kaybı belgelendi.

## Kabul ölçütleri

- [x] Giriş noktası ortamı doğrular; eksik zorunlu değişken açık hata ve `/saglik` 503 (`src/calisma/yapilandirma.test.ts`, 7 test).
- [x] İşçi ayrıcalıksız `UYGULAMA_VT_*` kullanıcısıyla bağlanır; kurumlar `isci_kurumlari()` (0010) ile dolaşılır, kurum içi her okuma kiracı işleminde (`isci.test.ts`, uçtan uca).
- [x] Bütün kuyruklar kayıtlı, zamanlamalar pg-boss'ta (uçtan uca: 7 zamanlama; `isci.test.ts`).
- [x] Bağlayıcı yalnız kurum ayarında açıkken çalışır; değişmeyen veri yeni kanıt üretmez; durum kurum ayarına yazılır (`isci.test.ts`).
- [x] Uçtan uca, gerçek PostgreSQL 16 ve gerçek pg-boss: ZIP → hat → onay bekleyen öneri; süreç turu hatırlatma üretir; SIGTERM ile çıkış kodu 0 (`apps/isci/test/uctan-uca.ts`).
- [x] Docker/Compose/Helm işçiyi `apps/isci/src/ana.ts` ile başlatır, sağlık denetimi `/saglik` (`infra/uretim/denetle.sh`, `infra/kurum-ici/denetle.sh` geçti).
- [x] Panel varsayılanı gerçek veri; örnek kip yalnız `AKREDIT_ORNEK_VERI=1` (`apps/web/src/veri/kip.ts`, `next.config.ts`).
- [x] Gömmesiz Türkçe tam metin arama (`isci.test.ts`, uçtan uca).
- [x] `pnpm verify` temiz, web derlemesi başarılı.

## Günlük

- 2026-10-28: Giriş noktası, kuyruk kayıtları, zamanlamalar, sağlık ucu yazıldı. pg-boss 12 PGlite arka ucunu desteklediği için pg-boss kayıtları Vitest'te de gerçek pg-boss ile sınandı (İP-10'daki "PGlite pg-boss'u desteklemez" notu artık geçersiz). Uçtan uca sınama yerel PostgreSQL 16 (pgvector) geçici kümesinde geçti.
- Karar: kurum listesi için tanımlayıcı haklı, yalnız kimlik döndüren `isci_kurumlari()` (0010 göçü). İşçiye `kurum` tablosunu okuma ayrıcalığı verilmedi.
- Karar: bağlayıcı ayarı ve eşitleme durumu `kurum.ayarlar.baglayicilar.<tür>` altında (İP-23 kararıyla uyumlu; yeni tablo yok). OAuth belirteci şifreli (`AKREDIT_BAGLAYICI_ANAHTARI`), yenilenen belirteç geri yazılır.
- Karar: Bologna/AVESİS/YÖK Atlas verisi JSON kanıt olur; okuma zamanı içerikten çıkarılıp kaynak ayrıntısına yazılır, böylece değişmeyen veri yeni kanıt üretmez.
- Karar: SMTP yoksa e-postalar bekletilir (motorun yeniden deneme kuralı), uygulama içi bildirim sürer.
- Kalan: panelden bağlayıcı açma ve toplu belge yükleme ekranları (web), OAuth onay akışı, AVESİS/Bologna canlı pilot, OpenTelemetry SDK.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `apps/isci/src/calisma/yapilandirma.test.ts`, `apps/isci/src/calisma/isci.test.ts`, `apps/isci/test/uctan-uca.ts` yerinde. Açık inceleme bulgusu yok. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kalan (ölçüt dışı): bağlayıcı açma ekranları, OAuth onay akışı, OpenTelemetry SDK.
