# İP-48: Saha ziyareti hazırlık simülatörü

- **Durum:** inceleme
- **Faz:** 8
- **Bağımlılık:** İP-22
- **Sahip olduğu yollar:** `packages/servis/src/saha-ziyareti/**`, `apps/web/src/app/panel/saha-ziyareti/**`, `packages/yz/src/gorevler/saha-sorulari*.ts`, `docs/raporlar/IP-48.md`
- **Büyüklük:** orta

## Amaç

Değerlendirici ziyaretinden önce kurum, olası soruları ve her sorunun cevabını taşıyan kanıtı görmek ister. Simülatör ölçüt ağacından ve raporun EKSİK işaretlerinden soru listesi çıkarır, her soruya kanıtı eşler, kanıtı zayıf yerleri gösterir.

## Kapsam

1. **Soru kaynağı.** Önce deterministik: her alt ölçüt ve raporda EKSİK işaretli her cümle bir soru üretir. Model yalnız soruyu doğal dile çevirir ve yeni soru önerir; önerilen soru ölçüt kimliğine bağlanmadan listeye girmez.
2. **Cevap eşleme.** Her soru için mevcut onaylı kanıtlar (İP-22 kanıt odası) listelenir. Cevap metni yazılmaz; yalnız kanıt gösterilir. Kanıtı olmayan soru "hazırlıksız" işaretlenir.
3. **Prova.** Rol bazlı (rektörlük, komisyon, bölüm, öğretim elemanı, öğrenci) soru seti; bir kişi soruları sırayla görür, kanıtı açar, "hazırım / eksik var" der. Eksik var işaretleri komisyona görev olur (İP-14).
4. **Hazırlık durumu.** Ölçüt başına kanıtlı soru oranı deterministik hesaplanır ve panoda gösterilir; ölçülmemiş "başarı olasılığı" gibi rakam üretilmez.

## Kabul ölçütleri

- [x] Her alt ölçüt ve her EKSİK cümle en az bir soru üretir (test, sentetik Örnek Üniversitesi verisiyle).
- [x] Model önerisi ölçüt kimliği olmadan listeye girmez; model cevap metni yazmaz (test, sahte sağlayıcı).
- [x] Hazırlık oranı elle hesaplanmış örnekle test edilir.
- [x] Eksik işareti süreç motorunda görev oluşturur (test).
- [ ] Demo kiracısında (İP-41) çalışır; axe temiz; `pnpm verify` temiz.

## Günlük

- 2026-10-29: İP dosyası yazıldı.
- 2026-10-30: Uygulandı, durum inceleme. Servis `packages/servis/src/saha-ziyareti` (saf `sorular.ts`: her ölçüt ve alt ölçüt, son ÖDR sürümündeki her EKSİK cümle bir soru; onaylı kanıt eşlemesi; ölçüt başına kanıtlı soru oranı; kurallı rol setleri. `index.ts`: `hazirla`, `provaIsaretle`). YZ görevi `packages/yz/src/gorevler/saha-sorulari.ts`: yalnız dil düzeltmesi ve ölçüt koduna bağlı öneri; cevap, atıf ve yeni sayı içeren öğe ayıklanır. Panel `/panel/saha-ziyareti`: hazırlık tablosu, rol bazlı prova, "Hazırım / Eksik var" (eksik var komisyona görev açar). Göç yok, yeni tablo yok. Kalan: axe ve demo kiracısında tarayıcı denetimi bu ortamda çalıştırılamadı (Playwright tarayıcısı indirilemedi); sayfa `e2e/sayfalar.ts` listesine eklendi. Ayrıntı: `docs/raporlar/IP-48.md`.
- 2026-10-30: İnceleme D8-8 ve D8-9 kapatıldı (dal `duzeltme/baglantilar`). Model önerileri hazırlık oranının paydasına girmez; `modelOnerisi` ayrı sayılır ve panelde ayrı rozetle gösterilir. Ayıklanmış öneriler günlüğe `saha.yz_onerileri` olarak saklanır (yeni tablo yok), modelsiz sonraki listede kalır ve prova işareti alır. `olguImasi` kuralı sıklık sözcüğü, geçmiş ortaç ya da iyelikli etkinlik adı taşıyan model önerisini reddeder. KİDR ve programın biriminin BİDR'sindeki EKSİK bölümler de soru üretir (yalnız çerçevedeki kodlar, son sürüm).
