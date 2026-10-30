// Herkese açık Streamable HTTP uç noktası (https://akredit.org/mcp). Durumsuzdur: oturum kimliği yok, her
// POST için yeni sunucu ve taşıma kurulur, yanıt JSON döner. Hesap ve anahtar yoktur; kişisel veri ve kurum
// verisi taşınmadığı için CORS her kökene açıktır (kimlik bilgisi kabul edilmez).
//
// Günlük: istek içeriği YAZILMAZ. Yalnız araç (ya da yöntem) adı, süre, gövde boyutu ve durum kodu.
// Sınırlar: gövde en çok 512 KB; adres başına kova (varsayılan 60 istek, saniyede 1 dolar).

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { acikSunucu } from "./sunucu.ts";

export interface GunlukKaydi {
  zaman: string;
  yontem: string;
  arac: string | null;
  sureMs: number;
  boyut: number;
  durum: number;
}

export interface AcikHttpSecenekleri {
  simdi?: () => Date;
  /** Gövde üst sınırı (bayt). Varsayılan 512 KB. */
  enBuyukGovde?: number;
  /** Adres başına kova kapasitesi ve saniyede dolum. */
  hiz?: { kapasite: number; saniyede: number };
  /** Günlük yazıcı. Varsayılan: stdout'a tek satır JSON. */
  gunluk?: (k: GunlukKaydi) => void;
  /** Ters vekilin yazdığı istemci adresi başlığı. Varsayılan x-forwarded-for. */
  adresBasligi?: string;
}

export const CORS_BASLIKLARI: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
  "access-control-max-age": "86400",
};

const json = (govde: unknown, durum: number, ek: Record<string, string> = {}) =>
  new Response(JSON.stringify(govde), {
    status: durum,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_BASLIKLARI, ...ek },
  });

const rpcHata = (durum: number, code: number, message: string, ek: Record<string, string> = {}) =>
  json({ jsonrpc: "2.0", id: null, error: { code, message } }, durum, ek);

/** Süreç içi kova. Adres sayısı sınırlıdır; dolan tablo en eski kayıtlardan boşaltılır. */
export class AdresKovasi {
  private kovalar = new Map<string, { jeton: number; son: number }>();
  private kapasite: number;
  private saniyede: number;
  private enCokAdres: number;
  constructor(kapasite: number, saniyede: number, enCokAdres = 10_000) {
    this.kapasite = kapasite;
    this.saniyede = saniyede;
    this.enCokAdres = enCokAdres;
  }
  al(adres: string, simdiMs: number): { izin: boolean; bekle: number } {
    let k = this.kovalar.get(adres);
    if (!k) {
      if (this.kovalar.size >= this.enCokAdres) {
        const ilk = this.kovalar.keys().next().value;
        if (ilk !== undefined) this.kovalar.delete(ilk);
      }
      k = { jeton: this.kapasite, son: simdiMs };
      this.kovalar.set(adres, k);
    }
    k.jeton = Math.min(this.kapasite, k.jeton + ((simdiMs - k.son) / 1000) * this.saniyede);
    k.son = simdiMs;
    if (k.jeton < 1) return { izin: false, bekle: Math.ceil((1 - k.jeton) / this.saniyede) };
    k.jeton -= 1;
    return { izin: true, bekle: 0 };
  }
}

/** Gövdeden günlüğe yazılacak tek bilgi: yöntem ve (tools/call ise) araç adı. İçerik okunmaz. */
function yontemVeArac(govde: unknown): { yontem: string; arac: string | null } {
  const ilk = Array.isArray(govde) ? govde[0] : govde;
  if (!ilk || typeof ilk !== "object") return { yontem: "gecersiz", arac: null };
  const m = (ilk as { method?: unknown }).method;
  const yontem = typeof m === "string" ? m.slice(0, 64) : "yanit";
  const ad = (ilk as { params?: { name?: unknown } }).params?.name;
  return {
    yontem,
    arac: yontem === "tools/call" && typeof ad === "string" ? ad.replace(/[^a-z_]/gu, "").slice(0, 40) : null,
  };
}

export function acikMcpIsleyici(s: AcikHttpSecenekleri = {}) {
  const simdi = s.simdi ?? (() => new Date());
  const enBuyuk = s.enBuyukGovde ?? 512 * 1024;
  const kova = new AdresKovasi(s.hiz?.kapasite ?? 60, s.hiz?.saniyede ?? 1);
  const gunluk = s.gunluk ?? ((k: GunlukKaydi) => console.info(JSON.stringify({ olay: "acik_mcp", ...k })));
  const adresBasligi = s.adresBasligi ?? "x-forwarded-for";

  return async (istek: Request): Promise<Response> => {
    const bas = performance.now();
    let kayit = { yontem: istek.method, arac: null as string | null, boyut: 0 };
    const bitir = (r: Response) => {
      gunluk({
        zaman: simdi().toISOString(),
        yontem: kayit.yontem,
        arac: kayit.arac,
        sureMs: Math.round(performance.now() - bas),
        boyut: kayit.boyut,
        durum: r.status,
      });
      return r;
    };

    if (istek.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_BASLIKLARI });
    if (istek.method !== "POST")
      return bitir(
        json(
          {
            hata: "Bu adres bir MCP sunucusudur. Yapay zekâ istemcinize bağlayıcı olarak ekleyin: https://akredit.org/mcp-kullan",
          },
          405,
          { allow: "POST, OPTIONS" },
        ),
      );

    const adres = (istek.headers.get(adresBasligi) ?? "").split(",")[0]?.trim() || "bilinmeyen";
    const h = kova.al(adres, simdi().getTime());
    if (!h.izin)
      return bitir(
        rpcHata(429, -32000, "Çok fazla istek. Biraz bekleyip yeniden deneyin.", { "retry-after": String(h.bekle) }),
      );

    const uzunluk = Number(istek.headers.get("content-length") ?? "0");
    if (uzunluk > enBuyuk) return bitir(rpcHata(413, -32600, "İstek çok büyük. Veriyi bölerek gönderin."));
    let metin: string;
    try {
      const tampon = await istek.arrayBuffer();
      kayit.boyut = tampon.byteLength;
      if (tampon.byteLength > enBuyuk) return bitir(rpcHata(413, -32600, "İstek çok büyük. Veriyi bölerek gönderin."));
      metin = new TextDecoder().decode(tampon);
    } catch {
      return bitir(rpcHata(400, -32700, "İstek okunamadı."));
    }
    let govde: unknown;
    try {
      govde = JSON.parse(metin);
    } catch {
      return bitir(rpcHata(400, -32700, "İleti JSON değil."));
    }
    kayit = { ...kayit, ...yontemVeArac(govde) };

    const sunucu = acikSunucu({ simdi });
    const tasima = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    try {
      await sunucu.connect(tasima);
      // Taşıma gövdeyi yeniden okumasın diye ayrıştırılmış gövde verilir; başlıklar özgün istekten gelir.
      const yanit = await tasima.handleRequest(istek, { parsedBody: govde });
      const basliklar = new Headers(yanit.headers);
      for (const [k, v] of Object.entries(CORS_BASLIKLARI)) basliklar.set(k, v);
      const govdeMetni = yanit.body ? await yanit.text() : null;
      return bitir(new Response(govdeMetni, { status: yanit.status, headers: basliklar }));
    } catch {
      return bitir(rpcHata(500, -32603, "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin."));
    } finally {
      await sunucu.close().catch(() => {});
    }
  };
}
