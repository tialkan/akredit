# Bilgi işlem kılavuzu

Kurumun bilgi işlem birimi için teknik özet. Ayrıntılı işletim adımları `docs/isletim/` altındadır; bu belge onlara yönlendirir ve kurum tarafında neyin gerektiğini söyler.

> Durum (2026-10-27): akredit.org için yapılandırma ve betikler hazır, gerçek sunucu kurulumu yapılmadı. Kurum içi kurulum paketi (İP-34) ve bağımsız sızma testi (İP-27) henüz yok.

## 1. Kurumsal giriş (SSO)

- Giriş yolları: e-postaya tek kullanımlık sihirli bağlantı ve kurumsal tek oturum. **Parola saklanmaz** (hesap tablosunda parola sütunu veritabanı kısıtıyla boş kalır).
- Desteklenen protokoller: **OpenID Connect** (PKCE açık) ve **SAML 2.0** (imzalı onay zorunlu). YETKİM federasyonu hedeftir; federasyona kayıt kurum ve işletmeci tarafından yapılır, yapılmadı.
- Ayar, `AKREDIT_SSO` ortam değişkeninde bir JSON dizisi olarak verilir; şema `apps/web/src/kimlik/ayar.ts` (`SsoSaglayicisi`). Her sağlayıcı ya OIDC ya SAML'dir:
  - Ortak: `domain` (kurum e-posta alan adı, ör. `ornek.edu.tr`; girişte sağlayıcı bununla seçilir), `providerId` (küçük harf, rakam, tire).
  - OIDC: `issuer`, `clientId`, `clientSecret`, `discoveryEndpoint`, isteğe bağlı `scopes` (varsayılan `openid email profile`).
  - SAML: `issuer` (SP varlık kimliği), `entryPoint`, `cert` (IdP imza sertifikası, PEM), `callbackUrl`, `idpMetadata` (metaveri XML'i ya da varlık kimliği), isteğe bağlı `mapping`.
- Kurumdan istenenler: IdP metaverisi ya da OIDC istemci kaydı, kullanıcıların e-posta özniteliği. Kullanıcılar giriş yapmadan önce davet edilmiş olmalıdır (davetsiz SAML kullanıcısı reddedilir).
- Diğer gerekli değişkenler: `AKREDIT_ADRES` (kök adres), `AKREDIT_KIMLIK_GIZLI` (en az 32 karakter). Giriş bilgileri, oturum belirteçleri ve SAML/OIDC verisi günlüğe yazılmaz.

## 2. Kurulum ve barındırma

- akredit.org: Türkiye'de tek sunucu (hazırlık ve üretim ayrı), Docker Compose; dışarıya yalnız 80/443 açıktır. Bkz. [kurulum](../isletim/kurulum.md), [alan adı ve TLS](../isletim/alan-adi-ve-tls.md), [sırlar](../isletim/sirlar.md), [sürüm ve geri alma](../isletim/surum-ve-geri-alma.md).
- Kiracı yalıtımı veritabanı satır güvenliğiyle yapılır; her istek tek kuruma bağlanır.
- E-posta gönderimi: `AKREDIT_SMTP_SUNUCU` (ve port, kullanıcı, parola, gönderen) verilmezse sihirli bağlantı e-postaları gitmez. SPF, DKIM ve DMARC kayıtları için alan adı belgesine bakın.
- Kanıt dosyaları S3 uyumlu, sürümlemesi ve nesne kilidi açık bir kovada tutulur (değiştirilemez kayıt ilkesi).
- **Kurum içi kurulum:** aynı kod tek kiracılı çalışacak biçimde tasarlandı, ancak kurulum paketi ve belgesi İP-34'tedir; bugün hazır değildir.

## 3. Model sunucusu

- YZ katmanı sağlayıcıdan bağımsızdır; OpenAI uyumlu bir uç sunan sağlayıcılar kullanılabilir (yurt içi EVREN, kurumun vLLM ya da Ollama sunucusu). Yurt dışı sağlayıcı varsayılan olarak kapalıdır; kurum yöneticisi panelin Ayarlar sayfasından açabilir ve bu karar günlüğe yazılır.
- İzin olmadan kişisel veri içeren belge yurt dışı sağlayıcıya gitmez; izinliyken de maskelenir, öğrenci numaraları her durumda HMAC takma addır.
- Belge metni modele talimat olarak verilmez (istem kalkanı). Modelin yazdığı sayılar rapora geçmez; sayılar deterministik hesaptan gelir.
- Kurumun kendi model sunucusunu bağlamak için hazır bir kurulum betiği yoktur (İP-34).

## 4. Yedekleme ve geri dönüş

- PostgreSQL WAL arşivi (en çok 5 dakika aralık) + günlük taban yedek; site dışı kopya 10 dakikada bir Türkiye'de ikinci bir konumdaki sürümlü ve kilitli kovaya eşlenir. Hedef: veri kaybı en kötü durumda 15 dakika, geri dönüş 2 saat.
- Zaman noktasına geri dönüş yerelde PostgreSQL 16 ile uçtan uca sınandı; üretim sunucusunda tatbikat henüz yapılmadı. Bkz. [yedekleme ve geri dönüş](../isletim/yedekleme-ve-geri-donus.md), [gözlem](../isletim/gozlem.md).

## 5. Diğer bağlantılar

- API: `/api/v1`, OpenAPI 3.1 belgesi `packages/servis/openapi.json`. API anahtarıyla karar verilemez, politika imzalanamaz.
- MCP sunucusu: `apps/mcp/ARACLAR.md`. Karar veren araç yoktur.
- Komut satırı aracı: `apps/cli` (`akredit`, eski adı `akreddit`).
- Bağlayıcılar (AVESİS, YÖK Atlas, UBYS, EBYS, IMAP e-posta, Drive/OneDrive) paket düzeyinde hazırdır; canlı sistemlerle sınanmadı ve kurum için ayrıca açılmaları gerekir.
