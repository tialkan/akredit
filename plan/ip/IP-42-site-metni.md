# İP-42: Site metni: güçlü vaat, dört rol, pilot başvurusu

- **Durum:** devam
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

- [ ] Ana vaat korunur; mutlak ifadeler doğru biçimde yazılır; sorumluluk kutusu ana sayfada.
- [ ] `/kimler-icin` dört rolle; ana sayfada dört rol bağlantısı.
- [ ] Konum bölümü ve bağlantı tablosu.
- [ ] Her modülde durum; durumlar testle denetlenir; `/yol-haritasi` yayında.
- [ ] Son kullanıcı metninde depo yolu yok (test).
- [ ] `/pilot` formu; sunucu denetimleri testli; göç 0060; Coolify ortam değişkeni.
- [ ] 375 px'te "§" kırılmaz.
- [ ] `pnpm verify` temiz, web derlemesi başarılı, e2e (axe) geçer; 375/1440 ekran görüntüleri.

## Günlük

- 2026-10-28: İP dosyası yazıldı, iş başladı (dal `ip/42-site-metni`).
