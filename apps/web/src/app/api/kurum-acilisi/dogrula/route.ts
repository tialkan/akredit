// Kurum açılışı doğrulaması (İP-35): kurum ve ilk yönetici oluşur, giriş bağlantısı gönderilir.

import { dogrulamaIsle } from "../../../../kimlik/kurum-acilisi.ts";
import { barindirmaAcik, barindirmaKapaliYaniti, tanitimaYonlendir } from "../../../../site/barindirma.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

/** Tarayıcıda açılınca boş 405 yerine tanıtım sayfası (POST aynen kalır). */
export function GET(): Response {
  return tanitimaYonlendir("/kurum-ac");
}

export async function POST(istek: Request): Promise<Response> {
  // Barındırılan hizmet askıdayken yeni kayıt alınmaz (src/site/barindirma.ts).
  if (!barindirmaAcik()) return barindirmaKapaliYaniti();
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
