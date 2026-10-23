// Kanonik JSON ve SHA-256 özeti. Günlük zinciri, ölçme sonuçlarının yeniden üretilebilirliği ve
// kanıt kimliği bunlara dayanır. Biçim RFC 8785 (JCS) ile uyumludur: anahtarlar UTF-16 kod birimi
// sırasıyla dizilir, boşluk yoktur, sayılar ECMAScript biçimindedir.

import { createHash } from "node:crypto";
import type { Ozet } from "./turler.ts";

export type JsonDegeri = null | boolean | number | string | JsonDegeri[] | { [anahtar: string]: JsonDegeri };

function yaz(deger: unknown, yol: string): string {
  if (deger === null) return "null";
  switch (typeof deger) {
    case "boolean":
      return deger ? "true" : "false";
    case "number":
      if (!Number.isFinite(deger)) throw new TypeError(`Kanonik JSON sonlu olmayan sayı içeremez: ${yol}`);
      return JSON.stringify(deger);
    case "string":
      return JSON.stringify(deger);
    case "object": {
      if (Array.isArray(deger)) return `[${deger.map((x, i) => yaz(x, `${yol}[${i}]`)).join(",")}]`;
      const nesne = deger as Record<string, unknown>;
      const anahtarlar = Object.keys(nesne)
        .filter((k) => nesne[k] !== undefined)
        .sort();
      return `{${anahtarlar.map((k) => `${JSON.stringify(k)}:${yaz(nesne[k], `${yol}.${k}`)}`).join(",")}}`;
    }
    default:
      throw new TypeError(`Kanonik JSON bu değeri içeremez (${typeof deger}): ${yol}`);
  }
}

/** Değeri kanonik JSON metnine çevirir. `undefined` alanlar atlanır; işlev, sembol, NaN ve Infinity reddedilir. */
export function kanonikJson(deger: unknown): string {
  return yaz(deger, "$");
}

/** Metnin (UTF-8) ya da baytların SHA-256 özeti, küçük harfli onaltılık. */
export function ozetHesapla(girdi: string | Uint8Array): Ozet {
  return createHash("sha256").update(girdi).digest("hex") as Ozet;
}

/** Değerin kanonik JSON özetini hesaplar. */
export function degerOzeti(deger: unknown): Ozet {
  return ozetHesapla(kanonikJson(deger));
}

/** 64 karakterlik küçük harfli onaltılık özet mi? */
export function ozetMi(metin: string): metin is Ozet {
  return /^[0-9a-f]{64}$/u.test(metin);
}
