# İP-18: Toplantı ve karar asistanı

- **Durum:** inceleme
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

- [x] Tutanakta olmayan karar üretilmez (atıf güvencesi). Kanıt: `tutanak.test.ts` › "kayıtta olmayan karar üretilmez…", `toplanti.test.ts` › "taslak yalnız kayda atıflı kararlarla…".
- [x] Eylemler süreç motorunda izlenir. Kanıt: `toplanti.test.ts` › "onaydan sonra kararlar eyleme dönüşür ve süreç motorunda izlenir…" (gerçek `apps/isci` motoru, `puko_eylem_izleme`).
- [x] `pnpm verify` temiz.

## Notlar

Ses kaydı ve konuşma tanıma yalnız kurum içi modelle ve açık rızayla.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (`ip/18-toplanti`). `packages/servis/src/toplanti/`: gündem taslağı (açık eylem + açık görev), .ics davet, kayıttan (kanıt parçaları) atıf güvenceli tutanak taslağı (model adayları da aynı denetimden geçer; atıf yeri kararın kelimelerinin %70'ini taşımalı), katılımcı yalnız toplantı kaydındaki kişilerden ve kayıtta adı geçmiyorsa EKSİK, taslak `toplanti_tutanagi` önerisi (risk yüksek: toplu ve API anahtarıyla onaylanamaz), onaydan sonra `kesinlestir`: eylem satırları + `eylem_acildi` köprüsüyle süreç motoru + ölçüt bağı önerisi (`kanit_etiketi`), EBYS düz metin çıktısı. Panel: `/panel/toplantilar` (liste, gündem, onaya bağlantı). Yeni göç yok. Kalan: REST uçları, planlama/taslak formu, işçide köprü bağlantısı, ses dökümü (kurum içi model, İP-34).
