# İP-29: Kullanıcı belgeleri ve eğitim

- **Durum:** inceleme
- **Faz:** 5
- **Bağımlılık:** İP-07 ve kullanıcıya dönük İP'ler
- **Sahip olduğu yollar:** `docs/kilavuz/**`, `apps/web/src/app/(site)/belgeler/**`, `docs/raporlar/IP-29.md`
- **Büyüklük:** orta

## Amaç

Hocanın kılavuz okumadan kullanabilmesi; kalite birimlerinin ve bilgi işlemin ihtiyaç duyduğu belgelerin hazır olması.

## Kapsam

1. Görev odaklı kısa kılavuzlar (ekran görüntülü): onay vermek, belge eklemek, ders dosyası, rapor.
2. Kalite birimi kılavuzu: çerçeve seçimi, süreç takvimi, yetki politikaları.
3. Bilgi işlem kılavuzu: SSO, kurum içi kurulum, model sunucusu, yedekleme.
4. Kısa video senaryoları; uygulama içi ipuçları.

## Kabul ölçütleri

- [ ] Pilot kullanıcılarla okunabilirlik testi. (Yapılmadı: pilot ve kurum izni gerekir. Yönerge `docs/kilavuz/okunabilirlik-testi.md`; otomatik ön denetim `belgeler.test.ts`.)
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: `/belgeler` sitesi (hoca için 4 görev kılavuzu, kalite birimi, bilgi işlem özeti; tek kaynak `icerik.ts`, her kılavuzda "Şu an yapılamayanlar"), sadelik denetimi ve 33 test; `docs/kilavuz/` altında bilgi işlem teknik kılavuzu, 4 video senaryosu, ipucu metinleri, okunabilirlik testi yönergesi. Kalanlar: pilot okunabilirlik testi, ekran görüntüleri, ipuçlarının panele yerleştirilmesi, site menüsü bağlantısı, video çekimi. Karar: kılavuz metni Markdown'a kopyalanmadı (ayrışmasın diye). Rapor: `docs/raporlar/IP-29.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. İnsan bekleyen: pilot kullanıcılarla okunabilirlik testi (`docs/kilavuz/okunabilirlik-testi.md`), kurum izni ve pilot (İP-30). Durum inceleme.
