# İP-09: Kimlik doğrulama, kiracı ve yetki

- **Durum:** inceleme
- **Faz:** 2
- **Bağımlılık:** İP-02, İP-07
- **Sahip olduğu yollar:** `packages/yetki/**`, `apps/web/src/kimlik/**`, `packages/vt/src/sema/kimlik*.ts` ve ilgili göç, `docs/raporlar/IP-09.md`
- **Büyüklük:** büyük

## Amaç

Kurum kullanıcılarının güvenle girmesi, rollerin kapsamlı yetkiye dönüşmesi ve kiracılar arası erişimin uçtan uca kapanması.

## Kapsam

1. Better Auth: e-posta ile sihirli bağlantı, OIDC ve SAML 2.0 (üniversite kimlik sağlayıcıları; YETKİM federasyonu için SP metaverisi). Kurum = organization.
2. `packages/yetki`: saf yetki matrisi `yetkiliMi(kisi, eylem, hedef)`; roller × kapsam (kurum, birim, program, ders) × eylemler tablosu; değerlendirici için süreli salt okunur erişim.
3. Davet ve rol atama akışı (kurum yöneticisi, kalite komisyonu başkanı); toplu kullanıcı içe aktarma (CSV).
4. API anahtarları (CLI, MCP, bağlayıcılar): kapsamlı, süreli, iptal edilebilir, yalnız özeti saklanır.
5. Oturum güvenliği: güvenli çerez, CSRF, oturum süresi, şüpheli giriş bildirimi. Kimlik olayları günlüğe yazılır.

## Kabul ölçütleri

- [x] Her rol × eylem için yetki tablosu testi.
- [x] Uçtan uca: A kurumunun kullanıcısı B kurumunun hiçbir verisine erişemez.
- [x] Sahte OIDC/SAML sağlayıcıyla giriş testi.
- [x] Parola saklanmaz (sihirli bağlantı/SSO).
- [x] `pnpm verify` temiz.

## Notlar

YETKİM (ULAKBİM kimlik federasyonu) katılımı kurumun ve ULAKBİM'in işlemidir; teknik hazırlık bu İP'de, başvuru kullanıcı listesinde.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı, incelemeye alındı. `packages/yetki` (saf matris: 8 rol × 4 kapsam × 17 eylem, atama kuralları, API anahtarı ve davet belirteci, CSV doğrulama, CSRF/çerez/şüpheli giriş, giriş bilgisi ayıklama); `packages/vt` kimlik tabloları ve `0004_kimlik` göçü (uygulama rolü erişemez, parola sütunu CHECK ile hep NULL); `apps/web/src/kimlik` (Better Auth: sihirli bağlantı + SSO eklentisiyle OIDC ve SAML 2.0; istek bağlamı, kiracı işleminde yetki, davet, rol atama, toplu içe aktarma, API anahtarları, kimlik olayları günlüğü). Kararlar: kurum = organization, ancak üyelik Better Auth organization eklentisi yerine `kimlik_uyelik` + `rol_atamasi` ile (kapsamlı roller için); hesap yalnız üyelik ya da açık davetle açılır; SSO sağlayıcıları kurum ayarından (`defaultSSO`), kullanıcı sağlayıcı kaydedemez. Kalan: Next.js rota bağlantısı (`/api/kimlik/[...]`), `/giris` ve davet sayfaları, gerçek e-posta göndericisi (İP-12/14; bu İP'nin yolları dışında). Ayrıntı: `docs/raporlar/IP-09.md`.
