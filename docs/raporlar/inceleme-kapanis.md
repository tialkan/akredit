# İnceleme kapanışı: incelemede bekleyen İP'ler

Tarih: 2026-10-30. Dal: `inceleme/kapanis` (`main` 24c3f1d üzerinden). Yöntem: işi yazmamış bir inceleyici olarak her İP dosyasındaki kabul ölçütleri tek tek koddaki testlerle eşlendi (test dosyası ve test adı yerinde arandı), `docs/raporlar/inceleme-dalga-*.md` ve `docs/guvenlik/bulgular.md` içindeki bulguların durumu denetlendi, plan.md §9 "Bitti tanımı" uygulandı.

Doğrulama: `pnpm check` temiz (önceden var olan 17 uyarı), `pnpm typecheck` temiz, `pnpm -r --workspace-concurrency=1 test` bütün paketlerde geçti (servis 440, web 298, yz 155, vt 70, işçi 65, cli 38 node --test ve diğerleri). Canlı CI doğrulanamadı: GitHub Actions işleri hesap faturalandırması yüzünden başlamıyor (aşağıda İP-08).

Bu kapanışta kodla kapatılan: D8-8'in oran kısmı (İP-48). Saha hazırlık oranı artık yalnız kurallı sorulardan hesaplanır; test `packages/servis/src/saha-ziyareti/saha.test.ts` "model önerisi hazırlık oranının paydasına girmez (inceleme dalga 8, D8-8)" düzeltmeden önce 4/10 verirdi.

## Karar tablosu

