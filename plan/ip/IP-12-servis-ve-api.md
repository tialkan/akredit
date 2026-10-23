# İP-12: Servis katmanı ve API

- **Durum:** bekliyor
- **Faz:** 2
- **Bağımlılık:** İP-01, İP-02, İP-09
- **Sahip olduğu yollar:** `packages/servis/**`, `apps/web/src/app/api/**`, `apps/web/src/veri/gercek.ts`, `docs/raporlar/IP-12.md`
- **Büyüklük:** büyük

## Amaç

Arayüzün, CLI'nin, MCP sunucusunun ve bağlayıcıların aynı iş kurallarını aynı yetki denetimiyle kullanması.

## Kapsam

1. `packages/servis`: kanıt, çıktı, öneri/karar, matris, ölçme, rapor, süreç, ayar servisleri; her işlev yetki denetimi (`packages/yetki`) + zod doğrulama + günlük kaydı yapar.
2. Next.js sunucu eylemleri ve `/api/v1` REST; OpenAPI 3.1 belgesi zod şemalarından üretilir.
3. Sayfalama, idempotens anahtarı, hız sınırı, Türkçe hata gövdesi.
4. Web'deki sahte `VeriKaynagi`'nın gerçek uygulaması; panel gerçek veriyle çalışır.

## Kabul ölçütleri

- [ ] Her uç için yetkisiz erişim testi.
- [ ] OpenAPI belgesi geçerli ve CI'da üretilir.
- [ ] Panel gerçek veritabanıyla uçtan uca çalışır.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
