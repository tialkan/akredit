#!/usr/bin/env bash
# surumler.env'deki her imaj etiketini kayıt defterinden içerik özetine çözer ve
# `ad:etiket@sha256:...` biçiminde geri yazar. Kayıt defterine erişimi olan bir makinede çalıştırılır;
# sonuç gözden geçirilip commit edilir. Bulunamayan etiket hata verir (dosya değişmez).
# Kullanım: infra/uretim/imaj-sabitle.sh
set -euo pipefail

dosya="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/surumler.env"
gecici="$(mktemp)"
trap 'rm -f "$gecici"' EXIT

while IFS= read -r satir; do
  if [[ "$satir" =~ ^([A-Z_]+_IMAJI)=([^@]+)(@sha256:[0-9a-f]+)?$ ]]; then
    ad="${BASH_REMATCH[1]}"
    imaj="${BASH_REMATCH[2]}"
    ozet="$(docker buildx imagetools inspect "$imaj" --format '{{json .Manifest.Digest}}' | tr -d '"')"
    [[ "$ozet" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "imaj-sabitle: $imaj çözülemedi" >&2; exit 1; }
    echo "$ad=$imaj@$ozet" >>"$gecici"
    echo "imaj-sabitle: $imaj -> $ozet"
  else
    echo "$satir" >>"$gecici"
  fi
done <"$dosya"

cp "$gecici" "$dosya"
