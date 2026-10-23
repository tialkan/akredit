# İP-15: Bologna ders paketi otomasyonu

- **Durum:** bekliyor
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

- [ ] Örnek taslak K1-K12'den hatasız geçer; ders adıyla tutarsız (kopya) içerik uyarı alır.
- [ ] Yazma planı onaysız çalışmaz; parola alanına yazılamaz.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
