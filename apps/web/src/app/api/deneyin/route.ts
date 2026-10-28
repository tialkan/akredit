// Demo oturumu açma ucu (İP-41). Mantık `src/demo/uc.ts`; burada yalnız tekil nesneler bağlanır.

import { demoAcikMi, demoUcu } from "../../../demo/uc.ts";
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
    return Response.json({ hata: "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin." }, { status: 500 });
  }
}
