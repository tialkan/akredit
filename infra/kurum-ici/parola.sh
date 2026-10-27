#!/usr/bin/env bash
# Ayar dosyasındaki boş gizli değerleri üretir; dolu olanlara dokunmaz. kur.sh `source` eder.
# Doğrudan: parola.sh <ayar-dosyası>
set -euo pipefail

# Kurulumun kendi ürettiği gizli değerler. Kurumun dış sistemlerinden gelenler (S3, SMTP) üretilmez.
URETILEN_GIZLILER=(POSTGRES_PASSWORD UYGULAMA_VT_PAROLA AKREDIT_ONAY_GIZLI AKREDIT_ANKET_GIZLI AKREDIT_TAKMA_AD_ANAHTARI)

# parola_uret <ayar-dosyası> <ad...>: boş ya da eksik her ad için 32 baytlık onaltılık değer yazar.
parola_uret() {
  local dosya="$1" ad deger
  shift
  for ad in "$@"; do
    deger="$(grep -E "^$ad=" "$dosya" | tail -n1 | cut -d= -f2- || true)"
    [[ -n "$deger" ]] && continue
    deger="$(openssl rand -hex 32)"
    if grep -qE "^$ad=" "$dosya"; then
      sed -i -E "s|^$ad=.*|$ad=$deger|" "$dosya"
    else
      echo "$ad=$deger" >>"$dosya"
    fi
  done
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  parola_uret "${1:?kullanım: parola.sh <ayar-dosyası>}" "${URETILEN_GIZLILER[@]}"
fi
