# Ölçme yöntemi (`@akredit/olcme`, hesap sürümü `olcme-1.0.0`)

Bu belge ölçme motorunun hesapladığı her sayının formülünü, parametrelerini ve yorumlama sınırlarını verir. Raporlardaki ÇK/PÇ sayıları yalnız bu hesaplardan gelir; yapay zekâ sayı üretmez.

## Girdi

`DersOlcmeVerisi` (`@akredit/cekirdek`): ders çıktıları (ÇK), ölçme araçları (ağırlık %), sorular (tam puan, ÇK eşlemeleri ve ağırlıkları), öğrenci puanları (takma adla). `puan: null` öğrencinin o araca girmediğini gösterir. Girdi hesaptan önce kanonik sıraya konur (araç, soru, öğrenci, eşleme kodlarına göre), bu yüzden girdi sırası sonucu ve `girdiOzeti`ni etkilemez.

## Formüller

**Eşleme ağırlığı.** Bir sorunun eşleme ağırlıkları toplamı 1'e normalleştirilir: `w(s, ÇK) = ağırlık / Σ ağırlık`. Sıfır ve negatif ağırlıklar yok sayılır.

**ÇK başarısı (öğrenci).**
`başarı(ö, ÇK) = 100 · Σ puan(ö, s)·w(s, ÇK)·k(a) / Σ tamPuan(s)·w(s, ÇK)·k(a)`
Toplam, öğrencinin girdiği araçlardaki (en az bir sayısal puan) ve tam puanı > 0 olan sorular üzerindendir. `k(a)` = aracın ders notundaki ağırlığı (`aracAgirligiKullan: true`) ya da 1 (varsayılan). Girmediği araçların soruları paydaya katılmaz. Girdiği araçta puan satırı olmayan soru 0 sayılır. Paydası 0 olan öğrenci o ÇK'da ölçülmemiştir (`null`).

**ÇK başarısı (ders).** Ölçülen öğrenciler üzerinden ortalama, ortanca, örneklem standart sapması (n − 1; n < 2 için `null`) ve eşiği (varsayılan 60) geçen öğrenci oranı.

**Araç düzeyi yedek yöntem.** Sorusu olmayan araç, `aracTamPuani` (varsayılan 100) tam puanlı ve `aracEslemeleri` ile eşlenmiş tek bir sanal soru (`no: "*"`) gibi hesaplanır. Sonuçta `yontem`: `soru`, `arac` ya da `karma`.

**Ders içi PÇ.** `PÇ = Σ_ÇK ort(ÇK)·katkı(ÇK, PÇ) / Σ_ÇK katkı(ÇK, PÇ)`, yalnız 1-5 puanlı hücreler ve ölçülmüş ÇK'lar. `iliskisiz` ve `yetersiz_kanit` hücreleri katılmaz.

**Program PÇ.** `Σ_ders PÇ_ders·a / Σ a`; `a` = 1 (eşit), AKTS ya da dersin o PÇ'ye katkı toplamı. Sonuç katkı veren dersleri, ağırlıklarını, ders ve öğrenci sayısını taşır.

**Ders notu.** `not = 100 · Σ_a ağırlık(a)·(alınan(a)/tam(a)) / Σ_a ağırlık(a)`. Girilmeyen araç 0 sayılır. Ağırlıklar toplamı 100 değilse not 100'e oranlanır ve uyarı verilir. İstatistikler: ortalama, ortanca, sd (n − 1), en küçük/büyük, çeyrekler (doğrusal aradeğer, R tür 7), histogram (`[alt, üst)`, son aralık üstü içerir), harf dağılımı, geçme oranı. Varsayılan harf tablosu ve geçme notu (60) **örnektir**, hiçbir kurumun resmî tablosu değildir.

**Madde analizi** (araca giren öğrenciler):
- Güçlük `p = ort(puan)/tamPuan`.
- Ayırt edicilik `D = (ort_üst − ort_alt)/tamPuan`; gruplar araç toplamına göre üst ve alt `max(1, round(0,27·n))` öğrenci (eşitlikte takma ad sırası).
- Düzeltilmiş madde-toplam korelasyonu: madde ile (araç toplamı − madde) arasında Pearson.
- Cronbach alfa `α = k/(k−1)·(1 − Σ var(madde)/var(toplam))`; iki puanlı maddelerde KR-20'ye eşittir. k < 2 ya da toplam varyansı 0 ise `null`.

