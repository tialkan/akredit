// Kanıt hattı (İP-10): işleyicileri kuyruğa bağlar ve dışa açılan arayüzü toplar.

import { kiraciIslemi } from "@akredit/vt";
import { cikarAdimi, IsVerisi, MetinIsVerisi, ocrAdimi, siniflaAdimi, zenginlestirAdimi } from "./adimlar.ts";
import { type HatBaglami, KUYRUK } from "./baglam.ts";
import { durumYaz } from "./durum.ts";
import type { KuyrukAyari } from "./kuyruk.ts";

export * from "./adimlar.ts";
export * from "./alma.ts";
export * from "./baglam.ts";
export * from "./cikarma.ts";
export * from "./durum.ts";
export * from "./kuyruk.ts";
export * from "./ocr.ts";
export * from "./virus.ts";

const ASAMA = {
  [KUYRUK.cikar]: "cikarma",
  [KUYRUK.ocr]: "ocr",
  [KUYRUK.zenginlestir]: "gomme",
  [KUYRUK.sinifla]: "siniflama",
} as const;

export const OLU_ILETI = "Belge işlenirken tekrarlayan bir sorun oldu. Yöneticiniz belgeyi yeniden işleme alabilir.";

/** Hattın bütün işleyicilerini bağlar. */
export async function kanitHattiniBaslat(b: HatBaglami, ayar: Partial<Record<keyof typeof KUYRUK, KuyrukAyari>> = {}) {
  const varsayilan: KuyrukAyari = { yenidenDeneme: 3, beklemeSn: 30, sureSiniriSn: 900 };
  const bagla = async <T extends { kurumId: string; kanitId: string }>(
    ad: keyof typeof KUYRUK,
    sema: { parse(v: unknown): T },
    is: (b: HatBaglami, v: T) => Promise<void>,
  ) => {
    const kuyruk = KUYRUK[ad];
    await b.kuyruk.isle<T>(
      kuyruk,
      ayar[ad] ?? varsayilan,
      async (veri) => is(b, sema.parse(veri)),
      async (veri, hata) => {
        const v = IsVerisi.safeParse(veri);
        if (!v.success) return;
        await kiraciIslemi(b.db, v.data.kurumId, (tx) =>
          durumYaz(tx, v.data.kurumId, v.data.kanitId, "hata", {
            asama: ASAMA[kuyruk],
            ileti: OLU_ILETI,
            teknik: hata.slice(0, 500),
          }),
        );
      },
    );
  };
  await bagla("cikar", IsVerisi, cikarAdimi);
  await bagla("ocr", IsVerisi, ocrAdimi);
  await bagla("zenginlestir", MetinIsVerisi, zenginlestirAdimi);
  await bagla("sinifla", IsVerisi, siniflaAdimi);
}
