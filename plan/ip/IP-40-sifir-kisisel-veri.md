# İP-40: Sıfır kişisel veri çıkışı, KVKK veri akış envanteri, hukuk paketi

- **Durum:** inceleme
- **Faz:** 7 (dalga 1)
- **Bağımlılık:** İP-03, İP-28
- **Sahip olduğu yollar:** `packages/yz/src/guvence/kvkk.ts`, `packages/yz/src/guvence/cikis-kapisi.ts`, `packages/yz/src/guvence/politika.ts`, `packages/yz/src/saglayicilar/**` (yalnız kapı denetimi), `packages/yz/src/web-arama/index.ts` (yalnız kapı denetimi), `packages/yz/src/envanter.ts`, `packages/yz/test/cikis-kapisi.test.ts`, `packages/yz/test/envanter.test.ts`, `packages/vt/src/kriptografik-silme.ts`, `packages/vt/src/gocler/0040_kriptografik_silme.sql`, `packages/vt/test/kriptografik-silme.test.ts`, `docs/hukuk/veri-akis-envanteri.md`, `docs/hukuk/kurum-paketi/**`, `apps/web/scripts/hukuk-paketi.ts`, `apps/web/scripts/veri-akis-envanteri.ts`, `apps/web/public/indir/**`, `apps/web/src/app/panel/ayarlar/veri-akisi/**`, `apps/web/src/app/(site)/kvkk/page.tsx`, `docs/raporlar/IP-40.md`
- **Büyüklük:** büyük

## Amaç

Kurum dışına ya da yurt dışına giden her yapay zekâ çağrısında kişisel verinin çıkmadığını kodla güvenceye almak; kurumun hukuk birimine veri akışını kod tabanından üretilen güncel bir envanterle ve imzaya hazır taslak bir paketle göstermek; silme hakkını değiştirilemez kayıtla uzlaştırmak (İP-28'in bıraktığı iş).

## Kapsam

1. **Çıkış kapısı** (`packages/yz/src/guvence/cikis-kapisi.ts`): sohbet, gömme ve web araması için zorunlu tek kapı. Varsayılan: kişisel veri çıkmaz. KVKK maskeleyicisi genişler (öğrenci no, TCKN, ad-soyad, e-posta, telefon, IBAN, adres, imza alanı, Türkçe ad listesi + bağlam). Maskelenemeyen şüpheli içerik (etiketli kimlik alanı, özel nitelikli veri ipucu) varsa çağrı yapılmaz, "insan incelemesi" hatası döner. Her çağrı için çıkış kaydı: türe göre maskelenen alan sayısı (değer yok), sağlayıcı, ülke, amaç, kip, sonuç. Sağlayıcı bağdaştırıcıları kapı bağlamı olmadan ağ isteği yapamaz (kod + test). Yerel/yurt içi modelde kapı "kurum içi" kipindedir.
2. **Veri akış envanteri**: `@akredit/yz` sağlayıcı kataloğu, bağlayıcı listesi ve kişisel veri taşıyan tablolardan üretilir. Betik `docs/hukuk/veri-akis-envanteri.md` ve CSV üretir; testi belgenin güncel olduğunu denetler. Panelde `/panel/ayarlar/veri-akisi` salt okunur görünüm ve CSV indirme.
3. **Kurum hukuk paketi** (`docs/hukuk/kurum-paketi/`): veri işleme sözleşmesi, standart sözleşme kullanım notu, VERBİS değerlendirmesi, aydınlatma metinleri, sorumluluk matrisi (Katman 0/1/2), beyan sınırı, Apache-2.0 garanti sınırı. Hepsi "TASLAK, avukat incelemesi gerekir". Derleme betiği .zip üretir; `/kvkk` sayfasında indirilebilir.
4. **Kriptografik silme** (`packages/vt`): kişiye özgü anahtar tablosu; anahtar ve takma ad eşlemesi silinir, günlüğe yeni "silme uygulandı" kaydı eklenir, zincir bozulmaz (PGlite testi).

## Kabul ölçütleri

- [x] Kapı: yurt dışı çağrıda maskeleme zorunlu; şüpheli içerikte çağrı yapılmaz ve insan incelemesi döner; çıkış kaydı değer içermez (test).
- [x] Bypass yok: her bağdaştırıcı (Anthropic, OpenAI uyumlu sohbet ve gömme, OpenRouter web araması) kapı dışında çağrılınca ağ isteği yapmadan reddeder; kaynakta her `jsonIstek` çağrısının önünde kapı denetimi vardır (test).
- [x] Yerel model kurum içi kipte; yurt dışı bağdaştırıcı kurum içi kapıdan geçirilemez (test).
- [x] Envanter kod tabanından üretilir; belge güncel değilse test kırılır; panelde salt okunur görünüm ve CSV.
- [x] Hukuk paketi belgeleri TASLAK başlıklı; KVKK bilgileri İP-28 kaynak kodlarına bağlı, doğrulanamayan `DOĞRULANMADI`; .zip betikle üretilir, `/kvkk`'dan indirilir.
- [x] Kriptografik silme: anahtar silindikten sonra şifreli veri çözülemez; günlüğe yeni kayıt eklenir; eski kayıtlar ve zincir değişmez (PGlite testi).
- [x] `pnpm verify` temiz, web derlemesi başarılı.

## Günlük

- 2026-10-28: İP dosyası yazıldı.
- 2026-10-28: Uygulandı (dal `ip/40-sifir-kisisel-veri`). Çıkış kapısı (AsyncLocalStorage bağlamı, bağdaştırıcılarda `kapiDenetimi`, çıkış kaydı, insan incelemesi), genişletilmiş maskeleyici, `politikaUygula`/`maskeleyen`/web araması kapıya bağlandı; veri akış envanteri (betik, belge, CSV, panel); kurum hukuk paketi ve .zip; kriptografik silme ve 0040 göçü. `pnpm verify` temiz (1266 vitest + 38 cli testi), web derlemesi başarılı.
- Karar: kapı bağlamı nesne mührü yerine AsyncLocalStorage; aradaki sarmalayıcılar isteği kopyalasa da bağlam korunur, paket dışından kurulamaz.
- Karar: etiketsiz 8-12 haneli sayılar varsayılan olarak maskelenir (eski iki test beklentisi bu yönde sıkılaştı).
- Ortak dosya: `packages/servis/src/politika.ts` (bağlantı denemesi kapıdan geçer), `packages/servis/test/yz-fabrika.test.ts`, `apps/web/package.json` (iki betik), `docs/hukuk/README.md`.
- Kalan: çıkış kayıtlarının günlüğe bağlanması (servis/işçi), silme talebi ekranı ve ana anahtar yönetimi, `apps/cli` model çağrısının kapıya taşınması, yetki devri yönergesi taslağı, avukat incelemesi. Ayrıntı: `docs/raporlar/IP-40.md`.
