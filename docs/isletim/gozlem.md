# Gözlem: ölçüler, uyarılar, durum sayfası, günlükler

Bileşenler (`infra/uretim/docker-compose.yml`, yapılandırma `infra/uretim/gozlem/`):

| Hizmet | İş |
|---|---|
| `otel` | OpenTelemetry toplayıcı. Web ve işçi OTLP/HTTP ile `http://otel:4318`'e gönderir. Kişisel veri olabilecek öznitelikler (`enduser.id`, çerez, yetki başlığı, istemci adresi, sorgu dizgesi) dışa aktarılmadan silinir. |
| `prometheus` | Ölçüleri toplar (30 gün saklar), `uyarilar.yml` kurallarını değerlendirir. |
| `alertmanager` | Uyarıları e-postayla gönderir (kritikler saatte bir tekrar). |
| `node-exporter` | Sunucu: disk, bellek, CPU; ayrıca yedek ölçüsü (`/metrik/yedek.prom`). |
| `pg-exporter` | PostgreSQL: bağlantı, WAL arşivi durumu. |
| `gatus` | Durum sayfası `durum.akredit.org` ve dış adresten denetim (DNS + TLS + Caddy + uygulama). |

Prometheus ve Alertmanager arayüzleri dışarı açılmaz. Bakmak için SSH tüneli:

```bash
ssh -L 9090:localhost:9090 akredit@SUNUCU \
  'docker run --rm --network akredit-uretim_gozlem -p 127.0.0.1:9090:9090 alpine/socat TCP-LISTEN:9090,fork TCP:prometheus:9090'
```

## Uygulama ölçüleri

Web ve işçi OpenTelemetry SDK'sını henüz içermiyor: ortam değişkenleri (`OTEL_*`) hazır, toplayıcı hazır; SDK'nın eklenmesi uygulamanın sahibi olan İP'lerin işidir (bkz. docs/raporlar/IP-26.md "Sonraki İP'lere notlar"). O zamana kadar uygulama sağlığı Gatus'un dış denetimiyle ve kapsayıcı sağlık denetimiyle izlenir.

## Uyarı el kitabı

| Uyarı | Anlamı | İlk yapılacak |
|---|---|---|
| `HizmetKapali` | Bir ölçü hedefi 2 dk yanıt vermiyor | `docker compose -p akredit-uretim ps`; çıkmış hizmetin `logs`'u |
| `DurumDenetimiBasarisiz` | Site dışarıdan açılmıyor | `curl -I https://akredit.org`; Caddy ve web günlükleri; DNS |
| `VeritabaniKapali` | PostgreSQL'e bağlanılamıyor | `logs vt`; disk dolu mu |
| `WalArsiviBasarisiz` | WAL arşivlenemiyor: zaman noktasına dönüş tehlikede, `pg_wal` büyür | `logs vt` içinde `wal-arsivle:`; `/arsiv` dolu mu; izinler |
| `WalArsiviGecikti` | 15 dk'dır arşiv yok | yukarıdaki gibi; `select * from pg_stat_archiver` |
| `YedekEskidi` | 26 saattir başarılı taban yedek yok | `logs yedek`; elle `exec yedek /yedek/taban-yedek.sh` |
| `YedekOlcusuYok` | Yedek ölçüsü hiç yok | `yedek` hizmeti çalışıyor mu; `metrik` birimi |
| `DiskDoluyor` | Boş alan < %15 | `docker system df`; `/arsiv` boyutu; saklama süresi |
| `BellekAz` | Kullanılabilir bellek < %10 | `docker stats` |
| `TlsSertifikasiBitiyor` | Sertifika 14 günden az | `logs caddy` (ACME hatası); 80/443 açık mı; CAA kaydı |

`gatus_results_*` ölçü adları Gatus belgelerinden alınmıştır; çalışan bir Gatus'ta **doğrulanmadı**. İlk kurulumda `curl gatus:8080/metrics` çıktısıyla karşılaştırın.

## Uyarıların sınanması

Kurulumdan sonra bir kez (ve her tatbikatta):

```bash
# Alertmanager'ın e-posta gönderebildiğini sınayın
docker compose -p akredit-uretim exec alertmanager amtool alert add Sinama onem=uyari \
  --annotation=ozet="Sınama uyarısı" --alertmanager.url=http://localhost:9093
# Gatus: web'i 4 dakika durdurun; durum sayfası kırmızı olmalı ve e-posta gelmeli
docker compose -p akredit-uretim stop web; sleep 240; docker compose -p akredit-uretim start web
```

## Dış denetim

Gatus sunucuyla aynı makinede çalıştığından sunucu tamamen düşerse uyarı gönderemez. Bunun için **ikinci bir yerden** basit bir denetim kurulmalıdır (ör. hazırlık sunucusundaki Gatus'a üretim adresini eklemek ya da bir dış çalışma süresi hizmeti). Kurulmadı; kullanıcı kararı.

## Günlük saklama

Kişisel veri en az tutulur (ilke 7) ve parola, kod, çerez günlüğe girmez (ilke 8).

| Günlük | Saklama | Gerekçe |
|---|---|---|
| Kapsayıcı günlükleri | hizmet başına en çok 5 × 20 MB (dönerek) | işletim hatası ayıklama |
| Caddy erişim günlüğü | **tutulmaz** | IP adresi kişisel veridir; gerek olursa açılır ve süre belirlenir |
| PostgreSQL | bağlantı açılış/kapanış; sorgu ve parametre yazılmaz | güvenlik |
| Prometheus ölçüleri | 30 gün | kişisel veri içermez |
| Gatus geçmişi | Gatus varsayılanı | kişisel veri içermez |
| Uygulamanın değiştirilemez günlüğü | veritabanında, kalıcı | ilke 3-4; bu tabloya girmez |

"Erişim ve güvenlik günlükleri" için kurum politikasında süre `[__]` (docs/hukuk/saklama-imha-politikasi.md). Süre belirlenince erişim günlüğü açılıp merkezi bir depoya o süreyle yazılmalıdır.
