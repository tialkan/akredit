# Bağımsız inceleme: 8. dalga (İP-43, İP-45, İP-48, açık kalanlar 2)

Tarih: 2026-10-30. Dal: `inceleme/dalga-8` (`main` üzerinden). Kapsam: İP-43 sınav kâğıdı taraması, İP-45 hesapsız belge isteme, İP-48 saha ziyareti hazırlığı ve `duzeltme/acik-kalanlar-2` ile gelenler (PÜKÖ deposu, göç 0100-0102). Yöntem: kod doğrudan okundu, yazar raporlarına dayanılmadı; her düzeltmenin testi düzeltmeden önce başarısızdı.

Doğrulama: `pnpm check` temiz (yalnız önceden var olan 17 uyarı), `pnpm typecheck` temiz, testler: servis 433, işçi 63, vt 70, yz 155, web 298; hepsi geçti.

## Düzeltilenler

1. Yüksek: İP-43, modelin uydurduğu puan otomatik kabul ediliyordu (ilke 2). Hücrenin otomatik mi onaya mı düşeceğini modelin kendi bildirdiği `guven` belirliyordu; model kutu metninde hiç geçmeyen bir sayıyı güven 1 ile döndürdüğünde puan Katman 0 olarak `ogrenci_puani`na ve oradan ÇK/PÇ hesabına giriyordu. Düzeltme: `metindeSayiVarMi` (saf); modelin değeri kutunun tarayıcı metninde sayı olarak geçmiyorsa hücre `metinde_yok` nedeniyle Katman 2 onaya düşer. Testler: `packages/servis/src/sinav-tarama/sinav-tarama.test.ts` "inceleme: modelin kutu metninde olmayan sayısı", `apps/isci/src/sinav-tarama/sinav-tarama.test.ts` "modelin kutu metninde olmayan sayısı (güven 1 olsa da) otomatik puana girmez".
2. Yüksek: İP-43, taranan kâğıtlar kanıt hattından dolaylı olarak açık numarayla tabloya ve kurum sağlayıcısına gidebiliyordu (ilke 7). Tarama dosyası `kanitAl` ile alınınca metin çıkarma kuyruğuna giriyor; OCR metni (açık öğrenci numarası ve ad) `kanit_parcasi`na yazılıyor, gömme ve sınıflama adımlarında kurumun (yurt dışı olabilen) sağlayıcısına maskeli gidiyordu. "Yalnız kurum içi model" güvencesi bu yolla delinmişti. Düzeltme: `kaynakAyrinti.amac = "sinav_taramasi"` ile alınan dosya kuyruğa konmaz (`SINAV_TARAMASI_AMACI`); tarama işi bu amaçla alınmamış kanıtı reddeder. Test: işçi "tarama dosyası kanıt hattının metin/YZ kuyruğuna girmez; hattan geçmiş dosya taranmaz".
3. Orta: İP-45, gövde boyutu sınırı yalnız `content-length` başlığına bakıyordu. Parçalı aktarımda başlık yoktur; geçersiz bağlantıyla bile sınırsız gövde belleğe okunuyordu. Düzeltme: `sinirliGovde`, gövde en çok 20 MB + pay okunur, aşarsa 413. Test: `apps/web/src/app/api/istek/yukle.test.ts` "content-length başlığı olmayan (parçalı) büyük gövde".
4. Orta: İP-48, modelin soru metnine cevap ekleyebildiği yol. `soruMetniSorunu` cümle sayısını yalnız `.!?` ile sayıyordu; satır sonuyla ya da noktalı virgülle eklenen cevap ("P.1 nasıl işliyor\nKomisyon her ay toplanıyor\nbu yeterli mi?") geçiyordu. Düzeltme: denetim karakteri ve `;` reddedilir. Test: `packages/yz/src/gorevler/saha-sorulari.test.ts` "soru metni kuralı (inceleme dalga 8)".
5. Orta: `main` tip denetiminden geçmiyordu. İP-45 birleştirmesinde `apps/web/src/veri/sunucu.ts` içinde çakışmadan iki `servisBaglami` satırı kalmıştı. Düzeltildi.

