// Mobil onay (İP-33): PWA bildirimi, servis çalışanı ve anlık bildirim için saf mantık.
// Kurallar:
// - Çevrim dışı önbellek yalnız onay listesidir (sayfa + bekleyen öneriler + sayfanın statik dosyaları).
//   Kanıt, rapor, ayar gibi başka hiçbir veri önbelleğe alınmaz.
// - Karar çevrim dışıyken verilemez ve kuyruğa alınmaz: onay, verildiği an adıyla ve zamanıyla günlüğe yazılır.
// - Anlık bildirim yalnız sayı taşır; öneri içeriği, kişi adı ya da kanıt metni bildirime girmez.
// - Bildirim izni yoksa (reddedildi ya da tarayıcı desteklemiyor) e-posta özeti yolu kullanılır.

import { z } from "zod";

export const KAPSAM = "/panel/onaylar";
export const ONBELLEK_ADI = "akredit-onaylar-v1";
export const LISTE_API = "/api/v1/oneriler";

/** Bir isteğin servis çalışanında nasıl ele alınacağı. */
export type OnbellekKarari = "ag-once" | "onbellek-once" | "dokunma";

/**
 * Yalnız GET istekleri ve yalnız onay listesine ait yollar önbelleğe girer.
 * - Onay sayfası ve bekleyen öneriler: önce ağ, ağ yoksa son kopya.
 * - `/_next/static/`: içerik özetli, değişmeyen dosyalar; önce önbellek.
 * - Geri kalan her şey (karar POST'u, kanıt, oturum uçları): servis çalışanı dokunmaz.
 */
export function onbellekKarari(adres: string, yontem: string, koken: string): OnbellekKarari {
  if (yontem.toUpperCase() !== "GET") return "dokunma";
  let u: URL;
  try {
    u = new URL(adres, koken);
  } catch {
    return "dokunma";
  }
  if (u.origin !== new URL(koken).origin) return "dokunma";
  const yol = u.pathname.replace(/\/+$/, "") || "/";
  if (yol === KAPSAM) return "ag-once";
  if (yol === LISTE_API) return "ag-once";
  if (u.pathname.startsWith("/_next/static/")) return "onbellek-once";
  return "dokunma";
}

export type IzinDurumu = "granted" | "denied" | "default" | "desteklenmiyor";

export type BildirimYolu =
  | { yol: "anlik" }
  | { yol: "izin-iste" }
  | { yol: "eposta"; neden: "reddedildi" | "desteklenmiyor" | "yapilandirilmadi" };

/** Bildirimin hangi yoldan gideceği. İzin yoksa e-posta özeti (İP-13) yolu kullanılır. */
export function bildirimYolu(izin: IzinDurumu, anlikDestegi: boolean, genelAnahtar: string | undefined): BildirimYolu {
  if (izin === "desteklenmiyor" || !anlikDestegi) return { yol: "eposta", neden: "desteklenmiyor" };
  if (izin === "denied") return { yol: "eposta", neden: "reddedildi" };
  if (!genelAnahtar) return { yol: "eposta", neden: "yapilandirilmadi" };
  if (izin === "default") return { yol: "izin-iste" };
  return { yol: "anlik" };
}

export const BILDIRIM_METNI: Record<BildirimYolu["yol"] | "eposta-reddedildi" | "eposta-desteklenmiyor", string> = {
  anlik: "Telefon bildirimleri açık. Yeni bir öneri karar beklediğinde haber veririz.",
  "izin-iste": "Yeni öneriler için telefon bildirimi alabilirsiniz.",
  eposta: "Bildirimler e-posta özetiyle gelir.",
  "eposta-reddedildi":
    "Bildirim izni verilmedi. Bekleyen öneriler size e-posta özetiyle bildirilir. İzni tarayıcı ayarlarından açabilirsiniz.",
  "eposta-desteklenmiyor": "Bu tarayıcı telefon bildirimini desteklemiyor. Bekleyen öneriler e-posta özetiyle gelir.",
};

