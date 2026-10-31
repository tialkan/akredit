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
- 2026-10-31 (YZ öneri görevi ve İP-44 izlenebilirlik): Kalanlar yapıldı, durum inceleme kalır.
  - Görev `packages/yz/src/gorevler/esleme-onerisi.ts` (`eslemeOnerisi`): ders kategorisi ya da SABAK ders türü ve PÇ-kurul çıktısı önerisi. Seçmeli yer sayısı önerilmez (sayı, ilke 2). Girdi maskelenir (`maskeleyici`, kurumun ad ve numara ayarı) ve veri olarak sarılır (ilke 5, 7). Çıktı zod şemasıyla doğrulanır; her öğe gerekçe ve kaynak kimliği taşır (`ders:KOD` Bologna okuma kaydı, `pc:KOD`, `kurul:KOD`). Bilinmeyen kod, listede olmayan değer, uydurma kaynak, kendi kaydına dayanmayan öneri ve gerekçede kaynağı olmayan sayı tek tek ayıklanır.
  - Servis `odrTablolari.yzOnerisi`: `oneriIste` (istek değiştirilemez günlüğe), `bekleyenOneriIstekleri`, `istegiIsle` (isteyen kişinin yetkisiyle; kurumun sağlayıcısı çıkış kapısı ve maskeyle; sonuç "olmadı" dahil günlüğe, istek bir kez işlenir), `onerileriUret` (yalnız kararı olmayan satırlar; her öğe `eslemeOner` ile yalnız öneri), `oneriDurumu`. `eslemeOner` gerekçe ve kaynak alır; kaynağın kanıtı programın son Bologna okuması olmalı.
  - Göç `0131_program_esleme_gerekce` (sahiplik dışı en küçük değişiklik): `program_esleme.gerekce jsonb`, yalnız öneride dolu olabilir.
  - İşçi: `odr.esleme_oneri` kuyruğu (`apps/isci/src/esleme-onerisi/`); süreç turu bekleyen istekleri istek kimliği tekil anahtarıyla koyar.
  - Panel: "Öneri iste" düğmesi ve son isteğin durumu; onay formunda öneri seçili gelir ama satırın "Öneriyi onayla" kutusu (PÇ'de "Bu satırı onayla") işaretlenmeden karar olmaz. Önerinin gerekçesi ve dayandığı kayıt bağlantıyla görünür.
  - İP-44 tek tık: hücre kaynağı programın Bologna okuma kanıtına (`/panel/kanitlar/{id}`) ya da sayfadaki karar satırına (karar veren, zaman, dayanak) bağlanır; hesap kaynağı bağlantısız.
  - Testler: yz +5, servis +4 (PGlite, sahte sağlayıcı), isci +1, web +2. Kalan: gerçek modelle değerlendirme yapılmadı; e2e (Playwright) bu dalda koşulmadı.
- 2026-10-31 (uçtan uca testler ve ek resmî içerik, dal `ip/47-e2e-ozgu`): Durum inceleme kalır.
  - E2E: web `AKREDIT_ORNEK_VERI=1` ile derlendi; Playwright masaüstü 174/174, telefon ve performans geçti (performans ilk koşuda başka iş yükü altında bir sayfada bütçeyi aştı, tek başına yeniden koşuda 18/18). portal.spec (Raporlar menüsü) dahil bozuk test yoktu. Yeni `apps/web/e2e/program-tablolari.spec.ts` (3 test: çerçeve seçimi, hücre kaynağı, Öneri iste, eşleme onayı yalnız klavyeyle; axe WCAG 2.2 AA) ve sayfa `e2e/sayfalar.ts` listesinde (genel axe ve klavye testleri).
  - Ek resmî içerik (`program-tablolari/ozgu-ham.ts` belgeden betikle, `ozgu.ts`): MÜDEK EK-1 26 disiplin, 172 konu; FEDEK programa özgü 27 program, 242 madde; EPDAD 156 gösterge (138'inde dört düzey tanımı) ve dörtlü dereceli puanlama anahtarı. Her öğe dosya, SHA-256 ve sayfa taşır; test metni kaynak sayfada birebir arar (cerceveler 88 test).
  - Kalan: EPDAD kılavuzu 158 gösterge diyor, tablolarda 157 sayıldı (DOĞRULANMADI); 7.2.1/1 iki sayfaya bölündüğü için alınmadı; 18 göstergenin düzey tanımı ayrılamadı (null). Ek içerik panele ve ölçüt ağacına bağlanmadı.
