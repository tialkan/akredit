# İP-47: Program akreditasyonu tablo dönüştürücüsü (MÜDEK, FEDEK, EPDAD, SABAK)

- **Durum:** inceleme
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

- [x] Resmî belge özeti saklanmadan tablo tanımı yüklenemez (test).
- [x] Her tablo elle hesaplanmış sentetik program verisiyle test edilir; beklenen değerin nasıl bulunduğu testte yorumda.
- [x] Kaynağı olmayan sütun EKSİK çıkar, boş ya da sıfır değil (test).
- [x] Modelsiz çalışır (test).
- [x] Eşleme yalnız eklenir; tabloya yalnız kurum kullanıcısının kararı girer, öneri girmez (PGlite testi).
- [x] `pnpm check`, `pnpm typecheck` ve ilgili paket testleri temiz (cerceveler, belge, vt, servis, web). Tam `pnpm verify` bu dalda çalıştırılmadı.

## İnsan işi

- MÜDEK, FEDEK, EPDAD ve SABAK güncel ÖDR kılavuzlarının ve tablo şablonlarının resmî kopyaları (kurucu temin eder). Kuruluş adları ve kısaltmaları dış inceleme belgesinden alınmıştır; tam adları ve güncel sürüm DOĞRULANMADI.

## Günlük

- 2026-10-29: İP dosyası yazıldı. İP-11 ve İP-19 incelemeden çıkınca ve resmî belgeler gelince hazır olur.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Kod bağımlılıkları İP-11 ve İP-19 tamam oldu. Durum bekliyor kalır: bu İP'nin kendi ön koşulu olan MÜDEK, FEDEK, EPDAD ve SABAK resmî ÖDR kılavuzları ve tablo şablonları `kaynaklar/resmi/` altında yok (insan işi). Belgeler gelince hazır yapılır.
- 2026-10-30 (dal `ip/47-program-tablolari`): Resmî belgeler `kaynaklar/resmi/{mudek,fedek,epdad,sabak}/` altına geldi, özetler `kaynaklar.json` ile aynı. Yapıldı:
  - Çerçeveler (`packages/cerceveler/src/program-tablolari/`): MÜDEK lisans 3.1 (9 ölçüt, 31 alt ölçüt, 11 MÜDEK Çıktısı), MÜDEK YL 2.0 (9, 30, 11), FEDEK 4.1 (10, 40, 11), SABAK R4 (9, 50, 37 alt madde, 11 çıktı), EPDAD öğretmen eğitimi 1.1 (7 alan, 39 alt standart, 246 örnek kanıt maddesi), EPDAD RPD (7 alan, 40 standart). Metinler belgeden betikle kesildi (`olcut-ham.ts`), hafızadan yazılmadı; test her satırı kaynak sayfada birebir arar. Hepsi `dogrulandi: false`.
  - 12 ÖDR tablo tanımı: MÜDEK Tablo 5.1, 5.2, PÇ-MÜDEK Çıktısı ilişkisi, ders-PÇ katkısı; FEDEK Tablo 4.1, 4.4, PÇ-FEDEK, ders-PÇ; SABAK ÖDR Tablo 1, PÇ-SABAK, ders-PÇ; EPDAD EK I.1. Başlık, sütun ve dayanak cümlesi şablondan birebir doğrulanır.
  - Dönüştürücü `tabloUret` (saf, modelsiz) ve `sablonTablosu`; Word/Excel çıktısı `packages/belge/src/tablo-sablon.ts`.
  - Çerçeveler `ILK_CERCEVELER` listesine eklendi; kurulumdaki çerçeve seçiminde kendiliğinden görünür.
  - Kararlar: ders kategorisi (MTB, mesleki, genel...) ve PÇ-kurul çıktısı eşlemesi kurumun onayladığı girdi olarak alınır, Akredit tahmin etmez; eşleme yoksa hücre EKSİK. Seçmeli ders varsa toplam EKSİK (şablon "planda yer aldığı sayı kadar" ister, bu sayı Bologna'da yok).
  - Kalan: servis katmanı (`packages/servis/src/odr/tablolar/`) ve panel sayfası (`apps/web/src/app/panel/programlar/[id]/tablolar/`) yazılmadı; kategori ve PÇ-kurul eşlemesinin saklanacağı yer (vt) ve onay akışı sonraki İP'ye. Öğrenci sayısı, kadro, bütçe tabloları (MÜDEK 1.x, 6.x, 8.1; SABAK Tablo 2-12) kaynak verisi olmadığından tanımlanmadı. MÜDEK YL ve RPD için ÖDR şablonu indirilmedi, tablo yok. İP-44 tek tık izlenebilirlik bağlantısı yok; her hücre `kaynak` anahtarı taşır.
- 2026-10-30 (kalanlar): Servis, saklama ve panel yazıldı.
  - Seçmeli yer sayısı: `tabloUret` girdisine `secmeliYerSayilari` (yarıyıl → yer sayısı) eklendi. Toplamda her yarıyılın seçmelileri bu sayı kadar sayılır. Yer sayısı girilmemişse, yarıyılı belirsizse ya da aynı yarıyılın seçmelileri sütunda farklı değer taşıyorsa toplam EKSİK kalır.
  - Saklama: `0130_program_esleme` göçü, `program_esleme` tablosu. Yalnız eklenir (UPDATE, DELETE, TRUNCATE reddedilir), RLS FORCE, kararda karar veren kişi ve dayanak zorunlu, YZ karar veremez, kişi ve program aynı kurumdan, değer biçimi türe uyar. Son karar geçerli; düzeltme yeni karardır. KVKK envanterine "karar" kategorisiyle eklendi, envanter ve hukuk paketi yeniden üretildi.
  - Servis `packages/servis/src/odr/tablolar/` (`odrTablolari`): `tabloCerceveleri`, `programTablolari`, saf `durumKur`, `eslemeOner` (YZ ya da kişi; API anahtarı yazabilir; `rapor.duzenle`), `eslemeKarariVer` (yalnız oturum, `karar.ver`; ad, zaman, dayanak günlüğe), `tabloBelgesi` (Word/Excel, indirme günlüğe). Bologna verisi programın son okuma kanıtından gelir; eşleme anahtarı ve değeri bu okumaya ve çerçeveye göre denetlenir.
  - Panel `/panel/programlar/[id]/tablolar`: çerçeve seçimi, tablolar (EKSİK hücre nedeniyle, isteğe bağlı hücre kaynağı), eşleme onay formu (ders kategorisi ya da türü, PÇ-kurul çıktısı, seçmeli yer sayısı, ortak dayanak), Word/Excel indirme. Program sayfasına bağlantı eklendi.
  - Kalan: YZ öneri görevi (model istemi) yazılmadı; öneri ucu hazır, öneriyi yazan ajan sonraki İP. HTTP/MCP ucu eklenmedi. İP-44 tek tık izlenebilirlik yok; hücre kaynağı metin olarak görünür.
