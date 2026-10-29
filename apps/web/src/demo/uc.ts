// `POST /api/deneyin` (İP-41): rol seçip demo oturumu açar. Betiksiz çalışır: `/deneyin` sayfasındaki düğmeler
// sıradan bir form gönderir, yanıt çerezle birlikte panele 303 yönlendirmedir.
//
// Güvenlik: yalnız AKREDIT_DEMO=1 iken açıktır; köken denetimi (CSRF); IP başına ve süreç geneli hız sınırı
// (her oturum demo kurumuna bir ziyaretçi kişisi ekler, sınırsız büyümesin).

import { HizSiniri } from "@akredit/servis";
import { z } from "zod";
import type { KimlikSunucusu } from "../kimlik/sunucu.ts";
import { DemoHatasi, demoOturumuAc } from "./oturum.ts";
import { DEMO_ROLLERI } from "./roller.ts";

export const demoAcikMi = (ortam: Record<string, string | undefined>): boolean => ortam.AKREDIT_DEMO === "1";

export interface DemoUcSecenekleri {
  /** IP başına: 6 oturum, sonra 10 dakikada bir. */
  ipBasina?: HizSiniri;
  /** Bütün süreç: 120 oturum, sonra saniyede bir. */
  genel?: HizSiniri;
}

const Govde = z.object({ rol: z.enum(DEMO_ROLLERI) });

function istemciIp(istek: Request): string {
  // Güvenilir vekil (Coolify) `x-real-ip` yazar ve gerçek adresi `x-forwarded-for` sonuna ekler; ilk değeri
  // istemci yazabilir, ona göre sınırlamak hız sınırını boşa çıkarır (kurum açılışı ve pilot formuyla aynı kural).
  return (
    istek.headers.get("x-real-ip")?.trim() ||
    istek.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "bilinmiyor"
  );
}

async function govdeOku(istek: Request): Promise<unknown> {
  const tur = istek.headers.get("content-type") ?? "";
  try {
    if (tur.includes("application/json")) return await istek.json();
    const f = await istek.formData();
    return Object.fromEntries(f.entries());
  } catch {
    return null;
  }
}

const hataSayfasi = (k: KimlikSunucusu, kod: string) =>
  new Response(null, {
    status: 303,
    headers: { location: new URL(`/deneyin?hata=${kod}`, k.ayar.temelAdres).toString() },
  });

export function demoUcu(k: KimlikSunucusu, s: DemoUcSecenekleri = {}) {
  const ipBasina = s.ipBasina ?? new HizSiniri({ kapasite: 6, saniyede: 1 / 600 });
  const genel = s.genel ?? new HizSiniri({ kapasite: 120, saniyede: 1 });
  return async (istek: Request): Promise<Response> => {
    const koken = istek.headers.get("origin");
    const izinli = [new URL(k.ayar.temelAdres).origin, ...k.ayar.izinliKokenler];
    if (!koken || !izinli.includes(koken))
      return Response.json({ hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." }, { status: 403 });
    const ip = ipBasina.al(istemciIp(istek));
    const g = ip.izin ? genel.al("genel") : ip;
    if (!g.izin)
      return new Response(null, {
        status: 303,
        headers: {
          location: new URL("/deneyin?hata=cok", k.ayar.temelAdres).toString(),
          "retry-after": String(g.bekle),
        },
      });
    const govde = Govde.safeParse(await govdeOku(istek));
    if (!govde.success) return hataSayfasi(k, "rol");
    try {
      const o = await demoOturumuAc(k, govde.data.rol);
      return new Response(null, {
        status: 303,
        headers: {
          location: new URL("/panel?tur=1", k.ayar.temelAdres).toString(),
          "set-cookie": o.cerez,
          "cache-control": "no-store",
        },
      });
    } catch (e) {
      if (e instanceof DemoHatasi) return hataSayfasi(k, "hazir");
      throw e;
    }
  };
}
