# İP-09: Kimlik doğrulama, kiracı ve yetki

- **Durum:** bekliyor
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

- [ ] Her rol × eylem için yetki tablosu testi.
- [ ] Uçtan uca: A kurumunun kullanıcısı B kurumunun hiçbir verisine erişemez.
- [ ] Sahte OIDC/SAML sağlayıcıyla giriş testi.
- [ ] Parola saklanmaz (sihirli bağlantı/SSO).
- [ ] `pnpm verify` temiz.

## Notlar

YETKİM (ULAKBİM kimlik federasyonu) katılımı kurumun ve ULAKBİM'in işlemidir; teknik hazırlık bu İP'de, başvuru kullanıcı listesinde.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
