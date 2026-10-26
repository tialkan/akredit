# İP-11: Akreditasyon çerçeve kütüphanesi

- **Durum:** inceleme
- **Faz:** 2
- **Bağımlılık:** İP-01, araştırma (`docs/arastirma/`)
- **Sahip olduğu yollar:** `packages/cerceveler/**`, `docs/cerceveler.md`, `docs/raporlar/IP-11.md`
- **Büyüklük:** büyük

## Amaç

YÖKAK ve program akreditasyon kuruluşlarının ölçütlerini, olgunluk düzeylerini ve kanıt gereksinimlerini makinenin okuyabileceği, kaynağı belli ve doğrulanabilir biçimde tutmak.

## Kapsam

1. Zod şeması: çerçeve (kod, ad, sürüm, resmî kaynak adresi, yayım tarihi, kaynak dosya özeti, `dogrulandi`, doğrulayan), ölçüt ağacı, olgunluk düzeyleri (rubrik), kanıt gereksinimleri (beklenen kanıt türü + bu kanıtı otomatik üretebilecek süreç/bağlayıcı), rapor şablonu bölümleri.
2. İçe aktarma aracı: resmî PDF/Word → ölçüt ağacı taslağı (metin belgeden alınır, hafızadan yazılmaz) → uzman onayı. Her ölçüt kaynak sayfasını taşır.
3. İlk çerçeveler: YÖKAK kurumsal değerlendirme ölçütleri ve rubrik (güncel sürüm), YÖKAK KİDR yapısı, MÜDEK (güncel ölçütler ve program çıktıları), önlisans programları için Akredit iç öz değerlendirme çerçevesi (resmî değil diye işaretli), Bologna/AKTS uyumu (iç).
4. Çerçeveler arası eşleme önerileri (ör. program ölçütü ↔ YÖKAK B başlığı); eşleme de öneri/karar düzeninden geçer.
5. `dogrulandi: false` çerçeve arayüzde 'uzman doğrulaması bekliyor' rozetiyle görünür.

## Kabul ölçütleri

- [x] Şema ve içe aktarma testleri.
- [ ] Her ölçütün resmî kaynak sayfası ve belge özeti kayıtlı. (Şemayla zorunlu; veride karşılanmadı, belgeler indirilemedi.)
- [x] Çerçeve sürümü değişince eski raporlar eski sürüme bağlı kalır.
- [ ] `pnpm verify` temiz. (Bu paket temiz; tam çalıştırmada `packages/vt` gunluk testi yük altında zaman aşımına düşüyor, tek başına geçiyor.)

## Notlar

Ölçüt metinlerinin resmî belgeden doğrulanması bir kalite uzmanının işidir (kullanıcı listesi). Araştırma bulguları: `docs/arastirma/`.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Şema, içe aktarma, uzman onayı, sürümlü kütüphane, eşleme önerisi/kararı ve 5 ilk çerçeve eklendi (16 test). yokak.gov.tr ve mudek.org.tr ağ vekilinde engelli: hiçbir resmî metin doğrulanmadı, hepsi `DOĞRULANMADI`; adresler `kaynaklar/resmi/kaynaklar.json`da. Kalan: belgeleri indirip içe aktarma ve uzman onayı; YÖKAK rubriği, KİDR bölümleri, MÜDEK ölçütleri. Karar: eşleme cekirdek öneri türü gelene dek yerel arayüzle. Ayrıntı: `docs/raporlar/IP-11.md`.
