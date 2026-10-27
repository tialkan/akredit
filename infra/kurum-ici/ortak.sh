#!/usr/bin/env bash
# kur.sh, yukselt.sh, geri-don.sh için ortak işlevler. Doğrudan çalıştırılmaz, `source` edilir.
set -euo pipefail

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ortam_dosyasi="${AKREDIT_ENV:-/etc/akredit/akredit.env}"
kayit_dizini="${AKREDIT_KAYIT_DIZINI:-/var/lib/akredit}"
kayit="$kayit_dizini/surumler.log"

hata() { echo "akredit: $*" >&2; exit 1; }
bilgi() { echo "akredit: $*"; }
zaman() { date -u +%Y-%m-%dT%H:%M:%SZ; }

[[ -r "$ortam_dosyasi" ]] || hata "ayar dosyası okunamadı: $ortam_dosyasi (docs/kurulum/kurulum.md 3. adım)"
command -v docker >/dev/null || hata "Docker kurulu değil"
docker compose version >/dev/null 2>&1 || hata "Docker Compose eklentisi kurulu değil"

# Ayar dosyasından tek değer okur (dosya `source` edilmez; içindeki değerler kabukta çalışmaz).
ayar() { grep -E "^$1=" "$ortam_dosyasi" | tail -n1 | cut -d= -f2-; }

profiller=()
for p in $(ayar AKREDIT_PROFILLER); do profiller+=(--profile "$p"); done

# dc <sürüm> <compose argümanları...>
dc() {
  AKREDIT_SURUM="$1" docker compose --project-directory "$dizin" -f "$dizin/docker-compose.yml" \
    --env-file "$dizin/surumler.env" --env-file "$ortam_dosyasi" "${profiller[@]}" "${@:2}"
}

surum_gecerli() {
  [[ "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || hata "sürüm vX.Y.Z biçiminde olmalı: '$1'"
}

# İnternete kapalı kurulumda imajlar çekilmez; demetten yüklenmiş olmalıdır.
imajlar_yerelde() {
  local s="$1" i
  for i in "$(ayar WEB_IMAJ_ADI):$s" "$(ayar ISCI_IMAJ_ADI):$s"; do
    docker image inspect "$i" >/dev/null 2>&1 || hata "imaj yüklü değil: $i (önce demet-yukle.sh)"
  done
}

ayar_yaz() {
  local ad="$1" deger="$2"
  if grep -qE "^$ad=" "$ortam_dosyasi"; then
    sed -i -E "s|^$ad=.*|$ad=$deger|" "$ortam_dosyasi"
  else
    echo "$ad=$deger" >>"$ortam_dosyasi"
  fi
}

saglik_bekle() {
  local s="$1" id durum
  for _ in $(seq 1 30); do
    id="$(dc "$s" ps -q web)"
    durum="$( [[ -n "$id" ]] && docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo yok)"
    [[ "$durum" == "healthy" ]] && return 0
    sleep 5
  done
  return 1
}

# Veritabanı yedeği: betik vt kapsayıcısının içinde çalışır (pg_dump sürümü sunucuyla aynıdır).
yedek_al() {
  local s="$1" ad="$2"
  dc "$s" exec -T vt /kurum-ici/vt-yedek.sh al "/yedekler/$ad"
}

kayit_ekle() { mkdir -p "$kayit_dizini"; echo "$(zaman) $1 $2" >>"$kayit"; }
son_surum() { tail -n1 "$kayit" 2>/dev/null | awk '{print $2}'; }
