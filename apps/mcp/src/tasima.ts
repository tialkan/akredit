// Taşıma katmanları: uzak kullanım için HTTP (Streamable HTTP, JSON yanıt, durumsuz) ve yerel kullanım için stdio.
// HTTP'de her istek kendi `Authorization: Bearer akr_…` başlığıyla gelir; stdio'da anahtar ortam değişkenindedir.

import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import { HizSiniri, ServisHatasi } from "@akredit/servis";
import type { Vt } from "@akredit/vt";
import { apiAnahtariAyristir } from "@akredit/yetki";
import { anahtarAktoru } from "./kimlik.ts";
import { type JsonRpcYanit, mcpSunucusu } from "./sunucu.ts";

export interface HttpSecenekleri {
  db: Vt;
  simdi?: () => Date;
  /** Tarayıcıdan gelen isteklerde izin verilen kökenler (DNS yeniden bağlama saldırısına karşı). */
  izinliKokenler?: readonly string[];
  hiz?: HizSiniri;
}

const json = (govde: unknown, durum = 200, ek: Record<string, string> = {}) =>
  new Response(JSON.stringify(govde), { status: durum, headers: { "content-type": "application/json", ...ek } });

/** HTTP isteğini işler: `POST` JSON-RPC iletisi ya da ileti dizisi. */
export function mcpHttpIsleyici(s: HttpSecenekleri) {
  const simdi = s.simdi ?? (() => new Date());
  const hiz = s.hiz ?? new HizSiniri({ kapasite: 120, saniyede: 4 });
  return async (istek: Request): Promise<Response> => {
    const koken = istek.headers.get("origin");
    if (koken && !(s.izinliKokenler ?? []).includes(koken))
      return json({ hata: "Bu adresten bağlanılamaz.", kod: "yetki_yok" }, 403);
    if (istek.method !== "POST")
      return json({ hata: "Yalnız POST desteklenir.", kod: "gecersiz_istek" }, 405, { allow: "POST" });
    const baslik = istek.headers.get("authorization") ?? "";
    const a = apiAnahtariAyristir(baslik.replace(/^Bearer\s+/iu, ""));
    if (!a)
      return json({ hata: "API anahtarı gerekli. Ayarlardan bir anahtar oluşturun.", kod: "oturum_yok" }, 401, {
        "www-authenticate": 'Bearer realm="akredit"',
      });
    const h = hiz.al(a.onek);
    if (!h.izin)
      return json({ hata: "Çok fazla istek. Biraz bekleyip yeniden deneyin.", kod: "cok_fazla_istek" }, 429, {
        "retry-after": String(h.bekle),
      });
    try {
      // Anahtarı bir kez, isteğin başında doğrula: geçersizse protokol yanıtı yerine 401.
      const aktor = await anahtarAktoru(s.db, baslik, simdi());
      let govde: unknown;
      try {
        govde = await istek.json();
      } catch {
        return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "İleti okunamadı." } }, 400);
      }
      const sunucu = mcpSunucusu({ db: s.db, simdi, aktor: async () => aktor });
      if (Array.isArray(govde)) {
        const yanitlar = (await Promise.all(govde.slice(0, 50).map((m) => sunucu.isle(m)))).filter(
          (y): y is JsonRpcYanit => y !== null,
        );
        return yanitlar.length ? json(yanitlar) : new Response(null, { status: 202 });
      }
      const y = await sunucu.isle(govde);
      return y ? json(y) : new Response(null, { status: 202 });
    } catch (e) {
      if (e instanceof ServisHatasi) return json({ hata: e.message, kod: e.kod }, e.durum);
      return json({ hata: "Beklenmeyen bir sorun oluştu.", kod: "beklenmeyen" }, 500);
    }
  };
}

export interface StdioSecenekleri {
  db: Vt;
  anahtar: string;
  girdi: Readable;
  cikti: Writable;
  simdi?: () => Date;
}

/** Yerel kullanım: satır başına bir JSON-RPC iletisi. Bitince (girdi kapanınca) çözülür. */
export async function mcpStdio(s: StdioSecenekleri): Promise<void> {
  const simdi = s.simdi ?? (() => new Date());
  const sunucu = mcpSunucusu({ db: s.db, simdi, aktor: () => anahtarAktoru(s.db, s.anahtar, simdi()) });
  const satirlar = createInterface({ input: s.girdi, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const satir of satirlar) {
    if (!satir.trim()) continue;
    let ileti: unknown;
    try {
      ileti = JSON.parse(satir);
    } catch {
      s.cikti.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "İleti okunamadı." } })}\n`,
      );
      continue;
    }
    const y = await sunucu.isle(ileti);
    if (y) s.cikti.write(`${JSON.stringify(y)}\n`);
  }
}
