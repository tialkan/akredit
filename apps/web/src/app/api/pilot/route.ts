// Pilot kurum başvurusu ucu (İP-42). İş kuralları ve denetimler: src/pilot/basvuru.ts.

import { ortamdanEpostaAyari, smtpTasiyici } from "@akredit/surec";
import { ortamdanPilotAlicisi, pilotBasvurusuIsle } from "../../../pilot/basvuru.ts";
import { barindirmaAcik, barindirmaKapaliYaniti } from "../../../site/barindirma.ts";
import { tekiller } from "../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  // Barındırılan hizmet askıdayken yeni kayıt alınmaz (src/site/barindirma.ts).
  if (!barindirmaAcik()) return barindirmaKapaliYaniti();
  const { db, kimlik } = await tekiller();
  let ham: unknown = null;
  try {
    ham = await istek.json();
  } catch {
    ham = null;
  }
  const smtp = ortamdanEpostaAyari(process.env);
  const y = await pilotBasvurusuIsle(
    {
      db,
      simdi: () => new Date(),
      temelAdres: kimlik.ayar.temelAdres,
      izinliKokenler: kimlik.ayar.izinliKokenler,
      gizli: kimlik.ayar.gizli,
      tasiyici: smtp ? smtpTasiyici(smtp) : null,
      alici: ortamdanPilotAlicisi(process.env),
      uyar: (m) => console.warn(`[pilot] ${m}`),
    },
    istek,
    ham,
  );
  return Response.json(y.govde, { status: y.durum });
}
