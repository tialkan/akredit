#!/usr/bin/env bash
# Bir sürümü sunucuda yayına alır. Sunucuda, depo kökünden (ör. /opt/akredit) çalıştırılır.
#
# Kullanım: infra/uretim/dagit.sh <uretim|hazirlik> <sürüm> [--goc-yok]
#   <sürüm> : imaj etiketi (üretimde vX.Y.Z, hazırlıkta ana-<kısa-sha>)
#   --goc-yok: göç adımını atla (yalnız geri-al.sh kullanır)
#
# Sıra (docs/isletim/surum-ve-geri-alma.md):
#   1. sırları aç  2. imajları çek  3. (üretim) göç öncesi taban yedek
#   4. göçleri uygula  5. web+işçiyi yeni sürüme al  6. sağlık denetimi
#   7. başarılıysa sürüm kaydına ekle; başarısızsa önceki sürüme otomatik dön (göçler geri alınmaz)
set -euo pipefail

ortam="${1:?kullanım: dagit.sh <uretim|hazirlik> <sürüm> [--goc-yok]}"
surum="${2:?kullanım: dagit.sh <uretim|hazirlik> <sürüm> [--goc-yok]}"
goc=1
[[ "${3:-}" == "--goc-yok" ]] && goc=0
[[ "$ortam" =~ ^(uretim|hazirlik)$ ]] || { echo "dagit: ortam uretim ya da hazirlik olmalı" >&2; exit 2; }
[[ "$surum" =~ ^[A-Za-z0-9._-]+$ ]] && [[ "$surum" != "latest" ]] || { echo "dagit: geçersiz sürüm '$surum'" >&2; exit 2; }
if [[ "$ortam" == "uretim" ]] && ! [[ "$surum" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "dagit: üretime yalnız vX.Y.Z biçiminde etiketli sürüm alınır" >&2
  exit 2
fi

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kayit_dizini="${AKREDIT_KAYIT_DIZINI:-/var/lib/akredit}/$ortam"
kayit="$kayit_dizini/surumler.log"
mkdir -p "$kayit_dizini"

"$dizin/sirlar-ac.sh" "$ortam"
sir_dosyasi="${AKREDIT_SIR_DIZINI:-/run/akredit}/$ortam.env"

dc() {
  AKREDIT_ORTAM="$ortam" AKREDIT_SURUM="$1" docker compose \
    --project-directory "$dizin" -f "$dizin/docker-compose.yml" \
    --env-file "$dizin/surumler.env" --env-file "$sir_dosyasi" "${@:2}"
}
onceki="$(tail -n1 "$kayit" 2>/dev/null | awk '{print $2}')"
zaman() { date -u +%Y-%m-%dT%H:%M:%SZ; }

echo "dagit: $ortam <- $surum (önceki: ${onceki:-yok})"
dc "$surum" --profile goc pull web isci goc

if ((goc)); then
  if [[ "$ortam" == "uretim" ]]; then
    if [[ -n "$(dc "$surum" ps -q --status running yedek)" ]]; then
      echo "dagit: göç öncesi taban yedek"
      dc "$surum" exec -T yedek /yedek/taban-yedek.sh
    else
      echo "dagit: yedek hizmeti çalışmıyor (ilk kurulum?); göç öncesi yedek atlandı" >&2
    fi
  fi
  echo "dagit: göçler"
  dc "$surum" --profile goc run --rm goc
fi

dc "$surum" up -d --remove-orphans

saglikli() {
  local s
  for _ in $(seq 1 30); do
    s="$(dc "$surum" ps --format '{{.Service}} {{.Health}}' web | awk '{print $2}')"
    [[ "$s" == "healthy" ]] && return 0
    sleep 5
  done
  return 1
}

if saglikli; then
  echo "$(zaman) $surum dagitildi" >>"$kayit"
  echo "dagit: tamam ($surum)"
else
  echo "dagit: $surum sağlık denetimini geçmedi" >&2
  echo "$(zaman) $surum BASARISIZ" >>"$kayit.hatalar"
  if [[ -n "$onceki" ]]; then
    echo "dagit: önceki sürüme ($onceki) dönülüyor; göçler geri alınmaz" >&2
    dc "$onceki" up -d --remove-orphans web isci
  fi
  exit 1
fi
