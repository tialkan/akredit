# İP-42: Site metni: güçlü vaat, dört rol, pilot başvurusu

- **Durum:** tamam
- **Faz:** 7
- **Bağımlılık:** İP-07
- **Sahip olduğu yollar:** `apps/web/src/site/**`, `apps/web/src/app/(site)/**`, `apps/web/src/app/api/pilot/**`, `apps/web/src/pilot/**`, `apps/web/e2e/sayfalar.ts`, `apps/web/e2e/pilot.spec.ts`, `apps/web/public/llms.txt`, `apps/web/src/app/sitemap.ts`, `packages/vt/src/gocler/0060_pilot_basvurusu.sql`, `packages/vt/src/gocler/meta/_journal.json` (tek satır), `infra/coolify/docker-compose.yml` (tek değişken), `docs/tasarim/ekranlar/*-ip42-*.png`, `docs/raporlar/IP-42.md`
- **Büyüklük:** orta

## Amaç

Dış incelemelerden sonra (docs/danismanlik/2026-10-28-dis-incelemeler.md) site metnini kurucu kararlarına göre yeniden yazmak. Vaat yumuşatılmaz: dosyayı sistem hazırlar, hocaya kalan iş sıfır evrak işi ve tek dokunuş karardır. Mutlak teknik ifadeler doğru ve yine güçlü biçimde yazılır. Dört karar verici rol için ayrı anlatım ve pilot kurum başvurusu eklenir.

## Kapsam

1. **Vaat dili.** "Sıfır evrak angaryası, tam akademik irade" çerçevesi. "Değiştirilemez" → iz bırakmadan değiştirilemez, her değişiklik yeni kayıt olarak görünür (özet zinciri). "Silinemez" → KVKK silme hakkıyla uyumlu açıklama. "Her cümlesine kaynak" → kanıtı olmayan olgusal cümle rapora girmez, EKSİK işaretlenir. Sorumluluk kutusu: resmî beyan ve sorumluluk onaylayan kurum yetkilisindedir. Ölçülmemiş rakam yok.
2. **Dört rol.** Rektörlük, kalite komisyonu, bölüm başkanı, öğretim elemanı. `/kimler-icin` yeniden kurulur; ana sayfadan dört role yönlendirme.
3. **Konum.** Mevcut sistemlerin (OBS/Proliz, EBYS, AVESİS, ÜNİKYS vb.) yerine geçmez, üstünde çalışır; kısa bağlantı tablosu. Karşılaştırmalı iddia yok.
4. **Durum dürüstlüğü.** `/ne-yapar` modül listesinde her modüle durum (Yayında / Pilotta doğrulanıyor / Yapım aşamasında), koddan doğrulanmış; `/yol-haritasi` sayfası (İP-38…48 sade dille).
5. **Depo yolları gizlenir.** Dayanaklar insan diliyle başlık ve GitHub bağlantısı taşır; test, son kullanıcı metninde depo yolu bulunmasını engeller.
6. **Pilot başvurusu.** `/pilot` sayfası ve form; sunucuda zod, hız sınırı, bal küpü, gönderim süresi, Origin denetimi; veritabanına kayıt (göç 0060); SMTP varsa kurucuya bildirim (`AKREDIT_PILOT_ALICI`), yoksa kaydedip uyarı günlüğü.
7. **375 px düzeltmesi.** Ana sayfa başındaki "§" işaretinin satıra kırılması.

## Kabul ölçütleri

- [x] Ana vaat korunur; mutlak ifadeler doğru biçimde yazılır; sorumluluk kutusu ana sayfada.
- [x] `/kimler-icin` dört rolle; ana sayfada dört rol bağlantısı.
- [x] Konum bölümü ve bağlantı tablosu.
- [x] Her modülde durum; durumlar testle denetlenir; `/yol-haritasi` yayında.
- [x] Son kullanıcı metninde depo yolu yok (test).
- [x] `/pilot` formu; sunucu denetimleri testli; göç 0060; Coolify ortam değişkeni.
- [x] 375 px'te "§" kırılmaz.
- [x] `pnpm verify` temiz, web derlemesi başarılı, e2e (axe) geçer; 375/1440 ekran görüntüleri.

## Günlük

- 2026-10-28: İP dosyası yazıldı, iş başladı (dal `ip/42-site-metni`).
- 2026-10-29: Uygulandı. Vaat çerçevesi, iş bölümü, sorumluluk kutusu; dört rol; konum tablosu; modül durumları ve /yol-haritasi; dayanaklar GitHub bağlantısıyla; /pilot formu, 0060 göçü, Coolify değişkeni; 375 px § düzeltmesi. Bütün kabul ölçütleri karşılandı. `pnpm check`, typecheck, bütün testler temiz; web build başarılı; e2e (pilot, duman, axe, klavye) 142 geçti. Ayrıntı: `docs/raporlar/IP-42.md`.
- Karar: göç idx 60 (başka dalların 0012+ göçleriyle çakışmasın diye); başvuru tablosu kiracısız ve yalnız eklemeli.
- Karar: pilot kurumun adı yazılı onay olmadan sitede yazılmaz (kurucu notu).
- Kalan: başvuruları görüntüleyen yönetim ekranı; CDN hız sınırı kuralı.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `apps/web/src/site/site.test.ts`, e2e `pilot.spec.ts`. Yol haritası testi bu kapanışta tamam/şimdi/sonra üç durumuyla plan tablosuna bağlandı. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam.
