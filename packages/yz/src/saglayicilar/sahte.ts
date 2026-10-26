// Senaryolu sahte sağlayıcı: testlerde ağsız, belirlenimci yanıtlar.
import type { Saglayici, SohbetIstegi, SohbetYaniti } from "../saglayici.ts";

export type SenaryoAdimi = string | Partial<SohbetYaniti> | ((istek: SohbetIstegi) => string | Partial<SohbetYaniti>);

export interface SahteSaglayici extends Saglayici {
  /** Alınan isteklerin kopyaları (sırayla). */
  readonly istekler: SohbetIstegi[];
}

export interface SahteAyari {
  ad?: string;
  model?: string;
  yurtIci?: boolean;
  yapilandirilmisCikti?: boolean;
  /** Senaryo bitince son adım tekrarlansın mı? Varsayılan: hayır, hata verir. */
  sonuTekrarla?: boolean;
}

export function sahteSaglayici(senaryo: SenaryoAdimi[], ayar: SahteAyari = {}): SahteSaglayici {
  const istekler: SohbetIstegi[] = [];
  let sira = 0;
  return {
    ad: ayar.ad ?? "sahte",
    model: ayar.model ?? "sahte-1",
    yurtIci: ayar.yurtIci ?? true,
    yapilandirilmisCikti: ayar.yapilandirilmisCikti ?? false,
    istekler,
    async sohbet(istek) {
      istekler.push(structuredClone({ ...istek, sinyal: undefined }));
      let adim = senaryo[sira];
      if (adim === undefined && ayar.sonuTekrarla) adim = senaryo.at(-1);
      if (adim === undefined) throw new Error(`Sahte sağlayıcının senaryosu bitti (${sira + 1}. istek).`);
      sira++;
      const deger = typeof adim === "function" ? adim(istek) : adim;
      const kismi = typeof deger === "string" ? { icerik: deger } : deger;
      return { icerik: "", aracCagrilari: [], kullanim: { giris: 10, cikis: 5 }, ...kismi };
    },
    async gomme(metinler) {
      // Belirlenimci, anlamsız vektör: uzunluk ve ilk harf kodu.
      return metinler.map((m) => [m.length, m.codePointAt(0) ?? 0]);
    },
  };
}
