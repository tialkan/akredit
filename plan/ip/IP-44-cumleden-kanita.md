# İP-44: Cümleden kanıta tek tık inceleme ve rapor dil denetimi

- **Durum:** hazır
- **Faz:** 8
- **Bağımlılık:** İP-19, İP-20 (ikisi de incelemede)
- **Sahip olduğu yollar:** `packages/cekirdek/src/rapor/**`, `apps/web/src/app/panel/raporlar/**`, `apps/web/src/app/degerlendirici/kanit/**`, `packages/servis/src/rapor.ts`, `docs/raporlar/IP-44.md`
- **Büyüklük:** orta

## Amaç

ÖDR, BİDR ve KİDR'de her olgusal cümle zaten bir kanıta bağlı. Bu İP, okuyanın (komisyon üyesi, rektörlük, değerlendirici) bir cümleye tıklayıp kanıtın ilgili sayfasını ya da satırını aynı ekranda görmesini sağlar. Ayrıca rapor dilini, yayımdan önce deterministik kurallarla denetler.

## Kapsam

1. **Tek tık.** Rapor görünümünde her cümle atıfını taşır; tıklayınca yan panelde kanıt açılır, ilgili sayfa ya da satır vurgulanır. Kanıtın özeti (SHA-256) ve onay bilgisi gösterilir. EKSİK cümleler ayrı renkte, "kanıt yok" diye.
2. **Değerlendirici portalı.** Aynı görünüm değerlendiricinin sanal kanıt odasında (İP-22) salt okunur çalışır; erişim günlüğe yazılır.
3. **Dil denetimi.** `cekirdek/rapor/denetim.ts` genişletilir: kanıtsız üstünlük ifadeleri ("en iyi", "tamamen", "her zaman"), ölçüsüz nicelik ("birçok", "büyük ölçüde") karşısında sayı istemi, yazıyla yazılmış sayılar ("beş toplantı"; 1. dalga açık bulgusu #4), edilgen ve öznesiz eylem ("yapılmıştır" kim tarafından), dönem ve tarih tutarlılığı. Kurallar saf işlevdir, model kullanmaz.
4. **Sonuç.** Denetim bulguları rapor kaydına öneri olarak eklenir; yayım (Katman 2 karar) açık yüksek önemli bulgu varken uyarı gösterir. Bulgu metni düzeltmez, yalnız işaretler.

## Kabul ölçütleri

- [ ] Her atıflı cümleden kanıt paneli açılır; sayfa/satır vurgusu PDF, DOCX ve XLSX kanıtında çalışır (e2e).
- [ ] Yazıyla sayı, kanıtsız üstünlük ve öznesiz eylem kuralları elle hazırlanmış örneklerle test edilir; yanlış pozitif örnekleri de testte.
- [ ] Denetim modelsiz çalışır (test sahte sağlayıcı bile kurmaz).
- [ ] Portal görünümü salt okunur; erişim günlükte.
- [ ] axe temiz, klavyeyle cümleler arasında gezilebilir; `pnpm verify` temiz.

## Günlük

- 2026-10-29: İP dosyası yazıldı. İP-19 ve İP-20 incelemeden çıkınca hazır olur.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımlılıklar İP-19 ve İP-20 tamam oldu (inceleme kapanışı). Durum hazır.
