#!/usr/bin/env bash
# Kurum içi: web ve işçinin bağlandığı ayrıcalıksız uygulama kullanıcısı (G-27-2).
#   * Giriş yapar; süper kullanıcı değil, satır güvenliğini atlayamaz, tablo sahibi değil.
#   * `akredit_oturum` üyesidir (göç 0008 bu role tablo yetkilerini verir).
#   * pg-boss kendi şemasını kurabilsin diye veritabanında CREATE yetkisi vardır.
# Göçler (goc hizmeti / Helm göç işi) POSTGRES_USER ile çalışmayı sürdürür; tabloların sahibi odur.
#
# İki yerden çalışır:
#   1. docker-entrypoint-initdb.d: boş veri dizininde ilk açılışta (compose ve Helm).
#   2. kur.sh / yukselt.sh: `docker compose exec vt` ile her seferinde. Betik yinelenebilir: kullanıcı
#      yoksa açar, varsa parolasını ve yetkilerini eşitler. Böylece eski kurulumlar da yükseltmede düzelir.
set -euo pipefail

: "${POSTGRES_USER:?POSTGRES_USER tanımlı değil}"
: "${POSTGRES_DB:?POSTGRES_DB tanımlı değil}"
: "${UYGULAMA_VT_KULLANICI:?UYGULAMA_VT_KULLANICI tanımlı değil}"
: "${UYGULAMA_VT_PAROLA:?UYGULAMA_VT_PAROLA tanımlı değil}"
if [[ "$UYGULAMA_VT_KULLANICI" == "$POSTGRES_USER" ]]; then
  echo "UYGULAMA_VT_KULLANICI, POSTGRES_USER ile aynı olamaz (süper kullanıcı)" >&2
  exit 1
fi

"${PSQL:-psql}" -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v uyg="$UYGULAMA_VT_KULLANICI" -v uyg_parola="$UYGULAMA_VT_PAROLA" -v vt="$POSTGRES_DB" <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akredit_oturum') THEN
    CREATE ROLE akredit_oturum NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'uyg') AS yeni \gset
\if :yeni
CREATE ROLE :"uyg" WITH LOGIN PASSWORD :'uyg_parola';
\else
ALTER ROLE :"uyg" WITH PASSWORD :'uyg_parola';
\endif
ALTER ROLE :"uyg" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT akredit_oturum TO :"uyg";
GRANT CONNECT, CREATE ON DATABASE :"vt" TO :"uyg";
SQL
