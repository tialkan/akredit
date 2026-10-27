# İP-12: Servis katmanı ve API

- **Durum:** inceleme
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

- [x] Her uç için yetkisiz erişim testi. — `packages/servis/test/http.test.ts`: 23 uç × (oturumsuz 401, rolsüz kişi 403 ya da sızıntısız boş liste, başka kurumun kişisi 404/sızıntısız) + dar kapsamlı API anahtarı.
- [x] OpenAPI belgesi geçerli ve CI'da üretilir. — `openapi.test.ts`: belge `UCLAR`+zod'dan üretilir, OpenAPI 3.1 şemasıyla doğrulanır, depodaki `packages/servis/openapi.json` ile karşılaştırılır (`pnpm verify` → CI).
- [x] Panel gerçek veritabanıyla uçtan uca çalışır. — `apps/web/src/veri/gercek.test.ts`: sihirli bağlantıyla giriş → çerezli `/api/v1` → servis → PGlite; tarayıcı (`ApiVeriKaynagi`) ve sunucu (`ServisVeriKaynagi`) yolları. Ayrıca `NEXT_PUBLIC_AKREDIT_VERI=gercek` ile derleme ve `next start` duman denemesi (401, /giris yönlendirmesi, OpenAPI).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/12-servis-ve-api`).
  - `packages/servis`: bağlam (aktör yalnız oturum/anahtardan; günlük aktörü buradan, inceleme bulgu 6), `islem` (kiracı işlemi + yetki + ret günlüğü), kanıt (kanıt hattı iş durumu dahil), öneri/karar (karar yalnız oturumla; toplu onayda etkin yüksek risk reddi, hepsi ya da hiçbiri), politika (taslak → adla imza → iptal yeni kayıtla; birim/program kimlikleri kurum denetimi; `uygulanabilirPolitikalar` iptal ve kapsamı uygular — bulgu 2, 3), program/ders/matris/ölçme, rapor, süreç, ayarlar, günlük, panel özeti.
  - HTTP: `UCLAR` tek tanım; işleyici (zod, Türkçe hata gövdesi `{hata, kod, alanlar}`), sayfalama (`sinir`, `imlec`), `Idempotency-Key` (`istek_tekrari`), jeton kovası hız sınırı, OpenAPI 3.1.
  - Göç `0005_servis.sql`: kişi kimliklerinin kurum sınırı tetikleyicisi (bulgu 1), `istek_tekrari` tablosu.
  - Web: `/api/kimlik/[...yol]`, `/api/v1/[...yol]`, `/api/v1/openapi.json`, `/api/davet`; `/giris` ve `/davet` sayfaları çalışır; panel `NEXT_PUBLIC_AKREDIT_VERI=gercek` ile gerçek veriye geçer; kanıtlar sayfasında işleme durumu.
  - Kalan: sunucu eylemleri yerine REST + istemci fetch kullanıldı; e-posta gönderici (İP-14); otomatik politika kararı (İP-13); Playwright ile gerçek veri kipinde e2e yok.
