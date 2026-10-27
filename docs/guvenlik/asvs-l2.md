# OWASP ASVS 4.0.3 düzey 2 kontrol listesi

Sürüm: İP-27, 2026-10-27. Bölüm başlıkları ASVS 4.0.3'ün V1–V14 bölümleridir. Maddeler bölüm içinde
Akredit'e uygulanan **denetim konularına** göre özetlenmiştir; resmî madde numaralarıyla tek tek eşleme
(ör. 2.1.1) bağımsız denetçinin işidir (`dis-denetim-kapsami.md`). Bu yüzden madde numarası verilmemiştir:
**DOĞRULANMADI — resmî ASVS listesiyle eşlenecek.**

Durum: **✔** karşılanıyor (kanıt var), **◐** kısmen, **✘** açık, **—** uygulanmaz (gerekçeli).

## V1 Mimari, tasarım ve tehdit modelleme

| Konu | Durum | Kanıt / not |
|---|---|---|
| Güvenli geliştirme yaşam döngüsü, tehdit modeli | ✔ | `docs/guvenlik/tehdit-modeli.md`, İP düzeni ve bağımsız inceleme dalgaları |
| Güven sınırları ve bileşenler belgeli | ✔ | `tehdit-modeli.md` §3, `docs/mimari.md` §1 |
| Erişim denetimi tek yerde, sunucuda | ✔ | Servis katmanı yetki denetimi + VT satır güvenliği (iki katman) |
| En az ayrıcalıkla VT bağlantısı | ◐ | İP-27: `akredit_oturum`; Docker'lı ortamda doğrulanmadı, kurum içi kurulum eski düzende |
| Bağımlılıkların ve bileşenlerin envanteri | ◐ | `pnpm-lock.yaml`, CI bağımlılık incelemesi; SBOM üretimi yok |

## V2 Kimlik doğrulama

| Konu | Durum | Kanıt / not |
|---|---|---|
| Parola saklanmaz | ✔ | `kimlik_hesap_parola_yok` kısıtı (göç 0004); giriş sihirli bağlantı ya da SSO |
| Sihirli bağlantı tek kullanım, süreli | ✔ | `sihirli.test.ts` |
| Kurumsal SSO: imza, XSW, yeniden gönderim | ✔ | `saml.test.ts`, `oidc.test.ts` (İP-27) |
| Giriş denemelerine hız sınırı | ◐ | Better Auth `rateLimit` üretimde açık; çok örnekli dağıtımda paylaşılan sayaç yok |
| Davetsiz hesap açılmaz | ✔ | `saml.test.ts`, `oidc.test.ts` "davetsiz" |
| Çok etkenli doğrulama | — | Kimlik doğrulaması kurum IdP'sine devredilir; MFA kurum IdP'sinde. Sihirli bağlantı kullanan küçük kurumlar için açık soru (ürün kararı) |

## V3 Oturum yönetimi

| Konu | Durum | Kanıt / not |
|---|---|---|
| Çerez öznitelikleri (HttpOnly, Secure, SameSite) | ✔ | Better Auth yapılandırması (`apps/web/src/kimlik/sunucu.ts`) |
| Çıkışta sunucu oturumu ve istemci önbelleği temizlenir | ✔ | `Clear-Site-Data`, `oturum-kapanis.test.ts` |
| Rol değişince oturum yenilenir | ◐ | Rol her istekte VT'den okunur (`istekBaglami`); ayrıca oturum iptali yok |

## V4 Erişim denetimi

| Konu | Durum | Kanıt / not |
|---|---|---|
| Kiracı yalıtımı (yatay) | ✔ | `FORCE ROW LEVEL SECURITY`, `kiraci.test.ts`, `yalitim.test.ts`; dış testte ayrıca sınanacak |
| Rol ve kapsam (dikey) | ✔ | `@akredit/yetki`, servis testleri |
| Yüksek riskli işlem insan kararı | ✔ | Karar tetikleyicisi, `inceleme.test.ts`, toplu onayda ret |
| Değerlendirici salt okunur, süreli | ✔ | `yonetim.test.ts` |
| Davetin atomik kabulü | ✔ | İP-27, `yonetim.test.ts` |

## V5 Doğrulama, temizleme, kodlama

| Konu | Durum | Kanıt / not |
|---|---|---|
| Dışarıdan gelen her veri şemayla doğrulanır | ✔ | zod, `servis/http` işleyici + servis içinde yeniden `parse` |
| SQL sokma | ✔ | Drizzle parametreli sorgu; CLI aktarım paketi düzeltmesi (`aktarim-enjeksiyon.test.mjs`) |
| XML dış varlık / bomba | ✔ | `belge/src/xml.ts`, `guvenlik.test.ts` |
| Çıktı kodlama (XSS) | ◐ | React kaçışı; sayfa geneli içerik güvenlik politikası (CSP) yok — açık bulgu G-27-1 |
| YZ istem enjeksiyonu | ✔ | `guvenilmeyenSar` (YZ-1) |

