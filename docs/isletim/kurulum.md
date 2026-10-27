# Sıfırdan kurulum

Bu belge, boş bir sunucudan akredit.org'un çalışır hâle gelmesine kadar her adımı sırayla verir. Her ortam (hazırlık, üretim) için ayrı ayrı uygulanır. Komutlarda `<ortam>` yerine `hazirlik` ya da `uretim` yazılır.

> Durum: Bu belge yazıldığı ortamda gerçek sunucu yoktu. Adımlar bir sunucuda baştan sona **henüz yürütülmedi**. İlk kurulumda çıkan her sapma bu belgeye işlenmelidir.

## 1. Barındırma seçimi

Karar kullanıcınındır. Ölçütler:

- Veri merkezi **Türkiye'de** (mimari.md: "Veri Türkiye'deki bir veri merkezinde tutulur"; KVKK yurt dışı aktarım yükünü kaldırır, kamu kurumu beklentisi). Sözleşmede veri konumu yazılı olmalı.
- Sanal sunucu: hazırlık için 2 vCPU / 4 GB, üretim için en az 4 vCPU / 8 GB / 160 GB SSD (başlangıç; `postgres/postgresql.conf` bellek ayarları 8 GB'a göredir).
- Aynı ya da ikinci bir sağlayıcıda **farklı bir konumda** S3 uyumlu nesne deposu; **sürümleme** ve **nesne kilidi (object lock)** desteği şart.
- Anlık görüntü (snapshot) ve güvenlik duvarı özelliği.
- Veri işleme sözleşmesi imzalanabilmeli (docs/hukuk/veri-isleme-sozlesmesi.md Ek-3'e alt işleyen olarak yazılır).

Belirli sağlayıcı önerisi bu belgede yoktur: güncel fiyat ve özellik araştırması yapılmadı (`DOĞRULANMADI`).

## 2. Sunucu hazırlığı

Ubuntu 24.04 LTS varsayılır.

```bash
# root olarak
adduser --disabled-password --gecos "" akredit
usermod -aG docker akredit            # Docker kurulduktan sonra
# SSH: yalnız anahtarla giriş
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/; s/^#\?PermitRootLogin .*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh
# Güvenlik duvarı: yalnız 22, 80, 443
ufw default deny incoming && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw enable
# Otomatik güvenlik güncellemeleri
apt-get install -y unattended-upgrades && dpkg-reconfigure -plow unattended-upgrades
```

Not: Docker, yayımladığı portlar için ufw kurallarını atlar. Compose dosyası yalnız Caddy'nin 80/443 portlarını yayımlar; başka port yayımlanmamalıdır (`infra/uretim/denetle.sh` compose'u doğrular).

## 3. Yazılım

```bash
# Docker Engine + Compose eklentisi: https://docs.docker.com/engine/install/ubuntu/ adımları
# SOPS ve age
apt-get install -y age
# sops: https://github.com/getsops/sops/releases adresinden sürümlü .deb indirip sağlama toplamını doğrulayarak kurun
git --version   # yoksa: apt-get install -y git
```

## 4. Depo

```bash
mkdir -p /opt/akredit && chown akredit: /opt/akredit
sudo -u akredit git clone https://github.com/<sahip>/akredit.git /opt/akredit
```

Sunucuda depo yalnız yapılandırma ve betikler içindir; uygulama imajları kayıt defterinden çekilir.

## 5. Sırlar

[sirlar.md](sirlar.md) adımlarını uygulayın. Sonunda sunucuda `/etc/akredit/age.key` (0400) bulunur ve şu komut hatasız çalışır:

```bash
sudo /opt/akredit/infra/uretim/sirlar-ac.sh <ortam>
```

`YEDEK_KULLANICI`/`YEDEK_PAROLA` değerleri veritabanı ilk açılışında `postgres/01-yedek-kullanici.sh` ile REPLICATION yetkili kullanıcıyı oluşturur. Bu betik yalnız **boş** veri diziniyle ilk açılışta çalışır.

## 6. DNS ve TLS

[alan-adi-ve-tls.md](alan-adi-ve-tls.md). DNS kayıtları sunucuya yönelmeden Caddy sertifika alamaz; ilk yayından önce yapılmalıdır.

## 7. İlk yayın

```bash
cd /opt/akredit
sudo infra/uretim/dagit.sh <ortam> <sürüm>     # ör. hazirlik ana-0123456789ab ya da uretim v0.1.0
```

İlk yayında `yedek` hizmeti henüz çalışmadığı için göç öncesi yedek atlanır (betik bunu söyler). `yedek` hizmeti açılınca ilk taban yedeği hemen alır.

Doğrulama:

```bash
docker compose -p akredit-<ortam> ps                       # bütün hizmetler running, web healthy
curl -sSI https://akredit.org | head -1                    # HTTP/2 200
docker compose -p akredit-<ortam> logs yedek | tail       # "taban-yedek: tamam"
docker compose -p akredit-<ortam> exec vt psql -U akredit -c "select * from pg_stat_archiver"   # failed_count = 0
```

Ardından `https://durum.akredit.org` sayfasında bütün denetimlerin yeşil olduğunu görün ve [gozlem.md](gozlem.md#uyarıların-sınanması) ile bir uyarıyı sınayın.

## 8. Tatbikat

Kurulumdan sonraki ilk hafta içinde [yedekleme-ve-geri-donus.md](yedekleme-ve-geri-donus.md#tatbikat) tatbikatını yapın.
