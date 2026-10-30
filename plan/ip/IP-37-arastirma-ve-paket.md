# İP-37: Web araştırma, Bologna eksik giderme ve Word paketi

- **Durum:** tamam
- **Faz:** 6
- **Bağımlılık:** İP-03, İP-10, İP-15, İP-16, İP-23, İP-35, İP-36
- **Sahip olduğu yollar:** `packages/yz/src/web-arama/**`, `packages/yz/src/gorevler/kanit-avcisi/**`, `packages/baglayicilar/src/web-tarama/**`, `packages/servis/src/arastirma/**`, `packages/servis/src/bologna/eksik-giderme.ts`, `packages/servis/src/bologna/eksik-giderme.test.ts`, `packages/servis/src/word-paketi/**`, `packages/belge/src/docx-uret.ts`, `packages/belge/src/paket.ts`, `packages/belge/test/paket.test.ts`, `packages/vt/src/gocler/0011_dis_ornek.sql`, `apps/web/src/app/panel/dersler/[id]/arastirma/**`, `docs/adr/0006-dis-ornek-kanit-degildir.md`, `docs/raporlar/IP-37.md`
- **Büyüklük:** büyük

## Amaç

Hocanın ders sayfasından tek tıkla (1) Bologna eksiklerini giderecek düzeltme taslağını alması, (2) ölçüte uygun kanıt adaylarını kurumun kendi havuzunda ve sitesinde, örnek uygulamaları başka kurumlarda bulması, (3) her şeyi düzenlenebilir bir Word paketi olarak indirip düzenledikten sonra geri yükleyebilmesi. Model öneri verir; karar ve beyan hocadadır.

## Kapsam

1. **OpenRouter web araması** (`packages/yz/src/web-arama`): `openrouter:web_search` sunucu aracı (önerilen) ya da `plugins:[{id:"web"}]` eklentisi. Parametre adları OpenRouter belgesinden (2026-10-28): `tools[].parameters.{engine,max_results,max_total_results}`, üst düzey `max_tool_calls`; eklentide `{id:"web", max_results, engine}`. Yanıttaki `message.annotations[].url_citation.{url,title,content}` zod ile doğrulanır, yapılandırılmış kaynak listesine çevrilir. İstek başına en çok sonuç kurum ayarından (`yz.webArama.enCokSonuc`, tavan 10). Kurumun yurt dışı YZ izni yoksa web araması da yapılmaz.
2. **Kurum sitesi tarayıcı** (`packages/baglayicilar/src/web-tarama`): yalnız kurumun alan adı (ve alt alan adları), robots.txt'ye uyar, en az 1 sn aralık, derinlik ve sayfa sınırı, yalnız HTML/PDF/DOCX. Bulunan belgeler `BaglayiciKanitGirdisi` olarak adres + erişim zamanı + SHA-256 ile kanıt hattına verilir. Sayfa metni modele talimat olarak geçmez.
3. **Kanıt avcısı** (`packages/yz/src/gorevler/kanit-avcisi`, `packages/servis/src/arastirma`): (a) kurum içi havuz ve site taraması → `kanit_etiketi` önerisi (onay bekler, alıntı ve kaynak adresiyle); (b) web araması → ayrı tür `dis_ornek` ("başka kurumdan örnek"). Dış örnek kanıt sayılmaz: veritabanı tetikleyicisi dış örneği kanıt tablosuna, kanıt-ölçüt bağlantısına ve atıfa sokmaz; servis rapora kanıt diye koymaz.
4. **Bologna eksik giderme** (`packages/servis/src/bologna/eksik-giderme.ts`): son okumadaki ders bulgularından ve deterministik hesaplardan (AKTS × 30 hedefi, iş yükü toplamı, değerlendirme toplamı, ÇK ve hafta sayısı, matris çelişkisi) düzeltme taslağı (`bologna-taslagi` görevi) üretir; hocaya `bologna_taslagi` önerisi düşer. Dış örnekler yalnız kaynak olarak listelenir, metinleri modele gitmez; taslakta dış örnekle benzer cümle varsa uyarı.
5. **Word paketi** (`packages/belge` `docxUret` + `paketUret`, `packages/servis/src/word-paketi`, `apps/web`): düzeltilmiş Bologna ders bilgi paketi (Proliz alan sırası), ders dosyası, bulgular ve kaynakça; her Akredit önerisi belgede işaretli. Birden çok belge .zip. Geri yüklenen .docx alan alan karşılaştırılır, fark hocanın kendi kararı olarak (yeni öneri + doğrudan karar, değiştirilemez günlük) kaydedilir.
6. **Arayüz ve site**: ders sayfasında "Eksikleri gider", "Kanıt ara", "Word olarak indir / yükle"; tanıtım sitesinde bu yetenekler, OpenRouter web aramasının motoru ve maliyeti, dış örneklerin kanıt sayılmadığı.

