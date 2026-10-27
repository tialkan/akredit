# Tek sunucuya kurulum (Docker Compose, internete kapalı)

Bu belge adım adım yürütülmek üzere yazılmıştır. Her adımın sonunda "Denetim" satırındaki komut beklenen sonucu vermeden sonraki adıma geçmeyin.

## 0. Gerekenler

**Sunucu** (Ubuntu 24.04 LTS ya da Debian 12 önerilir):

| Kullanım | İşlemci | Bellek | Disk | Model |
|---|---|---|---|---|
| Deneme, tek bölüm | 8 çekirdek | 32 GB | 200 GB SSD | Ollama, CPU, 7B–8B sınıfı |
| Fakülte / küçük üniversite | 16 çekirdek | 64 GB | 500 GB SSD | Ollama ya da vLLM, 1 GPU (24 GB) |
| Üniversite geneli | 32 çekirdek | 128 GB | 1 TB SSD | vLLM, 1–2 GPU (48–80 GB) |

Model seçimi ve GPU belleği hesabı: [yerel-model.md](yerel-model.md). Tablodaki değerler başlangıç önerisidir, yük ölçülerek düzeltilmelidir.

**Yazılım (sunucuda):** Docker Engine 24+ ve Docker Compose eklentisi v2.20+; GPU varsa NVIDIA sürücüsü ve NVIDIA Container Toolkit. İnternete kapalı sunucuya bunlar kurumun yerel paket aynasından kurulur.

**Hazırlık makinesi (internete açık, kurum dışı da olabilir):** Docker, git, `sha256sum`; Ollama kullanılacaksa `ollama` istemcisi.

**Kurum BT'sinden:** iç DNS kaydı (örn. `akredit.kurum.example` → sunucu IP), kurum CA'sından TLS sertifikası (`akredit.crt` zincirli + `akredit.key`), isteğe bağlı kurum SMTP aktarıcısı ve S3 uyumlu depo.

## 1. Demeti hazırla (hazırlık makinesinde)

```bash
git clone https://github.com/SAHIP/akredit.git && cd akredit
git checkout v0.3.0                       # kurulacak sürüm etiketi
# Ollama modeli (örnek): ağırlıklar ayrı bir dizine indirilir
mkdir -p ~/akredit-model && OLLAMA_MODELS=~/akredit-model ollama serve &   # geçici sunucu
OLLAMA_MODELS=~/akredit-model ollama pull qwen2.5:14b
kill %1
# vLLM için: Hugging Face model klasörünü ~/akredit-model/<model-adı>/ altına indirin.

WEB_IMAJ_ADI=ghcr.io/SAHIP/akredit-web ISCI_IMAJ_ADI=ghcr.io/SAHIP/akredit-isci \
  infra/kurum-ici/demet-olustur.sh v0.3.0 ~/akredit-demet-v0.3.0 --model-dizini ~/akredit-model
```

Betik bütün imajları çeker (bulunamayan sürüm etiketinde durur), `imajlar.txt`'ye ad ve içerik özetini yazar, imajları `imajlar.tar`'a, modeli `modeller.tar`'a koyar, betikleri ve bu belgeleri ekler, her dosyanın SHA-256 özetini `SHA256SUMS`'a yazar.

**Denetim:** `cd ~/akredit-demet-v0.3.0 && sha256sum -c --quiet SHA256SUMS && cat imajlar.txt` hata vermez, her satırda `@sha256:` vardır.

`SHA256SUMS` dosyasının özetini (`sha256sum SHA256SUMS`) demetten ayrı bir yoldan (örn. imzalı e-posta) kurum BT'sine iletin; demet taşınırken değiştirilmediği böyle kanıtlanır.

## 2. Demeti sunucuya taşı ve yükle

Demet dizinini taşınabilir diskle sunucuya kopyalayın (örn. `/opt/akredit-demet-v0.3.0`).

```bash
sudo /opt/akredit-demet-v0.3.0/kurum-ici/demet-yukle.sh /opt/akredit-demet-v0.3.0 \
  --model-hedef /var/lib/akredit/modeller
sudo mkdir -p /opt/akredit && sudo cp -a /opt/akredit-demet-v0.3.0/kurum-ici /opt/akredit/
```

Doğrulama tek dosyada bile tutmazsa hiçbir şey yüklenmez.

**Denetim:** `docker image ls` çıktısında `imajlar.txt`'deki bütün imajlar vardır; `/var/lib/akredit/modeller` dolu.

## 3. Ayarları yaz

```bash
sudo mkdir -p /etc/akredit/sertifika /var/lib/akredit/yedekler
sudo cp /opt/akredit/kurum-ici/ornek.env /etc/akredit/akredit.env
sudo chmod 600 /etc/akredit/akredit.env
sudo cp akredit.crt akredit.key /etc/akredit/sertifika/ && sudo chmod 600 /etc/akredit/sertifika/akredit.key
for d in AKREDIT_ONAY_GIZLI AKREDIT_ANKET_GIZLI AKREDIT_TAKMA_AD_ANAHTARI POSTGRES_PASSWORD UYGULAMA_VT_PAROLA S3_GIZLI_ANAHTAR; do
  sudo sed -i "s|^$d=.*|$d=$(openssl rand -hex 32)|" /etc/akredit/akredit.env
done
sudoedit /etc/akredit/akredit.env
```