export function bildirimMetni(y: BildirimYolu): string {
  if (y.yol !== "eposta") return BILDIRIM_METNI[y.yol];
  if (y.neden === "reddedildi") return BILDIRIM_METNI["eposta-reddedildi"];
  if (y.neden === "desteklenmiyor") return BILDIRIM_METNI["eposta-desteklenmiyor"];
  return BILDIRIM_METNI.eposta;
}

/** Tarayıcının gönderdiği anlık bildirim aboneliği (PushSubscription.toJSON()). */
export const abonelikSemasi = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((s) => s.startsWith("https://"), "Abonelik adresi güvenli değil."),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(64) }),
});
export type Abonelik = z.infer<typeof abonelikSemasi>;

/** Gerçek saklama ve gönderim sonraki İP'de bağlanır; burada yalnız arayüz ve bellek uygulaması vardır. */
export interface AbonelikDeposu {
  kaydet(kullaniciId: string, a: Abonelik): Promise<void>;
  sil(kullaniciId: string, endpoint: string): Promise<void>;
  listele(kullaniciId: string): Promise<Abonelik[]>;
}

export function bellekAbonelikDeposu(): AbonelikDeposu {
  const m = new Map<string, Map<string, Abonelik>>();
  return {
    async kaydet(k, a) {
      const d = m.get(k) ?? new Map();
      d.set(a.endpoint, a);
      m.set(k, d);
    },
    async sil(k, e) {
      m.get(k)?.delete(e);
    },
    async listele(k) {
      return [...(m.get(k)?.values() ?? [])];
    },
  };
}

/**
 * Bildirim yükü: yalnız bekleyen sayılar. İçerik, ad ya da kanıt yoktur; ekran kilidinde görünse de veri sızmaz.
 * Yüksek riskli öneri varsa metin "tek tek incelenmeli" der; bildirimden onay eylemi verilmez.
 */
export function bildirimYuku(bekleyen: { yuksek: number; orta: number; dusuk: number }): {
  baslik: string;
  govde: string;
  adres: string;
  etiket: string;
} {
  const sayilar = [bekleyen.yuksek, bekleyen.orta, bekleyen.dusuk].map((n) => Math.max(0, Math.trunc(n)));
  const [y = 0, o = 0, d = 0] = sayilar;
  const toplam = y + o + d;
  const govde =
    y > 0
      ? `${toplam} öneri kararınızı bekliyor; ${y} tanesi yüksek riskli ve tek tek incelenmeli.`
      : `${toplam} öneri kararınızı bekliyor.`;
  return { baslik: "Akredit onay kutusu", govde, adres: KAPSAM, etiket: "akredit-onaylar" };
}

/** base64url → Uint8Array (applicationServerKey için). */
export function base64UrlCoz(s: string): Uint8Array {
  const dolgu = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + dolgu).replace(/-/g, "+").replace(/_/g, "/");
  const ham = atob(b64);
  const c = new Uint8Array(ham.length);
  for (let i = 0; i < ham.length; i++) c[i] = ham.charCodeAt(i);
  return c;
}

/** Abonelik ucu: POST kaydeder, DELETE siler. Gövde zod ile doğrulanır; yanıtta abonelik ayrıntısı yoktur. */
export async function abonelikIsle(istek: Request, kullaniciId: string, depo: AbonelikDeposu): Promise<Response> {
  const govde = (await istek.json().catch(() => null)) as unknown;
  if (istek.method === "DELETE") {
    const s = z.object({ endpoint: z.string().max(2048) }).safeParse(govde);
    if (!s.success) return Response.json({ hata: "Bildirim aboneliği okunamadı." }, { status: 400 });
    await depo.sil(kullaniciId, s.data.endpoint);
    return new Response(null, { status: 204 });
  }
  if (istek.method !== "POST") return Response.json({ hata: "Bu işlem desteklenmiyor." }, { status: 405 });
  const s = abonelikSemasi.safeParse(govde);
  if (!s.success)
    return Response.json(
      { hata: "Bildirim aboneliği okunamadı. Sayfayı yenileyip bildirimleri yeniden açın." },
      { status: 400 },
    );
  await depo.kaydet(kullaniciId, s.data);
  return new Response(null, { status: 204 });
}

