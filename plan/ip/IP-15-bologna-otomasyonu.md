# İP-15: Bologna ders paketi otomasyonu

- **Durum:** inceleme
- **Faz:** 3
- **Bağımlılık:** İP-01, İP-03, İP-05, İP-12, İP-13
- **Sahip olduğu yollar:** `packages/servis/src/bologna/**`, `apps/web/src/app/panel/dersler/**`, `packages/yz/src/gorevler/bologna-taslagi/**`, `docs/raporlar/IP-15.md`
- **Büyüklük:** orta

## Amaç

Bologna ders bilgi paketlerinin hocadan birkaç cümle bilgi alarak, kurallardan geçmiş tam taslak hâlinde hazırlanması.

## Kapsam

1. Mevcut `bologna-doldur` becerisinin platforma taşınması: Bologna okuma → bulgu → taslak (YZ) → K1-K12 denetimi hatasız olana kadar onarım → hocaya tek onay.
2. Programdaki derslerin toplu denetimi ve önce/sonra karşılaştırması.
3. OBS'ye aktarım: onaylı yazma planı + tarayıcı otomasyonu (Claude Code eklentisi ya da kurum içi Playwright ajanı) ya da kopyalanabilir alan alan çıktı. Son kaydetme ve gönderim insanda.
4. Taslak geçmişi ve hangi alanın neden değiştiği.

## Kabul ölçütleri

- [x] Örnek taslak K1-K12'den hatasız geçer; ders adıyla tutarsız (kopya) içerik uyarı alır. (`servis/src/bologna/bologna.test.ts` › "örnek taslak K1-K12'den hatasız geçer…", "ders adıyla tutarsız (kopya) içerik uyarı alır"; `yz/.../bologna-taslagi.test.ts`)
- [x] Yazma planı onaysız çalışmaz; parola alanına yazılamaz. (`bologna.test.ts` › "yazma planı onaysız çalışmaz; toplu onaylanamaz", "parola alanına yazılamaz…", "süre dolunca çalışmaz")
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/15-bologna`). Bologna okuması ve hoca beyanı kanıt olur (bölüm atıflı parçalar; kişi alanları parçalara girmez); program toplu denetimi ve son iki okumanın önce/sonra karşılaştırması; `bologna-taslagi` YZ görevi (sistem alanları modele sorulmaz, her bölüm atıflı, kaynak kitap yalnız atıf yapılan parçada geçiyorsa) K1-K12 hatası kalmayana kadar en çok 3 onarım turu; K1 ad tutarlılığı ve kopya, K11 aynı cümle uyarıları; `bologna_taslagi` önerisi → onay → `yazma_plani` (yüksek risk) önerisi → kişinin doğrudan onayı (90 dk geçerli) → alan alan çıktı / tarayıcı ajanına doldurma; Kaydet ve gönderim insanda; giriş bilgisi alanı plana giremez ve yazıcıya hiç verilmez. Taslak geçmişi alan farkı ve nedeniyle. 7 REST ucu, iki panel sayfası. Göç gerekmedi. Kalan: sunucuda okuyucu/depo/YZ bağlantısı (`bolognaKoprusuAyarla`) üretim kurulumunda yapılmalı; CLI'nin yeni uçlara geçişi İP-24/25.