Düzenlenecekler: `WEB_IMAJ_ADI`, `ISCI_IMAJ_ADI` (demetteki adlar), `AKREDIT_UYGULAMA_ALAN`, `S3_ERISIM_ANAHTARI` (yerel MinIO için en az 3 karakterlik bir ad), `AKREDIT_YZ_*` ve `AKREDIT_PROFILLER`:

- Ollama: `AKREDIT_YZ_HAZIR=ollama`, `AKREDIT_YZ_ADRES=http://model:11434/v1`, `AKREDIT_YZ_MODEL=qwen2.5:14b`, `AKREDIT_PROFILLER=ollama depo`.
- vLLM: `AKREDIT_YZ_HAZIR=vllm`, `AKREDIT_YZ_ADRES=http://model:8000/v1`, `AKREDIT_YZ_MODEL=<modeller dizinindeki klasör adı>`, `AKREDIT_PROFILLER=vllm depo`.
- Kurumun kendi S3 deposu varsa `depo` profilini çıkarın ve `S3_*` değerlerini o depoya göre yazın.

`AKREDIT_TAKMA_AD_ANAHTARI` öğrenci kimliklerinin takma adını üretir: **kaybolursa eski takma adlar eşleşmez**. Bu dosyanın bir kopyasını kurumun kasasında saklayın.

**Denetim:** `cd /opt/akredit/kurum-ici && sudo AKREDIT_SURUM=v0.3.0 docker compose --env-file surumler.env --env-file /etc/akredit/akredit.env --profile goc --profile ollama --profile depo config -q` hata vermez.

## 4. Kur

```bash
sudo /opt/akredit/kurum-ici/kur.sh v0.3.0
```

Sıra: imajların yerelde olduğu denetlenir → zorunlu gizli değerler ve model adresinin iç ağda olduğu denetlenir → veritabanı, nesne deposu ve model açılır → göçler uygulanır → web, işçi, Caddy açılır → web sağlıklı olana kadar beklenir (en çok 150 sn) → `/var/lib/akredit/surumler.log`'a satır yazılır.

**Denetim:**

```bash
curl -fsS --cacert kurum-ca.crt https://akredit.kurum.example/ -o /dev/null && echo tamam
docker compose -p akredit-kurum ps          # bütün hizmetler running/healthy
```

## 5. Kanıt kovası (yerel MinIO kullanılıyorsa)

Nesne kilitli kova bir kez açılır (ilke 4: kanıt dosyaları silinmez). `mc` istemcisi MinIO imajında yoktur; hazırlık makinesinde `minio/mc` imajını demete ekleyin ya da kurum deposunun arayüzünden aşağıdaki ayarla kova açın: ad `akredit-kanit`, **sürümleme açık, nesne kilidi açık** (uyum kipi, kurum saklama süresi).

## 6. Yerel modeli dene ve ölç

```bash
docker compose -p akredit-kurum exec -T isci node infra/kurum-ici/tatbikat/model-sor.ts "Merhaba, hazır mısın?"
```

Model yanıt vermelidir. Türkçe başarım ölçümü ve model seçimi: [yerel-model.md](yerel-model.md).

## 7. İlk yönetici ve kurum ayarı

Panelde ilk yönetici hesabını açın. **Kurum ayarlarında yurt dışı yapay zekâ izni kapalı kalmalıdır**; kurum içi kurulumda zaten açılamaz.

## 8. Yedek

Bu paket yalnız **yükseltme öncesi** yedeği otomatik alır (`/var/lib/akredit/yedekler`). Sürekli yedek (WAL arşivi, zaman noktasına dönüş) için `infra/uretim/yedek/` betikleri ve [../isletim/yedekleme-ve-geri-donus.md](../isletim/yedekleme-ve-geri-donus.md) uyarlanır; ayrıca `vt-veri`, `depo-veri` birimleri ve `/var/lib/akredit` kurumun yedek sistemine alınmalıdır.

## Sorun giderme

| Belirti | Neden / yapılacak |
|---|---|
| `imaj yüklü değil` | 2. adımı yeniden yapın; sürüm etiketi `AKREDIT_SURUM` ile aynı mı? |
| Web sağlıklı olmuyor | `docker compose -p akredit-kurum logs web`; çoğunlukla veritabanı parolası ya da göç hatası |
| Model yanıt vermiyor | `logs ollama` / `logs vllm`; model dizini boş ya da ad yanlış; vLLM'de GPU görünmüyor (`nvidia-smi`) |
| "Model sunucusu kurum ağının dışında görünüyor" | `AKREDIT_YZ_ADRES` iç ad (`model`) ya da özel IP olmalı |
