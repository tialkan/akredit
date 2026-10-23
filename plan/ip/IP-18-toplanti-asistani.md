# İP-18: Toplantı ve karar asistanı

- **Durum:** bekliyor
- **Faz:** 3
- **Bağımlılık:** İP-03, İP-14
- **Sahip olduğu yollar:** `packages/servis/src/toplanti/**`, `apps/web/src/app/panel/toplantilar/**`, `docs/raporlar/IP-18.md`
- **Büyüklük:** orta

## Amaç

Kalite komisyonu, danışma kurulu ve birim toplantılarının hazırlığını ve tutanağını sistemin yapması; kararların PUKÖ eylemine dönüşmesi.

## Kapsam

1. Toplantı planlama (katılımcılar, takvim daveti), açık eylemlerden ve eksiklerden gündem taslağı.
2. Tutanak taslağı: hocanın notlarından ya da (kurum izniyle, kurum içi) ses kaydı dökümünden; kararlar atıflı.
3. Karar → eylem (sorumlu, tarih, ölçüt bağı) önerileri; EBYS'ye uygun tutanak çıktısı.
4. Toplantı kanıtı otomatik olarak ilgili ölçütlere bağlanma önerisi alır.

## Kabul ölçütleri

- [ ] Tutanakta olmayan karar üretilmez (atıf güvencesi).
- [ ] Eylemler süreç motorunda izlenir.
- [ ] `pnpm verify` temiz.

## Notlar

Ses kaydı ve konuşma tanıma yalnız kurum içi modelle ve açık rızayla.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
