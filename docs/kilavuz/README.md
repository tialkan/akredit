# Kullanıcı kılavuzları

Bu klasör Akredit'in kullanıcı belgeleridir (İP-29). Kural: **belgeler yalnız bugün çalışan özellikleri anlatır**; henüz olmayan ya da yalnız örnek veriyle görünen her şey "Şu an yapılamayanlar" başlığı altında açıkça yazılır.

## Nerede ne var

| Okur | Belge | Kaynak |
|---|---|---|
| Öğretim elemanı | Önerilere karar vermek, Belge eklemek, Ders dosyası hazırlamak, Rapor taslaklarını okumak | Sitede `/belgeler`; metinler tek kaynaktan: `apps/web/src/app/(site)/belgeler/icerik.ts` |
| Kalite birimi | Çerçeve seçimi, süreç takvimi, yetki politikaları, YZ hizmeti, değerlendirici erişimi | Sitede `/belgeler/kalite-birimi` (aynı kaynak) |
| Bilgi işlem | Kurumsal giriş (SSO), kurulum, model sunucusu, yedekleme | Sade özeti sitede `/belgeler/bilgi-islem`; teknik ayrıntı [bilgi-islem.md](bilgi-islem.md) |
| Eğitim | Kısa video senaryoları | [video-senaryolari.md](video-senaryolari.md) |
| Arayüz | Uygulama içi ipucu metinleri | [uygulama-ici-ipuclari.md](uygulama-ici-ipuclari.md) |
| Pilot | Okunabilirlik testi yönergesi ve sonuç tablosu | [okunabilirlik-testi.md](okunabilirlik-testi.md) |

Kullanıcı kılavuzlarının metni bilerek Markdown'a kopyalanmadı: iki kopya zamanla ayrışır. Metni değiştirmek için `icerik.ts`'i düzenleyin; `belgeler.test.ts` teknik terim, cümle uzunluğu, okuma süresi ve "şu an yapılamayanlar" bölümünün varlığını denetler.

## Güncel tutma

Bir İP kullanıcıya görünen bir özelliği değiştirdiğinde ya da "Şu an yapılamayanlar" listesindeki bir şeyi bitirdiğinde ilgili kılavuzu aynı dalda güncellemelidir. Kılavuzların dayandığı durum: İP raporları 07, 09, 10, 12-18, 21-26, 28, 31 (2026-10-27).

## Ekran görüntüleri

Kapsam ekran görüntülü kılavuz istiyor. Görüntüler henüz eklenmedi (bkz. `docs/raporlar/IP-29.md`): tanıtım panelinin örnek verisi ile gerçek kurum ekranı farklı göründüğü için görüntüler pilot ortamı kurulduktan sonra, kurgu verili bir kurumdan alınmalıdır.
