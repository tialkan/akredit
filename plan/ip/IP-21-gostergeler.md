# İP-21: Göstergeler ve stratejik plan izleme

- **Durum:** bekliyor
- **Faz:** 4
- **Bağımlılık:** İP-05, İP-12
- **Sahip olduğu yollar:** `packages/gosterge/**`, `apps/web/src/app/panel/gostergeler/**`, `docs/raporlar/IP-21.md`
- **Büyüklük:** orta

## Amaç

Performans göstergelerinin veriden otomatik hesaplanması ve hedeflerle izlenmesi.

## Kapsam

1. Gösterge tanımları (kod, ad, hesap yöntemi, kaynak, dönem, hedef); stratejik plan ve faaliyet raporu göstergeleri.
2. Veri kaynakları: bağlayıcılar, anketler, ölçme sonuçları, elle giriş (kanıtlı).
3. Panolar, eğilim, hedef sapması uyarısı, rapor tabloları.

## Kabul ölçütleri

- [ ] Her gösterge değeri kaynağına izlenebilir.
- [ ] Hedef sapması süreç motorunda eylem önerir.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
