// OpenAI uyumlu /chat/completions bağdaştırıcısı: EVREN, vLLM, SGLang, Ollama, OpenAI, OpenRouter.
// Hazır adresler apps/cli/lib/model.mjs HAZIRLAR ile aynıdır.
import { z } from "zod";
import { type HttpAyari, jsonIstek } from "../http.ts";
import {
  type AracCagrisi,
  type FetchIslevi,
  type Mesaj,
  type Saglayici,
  type SohbetIstegi,
  type SohbetYaniti,
  YzHatasi,
} from "../saglayici.ts";

export const HAZIRLAR = {
  evren: { adres: "https://evren-llmapi.ssyz.org.tr/v1", model: "glm-5.3", yurtIci: true },
  vllm: { adres: "http://localhost:8000/v1", yurtIci: true },
  sglang: { adres: "http://localhost:30000/v1", yurtIci: true },
  ollama: { adres: "http://localhost:11434/v1", yurtIci: true },
  openai: { adres: "https://api.openai.com/v1", yurtIci: false },
  openrouter: { adres: "https://openrouter.ai/api/v1", yurtIci: false },
} as const satisfies Record<string, { adres: string; model?: string; yurtIci: boolean }>;

export type HazirAdi = keyof typeof HAZIRLAR;

export interface OpenaiUyumluAyari {
  hazir?: HazirAdi;
  /** hazir verilmezse zorunlu. */
  adres?: string;
  model?: string;
  anahtar?: string;
  /** Hazır ayarın değerini ezer. Kendi sunucusu için kurum belirtir. */
  yurtIci?: boolean;
  /** Sağlayıcı response_format json_schema destekliyor mu? Varsayılan: openai ve vllm için evet. */
  yapilandirilmisCikti?: boolean;
  fetch?: FetchIslevi;
  http?: Omit<HttpAyari, "fetch">;
}

const YanitSemasi = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullish(),
          tool_calls: z
            .array(z.object({ id: z.string(), function: z.object({ name: z.string(), arguments: z.string() }) }))
            .nullish(),
        }),
        finish_reason: z.string().nullish(),
      }),
    )
    .min(1),
  usage: z.object({ prompt_tokens: z.number(), completion_tokens: z.number() }).nullish(),
});

const ROLLER = { sistem: "system", kullanici: "user", asistan: "assistant", arac: "tool" } as const;

export function mesajlariCevir(mesajlar: Mesaj[]): Record<string, unknown>[] {
  return mesajlar.map((m) => {
    const o: Record<string, unknown> = { role: ROLLER[m.rol], content: m.icerik };
    if (m.rol === "asistan" && m.aracCagrilari?.length)
      o.tool_calls = m.aracCagrilari.map((c) => ({
        id: c.id,
        type: "function",
        function: { name: c.ad, arguments: c.ham ?? JSON.stringify(c.argumanlar ?? {}) },
      }));
    if (m.rol === "arac") o.tool_call_id = m.aracCagriId;
    return o;
  });
}

export function argumanCoz(ham: string): unknown {
  try {
    return JSON.parse(ham || "{}");
  } catch {
    return undefined;
  }
}

export function openaiUyumlu(ayar: OpenaiUyumluAyari): Saglayici {
  const hazir = ayar.hazir ? HAZIRLAR[ayar.hazir] : undefined;
  const adres = (ayar.adres ?? hazir?.adres ?? "").replace(/\/$/u, "");
  const model = ayar.model ?? (hazir && "model" in hazir ? hazir.model : undefined) ?? "";
  if (!adres || !model) throw new YzHatasi("yanit", "Yapay zekâ hizmetinin adresi ve model adı ayarlanmalı.");
  const yurtIci = ayar.yurtIci ?? hazir?.yurtIci ?? false;
  const yapilandirilmis = ayar.yapilandirilmisCikti ?? (ayar.hazir === "openai" || ayar.hazir === "vllm");
  const http: HttpAyari = { ...ayar.http, fetch: ayar.fetch ?? globalThis.fetch };
  const basliklar: Record<string, string> = ayar.anahtar ? { authorization: `Bearer ${ayar.anahtar}` } : {};

  return {
    ad: ayar.hazir ?? "openai-uyumlu",
    model,
    yurtIci,
    yapilandirilmisCikti: yapilandirilmis,
    async sohbet(istek: SohbetIstegi): Promise<SohbetYaniti> {
      const govde: Record<string, unknown> = {
        model,
        messages: mesajlariCevir(istek.mesajlar),
        temperature: istek.sicaklik ?? 0.2,
      };
      if (istek.enCokBelirtec) govde.max_tokens = istek.enCokBelirtec;
      if (istek.araclar?.length) {
        govde.tools = istek.araclar.map((a) => ({
          type: "function",
          function: { name: a.ad, description: a.aciklama, parameters: a.parametreler },
        }));
        govde.tool_choice = "auto";
      }
      if (istek.jsonSema && yapilandirilmis)
        govde.response_format = {
          type: "json_schema",
          json_schema: { name: istek.jsonSema.ad, schema: istek.jsonSema.sema, strict: false },
        };
      const ham = await jsonIstek(`${adres}/chat/completions`, basliklar, govde, http, istek.sinyal);
      const v = YanitSemasi.safeParse(ham);
      if (!v.success)
        throw new YzHatasi("yanit", "Yapay zekâ hizmeti beklenmeyen biçimde yanıt verdi. Yeniden deneyin.");
      const secim = v.data.choices[0];
      const cagrilar: AracCagrisi[] = (secim?.message.tool_calls ?? []).map((c) => ({
        id: c.id,
        ad: c.function.name,
        argumanlar: argumanCoz(c.function.arguments),
        ham: c.function.arguments,
      }));
      const yanit: SohbetYaniti = { icerik: secim?.message.content ?? "", aracCagrilari: cagrilar };
      if (secim?.finish_reason) yanit.bitisNedeni = secim.finish_reason;
      if (v.data.usage) yanit.kullanim = { giris: v.data.usage.prompt_tokens, cikis: v.data.usage.completion_tokens };
      return yanit;
    },
    async gomme(metinler: string[]): Promise<number[][]> {
      const ham = await jsonIstek(`${adres}/embeddings`, basliklar, { model, input: metinler }, http);
      const v = z.object({ data: z.array(z.object({ embedding: z.array(z.number()) })) }).safeParse(ham);
      if (!v.success)
        throw new YzHatasi("yanit", "Yapay zekâ hizmeti beklenmeyen biçimde yanıt verdi. Yeniden deneyin.");
      return v.data.data.map((d) => d.embedding);
    },
  };
}
