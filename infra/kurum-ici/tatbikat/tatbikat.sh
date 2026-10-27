#!/usr/bin/env bash
# Kurum içi kurulum ve yükseltme tatbikatının VERİTABANI ve MODEL kısmı (Docker gerektirmez).
#
# Kurulum belgesindeki (docs/kurulum/) veritabanı adımlarını, kurulumda kullanılan aynı betiklerle
# (vt-yedek.sh, infra/uretim/goc.ts) yerel geçici bir PostgreSQL kümesinde yürütür:
#   1. Kurulum: "eski sürüm" = son göç hariç bütün göçler; kurum verisi yazılır.
#   2. Yükseltme: vt-yedek.sh al -> bütün göçler -> veri korunmuş mu, yeni göç uygulanmış mı?
#   3. Yükseltmeden sonra veri yazılır.
#   4. Veriyle geri dönüş: vt-yedek.sh don -> eski göç sayısı, yükseltme öncesi veri var, sonrası yok.
#   5. Değiştirilmiş yedek reddedilir; var olan yedek dosyasının üzerine yazılmaz.
#   6. Geri dönüşten sonra yeniden yükseltme çalışır.
#   7. Yerel model: sahte OpenAI uyumlu sunucu (127.0.0.1) + yz-ayari.ts; istek yalnız iç adrese gider.
# Docker, imajlar, Caddy, gerçek Ollama/vLLM bu betikte YOKTUR; onlar docs/kurulum/tatbikat.md'deki
# tam tatbikatta sınanır.
#
# Gereken: PostgreSQL 16+ araçları + pgvector, Node.js 22.18+, `pnpm install`.
# Kullanım (depo kökünden): infra/kurum-ici/tatbikat/tatbikat.sh   (TATBIKAT_RAPOR=<dosya> isteğe bağlı)
set -euo pipefail

betik_dizini="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kurum="$(cd "$betik_dizini/.." && pwd)"
kok="$(cd "$kurum/../.." && pwd)"
if [[ -z "${PG_BIN:-}" ]]; then
  PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  [[ -n "$PG_BIN" ]] || PG_BIN="$(dirname "$(command -v pg_ctl)")"
fi
port="${TATBIKAT_PORT:-55442}"
calisma="$(mktemp -d "${TMPDIR:-/tmp}/akredit-kurum-tatbikat.XXXXXX")"
rapor="${TATBIKAT_RAPOR:-$calisma/rapor.txt}"
chmod 755 "$calisma"
mkdir -p "$calisma/yedekler"
if [[ "$(id -u)" == "0" ]]; then
  chown -R postgres: "$calisma"
  pgk() { runuser -u postgres -- "$@"; }
else
  pgk() { "$@"; }
fi
model_pid=""
durdur() {
  [[ -n "$model_pid" ]] && kill "$model_pid" 2>/dev/null || true
  [[ -f "$calisma/vt/postmaster.pid" ]] && pgk "$PG_BIN/pg_ctl" -D "$calisma/vt" -m immediate stop >/dev/null 2>&1 || true
}
trap durdur EXIT

export PGHOST=127.0.0.1 PGPORT="$port" PGUSER=postgres PGDATABASE=akredit
VT_ADRES="postgres://postgres@127.0.0.1:$port/akredit"
kayit() { echo "$*" | tee -a "$rapor"; }
sorgu() { "$PG_BIN/psql" -X -A -t -q -c "$1"; }
sonuc=0
denetle() { # ad beklenen bulunan
  if [[ "$3" == "$2" ]]; then kayit "  GEÇTİ  $1: $3"; else kayit "  KALDI  $1: $3 (beklenen $2)"; sonuc=1; fi
}
yedek() { pgk env PATH="$PG_BIN:$PATH" PGHOST="$PGHOST" PGPORT="$PGPORT" PGUSER="$PGUSER" PGDATABASE="$PGDATABASE" "$kurum/vt-yedek.sh" "$@"; }
goc_sayisi() { sorgu "select count(*) from akredit_goc"; }
tablo_sayisi() { sorgu "select count(*) from pg_catalog.pg_tables where schemaname not in ('pg_catalog','information_schema')"; }
isaret() { sorgu "select count(*) from tatbikat_isaret where ad = '$1'"; }

: >"$rapor"
kayit "Akredit kurum içi kurulum ve yükseltme tatbikatı (veritabanı + model)"
kayit "Başlangıç (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
kayit "Commit: $(git -C "$kok" rev-parse --short HEAD 2>/dev/null || echo bilinmiyor)"
kayit "PostgreSQL: $("$PG_BIN/postgres" --version)"
kayit "Node.js: $(node --version)"

# 0. Temiz küme (kurulumdaki vt kapsayıcısının yerine)
pgk "$PG_BIN/initdb" -D "$calisma/vt" -U postgres -A trust --data-checksums >/dev/null
cat <<EOF | pgk tee -a "$calisma/vt/postgresql.conf" >/dev/null
listen_addresses = '127.0.0.1'
unix_socket_directories = '$calisma'
port = $port
EOF
pgk "$PG_BIN/pg_ctl" -D "$calisma/vt" -l "$calisma/vt.log" -w start >/dev/null
"$PG_BIN/createdb" akredit

toplam="$(cd "$kok" && node -e 'import("./packages/vt/src/index.ts").then(m=>console.log(m.gocleriOku().length))')"
eski=$((toplam - 1))
kayit "Depodaki göç sayısı: $toplam (eski sürüm: ilk $eski)"

