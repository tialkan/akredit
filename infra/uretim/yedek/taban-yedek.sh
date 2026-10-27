#!/usr/bin/env bash
# Tam (taban) yedek alır, bütünlüğünü doğrular, eski yedekleri saklama süresine göre budar
# ve isteğe bağlı olarak site dışı nesne deposuna eşler.
#
# Ortam değişkenleri:
#   PGHOST PGPORT PGUSER (PGPASSWORD ya da .pgpass)  : çoğaltma yetkili bağlantı
#   YEDEK_DIZINI        (varsayılan /arsiv)            : taban/ ve wal/ burada
#   YEDEK_SAKLA_GUN     (varsayılan 35)                : bu günden eski taban yedekler silinir
#   YEDEK_EN_AZ         (varsayılan 2)                 : en az bu kadar taban yedek her zaman kalır
#   YEDEK_S3_HEDEF      (isteğe bağlı, örn. yedek/akredit-yedek) : `mc` takma adı/kova; boşsa eşleme yapılmaz
#   PG_BIN              (isteğe bağlı)                 : PostgreSQL araçlarının dizini
set -euo pipefail

bin="${PG_BIN:+$PG_BIN/}"
kok="${YEDEK_DIZINI:-/arsiv}"
sakla_gun="${YEDEK_SAKLA_GUN:-35}"
en_az="${YEDEK_EN_AZ:-2}"
damga="$(date -u +%Y%m%dT%H%M%SZ)"
hedef="$kok/taban/$damga"

mkdir -p "$kok/taban" "$kok/wal"
echo "taban-yedek: $hedef alınıyor"
"${bin}pg_basebackup" -D "$hedef" -Fp -X stream --checkpoint=fast --manifest-checksums=SHA256 \
  --label "akredit-$damga" --no-password
"${bin}pg_verifybackup" "$hedef"
echo "taban-yedek: doğrulandı"

# Budama: en yeni $en_az yedek her zaman kalır; geri kalandan $sakla_gun günden eski olanlar silinir.
mapfile -t yedekler < <(find "$kok/taban" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)
sayi=${#yedekler[@]}
sinir="$(date -u -d "-$sakla_gun days" +%Y%m%dT%H%M%SZ)"
for ((i = 0; i < sayi - en_az; i++)); do
  ad="${yedekler[$i]}"
  if [[ "$ad" < "$sinir" ]]; then
    echo "taban-yedek: süresi dolan $ad siliniyor"
    rm -rf "${kok:?}/taban/$ad"
  fi
done

# En eski kalan taban yedekten önceki WAL dosyaları artık gerekmez.
en_eski="$(find "$kok/taban" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | head -n1)"
if [[ -n "$en_eski" ]]; then
  baslangic="$(sed -n 's/^START WAL LOCATION: .* (file \([0-9A-F]*\))$/\1/p' "$kok/taban/$en_eski/backup_label")"
  if [[ -n "$baslangic" ]]; then
    "${bin}pg_archivecleanup" "$kok/wal" "$baslangic"
  fi
fi

if [[ -n "${YEDEK_S3_HEDEF:-}" ]]; then
  echo "taban-yedek: site dışı kopyaya eşleniyor ($YEDEK_S3_HEDEF)"
  mc mirror --overwrite --remove "$kok/taban" "$YEDEK_S3_HEDEF/taban"
  mc mirror --overwrite "$kok/wal" "$YEDEK_S3_HEDEF/wal"
fi
echo "taban-yedek: tamam ($damga)"
