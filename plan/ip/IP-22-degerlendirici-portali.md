# İP-22: Değerlendirici portalı ve sanal kanıt odası

- **Durum:** inceleme
- **Faz:** 4
- **Bağımlılık:** İP-09, İP-10, İP-12
- **Sahip olduğu yollar:** `apps/web/src/app/degerlendirici/**`, `docs/raporlar/IP-22.md`
- **Büyüklük:** orta

## Amaç

Dış değerlendiricilerin kanıtlara düzenli, süreli ve kayıtlı erişimi.

## Kapsam

1. Süreli, salt okunur değerlendirici hesapları; ziyaret programı.
2. Ölçüt ağacına göre düzenlenmiş kanıt odası, arama, belge görüntüleyici.
3. Kanıt deposu üzerinde atıflı soru-cevap (her yanıt kayıtlı).
4. Erişim günlüğü kuruma açık.

## Kabul ölçütleri

- [x] Değerlendirici hiçbir şeyi değiştiremez, süre bitince erişemez.
- [x] Soru-cevap yanıtları atıf güvencesinden geçer.
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (`ip/22-degerlendirici-portali`). Çekirdek `apps/web/src/app/degerlendirici/_portal/portal.ts`: portal bağlamı yalnız etkin `degerlendirici` atamalarıyla kurulur (süre bitince ya da bitişsiz atamada 403 + günlük), kanıt odası ölçüt ağacına göre ve servisin yetki/kiracı süzgecinden geçerek, belge görüntüleyici (metin parçaları), ziyaret programı (kurum ayarı `degerlendirici.ziyaretProgrami`), atıflı soru-cevap (`atifDenetle` + `atifsizlariIsaretle`, kanıt metni sınırlayıcı içinde, yurt dışı sağlayıcı kurum izni olmadan reddedilir), kurumun erişim günlüğü (`gunluk.oku`, `degerlendirici.*` eylemleri). Sayfalar: `/degerlendirici`, `/degerlendirici/kanit/[id]`, `/degerlendirici/soru` (+ POST `/degerlendirici/soru/yanit`), `/degerlendirici/erisim-gunlugu`. Yeni göç gerekmedi. 18 test. Kalan: üretim YZ sağlayıcısının bağlanması, özgün dosya indirme (`depo.baglanti`), ziyaret programı düzenleme arayüzü, panelden erişim günlüğüne bağlantı. Ayrıntı: `docs/raporlar/IP-22.md`.
