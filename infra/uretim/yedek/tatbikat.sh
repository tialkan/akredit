#!/usr/bin/env bash
# Yedekten geri dönüş tatbikatı (felaket kurtarma provası).
#
# Geçici bir PostgreSQL kümesi kurar, Akredit göçlerini uygular, WAL arşivini açar, taban yedek alır,
# yedekten sonra veri yazar, bir "hedef an" belirler, ondan sonra da veri yazar; sonra yedeği yeni bir
# dizine geri yükleyip hedef ana kadar ilerletir ve şunları doğrular:
#   1. Taban yedekten ÖNCE yazılan kayıt geri gelmiş mi?
#   2. Yedekten SONRA ama hedef andan ÖNCE yazılan kayıt (yalnız WAL'da) geri gelmiş mi?
#   3. Hedef andan SONRA yazılan kayıt gelmemiş mi? (zaman noktasına dönüş)
#   4. Göç tablosu ve şema tablo sayısı özgün kümeyle aynı mı?
# Yalnız yerel geçici dizinlerle çalışır; üretime dokunmaz. Sonucu stdout'a ve $TATBIKAT_RAPOR dosyasına yazar.
#
# Gereken: PostgreSQL (17 önerilir; 16 da çalışır) araçları + pgvector eklentisi, Node.js 22.18+, `pnpm install`.
# Kullanım (depo kökünden):  infra/uretim/yedek/tatbikat.sh
#   PG_BIN=/usr/lib/postgresql/17/bin infra/uretim/yedek/tatbikat.sh
# Root olarak çalıştırılırsa PostgreSQL süreçleri `postgres` kullanıcısıyla başlatılır.
set -euo pipefail

betik_dizini="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
depo_koku="$(cd "$betik_dizini/../../.." && pwd)"
if [[ -z "${PG_BIN:-}" ]]; then
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  [[ -n "$PG_BIN" ]] || PG_BIN="$(dirname "$(command -v pg_ctl)")"
fi
export PG_BIN
port="${TATBIKAT_PORT:-55432}"
calisma="$(mktemp -d "${TMPDIR:-/tmp}/akredit-tatbikat.XXXXXX")"
rapor="${TATBIKAT_RAPOR:-$calisma/rapor.txt}"
chmod 755 "$calisma"

if [[ "$(id -u)" == "0" ]]; then
  chown postgres: "$calisma"
  pgk() { runuser -u postgres -- env PG_BIN="$PG_BIN" WAL_ARSIV_DIZINI="$calisma/arsiv/wal" YEDEK_DIZINI="$calisma/arsiv" "$@"; }
else
  pgk() { env WAL_ARSIV_DIZINI="$calisma/arsiv/wal" YEDEK_DIZINI="$calisma/arsiv" "$@"; }
fi

durdur() {
  for d in "$calisma/ozgun" "$calisma/geri"; do
    [[ -f "$d/postmaster.pid" ]] && pgk "$PG_BIN/pg_ctl" -D "$d" -m immediate stop >/dev/null 2>&1 || true
  done
}
trap durdur EXIT

kayit() { echo "$*" | tee -a "$rapor"; }
sorgu() { "$PG_BIN/psql" -X -A -t -q -h 127.0.0.1 -p "$port" -U postgres -d akredit -c "$1"; }

: >"$rapor"
kayit "Akredit yedekten geri dönüş tatbikatı"
kayit "Başlangıç (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
kayit "PostgreSQL: $("$PG_BIN/postgres" --version)"
kayit "Çalışma dizini: $calisma"

# 1. Özgün küme
pgk mkdir -p "$calisma/arsiv/wal" "$calisma/arsiv/taban"
pgk "$PG_BIN/initdb" -D "$calisma/ozgun" -U postgres -A trust --data-checksums >/dev/null
cat <<EOF | pgk tee -a "$calisma/ozgun/postgresql.conf" >/dev/null
listen_addresses = '127.0.0.1'
unix_socket_directories = '$calisma'
port = $port
wal_level = replica
archive_mode = on
archive_command = '$betik_dizini/wal-arsivle.sh %p %f'
archive_timeout = 60
EOF
pgk "$PG_BIN/pg_ctl" -D "$calisma/ozgun" -l "$calisma/ozgun.log" -w start >/dev/null
"$PG_BIN/createdb" -h 127.0.0.1 -p "$port" -U postgres akredit

