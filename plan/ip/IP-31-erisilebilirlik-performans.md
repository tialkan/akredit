# İP-31: Erişilebilirlik ve performans denetimi

- **Durum:** bekliyor
- **Faz:** 5
- **Bağımlılık:** İP-07, İP-12
- **Sahip olduğu yollar:** ilgili `apps/web` dosyaları, `docs/denetim/**`, `docs/raporlar/IP-31.md`
- **Büyüklük:** küçük

## Amaç

Herkesin kullanabildiği ve yavaş ağda da hızlı açılan bir ürün.

## Kapsam

1. WCAG 2.2 AA denetimi (otomatik + ekran okuyucuyla elle).
2. Performans bütçeleri, Core Web Vitals, yük testi (k6).
3. Düşük bant genişliği ve telefon testleri.

## Kabul ölçütleri

- [ ] Ciddi erişilebilirlik ihlali yok.
- [ ] Bütçeler CI'da denetlenir.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
