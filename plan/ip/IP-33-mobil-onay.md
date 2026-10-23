# İP-33: Mobil onay ve bildirim

- **Durum:** bekliyor
- **Faz:** 6
- **Bağımlılık:** İP-13
- **Sahip olduğu yollar:** `apps/web/src/app/panel/onaylar/**` (PWA), `docs/raporlar/IP-33.md`
- **Büyüklük:** küçük

## Amaç

Kararın telefondan, saniyeler içinde verilmesi.

## Kapsam

1. PWA, çevrim dışı önbellek (yalnız onay listesi), web anlık bildirimleri.
2. Tek elle kullanılabilir onay akışı.

## Kabul ölçütleri

- [ ] Telefon testleri; bildirim izni reddedilince e-posta yolu.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
