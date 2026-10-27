import { KAPSAM, servisCalisaniKaynagi } from "../mobil.ts";

export const dynamic = "force-static";

export function GET() {
  return new Response(servisCalisaniKaynagi(), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-cache",
      "service-worker-allowed": KAPSAM,
    },
  });
}
