// Araç belgesi: `apps/mcp/ARACLAR.md` bu işlevden üretilir; test, depodaki belgenin güncel olduğunu denetler.

import { ARACLAR, type Arac, aracTanimi, BELGE_NOTU } from "./araclar.ts";
import { PROTOKOL_SURUMLERI, SUNUCU_TALIMATI } from "./sunucu.ts";

export function araclarBelgesi(araclar: readonly Arac[] = ARACLAR): string {
  const s: string[] = [
    "# Akredit MCP araçları",
    "",
    "<!-- Bu dosya `pnpm --filter @akredit/mcp araclar` ile üretilir; elle düzenlemeyin. -->",
    "",
    `Protokol sürümleri: ${PROTOKOL_SURUMLERI.join(", ")}. Kimlik: API anahtarı (\`Authorization: Bearer akr_…\` ya da yerelde \`AKREDIT_ANAHTARI\`).`,
    "",
    `Sunucu talimatı: ${SUNUCU_TALIMATI}`,
    "",
    `Belge içeriği taşıyan yanıtlar \`{ not, tur: "belge_verisi", veri }\` zarfıyla döner. Not: "${BELGE_NOTU}"`,
    "",
    "Karar veren, politika imzalayan ya da dışarı gönderen araç yoktur.",
    "",
    "| Araç | Ne yapar | Yetki | Salt okunur | Belge içeriği |",
    "|---|---|---|---|---|",
    ...araclar.map(
      (a) =>
        `| \`${a.ad}\` | ${a.aciklama} | ${a.yetki} | ${a.saltOkunur ? "evet" : "hayır"} | ${a.belgeIcerir ? "evet" : "hayır"} |`,
    ),
    "",
  ];
  for (const a of araclar) {
    s.push(
      `## \`${a.ad}\`: ${a.baslik}`,
      "",
      a.aciklama,
      "",
      "```json",
      JSON.stringify(aracTanimi(a).inputSchema, null, 2),
      "```",
      "",
    );
  }
  return s.join("\n");
}
