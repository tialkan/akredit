# İP-47: Program akreditasyonu tablo dönüştürücüsü (MÜDEK, FEDEK, EPDAD, SABAK)

- **Durum:** bekliyor
- **Faz:** 8
- **Bağımlılık:** İP-11, İP-19 (ikisi de incelemede)
- **Sahip olduğu yollar:** `packages/cerceveler/src/program-tablolari/**`, `packages/servis/src/odr/tablolar/**`, `packages/belge/src/tablo-sablon*.ts`, `apps/web/src/app/panel/programlar/[id]/tablolar/**`, `docs/raporlar/IP-47.md`
- **Büyüklük:** büyük

## Amaç

Program akreditasyon kuruluşları öz değerlendirme raporunda belirli tablolar ister (ders-çıktı matrisi, öğretim kadrosu, ders yükleri, öğrenci sayıları gibi). Sistem bu tabloları zaten tuttuğu verilerden, kuruluşun istediği biçimde üretir. Hoca tabloyu doldurmaz.

## Kapsam

1. **Resmî kaynak.** Her kuruluşun güncel ÖDR kılavuzu ve tablo şablonu resmî belgeden alınır; adres, tarih ve SHA-256 saklanır (ilke 6). Resmî belge alınamayan kuruluş için tablo tanımı eklenmez, panel "kılavuz alınmadı" der. Bugün MÜDEK ağacı boş (`cerceveler/veri.ts`, MUDEK_TASLAK); bu İP önce resmî belgeleri ister.
2. **Tablo tanımı.** Her tablo, sütun başına veri kaynağını (vt sorgusu ya da ölçme hesabı) bildiren saf bir tanımdır. Kaynağı olmayan sütun `EKSİK` olarak çıkar.
3. **Üretim.** DOCX ve XLSX (`belge`), kuruluşun şablonuna uygun. Her hücre kaynağına izlenebilir (İP-44 ile tek tıkla).
4. **Sayılar.** Bütün sayılar deterministik hesaplardan; model tablo üretiminde kullanılmaz.
5. **Kapsam sırası.** Önce resmî belgesi alınan kuruluş; dördü birden şart değil.

## Kabul ölçütleri

- [ ] Resmî belge özeti saklanmadan tablo tanımı yüklenemez (test).
- [ ] Her tablo elle hesaplanmış sentetik program verisiyle test edilir; beklenen değerin nasıl bulunduğu testte yorumda.
- [ ] Kaynağı olmayan sütun EKSİK çıkar, boş ya da sıfır değil (test).
- [ ] Modelsiz çalışır (test).
- [ ] `pnpm verify` temiz.

## İnsan işi

- MÜDEK, FEDEK, EPDAD ve SABAK güncel ÖDR kılavuzlarının ve tablo şablonlarının resmî kopyaları (kurucu temin eder). Kuruluş adları ve kısaltmaları dış inceleme belgesinden alınmıştır; tam adları ve güncel sürüm DOĞRULANMADI.

## Günlük

- 2026-10-29: İP dosyası yazıldı. İP-11 ve İP-19 incelemeden çıkınca ve resmî belgeler gelince hazır olur.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Kod bağımlılıkları İP-11 ve İP-19 tamam oldu. Durum bekliyor kalır: bu İP'nin kendi ön koşulu olan MÜDEK, FEDEK, EPDAD ve SABAK resmî ÖDR kılavuzları ve tablo şablonları `kaynaklar/resmi/` altında yok (insan işi). Belgeler gelince hazır yapılır.
