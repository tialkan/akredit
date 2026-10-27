# İP-13: Onay kutusu arka ucu ve yetki devri

- **Durum:** inceleme
- **Faz:** 2
- **Bağımlılık:** İP-12, İP-14
- **Sahip olduğu yollar:** `packages/servis/src/onay/**`, `apps/isci/src/politika/**`, `apps/web/src/app/panel/onaylar/**`, `docs/raporlar/IP-13.md`
- **Büyüklük:** orta

## Amaç

Hocanın tek işi olan kararı en az zamanla, en yüksek güvenle verdirmek.

## Kapsam

1. Öneri kuyruğu, risk gruplaması, toplu karar (her öneri ayrı karar kaydı, aynı karar veren).
2. Yetki politikası imzalama, iptal, süre; politika motoru (yeni öneri geldiğinde uygular, karar `politika` dayanağıyla yazılır, kim imzaladıysa onun adıyla).
3. İmzalı e-posta bağlantısıyla karar: tek kullanımlık, süreli, kişiye bağlı; yüksek risk hariç. Günlük/haftalık özet e-postası.
4. İnsan dakikası ölçümü: karar ekranında geçen süre, kişi ve süreç bazında.

## Kabul ölçütleri

- [x] Yüksek riskli öneri hiçbir yoldan (politika, e-posta, toplu) onaylanamaz.
- [x] E-posta bağlantısı ikinci kez kullanılamaz, süresi dolunca çalışmaz.
- [x] Ölçüm verisi pilot raporuna akar.
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Tamamlandı, incelemeye alındı. `0006_onay.sql`: `oneri_konumu()` ile birim/program kapsamı `karar_denetle` tetikleyicisinde (bulgu 2), iptal kaydı dayanak olamaz; e-posta bağlantı ve tek kullanım tabloları. `packages/servis/src/onay/`: politika motoru (karar imzalayanın adıyla, `politika` dayanağıyla), imzalı tek kullanımlık/süreli/kişiye bağlı e-posta bağlantısı (yüksek risk hariç), günlük/haftalık özet, kuyruk ve risk grupları, insan dakikası ölçümü (`/api/v1` ölçüm ucu, İP-30 pilot raporu bunu okur). `apps/isci/src/politika`: politika ve özet işçisi, İP-21 gösterge önerilerinin kuyruğa yazımı. Web: karar ekranı süre ölçümü, sayaç yenileme, `/onay/eposta` karar sayfası. Çekirdek `politikaUygulanirMi` artık `konum.iptalEdilenler` alır (bulgu 3). Kalan: gerçek e-posta gönderici bağlantısı İP-14'te; bulgu 1 (kişi FK kiracı sınırı) bu İP'nin dışında.
