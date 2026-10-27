// Anlık bildirim aboneliği. Saklama şimdilik süreç belleğindedir (AbonelikDeposu arayüzü); kalıcı tablo ve
// VAPID ile gönderim sonraki İP'de bağlanır.
import { korumali } from "../../../../kimlik/erisim.ts";
import { gercekVeriMi, tekiller } from "../../../api/_ortak/sunucu.ts";
import { abonelikIsle, bellekAbonelikDeposu } from "../mobil.ts";

const depo = bellekAbonelikDeposu();

async function isle(istek: Request): Promise<Response> {
  if (!gercekVeriMi()) return abonelikIsle(istek, "ornek", depo);
  const { kimlik } = await tekiller();
  return korumali(kimlik, async (i, b) => {
    if (!b.kullaniciId || b.tur !== "oturum")
      return Response.json({ hata: "Oturum açmanız gerekiyor." }, { status: 401 });
    return abonelikIsle(i, b.kullaniciId, depo);
  })(istek);
}

export const POST = isle;
export const DELETE = isle;
