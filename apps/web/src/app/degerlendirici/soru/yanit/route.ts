// Atıflı soru-cevap ucu: POST {soru}. CSRF ve oturum `korumali` ile; yanıt atıf güvencesinden geçer ve
// günlüğe yazılır.

import { aktorOlustur } from "../../../api/_ortak/v1.ts";
import { hataBilgisi, portalBaglami, soruSor } from "../../_portal/portal.ts";
import { portalSaglayicisi } from "../../_portal/sunucu.ts";

export const dynamic = "force-dynamic";

export async function POST(istek: Request): Promise<Response> {
  const [{ tekiller }, { korumali }] = await Promise.all([
    import("../../../api/_ortak/sunucu.ts"),
    import("../../../../kimlik/erisim.ts"),
  ]);
  const { kimlik, db } = await tekiller();
  return korumali(kimlik, async (r, baglam) => {
    try {
      const p = await portalBaglami({ db, aktor: aktorOlustur(baglam), simdi: () => new Date() });
      const s = portalSaglayicisi();
      if (!s)
        return Response.json(
          { hata: "Soru-cevap bu kurumda henüz açık değil. Sorunuzu kalite birimine iletin." },
          { status: 503 },
        );
      let govde: unknown;
      try {
        govde = await r.json();
      } catch {
        return Response.json({ hata: "Soru okunamadı. Yeniden deneyin." }, { status: 400 });
      }
      return Response.json(await soruSor(p, s, govde));
    } catch (e) {
      const h = hataBilgisi(e);
      if (!h) throw e;
      return Response.json({ hata: h.ileti }, { status: h.durum });
    }
  })(istek);
}
