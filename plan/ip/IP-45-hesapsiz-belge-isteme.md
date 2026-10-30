# İP-45: İdari birimlerden hesapsız belge isteme bağlantısı

- **Durum:** inceleme
- **Faz:** 8
- **Bağımlılık:** İP-10, İP-14
- **Sahip olduğu yollar:** `packages/servis/src/belge-istegi/**`, `apps/web/src/app/(istek)/**`, `apps/web/src/app/api/istek/**`, `apps/web/src/app/panel/kanitlar/istekler/**`, `apps/isci/src/belge-istegi/**`, `packages/vt/src/sema/belge-istegi.ts`, `packages/vt/src/gocler/0080_belge_istegi.sql`, `packages/vt/src/gocler/meta/_journal.json` (tek satır), `docs/raporlar/IP-45.md`
- **Büyüklük:** orta

## Amaç

Kanıtların bir kısmı idari birimlerde (personel daire başkanlığı, kütüphane, SKS, BİDB) durur. Bu birimlere hesap açmak hem lisans hem eğitim yükü getirir. Sistem eksik kanıt için birime e-postayla tek kullanımlık bağlantı gönderir; birim yetkilisi giriş yapmadan dosyayı yükler.

## Kapsam

1. **İstek.** Kalite komisyonu ya da süreç motoru (İP-14) eksik kanıt gereksinimi için istek oluşturur: alıcı e-posta, ne istendiği (gereksinim metni çerçeveden), son tarih. Hatırlatma süreç motorunun takvimiyle.
2. **Bağlantı.** HMAC imzalı, tek kullanımlık ve süreli belirteç (onay e-postası ve anket belirteci desenleri, `servis/onay/eposta.ts`, `anket/belirtec.ts`). Belirteç veritabanında yalnız özetiyle saklanır. Kullanıldıktan ya da süresi dolduktan sonra geçersiz.
3. **Yükleme sayfası.** Tek ekran: ne istendiği, kim istediği, dosya seçimi, kısa not, gönder. Hesap, parola ya da çerez gerekmez. Dosya türü ve boyutu denetlenir; dosya kanıt hattına (İP-10) "dış birimden, doğrulanmamış" etiketiyle girer.
4. **Doğrulama.** Gelen dosya otomatik kanıt olmaz; kanıt kabulü komisyon üyesinin kararıdır (Katman 1 ya da 2, kurum politikasına göre). İstek ve yükleme değiştirilemez günlükte.
5. **Kötüye kullanım.** Hız sınırı, boyut sınırı, Origin denetimi, bağlantı tahmin edilemez; sayfa belge metnini modele talimat olarak geçirmez (ilke 5).

## Kabul ölçütleri

- [x] Belirteç tek kullanımlık, süreli; ikinci kullanım ve süre aşımı reddedilir (test).
- [x] Belirteç açık hâlde veritabanına ve günlüğe yazılmaz (test).
- [x] Yüklenen dosya SHA-256 ile kanıt hattına girer, "doğrulanmamış" durumla; kabul kararı olmadan hiçbir rapora atıf olamaz (test).
- [x] Yükleme sayfası hesapsız çalışır, axe temiz, 375 px'te kullanılabilir (e2e).
- [x] E-posta yoksa istek oluşturulur ama gönderilmedi diye işaretlenir; panel bunu söyler.
- [x] Veri akış envanteri güncel; `pnpm verify` temiz.

## Günlük

- 2026-10-29: İP dosyası yazıldı.
- 2026-10-30: Uygulandı, durum inceleme. Göç 0080: `belge_istegi` (belirteç yalnız SHA-256 özetiyle), `belge_istegi_gonderimi` (ilk ve hatırlatma, gönderildi ya da gönderilmedi), `belge_istegi_yuklemesi` (birincil anahtar istek kimliği, tek kullanım); üçü de yalnız eklenir ve kurum yalıtımlı. `kanit_olcut_baglantisi` üzerine tetikleyici: `kaynak_ayrinti.dogrulama = dogrulanmamis` olan kanıt, kabul önerisine onaylı karar olmadan ölçüte bağlanamaz. Servis `belgeIstegi`: HMAC imzalı jeton (yükte kurum, istek, 32 bayt rastgele), istek oluşturma (yetki `kanit.yukle`), ön izleme, yükleme (kanıt + kanıt etiketi önerisi, risk orta), panel listesi, hatırlatma listesi, dosya türü denetimi (uzantı + ilk baytlar, 20 MB). Web: `/belge-yukle?j=…` hesapsız sayfa (`?j=ornek` kaydetmeyen örnek), `/api/istek/yukle` (Origin, gövde boyutu, bal küpü, 2 sn süre, bağlantı depoya koymadan önce denetlenir), `/panel/kanitlar/istekler` (form, liste, gönderilmedi uyarısı, bağlantı bir kez gösterilir). İşçi: süreç turunda hatırlatma ve kuyruğa alma. Kararlar: hatırlatma bağlantı içermez (jeton saklanmaz); imza anahtarı ayrı ortam değişkeni `AKREDIT_ISTEK_GIZLI`; kabul mevcut onay akışıyla (kanıt etiketi önerisi). Kalan: kurum politikasına göre Katman 1/2 seçimi ayrı ayar olarak yok (mevcut yetki politikası belirler); `infra` ortam değişkeni eklenmedi; panel menüsüne bağlantı eklenmedi.
