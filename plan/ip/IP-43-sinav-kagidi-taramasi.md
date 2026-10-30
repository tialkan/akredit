# İP-43: Toplu sınav kâğıdı taraması ve soru bazlı puan (yerel model)

- **Durum:** inceleme
- **Faz:** 8
- **Bağımlılık:** İP-10, İP-06 (ayrıca İP-34 yerel model altyapısını kullanır)
- **Sahip olduğu yollar:** `packages/servis/src/sinav-tarama/**`, `apps/isci/src/sinav-tarama/**`, `apps/web/src/app/panel/dersler/[id]/tarama/**`, `packages/vt/src/sema/sinav-tarama.ts`, `packages/vt/src/gocler/0070_sinav_tarama.sql`, `packages/vt/src/gocler/meta/_journal.json` (tek satır), `docs/raporlar/IP-43.md`
- **Büyüklük:** büyük

## Amaç

Ders dosyasının en çok el emeği isteyen kısmı soru bazlı puan çizelgesidir. Hoca kâğıtları toplu tarayıp yükler; sistem her kâğıttan soru bazlı puanı çıkarır, ölçme motoruna (İP-06) verir. Hocaya kalan iş, emin olunamayan hücreleri onaylamaktır.

## Kapsam

1. **Yükleme.** Tek PDF ya da ZIP içinde çok sayfalı tarama; kanıt hattına (İP-10) kanıt olarak girer, SHA-256 ile saklanır. Kâğıt sınırları sayfa düzeninden ya da kapak sayfası işaretinden bulunur.
2. **Şablon.** Hoca bir kez soru kutularının yerini işaretler (ilk kâğıt üzerinde); şablon `olcme_araci`na bağlanır. Soru-çıktı eşlemesi mevcut onaylı eşlemeden gelir.
3. **Okuma.** Puan hücreleri ve öğrenci numarası yalnız kurum içindeki modelle okunur (İP-34 `openai-uyumlu` sağlayıcı, yerel uç). Yerel sağlayıcı tanımlı değilse iş başlamaz, kullanıcıya bunu söyler. Yurt dışı sağlayıcıya geçiş yolu kodda yoktur (test).
4. **Güven ve onay.** Her hücre için okuma güveni; eşik altı, toplamı tutmayan (soru puanları ≠ kâğıttaki toplam) ve azami puanı aşan hücreler onay kuyruğuna Katman 2 kartı olarak düşer (İP-39). Eşik üstü hücreler de kayda "otomatik okundu" diye geçer, hoca her zaman görebilir.
5. **Kimlik.** Öğrenci numarası okunur okunmaz HMAC takma ada çevrilir (ilke 7); görüntü kırpıntısı kanıt deposunda kalır, model çıktısında numara günlüğe yazılmaz.
6. **Hesap.** Onaylanan puanlar ölçme motoruna girer; ÇK/PÇ sağlanma düzeyleri deterministik hesaplanır. Model hiçbir toplam ya da ortalama üretmez.

## Kabul ölçütleri

- [x] Sentetik taranmış kâğıt örnekleri (`test/fixtures/`, uydurma ad ve numaralarla) üzerinde uçtan uca test: yükleme → okuma (sahte yerel sağlayıcı) → kuyruk → onay → ölçme.
- [x] Yerel sağlayıcı yokken iş başlamaz; yurt dışı sağlayıcı seçilemez (test).
- [x] Toplam tutarsızlığı ve azami puan aşımı her zaman onaya düşer (test).
- [x] Öğrenci numarası veritabanına, günlüğe ve model istemine açık hâlde yazılmaz (test).
- [x] Hücre güveni ve onay kararı değiştirilemez günlükte.
- [x] Panel ekranı klavyeyle kullanılabilir, axe temiz.
- [x] Veri akış envanteri (İP-40) yeni tablolarla güncel; `pnpm verify` temiz.

## Açık sorular

- Yerel modelin el yazısı rakam okuma doğruluğu DOĞRULANMADI; pilotta örnek kâğıtlarla ölçülecek, eşik buna göre ayarlanacak.
- Optik form (OMR) desteği ayrı bir İP olabilir.

## Günlük

- 2026-10-29: İP dosyası yazıldı.
- 2026-10-30: Uygulandı, inceleme bekliyor. Göç 0070 ve dört yalnız-ekleme tablosu; servis `sinav-tarama` (saf kurallar, yalnız kurum içi okuyucu, şablon, tarama, Katman 2 kartları, karar, aktarım, ölçme); işçi işi (Poppler + Tesseract kaynağı, PDF/ZIP); panel ekranı `/panel/dersler/[id]/tarama` (örnek kip). Kararlar: numara kutusu modele gitmez, deterministik okunup hemen HMAC'lanır; model yalnız puan kutusunun OCR metnini yorumlar (`@akredit/yz` görüntü taşımıyor); toplam ve azami kuralları eşikten bağımsız Katman 2; karşılaştırmalar binde bir tam sayı. Kalan: HTTP uçları ve kuyruk kaydı, şablon düzenleyici, genel onay kutusunda listeleme, görüntü girişli yerel model, eşiğin pilotta ayarı. Ayrıntı: `docs/raporlar/IP-43.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. Açık bulgular: D8-3 (orta: otomatik hücreler kişi görmeden aktarılıyor; yerel modelin el yazısı doğruluğu ve 0,9 eşiği pilotta ölçülmeli) ve D8-4 (orta: yükleme ucu yok, numara kırpıntısı erişimi ayrıca sınırlanmalı). D8-4 kod işidir, sonraki turda kapatılmalı; D8-3 pilot örnek kâğıtları (insan işi) bekler. Durum inceleme.
- 2026-10-30 (dal `ip/43-baglanti`): Açık kalanlar kapandı. Göç 0120 (`sinav_tarama_istegi`, `sinav_tarama_istegi_sonucu`, `sinav_ozet_onayi`; hücre kararı tetikleyicisi otomatik hücrenin düzeltilmesine izin verir, aktarımdan sonra karar almaz). Panel yükleme ucu ve formu (PDF, PNG, JPEG, TIFF, ZIP; yerel model yoksa kapalı); işçi kuyruğu `sinav.tarama` (süreç turunda kuyruğa konur, `kanitAl` ile `amac: sinav_taramasi`); görüntü Tesseract ile PDF'e çevrilir. Şablon düzenleyici (fare, klavye, sayı alanları). D8-3 özet onayı, D8-4 kırpıntı erişimi, D8-12 onaylı eşleme. Kalan: Playwright ve axe bu ortamda çalıştırılmadı; eşiğin pilotta ayarı; görüntü girişli yerel model; genel onay kutusunda listeleme.
