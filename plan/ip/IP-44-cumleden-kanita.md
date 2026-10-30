# İP-44: Cümleden kanıta tek tık inceleme ve rapor dil denetimi

- **Durum:** tamam
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

- [x] Her atıflı cümleden kanıt paneli açılır; sayfa/satır vurgusu PDF, DOCX ve XLSX kanıtında çalışır (e2e).
- [x] Yazıyla sayı, kanıtsız üstünlük ve öznesiz eylem kuralları elle hazırlanmış örneklerle test edilir; yanlış pozitif örnekleri de testte.
- [x] Denetim modelsiz çalışır (test sahte sağlayıcı bile kurmaz).
- [x] Portal görünümü salt okunur; erişim günlükte.
- [x] axe temiz, klavyeyle cümleler arasında gezilebilir; `pnpm check`, `pnpm typecheck`, ilgili paket testleri ve web derlemesi temiz (tam `pnpm verify` tek komutla koşulmadı, adımlar ayrı).

## Günlük

- 2026-10-29: İP dosyası yazıldı. İP-19 ve İP-20 incelemeden çıkınca hazır olur.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımlılıklar İP-19 ve İP-20 tamam oldu (inceleme kapanışı). Durum hazır.
- 2026-10-30 (dal `ip/44-cumleden-kanita`): Uygulandı, durum inceleme. `cekirdek/rapor`: `cumle.ts` (cümle ayrıştırma, atıf kendinden önceki metni kapsar), `dil.ts` (beş kural, saf), `kanit-paneli.ts` (PDF sayfa, DOCX bölüm, XLSX hücre/satır, slayt eşlemesi); `denetim.ts` bunları dışa açar. `servis/rapor.ts`: `dilDenetimi`, `dilBulgulariniKaydet` (yeni bulgular `rapor_bolumu` önerisi, hedef `rapor_bolumu_surumu`, üretici kural; tür VT kuralıyla yüksek riskli, bulgunun önemi içerikte), `kanitPaneli` (SHA-256 ve onay bilgisi), yayım uyarısı (açık yüksek bulgu). `[H:…]` paragrafı artık EKSİK sayılmaz. Web: rapor okuyucusu (cümle düğmeleri, yan panel, Esc, odak dönüşü), dil denetimi özeti ve "onay kutusuna ekle" eylemi; portalda `/degerlendirici/kanit/rapor` salt okunur, görüntüleme `degerlendirici.rapor_goruntulendi` ile günlüğe. Göç ve yeni tablo yok. Kalan: yayım uyarısı onay kutusu karar ekranına bağlanmadı (sahip olunmayan yol); portal menüsüne bağlantı eklenmedi; `klavye.spec` `/panel/kararlar` testi bu dalda da kırık (dokunulmayan sayfa). Rapor: `docs/raporlar/IP-44.md`.
- 2026-10-30 (kapanış): `klavye.spec` `/panel/kararlar` kırığının kök nedeni bulundu ve düzeltildi: karar kartları ilk açılışta odağı karta taşıyordu, ilk Sekme "İçeriğe geç"e gelmiyordu (İP-39 sayfası, `karar-kartlari.tsx`). Bütün e2e (masaüstü ve telefon) geçer; `cumleden-kanita.spec.tsx` dahil. Kalan, kabul ölçütü dışında: yayım uyarısının onay kutusu karar ekranına bağlanması, portal menüsüne rapor bağlantısı. Durum tamam.
