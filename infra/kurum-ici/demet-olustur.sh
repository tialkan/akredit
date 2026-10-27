#!/usr/bin/env bash
# İnternete kapalı kurulum demeti oluşturur. İNTERNETE AÇIK bir hazırlık makinesinde çalıştırılır
# (kurumun sunucusunda değil). Demet bir dizindir; kurum içine taşınabilir diskle götürülür.
#
# Kullanım (depo kökünden):
#   infra/kurum-ici/demet-olustur.sh <vX.Y.Z> <çıktı-dizini> [--model-dizini <dizin>]
#     --model-dizini: model ağırlıkları dizini.
#        Ollama : `OLLAMA_MODELS=<dizin> ollama pull qwen2.5:14b` ile doldurulan dizin
#        vLLM   : Hugging Face'ten indirilmiş model klasörlerini içeren dizin
#
# Ortam: WEB_IMAJ_ADI, ISCI_IMAJ_ADI (varsayılan ghcr.io/SAHIP/akredit-{web,isci}), DOCKER (sınama için).
# Çıktı: imajlar.tar, imajlar.txt (ad + içerik özeti), modeller.tar (isteğe bağlı), kurum-ici/ (betikler),
#        kurulum/ (belgeler), SURUM, SHA256SUMS.
set -euo pipefail

surum="${1:?kullanım: demet-olustur.sh <vX.Y.Z> <çıktı-dizini> [--model-dizini <dizin>]}"
cikti="${2:?kullanım: demet-olustur.sh <vX.Y.Z> <çıktı-dizini> [--model-dizini <dizin>]}"
model_dizini=""
[[ "${3:-}" == "--model-dizini" ]] && model_dizini="${4:?--model-dizini için dizin gerekli}"
[[ "$surum" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "demet: sürüm vX.Y.Z olmalı" >&2; exit 2; }
DOCKER="${DOCKER:-docker}"

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kok="$(cd "$dizin/../.." && pwd)"
[[ -e "$cikti" ]] && { echo "demet: $cikti zaten var" >&2; exit 1; }
mkdir -p "$cikti"

imajlar=(
  "${WEB_IMAJ_ADI:-ghcr.io/SAHIP/akredit-web}:$surum"
  "${ISCI_IMAJ_ADI:-ghcr.io/SAHIP/akredit-isci}:$surum"
)
while IFS= read -r i; do imajlar+=("$i"); done < <(grep -E '^[A-Z_]+_IMAJI=' "$dizin/surumler.env" | cut -d= -f2-)

: >"$cikti/imajlar.txt"
for i in "${imajlar[@]}"; do
  [[ "$i" == *:latest ]] && { echo "demet: latest etiketi kullanılamaz: $i" >&2; exit 1; }
  echo "demet: çekiliyor $i"
  "$DOCKER" pull "$i" >/dev/null || { echo "demet: imaj bulunamadı: $i (surumler.env'i güncelleyin)" >&2; exit 1; }
  ozet="$("$DOCKER" image inspect -f '{{index .RepoDigests 0}}' "$i")"
  echo "$i $ozet" >>"$cikti/imajlar.txt"
done
echo "demet: imajlar kaydediliyor"
"$DOCKER" save -o "$cikti/imajlar.tar" "${imajlar[@]}"

if [[ -n "$model_dizini" ]]; then
  [[ -d "$model_dizini" ]] || { echo "demet: model dizini yok: $model_dizini" >&2; exit 1; }
  echo "demet: model ağırlıkları paketleniyor"
  tar -C "$model_dizini" -cf "$cikti/modeller.tar" .
fi

mkdir -p "$cikti/kurum-ici" "$cikti/kurulum"
cp -a "$dizin"/. "$cikti/kurum-ici/"
cp -a "$kok/docs/kurulum"/. "$cikti/kurulum/"
echo "$surum" >"$cikti/SURUM"
(cd "$cikti" && find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum >SHA256SUMS)
echo "demet: hazır $cikti ($(du -sh "$cikti" | cut -f1))"
