#!/usr/bin/env bash
# Yükseltme öncesi mantıksal yedek ve ondan geri dönüş.
#   vt-yedek.sh al  <dosya>   pg_dump (özel biçim) + <dosya>.sha256
#   vt-yedek.sh don <dosya>   özeti doğrular, veritabanını yeniden oluşturur, yedeği yükler
# Kurulumda vt kapsayıcısının içinde çalışır (yukselt.sh / geri-don.sh). Tatbikatta yerel PostgreSQL'e
# PGHOST/PGPORT/PGUSER ile aynı betik çalıştırılır. Veritabanı adı: PGDATABASE ya da POSTGRES_DB.
#
# Not: Değiştirilemez günlük ve kanıt kayıtları (ilke 4) yedekte olduğu gibi durur. "don", yükseltmeden
# SONRA yazılan kayıtları kaybettirir; bu yüzden yalnız yükseltme başarısızsa ve kullanıcılar
# sisteme yeniden girmeden önce kullanılır (docs/kurulum/yukseltme-ve-geri-donus.md).
set -euo pipefail

islem="${1:?kullanım: vt-yedek.sh <al|don> <dosya>}"
dosya="${2:?kullanım: vt-yedek.sh <al|don> <dosya>}"
export PGUSER="${PGUSER:-${POSTGRES_USER:-postgres}}"
vt="${PGDATABASE:-${POSTGRES_DB:-akredit}}"

case "$islem" in
  al)
    [[ -e "$dosya" ]] && { echo "vt-yedek: $dosya zaten var; üzerine yazılmaz" >&2; exit 1; }
    gecici="$dosya.gecici.$$"
    pg_dump -d "$vt" -Fc -Z 6 -f "$gecici"
    pg_restore -l "$gecici" >/dev/null # okunabilirlik denetimi
    mv "$gecici" "$dosya"
    (cd "$(dirname "$dosya")" && sha256sum "$(basename "$dosya")" >"$(basename "$dosya").sha256")
    echo "vt-yedek: alındı $dosya"
    ;;
  don)
    [[ -r "$dosya" && -r "$dosya.sha256" ]] || { echo "vt-yedek: $dosya ya da özeti yok" >&2; exit 1; }
    (cd "$(dirname "$dosya")" && sha256sum -c --quiet "$(basename "$dosya").sha256") \
      || { echo "vt-yedek: özet tutmuyor, yedek bozuk" >&2; exit 1; }
    psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists \"$vt\" with (force)"
    psql -X -q -v ON_ERROR_STOP=1 -d postgres -c "create database \"$vt\""
    pg_restore --exit-on-error --no-owner -d "$vt" "$dosya"
    echo "vt-yedek: geri yüklendi $dosya"
    ;;
  *) echo "vt-yedek: işlem al ya da don olmalı" >&2; exit 2 ;;
esac
