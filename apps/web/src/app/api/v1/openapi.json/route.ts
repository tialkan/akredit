// OpenAPI 3.1 belgesi (herkese açık; veri içermez).

import { openapiBelgesi } from "@akredit/servis";

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(openapiBelgesi());
}
