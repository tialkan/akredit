// Anthropic Messages API bağdaştırıcısı (fetch ile, SDK'sız). Veri yurt dışına çıkar.
import { z } from "zod";
import { type HttpAyari, jsonIstek } from "../http.ts";
import {
  type FetchIslevi,
  type Mesaj,
  type Saglayici,
  type SohbetIstegi,
  type SohbetYaniti,
  YzHatasi,
} from "../saglayici.ts";

export interface AnthropicAyari {
  model: string;
  anahtar: string;
  adres?: string;
  fetch?: FetchIslevi;
  http?: Omit<HttpAyari, "fetch">;
}

const IcerikSemasi = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("tool_use"), id: z.string(), name: z.string(), input: z.unknown() }),
  z.object({ type: z.literal("thinking") }).passthrough(),
]);

const YanitSemasi = z.object({
  content: z.array(z.union([IcerikSemasi, z.object({ type: z.string() }).passthrough()])),
  stop_reason: z.string().nullish(),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).nullish(),
});

/** İç mesajları Messages API biçimine çevirir: sistem ayrı alana, araç sonuçları kullanıcı mesajına. */
export function anthropicMesajlari(mesajlar: Mesaj[]): { system: string; messages: Record<string, unknown>[] } {
  const sistem: string[] = [];
  const sonuc: { role: string; content: Record<string, unknown>[] }[] = [];
  const ekle = (role: string, blok: Record<string, unknown>) => {
    const son = sonuc.at(-1);
    if (son && son.role === role) son.content.push(blok);
    else sonuc.push({ role, content: [blok] });
  };
  for (const m of mesajlar) {
    if (m.rol === "sistem") sistem.push(m.icerik);
    else if (m.rol === "kullanici") ekle("user", { type: "text", text: m.icerik });
    else if (m.rol === "arac") ekle("user", { type: "tool_result", tool_use_id: m.aracCagriId, content: m.icerik });
    else {
      if (m.icerik) ekle("assistant", { type: "text", text: m.icerik });
      for (const c of m.aracCagrilari ?? [])
        ekle("assistant", { type: "tool_use", id: c.id, name: c.ad, input: c.argumanlar ?? {} });
    }
  }
  return { system: sistem.join("\n\n"), messages: sonuc };
}

export function anthropic(ayar: AnthropicAyari): Saglayici {
  const adres = (ayar.adres ?? "https://api.anthropic.com").replace(/\/$/u, "");
  const http: HttpAyari = { ...ayar.http, fetch: ayar.fetch ?? globalThis.fetch };
  return {
    ad: "anthropic",
    model: ayar.model,
    yurtIci: false,
    yapilandirilmisCikti: false,
    async sohbet(istek: SohbetIstegi): Promise<SohbetYaniti> {
      const { system, messages } = anthropicMesajlari(istek.mesajlar);
      const govde: Record<string, unknown> = {
        model: ayar.model,
        max_tokens: istek.enCokBelirtec ?? 4096,
        temperature: istek.sicaklik ?? 0.2,
        messages,
      };
      if (system) govde.system = system;
      if (istek.araclar?.length)
        govde.tools = istek.araclar.map((a) => ({ name: a.ad, description: a.aciklama, input_schema: a.parametreler }));
      const ham = await jsonIstek(
        `${adres}/v1/messages`,
        { "x-api-key": ayar.anahtar, "anthropic-version": "2023-06-01" },
        govde,
        http,
        istek.sinyal,
      );
      const v = YanitSemasi.safeParse(ham);
      if (!v.success)
        throw new YzHatasi("yanit", "Yapay zekâ hizmeti beklenmeyen biçimde yanıt verdi. Yeniden deneyin.");
      const yanit: SohbetYaniti = { icerik: "", aracCagrilari: [] };
      for (const b of v.data.content) {
        if (b.type === "text" && "text" in b) yanit.icerik += String(b.text);
        if (b.type === "tool_use" && "id" in b)
          yanit.aracCagrilari.push({ id: String(b.id), ad: String(b.name), argumanlar: b.input });
      }
      if (v.data.stop_reason) yanit.bitisNedeni = v.data.stop_reason;
      if (v.data.usage) yanit.kullanim = { giris: v.data.usage.input_tokens, cikis: v.data.usage.output_tokens };
      return yanit;
    },
  };
}
