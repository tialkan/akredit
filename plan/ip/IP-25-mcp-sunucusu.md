# İP-25: MCP sunucusu

- **Durum:** bekliyor
- **Faz:** 4
- **Bağımlılık:** İP-12, İP-13
- **Sahip olduğu yollar:** `apps/mcp/**`, `docs/raporlar/IP-25.md`
- **Büyüklük:** orta

## Amaç

Claude ve diğer YZ istemcilerinin akredit.org verisiyle aynı güvencelerle çalışabilmesi.

## Kapsam

1. Model Context Protocol sunucusu: kanıt arama, kanıt okuma, öneri oluşturma, rapor denetimi, matris, ölçme araçları.
2. API anahtarıyla kimlik, kurum yetkileri aynen; karar verme aracı yoktur (öneri üretir, onay kutusuna düşer).
3. Uzak (HTTP) ve yerel kullanım.

## Kabul ölçütleri

- [ ] Hiçbir MCP aracı karar kaydı oluşturamaz (test).
- [ ] Araç tanımları ve şemalar belgeli.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
