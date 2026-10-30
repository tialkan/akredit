// Hesapsız belge yükleme ucu (İP-45). İş kuralları: ../_ortak.ts.

import { ortamdanDepo } from "../../_ortak/kopruler.ts";
import { tekiller } from "../../_ortak/sunucu.ts";
import { istekGizlisi, yuklemeIsle } from "../_ortak.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  const { db, kimlik } = await tekiller();
  let depo = null;
  try {
    depo = ortamdanDepo(process.env);
  } catch {
    depo = null;
  }
  const y = await yuklemeIsle(
    {
      db,
      depo,
      gizli: istekGizlisi(),
      simdi: () => new Date(),
      temelAdres: kimlik.ayar.temelAdres,
      izinliKokenler: kimlik.ayar.izinliKokenler,
      tuz: kimlik.ayar.gizli,
      uyar: (m) => console.warn(`[belge-istegi] ${m}`),
    },
    istek,
  );
  return Response.json(y.govde, { status: y.durum, headers: { "cache-control": "no-store" } });
}
