# İP-43: Toplu sınav kâğıdı taraması ve soru bazlı puan (yerel model)

- **Durum:** hazır
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

- [ ] Sentetik taranmış kâğıt örnekleri (`test/fixtures/`, uydurma ad ve numaralarla) üzerinde uçtan uca test: yükleme → okuma (sahte yerel sağlayıcı) → kuyruk → onay → ölçme.
- [ ] Yerel sağlayıcı yokken iş başlamaz; yurt dışı sağlayıcı seçilemez (test).
- [ ] Toplam tutarsızlığı ve azami puan aşımı her zaman onaya düşer (test).
- [ ] Öğrenci numarası veritabanına, günlüğe ve model istemine açık hâlde yazılmaz (test).
- [ ] Hücre güveni ve onay kararı değiştirilemez günlükte.
- [ ] Panel ekranı klavyeyle kullanılabilir, axe temiz.
- [ ] Veri akış envanteri (İP-40) yeni tablolarla güncel; `pnpm verify` temiz.

## Açık sorular

- Yerel modelin el yazısı rakam okuma doğruluğu DOĞRULANMADI; pilotta örnek kâğıtlarla ölçülecek, eşik buna göre ayarlanacak.
- Optik form (OMR) desteği ayrı bir İP olabilir.

## Günlük

- 2026-10-29: İP dosyası yazıldı.
