# İP-16: Ders dosyası ve ölçme raporu otomasyonu

- **Durum:** bekliyor
- **Faz:** 3
- **Bağımlılık:** İP-04, İP-05, İP-06, İP-12, İP-13
- **Sahip olduğu yollar:** `packages/servis/src/ders-dosyasi/**`, `apps/isci/src/ders-dosyasi/**`, `packages/belge/src/pdf/**`, `docs/raporlar/IP-16.md`
- **Büyüklük:** büyük

## Amaç

Dönem sonunda ders dosyasının hocadan ek iş istemeden üretilmesi.

## Kapsam

1. Girdiler: OBS not dökümü (soru bazlı), sınav ve cevap anahtarı belgeleri, Bologna ÇK'ları, önceki dönemin soru-ÇK eşlemesi.
2. Soru-ÇK eşleme önerisi (YZ, ilk dönem) ve sonraki dönemlerde taşıma; hocaya orta riskli tek onay.
3. `@akredit/olcme` ile ÇK/PÇ, not istatistikleri, madde analizi; örnek kâğıt seçimi (hocadan yalnız seçilen 3 kâğıdın taraması istenir ya da OBS'den alınır).
4. Ders dosyası belgesi (DOCX + PDF): izlence, sınavlar, cevap anahtarları, sonuçlar, grafikler, iyileştirme önerisi taslağı (bulgulardan), imza sayfası.
5. Program düzeyi PÇ raporu ve ÖDR/KİDR için kanıt üretimi.

## Kabul ölçütleri

- [ ] Kurgu bir dönemle uçtan uca: döküm → onay → dosya.
- [ ] Raporlardaki her sayı ölçme sonucuna izlenebilir (girdi özeti).
- [ ] Hocanın toplam etkileşimi ölçülür ve raporlanır.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
