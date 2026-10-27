# İP-31: Erişilebilirlik ve performans denetimi

- **Durum:** inceleme
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

- [x] Ciddi erişilebilirlik ihlali yok. (Otomatik: axe, iki tema, bütün sayfalar; ekran okuyucuyla elle tur henüz yapılmadı.)
- [x] Bütçeler CI'da denetlenir.
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: axe (WCAG 2.2 A/AA, açık/koyu tema, bütün sayfalar), klavye ve ekran okuyucu yapısı e2e testleri eklendi; portal durumları, form kenarlık karşıtlığı, aria-current, 404 ve ayırt edici başlıklar düzeltildi.
- 2026-10-27: Performans bütçeleri (`apps/web/e2e/butceler.ts`) ve ölçüm testi eklendi: yavaş 4G + 4× işlemci, telefon; JS, CSS, toplam aktarım, LCP, CLS, TBT, DOM. Performans projesi öteki testlerden sonra tek çalışanda koşar. CI e2e işine web derleme adımı eklendi (önceden derlemesiz `next start` çalışamazdı).
- 2026-10-27: Bulgu ve düzeltmeler: `@akredit/cekirdek`'e `"sideEffects": false` (tarayıcıya giden ~150 KB crypto yaması kalktı; JS 304 → 165 KB); yazı tipi `font-display: optional`, yalnız latin/latin-ext (CLS 0,23 → 0). Bütçeler ölçüme göre sıkılaştırıldı.
- 2026-10-27: Yavaş 3G testleri (LCP < 6 sn, yatay kaydırma yok) ve k6 yük betiği (`apps/web/yuk/k6-panel.js`) eklendi. Kalan: k6 koşusu (ortamda k6 yok), ekran okuyucuyla elle tur, gerçek kullanıcı ölçümü. Ayrıntı: `docs/denetim/`, `docs/raporlar/IP-31.md`.
