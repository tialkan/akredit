# İP-10: Kanıt hattı ve nesne deposu

- **Durum:** bekliyor
- **Faz:** 2
- **Bağımlılık:** İP-02, İP-03, İP-04
- **Sahip olduğu yollar:** `apps/isci/src/kanit-hatti/**`, `packages/depo/**`, `docs/raporlar/IP-10.md`
- **Büyüklük:** büyük

## Amaç

Her belgenin hocadan ek iş istemeden kanıta dönüşmesi: alma, saklama, okuma, sınıflama, önerme.

## Kapsam

1. Kanıt alma yolları: panelden tekli/toplu yükleme (ZIP), kuruma özel e-posta adresi (gönderen doğrulamalı), bağlayıcılar, sistemin ürettiği belgeler.
2. `packages/depo`: S3 uyumlu nesne deposu soyutlaması; içerik adresli anahtar (`kurum/ozet`), nesne kilidi (destekleniyorsa), yerel disk sürücüsü (geliştirme), imzalı süreli indirme bağlantısı.
3. pg-boss işleri: tekilleştirme → metin çıkarma (`@akredit/belge`) → OCR kuyruğu (Tesseract, Türkçe dil verisi; kurum içi) → kişisel veri taraması → parçalama → gömme → sınıflama görevi (`@akredit/yz`) → öneriler.
4. Hata yönetimi: yeniden deneme, ölü mektup kuyruğu, `kanit_isleme` durum kaydı; bozuk dosya hattı durdurmaz.
5. İsteğe bağlı virüs taraması (ClamAV).

## Kabul ölçütleri

- [ ] 100 belgelik karışık paket uçtan uca işlenir (PGlite + yerel depo + sahte YZ).
- [ ] Aynı içerik ikinci kez kanıt olmaz.
- [ ] Kişisel veri içeren belge işaretlenir ve dış sağlayıcıya maskesiz gitmez.
- [ ] İş durumu panelde izlenebilir.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
