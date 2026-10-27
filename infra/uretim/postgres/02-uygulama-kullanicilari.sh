#!/usr/bin/env bash
# docker-entrypoint-initdb.d: yalnız boş veri dizininde, ilk açılışta bir kez çalışır.
# İP-27 (inceleme dalga 3 #1): web/işçi ve gözlem artık süper kullanıcıyla bağlanmaz.
#   * Uygulama kullanıcısı: giriş yapar, süper kullanıcı değil, satır güvenliğini atlayamaz, tablo
#     sahibi değil; `akredit_oturum` üyesidir (0008_oturum_rolu göçü). pg-boss kendi şemasını
#     kurabilsin diye veritabanında CREATE yetkisi vardır (public tablolarına sahiplik vermez).
#   * İzleme kullanıcısı: yalnız pg_monitor.
# Göçler (goc hizmeti) POSTGRES_USER ile çalışmayı sürdürür; tabloların sahibi odur.
# Var olan kurulumlarda bu betik çalışmaz: aynı SQL'i bir kez elle çalıştırın (docs/guvenlik/README.md).
set -euo pipefail

: "${UYGULAMA_VT_KULLANICI:?UYGULAMA_VT_KULLANICI tanımlı değil}"
: "${UYGULAMA_VT_PAROLA:?UYGULAMA_VT_PAROLA tanımlı değil}"
: "${IZLEME_VT_KULLANICI:?IZLEME_VT_KULLANICI tanımlı değil}"
: "${IZLEME_VT_PAROLA:?IZLEME_VT_PAROLA tanımlı değil}"

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v uyg="$UYGULAMA_VT_KULLANICI" -v uyg_parola="$UYGULAMA_VT_PAROLA" \
  -v izl="$IZLEME_VT_KULLANICI" -v izl_parola="$IZLEME_VT_PAROLA" \
  -v vt="$POSTGRES_DB" <<'SQL'
-- Göç 0008 de aynı rolü IF NOT EXISTS ile tanımlar; burada üyelik verilebilsin diye önce açılır.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akredit_oturum') THEN
    CREATE ROLE akredit_oturum NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;
CREATE ROLE :"uyg" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  IN ROLE akredit_oturum PASSWORD :'uyg_parola';
GRANT CONNECT, CREATE ON DATABASE :"vt" TO :"uyg";
CREATE ROLE :"izl" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  IN ROLE pg_monitor PASSWORD :'izl_parola';
GRANT CONNECT ON DATABASE :"vt" TO :"izl";
SQL