## V6 Saklanan kriptografi

| Konu | Durum | Kanıt / not |
|---|---|---|
| Onaylı algoritmalar | ✔ | SHA-256 içerik özeti, HMAC-SHA-256 takma ad ve bağlantı imzası, SigV4 |
| Sağlayıcı belirteçleri şifreli | ✔ | `oidc.test.ts` "belirteçleri şifreli saklanır" |
| Anahtar yönetimi ve döndürme | ◐ | Gizliler ortam/kasadan (`sirlar-ac.sh`); döndürme yordamı belgesiz |

## V7 Hata işleme ve günlük

| Konu | Durum | Kanıt / not |
|---|---|---|
| Güvenlik olayları günlükte, değiştirilemez | ✔ | `gunluk` özet zinciri |
| Günlükte gizli bilgi yok | ✔ | `gizliAyikla`, ilke 8 |
| Günlükte kişisel veri en az | ◐ | Portal soru/yanıtı tam metin (dalga 3 #6) |
| Kullanıcıya iç ayrıntı sızmaz | ✔ | Türkçe kullanıcı iletileri (`servis/src/hata.ts`) |

## V8 Veri koruma

| Konu | Durum | Kanıt / not |
|---|---|---|
| Öğrenci kimliği takma adla | ✔ | HMAC (ilke 7) |
| Yurt dışı YZ'ye maskeli/izinli gönderim | ✔ | `kvkk.test.ts` (İP-27: sabit hat) |
| Hassas yanıtlar önbelleğe alınmaz | ✔ | `Cache-Control` (API), servis çalışanı temizliği |
| Yedeklerin korunması | ✔ | Site dışı, nesne kilidi (`docs/isletim`) |

## V9 İletişim

| Konu | Durum | Kanıt / not |
|---|---|---|
| Her yerde TLS, HSTS | ✔ | `infra/uretim/Caddyfile` |
| İç ağda VT bağlantısı | ◐ | Kapsayıcı ağı yalıtımlı; `sslmode=disable` (exporter) — tek sunucu iç ağında kabul |

## V10 Kötü amaçlı kod

| Konu | Durum | Kanıt / not |
|---|---|---|
| Yüklenen dosyada virüs taraması | ✔ | ClamAV (`isci/kanit-hatti/virus.ts`) |
| Bütünlük denetimi (ZIP CRC) | ✔ | İP-27 |
| Tedarik zinciri: eylemler SHA ile | ✔ | `.github/workflows`, `denetle.sh` |
| Tedarik zinciri: imajlar özetle | ✘ | `imaj-sabitle.sh` var, `surumler.env` henüz özetsiz; CI hizmet imajı yalnız kesin etiket — G-27-3 |

## V11 İş mantığı

| Konu | Durum | Kanıt / not |
|---|---|---|
| Sıralı adımlar atlanamaz (onay, gönderim) | ✔ | Karar tetikleyicisi, politika motoru |
| Otomasyona karşı sınır | ◐ | Hız sınırı süreç içi |
| YZ sayılarının deterministik kaynağı | ✔ | `sayilariDenetle` (yazıyla sayı dahil, İP-27) |

## V12 Dosyalar ve kaynaklar

| Konu | Durum | Kanıt / not |
|---|---|---|
| Boyut, sayı, oran sınırları | ✔ | `belge/src/zip.ts`, `isci/kanit-hatti/alma.ts` |
| Yol geçişi | ✔ | Nesne anahtarı UUID/özet biçimli; `dosyaAdiTemizle` |
| Dosya türü içerikten | ✔ | `belge/src/tur.ts` |
| İndirmede imzalı, süreli bağlantı | ✔ | `imzaliBaglantiDogrula`, `s3OnImzaliAdres` |

## V13 API ve web hizmetleri

| Konu | Durum | Kanıt / not |
|---|---|---|
| Şema doğrulamalı REST, OpenAPI | ✔ | `servis/src/http/openapi.ts` |
| İdempotens anahtarı | ✔ | `istek_tekrari` |
| MCP köken denetimi, yasak eylemler | ✔ | `apps/mcp` testleri |
| MCP öneri türü kısıtı | ✘ | dalga 3 #2 (orta) |

## V14 Yapılandırma

| Konu | Durum | Kanıt / not |
|---|---|---|
| Güvenlik başlıkları | ◐ | HSTS, nosniff, X-Frame-Options, Referrer/Permissions-Policy var; CSP yok (G-27-1) |
| Gizli bilgi taraması | ✔ | gitleaks + `.gitleaks.toml` dar izin listesi |
| Üretim imajında kaynak/.env yok, kök değil | ✔ | Dockerfile (dalga 2 denetimi) |
| Salt okunur kapsayıcı | ✔ | `read_only: true` (compose) |

## Özet

✘ açık kalemler: CSP (G-27-1), imaj özetleri (G-27-3), MCP öneri türü (dalga 3 #2). Ayrıntı ve önem:
[bulgular.md](bulgular.md).
