// Gerçek veri kipinde önlem kararını `/api/v1/puko/onlem` ucuna gönderir (İP-39). Karar veren gövdede yoktur;
// sunucu oturumdaki kişiyi yazar. Tekrar anahtarı, ağ kesintisinde yeniden gönderilen kararın iki kez
// kaydedilmesini önler.

export interface OnlemGovdesi {
  kartId: string;
  secim: { secenekId: string } | { kendiMetni: string };
  hedefDonem: string;
  sureMs: number;
}

type Getir = (url: string, init: RequestInit) => Promise<Response>;

const GENEL_HATA = "Karar kaydedilemedi. Bağlantınızı denetleyip yeniden deneyin.";

export async function onlemGonder(
  govde: OnlemGovdesi,
  getir: Getir = (u, i) => fetch(u, i),
): Promise<{ tamam: true; sorumsuzDersler: string[] } | { tamam: false; hata: string }> {
  let y: Response;
  try {
    y = await getir("/api/v1/puko/onlem", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify(govde),
    });
  } catch {
    return { tamam: false, hata: GENEL_HATA };
  }
  const veri = (await y.json().catch(() => null)) as { hata?: unknown; sorumsuzDersler?: unknown } | null;
  if (y.ok) {
    const s = veri?.sorumsuzDersler;
    return { tamam: true, sorumsuzDersler: Array.isArray(s) ? s.filter((x) => typeof x === "string") : [] };
  }
  return { tamam: false, hata: typeof veri?.hata === "string" ? veri.hata : GENEL_HATA };
}
