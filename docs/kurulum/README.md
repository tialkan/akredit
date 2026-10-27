# Kurum içi kurulum

Bu kılavuz, verisini kurum dışına çıkarmak istemeyen üniversitelerin Akredit'i kendi sunucusunda, kendi yapay zekâ modeliyle çalıştırması içindir. akredit.org ile aynı kod çalışır; tek fark, her şeyin kurumda olması ve tek kurumun (tek kiracı) kullanmasıdır.

## Ne nerede durur

| Bileşen | Yer | Dışarıyla bağlantı |
|---|---|---|
| Web paneli, arka plan işleri | Kurum sunucusu | Yok (iç ağ) |
| Veritabanı (PostgreSQL + pgvector) | Kurum sunucusu | Yok (iç ağ) |
| Kanıt dosyaları | Kurumun S3 uyumlu deposu ya da yerel MinIO | Yok (iç ağ) |
| Yapay zekâ modeli | Kurum sunucusunda Ollama ya da vLLM | Yok (iç ağ) |
| Ters vekil (Caddy) | Kurum sunucusu | Yalnız kullanıcıların tarayıcısından gelen bağlantı |

Web, işçi, veritabanı ve model Docker'ın `internal` ağlarındadır (Kubernetes'te `NetworkPolicy`): bu hizmetlerden internete çıkış yoktur. Yapay zekâ ayarı da kodla denetlenir (`infra/kurum-ici/yz-ayari.ts`): model adresi kurum ağının dışındaysa ya da yurt dışı izni açılmak istenirse sistem çalışmaz. Kurulum, yükseltme ve günlük kullanım için internet gerekmez; yazılım ve model ağırlıkları bir **kurulum demetiyle** taşınır.

## Belgeler

1. [kurulum.md](kurulum.md): tek sunucuya Docker Compose ile, internete kapalı kurulum (önerilen yol).
2. [kubernetes.md](kubernetes.md): Kubernetes kümesine Helm ile kurulum.
3. [yerel-model.md](yerel-model.md): model sunucusu seçimi, Türkçe başarımın ölçülmesi, donanım.
4. [yukseltme-ve-geri-donus.md](yukseltme-ve-geri-donus.md): sürüm yükseltme ve önceki sürüme dönüş.
5. [tatbikat.md](tatbikat.md): temiz sunucuda kurulum ve yükseltme tatbikatı; yapılanlar ve sonuçlar.

## Dosyalar (`infra/kurum-ici/`)

| Dosya | İş |
|---|---|
| `docker-compose.yml`, `Caddyfile`, `surumler.env`, `ornek.env` | Yığın tanımı, imaj sürümleri, ayar örneği |
| `demet-olustur.sh` | İnternete açık hazırlık makinesinde demet üretir (imajlar, model, betikler, özetler) |
| `demet-yukle.sh` | Demeti doğrular (SHA-256) ve sunucuya yükler |
| `kur.sh`, `yukselt.sh`, `geri-don.sh` | İlk kurulum, yükseltme (önce yedek), geri dönüş |
| `vt-yedek.sh` | Yükseltme öncesi veritabanı yedeği ve ondan geri yükleme |
| `yz-ayari.ts`, `model-olc.ts`, `tatbikat/model-sor.ts` | Yerel model ayar denetimi, Türkçe başarım ölçümü, tek soru denemesi |
| `helm/akredit/` | Kubernetes Helm şeması |
| `denetle.sh` | Paketin durağan ve davranış denetimi (Docker sunucusu gerekmez) |
| `tatbikat/tatbikat.sh` | Veritabanı yükseltme/geri dönüş ve yerel model tatbikatı (Docker gerekmez) |

## Sorumluluk

Kurum içi kurulumda sunucunun güvenliği, işletim sistemi güncellemeleri, yedeklerin kurum yedek sistemine alınması ve KVKK kapsamındaki veri sorumluluğu kurumdadır. Akredit'in değişmez ilkeleri (kanıtsız iddia yok, beyan ve son gönderim insanda, değiştirilemez kayıt) kurulum biçiminden bağımsız olarak kodda uygulanır.
