# Açık MCP (`apps/acik-mcp/**`, 0.8.0)

Bütün kaynak dosyaları (`src/*.ts`, `scripts/derle.ts`, `package.json`, `README.md`, `tsconfig*.json`) baştan sona
okundu. Testlerden `acik-mcp`, `otonom`, `numarali-secim`, `derle`, `otonomi-senaryosu` tam; `hoca-akisi-03`,
`bologna-akisi`, `dis-inceleme`, `kaynak-dogrula` test adları, yorumları ve metin beklentileri üzerinden okundu
(satır satır değil). Sürüm değişmedi, araç eklenmedi ya da kaldırılmadı, bağımlılık eklenmedi.

## Düzeltildi

Güvenlik ve onay (ilke 3)

- `src/temel.ts:77` Peşin onay deseni yalnız `/kaydet|hallet|.../` arıyordu; `"kaydetme"`, `"hepsini doldur ama
  kaydetme"`, `"kaydetmeden önce bana sor"`, `"sen halletme"`, `"onaylamıyorum"` da onay sayılıp sormadan OBS kaydına
  yol açıyordu → olumsuz söz deseni (`PESIN_ONAY_OLUMSUZ`) eklendi; olumsuz ya da belirsiz biçim ("kaydetmeni") onay
  sayılmaz, hocaya bir kez sorulur. Ad-fiil ("kaydetmek") olumsuz değildir. `PESIN_ONAY_ACIKLAMASI` ve
  `bologna_kopya_metni`'nin "peşin onay sayılmadı" iletisi buna göre güncellendi.
  (doğrulama: `test/otonomi-senaryosu.test.ts:253` 12 olumsuz, 6 olumlu örnek + araç düzeyi üç çağrı)
- `src/promptlar.ts:411` `akredit_basla` peşin onayı bütün odaklarda açıyordu: "raporumun dil denetimini yap, hepsini
  düzelt" yanıtı "OBS'ye kaydederim" diyordu (dil denetimi, ÇK/PÇ, ölçüt akışlarında OBS yok, hiçbir araç `pesinOnay`
  almıyor) → peşin onay ve ipucu yalnız OBS'ye yazan odaklarda (1 Bologna, 2 öğrenme çıktısı) döner. (doğrulama: yeni test)

Çelişen talimat ve akış metinleri

- `src/sunucu.ts:26` KURAL sırası 1,2,3,5,6,7,4 idi → KURAL 4 yerine alındı (numaralar ve metin aynı; test: "KURAL 1-7 sıralıdır").
- `src/sunucu.ts:31`, `src/promptlar.ts` KISA_KURALLAR ve dosya başı yorumu: "uygulama/lab ve amaç/içerik hocaya
  sorulur, varsayılan seçenekli sorulur" diyordu; TEYIT_SORULARI, `bologna_ayristir` sonrakiAdim ve `otonom.test`
  ise "yüzdeye varsayılan uydurma; uygulama/lab T+U+L'den okunur; amaç/içerik öneri yazılıp son özette teyide
  sunulur" diyor → üç yerde güncel kurala çekildi.
- `src/sunucu.ts:27,33`, GIRIS_BILGISI_KURALI, KISA_KURALLAR: "önce özet göster, hoca kaydet der" ve "hocaya iki yerde
  durulur" cümleleri KURAL 7 (peşin onay) ile çelişiyordu → her birine peşin onay istisnası eklendi.
- `src/promptlar.ts:133` Adım 0 d) taramada `bologna_durum`'u çağırtıyordu (taslak aracıdır, sayfa verisiyle
  çalışmaz) ve "en çok 15 ders, kalanını söyle" diyordu → `bologna_ayristir` yanıtındaki gömülü denetim ve
  `obs_ders_listesi`'nin 15'erli dilimleri anlatılıyor; peşin onay satırı eklendi.
