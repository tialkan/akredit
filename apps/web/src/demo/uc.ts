// `POST /api/deneyin` (İP-41): rol seçip demo oturumu açar. Betiksiz çalışır: `/kurum-demosu` sayfasındaki düğmeler
// sıradan bir form gönderir, yanıt çerezle birlikte panele 303 yönlendirmedir.
//
// Güvenlik: yalnız AKREDIT_DEMO=1 iken açıktır; köken denetimi (CSRF); IP başına ve süreç geneli hız sınırı
// (her oturum demo kurumuna bir ziyaretçi kişisi ekler, sınırsız büyümesin).

import { HizSiniri } from "@akredit/servis";
import { z } from "zod";
import { istemciAdresi } from "../guvenlik/istemci-adresi.ts";
import { KIMLIK_YOLU, type KimlikSunucusu } from "../kimlik/sunucu.ts";
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

const istemciIp = (istek: Request): string => istemciAdresi(istek.headers) ?? "bilinmiyor";

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
    headers: { location: new URL(`/kurum-demosu?hata=${kod}`, k.ayar.temelAdres).toString() },
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
          location: new URL("/kurum-demosu?hata=cok", k.ayar.temelAdres).toString(),
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

/**
 * `POST /api/deneyin/cikis`: demodan çıkış. Betiksiz form gönderir; Better Auth oturum kapatma ucu çağrılır,
 * çerezi silen başlıklar aktarılır ve `/kurum-demosu`'na 303 yönlendirilir. Köken denetimi (CSRF) vardır.
 */
export function demoCikisUcu(k: KimlikSunucusu) {
  return async (istek: Request): Promise<Response> => {
    const koken = istek.headers.get("origin");
    const izinli = [new URL(k.ayar.temelAdres).origin, ...k.ayar.izinliKokenler];
    if (!koken || !izinli.includes(koken))
      return Response.json({ hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." }, { status: 403 });
    const basliklar = new Headers({ "content-type": "application/json", origin: koken });
    const cerez = istek.headers.get("cookie");
    if (cerez) basliklar.set("cookie", cerez);
    const y = await k.auth.handler(
      new Request(new URL(`${KIMLIK_YOLU}/sign-out`, k.ayar.temelAdres), {
        method: "POST",
        headers: basliklar,
        body: "{}",
      }),
    );
    const yanit = new Headers({
      location: new URL("/kurum-demosu", k.ayar.temelAdres).toString(),
      "cache-control": "no-store",
      "clear-site-data": '"cache"',
    });
    for (const c of y.headers.getSetCookie()) yanit.append("set-cookie", c);
    return new Response(null, { status: 303, headers: yanit });
  };
}

/** `/api/deneyin` beklenmeyen hatası: betiksiz form gönderimi hata koduyla sayfaya döner, JSON istemcisi JSON alır. */
export function beklenmeyenHataYaniti(istek: Request, temelAdres: string): Response {
  const tur = istek.headers.get("content-type") ?? "";
  if (tur.includes("application/json"))
    return Response.json({ hata: "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin." }, { status: 500 });
  return new Response(null, {
    status: 303,
    headers: { location: new URL("/kurum-demosu?hata=hazir", temelAdres).toString() },
  });
}
