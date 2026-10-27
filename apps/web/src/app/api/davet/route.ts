// Davet kabulü: oturum açmış kullanıcı, e-postasına gönderilen davet belirteciyle kuruma katılır.

import { z } from "zod";
import { hataYaniti } from "../../../kimlik/erisim.ts";
import { davetKabulEt } from "../../../kimlik/yonetim.ts";
import { tekiller } from "../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

const Govde = z.object({ belirtec: z.string().min(16).max(200) }).strict();

export async function POST(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  const koken = istek.headers.get("origin");
  if (koken !== new URL(kimlik.ayar.temelAdres).origin && !kimlik.ayar.izinliKokenler.includes(koken ?? ""))
    return Response.json({ hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." }, { status: 403 });
  let ham: unknown;
  try {
    ham = await istek.json();
  } catch {
    ham = null;
  }
  const g = Govde.safeParse(ham);
  if (!g.success)
    return Response.json({ hata: "Davet bağlantısı geçersiz. E-postadaki bağlantıyı yeniden açın." }, { status: 400 });
  try {
    await davetKabulEt(kimlik, istek, g.data.belirtec);
    return Response.json({ tamam: true });
  } catch (e) {
    return hataYaniti(e);
  }
}
