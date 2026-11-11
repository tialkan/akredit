// Demodan çıkış ucu: oturumu kapatır, `/kurum-demosu`'na döner. Mantık `src/demo/uc.ts`.

import { demoCikisUcu } from "../../../../demo/uc.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  return demoCikisUcu(kimlik)(istek);
}