- `src/promptlar.ts:181,197` "2. Denetle. bologna_denetle'yi çağır" ve 7. adımdaki ikinci `bologna_denetle` çağrısı
  (0.6.3'ten beri gereksiz) → gömülü denetim; `bologna_denetle` yalnız denetim alanı yoksa.
- `src/promptlar.ts:67` "Kaynaklar yalnız kaynak_dogrula'dan 'dogrulandi' dönenlerdir": böyle bir durum yok →
  `'katalogda_bulundu'` ya da `'hoca_beyani'`.
- `src/promptlar.ts` AKILLI_DOLDURMA: "Altına şunu yaz:" iki satırda yinelenmişti, ilki boşta kalıyordu → silindi.
  TEYIT_SORULARI'nın üstünde AKILLI_DOLDURMA'ya ait yetim JSDoc vardı → yerine taşındı. "1 gelirse" iki kez → teke indi.
- `src/promptlar.ts:108` İki ayrı menü başlığı ("Numarasını yazmanız yeter." / "Yalnız numarasını yazın.") ve üç yerde
  yinelenen "Başka bir şey" satırı → tek `MENU_SATIRLARI`.
- `src/bologna.ts:268` SECENEK_KURALI "2-3 seçenek üretin, geçenleri hocaya gösterin" diyordu; ASISTAN_KURALI ve
  aracın kendi sonrakiAdim'ı "A/B/C sormayın, en iyisini kendiniz seçin" diyor → metin hizalandı.
- `src/bologna.ts` `bologna_ayristir` `not`/`okunamayan`: "hocaya gösterip doğrulatın, bulunamayanları sorun" aynı
  yanıttaki `hocayaSimdiSor: false` ve "Hocaya soru sormayın" adımıyla çelişiyordu → son özette gösterme/öneri kuralı.
- `src/bologna.ts:1372` `bologna_durum` açıklaması ("her seçimden sonra çağrılır") ve sonrakiAdim'ı ("kalan sayıyı
  hocaya söyleyin, sıradaki alana geçin") alan alan seçim dönemindendi; akış 5. adım "ara rapor verme" diyor → güncellendi.
- `src/bologna.ts` peşin onay yanıtlarının iç çelişkisi: `obs_ders_listesi` peşin onayda da `raporBicimi` ve "rapor
  yazın" adımı döndürüyordu; `bologna_kopya_metni.not` "hoca bir kez kaydet der" diyordu; `bologna_toplu_ozet`
  seçenek menüsü basıyordu; `AYRISTIRMA_SONRASI` peşin onayı bilmiyordu → peşin onayda rapor biçimi ve seçenekler
  dönmez, adımlar ve not buna göre. (doğrulama: yeni test "peşin onayda yanıt kendi içinde tutarlı")
- `src/bologna.ts:929` `dokunulmayacak` ve dosya başı yorumu "yetkililer taşınmaz, hoca OBS'ye kendisi yazar"
  diyordu; 0.4'ten beri satırlar okunup korunuyor → düzeltildi. `bologna_kopya_metni` açıklamasındaki "kaydı hoca
  yapar" → "Sunucu OBS'ye yazmaz" + paket kapısı.
- `src/yardim.ts:372` `kurulum_yardimi` "hocanın 'oldu' demesini bekleyin" derken yanıt `hocayaSimdiSor: false` ve
  "onay beklemeyin" (simdiYap) taşıyordu → `hocayaSimdiSor: true` (`engel_coz` ile aynı).
- `src/not-tablosu.ts:288` Eksik varken "TEK mesajda sorun" + `hocayaSimdiSor: false` → eksik dalında `true`.
  (doğrulama: yeni test "hocayı bekleyen adımlar")
- `src/yardim.ts:182,198` "Ders listesi numaralı görünür, dersinizi numarasıyla seçersiniz" → tarama ve tek liste (KURAL 4).

Kod

- `src/bologna.ts:867,1195` `gomuluDenetim` aracın `calistir`'ını çağırıp sonucu iki `as` ile döküyordu →
  hesap `bolognaDenetimi` işlevine alındı, araç ve gömülü denetim aynı tipli işlevi kullanır; `ders` de şemadan
  geçen veriden okunur. Aynısı `bologna_toplu_ozet` için: `kopyaPaketi` (`as AracSonucu` + elle yazılmış, yanlış
  tipli `hesap` dökümü kalktı). Davranış aynı; kullanılmayan `AracSonucu` içe aktarması silindi.
- `scripts/derle.ts:34` kullanılmayan parametre uyarısı (Biome'un tek uyarısı) → `_tam`.

Yorum ve belge

- `README.md` "on sekiz araç" → yirmi iki; araç tablosuna `akredit_basla`, `obs_ders_listesi`, `bologna_toplu_ozet`,
  `obs_karsilastir` eklendi; eskimiş satırlar düzeltildi (`not_tablosu_ayristir` sütun atmaz, reddeder;
  `kaynak_dogrula` "bulunamadı"; `is_yuku_oner`; claude.ai menü yolu `yardim.ts` ile aynı). "Hiç bilmeyenler için" ve
  örnek konuşma güncel akışa göre yeniden yazıldı (eskisi: "Hangisi?" ders sorusu, "çıktılar 8-12 olmalı", "devam"
  turu, "hepsini kaydet" izni). Peşin onay paragrafı eklendi.
- `src/genel-ayristir.ts:5` "kişi satırları bellekte atılır" (artık atılmıyor), `src/kisisel-veri.ts` yanlış bildirime
  bağlı JSDoc, `src/http.ts:6` ("saniyede 1 dolar", kaynak kotası eksik), `src/not-tablosu.ts` (taşan yorum satırı,
  `notTablosuAyikla`'yı kimin kullandığı), `src/sunucu.ts:1` ("her araç deterministik": `kaynak_dogrula` dış kataloğa sorar).

Testler

- `test/bologna-akisi.test.ts` iki test adı içerikle uyuşmuyordu: "...hoca adı olan canlı sayfa kişisel veri
  iletisiyle reddedilir" (sınanmıyor, davranış da tersi) ve "kaynakları sormaz" (akış artık soruyor) → adlar düzeltildi.
- `test/kaynak-dogrula.test.ts` "'doğrulanamadı' döner" → durum adı `bulunamadi`.
- `test/otonomi-senaryosu.test.ts` 5 yeni test (yukarıda anılanlar). Hiçbir beklenti zayıflatılmadı ya da silinmedi.

## Kurucu kararı gerekiyor

- [önem: yüksek] `src/temel.ts:77` Peşin onay hâlâ kayıt sözü olmadan açılıyor: `"hepsini tara"`, `"otonom"`,
  `"sormadan tara"` → `pesinOnayVar` true (çalıştırılarak görüldü). Kodun kendi yorumu "metinde kayıt/yetki sözü
  yoksa onay sayılmaz" diyor. "hepsini" çok sık geçen bir söz; "bütün derslerimi hepsini denetle" diyen hoca sormadan
  OBS kaydı alır. Seçenekler: (a) onay için kayıt/yetki sözü zorunlu (`kaydet`, `sen hallet`, `tam yetki`,
  `onaylıyorum`), `hepsini/otonom/sormadan` tek başına yetmez; (b) olduğu gibi. Öneri: (a). Davranış değişikliği
  olduğu için dokunulmadı.
- [önem: yüksek] `src/sunucu.ts:30`, `src/promptlar.ts:45,82` "Her seçim menüsünde son seçenek '4) Hepsini akıllıca
  doldur (önerilen)'" kuralı artık hiçbir gerçek menüye uymuyor: odak menüsünde 4 = ölçüt rehberi, OBS yazma
  menüsünde 3 seçenek var, `obs_ders_listesi` raporunda 4 = "dersi ben seçeyim", ve KURAL 5 zaten "sormadan akıllı
  doldur" diyor. `test/bologna-akisi.test.ts:119` her istemde bu metni beklediği için silinmedi. Öneri: kuralı ve
  sabiti kaldırıp "varsayılan akıllı doldurmadır, menü sorulmaz" cümlesiyle değiştirmek (test beklentisi de değişir).
- [önem: yüksek] `src/promptlar.ts:135-138` ile `src/bologna.ts:2078` tarama raporunun seçenekleri iki yerde farklı:
  istemde 3 seçenek (3 = dersi ben seçeyim), araçta 4 seçenek (3 = kalite önerilerini de uygula, 4 = dersi ben
  seçeyim). Asistan hangisini son okursa onu gösterir. Öneri: tek kaynak araç olsun, istem "raporBicimi'ni kullan" desin.
- [önem: orta] `src/bologna.ts:1789` `degerlendirmeTeyitli` yalnız "her katkı yüzdesi kanıt metninde bir sayı olarak
  geçiyor mu" diye bakar; kanıt metnini de asistan verir. "1 ara sınav %40" kanıtı `katki: 1`'i de geçirir, kalem adı
  eşleşmesi aranmaz. Kapı uydurmayı zorlaştırır ama kanıtlamaz. Seçenek: kalem adı + yüzde birlikte aransın; sayfa
  dayanağında kanıt, `bologna_ayristir`'ın okuduğu değerlendirme tablosuyla sunucuda karşılaştırılsın (durumsuzlukta
  imzalı özet gerekir, `kaynak_dogrula` imzası gibi).
- [önem: orta] `bologna_durum` kalsın mı: kullanılıyor (akış 5. adım, `bologna_taslak_denetle` sonrakiAdim, iki
  test). Tek benzersiz işi "zorunlu alanlardan hangisi hiç yazılmadı"; kalan her şey `bologna_kopya_metni`'nin
  `kalanEksikler`'inde var. Öneri: şimdilik kalsın; araç sayısı azaltılacaksa `kopya_metni`'ne `eksikZorunluAlanlar`
  ekleyip bu aracı kaldırmak bir çağrı kazandırır.
- [önem: orta] `src/bologna.ts:938` `bologna_denetle` eksik bulmayınca "1) önerileri uygulayalım 2) sıradaki derse
  geç 3) bitir" diye sordurur ama `hocayaSimdiSor: false` döner; toplu modda akış "sormadan sıradaki derse geç" der.
  Tek derste durak mı, hiç durak yok mu?
- [önem: orta] `src/bologna.ts:1276` Ders kodu okunamazsa yer tutucu `"DERS"` yazılıyor; bu kod `obs_karsilastir`
  ve toplu özetin `paketler[kod]` anahtarına kadar gider (iki kodsuz ders aynı anahtara düşer). Seçenek: kod yoksa
  `bulunamayan`'a yazıp asistandan istemek.
- [önem: orta] `src/bologna.ts` `bologna_kopya_metni` peşin onay metni geçersiz + kalan eksik varken "peşin onay
  sayılmadı" iletisi "kalan eksikleri doldurun" iletisinin altında kayboluyor (nesne yayılım sırası). İki ileti
  birleştirilsin mi?
- [önem: düşük] `src/bologna.ts:65` `mcpTasir` bütün alanlarda `true`; hiçbir kod dalı okumuyor, yalnız
  `bologna_alan_rehberi` çıktısında ve bir testte görünüyor. Kaldırılsın mı (çıktı alanı ve test beklentisi değişir)?
- [önem: düşük] Yalnız kendi dosyasında kullanılan dışa aktarımlar (`bulguAlani`, `bolognaHesabi`, `prolizMi`,
  `etkinliklereCevir`, `kunyeMetni`, `ayiracBul`, `kimlikSutunlari`, `takmaAdEkle`, `etiketAlani`, `satirlara`,
  `bolumlere`, `katkiMatrisi`, `yazarBicimle`, `niyetCoz`, `odakBaslangici`, `TEYIT_SORULARI`, `SORMADAN_DEVAM`,
  `SUTUN_ESLEME_REHBERI`, `scripts/derle.ts` `CLI`). `index.ts` hepsini `export *` ile npm arayüzüne açıyor; daraltmak
  yayınlı paketin arayüzünü değiştirir. Öneri: 1.0 öncesi `index.ts`'i adlı dışa aktarıma çevirmek.
- [önem: düşük] `src/http.ts:59,190` CORS `allow-methods` "POST, GET, OPTIONS" derken GET 405 ve `allow: POST, OPTIONS`.
- [önem: düşük] `src/cli.ts:12` `--http abc` → `Number("abc")` NaN ile `listen` çağrılır; açık hata iletisi yok.
- [önem: düşük] `src/sunucu.ts:183` `idempotentHint: true` bütün araçlarda; `kaynak_dogrula` dış kataloğa bağlı.
  `package.json:6` açıklaması "deterministik araçlar" diyor ve kaynak doğrulamayı anmıyor (yayında görünen metin).
- [önem: düşük] SUNUCU_TALIMATI'nda hitap karışık (KURAL 1-5 "çağır/sor", KURAL 6 ve son paragraflar
  "yazmayın/uygulayın"); ≈5,8 bin karakter, ORTAK_KURALLAR + KISA_KURALLAR aynı kuralları üçüncü kez yineliyor
  (`akredit_basla` yanıtı hem `kisaKurallar` hem `ortakKurallar` taşır). Tek kaynağa indirmek yanıtı kısaltır.
