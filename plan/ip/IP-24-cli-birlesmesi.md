# İP-24: Akreddit CLI ve Claude Code eklentisinin platformla birleşmesi

- **Durum:** inceleme
- **Faz:** 4
- **Bağımlılık:** İP-01, İP-12
- **Sahip olduğu yollar:** `apps/cli/**`, `docs/raporlar/IP-24.md`
- **Büyüklük:** orta

## Amaç

Mevcut kullanıcıları kaybetmeden komut satırı aracını platformun çevrim dışı istemcisine dönüştürmek.

## Kapsam

1. `apps/cli` iş kurallarını `@akredit/cekirdek`'ten alır (eşdeğerlik testleri önce).
2. `akredit` komutu (eski `akreddit` takma adı korunur); API anahtarıyla akredit.org ya da kurum sunucusuyla eşitleme (çevrim dışı önce).
3. Claude Code eklentisi beceri ve kancaları güncellenir; pazar yeri `.claude-plugin/marketplace.json`.
4. Göç kılavuzu: mevcut çalışma klasörünün platforma aktarımı (kanıtlar, öneriler, kararlar, günlük).

## Kabul ölçütleri

- [x] Eski CLI testleri ve yeni eşdeğerlik testleri geçer.
- [x] Bir çalışma klasörü kayıpsız aktarılır, günlük zinciri doğrulanır.
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/24-cli-birlesmesi`). Önce eşdeğerlik testleri (`apps/cli/test/esdegerlik.test.mjs`, 8), sonra `bologna-denetle` ve `bologna-taslak-denetle` `lib/cekirdek.mjs` köprüsüyle `@akredit/cekirdek`e bağlandı; eski `lib/bologna.mjs` `denetle` ve `lib/bologna-taslak.mjs` eşdeğerlik referansı olarak kaldı. `akredit` komut adı eklendi (`akreddit` korunur). Aktarım paketi (`aktar-paketi`, `paket-dogrula`, `paket-ac`, `esitle`): kayıpsız, SHA-256 günlük zinciri, çevrim dışı önce. Eklentiye `platforma-aktar` becerisi, `bilgi/goc.md` kılavuzu; kök `.claude-plugin/marketplace.json` kaynağı `./apps/cli`. Kalan: sunucuda `POST /api/v1/aktarim` ucu yok (sonraki İP); rapor denetimi ve matris henüz CLI içi kodla çalışıyor. CLI testleri 23 → 36.
