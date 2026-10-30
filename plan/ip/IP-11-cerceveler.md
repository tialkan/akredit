# İP-11: Akreditasyon çerçeve kütüphanesi

- **Durum:** tamam
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
- [x] Her ölçütün resmî kaynak sayfası ve belge özeti kayıtlı. (YÖKAK 3.3 ve KİDR 3.2.1 için karşılandı, testle; MÜDEK belgesi yok, 2020 taslakları eski sürüm olarak `DOĞRULANMADI`.)
- [x] Çerçeve sürümü değişince eski raporlar eski sürüme bağlı kalır.
- [x] `pnpm verify` temiz.

## Notlar

Ölçüt metinlerinin resmî belgeden doğrulanması bir kalite uzmanının işidir (kullanıcı listesi). Araştırma bulguları: `docs/arastirma/`.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Şema, içe aktarma, uzman onayı, sürümlü kütüphane, eşleme önerisi/kararı ve 5 ilk çerçeve eklendi (16 test). yokak.gov.tr ve mudek.org.tr ağ vekilinde engelli: hiçbir resmî metin doğrulanmadı, hepsi `DOĞRULANMADI`; adresler `kaynaklar/resmi/kaynaklar.json`da. Kalan: belgeleri indirip içe aktarma ve uzman onayı; YÖKAK rubriği, KİDR bölümleri, MÜDEK ölçütleri. Karar: eşleme cekirdek öneri türü gelene dek yerel arayüzle. Ayrıntı: `docs/raporlar/IP-11.md`.
- 2026-10-27 (resmî metin): Kullanıcının tarayıcıyla indirdiği 7 YÖKAK belgesi `kaynaklar/resmi/yokak/` altına adlandırılarak eklendi (toplam 15 166 880 bayt), `kaynaklar.json` güncellendi. `yokak-kurumsal@3.3` (Kılavuz 3.3 Ek-1 + Ölçütler 3.1: 4 başlık, 14 ölçüt, 46 alt ölçüt, 44 alt ölçütte düzey metni ve örnek kanıtlar) ve `yokak-kidr@3.2.1` (Ek-1 şablonu, 10 bölüm) resmî metinle eklendi; 2020 çerçeveleri korundu. D2-2 kapatıldı: `baslikDurumu`, `kaynakDosya`/`ekKaynaklar`, rapor bölümü başlık kuralı. Belgede birebir geçiş testi eklendi. Kalan: A.4.1/B.2.2 düzey metinleri ve genel düzey adları (Şekil 1 görsel) `DOĞRULANMADI`; MÜDEK; uzman onayı. Karar: Kılavuz 3.3, 3.1.1'den yeni olduğu için esas alındı; ölçüt metinleri Ölçütler 3.1'den (temiz metin katmanı).
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme, ölçütler kodla eşlendi. Şema ve içe aktarma: `packages/cerceveler/test/cerceveler.test.ts` ("şema", "içe aktarma"). Kaynak sayfa ve özet: `test/resmi-metin.test.ts` (her resmî başlık belgede birebir) ve "başlık da kaynak/özet kuralına bağlı (D2-2)". Sürüm: "rapor eski sürüme bağlı kalır", "aynı sürüm farklı içerikle eklenemez". İnceleme bulgusu D2-2 kapalı. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kabul ölçütü dışında kalan insan işi: kalite uzmanı doğrulaması (`dogrulandi`), MÜDEK resmî belgesi, A.4.1/B.2.2 düzey metinleri (DOĞRULANMADI olarak işaretli).
