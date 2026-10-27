# Okunabilirlik testi (pilot)

Kabul ölçütü: pilot kullanıcılarla okunabilirlik testi. **Durum: yapılmadı.** Pilot (İP-30) ve kurum izni gerektirir; bu belge testin nasıl yapılacağını ve sonuçların nereye yazılacağını tanımlar.

## Otomatik ön denetim (yapıldı)

`apps/web/src/app/(site)/belgeler/belgeler.test.ts` her kılavuzda şunları denetler:

- Teknik terim yok (liste: `sadelik.ts` `YASAK_TERIMLER`).
- Cümle uzunluğu: ortalama ≤ 16, en uzun ≤ 32 kelime.
- Yazılan okuma süresi ≤ 7 dakika ve dakikada 120 kelimelik yavaş okumaya göre gerçekçi.
- "Şu an yapılamayanlar" bölümü boş değil; garanti ya da kesin sonuç sözü yok.

Bu denetim insan testinin yerini tutmaz.

## Pilot testi yönergesi

- **Katılımcılar:** en az 5 öğretim elemanı (farklı yaş ve bilgisayar alışkanlığı), 2 kalite komisyonu üyesi, 1 bilgi işlem çalışanı. Gönüllü, aydınlatılmış; ad kaydedilmez (K1, K2…).
- **Yöntem:** katılımcıya kılavuz verilmeden önce görev verilir (ilk deneme), sonra ilgili kılavuz okutulur ve aynı görev tekrarlanır.
- **Görevler:** (1) bir öneriyi onaylamak, birini düzeltmek, birini reddetmek; (2) ders dosyası için dökümü yükleyip eşlemeyi onaylamak; (3) rapordaki bir EKSİK'in ne demek olduğunu kendi sözleriyle anlatmak; (4) kalite birimi: bir politikayı okuyup kapsamını anlatmak ve imzalamak.
- **Ölçüler:** görev başarısı (evet/yardımla/hayır), süre, kılavuzda takılınan cümle, "bu kılavuz bugün olmayan bir şeyi vaat ediyor mu?" sorusu, 1-5 anlaşılırlık puanı.
- **Başarı eşiği:** her görevde en az 4/5 öğretim elemanı yardımsız başarır; ortalama anlaşılırlık ≥ 4. Takılınan her cümle yeniden yazılır.

## Sonuçlar

| Tarih | Katılımcı | Görev | Başarı | Süre | Takılınan yer | Not |
|---|---|---|---|---|---|---|
| EKSİK | | | | | | |
