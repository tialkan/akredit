# İP-13: Onay kutusu arka ucu ve yetki devri

- **Durum:** bekliyor
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

- [ ] Yüksek riskli öneri hiçbir yoldan (politika, e-posta, toplu) onaylanamaz.
- [ ] E-posta bağlantısı ikinci kez kullanılamaz, süresi dolunca çalışmaz.
- [ ] Ölçüm verisi pilot raporuna akar.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