## Bulgular (işarettir, yargı değildir)

| Kural | Düzey | Koşul |
|---|---|---|
| `ck-olculmemis` | uyarı | ÇK'yı ölçen soru yok |
| `ck-tek-soru` | bilgi | ÇK tek soruyla ölçülüyor |
| `ck-esik-alti` | uyarı | ÇK ortalaması eşiğin altında |
| `soru-eslemesiz` | uyarı | soru hiçbir ÇK'ya eşlenmemiş |
| `esleme-bilinmeyen-cikti` | uyarı | derste olmayan ÇK'ya eşleme |
| `soru-tam-puan-sifir` | hata | tam puan 0; hesaplardan çıkarıldı |
| `arac-agirlik-toplami` | uyarı | araç ağırlıkları toplamı ≠ 100 |
| `soru-cok-kolay` / `soru-cok-zor` | bilgi | p > 0,90 / p < 0,20 |
| `soru-negatif-ayirt` | uyarı | D < 0 |
| `arac-dusuk-guvenirlik` | uyarı | α < 0,60 |
| `arac-guvenirlik-tanimsiz` | bilgi | α hesaplanamadı (değişkenlik yok) |
| `pc-katkisiz` | bilgi | PÇ'ye katkı veren ölçülmüş ÇK yok |
| `az-ogrenci` | uyarı | n < 10: istatistikler yorumlanmamalı |

## Örnek kâğıtlar ve yeniden üretilebilirlik

En yüksek, ortanca (artan sırada `⌊(n−1)/2⌋`. sıra) ve en düşük notlu öğrencinin takma adı; eşitlikte takma ad sırası. Her sonuç `hesapSurumu` ve `girdiOzeti` (kanonik girdi + parametrelerin SHA-256'sı) taşır.

## Küçük elle hesaplanmış örnek

İki öğrenci, bir araç (%100), iki soru: S1 (tam 10, ÇK1), S2 (tam 10, ÇK1 ve ÇK2 eşit). Puanlar: a = (8, 6), b = (4, 10).
- ÇK1, a: (8 + 0,5·6)/(10 + 0,5·10) = 11/15 = 73,3; b: (4 + 5)/15 = 60. Ders ÇK1 = 66,7.
- ÇK2, a: 6/10 = 60; b: 100. Ders ÇK2 = 80.
- Matris PÇ1: ÇK1 = 4, ÇK2 = 2 → PÇ1 = (66,7·4 + 80·2)/6 = 71,1.
- Notlar: a 70, b 70.

Testlerdeki 5 öğrenci, 2 araç, 6 soru, 3 ÇK, 4 PÇ'lik örnek ve adımları: `packages/olcme/test/ornek.ts`, `ders.test.ts`.

## Yorumlama sınırları

- **ÇK × PÇ matrisi tasarım uyumunu gösterir, başarı ölçmez.** PÇ sağlanma değeri, matrisin öngördüğü katkıların ölçülen ÇK başarısıyla ağırlıklandırılmasıdır; matris yanlışsa sonuç da yanlıştır.
- Eşleme kalitesi sonucu belirler; tek soruyla ölçülen ÇK güvenilir değildir.
- n < 10 için dağılım ve madde istatistikleri yorumlanmamalıdır.
- Program PÇ değeri derslerin ortalamasıdır; aynı öğrenci birden çok derste sayılır.

## Kurumların farklı yöntemleri için parametreler

`esik`, `aracAgirligiKullan`, `gecmeNotu`, `harfTablosu`, `histogramSinirlari`, `aracEslemeleri`, `aracTamPuani`, program için `agirlik` (`esit` | `akts` | `katki`). Kurum yöntemi bunlarla anlatılamıyorsa yeni parametre ve yeni `hesapSurumu` gerekir.
