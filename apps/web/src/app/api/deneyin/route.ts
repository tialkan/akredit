// Demo oturumu açma ucu (İP-41). Mantık `src/demo/uc.ts`; burada yalnız tekil nesneler bağlanır.

import { beklenmeyenHataYaniti, demoAcikMi, demoUcu } from "../../../demo/uc.ts";
import { tekiller } from "../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

const kuresel = globalThis as unknown as { __akreditDemoUcu?: ReturnType<typeof demoUcu> };

export async function POST(istek: Request): Promise<Response> {
  if (!demoAcikMi(process.env)) return Response.json({ hata: "Örnek kurum bu kurulumda kapalı." }, { status: 404 });
  const { kimlik } = await tekiller();
  kuresel.__akreditDemoUcu ??= demoUcu(kimlik);
  try {
    return await kuresel.__akreditDemoUcu(istek);
  } catch {
    // Betiksiz form ham JSON görmesin: `/kurum-demosu?hata=hazir`'a döner (inceleme, kurucu kararı madde 8).
    return beklenmeyenHataYaniti(istek, kimlik.ayar.temelAdres);
  }
}
