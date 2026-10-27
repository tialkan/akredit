// Bologna uçlarına tarayıcıdan istek. Durum değiştiren her istek bir tekrar anahtarı taşır.

export type Sonuc<T> = { tamam: true; deger: T } | { tamam: false; hata: string };

const GENEL_HATA = "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.";

export async function bolognaIstegi<T>(yontem: "GET" | "POST", yol: string, govde?: unknown): Promise<Sonuc<T>> {
  let y: Response;
  try {
    y = await fetch(`/api/v1/bologna${yol}`, {
      method: yontem,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(govde === undefined ? {} : { "content-type": "application/json" }),
        ...(yontem === "GET" ? {} : { "idempotency-key": crypto.randomUUID() }),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    });
  } catch {
    return { tamam: false, hata: GENEL_HATA };
  }
  const veri = (await y.json().catch(() => null)) as unknown;
  if (y.ok) return { tamam: true, deger: veri as T };
  const hata = (veri as { hata?: unknown } | null)?.hata;
  return { tamam: false, hata: typeof hata === "string" ? hata : GENEL_HATA };
}

export const ORNEK_KIP_ILETISI = "Örnek veri kipinde bu işlem çalışmaz; gerçek kurum verisiyle kullanılabilir.";
