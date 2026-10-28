# Tasarım kararları (site ve panel)

Bağlayıcı kural kümesi: [`kontrol-listesi.md`](kontrol-listesi.md) (kullanıcının web kontrol listesi). Maddelerin tek
tek durumu: [`denetim.md`](denetim.md). Renk ve logo: [`../marka.md`](../marka.md).

## Amaç

Sitenin tek amacı: bir kalite sorumlusu ya da öğretim elemanı, Akredit'in ne yaptığını, nasıl yaptığını ve kendisine
ne kaldığını ilk ekranda anlasın, ayrıntıyı kaynağıyla okuyabilsin.

İlk ekran üç soruyu sırayla cevaplar: "Üniversiteler için açık kaynak kalite güvencesi ve akreditasyon yazılımı"
(ne), başlık (kim ne yapar), giriş paragrafı (nasıl). Sağda değiştirilemez günlükteki bir onay kaydının örneği durur.

## Tema

Yalnız açık tema. `color-scheme: light`, `prefers-color-scheme: dark` kuralı hiçbir dosyada yok (favicon dahil).
`apps/web/src/site/kurallar.test.ts` ve `apps/web/src/marka/kontrast.ts` koyu tema kuralı bulursa hata verir.

## Yazı tipi

- **Başlık:** Source Serif 4, 600 ağırlık (OFL 1.1). `@fontsource/source-serif-4` dosyalarından Türkçe alt küme
  üretilir (`apps/web/scripts/baslik-yazi-tipi.py`, ~18 KB, `apps/web/src/app/yazi/`).
- **Metin ve arayüz:** Source Sans 3 (değişken, OFL 1.1), 400 gövde, 600 vurgu.

Gerekçe: Akredit'in ürettiği şey yönetmelik, kılavuz ve rapor dilidir. Serif başlık bu belgelerin ağırbaşlı sesini
taşır, ama bir kamu kurumunun yazı tipini taklit etmez. İki aile aynı tasarım ailesindendir (Adobe, Frank Grießhammer
ve Paul D. Hunt); x yüksekliği ve oranları uyumludur, yan yana durduklarında iki ayrı marka gibi görünmez. Türkçe
karakterlerin tamamı latin ve latin-ext alt kümelerindedir; yalnız bu iki alt küme yüklenir. Fontlar yerel
barındırılır (başlık yazı tipi alt kümesi ana sayfanın 350 KB aktarım bütçesine sığsın diye), `font-display: optional` ile sayfa kaymaz. Inter, Poppins, Space Grotesk, Manrope, DM Sans
kullanılmaz. IBM Plex de değerlendirildi; Source Sans 3 zaten markanın logo kelimesinde kullanıldığı için aynı aileden
serif seçildi ve yeni aile sayısı bire indi.

## İmza öğesi: paragraf ve dayanak numaraları

Ürünün ilk ilkesi "kanıtsız iddia yok". Site bu ilkeyi kendi dizgisinde uygular:

- **Dayanak numarası** (`[1]`, petrol renkte üst simge): olgusal her önemli iddia, sayfa sonundaki "Dayanaklar"
  listesinde depodaki kaynağına (dosya yolu, İP raporu, ADR) bağlanır. Numara ile liste arasında iki yönlü bağlantı
  vardır; hedef satır petrol zeminle belirir. Bileşenler: `Dayanak`, `Dayanaklar` (`apps/web/src/site/bilesenler.tsx`).
- **Paragraf numarası** (`§ 1`, Source Serif 4, petrol): sırayla okunan sayfa bölümleri yönetmelik dizgisindeki gibi
  numaralanır. Yalnız içerik gerçekten bir sıra olduğunda kullanılır (ana sayfa, nasıl çalışır, yapay zekâ, giriş ve
  hesap). Adım listeleri ve 404 aynı rakam dizgisini kullanır.

Ziyaretçi siteyi ekran görüntüsünden `§` ve `[n]` dizgisiyle tanır. Gradyan, gölge, ikonlu kart dizisi yoktur.

## Renk

Marka belirteçleri değişmedi (`docs/marka.md`): lacivert `#10325B` tek vurgu rengi (başlık, birincil düğme, bağlantı),
petrol yalnız onay ve doğrulanmış durum ile imza öğesi (numaralar). Risk renkleri anlamını korur.

## Biçim dili

