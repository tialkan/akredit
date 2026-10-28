# İP-38: Sessiz devir ve kaynağa geri yazma

- **Durum:** devam
- **Faz:** 7
- **Bağımlılık:** İP-13, İP-14, İP-15, İP-37
- **Sahip olduğu yollar:** `packages/servis/src/bologna/devir*`, `packages/baglayicilar/src/bologna-proliz/yazma*`, `packages/baglayicilar/src/bologna-proliz/test/yazma/**`, `apps/isci/src/devir/**`, `apps/web/src/app/panel/dersler/[id]/devir/**`, `apps/web/src/app/panel/dersler/_bologna/devir*`, `packages/vt/src/gocler/0020_sessiz_devir.sql` (bu İP 0020-0029 aralığını kullanır), `docs/hukuk/yetki-devri-yonergesi-taslagi.md`, `docs/adr/0007-sessiz-devir-ve-varsayilan-onay.md`, `docs/raporlar/IP-38.md`
- **Ortak dosyalara en küçük dokunuş:** öneri türü ve karar dayanağı listeleri (`packages/cekirdek/src/turler.ts`, `packages/cekirdek/src/oneri.ts`, `packages/vt/src/sema/ortak.ts`, `packages/vt/src/sema/oneri.ts`, `packages/vt/src/gocler/meta/_journal.json`, `packages/servis/src/semalar.ts`, tür adı tabloları), politika süresi (`packages/servis/src/politika.ts`), politika motorunun yeni türü atlaması (`packages/servis/src/onay/motor.ts`), REST uçları (`packages/servis/src/http/uclar.ts`, `openapi.json`), işçi kaydı (`apps/isci/src/calisma/isci.ts`), ders sayfası kartları (`apps/web/src/app/panel/dersler/[id]/page.tsx`, `.../arastirma/arastirma-paneli.tsx`).
- **Büyüklük:** büyük

## Amaç

Öğretim elemanı için dönem başı Bologna güncellemesini sıfır dokunuşa indirmek. Sistem geçen dönemin onaylı ders bilgi paketini, o derste kapanmış PÜKÖ önlemlerini ve eksik giderme bulgularını birleştirip yeni dönem taslağını kendisi hazırlar, hocaya kısa bir fark özeti gönderir. Hoca itiraz etmezse kurumun imzalı yetki devri politikasındaki süre sonunda taslak "süre dolumuyla, politika X dayanağıyla" onaylanmış sayılır ve kurum yazılı izin verdiyse kaynağa (Proliz Bologna/OBS) geri yazılır. Hocanın her düzeltmesi ya da reddi bu varsayılanın önüne geçer.

Danışmanlık kararı (2026-10-28, `docs/danismanlik/2026-10-28-dis-incelemeler.md`): üç katmanlı karar modelinde "Katman 1: süreli varsayılan onay". Hukuki dayanak Senato yönergesidir; yönerge metni avukat ve Senato incelemesi gerektirir.

## Kapsam

1. **Sessiz devir motoru** (`packages/servis/src/bologna/devir*`).
   - Tetik: kurumun dönem kaydı (`donem`) başladığında (işçi günlük denetler, süreç motoru ya da elle de tetiklenebilir). Aynı ders ve dönem için ikinci taslak açılmaz.
   - Birleştirme deterministiktir (modelsiz): geçen dönemin onaylı taslağı (`bologna_taslagi` ya da `bologna_devri`, düzeltme dahil) + ders kaydından güncel sistem alanları (kod, ad, AKTS, T+U+L) + son okumadaki program çıktısı kodları + o derse bağlı kapanmış/seçilmiş PÜKÖ önlemleri (`eylem`, `onlem_al`/`kontrol_et` ya da `secildi`; yapılandırılmış `bolognaDuzeltmesi` taşıyan önlem metin alanına uygulanır) + son okumadaki eksik giderme bulguları (bilgi olarak).
   - Öneri türü `bologna_devri` (düşük risk). Sonuç K1-K12 hatasızsa ve akademik karar gerektiren değişiklik yoksa (AKTS, T+U+L, öğrenme çıktısı sayısı, değerlendirme ağırlığı) düşük riskli kalır; yoksa orta risk: süre dolumuyla onaylanmaz, hoca karar verir.
   - Hocaya (dönemin ders açılışındaki sorumlular) fark özeti bildirimi (e-posta kuyruğuna da düşer): değişen alanlar, uygulanan önlemler, bulgular, son tarih.
   - **Varsayılan onay:** yalnız (a) kurumun `bologna_devri` türünü kapsayan imzalı ve yürürlükteki yetki devri politikası varsa ve (b) öneri düşük riskliyse; süre politikadan (`itirazSuresiIsGunu`, varsayılan 5 iş günü; hafta sonu ve kurum tatil listesi sayılmaz). Karar ayrı dayanakla yazılır: `sure_dolumu`, politika kimliği, karar veren politikayı imzalayan kişi (kim adına), günlükte "Süre dolumuyla, politika X dayanağıyla". Veritabanı tetikleyicisi süre dolmadan, yüksek/orta riskte, politika kapsamı dışında ya da yanlış türde bu dayanağı reddeder. Mevcut İP-13 politika motoru `bologna_devri`yi hemen onaylamaz (yalnız süre dolumuyla).
   - Hoca süre içinde onaylar, düzeltir ya da reddederse onun kararı geçer (mevcut karar akışı).
