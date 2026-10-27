import { manifest } from "../mobil.ts";

export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(manifest()), {
    headers: { "content-type": "application/manifest+json; charset=utf-8" },
  });
}
