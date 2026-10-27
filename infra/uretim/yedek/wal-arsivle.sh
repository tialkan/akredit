#!/usr/bin/env bash
# PostgreSQL archive_command: bir WAL dosyasını arşiv dizinine güvenle kopyalar.
# postgresql.conf:  archive_command = '/yedek/wal-arsivle.sh %p %f'
# Kurallar: var olan arşiv dosyasının üzerine yazılmaz (aynı içerikse başarı, farklıysa hata);
# kopya önce geçici ada yazılır, diske işlenir, sonra atomik olarak yeniden adlandırılır.
set -euo pipefail

kaynak="${1:?kullanım: wal-arsivle.sh <%p> <%f>}"
ad="${2:?kullanım: wal-arsivle.sh <%p> <%f>}"
hedef_dizin="${WAL_ARSIV_DIZINI:-/arsiv/wal}"
hedef="$hedef_dizin/$ad"

mkdir -p "$hedef_dizin"
if [[ -e "$hedef" ]]; then
  if cmp -s "$kaynak" "$hedef"; then
    exit 0
  fi
  echo "wal-arsivle: $ad arşivde farklı içerikle var; üzerine yazılmadı" >&2
  exit 1
fi

gecici="$hedef.gecici.$$"
cp "$kaynak" "$gecici"
sync "$gecici"
mv "$gecici" "$hedef"
sync "$hedef_dizin"
