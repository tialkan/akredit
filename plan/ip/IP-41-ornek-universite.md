# İP-41: Sentetik Örnek Üniversitesi demosu

- **Durum:** tamam
- **Faz:** 7
- **Bağımlılık:** İP-12 (servis ve API), İP-09 (kimlik), İP-07 (web), İP-36 (işçi)
- **Sahip olduğu yollar:** `packages/ornek-veri/**`, `packages/vt/src/gocler/0050_demo.sql` (+ `meta/_journal.json` satırı), `packages/vt/src/sema/demo.ts` (+ `sema/index.ts` dışa aktarım satırı), `apps/web/src/demo/**`, `apps/web/src/app/(site)/deneyin/**`, `apps/web/src/app/api/deneyin/**`, `apps/web/e2e/deneyin.spec.ts`, `apps/isci/src/demo/**`, `docs/raporlar/IP-41.md`. En küçük değişiklik: `apps/web/src/kimlik/erisim.ts` (demo bağlamı), `apps/web/src/kimlik/sunucu.ts` (demo adresine e-posta yok), `apps/web/src/app/panel/layout.tsx` (şerit ve tur), site menüsü ve ana sayfaya "Deneyin" bağlantısı, `apps/isci/src/calisma/isci.ts` (zamanlama satırı), `infra/coolify/docker-compose.yml` (ortam değişkeni), `pnpm-lock.yaml`.
- **Büyüklük:** büyük

## Amaç

akredit.org'u ziyaret eden biri hesap açmadan, üç dakikada sistemi gerçekten denesin: kendi seçtiği rolle, gerçek panelde, gerçek kurallarla, ama yalnız uydurma bir kurumun verisiyle.

## Kapsam

1. **Sentetik veri üreteci** (`@akredit/ornek-veri`): tohumlu, belirlenimci "Örnek Üniversitesi". 3 fakülte, ~10 program, ~120 ders, ~5.000 sentetik öğrenci (yalnız takma ad), Bologna sayfaları, soru bazlı not dökümleri, ders değerlendirme anketi yanıtları, kurul tutanakları, birkaç gerçekçi eksik ve eşik altı sonuç, PÜKÖ geçmişi. Adlar açıkça uydurmadır. Bütün sayılar `@akredit/olcme` ile hesaplanır.
2. **Demo kiracısı:** veritabanında ayrı, `kurum.demo = true` işaretli kurum. Kiracı yalıtımı aynen geçerli. İşçi her gece yeni bir demo nesli yükler; günlük ve kanıt yalnız eklendiği için eski nesil silinmez, yalnız etkinliğini yitirir. Demo kurumu işçinin olağan kurum turlarına (e-posta, bağlayıcı, YZ) girmez.
3. **Rol seçerek giriş:** `/deneyin` sayfasında beş rol. Tıklayınca o rolle demo kurumuna iki saatlik oturum açılır. Oturum Better Auth oturumudur, üyelik `demo_bitis` taşır; rol ataması da aynı anda biter. Gerçek kurumlara erişemez (testli). Her rolde 3-5 adımlı rehber turu ve "Örnek veri, gerçek kurum değildir" şeridi.
4. Ana sayfa ve menüye "Deneyin" bağlantısı (yalnız metin).
5. **Güvenlik:** demo giriş ucunda IP başına hız sınırı; demo oturumu yalnız okuma eylemleri ve demo kurumundaki öneriye karar verebilir (yükleme, davet, ayar, API anahtarı, dış gönderim yok); e-posta gönderilmez; dış YZ çağrısı yapılmaz (öneriler önceden hesaplanmış kural çıktısıdır).

## Kabul ölçütleri

- [x] Aynı tohum aynı veriyi üretir; farklı tohum farklı. Büyüklükler kapsamdaki aralıkta (test).
- [x] Ölçme sonuçları `dersiOlc` çıktısıyla birebir aynı; en az bir ders eşik altında, en az bir eksik (test).
- [x] Hiçbir gerçek kurum adı (YÖK listesinden tanınan kalıplar) ve gerçek kişi adı biçimi yok; öğrenci kimliği yalnız takma ad (test).
- [x] Demo kurumu yükleme fonksiyonu PGlite'ta göçlenmiş şemaya yazar; panel servisi demo kurumunda program, ders, ölçme, öneri döndürür (test).
- [x] Gece yenileme yeni nesil açar, eski nesli silmez, demo dışı kurumlara dokunmaz (test).
- [x] Demo oturumu: 2 saat sonra 401; `x-akredit-kurum` ile gerçek kuruma 403; demo kurumu bağlamında gerçek kurum satırı 0 (RLS); demo oturumu davet/ayar/yükleme yapamaz; e-posta gönderilmez (test).
- [x] `/api/deneyin` IP başına hız sınırı (test).
- [x] Playwright: `/deneyin` → rol seç → panel, şerit ve tur görünür.
- [x] `pnpm verify` temiz, web derlemesi başarılı.

## Günlük

- 2026-10-28: İP dosyası yazıldı.
- 2026-10-28: `@akredit/ornek-veri` (tohumlu üreteç, yükleyici, gece yenileme), 0050 göçü, demo oturumu (`/api/deneyin`, `/deneyin`, rehber turu, şerit), işçi gece işi, Coolify `AKREDIT_DEMO`. Testler ve Playwright geçti; `pnpm verify` temiz, web derlemesi iki kipte başarılı.
- Karar: sıfırlama silme değil yeni nesil (yalnız ekleme ilkesi); yalnız ziyaretçi kararı ya da sürüm değişikliği varsa yenilenir.
- Karar: iki saat sınırı `kimlik_uyelik.demo_bitis` ile zorlanır (Better Auth oturumu kendiliğinden uzayabildiği için); izinler `DEMO_EYLEMLERI` ile kesişir; yönetim işlevleri demo oturumunu reddeder.
- Karar: hiçbir gerçek kurum adı ya da logosu kullanılmaz (pilot kurum dahil); demo "Örnek Üniversitesi" kalır.
- Kalan: eski nesillerin arşivlenmesi, dağıtık hız sınırı, `/deneyin`in sitemap'e eklenmesi (İP-42). Ayrıntı: `docs/raporlar/IP-41.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `packages/ornek-veri/test/uret.test.ts`, `yukle.test.ts`, `apps/web/src/demo/demo.test.ts` (dalga 4-7 düzeltme 2: XFF hız sınırı), e2e `deneyin.spec.ts`. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam.
