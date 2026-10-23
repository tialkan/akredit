# İP-23: Bağlayıcılar II

- **Durum:** bekliyor
- **Faz:** 4
- **Bağımlılık:** İP-05, İP-10
- **Sahip olduğu yollar:** `packages/baglayicilar/src/{avesis,yokatlas,ubys,ebys,eposta,bulut}/**`, `docs/raporlar/IP-23.md`
- **Büyüklük:** büyük

## Amaç

Hocadan veri istememek için kurum sistemlerinin ve açık veri kaynaklarının genişletilmesi.

## Kapsam

1. AVESİS: herkese açık profil ve etkinlik sayfaları; kimlik doğrulamalı panel için tarayıcı ajanı (kullanıcı girişiyle).
2. YÖK Atlas: program istatistikleri (kontenjan, doluluk, yerleşme) — canlı sayfa yapısı doğrulanarak.
3. UBYS ve diğer OBS sağlayıcıları için dışa aktarım içe aktarıcıları.
4. EBYS dışa aktarımları, IMAP e-posta kutusu, Google Drive / OneDrive klasör eşitleme.
5. Her bağlayıcı: hız sınırı, kullanım koşulu notu, kayıtlı örneklerle test.

## Kabul ölçütleri

- [ ] Her bağlayıcı canlı yapıdan alınmış (anonimleştirilmiş) örneklerle sınanır.
- [ ] Kimlik bilgisi depolanmaz; OAuth belirteçleri şifreli.
- [ ] `pnpm verify` temiz.

## Notlar

Canlı sayfa yapısına erişim gerekir; bulut ortamında ağ kısıtlıysa kullanıcının bilgisayarı üzerinden doğrulanır.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