- Köşe: kaplar 2 px (`rounded-sm`), düğme ve form alanı 4 px (`rounded`), durum noktası tam yuvarlak. Başka köşe yok.
- Gölge yok. Yüzen öğeler (yapışkan karar çubuğu, iletişim kutusu, bildirim) ince çerçeve ve arka perdeyle ayrılır.
- Solda dikey vurgu şeridi yok (site, panel, onay kutusu, uyarılar, menü). Etkin menü öğesi zemin tonu ve yazı
  ağırlığıyla gösterilir. `kurallar.test.ts` `border-l`, `border-s`, `border-left`, `border-inline-start` ve içe gölge
  şeritlerini yakalar.
- Düzen: geniş ekranda solda 17 rem başlık sütunu, sağda içerik ("dosya" düzeni). Tablolar yatay çizgiyle ayrılır.
- Ortada dev başlık ve iki düğme kalıbı yok: ilk ekran sola hizalı, tek birincil düğme ve metin bağlantıları.

## İçerik

- `apps/web/src/site/icerik.ts` tek doğruluk kaynağıdır. Her blok yorumda kod tabanındaki dayanağını yazar.
- Eklenenler: bir dönemin zaman çizelgesi (`DONEM_AKISI`, ana sayfa ve nasıl çalışır), rol başına karar yetkisi
  (`ROL_KARARI`, `@akredit/yetki` ile testte karşılaştırılır), bağlayıcı tablosu (`BAGLAYICILAR`: okur, okumaz),
  OpenRouter anahtarı için yedi adımlı kılavuz ve altı soruluk özet (yapay zekâ sayfası).
- Düzeltilen: giriş ve hesap sayfası kurumun kendi kendine açılamadığını yazıyordu; İP-35'ten beri açılabiliyor.
  Yapay zekâ sayfası arka plan işlerinin kurum anahtarına bağlanmadığını yazıyordu; İP-35'te bağlandı.

## Durum ekranları

- 404: `apps/web/src/app/not-found.tsx` (dizine eklenmez, gidilecek sayfaları listeler).
- Hata: `apps/web/src/app/error.tsx` (iç yapıyı göstermez, başvuru kodu verir, yeniden deneme).
- Yükleniyor: `apps/web/src/app/panel/loading.tsx` (hareket azaltma tercihinde durağan).
- Boş durumlar panelde önceden vardı (`BosDurum`, `apps/web/src/bilesenler/temel.tsx`).

## Otomatik denetimler

`apps/web/src/site/kurallar.test.ts`: em dash, yasak kelimeler, "sadece X değil, aynı zamanda Y" kalıbı, emoji, eksik
alt metin ve adsız SVG, sol vurgu şeridi, koyu tema. `apps/web/src/site/site.test.ts`: rol anlatımı ile yetki tablosu,
çerçeve sayıları, özgün başlık ve açıklama, canonical, JSON-LD. `apps/web/src/marka/kontrast.test.ts`: açık temadaki
bütün renk çiftleri. `apps/web/e2e/erisilebilirlik.spec.ts`: axe ile WCAG 2.2 AA.

## Tasarım v2: "bir tık daha etkileyici" (2026-10-28)

Amaç: aynı palet, aynı iki yazı tipi, aynı imza öğesi (§, [n]) ile daha cesur bir ilk ekran. Kural kümesi değişmedi:
açık tema, sol şerit yok, gradyan/cam/parıltı yok, gölge yok, köşe 2-4 px.

- **Tipografik ölçek:** ana sayfa h1 2,6 → 4,35 rem (satır aralığı 1,03, harf aralığı -0,03 em); alt sayfa h1
  3,75 rem; bölüm h2 2,1 rem. Hiyerarşiyi renk ya da süs değil, boy farkı taşır (kontrol listesi 14).
- **Kahramanda gerçek ürün:** günlük kaydının yerine paneldeki öneri kartının sadeleştirilmiş çizimi
  (`src/site/onay-onizleme.tsx`): risk etiketi, ÇK sağlanma hesabı (%71,4; eşik %60,0; 58 öğrenci), dayanak ve
  içerik özeti, Onayla/Düzelt/Reddet. "Örnek veri" diye etiketli (kontrol listesi 18, 104).
- **Anlam taşıyan hareket:** yükleme sonrası bir kez, yalnız CSS ile: Onayla basılır, durum "Onay bekliyor" →
  "Onaylandı" olur, kart çerçevesi petrole döner, "Günlüğe eklendi" satırı eklenir. Ürünün tek cümlelik anlatısı budur
  (kontrol listesi 17). `prefers-reduced-motion` tercihinde hiç oynamaz, son durum doğrudan görünür; ekran okuyucu son
  durumu okur ("Onay bekliyor" `aria-hidden`). İstemci betiği eklenmedi.
