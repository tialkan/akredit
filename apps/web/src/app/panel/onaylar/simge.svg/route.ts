import { SIMGE_SVG } from "../mobil.ts";

export const dynamic = "force-static";

export function GET() {
  return new Response(SIMGE_SVG, {
    headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" },
  });
}
