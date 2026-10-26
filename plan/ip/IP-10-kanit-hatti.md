# İP-10: Kanıt hattı ve nesne deposu

- **Durum:** inceleme
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

- [x] 100 belgelik karışık paket uçtan uca işlenir (PGlite + yerel depo + sahte YZ). `hat.test.ts` › "100 belgelik karışık ZIP paketini işler…" (bellek deposuyla; yerel disk sürücüsü `packages/depo` testlerinde ayrıca sınanır).
- [x] Aynı içerik ikinci kez kanıt olmaz. `hat.test.ts` › "tekilleştirme" (3 test).
- [x] Kişisel veri içeren belge işaretlenir ve dış sağlayıcıya maskesiz gitmez. `hat.test.ts` › "kişisel veri" (3 test).
- [ ] İş durumu panelde izlenebilir. Kısmen: veri arayüzü `durumOzeti` / `durumGecmisi` hazır ve sınandı; panel sayfası `apps/web` içinde, bu İP'nin yolu dışında (İP-12 API + web).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı, incelemeye alındı. `packages/depo` (yerel, bellek, S3/SigV4 sürücüleri; içerik adresli `kurum/ozet`, üzerine yazmaz, COMPLIANCE nesne kilidi, imzalı süreli bağlantı). `apps/isci/src/kanit-hatti`: alma yolları (tekli, ZIP, doğrulanmış e-posta, bağlayıcı/üretilen), dört kuyruk (çıkar, ocr, zenginleştir, sınıfla), pg-boss ve bellek kuyruğu (yeniden deneme + ölü mektup), worker thread'de yalıtılmış metin çıkarma (İP-04'ün PDF zaman aşımı sınırı kapatıldı), Tesseract OCR, isteğe bağlı ClamAV. Kararlar: `kanit` yalnız eklendiği için kişisel veri sonucu `kanit_isleme.ayrinti.kisiselVeri`'de tutulur; çıkarılan metin depoya içerik adresli JSON olarak konur. Kalan: panel sayfası (İP-12/web), gerçek PostgreSQL + pg-boss tümleşik testi (İP-08 CI), MIME e-posta ayrıştırma (İP-23).
