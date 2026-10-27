#!/usr/bin/env bash
# docker-entrypoint-initdb.d: yalnız boş veri dizininde, ilk açılışta bir kez çalışır.
# Yedek hizmeti için REPLICATION yetkili, başka yetkisi olmayan bir kullanıcı açar ve
# yalnız kapsayıcı ağından çoğaltma bağlantısına izin verir.
set -euo pipefail

: "${YEDEK_KULLANICI:?YEDEK_KULLANICI tanımlı değil}"
: "${YEDEK_PAROLA:?YEDEK_PAROLA tanımlı değil}"

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v kullanici="$YEDEK_KULLANICI" -v parola="$YEDEK_PAROLA" <<'SQL'
CREATE ROLE :"kullanici" WITH LOGIN REPLICATION PASSWORD :'parola';
SQL

echo "host replication ${YEDEK_KULLANICI} samenet scram-sha-256" >>"$PGDATA/pg_hba.conf"
