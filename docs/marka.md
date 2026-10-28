# Akredit kurumsal kimliği

Kaynak dosyalar `apps/web/public/marka/` altındadır ve `pnpm --filter @akredit/web marka` ile
(`apps/web/scripts/marka-uret.ts`) yeniden üretilir. İşaretin yolları tek yerde tutulur: `apps/web/src/marka/isaret.ts`.

## İşaret ve anlamı

İşaret, büyük **A** harfinin iki kolu ile ortasından geçen bir **onay iminden** oluşur:
**A + onay = kanıtla doğrulanmış kalite.** A, akreditasyonu ve Akredit'i; onay imi, insanın kanıtı görerek verdiği
kararı anlatır. Onay imi A'nın içinde durur: karar, kanıtın ve sürecin dışında değil, içindedir.

Çizim QuiverAI ile üretilmiş ve seçilmiştir. Yayın sürümünde arka plan dikdörtgeni ve gölge yolu çıkarılmış,
görünüm kutusu çizimin sınırına (`4.62 9.8 70.69 60.25`) sıkılaştırılmıştır.

Akredit bağımsız, açık kaynak bir yazılımdır. Kimlik hiçbir kamu kurumunu (YÖKAK dahil) ya da akreditasyon
kuruluşunu çağrıştırmaz: ay-yıldız, mühür, arma, defne dalı, resmî rozet biçimi kullanılmaz.

| Dosya | Kullanım |
|---|---|
| `isaret.svg` | Açık zeminde tam renkli işaret |
| `isaret-acik.svg` | Koyu zeminde (lacivert baskı, sunum) işaret; sitede kullanılmaz |
| `isaret-tek-renk.svg` / `isaret-tek-renk-beyaz.svg` | Tek renk baskı, kabartma, faks, damga dışı her yer |
| `logo-yatay.png` / `logo-yatay-acik.png` | İşaret + "Akredit" kelimesi (site dışı belgeler için) |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180), `simge-512.png`, `uygulama-simgesi.svg` | Tarayıcı ve uygulama simgeleri |
| `og.png` (1200×630) | Paylaşım önizlemesi |

Sitede yatay logo bir React bileşenidir (`apps/web/src/bilesenler/logo.tsx`: `Logo`, `Isaret`). Kelime gerçek metindir,
yol değildir; yazı tipi SVG'ye gömülmez. Renkler belirteçlerden (`--isaret-a`, `--isaret-onay`) gelir.

**Tema kararı:** Sitede ve panelde yalnız açık tema vardır (`color-scheme: light`). Koyu tema bilinçli olarak
yapılmadı. Favicon dahil hiçbir dosyada `prefers-color-scheme: dark` kuralı yoktur.

## Renkler

Temel renkler: **lacivert `#10325B`** (güven, ciddiyet; birincil eylem) ve **petrol `#157C80`** (onay, doğrulanmış
durum; işaretin onay imi). Petrol, metin olarak açık zeminde kullanılacaksa bir ton koyusu `#12696D` kullanılır.

| Belirteç | Değer | Kullanım |
|---|---|---|
| `--zemin` | `#F5F7FA` | Sayfa zemini |
| `--yuzey` | `#FFFFFF` | Kart, üst menü, kenar çubuğu |
| `--yuzey-2` | `#E9EEF4` | Üzerine gelme, ikincil yüzey |
| `--metin` | `#0E1A2B` | Gövde metni |
| `--soluk` | `#4A5568` | Açıklama, ikincil metin |
| `--cizgi` | `#D3DAE3` | Süs çizgisi |
| `--cizgi-guclu` | `#7D8899` | Form alanı kenarı (3:1) |
| `--vurgu` | `#10325B` | Birincil düğme, bağlantı, etkin menü |
| `--vurgu-metin` | `#FFFFFF` | Vurgu zeminindeki metin |
| `--vurgu-zemin` | `#E3EBF5` | Etkin menü, seçili satır |
| `--petrol` | `#12696D` | Yalnız onay ve doğrulanmış durum (tek anlamlı ikinci renk) |
| `--petrol-zemin` | `#E1F1F1` | Onaylı durum zemini |
| `--odak` | `#B5520A` | Klavye odağı (markadan bilerek ayrık turuncu) |
| `--isaret-a` / `--isaret-onay` | `#10325B` / `#157C80` | Logo |
| `--risk-dusuk` (+`-zemin`) | `#1C6634` / `#E4F1E8` | Düşük risk (yeşil) |
| `--risk-orta` (+`-zemin`) | `#84470A` / `#FBEFDC` | Orta risk (amber) |
| `--risk-yuksek` (+`-zemin`) | `#A1221A` / `#FBE6E3` | Yüksek risk (kırmızı) |
| `--isi-0`…`--isi-5` | `#EEF1F5` → `#157C80` → `#10325B` | Matris ısı ölçeği |

