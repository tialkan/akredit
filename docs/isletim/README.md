# İşletim kılavuzları (akredit.org)

Bu klasör akredit.org'un kurulumu, yayını, yedeği ve izlenmesi içindir. Kaynak dosyalar `infra/uretim/` altındadır.

| Belge | Konu |
|---|---|
| [kurulum.md](kurulum.md) | Sıfırdan kurulum: sunucu, yazılım, sırlar, ilk yayın |
| [alan-adi-ve-tls.md](alan-adi-ve-tls.md) | akredit.org DNS kayıtları, TLS, e-posta (SPF, DKIM, DMARC) |
| [sirlar.md](sirlar.md) | Gizli bilgi yönetimi (SOPS + age) |
| [yedekleme-ve-geri-donus.md](yedekleme-ve-geri-donus.md) | WAL arşivi, taban yedek, zaman noktasına dönüş, tatbikat |
| [gozlem.md](gozlem.md) | Ölçüler, uyarılar, durum sayfası, günlük saklama |
| [surum-ve-geri-alma.md](surum-ve-geri-alma.md) | Hazırlık ve üretime yayın, göç sırası, geri alma |
| [acik-mcp-hiz-siniri.md](acik-mcp-hiz-siniri.md) | Açık MCP ucu için ters vekilde hız ve gövde sınırı |
| [tatbikat/](tatbikat/) | Yapılan geri dönüş tatbikatlarının çıktıları |

## Mimari özet

Tek sunucu (her ortam için bir tane), Docker Compose:

```
İnternet ──443──> caddy ──> web (Next.js) ──┐
                     └──> gatus (durum)     ├──> vt (PostgreSQL 17 + pgvector)
                                isci ───────┘         │ archive_command
                                                      v
                                   yedek (günlük taban yedek) ──> /arsiv (taban + WAL)
                                                                     │
                                   yedek-esle (rclone, 10 dk) ───────┴──> site dışı kova (Türkiye, sürümlü + kilitli)
otel ──> prometheus ──> alertmanager ──> e-posta
```

- Dışarı yalnız Caddy (80/443) açılır. Veritabanı ve gözlem ağları `internal`dır.
- Kanıt dosyaları uygulamanın S3 uyumlu nesne deposundadır (sürümleme ve nesne kilidi açık; ilke 4).
- Hedefler: veri kaybı en çok 5 dakika (RPO, `archive_timeout = 300` + 10 dakikalık site dışı eşleme ile en kötü durumda 15 dakika), geri dönüş süresi 2 saat (RTO; ilk gerçek tatbikatta ölçülüp güncellenecek).

## Kullanıcının yapması gerekenler (bu İP'de yapılamadı)

Bu adımlar hesap, ödeme ya da gerçek sunucu gerektirir; depo içinden yapılamaz.

1. Türkiye'de veri merkezi olan bir barındırma sağlayıcısı seç, iki sunucu aç (hazırlık, üretim). Seçim ölçütleri: [kurulum.md](kurulum.md#1-barındırma-seçimi).
2. Türkiye'de ikinci bir konumda S3 uyumlu iki kova aç: kanıt kovası ve yedek kovası (sürümleme + nesne kilidi).
3. akredit.org DNS kayıtlarını gir: [alan-adi-ve-tls.md](alan-adi-ve-tls.md).
4. age anahtarlarını üret, `infra/uretim/.sops.yaml`'daki yer tutucuları değiştir, sır dosyalarını şifrele: [sirlar.md](sirlar.md).
5. Kayıt defterine erişimi olan bir makinede `infra/uretim/imaj-sabitle.sh` çalıştır, `surumler.env`'i commit et.
6. GitHub'da `hazirlik` ve `uretim` ortamlarını, değişkenleri ve sırları tanımla; `uretim` ortamına zorunlu onaylayıcı ekle: [surum-ve-geri-alma.md](surum-ve-geri-alma.md).
7. Kurulumdan sonra üretim sunucusunda geri dönüş tatbikatını yap ve çıktıyı `tatbikat/` altına ekle: [yedekleme-ve-geri-donus.md](yedekleme-ve-geri-donus.md#tatbikat).
