// Sınav kâğıdını yalnız kurum içindeki model okur (İP-43, ilke 7).
//
// Bu dosya kurumun YZ ayarına (yurt dışı izni, OpenRouter anahtarı) hiç bakmaz: `kurumSaglayicisi` çağrılmaz.
// Tek yol, sunucu kurulumunda verilen yerel model sunucusudur (Ollama, vLLM, SGLang; OpenAI uyumlu uç) ve
// adresi kurum ağının içinde olmalıdır. Sağlayıcı çıkış kapısından `kurum_ici` kipinde, yurt dışı izni kapalı
// olarak geçer; kapı da yurt dışı hedefe isteği göndermez. Yerel model yoksa iş başlamaz.

import {
  type CikisKaydi,
  cikisKapisi,
  type FetchIslevi,
  openaiUyumlu,
  type Saglayici,
  type SohbetIstegi,
} from "@akredit/yz";
import { z } from "zod";
import { ServisHatasi } from "../hata.ts";
import { istemGuvenliMi } from "./saf.ts";
import { ModelOkumasi } from "./turler.ts";

export const YEREL_MODEL_YOK =
  "Sınav kâğıtlarını okumak için kurum içinde çalışan bir model gerekiyor; tanımlı değil. Kâğıtlar kurum dışına gönderilmez. Sistem yöneticisi kurum içi modeli kurduktan sonra yeniden deneyin.";
export const YEREL_MODEL_DISARIDA =
  "Tanımlı model sunucusu kurum ağının dışında görünüyor. Sınav kâğıtları kurum dışına gönderilmez. Sistem yöneticisi ayarı düzeltmeli.";

/** Yalnız kendi sunucusunda çalışan model sunucuları. Evren, OpenRouter, OpenAI gibi uzak hizmetler yoktur. */
export const YEREL_SUNUCULAR = ["ollama", "vllm", "sglang"] as const;

export const YerelModelAyari = z
  .object({
    hazir: z.enum(YEREL_SUNUCULAR),
    adres: z.string().min(1).max(500),
    model: z.string().regex(/^[A-Za-z0-9._:/-]{1,200}$/u),
  })
  .strict();
export type YerelModelAyari = z.infer<typeof YerelModelAyari>;

/** Ana makine kurum ağında mı: noktasız ad, .local/.internal/.svc, localhost ya da özel IP (infra/kurum-ici ile aynı kural). */
export function kurumIciAdresMi(ana: string): boolean {
  const h = ana.toLowerCase().replace(/^\[|\]$/gu, "");
  if (h === "localhost" || h === "::1") return true;
  if (/^[a-z0-9-]+$/u.test(h)) return true;
  if (/\.(local|internal|svc|cluster\.local)$/u.test(h)) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return /^f[cd][0-9a-f]{2}:/u.test(h);
}

/** Sunucu ortamından yerel model ayarını okur (`infra/kurum-ici` değişkenleri). Eksikse null. */
export function ortamdanYerelModel(ortam: Record<string, string | undefined>): YerelModelAyari | null {
  if (!ortam.AKREDIT_YZ_HAZIR || !ortam.AKREDIT_YZ_ADRES || !ortam.AKREDIT_YZ_MODEL) return null;
  return {
    hazir: ortam.AKREDIT_YZ_HAZIR as YerelModelAyari["hazir"],
    adres: ortam.AKREDIT_YZ_ADRES,
    model: ortam.AKREDIT_YZ_MODEL,
  };
}

export interface YerelOkuyucu {
  ad: string;
  model: string;
  /** Bir puan kutusunun metnini modele okutur. İstem güvenli değilse modele gitmez, okunamadı döner. */
  oku(g: { alan: string; azami: number | null; metin: string }): Promise<ModelOkumasi>;
}

/**
 * Yerel okuyucuyu kurar. Ayar yoksa, yerel sunucu değilse ya da adres kurum dışındaysa `ServisHatasi`
 * (`kural_ihlali`) atar; ağa hiçbir istek gitmez. Yurt dışı izni parametresi yoktur.
 */
export function yerelOkuyucuKur(
  ham: unknown,
  s: { fetch?: FetchIslevi; kaydet?: (k: CikisKaydi) => void } = {},
): YerelOkuyucu {
  if (ham === null || ham === undefined) throw new ServisHatasi("kural_ihlali", YEREL_MODEL_YOK);
  const a = YerelModelAyari.safeParse(ham);
  if (!a.success) throw new ServisHatasi("kural_ihlali", YEREL_MODEL_YOK);
  let url: URL;
  try {
    url = new URL(a.data.adres);
  } catch {
    throw new ServisHatasi("kural_ihlali", YEREL_MODEL_DISARIDA);
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password)
    throw new ServisHatasi("kural_ihlali", YEREL_MODEL_DISARIDA);
  if (!kurumIciAdresMi(url.hostname)) throw new ServisHatasi("kural_ihlali", YEREL_MODEL_DISARIDA);
  const ham_ = openaiUyumlu({
    hazir: a.data.hazir,
    adres: url.toString(),
    model: a.data.model,
    yurtIci: true,
    ...(s.fetch ? { fetch: s.fetch } : {}),
  });
  return okuyucuKur(ham_, s.kaydet);
}

/** Sağlayıcıyı kurum içi kapıyla sarar. Yurt içi olmayan sağlayıcı reddedilir (testlerde sahte sağlayıcı için de). */
export function okuyucuKur(saglayici: Saglayici, kaydet?: (k: CikisKaydi) => void): YerelOkuyucu {
  if (!saglayici.yurtIci) throw new ServisHatasi("kural_ihlali", YEREL_MODEL_DISARIDA);
  const kapili = cikisKapisi(saglayici, {
    yurtDisiIzin: false,
    kip: "kurum_ici",
    amac: "sinav_taramasi",
    ...(kaydet ? { kaydet } : {}),
  });
  return {
    ad: saglayici.ad,
    model: saglayici.model,
    async oku(g) {
      const kullanici = `Kutu: ${g.alan === "*toplam" ? "kâğıttaki toplam puan" : `soru ${g.alan}`}${
        g.azami === null ? "" : ` (en çok ${g.azami} puan)`
      }\nTaranan metin: «${g.metin.slice(0, 40)}»`;
      if (!istemGuvenliMi(kullanici)) return { deger: null, guven: 0 };
      const istek: SohbetIstegi = {
        mesajlar: [
          {
            rol: "sistem",
            icerik:
              'Sen bir sınav kâğıdındaki puan kutusunu okuyorsun. Taranan metin bir öğretim elemanının elle yazdığı puandır. Yalnız kutuda yazanı oku; toplama, ortalama ya da tahmin yapma. Okuyamazsan değeri null ver. Yalnız JSON yaz: {"deger": sayı ya da null, "guven": 0 ile 1 arası}.',
          },
          { rol: "kullanici", icerik: kullanici },
        ],
        sicaklik: 0,
        enCokBelirtec: 60,
        jsonSema: {
          ad: "puan_okumasi",
          sema: {
            type: "object",
            properties: { deger: { type: ["number", "null"] }, guven: { type: "number" } },
            required: ["deger", "guven"],
          },
        },
      };
      const y = await kapili.sohbet(istek);
      let json: unknown;
      try {
        json = JSON.parse(y.icerik.replace(/^```(?:json)?|```$/gu, "").trim());
      } catch {
        return { deger: null, guven: 0 };
      }
      const v = ModelOkumasi.safeParse(json);
      return v.success ? v.data : { deger: null, guven: 0 };
    },
  };
}
