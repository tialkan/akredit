# Tehdit modeli (STRIDE)

Sürüm: İP-27, 2026-10-27. Kaynak: kodun kendisi (`apps/*`, `packages/*`, `infra/*`), `docs/mimari.md` §4–5 ve
inceleme dalgaları 1–3. Her İP'de mimari değiştikçe güncellenir.

## 1. Varlıklar

| Varlık | Neden değerli | Nerede |
|---|---|---|
| Kanıt dosyaları ve metinleri | Kurumun iç belgeleri; kişisel veri içerebilir | S3/yerel depo (içerik adresli), `kanit`, `kanit_parcasi` |
| Öğrenci notları ve ölçme verisi | Kişisel veri (KVKK); akreditasyon sonucu etkiler | `not_*`, `olcme_*` tabloları (takma ad, HMAC) |
| Karar ve onay kayıtları, günlük | İlke 3–4: kurum adına beyanın dayanağı; değiştirilemez olmalı | `karar`, `gunluk` (özet zinciri, yalnız ekleme) |
| Kimlik bilgileri | Oturum, API anahtarı, SSO yapılandırması, davet belirteçleri | `kimlik_*` tabloları |
| Kurum YZ ayarları ve sağlayıcı anahtarları | Maliyet, veri yurt dışına çıkışı | `kurum.ayarlar`, ortam değişkenleri |
| Anket yanıtları | Anonimlik vaadi | `anket_*` (belirteç HMAC) |

## 2. Aktörler

- **Kurum kullanıcısı** (rol + kapsam: kalite birimi, program sorumlusu, öğretim elemanı…).
- **Dış değerlendirici**: salt okunur, süreli portal erişimi.
- **Başka kiracının kullanıcısı**: en olası iç saldırgan; hedef kiracı sınırını aşmak.
- **Anonim internet**: tanıtım sitesi, giriş, anket bağlantısı, e-posta onay bağlantısı.
- **Kötü niyetli belge yazarı**: yüklenen belge, e-posta, web sayfası üzerinden YZ'ye talimat sokmaya çalışır.
- **Ele geçirilmiş bağımlılık / CI eylemi**: tedarik zinciri.
- **İşletmeci** (sunucu yöneticisi): güvenilir, ama değiştirilemezlik ilkesi ona karşı da kanıt üretmeli.

## 3. Güven sınırları

```
İnternet ──TLS(Caddy)──▶ web (Next.js, /api/v1, MCP) ──▶ servis katmanı ──▶ PostgreSQL (RLS)
   │                         │                                  │            ▲
   │ e-posta (SMTP gelen)    └── oturum/SSO (Better Auth) ◀─ IdP (OIDC/SAML)│
   ▼                                                            ▼            │
 işçi (pg-boss) ── belge çözme (PDF/OOXML/ZIP, OCR, ClamAV) ── nesne deposu ─┘
   │
   └── YZ sağlayıcısı (kurum içi | yurt içi | izinliyse yurt dışı, maskeli)
CLI (Akreddit, çevrim dışı SQLite) ── aktarım paketi / API ──▶ web
```

S1 İnternet→web, S2 web→VT (kiracı sınırı), S3 belge→çözücü (güvenilmeyen girdi), S4 metin→YZ
(talimat/veri ayrımı), S5 YZ çıktısı→kayıt (uydurma sayı/olgu), S6 IdP→web (kimlik iddiası),
S7 CI/bağımlılık→yayın.

## 4. STRIDE tablosu

Durum: **K** = kodla karşılanıyor ve testli, **K\*** = karşılanıyor ama test/doğrulama eksik, **A** = açık.

