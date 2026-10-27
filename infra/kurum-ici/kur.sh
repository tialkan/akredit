#!/usr/bin/env bash
# İlk kurulum. Önce demet-yukle.sh ile imajlar ve model yüklenmiş, ayar dosyası doldurulmuş olmalıdır.
# Kullanım: sudo infra/kurum-ici/kur.sh <vX.Y.Z>
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

surum="${1:?kullanım: kur.sh <vX.Y.Z>}"
surum_gecerli "$surum"
[[ -z "$(son_surum)" ]] || hata "zaten kurulu ($(son_surum)); yükseltme için yukselt.sh"
imajlar_yerelde "$surum"
for d in AKREDIT_ONAY_GIZLI AKREDIT_ANKET_GIZLI AKREDIT_TAKMA_AD_ANAHTARI POSTGRES_PASSWORD; do
  [[ -n "$(ayar "$d")" ]] || hata "ayar boş: $d"
done
[[ "$(ayar AKREDIT_YZ_ADRES)" =~ ^http://model: ]] || hata "AKREDIT_YZ_ADRES iç ağdaki model sunucusunu göstermeli (http://model:...)"

ayar_yaz AKREDIT_SURUM "$surum"
mkdir -p "$(ayar AKREDIT_YEDEK_DIZINI)"
bilgi "yapılandırma denetimi"
dc "$surum" --profile goc config -q
bilgi "veritabanı, nesne deposu ve model sunucusu açılıyor"
dc "$surum" up -d --no-deps vt $(dc "$surum" config --services | grep -E '^(depo|ollama|vllm)$' || true)
bilgi "göçler"
dc "$surum" --profile goc run --rm goc
bilgi "uygulama açılıyor"
dc "$surum" up -d --pull never
saglik_bekle "$surum" || hata "web sağlıklı duruma gelmedi; günlük: docker compose logs web"
kayit_ekle "$surum" kurulum
bilgi "kuruldu: $surum (https://$(ayar AKREDIT_UYGULAMA_ALAN))"
