# İP-20: BİDR, KİDR ve olgunluk değerlendirmesi

- **Durum:** inceleme
- **Faz:** 4
- **Bağımlılık:** İP-11, İP-12, İP-14
- **Sahip olduğu yollar:** `packages/servis/src/kidr/**`, `docs/raporlar/IP-20.md`
- **Büyüklük:** büyük

## Amaç

Birim ve kurum iç değerlendirme raporlarının yıllık döngüde otomatik derlenmesi; olgunluk düzeyi önerilerinin rubrik ve kanıtla gerekçelendirilmesi.

## Kapsam

1. Birimlerden BİDR derleme, kurum düzeyinde KİDR birleştirme.
2. Her alt ölçüt için olgunluk düzeyi önerisi (rubrik + kanıt + gerekçe); yüksek risk, komisyon kararı, devredilemez.
3. Önceki dış değerlendirme raporlarındaki 'gelişmeye açık yönler' → eylem planı → izleme kanıtı.
4. Resmî biçime uygun dışa aktarım; YÖKAK sistemine aktarım planı (son gönderim insanda).

## Kabul ölçütleri

- [x] Kurgu kurumla uçtan uca KİDR taslağı. (`packages/servis/src/kidr/kidr.test.ts` › "uçtan uca KİDR taslağı")
- [x] Olgunluk önerileri politikaya bağlanamaz (test). (`kidr.test.ts` › "olgunluk önerileri politikaya bağlanamaz")
- [x] `pnpm verify` temiz.

## Notlar

KİDR biçimi ve son tarihleri araştırma bulgularına göre (docs/arastirma/) çerçeve verisinden gelir.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (`packages/servis/src/kidr/`). BİDR derleme (birimin onaylı kanıt–ölçüt bağlarından, kanıtsız alt ölçüt EKSİK), KİDR birleştirme (kurum düzeyi kanıt + birimlerin en son BİDR'si; BİDR'siz birim EKSİK), alt ölçüt başına yüksek riskli olgunluk önerisi, dış değerlendirme gelişmeye açık yönleri → eylem → izleme kanıtı, DOCX dışa aktarım + aktarım planı, dış gönderim önerisi (insan kararı). Kararlar: YÖKAK rubriği DOĞRULANMADI olduğundan düzey önerilmez (yalnız kanıt dökümü), aday düzey ancak doğrulanmış rubrik + bölüm kanıtıyla alınır; kesin düzey yalnız komisyon kararından ("Düzey: n"). Yeni göç gerekmedi (risk ve politika yasakları 0003/0006'da). Kalan: REST uçları ve panel sayfası, resmî KİDR kılavuzu ve rubrik metni, BİDR/KİDR yıllık sürecine bağlama (İP-14 `kidr` süreci).