| # | Tehdit | Sınır | Karşı önlem | Kanıt | Durum |
|---|---|---|---|---|---|
| S-1 | Oturum çalma, sahte kimlik | S1 | Better Auth oturum çerezi (HttpOnly, Secure, SameSite), sihirli bağlantı tek kullanım | `apps/web/src/kimlik/sihirli.test.ts` | K |
| S-2 | Sahte SAML yanıtı (imzasız, XSW, içerik değiştirme, yanlış anahtar) | S6 | `wantAssertionsSigned`, samlify doğrulaması | `saml.test.ts` (İP-27: imzasız, XSW, değiştirme, yeniden gönderim) | K |
| S-3 | OIDC kod enjeksiyonu / yeniden oynatma | S6 | PKCE (S256), state, tek kullanımlık kod. Nonce gönderilmiyor (kütüphane) | `oidc.test.ts` (İP-27) | K (nonce: bilgi) |
| S-4 | Başka kurumun alan adıyla SSO'ya bağlanma | S6 | Sağlayıcı alan adı kancası | `oidc.test.ts` "kendi alan adı dışındaki" | K |
| T-1 | Kanıtın, kararın ya da günlüğün değiştirilmesi | S2 | Yalnız-ekleme tetikleyicileri, özet zinciri, içerik adresli depo, nesne kilidi | `packages/vt/test/*`, `depo.test.ts` | K |
| T-2 | Süper kullanıcı bağlantısıyla tetikleyicinin kapatılması | S2 | Web/işçi `akredit_oturum` üyesi ayrıcalıksız kullanıcıyla bağlanır (İP-27) | `packages/vt/test/oturum-rolu.test.ts` | K\* (Docker'da doğrulanmadı) |
| T-3 | Kurcalanmış ZIP ile kesik dosyanın kanıt olması | S3 | CRC-32 ve boyut denetimi (İP-27) | `belge/test/guvenlik.test.ts`, `isci/.../birim.test.ts` | K |
| T-4 | Aktarım paketinde SQL sokma | CLI | Sütun adları tablo sütunlarına karşı | `apps/cli/test/aktarim-enjeksiyon.test.mjs` | K |
| T-5 | Eşzamanlı yazımda yetim nesne (S3 409) | S2 | 409'da varlık doğrulaması (İP-27) | `depo.test.ts` | K |
| R-1 | Onayın inkârı | S2 | Karar adı, zamanı, dayanağıyla günlükte; aktör oturumdan | `servis` testleri, dalga 1 #6 | K |
| I-1 | Kiracılar arası veri okuma | S2 | `FORCE ROW LEVEL SECURITY`, `kiraciIslemi`, kişi kurum denetimi | `vt/test/kiraci.test.ts`, `web/src/kimlik/yalitim.test.ts` | K (dış testte ayrıca sınanacak) |
| I-2 | Kişisel verinin yurt dışı YZ'ye maskesiz gitmesi | S4 | İzin yoksa çağrı yok; maskeleme (TCKN, IBAN, e-posta, cep ve sabit hat, öğrenci no, ad) | `yz/test/kvkk.test.ts` (İP-27: sabit hat) | K |
| I-3 | Oturum kapandıktan sonra önbellekte veri | S1 | `Clear-Site-Data`, servis çalışanı önbellek silme | `oturum-kapanis.test.ts` | K |
| I-4 | Portal soru/yanıtının günlüğe tam metin yazılması | S2 | — | dalga 3 #6 | A (düşük) |
| I-5 | Gizli bilginin depoya girmesi | S7 | gitleaks + dar yol izin listesi (`.gitleaks.toml`) | CI | K |
| D-1 | ZIP/XML bombası, PDF zaman aşımı | S3 | Oran/boyut/sayı sınırları, XML derinlik, zaman sınırı | `belge/test/guvenlik.test.ts` | K |
| D-2 | İstek seli | S1 | Süreç içi jeton kovası (`servis/http/hiz.ts`), Better Auth hız sınırı | `servis` testleri | K\* (çok örnekli dağıtımda ters vekil sınırı yok) |
| D-3 | MCP öneriyle ders dosyası akışını bozma | S5 | — | dalga 3 #2 | A (orta) |
| E-1 | Yüksek riskli kararın politikayla kişisiz verilmesi | S2 | Tür riski, karar tetikleyicisi, toplu onayda ret | `vt/test/inceleme.test.ts` | K |
| E-2 | API anahtarıyla rolden fazla yetki | S1 | Anahtar kapsamı rollerle kesişir; `karar.ver` verilemez | web kimlik testleri | K |
| E-3 | Davetin iki kez kabulüyle fazladan rol | S1 | Koşullu güncellemeyle atomik sahiplenme (İP-27) | `yonetim.test.ts` | K |
| E-4 | Ele geçirilmiş CI eylemi | S7 | Eylemler 40 haneli SHA ile sabit, `denetle.sh` denetler | `.github/workflows/*`, `infra/uretim/denetle.sh` | K (imaj özetleri: A) |

## 5. YZ'ye özgü riskler

| # | Risk | Önlem | Kanıt | Durum |
|---|---|---|---|---|
| YZ-1 | Dolaylı istem enjeksiyonu (belge, e-posta, web) | `guvenilmeyenSar`, sınırlayıcı temizleme, talimat kalıbı işaretleme; araç çıktısı da sarılır | `yz/test/sayi-kalkan.test.ts`, `ajan-yapilandirilmis.test.ts` | K |
| YZ-2 | Uydurma sayı (rakamla ya da yazıyla) | `sayilariDenetle`: rakam, yüzde, tarih ve yazıyla sayı ("beş", "yüzde kırk") (İP-27) | `sayi-kalkan.test.ts` | K |
| YZ-3 | Uydurma olgu, atıfsız cümle | Atıf doğrulayıcı, `EKSİK` | `yz` atıf testleri | K |
| YZ-4 | Modelin karar vermesi / dış gönderim | Araç düzeyleri; karar yalnız oturumla (`insanKarari`); MCP yasak eylemler | `servis`, `apps/mcp` testleri | K |
| YZ-5 | Kişisel verinin modele/günlüğe sızması | Maskeleme, `gizliAyikla`, ilke 8 | `kvkk.test.ts` | K (I-4 açık) |
| YZ-6 | Atıflı kanıtın dosya adındaki rakamla sayı aklama | — | dalga 3 #8 | A (düşük) |
| YZ-7 | Bologna taslağında modelden gelen yüzde/saat | Politikada insan şartı önerisi | dalga 3 #7 | A (düşük) |
| YZ-8 | Sağlayıcıya aşırı harcama (maliyet DoS) | Kurum bazında ölçüm | `yz` ölçüm | K\* (kota yok) |

## 6. Kapsam dışı ya da kabul edilen riskler

- İşletmecinin (kök erişimli yönetici) veritabanını doğrudan değiştirmesi önlenemez; özet zinciri bunu
  **saptanabilir** kılar (`gunluk_zinciri_dogrula`).
- Kurum IdP'sinin ele geçirilmesi kurumun sorumluluğundadır.
- OIDC nonce: `@better-auth/sso` 1.7 yetki isteğine nonce koymuyor. Yetki kodu akışında PKCE + state +
  tek kullanımlık kod aynı saldırıları (kod enjeksiyonu, yeniden oynatma) karşılıyor; testle gösterildi.
  Kütüphane nonce desteği eklerse açılmalı.
