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
| `kagit-dokusu.webp` | 1456×816 | Çok soluk, ince çizgili eski kâğıt dokusu | Ana sayfa ilk ekran zemini, yalnız geniş ekranda, yüzde 16 örtücülükle | CSS arka planı |

## Kurallar

- Her görselde en ve boy verilir (yerleşim kayması olmaz). İlk ekran dışındakiler tembel yüklenir.
- Telefonda kâğıt dokusu indirilmez; ana sayfa görselinin 480 piksellik kopyası yüklenir (performans bütçesi,
  `apps/web/e2e/butceler.ts`).
- Görsellerde gerçek kişi, kurum adı ya da logo yoktur. Yeni görsel eklenirse bu tabloya kaynağıyla yazılır.
