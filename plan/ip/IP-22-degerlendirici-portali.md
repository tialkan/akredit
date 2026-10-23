# İP-22: Değerlendirici portalı ve sanal kanıt odası

- **Durum:** bekliyor
- **Faz:** 4
- **Bağımlılık:** İP-09, İP-10, İP-12
- **Sahip olduğu yollar:** `apps/web/src/app/degerlendirici/**`, `docs/raporlar/IP-22.md`
- **Büyüklük:** orta

## Amaç

Dış değerlendiricilerin kanıtlara düzenli, süreli ve kayıtlı erişimi.

## Kapsam

1. Süreli, salt okunur değerlendirici hesapları; ziyaret programı.
2. Ölçüt ağacına göre düzenlenmiş kanıt odası, arama, belge görüntüleyici.
3. Kanıt deposu üzerinde atıflı soru-cevap (her yanıt kayıtlı).
4. Erişim günlüğü kuruma açık.

## Kabul ölçütleri

- [ ] Değerlendirici hiçbir şeyi değiştiremez, süre bitince erişemez.
- [ ] Soru-cevap yanıtları atıf güvencesinden geçer.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