2. **Senato yönergesi taslağı** (`docs/hukuk/yetki-devri-yonergesi-taslagi.md`): "Dijital kalite süreçleri ve yetki devri yönergesi TASLAĞI — avukat/Senato incelemesi gerekir". Madde iskeleti; kaynak gösterilemeyen mevzuat atfı `DOĞRULANMADI`.
3. **Kaynağa geri yazma** (`packages/baglayicilar/src/bologna-proliz/yazma*`, `apps/isci/src/devir/**`).
   - API olmadığı için tarayıcı ajanı (Playwright). Seçiciler yapılandırılabilir; varsayılanlar `DOĞRULANMADI` (gerçek Proliz düzenleme ekranı görülmedi).
   - Kurumun yazılı izni (kurum ayarında açık izin kaydı: veren kişi adıyla, zaman, yazı sayısı; günlükte) olmadan çalışmaz. İzin geri alınabilir (yeni kayıtla).
   - Giriş kurumun kendi hesabıyla; giriş bilgisi yalnız giriş adımına verilir, modele, günlüğe ve rapora girmez (ilke 8).
   - Yazmadan önce mevcut değeri okur, yalnız onaylı plandaki alanları değiştirir, kaydettikten sonra geri okuyup doğrular; her alan işlemi günlüğe girer. Kuru çalıştırma varsayılandır; gerçek yazma için kurum izninde açıkça "gerçek yazma" seçilmiş olmalı.
   - Kayıtlı sahte Proliz düzenleme sayfası (fixture HTML, yerel sunucu) ile uçtan uca Playwright testi.
4. **Word paketinin yeri:** Word indir/yükle kalır ama ikincildir. Ders sayfasında birincil eylem "fark özeti → onayla / değiştir"; Word "isteğe bağlı" bölümde.
5. **Panel:** ders sayfasında devir durumu (taslak hazır, süre: X iş günü kaldı, varsayılan onaylandı, kaynağa yazıldı / bekliyor / hata). Tasarım dili: yalnız açık tema, sol vurgu çizgisi yok.

## Kabul ölçütleri

- [ ] Yeni dönem başlayınca her ders için tek `bologna_devri` önerisi açılır; içerik geçen dönemin onaylı taslağı + kapanmış PÜKÖ önlemi + bulgulardır; hocaya fark özeti bildirimi gider (PGlite testi).
- [ ] İmzalı politika yokken, öneri orta riskliyken ya da süre dolmadan varsayılan onay verilmez; koşullar sağlanınca karar `sure_dolumu` dayanağı, politika kimliği ve imzalayan adıyla yazılır; veritabanı yanlış kullanımı reddeder (servis + tetikleyici testi).
- [ ] Hoca süre içinde düzeltir ya da reddederse süre dolumuyla karar verilmez.
- [ ] İş günü hesabı hafta sonu ve tatilleri atlar (elle doğrulanmış örnek).
- [ ] Kaynağa yazma kurum izni yokken çalışmaz; kuru çalıştırma varsayılan; önce oku, yalnız onaylı alan, sonra geri oku; her alan günlükte; giriş bilgisi günlükte ve raporda yok (birim + Playwright uçtan uca testi).
- [ ] Ders sayfasında devir durumu kartı, birincil eylem fark özeti → onayla/değiştir; Word isteğe bağlı.
- [ ] Senato yönergesi taslağı `docs/hukuk/` altında, kaynaksız atıflar `DOĞRULANMADI`.
- [ ] `pnpm verify` temiz, `pnpm --filter @akredit/web build` başarılı.

## Günlük

- 2026-10-28: İP tanımlandı (dış incelemeler ve Argon danışmanlığı sonrası). Göç aralığı 0020-0029.
