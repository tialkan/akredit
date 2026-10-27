#!/usr/bin/env bash
# Üretim altyapısının durağan denetimi. Docker sunucusu, ağ ya da sır gerektirmez; CI'da ve yerelde çalışır.
#   1. Bütün betikler bash sözdizimini geçer.
#   2. infra/uretim ve .github altında `latest` imaj yok; surumler.env'deki her imaj sürümlü.
#   3. .github altındaki her `uses:` 40 haneli commit SHA'sıyla sabitli.
#   4. YAML dosyaları ayrıştırılır.
#   5. docker compose yapılandırması sahte değerlerle çözülür (zorunlu değişkenler dahil).
#   6. wal-arsivle.sh: yeni dosya kopyalanır, aynı içerik tekrar başarılı, farklı içerik reddedilir.
# Kullanım (depo kökünden): infra/uretim/denetle.sh
set -euo pipefail

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kok="$(cd "$dizin/../.." && pwd)"
hata=0
gec() { echo "  GEÇTİ  $*"; }
kal() { echo "  KALDI  $*"; hata=1; }

echo "1. Betik sözdizimi"
while IFS= read -r b; do
  if bash -n "$b"; then gec "${b#"$kok"/}"; else kal "${b#"$kok"/}"; fi
  [[ -x "$b" ]] || kal "${b#"$kok"/} çalıştırılabilir değil"
done < <(find "$dizin" -name '*.sh' | sort)

echo "2. Sabit imaj sürümleri"
if grep -rnE '(image:|_IMAJI=)[^#]*:latest\b' "$dizin" "$kok/.github" --include='*.yml' --include='*.yaml' --include='*.env'; then
  kal "latest etiketi bulundu"
else
  gec "latest yok"
fi
while IFS= read -r satir; do
  [[ "$satir" =~ ^[A-Z_]+_IMAJI=[^:@]+:[A-Za-z0-9._-]+(@sha256:[0-9a-f]{64})?$ ]] || kal "sürümsüz imaj: $satir"
done < <(grep -E '^[A-Z_]+_IMAJI=' "$dizin/surumler.env")
gec "surumler.env biçimi"
if grep -qE '_IMAJI=.*@sha256:' "$dizin/surumler.env"; then gec "özetle sabitli imaj var"; else echo "  UYARI  imajlar henüz özetle (@sha256) sabitlenmedi: imaj-sabitle.sh"; fi

echo "3. GitHub eylemleri SHA ile sabitli"
sabitsiz="$(grep -rhnE '^\s*-?\s*uses:\s' "$kok/.github" | grep -vE 'uses:\s*\./' | grep -vE '@[0-9a-f]{40}(\s|$)' || true)"
if [[ -z "$sabitsiz" ]]; then gec "bütün eylemler sabitli"; else kal "sabitsiz eylem:"; echo "$sabitsiz"; fi

echo "4. YAML ayrıştırma"
while IFS= read -r y; do
  if python3 -c 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))' "$y" 2>/dev/null; then gec "${y#"$kok"/}"; else kal "${y#"$kok"/}"; fi
done < <(find "$dizin" "$kok/.github" -name '*.yml' | sort)

echo "5. Compose yapılandırması"
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  sahte="$(mktemp)"
  trap 'rm -f "$sahte"' EXIT
  grep -E '^[A-Z_]+=' "$dizin/ornek.env" | sed -E 's/=$/=sahte-deger/' >"$sahte"
  if AKREDIT_SURUM=v0.0.0 docker compose -f "$dizin/docker-compose.yml" --env-file "$dizin/surumler.env" \
    --env-file "$sahte" --profile goc config -q; then
    gec "docker compose config"
  else
    kal "docker compose config"
  fi
else
  echo "  ATLANDI docker compose yok"
fi

echo "6. wal-arsivle.sh davranışı"
g="$(mktemp -d)"
printf 'a' >"$g/kaynak"
if WAL_ARSIV_DIZINI="$g/arsiv" "$dizin/yedek/wal-arsivle.sh" "$g/kaynak" 000000010000000000000001 \
  && cmp -s "$g/kaynak" "$g/arsiv/000000010000000000000001"; then gec "yeni dosya kopyalandı"; else kal "yeni dosya"; fi
if WAL_ARSIV_DIZINI="$g/arsiv" "$dizin/yedek/wal-arsivle.sh" "$g/kaynak" 000000010000000000000001; then
  gec "aynı içerik tekrar: başarılı"; else kal "aynı içerik tekrar"; fi
printf 'b' >"$g/farkli"
if WAL_ARSIV_DIZINI="$g/arsiv" "$dizin/yedek/wal-arsivle.sh" "$g/farkli" 000000010000000000000001 2>/dev/null; then
  kal "farklı içerik üzerine yazıldı"; else gec "farklı içerik reddedildi"; fi
[[ "$(cat "$g/arsiv/000000010000000000000001")" == "a" ]] && gec "arşivdeki özgün içerik korundu" || kal "arşiv değişti"
[[ -z "$(find "$g/arsiv" -name '*.gecici.*')" ]] && gec "geçici dosya kalmadı" || kal "geçici dosya kaldı"
rm -rf "$g"

if ((hata)); then echo "SONUÇ: BAŞARISIZ"; exit 1; fi
echo "SONUÇ: BAŞARILI"
