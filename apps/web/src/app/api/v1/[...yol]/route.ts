// Akredit REST API (`/api/v1/...`). Uçlar ve şemalar `@akredit/servis` içindedir; OpenAPI belgesi
// `/api/v1/openapi.json` adresindedir.

import { tekiller } from "../../_ortak/sunucu.ts";
import { v1Isleyici } from "../../_ortak/v1.ts";

export const dynamic = "force-dynamic";

async function isle(istek: Request): Promise<Response> {
  const { kimlik, api } = await tekiller();
  return v1Isleyici(kimlik, api)(istek);
}

export { isle as GET, isle as PATCH, isle as POST };
