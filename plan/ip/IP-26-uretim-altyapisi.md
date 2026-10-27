# İP-26: Üretim altyapısı ve akredit.org dağıtımı

- **Durum:** inceleme
- **Faz:** 5
- **Bağımlılık:** İP-08
- **Sahip olduğu yollar:** `infra/uretim/**`, `docs/isletim/**`, `docs/raporlar/IP-26.md`
- **Büyüklük:** büyük

## Amaç

akredit.org'un Türkiye'de, yedekli, izlenen ve geri dönülebilir biçimde yayında olması.

## Kapsam

1. Barındırma (Türkiye'de veri merkezi; KVKK ve kamu kurumu beklentileri araştırma bulgularına göre).
2. Ortamlar: hazırlık (staging) ve üretim; altyapı kod olarak; gizli bilgi yönetimi.
3. PostgreSQL yedekleme ve zaman noktasına dönüş (WAL arşivi), nesne deposu sürümleme/kilit, felaket kurtarma tatbikatı.
4. TLS (Caddy ya da eşdeğeri), alan adları (akredit.org, uygulama, belgeler, durum sayfası), e-posta (SPF, DKIM, DMARC).
5. Gözlem: OpenTelemetry, ölçüler, uyarılar, durum sayfası; günlük saklama süreleri KVKK politikasına göre.
6. Sürekli dağıtım: ana daldan hazırlığa, etiketten üretime; veritabanı göçlerinin güvenli sırası.

## Kabul ölçütleri

- [ ] Yedekten geri dönüş tatbikatı belgeli ve başarılı. (Kısmen: betikler ve belge hazır; yerelde PostgreSQL 16 ile tatbikat BAŞARILI. Üretim sunucusunda PG17 ve site dışı kopyadan tatbikat yapılmadı.)
- [ ] Sıfırdan kurulum belgeden yürütülebilir. (Belge yazıldı; gerçek sunucuda yürütülmedi.)
- [ ] Durum sayfası ve uyarılar çalışır. (Yapılandırma yazıldı ve durağan denetimden geçti; Docker sunucusu/imaj erişimi olmadığından çalıştırılmadı.)
- [x] `pnpm verify` temiz. (Biçim ve tip temiz; 815 test sıralı koşuda geçti. Paralel koşuda yüklü makinede `packages/anket` işçisi iki kez çöktü, tek başına geçiyor.)

## Notlar

Alan adı DNS yönetimi, barındırma hesabı ve faturalandırma kullanıcıdadır.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı, inceleme bekliyor. `infra/uretim/`: Compose yığını (Caddy, web, işçi, PostgreSQL 17 + pgvector, yedek, rclone site dışı eşleme, OTel, Prometheus, Alertmanager, node/pg exporter, Gatus durum sayfası), WAL arşivi + taban yedek + geri yükleme + tatbikat betikleri, SOPS/age sır açma, `dagit.sh`/`geri-al.sh` (otomatik geri dönüşlü), `imaj-sabitle.sh`, `denetle.sh`, üretim işçi imajı (`isci.Dockerfile`; `pnpm deploy` imajında iç paketlerin tip ayıklaması düştüğü için) ve `goc.ts`. `docs/isletim/`: kurulum, DNS/TLS/e-posta, sırlar, yedek ve geri dönüş, gözlem ve günlük saklama, sürüm ve geri alma. Ortak dosyalar (en küçük değişiklik): `.github/workflows/ci.yml` ve `codeql.yml` eylemleri SHA ile sabitlendi (inceleme 2. dalga bulgu 8), yeni `.github/workflows/yayin.yml` (ana → hazırlık, etiket → üretim, insan onaylı), yeni `.gitleaks.toml` (bulgu 3: sahte IdP anahtarı için yol izin listesi). Kararlar: tek sunucu + Compose; SOPS + age; Gatus durum sayfası; genişlet/daralt göç kuralı, kod geri alma göçsüz. Kalan: gerçek sunucu, DNS, sağlayıcı seçimi, imaj özetleri, PG17 üretim tatbikatı, `infra/gelistirme` `latest` imajları (İP-08 yolu), uygulamalara OTel SDK.