kayit "1. Kurulum (eski sürüm)"
(cd "$kok" && DATABASE_URL="$VT_ADRES" GOC_SAYISI="$eski" node "$betik_dizini/goc-sinirli.ts") | tee -a "$rapor"
denetle "uygulanan göç" "$eski" "$(goc_sayisi)"
sorgu "create table tatbikat_isaret (ad text primary key, yazildi timestamptz not null default now())"
sorgu "insert into tatbikat_isaret (ad) values ('kurulumdan-sonra')"
tablo_eski="$(tablo_sayisi)"
kayit "  tablo sayısı: $tablo_eski"

kayit "2. Yükseltme"
yedek al "$calisma/yedekler/yukseltme.dump" | tee -a "$rapor"
denetle "yedek özeti doğrulanıyor" "tamam" "$( (cd "$calisma/yedekler" && sha256sum -c --quiet yukseltme.dump.sha256) && echo tamam || echo bozuk)"
(cd "$kok" && DATABASE_URL="$VT_ADRES" node infra/uretim/goc.ts) | tee -a "$rapor"
denetle "uygulanan göç" "$toplam" "$(goc_sayisi)"
denetle "kurulum verisi korundu" 1 "$(isaret kurulumdan-sonra)"
(cd "$kok" && DATABASE_URL="$VT_ADRES" node infra/uretim/goc.ts) | tee -a "$rapor"
denetle "göçler ikinci kez: değişiklik yok" "$toplam" "$(goc_sayisi)"

kayit "3. Yükseltmeden sonra yazım"
sorgu "insert into tatbikat_isaret (ad) values ('yukseltmeden-sonra')"

kayit "4. Veriyle geri dönüş"
yedek don "$calisma/yedekler/yukseltme.dump" | tee -a "$rapor"
denetle "göç sayısı eski sürümde" "$eski" "$(goc_sayisi)"
denetle "kurulum verisi geri geldi" 1 "$(isaret kurulumdan-sonra)"
denetle "yükseltme sonrası veri yok" 0 "$(isaret yukseltmeden-sonra)"
denetle "tablo sayısı eski sürümle aynı" "$tablo_eski" "$(tablo_sayisi)"

kayit "5. Yedek bütünlüğü"
cp "$calisma/yedekler/yukseltme.dump" "$calisma/yedekler/bozuk.dump"
cp "$calisma/yedekler/yukseltme.dump.sha256" "$calisma/yedekler/bozuk.dump.sha256"
sed -i 's/yukseltme.dump/bozuk.dump/' "$calisma/yedekler/bozuk.dump.sha256"
printf 'x' >>"$calisma/yedekler/bozuk.dump"
chown -R "$(stat -c %U "$calisma")" "$calisma/yedekler"
if yedek don "$calisma/yedekler/bozuk.dump" >/dev/null 2>&1; then denetle "bozuk yedek reddi" "red" "kabul"
else denetle "bozuk yedek reddi" "red" "red"; fi
denetle "ret sonrası veri yerinde" 1 "$(isaret kurulumdan-sonra)"
if yedek al "$calisma/yedekler/yukseltme.dump" >/dev/null 2>&1; then denetle "var olan yedeğin üzerine yazma" "red" "kabul"
else denetle "var olan yedeğin üzerine yazma" "red" "red"; fi

kayit "6. Yeniden yükseltme"
(cd "$kok" && DATABASE_URL="$VT_ADRES" node infra/uretim/goc.ts) | tee -a "$rapor"
denetle "uygulanan göç" "$toplam" "$(goc_sayisi)"

kayit "7. Yerel model (sahte OpenAI uyumlu sunucu, 127.0.0.1)"
model_port=$((port + 1))
node "$betik_dizini/sahte-model.ts" "$model_port" "$calisma/model-istekleri.log" &
model_pid=$!
for _ in $(seq 1 50); do [[ -f "$calisma/model-istekleri.log" ]] && break; sleep 0.1; done
cevap="$(cd "$kok" && AKREDIT_YZ_HAZIR=ollama AKREDIT_YZ_ADRES="http://127.0.0.1:$model_port/v1" \
  AKREDIT_YZ_MODEL=qwen2.5:14b AKREDIT_YZ_YURT_DISI_IZIN=hayir node "$betik_dizini/model-sor.ts")"
denetle "yerel modelden yanıt" "yerel-yanit" "$cevap"
denetle "model sunucusuna gelen istek" 1 "$(grep -c '/v1/chat/completions' "$calisma/model-istekleri.log")"
red="$(cd "$kok" && AKREDIT_YZ_HAZIR=ollama AKREDIT_YZ_ADRES="https://api.openai.com/v1" \
  AKREDIT_YZ_MODEL=x node "$betik_dizini/model-sor.ts" 2>&1 || true)"
denetle "dış adres reddi (istek atılmadan)" "red" "$([[ "$red" == *"kurum ağının dışında"* ]] && echo red || echo "$red")"

kayit "Bitiş (UTC): $(date -u +%Y-%m-%dT%H:%M:%SZ)"
if [[ "$sonuc" == "0" ]]; then kayit "SONUÇ: BAŞARILI"; else kayit "SONUÇ: BAŞARISIZ"; fi
exit "$sonuc"
