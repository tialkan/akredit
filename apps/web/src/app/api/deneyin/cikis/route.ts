// Demodan çıkış ucu: oturumu kapatır, `/kurum-demosu`'na döner. Mantık `src/demo/uc.ts`.

import { demoCikisUcu } from "../../../../demo/uc.ts";
import { tanitimaYonlendir } from "../../../../site/barindirma.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

/** Tarayıcıda açılınca boş 405 yerine tanıtım sayfası (POST aynen kalır). */
export function GET(): Response {
  return tanitimaYonlendir("/kurum-demosu");
}

export async function POST(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  return demoCikisUcu(kimlik)(istek);
}
