# İP-35: Kurum açılışı (self-servis), kurulum sihirbazı ve kurum anahtarıyla YZ

- **Durum:** inceleme
- **Faz:** 6
- **Bağımlılık:** İP-03, İP-09, İP-12, İP-32
- **Sahip olduğu yollar:** `packages/servis/src/kurum-acilisi.ts`, `packages/servis/src/kurulum/**`, `packages/servis/src/yz-fabrika.ts`, `packages/vt/src/gocler/0009_kurum_acilisi.sql`, `packages/vt/src/sema/kurulum.ts`, `apps/web/src/kimlik/kurum-acilisi.ts`, `apps/web/src/kimlik/kurulum-uclari.ts`, `apps/web/src/app/(site)/kurum-ac/**`, `apps/web/src/app/kurulum/**`, `apps/web/src/app/panel/birimler/**`, `apps/web/src/app/api/kurum-acilisi/**`, `apps/web/src/app/api/kurulum/**`, `apps/web/e2e/kurulum.spec.ts`, `apps/web/e2e/yardim/**`, `docs/raporlar/IP-35.md`
- **Büyüklük:** büyük

## Amaç

Bir kurumun hiçbir teknik yardım almadan Akredit'i açıp hocaların işini sıfıra yakın tutacak biçimde kullanabilmesi.

## Kapsam

1. Kurumun kayıtlı OpenRouter anahtarını bütün YZ işlerinde kullanan tek sağlayıcı fabrikası. Anahtar yoksa iş "Yapay zekâ anahtarı tanımlı değil" diye durur, bildirim kurum yöneticisine düşer. Yurt dışı izni ve maskeleme korunur; anahtar günlüğe, hata iletisine ve iş yüküne girmez.
2. "Kurumunuzu açın" akışı: başvuru, kurumsal e-posta alan adı doğrulaması (tek kullanımlık bağlantı), kurum ve ilk yöneticinin oluşması; hız sınırı; aynı alan adına ikinci kurum yok. Ardından kurulum sihirbazı: (a) OpenRouter anahtarı ve harcama sınırı hatırlatması, (b) yurt dışı aktarım kararı (açık metin, adıyla imza, günlük), (c) Bologna adresinden birim/program/PÇ/ders önerisi ve onay, (d) hocaların daveti (Bologna adları öneri, e-posta yöneticiden ya da CSV'den), (e) çerçeve seçimi.
3. Birim ve program yönetimi ekranı: listele, ekle, düzelt (düzeltme yeni kayıtla), kişi-rol ataması.
4. Kıyaslama: YÖK Atlas'ın artık vermediği `yerlesen` alanı için doluluk göstergesi "veri yok".
5. DOCX üst bilgisinde "Taslak: onaylanmadı" (em dash yok).
6. Site: "Kurumunuzu açın" adımları ve geliştirme durumu notları.

## Kabul ölçütleri

- [x] Kurum anahtarı iş anında kasadan çözülür; iş yükünde, durum kaydında, günlükte ve hata iletisinde anahtar yok (`packages/servis/test/yz-fabrika.test.ts`, `apps/isci/src/kanit-hatti/yz-fabrika.test.ts`).
- [x] Anahtar yoksa iş açık iletiyle durur; bildirim yalnız kurum yöneticisine, 24 saatte bir (aynı testler).
- [x] Yurt dışı izni yoksa çağrı yapılmaz; izinliyse ad ve telefon maskeli gider (aynı testler).
- [x] Başvuru, doğrulama, kurum ve ilk yönetici oluşumu; hız sınırı; alan adı eşleşmesi; ikinci kurum yok (`packages/servis/test/kurulum.test.ts`, `packages/vt/test/kurum-acilisi.test.ts`, `apps/web/src/kimlik/kurum-acilisi.test.ts`).
- [x] Sihirbazın beş adımı ve birim yönetimi tarayıcıda uçtan uca (`apps/web/e2e/kurulum.spec.ts`, axe WCAG 2.2 AA her ekranda).
- [x] Bologna'daki "Dersi Verenler" adları yalnız öneri; e-posta üretilmez (`kurulum.test.ts`, e2e).
- [x] Kıyaslamada doluluk "veri yok" (`packages/kiyaslama/test/kiyaslama.test.ts`).
- [x] Sihirbaz ekranlarının 1440 px görüntüleri `docs/marka/kurulum-*-1440.png`, `kurum-ac-1440.png`, `panel-birimler-1440.png`.
- [x] `pnpm verify` temiz, `pnpm --filter @akredit/web build` başarılı, Playwright 162/162.

## Günlük

- 2026-10-28: Uygulandı (dal `ip/35-kurum-acilisi`).
  - Fabrika `packages/servis/src/yz-fabrika.ts`: kurum anahtarı → OpenRouter; yoksa kurum içi model (açılışta verilen yerel sağlayıcı); yoksa `YzAnahtariYokHatasi` + yönetici bildirimi. Sağlayıcı hataları anahtardan arındırılır. İşçi (`HatBaglami.kurumFabrikasi`) ve Bologna taslağı (köprüde sabit sağlayıcı yoksa) fabrikayı kullanır.
  - Göç 0009: `kurum_acilis_talebi` (kiracı tablosu değil, yalnız belirteç özeti ve tuzlu ağ izi), `kurum_olustur()` (uygulama rolü kurum ekleyemediği için, yalnız doğrulanmış talep üzerinden, tanımlayıcı haklarıyla), `kayit_duzeltmesi` (yalnız ekleme).
  - Karar: birim/program düzeltmesinde kayıt kimliği korunur (dersler, roller, kanıtlar bu kimliğe bağlı); eski ve yeni değer `kayit_duzeltmesi`ne yeni kayıt olarak eklenir, günlüğe girer, sonra güncel değer yazılır.
  - Karar: doğrulama bağlantısı açılınca oturum doğrudan açılmaz; Better Auth'un sihirli bağlantısı ayrıca gönderilir (iki e-posta). Böylece oturum yalnız kimlik katmanında açılır.
  - Karar: sihirbaz ve kurulum uçları veri kipinden bağımsız, her zaman gerçek veritabanıyla çalışır. Panelin geri kalanı örnek kipte örnek veri gösterir.
  - Karar: Bologna okuması SSRF'e karşı yalnız https ve kamuya açık adres; yerel örnek sunucu yalnız `AKREDIT_TEST_KIPI=1` ve `AKREDIT_BOLOGNA_YEREL_IZIN=1` ile.
  - Karar: hocalar program kapsamında `ogretim_elemani` olarak davet edilir (ders kapsamı ayrı davet gerektirirdi).
  - Kalan: işçinin süreç girişi (pg-boss ile `kanitHattiniBaslat` çağrısı) depoda yok; bağlanırken `kurumFabrikasi` verilmeli. Bologna sayfaları program ve birim adını vermediği için bu adları yönetici yazar.
