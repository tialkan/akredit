# İP-39: Üç katmanlı karar modeli, karar kartları, kendini kapatan PÜKÖ

- **Durum:** inceleme
- **Faz:** 7
- **Bağımlılık:** İP-13, İP-14 (ortak: İP-38 sessiz devir)
- **Sahip olduğu yollar:** `packages/cekirdek/src/karar/**`, `packages/cekirdek/test/karar*.test.ts`, `packages/olcme/src/kok-neden.ts`, `packages/olcme/test/kok-neden.test.ts`, `packages/servis/src/puko/**`, `packages/servis/test/puko.test.ts`, `apps/web/src/app/panel/kararlar/**`, `apps/web/src/app/panel/onaylar/yonetici-ozeti.tsx`, `apps/web/e2e/kararlar.spec.ts`, `docs/raporlar/IP-39.md`
- **Büyüklük:** büyük

## Amaç

Onay yorgunluğunu önlemek (dış incelemeler, 2026-10-28, Argon ilkesi): insan yalnız istisnayı karara bağlar. Öneriler üç katmana ayrılır; zorunlu kararlar kümelenmiş, sayısı hesaptan gelen kısa karar kartlarıyla verilir; PÜKÖ döngüsü bir sonraki dönemin ölçümüyle kendiliğinden kapanır. ADR-0004'ün "karar tek dokunuş" katmanını somutlaştırır.

## Kapsam

1. **Üç katman** (`packages/cekirdek/src/karar`, `packages/servis/src/puko`):
   - Katman 0 (tam otomatik): kaynak sistemde onaylı birincil veri (OBS notu, AVESİS yayını vb.) ve eşiği geçen ölçümler onaya düşmez; kanıt olarak mühürlenir, günlüğe "otomatik, dayanak: kaynak sistem" kaydı girer.
   - Katman 1 (süreli varsayılan onay; İP-38 ile ortak): imzalı politika dayanaklı, düşük/orta risk, fark özeti ve süre.
   - Katman 2 (zorunlu karar, devredilemez): eşik altı sonuçlar, müfredat/AKTS değişikliği, olgunluk düzeyi, nihai rapor, dış gönderim.
   - Katmanı belirleyen kural deterministik ve testli; her önerinin katmanı, kural adı ve gerekçesi görünür.
2. **Karar kartları** (`apps/web`): Katman 2'de toplu onay yok. Benzer istisnalar kümelenir (aynı PÇ'de eşik altı kalan dersler → tek karar). Kart: durum (hesaptan sayı + kaynak), kök neden (`@akredit/olcme` soru bazlı), 2-3 önlem seçeneği (metin; rakam içeren seçenek reddedilir) + "kendi önlemini yaz". Klavye kısayolları, erişilebilirlik.
3. **Kendini kapatan PÜKÖ** (`packages/servis/src/puko`): eşik altı → kart → seçilen önlem İP-38 sessiz devir girdisine ve süreç motoruna eylem olarak düşer → sonraki dönem ölçümü gelince önce/sonra karşılaştırması, kayıt "kapandı: iyileşti/iyileşmedi", kanıt bağlantısı; iyileşmediyse yeni kart.
4. **Yönetici özeti**: nihai rapor/dış gönderim onayında 1 sayfalık özet (yükselen/düşen göstergeler, gelişmeye açık yönler, PÜKÖ sayıları). Özet görülmeden onay verilemez.
5. **Onay yorgunluğu ölçümü**: karar başına süre, "incelemeden onay" sinyali (2 sn altı); kurum düzeyinde toplu, en az 5 kararlık küme.

## Kabul ölçütleri

- [x] Katman kuralı saf, deterministik; her katman ve sınır durumu için test; gerekçe ve kural adı çıktıda.
- [x] Katman 2 devredilemez: politika kararı reddedilir; toplu onay yolu yoktur.
- [x] Kümeleme: aynı PÇ/ÇK ve dönemdeki eşik altı ölçümler tek kart; sıralama deterministik.
- [x] Kart sayıları yalnız hesaptan; YZ önlem metninde rakam varsa seçenek düşer.
- [x] PÜKÖ uçtan uca (bellek deposu): eşik altı → kart → önlem → devir girdisi + süreç eylemi → sonraki dönem → kapanış + kanıt; iyileşmediyse yeni kart.
- [x] Yönetici özeti görülmeden nihai onay reddedilir (çekirdek kural + arayüz).
- [x] Yorgunluk göstergesi toplu ve kişisiz; küçük kümede gizlenir.
- [x] `pnpm verify` temiz, web derlemesi başarılı, karar kartları e2e testi.

## Günlük

- 2026-10-28: İP tanımlandı.
- 2026-10-28: Uygulandı (dal `ip/39-karar-katmanlari`): çekirdek katman kuralı ve kart hesapları, ölçmede kök neden, servis PÜKÖ (bellek deposu, yalnız eklenen olaylar), `/panel/kararlar` ve yönetici özeti, e2e. `pnpm verify` adımları temiz, web derlemesi başarılı.
- Karar: İP-38 henüz yok; `SessizDevirGirdisi` servis içinde yerel tür.
- Kalan: PÜKÖ veritabanı tablosu ve göçü, İP-38/İP-14 gerçek bağlantısı, yönetici özeti kapısının onay motoruna bağlanması ve görülmenin günlüğe yazılması, YZ önlem görevi. Ayrıntı: `docs/raporlar/IP-39.md`.
- 2026-10-30: Açık kalan kapatıldı (dal `duzeltme/acik-kalanlar-2`): PÜKÖ kalıcı deposu `0102_puko` göçü (`puko_olayi`: RLS, değiştirilemez, olay türü başına tek kayıt, önlemde karar veren aynı kurumdan ve olay içeriğiyle aynı), servis `vtPukoDeposu`, `pukoPaneli`, `pukoOnlemSec` (oturumdaki aktör, API anahtarı reddi), `pukoOlcumleriIsle`; uçlar `GET /puko/kartlar`, `POST /puko/onlem`, `POST /puko/olcumler`; `/panel/kararlar` gerçek kipte veriyle dolar ve kararı uca gönderir. `puko_olayi` veri akış envanterinde "karar" sınıfında.
- Kalan: İP-38/İP-14 gerçek bağlantısı (servis hâlâ `SessizDevirGirdisi` ve `SurecEylemi` döndürür), REST ölçüm ucunda kök neden boş (madde analizi bağlanmadı), yönetici özeti kapısının onay motoruna bağlanması, YZ önlem görevi.