## Kabul ölçütleri

- [x] OpenRouter isteği belgedeki parametre adlarıyla kurulur; atıflar zod ile doğrulanır; izinsiz kurumda istek hiç gitmez; sonuç sayısı kurum tavanını aşmaz (ağsız test).
- [x] Tarayıcı alan adı dışına, robots.txt'nin yasakladığı yola, sınır ötesine gitmez; istekler arası ≥1 sn; yalnız HTML/PDF/DOCX alır; çıktıda adres, erişim zamanı, SHA-256 (fixture testi).
- [x] Kurum içi aday `kanit_etiketi` önerisi olur (alıntı + kaynak); dış örnek ayrı tür olur ve kanıt sayılamaz (veritabanı ve servis testi).
- [x] Eksik giderme: bulgular ve deterministik sayılar istemde; sayılar modelden alınmaz; öneri onay kutusuna düşer.
- [x] Word paketi indirilir (.docx, birden çoksa .zip), Akredit önerileri işaretli; düzenlenmiş dosya geri yüklenince alan farkı hocanın kararı olarak günlüğe girer (gidiş-dönüş testi).
- [x] Panel eylemleri ve site metinleri; `pnpm verify` temiz, `pnpm --filter @akredit/web build` başarılı.

## Günlük

- 2026-10-28: İP tanımlandı. OpenRouter belgeleri okundu: `online.md` (`:online` eskidi; sunucu aracı öneriliyor), `server-tools/web-search.md`, `plugins/web-search.md`.
- 2026-10-28: Uygulandı (dal `ip/37-arastirma-ve-paket`). Web araması (sunucu aracı + eklenti yolu, atıf doğrulama, kurum politikası ve tavan), kurum sitesi tarayıcısı, kanıt avcısı görevi ve servisi, `dis_ornek` türü ve 0011 göçü (ADR 0006), Bologna eksik giderme, Word paketi indirme/geri yükleme, 6 REST ucu, ders sayfası kartı, site metinleri. Testler ağsız. `pnpm verify` temiz, web derlemesi başarılı.
- Karar: dış örnek ayrı öneri türü; veritabanı tetikleyicileri kanıt kaydını, kanıt-ölçüt bağlantısını ve atıfı reddeder.
- Karar: Word geri yüklemesi yeni öneri + aynı kişinin doğrudan onayı; önceki öneri değişmez.
- Kalan: web sunucusunda araştırma ve Bologna köprülerinin (tarayıcı, metin çıkarma, depo) kurulması, işçide düzenli site taraması, ayarlar ekranında web araması anahtarı, OpenRouter yanıtının canlı doğrulanması. Ayrıntı: `docs/raporlar/IP-37.md`.
- 2026-10-28: Kalan açıklar kapatıldı (dal `ip/37-baglanti`): web sunucusunda araştırma ve Bologna köprüleri gerçek tarayıcı, metin çıkarma ve nesne deposuyla kuruldu (üretimde depo eksikse açık Türkçe hatayla durur; Coolify web hizmetine depo değişkenleri ve `akredit-kanit` birimi); işçide haftalık kurum sitesi taraması (`site` bağlayıcısı, kurum ayarına göre, hız ve sayfa sınırlı); ayarlar ekranına "Web araması" bölümü (yurt dışı izni yoksa devre dışı ve nedeni yazılı; servis de reddeder); Word paketi .zip servis testi ve Playwright panel testi. `pnpm verify` temiz, web derlemesi başarılı.
- Kalan: OpenRouter yanıtının canlı doğrulanması; site taraması ayarı için panel ekranı; ders sayfası araştırma eylemlerinin gerçek arka uçla tarayıcı testi.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `packages/yz/src/web-arama/web-arama.test.ts`, `packages/baglayicilar/src/web-tarama/web-tarama.test.ts`, kanıt avcısı, eksik giderme ve Word paketi testleri, e2e `arastirma.spec.ts`. Dalga 4-7 incelemesinde sorun bulunmadı. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kalan (ölçüt dışı): OpenRouter yanıtının canlı doğrulanması.
