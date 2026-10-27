# İP-21: Göstergeler ve stratejik plan izleme

- **Durum:** inceleme
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

- [x] Her gösterge değeri kaynağına izlenebilir.
- [x] Hedef sapması süreç motorunda eylem önerir (arayüz düzeyinde; gerçek bağlantı İP-14).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: `@akredit/gosterge` paketi (tanım/kaynak izi zod şemaları, deterministik hesap, izlenebilirlik denetimi, hedef sapması, eğilim, `eylem` önerisi, rapor tablosu) ve `/panel/gostergeler` panosu (örnek veri) eklendi. Göç gerekmedi: mevcut `gosterge.hesap_tanimi` ve `gosterge_olcumu.kaynak` sütunları yeterli. Kalan: süreç motoruna (İP-14) ve servis/vt'ye gerçek bağlantı, elle giriş formu. Rapor: `docs/raporlar/IP-21.md`.
