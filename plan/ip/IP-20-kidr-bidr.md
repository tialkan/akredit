# İP-20: BİDR, KİDR ve olgunluk değerlendirmesi

- **Durum:** bekliyor
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

- [ ] Kurgu kurumla uçtan uca KİDR taslağı.
- [ ] Olgunluk önerileri politikaya bağlanamaz (test).
- [ ] `pnpm verify` temiz.

## Notlar

KİDR biçimi ve son tarihleri araştırma bulgularına göre (docs/arastirma/) çerçeve verisinden gelir.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
