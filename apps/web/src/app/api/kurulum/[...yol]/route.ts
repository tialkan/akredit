// Kurulum sihirbazı ve birim/program yönetimi uçları (İP-35). İşleyici: kimlik/kurulum-uclari.ts.

import { kurulumIsleyici } from "../../../../kimlik/kurulum-uclari.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

async function isle(istek: Request): Promise<Response> {
  const { kimlik, db } = await tekiller();
  return kurulumIsleyici(kimlik, db)(istek);
}

export { isle as GET, isle as PATCH, isle as POST };
