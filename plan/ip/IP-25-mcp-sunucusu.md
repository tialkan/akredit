# İP-25: MCP sunucusu

- **Durum:** inceleme
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

- [x] Hiçbir MCP aracı karar kaydı oluşturamaz (test). `apps/mcp/test/mcp.test.ts` › "hiçbir MCP aracı karar kaydı oluşturamaz".
- [x] Araç tanımları ve şemalar belgeli. `apps/mcp/ARACLAR.md` (tanımlardan üretilir, test güncelliği denetler).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/25-mcp`). `apps/mcp`: elle yazılmış JSON-RPC MCP sunucusu (initialize, ping, tools/list, tools/call), HTTP (durumsuz, Bearer anahtar, köken denetimi, hız sınırı) ve stdio taşıması. 12 araç: ben, kanit_ara, kanit_oku, oneri_listesi, oneri_olustur, rapor_listesi, rapor_oku, rapor_denetle, program_listesi, ders_listesi, matris, olcme. Kararlar: karar/imza/gönderim/yönetim eylemleri anahtar kapsamında olsa da MCP bağlamında düşürülür; öneri aracı politika motorunu çalıştırmaz (öneri insanı bekler); dış gönderim önerilemez; her öneri en az bir okunabilir kanıta bağlanır, alıntı kanıtta geçmeli; tür riski düşürülemez; belge/rapor metni `belge_verisi` zarfında döner. Göç yok. Kalan: web uygulamasında `/mcp` rotası (apps/web bu İP'nin yolu değil), OAuth, kişisel veri maskelemesi (İP-27/28).
