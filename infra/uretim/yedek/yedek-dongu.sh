#!/usr/bin/env bash
# `yedek` hizmetinin giriş noktası: her gün YEDEK_SAAT_UTC'de (varsayılan 01) taban yedek alır.
# Başarısız yedek sağlık dosyasını güncellemez; gözlem katmanı yedek yaşını bu dosyadan izler.
set -euo pipefail

saat="${YEDEK_SAAT_UTC:-01}"
durum="${YEDEK_DIZINI:-/arsiv}/son-basarili-yedek"
metrik_dizini="${YEDEK_METRIK_DIZINI:-/metrik}"
betik="$(dirname "${BASH_SOURCE[0]}")/taban-yedek.sh"

basari() {
  date -u +%s >"$durum"
  # node-exporter textfile toplayıcısı için (gözlem/uyarilar.yml: YedekEskidi)
  mkdir -p "$metrik_dizini"
  printf '# TYPE akredit_yedek_son_basari_zaman gauge\nakredit_yedek_son_basari_zaman %s\n' "$(cat "$durum")" >"$metrik_dizini/yedek.prom.gecici"
  mv "$metrik_dizini/yedek.prom.gecici" "$metrik_dizini/yedek.prom"
}

until pg_isready -q; do sleep 5; done
# Kurulumdan hemen sonra hiç yedek yoksa ilk yedeği beklemeden al.
[[ -f "$durum" ]] || { "$betik" && basari; }

while true; do
  simdi=$(date -u +%s)
  hedef=$(date -u -d "today ${saat}:00" +%s)
  ((hedef <= simdi)) && hedef=$(date -u -d "tomorrow ${saat}:00" +%s)
  sleep $((hedef - simdi))
  if "$betik"; then basari; else echo "yedek-dongu: yedek BAŞARISIZ" >&2; fi
done
