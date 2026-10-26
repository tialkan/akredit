// OpenAPI 3.1 belgesi `UCLAR` ve zod şemalarından üretilir (JSON Schema 2020-12, OpenAPI 3.1 ile uyumlu).

import { z } from "zod";
import { API_ONEKI } from "./isleyici.ts";
import { UCLAR } from "./uclar.ts";

const HataGovdesi = z.object({
  hata: z.string().meta({ description: "Kullanıcıya gösterilebilir Türkçe ileti." }),
  kod: z.enum([
    "gecersiz_istek",
    "oturum_yok",
    "yetki_yok",
    "bulunamadi",
    "cakisma",
    "kural_ihlali",
    "cok_fazla_istek",
    "beklenmeyen",
  ]),
  alanlar: z.array(z.object({ alan: z.string(), ileti: z.string() })).optional(),
});

function sema(s: z.ZodType, io: "input" | "output") {
  const j = z.toJSONSchema(s, { io, unrepresentable: "any", target: "draft-2020-12" }) as Record<string, unknown>;
  delete j.$schema;
  return j;
}

const HATALAR: Record<string, string> = {
  "400": "Girdi geçersiz",
  "401": "Oturum ya da API anahtarı yok",
  "403": "Yetki yok",
  "404": "Kayıt yok ya da başka kuruma ait",
  "409": "Çakışma (ör. öneriye zaten karar verilmiş)",
  "422": "Kural ihlali (ör. yüksek riskli öneri toplu onaylanamaz)",
  "429": "Çok fazla istek",
};

export function openapiBelgesi(surum = "0.1.0") {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const uc of UCLAR) {
    const parametreler: unknown[] = [];
    for (const m of uc.yol.matchAll(/\{(\w+)\}/gu))
      parametreler.push({ name: m[1], in: "path", required: true, schema: { type: "string", format: "uuid" } });
    if (uc.sorgu) {
      const j = sema(uc.sorgu, "input") as { properties?: Record<string, unknown>; required?: string[] };
      for (const [ad, ozellik] of Object.entries(j.properties ?? {}))
        parametreler.push({ name: ad, in: "query", required: j.required?.includes(ad) ?? false, schema: ozellik });
    }
    if (uc.yontem !== "GET")
      parametreler.push({
        name: "Idempotency-Key",
        in: "header",
        required: false,
        description: "Aynı anahtarla tekrarlanan istek yeniden işlenmez, ilk yanıt döner.",
        schema: { type: "string", minLength: 8, maxLength: 200 },
      });
    const yanitlar: Record<string, unknown> = {
      [String(uc.basariDurumu ?? 200)]: {
        description: "Başarılı",
        content: { "application/json": { schema: sema(uc.cikti, "output") } },
      },
    };
    for (const [d, a] of Object.entries(HATALAR))
      yanitlar[d] = {
        description: a,
        content: { "application/json": { schema: { $ref: "#/components/schemas/Hata" } } },
      };
    const yol = `${API_ONEKI}${uc.yol}`;
    paths[yol] ??= {};
    (paths[yol] as Record<string, unknown>)[uc.yontem.toLowerCase()] = {
      operationId: uc.ad,
      summary: uc.ozet,
      ...(uc.eylem !== "oturum" ? { "x-akredit-yetki": uc.eylem } : {}),
      ...(parametreler.length ? { parameters: parametreler } : {}),
      ...(uc.govde
        ? { requestBody: { required: true, content: { "application/json": { schema: sema(uc.govde, "input") } } } }
        : {}),
      responses: yanitlar,
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Akredit API",
      version: surum,
      description:
        "Akredit servis katmanının REST arayüzü. Her uç yetki denetimi yapar; durum değiştiren işlemler değiştirilemez günlüğe yazılır. Onay ve politika imzası yalnız oturumla yapılır.",
      license: { name: "Apache-2.0", identifier: "Apache-2.0" },
    },
    servers: [{ url: "https://akredit.org" }],
    security: [{ oturum: [] }, { apiAnahtari: [] }],
    components: {
      securitySchemes: {
        oturum: { type: "apiKey", in: "cookie", name: "akredit.session_token" },
        apiAnahtari: { type: "http", scheme: "bearer", description: "akr_<önek>_<gizli> biçiminde API anahtarı" },
      },
      schemas: { Hata: sema(HataGovdesi, "output") },
    },
    paths,
  };
}