# 2. Göçler (gerçek packages/vt göçleri)
(cd "$depo_koku" && DATABASE_URL="postgres://postgres@127.0.0.1:$port/akredit" node infra/uretim/goc.ts) | tee -a "$rapor"
goc_sayisi="$(sorgu "select count(*) from pg_catalog.pg_tables where schemaname not in ('pg_catalog','information_schema')")"
kayit "Özgün kümedeki tablo sayısı: $goc_sayisi"

sorgu "create table tatbikat_isaret (ad text primary key, yazildi timestamptz not null default now())"
sorgu "insert into tatbikat_isaret (ad) values ('yedekten-once')"

# 3. Taban yedek (üretimdeki betiğin aynısı)
PGHOST=127.0.0.1 PGPORT="$port" PGUSER=postgres pgk "$betik_dizini/taban-yedek.sh" | tee -a "$rapor"
taban="$(ls -d "$calisma"/arsiv/taban/* | sort | tail -n1)"

# 4. Yedekten sonra, hedef andan önce
sorgu "insert into tatbikat_isaret (ad) values ('yedekten-sonra-hedeften-once')"
sleep 1.2
hedef_an="$(sorgu "select to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') || '+00'")"
sleep 1.2
# 5. Hedef andan sonra (geri gelmemeli)
sorgu "insert into tatbikat_isaret (ad) values ('hedeften-sonra')"
sorgu "select pg_switch_wal()" >/dev/null
# Arşivleyicinin son WAL'u kopyalamasını bekle
for _ in $(seq 1 30); do
  bekleyen="$(sorgu "select count(*) from pg_ls_archive_statusdir() where name like '%.ready'")"
  [[ "$bekleyen" == "0" ]] && break
  sleep 1
done
kayit "Hedef an: $hedef_an"

# 6. Felaket: özgün küme durdurulur (dizin kanıt olarak bırakılır)
pgk "$PG_BIN/pg_ctl" -D "$calisma/ozgun" -m immediate stop >/dev/null

# 7. Geri yükleme
pgk "$betik_dizini/geri-yukle.sh" "$taban" "$calisma/geri" "$hedef_an" | tee -a "$rapor"
pgk "$PG_BIN/pg_ctl" -D "$calisma/geri" -l "$calisma/geri.log" -w -t 120 start >/dev/null
for _ in $(seq 1 60); do
  [[ "$(sorgu "select pg_is_in_recovery()")" == "f" ]] && break
  sleep 1
done

# 8. Doğrulama
sonuc=0
denetle() {
  local ad="$1" beklenen="$2" bulunan
  bulunan="$(sorgu "select count(*) from tatbikat_isaret where ad = '$ad'")"
  if [[ "$bulunan" == "$beklenen" ]]; then kayit "  GEÇTİ  $ad: $bulunan (beklenen $beklenen)"
  else kayit "  KALDI  $ad: $bulunan (beklenen $beklenen)"; sonuc=1; fi
}
kayit "Doğrulama:"
denetle "yedekten-once" 1
denetle "yedekten-sonra-hedeften-once" 1
denetle "hedeften-sonra" 0
geri_tablo="$(sorgu "select count(*) from pg_catalog.pg_tables where schemaname not in ('pg_catalog','information_schema')")"
# Geri dönen kümede tatbikat_isaret tablosu da vardır: +1
if [[ "$geri_tablo" == "$((goc_sayisi + 1))" ]]; then kayit "  GEÇTİ  tablo sayısı: $geri_tablo"
else kayit "  KALDI  tablo sayısı: $geri_tablo (beklenen $((goc_sayisi + 1)))"; sonuc=1; fi

kayit "Bitiş (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$sonuc" == "0" ]]; then kayit "SONUÇ: BAŞARILI"; else kayit "SONUÇ: BAŞARISIZ"; fi
kayit "Rapor: $rapor"
exit "$sonuc"