export function manifest() {
  return {
    name: "Akredit onay kutusu",
    short_name: "Onaylar",
    description: "Bekleyen önerileri kanıtıyla görün, telefonunuzdan karar verin.",
    lang: "tr",
    dir: "ltr",
    start_url: KAPSAM,
    scope: KAPSAM,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f6f2",
    theme_color: "#f7f6f2",
    icons: [{ src: `${KAPSAM}/simge.svg`, sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
  };
}

export const SIMGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#1f4e79"/><path d="M144 268l76 76 148-176" fill="none" stroke="#fff" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/**
 * Servis çalışanının kaynağı. Karar mantığı `onbellekKarari` ile aynıdır; aynı işlev JS olarak gömülür;
 * testte bu metin çalıştırılıp `onbellekKarari` ile aynı sonucu verdiği sınanır.
 */
export function servisCalisaniKaynagi(): string {
  return `// Akredit onay kutusu servis çalışanı (İP-33). Yalnız onay listesi önbelleğe alınır.
"use strict";
/* global self, caches */
const KAPSAM = ${JSON.stringify(KAPSAM)};
const LISTE_API = ${JSON.stringify(LISTE_API)};
const ONBELLEK_ADI = ${JSON.stringify(ONBELLEK_ADI)};
function onbellekKarari(adres, yontem, koken) {
  if (String(yontem).toUpperCase() !== "GET") return "dokunma";
  let u;
  try { u = new URL(adres, koken); } catch { return "dokunma"; }
  if (u.origin !== new URL(koken).origin) return "dokunma";
  const yol = u.pathname.replace(/\\/+$/, "") || "/";
  if (yol === KAPSAM || yol === LISTE_API) return "ag-once";
  if (u.pathname.startsWith("/_next/static/")) return "onbellek-once";
  return "dokunma";
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const ad of await caches.keys()) if (ad.startsWith("akredit-onaylar-") && ad !== ONBELLEK_ADI) await caches.delete(ad);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const karar = onbellekKarari(e.request.url, e.request.method, self.location.origin);
  if (karar === "dokunma") return;
  if (karar === "onbellek-once") {
    e.respondWith((async () => {
      const c = await caches.open(ONBELLEK_ADI);
      const var_ = await c.match(e.request);
      if (var_) return var_;
      const y = await fetch(e.request);
      if (y.ok) await c.put(e.request, y.clone());
      return y;
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(ONBELLEK_ADI);
    try {
      const y = await fetch(e.request);
      if (y.ok && !y.redirected) await c.put(e.request, y.clone());
      return y;
    } catch (hata) {
      const var_ = await c.match(e.request, { ignoreSearch: false });
      if (var_) return var_;
      throw hata;
    }
  })());
});

self.addEventListener("push", (e) => {
  let v = {};
  try { v = e.data ? e.data.json() : {}; } catch { v = {}; }
  const baslik = typeof v.baslik === "string" ? v.baslik.slice(0, 80) : "Akredit onay kutusu";
  const govde = typeof v.govde === "string" ? v.govde.slice(0, 200) : "Kararınızı bekleyen öneriler var.";
  e.waitUntil(self.registration.showNotification(baslik, { body: govde, tag: "akredit-onaylar", lang: "tr", data: { adres: KAPSAM } }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const pencereler = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const p of pencereler) if (new URL(p.url).pathname.startsWith(KAPSAM)) return p.focus();
    return self.clients.openWindow(KAPSAM);
  })());
});
`;
}
