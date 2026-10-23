# İP-14: Süreç motoru, takvim ve bildirim

- **Durum:** bekliyor
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

- [ ] Sahte saatle zamanlayıcı testleri.
- [ ] Bir dönem sonu süreci uçtan uca (başlat → görev → hatırlat → kanıt → kapanış).
- [ ] Takvim dosyası standart istemcilerde açılır.
- [ ] `pnpm verify` temiz.

## Notlar

Takvim tarihleri (KİDR son tarihi vb.) kod içine gömülmez; kurum ayarı ve çerçeve verisinden gelir.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
