# Gizli bilgi yönetimi

Yöntem: **SOPS + age**. Sırlar depoda yalnız şifreli durur (`infra/uretim/sirlar/<ortam>.sops.env`). Sunucu kendi age özel anahtarıyla bunları yayın sırasında belleğe (`/run/akredit`, tmpfs) açar. Açık sır diske, depoya, imaja ya da günlüğe yazılmaz (CLAUDE.md "Gizli bilgi", ilke 8).

Neden: harici bir kasa hizmeti gerektirmez, Türkiye dışına sır göndermez, değişiklikler git geçmişinde (şifreli) izlenir, her ortamın anahtarı ayrıdır.

## Anahtarlar

| Anahtar | Nerede | Kim açabilir |
|---|---|---|
| Üretim sunucu anahtarı | yalnız üretim sunucusunda `/etc/akredit/age.key` | üretim |
| Hazırlık sunucu anahtarı | yalnız hazırlık sunucusunda | hazırlık |
| Yönetici kurtarma anahtarı | çevrimdışı (parola yöneticisi + basılı kopya kasada) | her iki ortam |

Kurtarma anahtarı kaybolursa ve sunucu da kaybolursa sırlar açılamaz: veritabanı parolası ve gizli anahtarlar yeniden üretilmek zorunda kalır. Bu yüzden kurtarma anahtarının iki ayrı yerde saklanması zorunludur.

## İlk kurulum

```bash
# 1. Sunucuda (root)
install -d -m 700 /etc/akredit
age-keygen -o /etc/akredit/age.key && chmod 400 /etc/akredit/age.key
grep 'public key' /etc/akredit/age.key        # açık anahtarı not edin (age1...)

# 2. Yöneticinin bilgisayarında (bir kez)
age-keygen -o ~/akredit-kurtarma.age.key     # özel anahtar: çevrimdışı saklayın

# 3. Depoda infra/uretim/.sops.yaml içindeki AGE_* yer tutucularını açık anahtarlarla değiştirip commit edin.

# 4. Sır dosyasını oluşturun (yöneticinin bilgisayarında, depo kökünde)
cd infra/uretim
mkdir -p sirlar
cp ornek.env sirlar/uretim.sops.env
# Değerleri doldurun. Gizli değerleri rastgele üretin:
openssl rand -base64 48 | tr -d '\n'          # AKREDIT_ONAY_GIZLI, AKREDIT_ANKET_GIZLI
openssl rand -base64 32 | tr -d '/+=\n'       # POSTGRES_PASSWORD, YEDEK_PAROLA (URL'ye girdiği için /+= yok)
sops --encrypt --in-place --input-type dotenv --output-type dotenv sirlar/uretim.sops.env
git add sirlar/uretim.sops.env && git commit -m "Üretim sırlarını şifrele"
```

Açık dosyanın şifrelenmeden commit edilmediğini denetleyin: `head -3 sirlar/uretim.sops.env` her değerin `ENC[AES256_GCM,...]` olduğunu göstermelidir. CI'daki gitleaks taraması da açık sırları yakalar.

## Değiştirme

```bash
SOPS_AGE_KEY_FILE=~/akredit-kurtarma.age.key sops --input-type dotenv --output-type dotenv infra/uretim/sirlar/uretim.sops.env
# commit + push; sonra sunucuda yeniden dağıtım:
sudo infra/uretim/dagit.sh uretim <aynı-sürüm> --goc-yok
```

## Döndürme (rotasyon)

| Sır | Ne zaman | Nasıl |
|---|---|---|
| `POSTGRES_PASSWORD` | yılda bir, sızıntı şüphesinde hemen | `ALTER ROLE akredit PASSWORD '...'` + sır dosyası + yeniden dağıtım |
| `YEDEK_PAROLA` | aynı | `ALTER ROLE akredit_yedek PASSWORD '...'` |
| `AKREDIT_ONAY_GIZLI`, `AKREDIT_ANKET_GIZLI` | sızıntı şüphesinde | değiştirmek açık onay/anket bağlantılarını geçersiz kılar; duyurarak yapın |
| S3 ve SMTP anahtarları | yılda bir | sağlayıcıda yeni anahtar → sır dosyası → dağıtım → eski anahtarı sil |
| age sunucu anahtarı | sunucu değişince | yeni anahtar → `.sops.yaml` → `sops updatekeys` |

## Ayrılan kişi

Erişimi olan bir kişi ayrılırsa: kurtarma anahtarı onda da varsa yeni kurtarma anahtarı üretin, `sops updatekeys` ile bütün dosyaları yeniden şifreleyin ve yukarıdaki tablodaki sırların hepsini döndürün (eski şifreli sürümler git geçmişinde durur).