## Açık bulgu turunda kapananlar (dal `duzeltme/puko-olcum`, 2026-10-30)

Her düzeltmenin testi düzeltmeden önce başarısızdı. Numaralar aşağıdaki açık bulgu numaralarıdır.

1. Yüksek, kapandı: PÜKÖ ölçüm değerleri artık gövdeden gelmiyor. `pukoOlcumleriIsle` gövdesi `{ secimler: [{ olcumTuru, kod, dersKodu, donem }], kanitId }` (strict); `deger`, `esik` ya da `kaynak` gelirse 400. Değerler `puko/olcum-hesabi.ts` içinde kurumun kayıtlı ölçme aracı, soru (`soru.cikti_eslemesi`), öğrenci puanı ve onaylı katkı matrisinden `@akredit/olcme` `dersiOlc` ile hesaplanır; eşik kurum ayarından, kaynak `hesapSurumu` ve `girdiOzeti` hesaptan gelir. Uç yalnız oturumla çağrılır, API anahtarı 403. Kayıtlı olmayan ders ya da dönem 404, aynı dönemde birden çok şube kural hatası. Test: `packages/servis/test/puko-vt.test.ts` "inceleme: gövdede ölçüm değeri gelirse 400; değerler kayıtlı veriden hesaplanır; API anahtarı reddedilir" (elle doğrulanmış 40 ve 55).
2. Orta, kapandı: hesapsız yüklenen dosya kuyruktan önce `kanitAl`'daki tarayıcıdan (`HatBaglami.virus`) geçer. Bulgu varsa kanıt silinmez (ilke 4), `kanit_isleme` kaydı `hata` olarak eklenir, günlüğe `kanit.zararli_bulundu` yazılır ve kuyruğa girmez. Tarayıcıya ulaşılamazsa dosya bekler, sonraki turda yeniden denenir. Tarayıcı kurulmamışsa davranış `kanitAl` ile aynı: tarama yok. Test: `apps/isci/src/belge-istegi/belge-istegi.test.ts` "inceleme dalga 8".
5. Orta, kapandı: `dosyaDenetle` ZIP merkezi dizinini okur. docx için `[Content_Types].xml` ve `word/document.xml`, xlsx için `[Content_Types].xml` ve `xl/workbook.xml`; odt/ods için ilk girdi sıkıştırılmamış `mimetype` ve içeriği türün kendisi olmalı. Rastgele ZIP, tür karışıklığı ve kesik dosya reddedilir. Test: `packages/servis/src/belge-istegi/belge-istegi.test.ts` "ZIP tabanlı türlerde beklenen iç dosya aranır".
6. Düşük, kapandı: ağ izi yoksa ağ izsiz yüklemeler kurum içinde birlikte sayılır, saatte en çok `AG_IZSIZ_SINIRI_SAATLIK` (20). Test: "ağ izi yoksa kurum genelinde ağ izsiz yüklemelere ortak saatlik sınır uygulanır". Kalan not: vekil `x-real-ip` yazmazsa istemci bu başlığı seçebilir; bu dağıtım ayarıdır (G-27-4 ile birlikte izlenir).
7. Düşük, kapandı: kabul kuralı tek yerde, `belge-istegi` `KABUL_SONUCLARI` (`onaylandi`, `duzeltildi`), `kabulSonucuMu`, `kabulBekleyenDisKanitlar`. Göç `0110_kabul_kurali` tetikleyiciyi aynı kurala getirir. `atifaUygunMu` bu kurala dayanır; rapor atıf denetimi (`rapor.ts`) kabul edilmemiş dış birim kanıtına atfı çözülmemiş sayar ve paragrafı EKSİK işaretler; ÖDR (`onayliKanitlar`) da bu kanıtı saymaz. Test: "düzeltilerek verilen kabul de kabuldür; kabulsüz dış kanıta rapor atfı EKSİK sayılır".
10. Düşük, kapandı: `kurumIciFetch` her istekte adı çözer; adreslerden biri bile kurum dışındaysa ya da ad çözülemezse istek gitmez. Yönlendirme izlenmez (`redirect: "manual"`), 3xx hatadır. Ad ön denetimi (`kurumIciAdresMi`) korunur. Test: `packages/servis/src/sinav-tarama/sinav-tarama.test.ts` "ad kurum dışına çözülürse ya da sunucu yönlendirirse istek gitmez". Kalan not: çözüm ile bağlantı arasında ad yeniden çözülebilir (DNS yeniden bağlama); adres sunucu yöneticisinin ortam değişkeni olduğundan kabul edildi.
11. Düşük, kapandı: `istemGuvenliMi` dört ve üzeri rakamı, aralarında üçe kadar ayraç (boşluk, nokta, virgül, tire, alt çizgi, eğik çizgi, dikey çizgi, iki nokta, noktalı virgül) olsa da yakalar. Test: "dört haneli ya da her rakamı ayraçlı numara da istemde olamaz".