Risk renkleri anlamını korur ve markadan ayrıdır: yeşil-amber-kırmızı, lacivert/petrol ile karışmaz. Risk her zaman
renkle birlikte simge ve sözcükle de gösterilir.

Erişilebilirlik: her metin/zemin çifti WCAG 2.2 AA'yı (metin 4.5:1, metin dışı öğe 3:1) geçer.
`apps/web/src/marka/kontrast.test.ts` `globals.css` dosyasını okur ve açık temadaki bütün çiftleri hesaplar; koyu tema
bloğu bulunursa hata verir. Palet değişirse test kendiliğinden yeniden ölçer.

## Koruma alanı

İşaretin çevresinde, işaret yüksekliğinin **yarısı** (½ A) kadar boş alan bırakılır. Yatay logoda bu ölçü işaretin
yüksekliğine göre alınır. Bu alana metin, çizgi ya da başka logo girmez.

## En küçük boyut

- İşaret tek başına: ekranda **16 px**, baskıda **5 mm** yükseklik. 16 px altında onay imi seçilemez.
- Yatay logo: ekranda **18 px** işaret yüksekliği (≈ 80 px genişlik), baskıda **20 mm** genişlik.
- 16 px favicon için `favicon.svg` / `favicon-32.png` kullanılır; daha küçük çizim yapılmaz.

## Yanlış kullanımlar

- İşareti germek, eğmek, döndürmek, yansıtmak.
- Renkleri değiştirmek; onay imini A ile aynı renge boyamak (tek renk sürümler dışında).
- Gölge, parıltı, eğim, çerçeve, kabartma eklemek; işareti bir rozet, kalkan ya da mühür içine koymak.
- Ay-yıldız, arma, mühür, defne gibi resmî simgelerle birlikte kullanmak ya da Akredit'i resmî bir kurum gibi
  sunmak.
- Açık sürümü açık zeminde, tam renkli sürümü koyu zeminde kullanmak (kontrast 3:1'in altına düşer).
- Fotoğraf ya da desen üzerine koruma alanı ve yeterli kontrast olmadan yerleştirmek.
- "Akredit" kelimesini başka yazı tipiyle yeniden çizmek ya da harf aralığını değiştirmek.

## Yazı tipi

**Source Sans 3** (değişken, SIL Open Font License 1.1; `@fontsource-variable/source-sans-3`): metin ve arayüz.
Logo kelimesi 700 ağırlık, harf aralığı −0,015 em; gövde 400, satır yüksekliği 1,6.
**Source Serif 4** 600 (OFL 1.1): yalnız h1 ve h2; Türkçe alt kümesi `apps/web/src/app/yazi/`. Gerekçe:
`docs/tasarim/README.md`. Türkçe karakterlerin tamamı
latin ve latin-ext alt kümelerindedir. Yazı tipi yüklenemezse sistem yazı tipi (`system-ui`) kullanılır.

## Kurallar (kullanıcı kararı)

- Kutuların, kartların ve menü öğelerinin solunda renkli dikey vurgu şeridi yoktur. Etkin menü öğesi zemin rengi ve
  yazı ağırlığıyla gösterilir. `apps/web/src/site/kurallar.test.ts` `border-l`, `border-left`, `border-s` ve içe gölge
  şeritlerini yakalar.
- Em dash, yasak kelimeler ve emoji aynı testle denetlenir.
- Köşeler küçüktür (2-4 px) ve gölge kullanılmaz. Ayrım ince çizgi ve zeminle yapılır.

## Ekran görüntüleri

Güncel görüntüler `docs/tasarim/ekranlar/` altındadır (yalnız açık tema; 375, 768, 1440 px): ana sayfa, ne yapar,
nasıl çalışır, panel, onay kutusu. Yeniden üretmek için `apps/web/scripts/ekran-goruntusu.ts`. `docs/marka/`
altındaki `ana-sayfa`, `nasil-calisir`, `yapay-zeka`, `panel`, `panel-ayarlar`, `giris` görüntüleri yeniden tasarımdan
öncesine aittir; kurulum ve kurum açılışı görüntüleri e2e testiyle yenilenir.
