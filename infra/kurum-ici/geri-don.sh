#!/usr/bin/env bash
# Önceki sürüme dönüş.
#   sudo infra/kurum-ici/geri-don.sh <vX.Y.Z>                      yalnız kod (şema yerinde kalır)
#   sudo infra/kurum-ici/geri-don.sh <vX.Y.Z> --yedek <dosya.dump> kod + veri (yedek anına döner)
# Veriyle dönüş yedekten sonra yazılan her şeyi kaybettirir: önce kurum yöneticisinin yazılı kararı alınır
# ve docs/kurulum/yukseltme-ve-geri-donus.md "Veriyle dönüş" adımları izlenir.
source "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"

hedef="${1:?kullanım: geri-don.sh <vX.Y.Z> [--yedek <dosya>]}"
surum_gecerli "$hedef"
yedek=""
if [[ "${2:-}" == "--yedek" ]]; then
  yedek="${3:?--yedek için dosya adı gerekli}"
  [[ "$yedek" =~ ^[A-Za-z0-9._-]+\.dump$ ]] || hata "yedek adı yedek dizinindeki dosya adı olmalı"
fi
imajlar_yerelde "$hedef"

if [[ -n "$yedek" ]]; then
  bilgi "web ve işçi durduruluyor"
  dc "$hedef" stop web isci
  bilgi "dönüş öncesi mevcut durumun yedeği alınıyor"
  yedek_al "$hedef" "geri-donus-oncesi-$(date -u +%Y%m%dT%H%M%SZ).dump"
  bilgi "veritabanı $yedek yedeğinden geri yükleniyor"
  dc "$hedef" exec -T vt /kurum-ici/vt-yedek.sh don "/yedekler/$yedek"
fi
ayar_yaz AKREDIT_SURUM "$hedef"
dc "$hedef" up -d --pull never
saglik_bekle "$hedef" || hata "web sağlıklı duruma gelmedi; günlük: docker compose logs web"
kayit_ekle "$hedef" "geri-donus${yedek:+ yedek=$yedek}"
bilgi "dönüldü: $hedef"
