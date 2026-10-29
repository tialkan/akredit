# İP-46: Toplantı kaydından tutanağa ve EBYS taslağına akış

- **Durum:** bekliyor
- **Faz:** 8
- **Bağımlılık:** İP-18, İP-23 (İP-23 incelemede)
- **Sahip olduğu yollar:** `packages/servis/src/toplanti/**`, `apps/isci/src/toplanti/**`, `apps/web/src/app/panel/toplantilar/**`, `packages/baglayicilar/src/ebys/taslak*.ts`, `docs/raporlar/IP-46.md`
- **Büyüklük:** büyük

## Amaç

Toplantı ve karar asistanı (İP-18) bugün yazılı notlardan tutanak taslağı üretiyor. Bu İP ses kaydından başlar: kayıt yazıya dökülür, tutanak taslağı ve kurumun EBYS'sine gidecek resmî yazı taslağı hazırlanır. Son gönderim insandadır (ilke 3).

## Kapsam

1. **Kayıt.** Ses dosyası kanıt olarak yüklenir (SHA-256). Katılımcıların kayda onayı toplantı kaydında işaretlenir; işaret yoksa iş başlamaz.
2. **Yazıya dökme.** Yalnız kurum içi model (İP-34). Konuşmacı ayrımı adla değil "Konuşmacı 1, 2" diye yapılır; adlandırmayı insan yapar. Döküm kanıt olarak saklanır, her paragraf ses zaman damgasına bağlanır.
3. **Tutanak.** Mevcut `tutanak.ts` akışı dökümü kaynak alır; karar adayları dökümdeki zaman damgasına atıf yapar. 3. dalga incelemesinin `sayilarKaynaktaMi` denetimi korunur: kararda geçen her tarih ve sayı dökümde de geçmelidir.
4. **EBYS taslağı.** Onaylanan kararlar için resmî yazı taslağı (DOCX, `belge/docx-uret.ts`); EBYS bağlayıcısı (İP-23) yalnız taslak yükleme destekliyorsa taslak olarak gönderir, desteklemiyorsa dosya indirilir. İmza ve gönderim her durumda EBYS'de insan işlemidir.
5. **Katman.** Tutanak taslağı Katman 1 (süreli varsayılan onay, kurum yönergesine bağlı), EBYS yazısı Katman 2.

## Kabul ölçütleri

- [ ] Kayıt onayı yokken yazıya dökme başlamaz (test).
- [ ] Yerel sağlayıcı yokken iş başlamaz; ses yurt dışına gönderilmez (test).
- [ ] Tutanaktaki her karar dökümde zaman damgasına bağlı; dökümde geçmeyen sayı ya da tarih reddedilir (test, sahte sağlayıcı).
- [ ] EBYS'ye hiçbir yol "gönder" ya da "imzala" çağrısı yapmaz; yalnız taslak (test).
- [ ] Panel ekranında döküm ile tutanak yan yana, zaman damgasından sese gidilir; axe temiz.
- [ ] `pnpm verify` temiz.

## Açık sorular

- Hangi EBYS ürünlerinin taslak yükleme API'si sunduğu DOĞRULANMADI (İP-23 raporuna bakılacak).
- Kurul toplantısı ses kaydının hukuki dayanağı kurum yönergesine bağlı; hukukçu incelemesi gerekir.

## Günlük

- 2026-10-29: İP dosyası yazıldı. İP-23 incelemeden çıkınca hazır olur.
