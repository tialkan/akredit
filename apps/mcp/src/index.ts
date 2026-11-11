// @akredit/mcp: Model Context Protocol sunucusu. Kapsam: plan/ip/IP-25-mcp-sunucusu.md
// Bu paket KURUM İÇİ MCP'dir: API anahtarı ister, kurumun veritabanına servis katmanının yetkisiyle erişir ve
// barındırmayla birlikte askıdadır (ADR 0008). akredit.org/mcp adresindeki herkese açık, hesapsız MCP bu paket
// değildir; o `apps/acik-mcp` (`@akredit/acik-mcp`) paketidir ve web'de `apps/web/src/app/mcp/route.ts` sunar.

export * from "./araclar.ts";
export * from "./belge.ts";
export * from "./kimlik.ts";
export * from "./sunucu.ts";
export * from "./tasima.ts";
