#!/usr/bin/env bash
# İşçi uçtan uca sınaması (İP-36): gerçek PostgreSQL + gerçek pg-boss.
#   DATABASE_URL verilmişse (CI'daki postgres hizmeti) onu kullanır; sahip/süper kullanıcı olmalı.
#   Verilmemişse yerelde kurulu PostgreSQL 16/17 (+ pgvector) ile GEÇİCİ bir küme açar, sınamadan sonra
#   durdurur. Sistem ayarlarına dokunmaz; küme geçici dizindedir.
# Kullanım (depo kökünden):  bash infra/gelistirme/isci-uctan-uca.sh
set -euo pipefail

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$KOK"

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN=""
  for s in 17 16; do
    if [[ -x "/usr/lib/postgresql/$s/bin/initdb" ]]; then PGBIN="/usr/lib/postgresql/$s/bin"; break; fi
  done
  if [[ -z "$PGBIN" ]]; then
    echo "DATABASE_URL tanımlı değil ve yerel PostgreSQL bulunamadı." >&2
    exit 1
  fi
  GECICI="$(mktemp -d /tmp/akredit-isci-e2e.XXXXXX)"
  PORT="${AKREDIT_E2E_PORT:-55439}"
  # initdb kök kullanıcıyla çalışmaz; kökse postgres kullanıcısıyla çalıştırılır.
  calistir() { if [[ "$(id -u)" == "0" ]]; then runuser -u postgres -- "$@"; else "$@"; fi; }
  if [[ "$(id -u)" == "0" ]]; then chown postgres "$GECICI"; fi
  calistir "$PGBIN/initdb" -D "$GECICI/veri" -U postgres -A trust -E UTF8 --locale=C.UTF-8 >/dev/null
  calistir "$PGBIN/pg_ctl" -D "$GECICI/veri" -o "-p $PORT -k $GECICI -h 127.0.0.1" -l "$GECICI/gunluk" -w start >/dev/null
  trap 'calistir "$PGBIN/pg_ctl" -D "$GECICI/veri" -m fast -w stop >/dev/null || true' EXIT
  psql -h 127.0.0.1 -p "$PORT" -U postgres -qc "CREATE ROLE akredit LOGIN SUPERUSER PASSWORD 'yerel-e2e'" \
    -c "CREATE DATABASE akredit OWNER akredit"
  export DATABASE_URL="postgres://akredit:yerel-e2e@127.0.0.1:$PORT/akredit"
  echo "Geçici PostgreSQL kümesi: $GECICI (port $PORT)"
fi

node apps/isci/test/uctan-uca.ts
