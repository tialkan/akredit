#!/usr/bin/env bash
# Sürüm yükseltme. Yeni sürümün demeti önceden demet-yukle.sh ile yüklenmiş olmalıdır.
# Kullanım: sudo infra/kurum-ici/yukselt.sh <vX.Y.Z>
# Sıra: imaj denetimi -> yükseltme öncesi yedek -> göçler -> web+işçi -> sağlık denetimi.
# Göç ya da sağlık denetimi başarısızsa kod önceki sürüme döner; veri geri dönüşü geri-don.sh ile
# (yedek dosyası belirtilerek) elle yapılır, çünkü yükseltmeden sonra yazılan veriyi siler.
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

yeni="${1:?kullanım: yukselt.sh <vX.Y.Z>}"
surum_gecerli "$yeni"
eski="$(son_surum)"
[[ -n "$eski" ]] || hata "kurulu sürüm kaydı yok; ilk kurulum için kur.sh"
[[ "$eski" != "$yeni" ]] || hata "$yeni zaten kurulu"
imajlar_yerelde "$yeni"

yedek="yukseltme-$eski-$yeni-$(date -u +%Y%m%dT%H%M%SZ).dump"
bilgi "yükseltme öncesi yedek: $yedek"
yedek_al "$eski" "$yedek"

geri_al() {
  echo "akredit: $1; kod $eski sürümüne dönüyor" >&2
  ayar_yaz AKREDIT_SURUM "$eski"
  dc "$eski" up -d --pull never web isci || true
  echo "akredit: veri de geri dönmeli ise: sudo infra/kurum-ici/geri-don.sh $eski --yedek $yedek" >&2
  exit 1
}

ayar_yaz AKREDIT_SURUM "$yeni"
bilgi "göçler ($eski -> $yeni)"
dc "$yeni" --profile goc run --rm goc || geri_al "göç başarısız"
dc "$yeni" up -d --pull never
saglik_bekle "$yeni" || geri_al "web sağlıklı duruma gelmedi"
kayit_ekle "$yeni" "yukseltme yedek=$yedek"
bilgi "yükseltildi: $eski -> $yeni"
