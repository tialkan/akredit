# 2. Tanıtım sitesi ve tarayıcı araçları

Kapsam: `apps/web/src/app/(site)/**`, `apps/web/src/site/**`, `apps/web/src/deneyin/**`, `apps/web/public/**`,
`apps/web/e2e/**`, `apps/web/src/app/{sitemap.ts,robots.ts,layout.tsx,globals.css}`. Satır numaraları düzeltme
sonrasındaki dosyaya göredir.

## Düzeltildi

Eskimiş akış anlatımı (MCP 0.8.0; kaynak: `apps/acik-mcp/src/promptlar.ts` Bologna istemi, `sunucu.ts` KURAL 4 ve 7):

- `apps/web/src/app/(site)/mcp-kullan/page.tsx:19` Örnek konuşma eski akışı anlatıyordu ("1) Alan alan 2) Yalnız
  boşlar 3) Numaraları seçeyim 4) Hepsini akıllıca doldur", tek ders, "Kaydet'e siz basın?") → yeni akışa göre
  yeniden yazıldı: giriş, ders listesini sormadan tarama, tek eksik özeti ve üç seçenek, doldurma, tek değişiklik
  özeti (OBS'ye yaz ve kaydet / formu doldur / kopya metni), kayıt, geri okuma, Onaya Gönder hocada. Odak menüsü
  artık elle yazılmıyor, ana sayfadaki gibi `AKREDIT_ODAKLARI`'ndan okunuyor (elle yazılan beş satır sunucudaki
  adlarla aynı değildi). Ders, sayı ve kişiler kurgu; sayfada "Kurgu ders, kurgu OBS, kısaltılmış" notu duruyor.
- `mcp-kullan/page.tsx:52-82` "Hiç bilmeyenler için": "Beş seçenekli bir menü" (menü altı seçenekli) → "Numaralı
  odak menüsü"; "Ders listeniz numaralı" → asistanın listeyi kendisinin taradığı; "4 yazarsanız..." → önerilen
  seçenek, tek özet, Onaya Gönder hocada.
- `mcp-kullan/page.tsx:127-140` "İlk 2 dakika": "4) Hepsini akıllıca doldur" maddesi → sormadan tarama ve tek özet;
  peşin onay paragrafı eklendi ("hepsini yap ve kaydet": ara soru yok, sonda tek rapor, sayfada olmayan yüzde ve
  kaynak EKSİK kalır, Onaya Gönder hocada).
- `apps/web/public/llms.txt:3` Özet eski akışı anlatıyordu ("asistan hangi aracın kullanılacağını sorar", "Her
  menüde 4) Hepsini akıllıca doldur") → numaralı odak menüsü, sormadan tarama, peşin onay, tarayıcı araçları.
- `apps/web/public/llms.txt:9` Ana sayfa satırı "iki adım" diyordu → dört adımlı kurulum.
- `apps/web/src/site/icerik.ts:50` `SAYFALAR.ana.aciklama` "İki adımda başlayın..." (ana sayfa artık dört adım; bu
  metin arama sonucu açıklaması ve JSON-LD Organization/SoftwareApplication açıklamasıdır) → adım sayısı
  söylemeyen, araçları sayan metin.

Kalmış eski atıf, kırık bağlantı:

- `mcp-kullan/page.tsx:267` "Demo" bağlantısı hâlâ `/deneyin`'e gidiyordu (demo `/kurum-demosu`'na taşındı) →
  `/kurum-demosu`, bağlantı metni "Kurum demosu".
- `apps/web/src/app/(site)/kimler-icin/page.tsx:54` "Akışın tamamı ana sayfada" bağlantısı `/#donem`'e gidiyordu;
  ana sayfada bu bölüm artık yok, `id="donem"` `/nasil-calisir`'da → `/nasil-calisir#donem`, metin "Nasıl çalışır
  sayfasında". (e2e bağlantı testi çapayı ayırıp baktığı için bunu yakalamıyordu.)
- `icerik.ts:207` `SAYFALAR.proje.aciklama` "tamamlanmamış demo" diyordu; `DEMO_NOTU` ve bütün site "demo hazır,
  askıda" diyor → "askıdaki demo".
