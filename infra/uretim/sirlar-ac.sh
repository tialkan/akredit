#!/usr/bin/env bash
# Şifreli sır dosyasını (SOPS + age) sunucuda belleğe açar.
# Kullanım: infra/uretim/sirlar-ac.sh <uretim|hazirlik>
#
# Girdi : infra/uretim/sirlar/<ortam>.sops.env   (depoda, şifreli)
# Anahtar: /etc/akredit/age.key                   (yalnız sunucuda, 0400, root) ya da SOPS_AGE_KEY_FILE
# Çıktı : /run/akredit/<ortam>.env                (tmpfs; yeniden başlatmada silinir, 0600)
# Açık sır diske, depoya ya da günlüğe yazılmaz. Bkz. docs/isletim/sirlar.md
set -euo pipefail

ortam="${1:?kullanım: sirlar-ac.sh <uretim|hazirlik>}"
[[ "$ortam" =~ ^(uretim|hazirlik)$ ]] || { echo "sirlar-ac: ortam uretim ya da hazirlik olmalı" >&2; exit 2; }

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
girdi="$dizin/sirlar/$ortam.sops.env"
cikti_dizini="${AKREDIT_SIR_DIZINI:-/run/akredit}"
cikti="$cikti_dizini/$ortam.env"
export SOPS_AGE_KEY_FILE="${SOPS_AGE_KEY_FILE:-/etc/akredit/age.key}"

command -v sops >/dev/null || { echo "sirlar-ac: sops kurulu değil (docs/isletim/sirlar.md)" >&2; exit 1; }
[[ -f "$girdi" ]] || { echo "sirlar-ac: $girdi yok" >&2; exit 1; }
[[ -r "$SOPS_AGE_KEY_FILE" ]] || { echo "sirlar-ac: age anahtarı okunamıyor: $SOPS_AGE_KEY_FILE" >&2; exit 1; }

umask 077
mkdir -p "$cikti_dizini"
gecici="$(mktemp "$cikti_dizini/.$ortam.XXXXXX")"
trap 'rm -f "$gecici"' EXIT
sops --decrypt --input-type dotenv --output-type dotenv "$girdi" >"$gecici"

# Zorunlu değişkenler boş olmamalı.
eksik=0
for ad in POSTGRES_PASSWORD YEDEK_PAROLA AKREDIT_ONAY_GIZLI AKREDIT_ANKET_GIZLI; do
  grep -Eq "^${ad}=.+" "$gecici" || { echo "sirlar-ac: $ad boş ya da yok" >&2; eksik=1; }
done
((eksik == 0)) || exit 1

mv "$gecici" "$cikti"
trap - EXIT
echo "sirlar-ac: $cikti hazır"
