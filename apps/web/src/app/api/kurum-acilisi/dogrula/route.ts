// Kurum açılışı doğrulaması (İP-35): kurum ve ilk yönetici oluşur, giriş bağlantısı gönderilir.

import { dogrulamaIsle } from "../../../../kimlik/kurum-acilisi.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  let ham: unknown = null;
  try {
    ham = await istek.json();
  } catch {
    ham = null;
  }
  const y = await dogrulamaIsle(kimlik, istek, ham);
  return Response.json(y.govde, { status: y.durum });
}
