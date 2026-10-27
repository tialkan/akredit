# İP-16: Ders dosyası ve ölçme raporu otomasyonu

- **Durum:** inceleme
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

- [x] Kurgu bir dönemle uçtan uca: döküm → onay → dosya.
- [x] Raporlardaki her sayı ölçme sonucuna izlenebilir (girdi özeti).
- [x] Hocanın toplam etkileşimi ölçülür ve raporlanır.
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/16-ders-dosyasi`). Servis `packages/servis/src/ders-dosyasi`: döküm aktarımı (HMAC takma ad), soru-ÇK eşleme önerisi (önceki dönem → model adayı → EKSİK; orta risk, düzeltmeli onay), `@akredit/olcme` ile ölçme, DOCX ders dosyası + XLSX ölçme raporu (her tablo girdi özetli), yüksek riskli dosya onayı, günlükten hoca etkileşimi. REST: `/ders-dosyasi/dokum`, `/ders-dosyasi/{id}`, `/ders-dosyasi/{id}/olustur`, `/ders-dosyasi/{id}/belge`, `/dersler/{id}/ders-dosyasi`. İşçi `apps/isci/src/ders-dosyasi`. Panel: ders sayfasında ders dosyası kartı. Göç gerekmedi. Kalan: PDF çıktısı ve görsel grafik, kâğıt taraması yükleme, YZ eşleme görevi, program PÇ raporu/ÖDR kanıtı (İP-19). Ayrıntı: `docs/raporlar/IP-16.md`.
