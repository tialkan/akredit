# İP-19: Program öz değerlendirme ve ÖDR

- **Durum:** tamam
- **Faz:** 4
- **Bağımlılık:** İP-11, İP-12, İP-16, İP-17
- **Sahip olduğu yollar:** `packages/servis/src/odr/**`, `apps/web/src/app/panel/raporlar/**`, `docs/raporlar/IP-19.md`
- **Büyüklük:** büyük

## Amaç

Program akreditasyonu öz değerlendirme raporunun (ÖDR) kanıtlardan, ölçme sonuçlarından ve süreç kayıtlarından üretilmesi.

## Kapsam

1. Çerçeve güdümlü rapor kurucu (MÜDEK ve diğer kuruluşların ÖDR yapıları; önlisans için iç çerçeve).
2. Kapsama haritası (ölçüt × onaylı kanıt), eksik analizi, eksikler için görev/süreç/eylem başlatma.
3. Bölüm taslakları (yalnız onaylı kanıtlarla, atıflı), atıf ve sayı denetimi, sürüm geçmişi.
4. Kuruluşun istediği biçimde DOCX/PDF dışa aktarım ve ziyaret hazırlık paketi (ders dosyaları dizini, kanıt listesi).

## Kabul ölçütleri

- [x] Kurgu programla uçtan uca ÖDR; her olgusal cümle atıflı ya da EKSİK. (`odr.test.ts` › uçtan uca)
- [x] Dışa aktarılan belge kuruluş şablonunun bölüm yapısına uyar. (Mekanizma test edildi; kuruluşların resmî şablonları DOĞRULANMADI, kütüphanede yok — rapora bakın.)
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (`ip/19-program-odr`). `packages/servis/src/odr`: çerçeve güdümlü kurucu, onaylı kanıt kapsaması, eksik analizi ve görev açma, program PÇ hesabı ([H:…] atfı), süreç kaydı, atıf-sayı denetimi, bölüm sürüm zinciri, yüksek riskli rapor onayı, DOCX ÖDR + XLSX ziyaret paketi; 5 API ucu; raporlar sayfasında panel. Kalan: kuruluşların resmî şablonları (DOĞRULANMADI), PDF, anket sonuçlarının doğrudan bağlanması, YZ bölüm yazma görevi. Ayrıntı: `docs/raporlar/IP-19.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. Uçtan uca: `packages/servis/src/odr/odr.test.ts` › "kurgu programla uçtan uca ÖDR" ve "bölümler şablon sırasıyla; her paragraf atıflı ya da EKSİK". Şablon yapısı: "DOCX şablonun bölüm yapısına uyar; onaydan sonra onaylayan yazılır", "DOCX modeli şablon bölümlerini sırasıyla, ardından ekleri taşır"; şablonu olmayan resmî çerçeve EKSİK ve DOĞRULANMADI döner (aynı dosya). İnceleme bulgusu D3-8 kapalı. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kuruluşların resmî ÖDR şablonları İP-47'nin insan işidir (resmî belge).
