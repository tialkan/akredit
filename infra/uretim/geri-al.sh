#!/usr/bin/env bash
# Web ve işçiyi sürüm kaydındaki bir önceki (ya da verilen) sürüme döndürür. Göç çalıştırmaz.
# Veritabanı şeması geri alınmaz: göçler geriye uyumlu yazıldığı için eski sürüm yeni şemada çalışır
# (expand/contract kuralı). Şema da geri alınacaksa: docs/isletim/surum-ve-geri-alma.md "Veriyle geri dönüş".
#
# Kullanım: infra/uretim/geri-al.sh <uretim|hazirlik> [sürüm]
set -euo pipefail

ortam="${1:?kullanım: geri-al.sh <uretim|hazirlik> [sürüm]}"
dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kayit="${AKREDIT_KAYIT_DIZINI:-/var/lib/akredit}/$ortam/surumler.log"

if [[ -n "${2:-}" ]]; then
  hedef="$2"
else
  [[ -f "$kayit" ]] || { echo "geri-al: sürüm kaydı yok ($kayit)" >&2; exit 1; }
  hedef="$(awk '{print $2}' "$kayit" | tail -n2 | head -n1)"
  simdiki="$(awk '{print $2}' "$kayit" | tail -n1)"
  [[ -n "$hedef" && "$hedef" != "$simdiki" ]] || { echo "geri-al: dönülecek önceki sürüm yok" >&2; exit 1; }
fi

echo "geri-al: $ortam -> $hedef"
"$dizin/dagit.sh" "$ortam" "$hedef" --goc-yok