Doğrulama: `pnpm check` temiz (yalnız önceden var olan 17 uyarı), `pnpm typecheck` temiz, testler: servis 439, işçi 65, vt 70, web 298; hepsi geçti.

## İP-43 bağlantı turunda kapananlar (dal `ip/43-baglanti`, 2026-10-30)

3. Orta, kapandı: otomatik hücreler aktarımdan önce tek ekranlık özette gösterilir; aktarım özet onayıyla (Katman 1, doğrudan, tek dokunuş) yapılır, gönderilen özet ekrandaki kümeyle aynı olmalıdır. Kişi otomatik hücreyi açıp düzeltebilir. Onay `sinav_ozet_onayi` tablosuna ve günlüğe yazılır; sonra karar girmez. Eşik ve el yazısı doğruluğu pilotta ölçülecek (DOĞRULANMADI).
4. Orta, kapandı: yükleme ucu `/panel/dersler/[id]/tarama/yukle` dosyayı depoya koyar ve istek yazar; işçi `kanitAl` ile `amac: sinav_taramasi` verir (kuyruk `sinav.tarama`). Numara kırpıntısına tek yol `kirpintiBaglantisi`: tarama sahibi ve onay yetkilisi, 30 gün, 5 dakikalık bağlantı, günlükte.
12. Düşük, kapandı: PÜKÖ ve tarama ölçmesi soruda eşleme yoksa ders dosyası akışının onaylı eşlemesini kullanır.

## Açık bulgular (önem sırasıyla)

8. Düşük: İP-48, model önerileri hazırlık oranının paydasına giriyor. Oran kurallı hesaplanır ama öneri sayısı modelden gelir; oranı modelin önerdiği soru sayısı değiştirir. Ayrıca `provaIsaretle` listeyi modelsiz kurduğu için model önerisi soruya prova işareti konamaz ("Bu soru listede yok").
9. Düşük: İP-48, tek cümlelik soru olgu ima edebilir ("kurulun haftalık toplantıları nasıl belgeleniyor?"). Sayı, atıf ve cevap izi yok; kuralla yakalanmaz. Ekranda "model önerisi" etiketiyle ayrı gösterilmesi yeterli olabilir.

## PÜKÖ ve göç 0100-0102 için olumlu bulgular

- `puko_olayi`: RLS (FORCE), güncelleme, silme ve boşaltma reddi, döngüde tür başına tek olay, önlemde karar veren sütunu ile içerik eşitliği ve aynı kurum denetimi testlerle doğrulandı. Servis karar vereni oturumdan alır, API anahtarını reddeder; gövdedeki `kararVeren` `strict` ile reddedilir.
- 0100, 0020'deki `karar_denetle` gövdesinin aynısına yalnız `bildirilen` denetimini ekliyor (fark karşılaştırıldı); arada başka tanım yok.
- 0101 modelin yazdığı Bologna taslağını yetki devriyle onaylatmıyor.
