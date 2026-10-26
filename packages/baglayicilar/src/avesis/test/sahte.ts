// İP-23 testleri için sahte bağlam: kayıtlı yanıtlarla çalışır, ağ yoktur, saat bekleyince ilerler.

import type { DisBaglam } from "../../baglayici.ts";

export interface SahteIstek {
  adres: string;
  yontem: string;
  basliklar: Record<string, string>;
  govde: string | null;
  zaman: number;
}

export function sahteBaglam(
  yanitlar: Record<string, string | { durum?: number; govde: string | Uint8Array; tur?: string }>,
  baslangic = Date.UTC(2026, 9, 27, 9, 0, 0),
) {
  let simdi = baslangic;
  const istekler: SahteIstek[] = [];
  const beklemeler: number[] = [];
  const baglam: DisBaglam = {
    simdi: () => new Date(simdi),
    bekle: async (ms) => {
      beklemeler.push(ms);
      simdi += ms;
    },
    fetch: (async (girdi: RequestInfo | URL, init?: RequestInit) => {
      const adres = String(girdi);
      const h = new Headers(init?.headers);
      const basliklar: Record<string, string> = {};
      h.forEach((v, k) => {
        basliklar[k] = v;
      });
      istekler.push({
        adres,
        yontem: init?.method ?? "GET",
        basliklar,
        govde: typeof init?.body === "string" ? init.body : null,
        zaman: simdi,
      });
      const y = yanitlar[adres] ?? yanitlar[`${init?.method ?? "GET"} ${adres}`];
      if (y === undefined) return new Response("yok", { status: 404 });
      if (typeof y === "string") return new Response(y, { status: 200 });
      return new Response(y.govde as BodyInit, {
        status: y.durum ?? 200,
        headers: y.tur ? { "content-type": y.tur } : {},
      });
    }) as typeof fetch,
  };
  return { baglam, istekler, beklemeler, ilerlet: (ms: number) => (simdi += ms) };
}
