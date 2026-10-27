#!/usr/bin/env bash
# Bir taban yedekten yeni bir veri dizini hazırlar; WAL arşiviyle istenen ana kadar ilerletir.
# Sunucuyu başlatmaz: hazırlanan dizinle PostgreSQL'i başlatmak operatörün işidir
# (bkz. docs/isletim/yedekleme-ve-geri-donus.md).
#
# Kullanım: geri-yukle.sh <taban-yedek-dizini> <yeni-veri-dizini> [hedef-zaman]
#   hedef-zaman verilmezse arşivdeki son WAL'a kadar ilerlenir.
#   Örnek zaman: "2026-10-27 14:05:00+03"
# Ortam: WAL_ARSIV_DIZINI (varsayılan /arsiv/wal) — geri dönen sunucunun okuyacağı yol.
set -euo pipefail

taban="${1:?kullanım: geri-yukle.sh <taban-yedek-dizini> <yeni-veri-dizini> [hedef-zaman]}"
veri="${2:?kullanım: geri-yukle.sh <taban-yedek-dizini> <yeni-veri-dizini> [hedef-zaman]}"
zaman="${3:-}"
arsiv="${WAL_ARSIV_DIZINI:-/arsiv/wal}"

if [[ -e "$veri" ]] && [[ -n "$(ls -A "$veri" 2>/dev/null)" ]]; then
  echo "geri-yukle: $veri boş değil; var olan veri dizininin üzerine yazılmaz" >&2
  exit 1
fi
[[ -f "$taban/backup_manifest" ]] || { echo "geri-yukle: $taban geçerli bir taban yedek değil" >&2; exit 1; }

mkdir -p "$veri"
chmod 700 "$veri"
cp -a "$taban/." "$veri/"
rm -f "$veri/backup_manifest"
# Yedekte kalmış bağlantı ve kilit dosyaları yeni sunucuya taşınmaz.
rm -f "$veri/postmaster.pid" "$veri/postmaster.opts"

{
  echo ""
  echo "# geri-yukle.sh tarafından eklendi ($(date -u +%Y-%m-%dT%H:%M:%SZ))"
  echo "restore_command = 'cp $arsiv/%f %p'"
  # Geri dönen kopya arşive yazmaz; asıl sunucunun arşivini kirletmesin.
  echo "archive_mode = off"
  if [[ -n "$zaman" ]]; then
    echo "recovery_target_time = '$zaman'"
    echo "recovery_target_inclusive = false"
  fi
  echo "recovery_target_action = 'promote'"
} >>"$veri/postgresql.auto.conf"
touch "$veri/recovery.signal"
echo "geri-yukle: $veri hazır${zaman:+ (hedef: $zaman)}; sunucuyu bu dizinle başlatın"