| İP | Karar | Gerekçe (kanıt) | Kalan insan işi |
|---|---|---|---|
| 08 | inceleme | Kod ve iş akışları yazılı; yerelde verify temiz. CI ana dalda hiç çalışmadı: `gh run view 41038336154` "recent account payments have failed or your spending limit needs to be increased". | GitHub faturalandırmasını düzeltip CI'nın yeşil görülmesi; `docker compose up` ve imaj derlemesinin Docker Hub erişimli makinede denenmesi. |
| 11 | tamam | `cerceveler.test.ts` (şema, içe aktarma, D2-2, "rapor eski sürüme bağlı kalır"), `resmi-metin.test.ts`. D2-2 kapalı. | Ölçüt dışı: kalite uzmanı doğrulaması, MÜDEK resmî belgesi. |
| 19 | tamam | `odr.test.ts` "kurgu programla uçtan uca ÖDR", "DOCX şablonun bölüm yapısına uyar…"; şablonsuz resmî çerçeve EKSİK ve DOĞRULANMADI. D3-8 kapalı. | Kuruluşların resmî ÖDR şablonları (İP-47'nin ön koşulu). |
| 20 | tamam | `kidr.test.ts` "uçtan uca KİDR taslağı (kurgu kurum)", "olgunluk önerileri politikaya bağlanamaz". D3-5 kapalı. | Ölçüt dışı: rubrik düzey metinlerinin uzman doğrulaması. |
| 23 | inceleme | Bologna, YÖK Atlas, AVESİS canlı yapıdan doğrulandı (2026-10-28). "Her bağlayıcı canlı örnekle" ölçütü UBYS, EBYS, IMAP, Drive, OneDrive için karşılanmadı. | Kurumdan anonimleştirilmiş canlı örnekler; kullanım koşullarının okunması. |
| 26 | inceleme | Betik ve belgeler hazır; üç ölçüt gerçek sunucu ister. | Sağlayıcı ve sunucu, DNS, sıfırdan kurulum, PG17 ve site dışı kopyadan geri dönüş tatbikatı, durum sayfası ve uyarılar, imaj özetleri (G-27-3). |
| 27 | inceleme | Kritik ya da yüksek açık bulgu yok; verify temiz (ölçüt işaretlendi). | Bağımsız sızma testi hizmet alımı (kiracı yalıtımı zorunlu bölüm) ve bulguların kapatılması. |
| 28 | inceleme | Silme ölçütü İP-40 ile karşılandı: `kriptografik-silme.test.ts` "anahtar silinince şifreli değer çözülemez; günlük yalnız uzar, zincir sağlam" (işaretlendi). | Hukuk paketinin avukat incelemesi. |
| 29 | inceleme | Otomatik sadelik denetimi var (`belgeler.test.ts`). | Pilot kullanıcılarla okunabilirlik testi, kurum izni. |
| 32 | tamam | `kiyaslama.test.ts` izin, süre, geri alma, en az grup ve kimlik testleri. Açık bulgu yok. | Yok. |
| 33 | tamam | `e2e/telefon.spec.ts`, `mobil.test.ts`; dalga 3 #3 `oturum-kapanis.test.ts` ile kapalı. | Yok. |
| 34 | inceleme | Yerel PG16 tatbikatı başarılı; Docker'lı tam tatbikat yapılmadı. | Docker, kayıt defteri ve GPU erişimli temiz sunucuda kurulum ve yükseltme tatbikatı, `helm lint`, model Türkçe ölçümü. |
| 35 | tamam | `yz-fabrika.test.ts`, `kurulum.test.ts`, `kurum-acilisi.test.ts`, `e2e/kurulum.spec.ts`. Dalga 4-7 #1 ve #7 kapalı. | Yok. |
| 36 | tamam | `yapilandirma.test.ts`, `isci.test.ts`, `test/uctan-uca.ts`. Açık bulgu yok. | Yok. |
| 37 | tamam | `web-arama.test.ts`, `web-tarama.test.ts`, `e2e/arastirma.spec.ts`; dalga 4-7'de sorun yok. | Ölçüt dışı: OpenRouter yanıtının canlı doğrulanması. |
| 38 | tamam | `devir.test.ts` (bildirimsiz süreli onay yok, tetikleyici `bildirilen` denetimi, izin günlükten). Dalga 4-7 düzeltme 1, #4, #5 kapalı. | Ölçüt dışı: yönergenin avukat ve Senato incelemesi, Proliz seçicileri. |
| 39 | tamam | `karar.test.ts`, `puko.test.ts`, `puko-vt.test.ts`, `vt/test/puko.test.ts`, `e2e/kararlar.spec.ts`. #2, #3, D8-1 kapalı; D8-12 (düşük) gerekçeyle ertelendi: değer `null` olur, kart uydurulmaz. | Yok. |
| 40 | tamam | `cikis-kapisi.test.ts`, `veri-akisi.test.ts` (envanter güncelliği), `kriptografik-silme.test.ts`. | Hukuk paketi TASLAK; avukat incelemesi İP-28'de. |
| 41 | tamam | `ornek-veri` testleri, `demo.test.ts` (XFF düzeltmesi), `e2e/deneyin.spec.ts`. | Yok. |
| 42 | tamam | `site.test.ts`, `e2e/pilot.spec.ts`. Yol haritası testi tamam/şimdi/sonra durumlarıyla plana bağlandı. | Yok. |
| 43 | inceleme | D8-3 ve D8-4 (orta) açık. D8-4 kod işidir (yükleme ucu, kırpıntı erişimi). | D8-3: pilotta örnek kâğıtlarla model doğruluğu ve eşik ölçümü. |
| 45 | tamam | `belge-istegi.test.ts` (servis ve işçi), `api/istek/yukle.test.ts`, `e2e/istek.spec.ts`. D8-2, D8-5, D8-6, D8-7 kapalı. | Dağıtım: vekilin `x-real-ip` yazması (G-27-4 ile izlenir). |
| 48 | inceleme | D8-8 oran kısmı bu turda kapandı. "Demo kiracısında çalışır; axe temiz" için e2e yok (kod işi); D8-8 prova kısmı ve D8-9 açık. | Yok (kalanlar kod işi). |

## Bekleyenlerin durumu

| İP | Önceki | Yeni | Gerekçe |
|---|---|---|---|
| 44 | bekliyor | hazır | İP-19 ve İP-20 tamam. |
| 46 | bekliyor | bekliyor | İP-23 hâlâ inceleme. |
| 47 | bekliyor | bekliyor | İP-11 ve İP-19 tamam, ama İP dosyasının kendi ön koşulu olan MÜDEK, FEDEK, EPDAD, SABAK resmî kılavuz ve tablo şablonları `kaynaklar/resmi/` altında yok. |

## Site

`apps/web/src/site/icerik.ts` YOL_HARITASI'na "tamam" dalgası eklendi (İP-38…42 ve 45); `/yol-haritasi` sayfası "Tamamlananlar" bölümünü gösterir; modül dayanak notları (ÖDR, KİDR, mobil, Bologna, kanıt avcısı, Word paketi) güncellendi. ÖDR ve KİDR modülleri panelde gerçek veriyle pilot yapılmadığı için "yapımda" kalır.