- **Dayanak vurgusu:** metindeki `[n]` üzerine gelince ya da klavyeyle odaklanınca sayfa sonundaki dipnot petrol
  zeminle belirir, dipnota gelince metindeki numara belirir. Yalnız CSS `:has()`; betik yok.
- **Ölçü şeridi (`Olculer`):** eşit genişlikli serif rakamlarla koddan sayılmış değerler: 14 ölçüt ve 46 alt ölçüt
  (`yokakOzeti()`, `site.test.ts` sabitler), 6 adım (`AKIS`), örnek dönemdeki dokunuş (`DONEM_AKISI`). Her rakamın
  yanında dayanak numarası. Ne yapar ve nasıl çalışır sayfa başlarında aynı şerit künye olarak durur. Rakamlar
  `.sayilar` ve tablolarda `tabular-nums`.
- **Belge ızgarası:** ilk ekranın arkasında, yalnız geniş ekranda, içerik ızgarasıyla hizalı on iki sütunluk ince
  çizgiler (çizgi rengi %45). Yönetmelik ve rapor sayfasının dizgi ızgarası; süstür, `aria-hidden`.
- **Bilinçli kırılmış ızgara:** ilk ekran 7/5 sütun; önizleme 5 rem aşağıdan başlar. Bölüm başlık sütunu geniş ekranda
  yapışkandır (kenar notu gibi) ve § numarasının üstünde ince bir kural çizgisi vardır.
- **Mikro etkileşim:** bağlantı altı çizgisi üzerine gelince 1 → 2 px; modül bağlantılarında çerçeve ve yazı
  lacivertleşir, dokunma hedefi 44 px. Bütün geçişler tek eğriyle: `--egri: cubic-bezier(0.32, 0.72, 0, 1)`.

### elayadesign/ai-design-skills'ten alınan ve alınmayan

Kaynak: `skills/landing-page-design/SKILL.md`. Kontrol listesiyle çelişen her yerde kontrol listesi kazandı.

Alınan: tek özel hareket eğrisi (`cubic-bezier(0.32,0.72,0,1)`, "varsayılan geçiş yok"); kahramanda gerçek ürün
görseli ve kanıtın iddianın yanında durması ("proof next to the claim"); içerik gerçekçiliği (yuvarlak olmayan
sayılar: %71,4, 58; uydurma marka yok); başlıkta `text-wrap: balance` (zaten vardı); tek kenarlı kart çerçevesi yasağı
(bizdeki sol şerit yasağıyla aynı yönde); basılı durum için 1 px aşağı kayma (önizlemedeki Onayla); tek birincil
eylem.

Alınmayan, neden: Geist/Manrope/Poppins yazı tipleri (Manrope ve Poppins kontrol listesi 26'da yasak; Source ailesi
korunur); başlıkta metin gradyanı ve cam menü, tam ekran bulanık menü (madde 27); kaydırmada bulanıklıktan beliren
bölümler ve kelime kelime parlayan "tagline reveal" (süs hareketi, madde 17; ayrıca betik gerektirir); italik yasağı
ve yalnız Tailwind adımlarına bağlı boyut tablosu (serif başlık ölçeği kendi oranıyla seçildi); kart içi iç içe köşe
kuralı (köşelerimiz 2-4 px); risk tersine çevirme ve SSS'nin ana sayfaya taşınması (ayrı SSS sayfası var, garanti
dili madde 105'e göre yok).

## Ekran görüntüleri

Tasarım v2 öncesi ve sonrası: `docs/tasarim/ekranlar/{ana-sayfa,ne-yapar,nasil-calisir}-v2-{once,sonra}-{375,768,1440}.png`.
Betik isteğe bağlı ikinci argümanla dosya adına ek koyar (`node apps/web/scripts/ekran-goruntusu.ts <adres> -v2-sonra`).

`docs/tasarim/ekranlar/`: `ana-sayfa`, `ne-yapar`, `nasil-calisir`, `panel`, `onay-kutusu`; her biri 375, 768 ve
1440 px. Yeniden üretmek: `AKREDIT_ORNEK_VERI=1 pnpm --filter @akredit/web build`, sunucuyu 3108'de açıp
`node apps/web/scripts/ekran-goruntusu.ts http://127.0.0.1:3108`.
