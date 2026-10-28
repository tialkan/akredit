// "Kurumunuzu açın" başvurusu (İP-35): doğrulama bağlantısı yöneticinin kurumsal e-postasına gider.

import { basvuruIsle } from "../../../kimlik/kurum-acilisi.ts";
import { tekiller } from "../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  let ham: unknown = null;
  try {
    ham = await istek.json();
  } catch {
    ham = null;
  }
  const y = await basvuruIsle(kimlik, istek, ham);
  return Response.json(y.govde, { status: y.durum });
}
