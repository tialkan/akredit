# İP-26: Üretim altyapısı ve akredit.org dağıtımı

- **Durum:** bekliyor
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

- [ ] Yedekten geri dönüş tatbikatı belgeli ve başarılı.
- [ ] Sıfırdan kurulum belgeden yürütülebilir.
- [ ] Durum sayfası ve uyarılar çalışır.
- [ ] `pnpm verify` temiz.

## Notlar

Alan adı DNS yönetimi, barındırma hesabı ve faturalandırma kullanıcıdadır.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
