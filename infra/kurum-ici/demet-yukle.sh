#!/usr/bin/env bash
# Kurulum demetini kurum sunucusuna yükler (internet gerekmez).
# Kullanım: sudo <demet>/kurum-ici/demet-yukle.sh <demet-dizini> [--model-hedef <dizin>]
#   1. SHA256SUMS ile bütün dosyaları doğrular; tek uyuşmazlıkta hiçbir şey yüklemez.
#   2. imajlar.tar'ı Docker'a yükler ve imajlar.txt'deki her imajın yüklendiğini denetler.
#   3. modeller.tar varsa model hedef dizinine açar (varsayılan /var/lib/akredit/modeller).
set -euo pipefail

demet="$(cd "${1:?kullanım: demet-yukle.sh <demet-dizini> [--model-hedef <dizin>]}" && pwd)"
model_hedef="/var/lib/akredit/modeller"
[[ "${2:-}" == "--model-hedef" ]] && model_hedef="${3:?--model-hedef için dizin gerekli}"
DOCKER="${DOCKER:-docker}"

[[ -r "$demet/SHA256SUMS" ]] || { echo "demet: SHA256SUMS yok" >&2; exit 1; }
echo "demet: dosyalar doğrulanıyor"
(cd "$demet" && sha256sum -c --quiet SHA256SUMS) || { echo "demet: doğrulama başarısız; demet bozuk ya da değiştirilmiş" >&2; exit 1; }

echo "demet: imajlar yükleniyor"
"$DOCKER" load -i "$demet/imajlar.tar" >/dev/null
while read -r ad _; do
  "$DOCKER" image inspect "$ad" >/dev/null 2>&1 || { echo "demet: yüklenemedi: $ad" >&2; exit 1; }
done <"$demet/imajlar.txt"

if [[ -f "$demet/modeller.tar" ]]; then
  echo "demet: model ağırlıkları açılıyor -> $model_hedef"
  mkdir -p "$model_hedef"
  tar -C "$model_hedef" --no-same-owner -xf "$demet/modeller.tar"
fi
echo "demet: yüklendi, sürüm $(cat "$demet/SURUM")"
