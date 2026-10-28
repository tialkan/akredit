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

- **Başlık:** Source Serif 4 (değişken, OFL 1.1, `@fontsource-variable/source-serif-4`), 600 ağırlık.
- **Metin ve arayüz:** Source Sans 3 (değişken, OFL 1.1), 400 gövde, 600 vurgu.

Gerekçe: Akredit'in ürettiği şey yönetmelik, kılavuz ve rapor dilidir. Serif başlık bu belgelerin ağırbaşlı sesini
taşır, ama bir kamu kurumunun yazı tipini taklit etmez. İki aile aynı tasarım ailesindendir (Adobe, Frank Grießhammer
ve Paul D. Hunt); x yüksekliği ve oranları uyumludur, yan yana durduklarında iki ayrı marka gibi görünmez. Türkçe
karakterlerin tamamı latin ve latin-ext alt kümelerindedir; yalnız bu iki alt küme yüklenir. Fontlar yerel
barındırılır, `font-display: optional` ile sayfa kaymaz. Inter, Poppins, Space Grotesk, Manrope, DM Sans
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

## Ekran görüntüleri

`docs/tasarim/ekranlar/`: `ana-sayfa`, `ne-yapar`, `nasil-calisir`, `panel`, `onay-kutusu`; her biri 375, 768 ve
1440 px. Yeniden üretmek: `AKREDIT_ORNEK_VERI=1 pnpm --filter @akredit/web build`, sunucuyu 3108'de açıp
`node apps/web/scripts/ekran-goruntusu.ts http://127.0.0.1:3108`.
