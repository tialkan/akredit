# İP-14: Süreç motoru, takvim ve bildirim

- **Durum:** inceleme
- **Faz:** 2
- **Bağımlılık:** İP-02, İP-12
- **Sahip olduğu yollar:** `packages/surec/**`, `apps/isci/src/surec/**`, `docs/raporlar/IP-14.md`
- **Büyüklük:** büyük

## Amaç

Kalite döngülerini (PUKÖ) insan hatırlamadan yürütmek: zamanında başlatmak, görev açmak, hatırlatmak, kanıtını toplamak.

## Kapsam

1. Bildirimsel süreç tanımları: adımlar, tetikleyiciler (tarih, olay, koşul), görevler, hatırlatma ve yükseltme kuralları.
2. Hazır süreçler: dönem sonu ders dosyası ve ölçme, yıllık KİDR ve BİDR takvimi, anket döngüleri, danışma kurulu toplantısı, PUKÖ eylem izleme, program akreditasyonu başvuru/ÖDR/ziyaret takvimi, Bologna güncelleme haftası.
3. Akademik takvim içe aktarma; .ics takvim çıktısı; e-posta ve uygulama içi bildirim; sessiz saatler ve özet tercihleri.
4. Süreç örneği durumu ve kanıt bağları panelde görünür.

## Kabul ölçütleri

- [x] Sahte saatle zamanlayıcı testleri. (`packages/surec/test/zaman-bildirim.test.ts` › "sahte saat"; `apps/isci/src/surec/surec.test.ts`, zamanlayıcı sahte saatle günleri ilerletir)
- [x] Bir dönem sonu süreci uçtan uca (başlat → görev → hatırlat → kanıt → kapanış). (`surec.test.ts` › "başlat → görev → hatırlat → kanıt → kapanış")
- [x] Takvim dosyası standart istemcilerde açılır. (`takvim-eposta.test.ts`: RFC 5545 kuralları + `node-ical` ile ayrıştırma; elle istemci denemesi yapılmadı)
- [x] `pnpm verify` temiz.

## Notlar

Takvim tarihleri (KİDR son tarihi vb.) kod içine gömülmez; kurum ayarı ve çerçeve verisinden gelir.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/14-surec-motoru`). `packages/surec`: zod'lu bildirimsel tanım (tarih/olay/koşul tetikleyici, son tarih, en az kanıt, hatırlatma, yükseltme), saf motor (tekil eylem anahtarlarıyla tekrar çalıştırmaya dayanıklı; geç kalınmış hatırlatmaları yağdırmaz; takvimde olmayan tarih `eksik_tarih` olur, uydurulmaz), 7 hazır süreç (yalnız takvim anahtarı, tarih gömülü değil), .ics üretimi/okuma ve akademik takvim eşleme (çatışma insana bırakılır), sessiz saat ve günlük özet, SMTP e-posta gönderici (nodemailer). `apps/isci/src/surec`: VT uygulayıcısı (görev + son tarih + bildirim + günlük), kanıt bağlama, kanıtsız kapanış yasağı, kendiliğinden başlatma, zamanlayıcı, panel için `surecDurumu`, takvim içe/dışa aktarma. Yeni göç gerekmedi (mevcut `surec_*`, `gorev`, `son_tarih`, `bildirim` tabloları). Kalan: panel sayfası ve API uçları (web/servis yolları), pg-boss ile üretim zamanlaması, kişi tercihi düzenleme arayüzü.