- `icerik.ts:870` SSS "Şu an kullanabilir miyiz?": üç yolun ikincisi askıdaki demoydu, tarayıcı araçları hiç
  geçmiyordu → üç yol: kendi yapay zekânız, tarayıcıdaki araçlar, kendi sunucunuz; demo askıda ayrıca söyleniyor.
  (Bu metin `/sss` JSON-LD FAQPage'e de girer.)
- `apps/web/src/app/sitemap.ts` `/deneyin` site haritasında yoktu (SAYFALAR'da kaydı yok; çalışan, canonical'i
  olan, llms.txt'te anılan sayfa) → `EK_YOLLAR` ile eklendi. `/kurum-demosu` bilerek eklenmedi, karar listesinde.

Tarih:

- `icerik.ts:6` `SON_GUNCELLEME` 2026-10-28 → 2026-11-11 (sitemap `lastModified`).

Yinelenen sabit:

- `mcp-kullan/page.tsx` yerel `MCP_ADRESI = "https://akredit.org/mcp"` kopyası → `site/kurulum.ts`'ten (o da
  `@akredit/acik-mcp`'den) alınıyor. Elle yazılmış `claude mcp add ...` satırı → `CLAUDE_CODE_KOMUTU`.
- `apps/web/src/site/yapisal.ts:32-33` JSON-LD'de elle yazılmış kurucu adı, LinkedIn ve depo adresi →
  `PROJE_SAHIBI`, `ILETISIM_ADRESI`, `DEPO_ADRESI`. Çıktı aynı.
- `apps/web/src/app/(site)/iletisim/page.tsx:33` elle yazılmış depo adresi → `${DEPO_ADRESI}/security/advisories/new`.

Ölü kod (hiçbir sayfa, test ya da betik kullanmıyordu; `grep -rw` ile doğrulandı):

- `icerik.ts` `SISTEMIN_ISI`, `INSANIN_ISI` ("Ana sayfa" bölümü; ana sayfa artık kullanmıyor) ve `IS_BOLUMU` silindi.
- `apps/web/src/site/bilesenler.tsx` `TaslakNotu` bileşeni silindi (hukuk sayfalarındaki taslak notu kalktığından beri
  kullanılmıyor).
- `apps/web/src/app/globals.css` `.belge-izgara` kuralı silindi (kullanan öğe yok).

Eskimiş yorum:

- `apps/web/src/site/kurulum.ts:3`, `site.test.ts:200,220` "akredit yazın ikinci adımdır / iki adım" → Adım 4.
  (Testte yalnız `describe` adı ve bir yorum değişti; beklenti değişmedi.)
- `apps/web/src/site/platform-durumu.tsx:1`, `icerik.ts` `PLATFORM_DURUMU` yorumu "Ana sayfada" diyordu; bileşen ana
  sayfada kullanılmıyor (proje, kurum-ac, pilot, giris) → düzeltildi.

Doğrulama: aşağıdaki "Doğrulama" bölümü.

## e2e'de dokunulan yerler

Yok. `apps/web/e2e/**` altında hiçbir dosya değişmedi. Sayfa tarafındaki değişikliklerin e2e beklentilerine etkisi
okunarak denetlendi:

- `duman.spec.ts` ana sayfa testi: h2 listesi, `details` sayıları (5 `kur-*`, 6 kimliksiz), 8 görsel, menü, alt
  menü beklentileri sayfayla tutarlı; ana sayfa bileşen yapısı değişmedi.
- `deneyin.spec.ts:206-207` ana sayfada `main a[href="/deneyin"]` ve `main a[href="/kurum-demosu"]` birer tane:
  değişmedi (ana sayfaya bağlantı eklenmedi).
- `baglantilar.spec.ts` `/mcp-kullan`'daki yeni `/kurum-demosu` ve `/kimler-icin`'deki `/nasil-calisir#donem`
  bağlantıları var olan sayfalara gider (ikisi de `e2e/sayfalar.ts`'te 200 beklenen sayfa).
- `duman.spec.ts:142-144` sitemap beklentileri (`/yapay-zeka`, `/proje`) korunuyor; `/deneyin` ek satırdır.
- `/mcp-kullan` metnine (örnek konuşma, "Beş seçenekli" vb.) bakan e2e beklentisi yok (`grep` ile bakıldı).

## Kurucu kararı gerekiyor

- [önem: yüksek] `apps/web/src/site/icerik.ts:43` `/deneyin` ve `/kurum-demosu` `SAYFALAR`'da yok. Sonuç: ikisinin
  de paylaşım kartı (Open Graph) kök yerleşimin genel başlık ve açıklamasını taşır ("Akredit", platform cümlesi),
  JSON-LD ve kırıntı yolu yok; `/kurum-demosu` site haritasında yok. `/deneyin` haritaya bu turda eklendi.
  Seçenekler: (a) ikisini de `SAYFALAR`'a alıp `sayfaUstVerisi` + `YapisalVeri` kullanmak (birim testleri başlık
  uzunluğu ve özgünlüğü denetler; `/deneyin`'de `Link` ön yüklemesi "istek yok" e2e sözünü etkilemez, üst veri
  sunucuda üretilir); (b) `/kurum-demosu`'nu askıda olduğu için haritanın dışında bırakmak. Öneri: `/deneyin` için
  (a); `/kurum-demosu` askıdayken haritaya girmesin, ama paylaşım kartı düzelsin.
- [önem: yüksek] `apps/web/src/site/tanitim.tsx` Sağ alttaki Mükerrer Frekans tanıtımı `(site)/layout.tsx` içinde,
  yani KVKK, gizlilik, koşullar, güvenlik ve `/deneyin` dahil her site sayfasında çıkıyor. İki konu: (1) Ürünle
  ilgisiz bir tanıtımın hukuk metni sayfalarında ve "veriniz tarayıcıdan çıkmaz" sözü verilen `/deneyin`'de
  görünmesi isteniyor mu (logo isteği aynı kaynaktan, dış istek yok)? Seçenek: yalnız ana sayfada göstermek.
  (2) Klavye: ilk Sekme tuşunda kutu kapanıyor (odağı örtmesin diye, WCAG 2.4.11), bu yüzden klavye kullanıcısı
  bağlantıya hiç ulaşamıyor (WCAG 2.1.1 açısından tartışmalı; içerik zorunlu değil). Seçenek: kutuyu DOM'da ilk
  odaklanabilir öğelerden yapmak ya da kapatmak yerine odak geldiğinde süreyi durdurmak (zaten var) ve sayfa altına
  boşluk bırakmak. Öneri: yalnız ana sayfa; klavye davranışı karar.
- [önem: orta] `apps/web/src/app/(site)/mcp-kullan/page.tsx:56` ve ana sayfa terimleri tutarsız. Ana sayfa
  (`page.tsx:76-140`) kurucunun ekran görüntülerindeki Türkçe arayüzü kullanıyor: "Ayarlar, Bağdaştırıcılar, Ekle,
  Özel bağdaştırıcı ekle". `/mcp-kullan` ve ana sayfadaki "Başka bir uygulama" kutuları MCP rehberinden
  (`apps/acik-mcp/src/yardim.ts`) geliyor: "Customize (Özelleştir), Connectors (Bağlayıcılar), Add custom
  connector". Aynı şeye iki ad: bağdaştırıcı / bağlayıcı. Hangisi esas alınacak? Değişiklik MCP rehberine de dokunur
  (1. alan).
- [önem: orta] `apps/web/src/app/(site)/gizlilik/page.tsx`, `kvkk/page.tsx`, `kosullar/page.tsx` Hukuk metinleri
  "site, açık araç, demo" diye üç bağlam sayıyor; tarayıcıda çalışan araçlar (`/deneyin`: veri tarayıcıdan çıkmaz)
  ve sağ alttaki dış tanıtım bağlantısı metinlerde geçmiyor. İçerik hukuk kararıdır; dokunulmadı.
- [önem: orta] `apps/web/src/site/icerik.ts:240` ve `site.test.ts:249` yorumları "Hukuk metinleri avukat
  incelemesinden geçti (kurucu, 05.11.2026)" diyor. Kullanıcıya görünen metinde böyle bir ifade yok (e2e
  `duman.spec.ts:169` de yokluğunu sınıyor). Yorumun dayanağı depoda belge olarak yoksa `DOĞRULANMADI` sayılmalı;
  yorum kalsın mı, kaynağı eklensin mi?
- [önem: orta] `apps/web/public/gorsel/` hiçbir yerden atıf almayan dosyalar (yaklaşık 1,6 MB, Docker imajına girer):
  `calisma-masasi.webp`, `calisma-masasi-480/960/1344.webp` (`GORSELLER.calismaMasasi` hiçbir sayfada kullanılmıyor)
  ve boyutsuz asıllar `amfi.webp`, `araclar.webp`, `arsiv.webp`, `avlu.webp`, `kagit-dokusu.webp` (kod yalnız
  genişlikli türevleri ister; asıllar yalnız `docs/tasarim/gorseller.md`'de anılıyor). Seçenek: silmek ya da asılları
  `docs/tasarim/` altına taşımak. Silme olduğu için yapılmadı.
- [önem: orta] `apps/web/src/site/sayfa-durumu.tsx` İstemci bileşeni (`usePathname` için gerekli) `icerik.ts`'in
  tamamını içe aktarıyor (1300 satır metin). `iletisim.ts` tam da bu yüzden ayrılmıştı. Ağaç budama çalışmıyorsa her
  site sayfasının istemci paketine bütün site metni girer. Öneri: `PROJE_GRUPLARI`, `projeSayfasi`, `gecerliDurum`
  küçük bir dosyaya (`site/proje-durumu.ts`) ayrılsın; paket boyutu ölçülmeden yapılmadı (derleme gerekir).
- [önem: orta] `apps/web/e2e/sayfalar.ts` `/belgeler` ve `/belgeler/<kılavuz>` listede yok; bu sayfalar axe, klavye
  ve bağlantı taramasına girmiyor (yalnız `/proje`'deki durum etiketi sınanıyor). Eklemek yerelde sınanamadığı için
  yapılmadı; CI'da denenmeli.
- [önem: orta] `icerik.ts` yalnız testin kullandığı içerik: `ROL_ANLATIMLARI` (749), `VAAT_CERCEVESI` (1010),
  `KONUM_TABLOSU` (1158), `DURUM_NOTU` (350; yalnız `barindirma.test.ts`). Hiçbir sayfada gösterilmiyor. Silmek
  ilgili test satırlarını da silmeyi gerektirir; test zayıflatma sayılmasın diye bırakıldı. Aynı durum
  `globals.css:213` `.onizleme-*` kuralları ve beş `@keyframes onizleme-*` için: kullanan bileşen yok, yalnız
  `site.test.ts` "hareket ve önizleme" testi CSS'te varlığını sınıyor.
- [önem: düşük] `apps/web/src/app/(site)/page.tsx:367,398` Ana sayfada Adım 3 ve Adım 4 bölümleri art arda
  `bg-zemin`; diğer bölümler zemin/yüzey diye dönüşümlü. Adım 4'teki örnek konuşma kutusu da `bg-zemin` olduğu için
  zeminden ayrışmıyor; "Takıldınız mı?" kartları `bg-yuzey` bölümde `bg-yuzey`. Büyük olasılıkla Adım 4 `bg-yuzey`,
  "Takıldınız mı?" `bg-zemin` olmalıydı. Görsel karar; tarayıcıda bakılmadan değiştirilmedi.
- [önem: düşük] `page.tsx:142-157` "İndir" düğmeleri belge sayfalarına gidiyor
  (`code.claude.com/docs/en/desktop`, `learn.chatgpt.com/docs/app`), fiyat "aylık 20 dolar" elle yazılı (ana sayfa
  SSS'de de). Adresler ve fiyat bu incelemede ağdan denetlenmedi: `DOĞRULANMADI`. Fiyat değişirse iki yerde kalır.
- [önem: düşük] `apps/web/src/app/(site)/acik-kaynak/page.tsx:36` `https://github.com/tialkan/akreddit` (çift d)
  bağlantısı: CLI aracının ayrı deposu mu, yazım hatası mı? `DOĞRULANMADI`.
- [önem: düşük] `icerik.ts:875` SSS'deki OpenRouter web arama fiyatı "28 Ekim 2026" tarihli; askıdaki kurum
  hizmetine ait ayrıntı SSS'de (ve FAQPage JSON-LD'de) duruyor. Kalsın mı?
- [önem: düşük] `apps/web/src/app/(site)/proje/page.tsx:59` "Bugün açık olan: kendi yapay zekânıza eklenen araçlar"
  yalnız MCP'yi sayıyor; tarayıcı araçları (`/deneyin`) da bugün açık. Bir bağlantı daha eklensin mi?
- [önem: düşük] `apps/web/src/site/hukuk-paketi.ts` ve `public/indir/akredit-kurum-hukuk-paketi.zip`: paket `/kvkk`
  sayfasından indiriliyor, içindeki belgeler "TASLAK, avukat incelemesi gerekir" başlıklı (test bunu şart koşuyor).
  Hukuk sayfaları "yayında" iken taslak paketin aynı sayfadan verilmesi tutarlı mı?

## Başka alan

- `apps/acik-mcp/src/sunucu.ts` `SUNUCU_TALIMATI` hâlâ "Her seçim menüsünde son seçenek '4) Hepsini akıllıca doldur
  (önerilen)'" diyor; `promptlar.ts` Bologna akışı ise "Nasıl doldurulacağını SORMA: varsayılan her zaman akıllı
  doldurmadır" diyor ve menüler üç seçenekli. Sunucu içinde çelişki (1. alan). Site yeni akışa göre yazıldı.
- `apps/acik-mcp/src/promptlar.ts` akredit menüsü altı seçenekli (beş odak + "Başka bir şey"); `AKREDIT_ODAKLARI`
  yalnız beşini verir. Site örnek konuşmaları beşini gösterir.
- `docs/adr/0008-mcp-odagi-barindirma-askida.md` madde 3 "Demo (/deneyin, sentetik Örnek Üniversitesi)" diyor; demo
  artık `/kurum-demosu` (5. alan; ADR değiştirilmez, yeni not ya da ADR gerekir).
- `apps/web/src/app/api/deneyin` (3. alan) demo oturumu ucu hâlâ `/api/deneyin` adında; sayfa `/kurum-demosu`.
  Çalışıyor, yalnız ad eski.
- `apps/web/src/app/api/_ortak/kopruler.ts:21` Biome uyarısı (`useOptionalChain`) inceleme sırasında bir ara göründü
  (3. alan).

## Bakıldı, sorun yok

- `ILETISIM_ADRESI` (LinkedIn) ve `ILETISIM_EPOSTA` kullanımı: iletişim sayfası, hata sayfaları, 404, kurum demosu,
  platform durumu, `security.txt`, `llms.txt`, e2e beklentileri tutarlı. Sponsor çağrısı her yerde LinkedIn.
- `/kurum-demosu`: `PROJE_GRUPLARI`'nda askıda, `llms.txt`'te askıda, `e2e/sayfalar.ts`'te var, ana sayfa bandı ve
  `PlatformDurumu` bağlantıları doğru. `/deneyin` sayfası, `sekmeler.tsx` ve paneller yalnız üç aracı içeriyor.
- `robots.ts`: kapalı yollar ve eğitim botları; `/kurum-demosu` ve `/deneyin` açık.
- İç bağlantılar: `(site)` ve `site` altındaki bütün `href`/`yol` değerleri var olan yollara gidiyor
  (`/kimler-icin#matris` çapası var).
- `"use client"`: `tanitim`, `belirme`, `kopyala`, `sayfa-durumu`, `deneyin/*` panelleri ve formlar gerçekten durum
  ya da tarayıcı API'si kullanıyor; gereksiz olan yok.
- `deneyin/crypto-tarayici.ts`, `deneyin/yz-tarayici.ts`: `next.config.ts` takma adlarıyla kullanılıyor, ölü değil.
- Ana sayfa: `ADIMLAR` ile bölüm başlıkları, `CLAUDE_ADIMLARI`/`CODEX_ADIMLARI` görselleri (8 dosya `public/gorsel/
  kurulum/` altında var, boyut öznitelikleri verili, alt metinleri var), örnek konuşma menüsü `AKREDIT_ODAKLARI`'ndan.
- `ornek-denetim.ts`: sayılar `bolognaDenetle` hesabından; e2e "Önce: 3 bulgu" ile uyumlu (birim testi var).
- `layout.tsx` (kök ve site): içeriğe geç bağlantısı, `lang="tr"`, adlı gezinme bölgeleri, 44 px hedefler.
- `globals.css`: hareket azaltma tercihi tanıtım kutusunu ve belirme hareketlerini kapsıyor.
- `public/marka/**`: hepsi atıf alıyor.

## Doğrulama

Son koşu (bütün değişikliklerden sonra):

- `pnpm --filter @akredit/web test`: 47 dosya, 382 test geçti.
- `pnpm --filter @akredit/web typecheck` (`tsc -p .` ve `tsc -p e2e`): temiz.
- `npx biome check apps/web`: hata yok; 1 uyarı (`e2e/pilot.spec.ts:106` `useDomNodeTextContent`). Önceden de vardı;
  Playwright `locator.innerText()` için yanlış alarm, `textContent` JSON-LD betiğini de okuyacağı için değiştirilmedi.
- e2e çalıştırılamadı (yerelde Playwright tarayıcısı yok); e2e dosyalarına dokunulmadı.

Not: ara koşularda `site.test.ts` ve `deneyin/olcut.test.ts` ile `tsc`, 1. alanın o sırada düzenlediği
`apps/acik-mcp/src/promptlar.ts:197` satırındaki geçici sözdizimi hatası yüzünden kırıldı; 1. alan düzeltince geçti.
İlk koşudaki tek gerçek hata benim `llms.txt` düzeltmemdendi (özet paragrafına `/deneyin` adresini parantezle
yazınca `llms.test.ts` o satırı sayfa satırı sandı); adres özetten çıkarıldı.
