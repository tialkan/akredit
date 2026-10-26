// Sağlayıcı HTTP çağrıları: zaman aşımı, 429/5xx'te retry-after'a uyan üstel bekleme, Türkçe hata eşlemesi.
import { type FetchIslevi, YzHatasi } from "./saglayici.ts";

export interface HttpAyari {
  fetch: FetchIslevi;
  /** Toplam deneme sayısı (ilk istek dahil). Varsayılan 4. */
  denemeSayisi?: number;
  /** Tek istek zaman aşımı (ms). Varsayılan 10 dakika. */
  zamanAsimiMs?: number;
  /** Üstel beklemenin tabanı (ms). Varsayılan 1000. */
  tabanBeklemeMs?: number;
  /** En uzun bekleme (ms). Varsayılan 60 sn. */
  enUzunBeklemeMs?: number;
  /** Bekleme işlevi; testte anında döner. */
  bekle?: (ms: number) => Promise<void>;
}

const varsayilanBekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** retry-after başlığını ms'ye çevirir (saniye ya da HTTP tarihi). */
export function retryAfterMs(deger: string | null, simdi = Date.now()): number | null {
  if (!deger) return null;
  const sn = Number(deger);
  if (Number.isFinite(sn) && sn >= 0) return sn * 1000;
  const t = Date.parse(deger);
  return Number.isNaN(t) ? null : Math.max(0, t - simdi);
}

export function durumHatasi(durum: number, govde: string): YzHatasi {
  if (durum === 401 || durum === 403)
    return new YzHatasi(
      "anahtar",
      "Yapay zekâ anahtarı kabul edilmedi. Anahtarı ayarlardan kontrol edip yeniden girin.",
      durum,
    );
  if (durum === 429)
    return new YzHatasi("yogunluk", "Yapay zekâ hizmeti şu an yoğun. Birkaç dakika sonra yeniden deneyin.", durum);
  if (durum >= 500)
    return new YzHatasi("sunucu", "Yapay zekâ hizmeti şu an yanıt veremiyor. Biraz sonra yeniden deneyin.", durum);
  return new YzHatasi(
    "yanit",
    `Yapay zekâ hizmeti isteği kabul etmedi (${durum}). Ayarları kontrol edin. ${govde.slice(0, 200)}`.trim(),
    durum,
  );
}

/** JSON gönderir, JSON döndürür. Ağ ve geçici hatalarda yeniden dener. */
export async function jsonIstek(
  adres: string,
  basliklar: Record<string, string>,
  govde: unknown,
  ayar: HttpAyari,
  sinyal?: AbortSignal,
): Promise<unknown> {
  const deneme = ayar.denemeSayisi ?? 4;
  const taban = ayar.tabanBeklemeMs ?? 1000;
  const enUzun = ayar.enUzunBeklemeMs ?? 60_000;
  const bekle = ayar.bekle ?? varsayilanBekle;
  for (let i = 1; ; i++) {
    if (sinyal?.aborted) throw new YzHatasi("iptal", "İşlem iptal edildi.");
    const zaman = AbortSignal.timeout(ayar.zamanAsimiMs ?? 600_000);
    const birlesik = sinyal ? AbortSignal.any([sinyal, zaman]) : zaman;
    let yanit: Response;
    try {
      yanit = await ayar.fetch(adres, {
        method: "POST",
        headers: { "content-type": "application/json", ...basliklar },
        body: JSON.stringify(govde),
        signal: birlesik,
      });
    } catch (e) {
      if (sinyal?.aborted) throw new YzHatasi("iptal", "İşlem iptal edildi.");
      const zamanAsimi = zaman.aborted || (e instanceof Error && e.name === "TimeoutError");
      if (i < deneme) {
        await bekle(Math.min(enUzun, taban * 2 ** (i - 1)));
        continue;
      }
      throw zamanAsimi
        ? new YzHatasi(
            "zaman_asimi",
            "Yapay zekâ hizmeti zamanında yanıt vermedi. Daha kısa bir belgeyle yeniden deneyin.",
          )
        : new YzHatasi(
            "ag",
            "Yapay zekâ hizmetine ulaşılamadı. İnternet bağlantısını ve hizmet adresini kontrol edin.",
          );
    }
    if ((yanit.status === 429 || yanit.status >= 500) && i < deneme) {
      const ra = retryAfterMs(yanit.headers.get("retry-after"));
      await bekle(Math.min(enUzun, ra ?? taban * 2 ** (i - 1)));
      continue;
    }
    const metin = await yanit.text();
    if (!yanit.ok) throw durumHatasi(yanit.status, metin);
    try {
      return JSON.parse(metin);
    } catch {
      throw new YzHatasi(
        "yanit",
        "Yapay zekâ hizmeti anlaşılamayan bir yanıt döndürdü. Yeniden deneyin.",
        yanit.status,
      );
    }
  }
}
