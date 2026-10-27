# Performans denetimi (İP-31)

Ölçüm tarihi: 2026-10-27. Araç: `apps/web/e2e/performans.spec.ts` (Playwright + Chrome DevTools Protokolü).
Örnek veri kipi, `next build` + `next start`, soğuk önbellek, 360×740 telefon görünümü.

## Koşullar

| Ad | İndirme | Yükleme | Gidiş-dönüş | İşlemci |
|---|---|---|---|---|
| Yavaş 4G (bütçe ölçümü) | 1,6 Mbit/sn | 750 kbit/sn | 150 ms | 4× yavaş |
| Yavaş 3G (düşük bant) | 400 kbit/sn | 400 kbit/sn | 400 ms | 4× yavaş |

## Bütçeler

`apps/web/e2e/butceler.ts`. Genel: JS 200 KB, CSS 12 KB, toplam 350 KB (sıkıştırılmış), LCP 2,5 sn,
CLS 0,1, TBT 300 ms, 1500 DOM öğesi. İstisna: `/panel/onaylar` 3500 DOM öğesi (sayfalama İP-13 ile).
CI'daki "Uçtan uca" işi web'i derler ve bütçeleri denetler; aşım işi kırar. Performans projesi öteki
testler bitince tek çalışanda koşar, böylece TBT ölçümü paralel testlerle gürültülenmez.

## Bulunan ve giderilen sorunlar

1. **Onay ve ayarlar sayfalarında ~150 KB fazladan JS.** `@akredit/cekirdek` tek giriş dosyasından her
   şeyi dışa veriyor; `ozet.ts` içindeki `node:crypto` tarayıcı paketine crypto/Buffer yamasını (sıkıştırılmış
   ~150 KB, ham ~500 KB) taşıyordu. `packages/cekirdek/package.json`'a `"sideEffects": false` eklendi;
   kullanılmayan modüller artık ağaçtan atılıyor. JS 304 → 165 KB, toplam 424 → 283 KB.
2. **Yazı tipi gelince sayfa kayması (CLS 0,22-0,23).** Paket CSS'i `font-display: swap` kullanıyordu.
   `apps/web/src/app/yazi-tipi.css` yalnız latin ve latin-ext alt kümelerini `font-display: optional` ile
   tanımlar. CLS bütün sayfalarda 0.

## Ölçüm (yavaş 4G, düzeltmelerden sonra)

| Sayfa | JS KB | Toplam KB | LCP ms | CLS | TBT ms | DOM |
|---|---|---|---|---|---|---|
| `/` | 168,7 | 313,1 | 732 | 0 | 209 | 211 |
| `/nasil-calisir` | 152,8 | 285,7 | 696 | 0 | 231 | 100 |
| `/giris` | 152,8 | 285,3 | 664 | 0 | 152 | 98 |
| `/panel` | 164,6 | 280,1 | 636 | 0 | 280 | 287 |
| `/panel/onaylar` | 164,6 | 283,4 | 828 | 0 | 237 | 2615 |
| `/panel/kanitlar` | 154,1 | 263,9 | 604 | 0 | 218 | 432 |
| `/panel/kanitlar/kanit-01` | 154,1 | 270,9 | 564 | 0 | 119 | 178 |
| `/panel/programlar/prog-bp` | 148,7 | 264,0 | 696 | 0 | 131 | 612 |
| `/panel/dersler/ders-bp101` | 151,3 | 266,5 | 708 | 0 | 240 | 214 |
| `/panel/raporlar/rapor-odr` | 148,7 | 268,5 | 684 | 0 | 166 | 246 |
| `/panel/surecler` | 151,3 | 258,1 | 656 | 0 | 194 | 240 |
| `/panel/gostergeler` | 151,3 | 259,3 | 628 | 0 | 157 | 293 |
| `/panel/ayarlar` | 162,2 | 269,4 | 664 | 0 | 171 | 246 |
| `/degerlendirici` | 144,3 | 250,8 | 624 | 0 | 131 | 54 |

Yavaş 3G'de LCP: `/` 1540 ms, `/giris` 1536 ms, `/panel/onaylar` 1752 ms (eşik 6 sn). Üç sayfada da yatay
kaydırma yok ve ana başlık görünür.

## Yük testi

`apps/web/yuk/k6-panel.js`: 50 eşzamanlı kullanıcı, 2 dk 50 sn; eşikler hata < %1, sayfa p95 < 800 ms,
onay kutusu p95 < 1500 ms. **Henüz koşulmadı:** geliştirme ortamında k6 kurulu değil. Gerçek veri kipinde
(PostgreSQL) yayın öncesi koşulmalı ve sonuç buraya eklenmelidir.

## Sınırlar

- Ölçümler laboratuvar ölçümüdür (tek makine, öykünme); sahadaki Core Web Vitals için gerçek kullanıcı
  ölçümü (RUM) henüz yok.
- `font-display: optional` ilk ziyarette yavaş ağda sistem yazı tipini bırakabilir; bu bilinçli bir seçimdir.