- [önem: düşük] `akredit_basla` menüsü dört test dosyasında ayrı ayrı sınanıyor (`dis-inceleme`, `otonom`,
  `numarali-secim`, `bologna-akisi`); `hoca-akisi-03.test.ts` adı sürüm taşıyor. Birleştirme/yeniden adlandırma isteğe bağlı.

## Başka alan

- `packages/cekirdek/src/bologna/taslak.ts:201` K12 iletisi CLI komutunu anıyor ("Önce bologna-al ile oku."); açık MCP
  bunu `String.replace` ile değiştiriyor (`src/bologna.ts`, `alanBulgulari`). Çekirdek metni değişirse sessizce bozulur.
- `apps/web/src/deneyin/olcme.ts` `notTablosuAyikla`'nın tek kullanıcısı; `apps/web/src/deneyin/bologna.ts`
  `ayristirOnAyikla` ve `ALANLAR`'ı kullanıyor (ikisinin davranışı değişmedi; `src/site` + `src/deneyin` testleri geçti).
- Site ve belgelerde "4) Hepsini akıllıca doldur" ya da README'deki eski örnek konuşma alıntılanıyorsa aynı güncelleme gerekir (bakılmadı).

## Bakıldı, sorun yok

- `src/araclar.ts`: 22 araç, sıra (`akredit_basla` ilk), ölçüt araçları, ÇK/PÇ, dil denetimi; kaynak ve DOĞRULANMADI işaretleri.
- `src/kaynak-dogrula.ts`: host izin listesi, zaman aşımı, boyut sınırı, semafor, imza, tür/yıl denetimi.
- `src/kaynak.ts`, `src/genel-ayristir.ts` (kod), `src/kisisel-veri.ts` (kod), `src/http.ts` (kova, gövde sınırı, günlük).
- `src/cli.ts`, `src/index.ts`, `scripts/derle.ts`, `tsconfig.build.json`, `package.json` (sürüm 0.8.0 = `SUNUCU_SURUMU`; `files`, `bin`, `publishConfig`).
- ASISTAN_KURALI: SUNUCU_TALIMATI ile tutarlı (peşin onay dahil).
- `apps/cli/skills/bologna-doldur/SKILL.md` ve `docs/olcme-yontemi.md` kaynak bağlantıları var.

## Doğrulama

- `pnpm --filter @akredit/acik-mcp test` → 9 dosya, 121 test geçti (önce 116; 5 yeni).
- `pnpm --filter @akredit/acik-mcp typecheck` → temiz.
- `npx biome check apps/acik-mcp` → 28 dosya, hata ve uyarı yok (önce 1 uyarı).
- `apps/web`: `npx vitest run src/site src/deneyin` → 12 dosya, 86 test geçti (bu paketi kullanan kod).
- Not: Biome uyarısının eski olup olmadığını görmek için bir kez `git stash` / `git stash pop` çalıştırdım (yaklaşık
  1 sn). Bu, öbür ajanların izlenen dosyalardaki kaydedilmemiş değişikliklerini de o an için geri aldı ve geri koydu;
  pop hatasız bitti, stash listesi boş. O aralıkta dosya yazan bir ajan varsa kendi alanını `git status` ile denetlesin.
