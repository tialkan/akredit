# İP-19: Program öz değerlendirme ve ÖDR

- **Durum:** bekliyor
- **Faz:** 4
- **Bağımlılık:** İP-11, İP-12, İP-16, İP-17
- **Sahip olduğu yollar:** `packages/servis/src/odr/**`, `apps/web/src/app/panel/raporlar/**`, `docs/raporlar/IP-19.md`
- **Büyüklük:** büyük

## Amaç

Program akreditasyonu öz değerlendirme raporunun (ÖDR) kanıtlardan, ölçme sonuçlarından ve süreç kayıtlarından üretilmesi.

## Kapsam

1. Çerçeve güdümlü rapor kurucu (MÜDEK ve diğer kuruluşların ÖDR yapıları; önlisans için iç çerçeve).
2. Kapsama haritası (ölçüt × onaylı kanıt), eksik analizi, eksikler için görev/süreç/eylem başlatma.
3. Bölüm taslakları (yalnız onaylı kanıtlarla, atıflı), atıf ve sayı denetimi, sürüm geçmişi.
4. Kuruluşun istediği biçimde DOCX/PDF dışa aktarım ve ziyaret hazırlık paketi (ders dosyaları dizini, kanıt listesi).

## Kabul ölçütleri

- [ ] Kurgu programla uçtan uca ÖDR; her olgusal cümle atıflı ya da EKSİK.
- [ ] Dışa aktarılan belge kuruluş şablonunun bölüm yapısına uyar.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
