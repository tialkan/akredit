# Yedekleme ve geri dönüş

## Neler yedeklenir

| Veri | Yöntem | Konum | Saklama |
|---|---|---|---|
| PostgreSQL | WAL arşivi (sürekli) + günlük taban yedek | `/arsiv` birimi + site dışı kova | 35 gün (`YEDEK_SAKLA_GUN`), en az 2 taban yedek |
| Kanıt dosyaları | Nesne deposunda sürümleme + nesne kilidi | kanıt kovası | kilit süresi kurum politikasına göre (aşağıda) |
| Sırlar | Depoda şifreli (SOPS) | git | git geçmişi |
| Caddy sertifikaları | yedeklenmez; Caddy yeniden alır | — | — |
| Prometheus/Gatus geçmişi | yedeklenmez | — | — |

## PostgreSQL

- `archive_command = /yedek/wal-arsivle.sh %p %f`: her WAL dosyası `/arsiv/wal`'a kopyalanır. Betik var olan dosyanın üzerine yazmaz (aynı içerikse başarı döner, farklıysa hata), önce geçici ada yazar, `sync` eder, sonra atomik olarak adlandırır.
- `archive_timeout = 300`: boş sistemde bile en geç 5 dakikada bir WAL kapanır.
- `yedek` hizmeti (`yedek-dongu.sh`) her gün 01:00 UTC'de `taban-yedek.sh` çalıştırır: `pg_basebackup` (düz biçim, SHA-256 bildirim), `pg_verifybackup` ile doğrulama, süresi dolan taban yedeklerin silinmesi ve en eski taban yedekten önceki WAL'ların `pg_archivecleanup` ile temizlenmesi. Başarıda `akredit_yedek_son_basari_zaman` ölçüsünü yazar.
- `yedek-esle` hizmeti 10 dakikada bir `/arsiv`'i site dışı kovaya `rclone copy` ile kopyalar (silme yapmaz). Kovada **sürümleme** ve **nesne kilidi** açık olmalı; eski nesneler kova yaşam döngüsü kuralıyla 35 günden sonra silinir. Böylece sunucu ele geçirilse bile yedekler silinemez.
- Dağıtımdan önce (`dagit.sh uretim`) ek bir taban yedek alınır.

### Kanıt kovası

Kanıt dosyaları değiştirilemez (ilke 4). Kanıt kovasında:

- sürümleme açık,
- nesne kilidi **uyum (compliance)** kipinde, varsayılan saklama süresi kurumun saklama politikasındaki kanıt süresi kadar (docs/hukuk/saklama-imha-politikasi.md; süre orada `[__]` olarak bekliyor: **karar kullanıcıda**),
- uygulama anahtarının silme yetkisi yok.

Sağlayıcıda kova oluştururken nesne kilidi yalnız **oluşturma anında** açılabilir; sonradan açılamaz.

## Geri dönüş

### A. Son ana kadar (sunucu ya da disk kaybı)

```bash
cd /opt/akredit
# 0. Yeni sunucu kurulum.md 2-5. adımlarıyla hazırlanır.
# 1. Site dışı kopyayı yerel birime indir (rclone yapılandırması sır dosyasından gelir)
sudo infra/uretim/sirlar-ac.sh uretim
set -a; . /run/akredit/uretim.env; set +a
docker volume create akredit-uretim_arsiv
docker run --rm -v akredit-uretim_arsiv:/arsiv --env-file /run/akredit/uretim.env "$(grep ^RCLONE_IMAJI infra/uretim/surumler.env | cut -d= -f2)" \
  copy "uzak:$YEDEK_UZAK_KOVA/uretim" /arsiv
# 2. Boş veri birimine en son taban yedeği hazırla
docker volume create akredit-uretim_vt-veri
VT="$(grep ^VT_IMAJI infra/uretim/surumler.env | cut -d= -f2)"
docker run --rm -v akredit-uretim_arsiv:/arsiv -v akredit-uretim_vt-veri:/var/lib/postgresql/data \
  -v "$PWD/infra/uretim/yedek:/yedek:ro" "$VT" \
  bash -c '/yedek/geri-yukle.sh "$(ls -d /arsiv/taban/* | sort | tail -n1)" /var/lib/postgresql/data && chown -R postgres:postgres /var/lib/postgresql/data'
# 3. Yığını başlat; PostgreSQL WAL'ları uygular, bitince kendini yükseltir
sudo infra/uretim/dagit.sh uretim <son-sürüm> --goc-yok
docker compose -p akredit-uretim logs vt | grep -E "redo done|database system is ready"
```

> `DOĞRULANMADI`: Bu komut dizisi gerçek Docker ortamında çalıştırılmadı (bu İP'de Docker sunucusu ve imaj kayıt defteri erişimi yoktu). Aynı betikler (`geri-yukle.sh`) yerel tatbikatta çalıştı; birim adları ve izinler ilk gerçek tatbikatta doğrulanıp bu belge düzeltilmelidir.

### B. Belirli bir ana (yanlış silme, bozuk göç)

A ile aynıdır; 2. adımda hedef zaman verilir:

```bash
/yedek/geri-yukle.sh <taban-yedek> <veri-dizini> "2026-11-03 14:05:00+03"
```

Taban yedek hedef zamandan **önce** alınmış olmalıdır. Hedef anda geri dönen kopya, üretimi değiştirmeden önce ayrı bir sunucuda (ya da ayrı proje adıyla) açılıp incelenmelidir. Değiştirilemez günlük (ilke 4) nedeniyle geri dönüş "geçmişi silmek" değildir: geri dönüş kararı ve gerekçesi yeni bir günlük kaydıyla yazılır.

## Tatbikat

`infra/uretim/yedek/tatbikat.sh` geçici bir PostgreSQL kümesiyle uçtan uca provadır: gerçek Akredit göçlerini uygular, WAL arşivi açar, `taban-yedek.sh` ile yedek alır, yedekten sonra ve hedef andan sonra kayıt yazar, `geri-yukle.sh` ile hedef ana döner ve dört şeyi doğrular (yedek öncesi kayıt var, yalnız WAL'daki kayıt var, hedef sonrası kayıt yok, tablo sayısı aynı). Üretime dokunmaz.

```bash
pnpm install
infra/uretim/yedek/tatbikat.sh                                     # makinedeki en yeni PostgreSQL ile
PG_BIN=/usr/lib/postgresql/17/bin infra/uretim/yedek/tatbikat.sh   # sürüm seçerek
```

Gereken: PostgreSQL araçları + pgvector eklentisi (`postgresql-17-pgvector`), Node.js 22.18+.

### Yapılan tatbikatlar

| Tarih | Ortam | PostgreSQL | Sonuç | Çıktı |
|---|---|---|---|---|
| 2026-10-27 | Yerel geliştirme makinesi (İP-26), geçici küme | 16.15 + pgvector | BAŞARILI (4/4) | [tatbikat/2026-10-27-yerel-pg16.txt](tatbikat/2026-10-27-yerel-pg16.txt) |

**Eksik:** Üretimdeki PostgreSQL 17 ile, gerçek sunucuda, site dışı kopyadan (A yolu) geri dönüş tatbikatı **yapılmadı**. Yapılınca bu tabloya eklenir. Takvim: kurulumdan sonraki ilk hafta, sonra üç ayda bir. Her tatbikatta geri dönüş süresi ölçülür ve RTO hedefi (2 saat) ile karşılaştırılır.
