// https://akredit.org/mcp: herkese açık, hesapsız MCP uç noktası (İP-49). Durumsuz Streamable HTTP; araçlar
// salt okuma ve deterministik, kurum verisine ve veritabanına erişmez, model çağırmaz. İstek içeriği günlüğe
// yazılmaz (yalnız araç adı, süre, boyut, durum).

import { acikMcpIsleyici } from "@akredit/acik-mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isleyici = acikMcpIsleyici();

export const POST = (istek: Request) => isleyici(istek);
export const GET = (istek: Request) => isleyici(istek);
export const OPTIONS = (istek: Request) => isleyici(istek);
