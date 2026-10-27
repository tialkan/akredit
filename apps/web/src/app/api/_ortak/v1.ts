// `/api/v1` ile kimlik katmanının bağlantısı: `korumali` CSRF'yi denetler ve aktörü oturumdan ya da API
// anahtarından kurar; servis işleyicisi yetki, doğrulama ve günlüğü yapar.

import type { Aktor, apiIsleyici } from "@akredit/servis";
import { type IstekBaglami, korumali } from "../../../kimlik/erisim.ts";
import type { KimlikSunucusu } from "../../../kimlik/sunucu.ts";

export function aktorOlustur(b: IstekBaglami): Aktor {
  return { ...b.kisi, tur: b.tur, anahtarKapsami: b.anahtarKapsami };
}

export function v1Isleyici(k: KimlikSunucusu, api: ReturnType<typeof apiIsleyici>) {
  return korumali(k, (istek, baglam) => api(istek, aktorOlustur(baglam)));
}
