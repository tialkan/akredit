// Kurum içi kurulumda yapay zekâ sağlayıcısını ortam değişkenlerinden kurar ve yalnız yerel model
// sunucusuna izin verir. AKREDIT_YZ_* değişkenleri docker-compose.yml ve Helm şemasında tanımlıdır.
//
// Neden ayrı bir denetim: @akredit/yz'de `hazir: "ollama"` ile birlikte verilen ÖZEL bir adres de
// "yurt içi" sayılır (hazır ayarın değeri). Yanlış yazılmış bir adres (ör. yurt dışındaki bir hizmet)
// politika katmanından geçebilirdi. Burada adresin ana makinesi iç ağ adı ya da özel IP olmak zorundadır;
// ayrıca ağ yalıtımı (internal ağ / NetworkPolicy) dışa çıkışı zaten keser. İki kat güvence.
//
// Not: Web ve işçi henüz bu işlevi çağırmıyor; bağlantı web/işçi sahibi İP'lerin işidir (rapor).

import {
  HAZIRLAR,
  type KurumYzAyari,
  openaiUyumlu,
  politikaUygula,
  type Saglayici,
} from "../../packages/yz/src/index.ts";

export const YEREL_HAZIRLAR = ["ollama", "vllm", "sglang"] as const;
export type YerelHazir = (typeof YEREL_HAZIRLAR)[number];

export class KurumIciYzHatasi extends Error {}

/** Ana makine iç ağda mı: noktasız ad (model, akredit-model), .local/.internal/.svc, localhost ya da özel IP. */
export function icAdresMi(ana: string): boolean {
  const h = ana.toLowerCase().replace(/^\[|\]$/gu, "");
  if (h === "localhost" || h === "::1") return true;
  if (/^[a-z0-9-]+$/u.test(h)) return true;
  if (/\.(local|internal|svc|svc\.cluster\.local|cluster\.local)$/u.test(h)) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  // IPv6 benzersiz yerel (fc00::/7)
  return /^f[cd][0-9a-f]{2}:/u.test(h);
}

export interface KurumIciYzOrtami {
  AKREDIT_YZ_HAZIR?: string | undefined;
  AKREDIT_YZ_ADRES?: string | undefined;
  AKREDIT_YZ_MODEL?: string | undefined;
  AKREDIT_YZ_YURT_DISI_IZIN?: string | undefined;
}

export interface KurumIciYz {
  saglayici: Saglayici;
  ayar: KurumYzAyari;
}

/** Ortamdan yerel sağlayıcıyı kurar; kuralı bozan her ayarda Türkçe iletiyle hata verir. */
export function kurumIciSaglayici(ortam: KurumIciYzOrtami, fetchIslevi?: typeof fetch): KurumIciYz {
  const hazir = ortam.AKREDIT_YZ_HAZIR ?? "";
  if (!(YEREL_HAZIRLAR as readonly string[]).includes(hazir))
    throw new KurumIciYzHatasi("Yapay zekâ hizmeti olarak yalnız kurum içindeki model sunucusu seçilebilir.");
  const adres = ortam.AKREDIT_YZ_ADRES || HAZIRLAR[hazir as YerelHazir].adres;
  let url: URL;
  try {
    url = new URL(adres);
  } catch {
    throw new KurumIciYzHatasi("Model sunucusunun adresi geçersiz. Kurulum ayarını düzeltin.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new KurumIciYzHatasi("Model sunucusunun adresi geçersiz. Kurulum ayarını düzeltin.");
  if (url.username || url.password)
    throw new KurumIciYzHatasi("Model sunucusunun adresinde kullanıcı adı ya da parola bulunmamalı.");
  if (!icAdresMi(url.hostname))
    throw new KurumIciYzHatasi("Model sunucusu kurum ağının dışında görünüyor. Veriler kurum dışına gönderilmez.");
  const model = ortam.AKREDIT_YZ_MODEL ?? "";
  if (!/^[A-Za-z0-9._:/-]{1,200}$/u.test(model))
    throw new KurumIciYzHatasi("Model adı ayarlanmamış ya da geçersiz. Kurulum ayarını düzeltin.");
  const izin = ortam.AKREDIT_YZ_YURT_DISI_IZIN ?? "hayir";
  if (izin !== "hayir") throw new KurumIciYzHatasi("Kurum içi kurulumda yurt dışı yapay zekâ izni açılamaz.");

  const ayar: KurumYzAyari = { yurtDisiIzin: false };
  const ham = openaiUyumlu({
    hazir: hazir as YerelHazir,
    adres: url.toString(),
    model,
    yurtIci: true,
    ...(fetchIslevi ? { fetch: fetchIslevi } : {}),
  });
  return { saglayici: politikaUygula(ham, ayar), ayar };
}
