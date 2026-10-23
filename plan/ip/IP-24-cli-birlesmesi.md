# İP-24: Akreddit CLI ve Claude Code eklentisinin platformla birleşmesi

- **Durum:** bekliyor
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

- [ ] Eski CLI testleri ve yeni eşdeğerlik testleri geçer.
- [ ] Bir çalışma klasörü kayıpsız aktarılır, günlük zinciri doğrulanır.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
