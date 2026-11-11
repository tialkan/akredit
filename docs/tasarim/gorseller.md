# Site görselleri

Tanıtım sitesindeki gravür görsellerinin kaynağı ve kullanıldığı yerler (İP-49).

## Kaynak

- Üretim: Midjourney, kurucunun hesabı, 2026-11-05.
- Tarz: lacivert mürekkep gravür, krem kâğıt zemin. Kurumsal paletle (lacivert #10325B) uyumludur.
- Asıl dosyalar `apps/web/public/gorsel/<ad>.webp` altındadır. Sayfalar asıl dosyayı değil, Pillow ile
  küçültülüp yeniden sıkıştırılmış kopyaları (`<ad>-<genişlik>.webp`, WebP kalite 50-55, doku 35) kullanır;
  tarayıcı `srcset` ile ekrana uygun olanı seçer. Bileşen: `apps/web/src/site/gorsel.tsx`.

## Görseller

| Dosya | Boyut | İstem özeti | Kullanıldığı yer | Alt metni |
|---|---|---|---|---|
| `calisma-masasi.webp` | 1344×896 | Pencere önünde ahşap masa, açık dizüstü, kitap ve dosyalar, fincan | Ana sayfa ilk ekranı (geniş ekranda metnin yanında, dar ekranda altında küçük; öncelikli yüklenir) | Anlamlı |
| `araclar.webp` | 1800×450 | Açık kitap, büyüteç, kontrol listesi, anahtar, dizüstü; yan yana şerit | Ana sayfa, "Takıldınız mı?" üstünde ince süs bandı (tembel yüklenir) | Süs (`alt=""`, `aria-hidden`) |
| `amfi.webp` | 1680×720 | Yüksek pencereli, basamaklı sıraları olan boş amfi | `/mcp-kullan` ilk ekranı | Anlamlı |
| `avlu.webp` | 1456×816 | Kemerli revaklar, ağaçlar ve havuzlu üniversite avlusu | `/proje` ilk ekranı | Anlamlı |
| `arsiv.webp` | 1000×1000 | Kurdeleyle bağlanmış dosya ve defter yığını | 404, 500 ve bakım sayfalarında küçük görsel | Süs (`alt=""`, `aria-hidden`) |
| `kagit-dokusu.webp` | 1456×816 | Çok soluk, ince çizgili eski kâğıt dokusu | 12.11.2026'dan beri kullanılmıyor (yerine `tasarim/arkaplan.webp`) | CSS arka planı |
| `tasarim/arkaplan.webp` | 1800×600 | Sabah Ankara tepeleri, uzakta küçük kale silueti, boş gök; düz vektör, kâğıt dokusu | Ana sayfa ilk ekran zemini, her ekranda, alta yaslı, yüzde 85 örtücülük ve yukarı doğru silinme (metin bölgesi düz kalır) | CSS arka planı |
| `hamamonu-600/1200.webp` | 1200×420 | Hamamönü evleri ve Ankara Kalesi (paylaşım kartı çiziminin alt bandı) | Ana sayfa, kurulum adımlarından sonra tam genişlikte ara (tembel yüklenir; eski `araclar` şeridinin yerine) | Süs (`alt=""`, `aria-hidden`) |
| `marka/og.jpg` | 1200×630 | Hamamönü evleri ve Ankara Kalesi; solda logo ve kısa metin (Pillow ile, Lato) | Bütün sayfaların paylaşım kartı | `PAYLASIM_ALT` (`site/yapisal.ts`) |
| `infra/coolify/bakim/bakim.webp` | 1280×720 | Akşamüstü kütüphane okuma salonu, pencerede Ankara Kalesi, masa lambası | Güncelleme (bakım) sayfasının üstü | Süs (`alt=""`) |

| `kurum-platformu-800/1600.webp` | 1600×640 | Düzenli kalite arşivi, raflar, masada açık klasör ve mühür, pencerede Ankara Kalesi | `/kurum-ac`, `/kurulum` tanıtımı | Süs |
| `pilot-800/1600.webp` | 1600×640 | Sabah seminer odası, yuvarlak masada kâğıtlar, iki kahve, dizüstü; pencerede kale | `/pilot` tanıtımı | Süs |
| `giris-800/1600.webp` | 1600×640 | Kemerli kampüs kapısından fakülteye yürüyen iki kişi | `/giris`, `/davet` tanıtımı | Süs |
| `kurum-demosu-800/1600.webp` | 1600×640 | Kurgu bir üniversite kampüsü, kuşbakışı; uzakta kale | `/kurum-demosu` tanıtımı | Süs |

## Ankara serisi (12.11.2026)

- Üretim: Midjourney V8.2 HD, raw, relax kipi, kurucunun hesabı. Asıllar Midjourney'dedir; depoya yalnız tarayıcıda
  ortadan kırpılıp küçültülmüş WebP kopyalar girdi.
- Ortak istem sonu: `textured paper finish, subtle grain, minimalist digital art style, deep navy blue, muted teal,
  warm sand and soft terracotta accents, calm and clean composition, simplified geometric shapes, no text`.
  Yeni görsel bu sonla üretilirse seri tutarlı kalır.

## Kurallar

- Her görselde en ve boy verilir (yerleşim kayması olmaz). İlk ekran dışındakiler tembel yüklenir.
- Telefonda kâğıt dokusu indirilmez; ana sayfa görselinin 480 piksellik kopyası yüklenir (performans bütçesi,
  `apps/web/e2e/butceler.ts`).
- Görsellerde gerçek kişi, kurum adı ya da logo yoktur. Yeni görsel eklenirse bu tabloya kaynağıyla yazılır.
