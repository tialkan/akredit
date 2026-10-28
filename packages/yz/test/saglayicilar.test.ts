import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cikisKapisi } from "../src/guvence/cikis-kapisi.ts";
import { retryAfterMs } from "../src/http.ts";
import { type FetchIslevi, type Mesaj, YzHatasi } from "../src/saglayici.ts";
import { anthropicMesajlari, anthropic as hamAnthropic } from "../src/saglayicilar/anthropic.ts";
import { kasetOku, kasetYaz, kaydeden, oynatan } from "../src/saglayicilar/kayit.ts";
import { HAZIRLAR, openaiUyumlu as hamOpenai } from "../src/saglayicilar/openai-uyumlu.ts";
import { sahteSaglayici } from "../src/saglayicilar/sahte.ts";

// İP-40: bağdaştırıcılar çıkış kapısı dışında çağrılamaz. Bu dosyadaki biçim testleri onları kapıdan geçirir
// (izinli kurum); kapı dışında çağrının reddi test/cikis-kapisi.test.ts'tedir.
const openaiUyumlu = (a: Parameters<typeof hamOpenai>[0]) => cikisKapisi(hamOpenai(a), { yurtDisiIzin: true });
const anthropic = (a: Parameters<typeof hamAnthropic>[0]) => cikisKapisi(hamAnthropic(a), { yurtDisiIzin: true });

interface Cagri {
  adres: string;
  ayar: RequestInit;
  govde: Record<string, unknown>;
}

/** Sırayla yanıt veren sahte fetch. Hata nesnesi verilirse fırlatır. */
function sahteFetch(yanitlar: (Response | Error)[]): FetchIslevi & { cagrilar: Cagri[] } {
  const cagrilar: Cagri[] = [];
  const f = async (adres: string, ayar: RequestInit) => {
    cagrilar.push({ adres, ayar, govde: JSON.parse(String(ayar.body)) });
    const y = yanitlar.shift();
    if (!y) throw new Error("beklenmeyen istek");
    if (y instanceof Error) throw y;
    return y;
  };
  return Object.assign(f, { cagrilar });
}

const json = (veri: unknown, durum = 200, basliklar: Record<string, string> = {}) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { "content-type": "application/json", ...basliklar } });

const OPENAI_YANIT = {
  choices: [
    {
      message: {
        content: "Merhaba",
        tool_calls: [{ id: "c1", type: "function", function: { name: "ara", arguments: '{"q":"kurul"}' } }],
      },
      finish_reason: "tool_calls",
    },
  ],
  usage: { prompt_tokens: 12, completion_tokens: 3 },
};

const MESAJLAR: Mesaj[] = [
  { rol: "sistem", icerik: "Kurallar" },
  { rol: "kullanici", icerik: "Soru" },
  { rol: "asistan", icerik: "", aracCagrilari: [{ id: "c0", ad: "ara", argumanlar: { q: "x" } }] },
  { rol: "arac", icerik: "sonuç", aracCagriId: "c0" },
];

const bekle = vi.fn(async (_ms: number) => {});
beforeEach(() => bekle.mockClear());

describe("ağ yasağı", () => {
  const ozgun = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (() => {
      throw new Error("Testte gerçek ağa çıkılmaz");
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = ozgun;
  });
  it("enjekte edilmeyen fetch ağ hatası olarak döner, gerçek ağa çıkmaz", async () => {
    const s = openaiUyumlu({ hazir: "evren", http: { bekle, denemeSayisi: 1 } });
    await expect(s.sohbet({ mesajlar: [] })).rejects.toMatchObject({ tur: "ag" });
  });
});

describe("OpenAI uyumlu bağdaştırıcı", () => {
  it("hazır ayarlar CLI ile aynı adresleri kullanır", () => {
    expect(HAZIRLAR.evren.adres).toBe("https://evren-llmapi.ssyz.org.tr/v1");
    expect(HAZIRLAR.ollama.adres).toBe("http://localhost:11434/v1");
    expect(HAZIRLAR.openrouter.yurtIci).toBe(false);
  });

  it("istek biçimi: adres, anahtar, mesaj ve araç çevirisi, response_format", async () => {
    const f = sahteFetch([json(OPENAI_YANIT)]);
    const s = openaiUyumlu({ hazir: "openai", model: "gpt-x", anahtar: "kurgu-anahtar", fetch: f });
    expect(s.yurtIci).toBe(false);
    const y = await s.sohbet({
      mesajlar: MESAJLAR,
      araclar: [{ ad: "ara", aciklama: "Arar", parametreler: { type: "object" } }],
      jsonSema: { ad: "cikti", sema: { type: "object" } },
      enCokBelirtec: 100,
    });
    const c = f.cagrilar[0] as Cagri;
    expect(c.adres).toBe("https://api.openai.com/v1/chat/completions");
    expect((c.ayar.headers as Record<string, string>).authorization).toBe("Bearer kurgu-anahtar");
    expect(c.govde.model).toBe("gpt-x");
    expect(c.govde.max_tokens).toBe(100);
    expect(c.govde.messages).toEqual([
      { role: "system", content: "Kurallar" },
      { role: "user", content: "Soru" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{ id: "c0", type: "function", function: { name: "ara", arguments: '{"q":"x"}' } }],
      },
      { role: "tool", content: "sonuç", tool_call_id: "c0" },
    ]);
    expect(c.govde.tools).toEqual([
      { type: "function", function: { name: "ara", description: "Arar", parameters: { type: "object" } } },
    ]);
    expect(c.govde.response_format).toMatchObject({ type: "json_schema" });
    expect(y).toEqual({
      icerik: "Merhaba",
      aracCagrilari: [{ id: "c1", ad: "ara", argumanlar: { q: "kurul" }, ham: '{"q":"kurul"}' }],
      bitisNedeni: "tool_calls",
      kullanim: { giris: 12, cikis: 3 },
    });
  });

  it("yerel destek yoksa response_format göndermez; anahtarsız istek başlıksızdır; geçersiz argüman undefined", async () => {
    const f = sahteFetch([
      json({
        choices: [
          { message: { content: null, tool_calls: [{ id: "a", function: { name: "x", arguments: "{bozuk" } }] } },
        ],
      }),
    ]);
    const s = openaiUyumlu({ adres: "http://yerel:1/v1/", model: "m", yurtIci: true, fetch: f });
    const y = await s.sohbet({ mesajlar: [], jsonSema: { ad: "c", sema: {} } });
    expect(f.cagrilar[0]?.adres).toBe("http://yerel:1/v1/chat/completions");
    expect(f.cagrilar[0]?.govde.response_format).toBeUndefined();
    expect(((f.cagrilar[0] as Cagri).ayar.headers as Record<string, string>).authorization).toBeUndefined();
    expect(y.icerik).toBe("");
    expect(y.aracCagrilari[0]?.argumanlar).toBeUndefined();
  });

  it("adres ya da model yoksa kurulmaz", () => {
    expect(() => openaiUyumlu({ hazir: "vllm" })).toThrow(YzHatasi);
  });

  it("429'da retry-after'a uyar, 5xx'te üstel bekler, sonra başarır", async () => {
    const f = sahteFetch([
      json({}, 429, { "retry-after": "7" }),
      json({}, 503),
      new TypeError("fetch failed"),
      json(OPENAI_YANIT),
    ]);
    const s = openaiUyumlu({ hazir: "evren", fetch: f, http: { bekle, tabanBeklemeMs: 100 } });
    await s.sohbet({ mesajlar: [] });
    // 1. bekleme: retry-after 7 sn; 2.: 100·2¹ = 200 ms; 3. (ağ hatası): 100·2² = 400 ms.
    expect(bekle.mock.calls.map((c) => c[0])).toEqual([7000, 200, 400]);
    expect(f.cagrilar).toHaveLength(4);
  });

  it("bekleme en uzun süreyle sınırlanır", async () => {
    const f = sahteFetch([json({}, 429, { "retry-after": "999" }), json(OPENAI_YANIT)]);
    await openaiUyumlu({ hazir: "evren", fetch: f, http: { bekle, enUzunBeklemeMs: 5000 } }).sohbet({ mesajlar: [] });
    expect(bekle.mock.calls[0]?.[0]).toBe(5000);
  });

  it.each([
    [401, "anahtar", /anahtarı kabul edilmedi/u],
    [403, "anahtar", /anahtarı kabul edilmedi/u],
    [429, "yogunluk", /yoğun/u],
    [500, "sunucu", /yanıt veremiyor/u],
    [400, "yanit", /kabul etmedi \(400\)/u],
  ])("HTTP %i → %s hatası, Türkçe ileti", async (durum, tur, ileti) => {
    const f = sahteFetch([json({ error: "x" }, durum), json({}, durum), json({}, durum), json({}, durum)]);
    const s = openaiUyumlu({ hazir: "evren", fetch: f, http: { bekle } });
    const e = await s.sohbet({ mesajlar: [] }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(YzHatasi);
    expect(e).toMatchObject({ tur, durum });
    expect((e as Error).message).toMatch(ileti);
  });

  it("sürekli ağ hatası: ağ iletisi; zaman aşımı: zaman aşımı iletisi", async () => {
    const ag = sahteFetch([new TypeError("x"), new TypeError("x")]);
    await expect(
      openaiUyumlu({ hazir: "evren", fetch: ag, http: { bekle, denemeSayisi: 2 } }).sohbet({ mesajlar: [] }),
    ).rejects.toThrow(/ulaşılamadı/u);
    const zaman = new Error("zaman");
    zaman.name = "TimeoutError";
    const z = sahteFetch([zaman]);
    await expect(
      openaiUyumlu({ hazir: "evren", fetch: z, http: { bekle, denemeSayisi: 1 } }).sohbet({ mesajlar: [] }),
    ).rejects.toMatchObject({ tur: "zaman_asimi" });
  });

  it("zaman aşımı sinyali fetch'e iletilir", async () => {
    const f: FetchIslevi = (_a, ayar) =>
      new Promise((_, red) => ayar.signal?.addEventListener("abort", () => red(ayar.signal?.reason)));
    await expect(
      openaiUyumlu({ hazir: "evren", fetch: f, http: { bekle, denemeSayisi: 1, zamanAsimiMs: 5 } }).sohbet({
        mesajlar: [],
      }),
    ).rejects.toMatchObject({ tur: "zaman_asimi" });
  });

  it("iptal sinyali: iptal hatası, yeniden denemez", async () => {
    const k = new AbortController();
    k.abort();
    const f = sahteFetch([]);
    await expect(
      openaiUyumlu({ hazir: "evren", fetch: f }).sohbet({ mesajlar: [], sinyal: k.signal }),
    ).rejects.toMatchObject({
      tur: "iptal",
    });
    const k2 = new AbortController();
    const f2: FetchIslevi = async () => {
      k2.abort();
      throw new Error("abort");
    };
    await expect(
      openaiUyumlu({ hazir: "evren", fetch: f2, http: { bekle } }).sohbet({ mesajlar: [], sinyal: k2.signal }),
    ).rejects.toMatchObject({ tur: "iptal" });
  });

  it("JSON olmayan ve şemaya uymayan yanıt: anlaşılır hata", async () => {
    const f = sahteFetch([new Response("<html>", { status: 200 }), json({ choices: [] })]);
    const s = openaiUyumlu({ hazir: "evren", fetch: f });
    await expect(s.sohbet({ mesajlar: [] })).rejects.toThrow(/anlaşılamayan/u);
    await expect(s.sohbet({ mesajlar: [] })).rejects.toThrow(/beklenmeyen biçimde/u);
  });

  it("gömme: /embeddings çağrısı", async () => {
    const f = sahteFetch([json({ data: [{ embedding: [0.1, 0.2] }] }), json({ yok: 1 })]);
    const s = openaiUyumlu({ hazir: "ollama", model: "gomme-m", fetch: f });
    expect(await s.gomme?.(["a"])).toEqual([[0.1, 0.2]]);
    expect(f.cagrilar[0]?.adres).toBe("http://localhost:11434/v1/embeddings");
    expect(f.cagrilar[0]?.govde).toEqual({ model: "gomme-m", input: ["a"] });
    await expect(s.gomme?.(["a"])).rejects.toThrow(YzHatasi);
  });

  it("retry-after HTTP tarihi biçimi", () => {
    const simdi = Date.parse("2026-01-01T00:00:00Z");
    expect(retryAfterMs("Thu, 01 Jan 2026 00:00:03 GMT", simdi)).toBe(3000);
    expect(retryAfterMs("abc")).toBeNull();
    expect(retryAfterMs(null)).toBeNull();
  });
});

describe("Anthropic bağdaştırıcısı", () => {
  it("Messages API biçimi: sistem ayrı, araç sonucu kullanıcı mesajında, başlıklar", async () => {
    const f = sahteFetch([
      json({
        content: [
          { type: "text", text: "Bakıyorum. " },
          { type: "tool_use", id: "t1", name: "ara", input: { q: "kurul" } },
          { type: "server_tool_use_bilinmeyen" },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 20, output_tokens: 7 },
      }),
    ]);
    const s = anthropic({ model: "claude-kurgu", anahtar: "kurgu-anahtar", fetch: f });
    expect(s.yurtIci).toBe(false);
    const y = await s.sohbet({
      mesajlar: MESAJLAR,
      araclar: [{ ad: "ara", aciklama: "Arar", parametreler: { type: "object" } }],
    });
    const c = f.cagrilar[0] as Cagri;
    expect(c.adres).toBe("https://api.anthropic.com/v1/messages");
    const b = c.ayar.headers as Record<string, string>;
    expect(b["x-api-key"]).toBe("kurgu-anahtar");
    expect(b["anthropic-version"]).toBe("2023-06-01");
    expect(c.govde.system).toBe("Kurallar");
    expect(c.govde.max_tokens).toBe(4096);
    expect(c.govde.tools).toEqual([{ name: "ara", description: "Arar", input_schema: { type: "object" } }]);
    expect(c.govde.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "Soru" }] },
      { role: "assistant", content: [{ type: "tool_use", id: "c0", name: "ara", input: { q: "x" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c0", content: "sonuç" }] },
    ]);
    expect(y).toEqual({
      icerik: "Bakıyorum. ",
      aracCagrilari: [{ id: "t1", ad: "ara", argumanlar: { q: "kurul" } }],
      bitisNedeni: "tool_use",
      kullanim: { giris: 20, cikis: 7 },
    });
  });

  it("ardışık aynı rol mesajları birleştirilir; asistan metni korunur", () => {
    const r = anthropicMesajlari([
      { rol: "kullanici", icerik: "a" },
      { rol: "kullanici", icerik: "b" },
      { rol: "asistan", icerik: "c" },
    ]);
    expect(r.system).toBe("");
    expect(r.messages).toEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
      { role: "assistant", content: [{ type: "text", text: "c" }] },
    ]);
  });

  it("401 anahtar hatası ve bozuk yanıt", async () => {
    const f = sahteFetch([json({}, 401), json({ content: "x" })]);
    const s = anthropic({ model: "m", anahtar: "k", fetch: f, adres: "http://yerel/" });
    await expect(s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] })).rejects.toMatchObject({ tur: "anahtar" });
    await expect(s.sohbet({ mesajlar: [] })).rejects.toThrow(/beklenmeyen/u);
    expect(f.cagrilar[0]?.adres).toBe("http://yerel/v1/messages");
    expect(f.cagrilar[1]?.govde.system).toBeUndefined();
  });
});

describe("sahte sağlayıcı", () => {
  it("senaryoyu sırayla oynatır, istekleri kaydeder, bitince hata verir", async () => {
    const s = sahteSaglayici([
      "bir",
      { aracCagrilari: [{ id: "x", ad: "a", argumanlar: {} }] },
      (i) => `${i.mesajlar.length}`,
    ]);
    expect((await s.sohbet({ mesajlar: [] })).icerik).toBe("bir");
    expect((await s.sohbet({ mesajlar: [] })).aracCagrilari).toHaveLength(1);
    expect((await s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "q" }] })).icerik).toBe("1");
    await expect(s.sohbet({ mesajlar: [] })).rejects.toThrow(/senaryosu bitti/u);
    expect(s.istekler).toHaveLength(4);
    expect(await s.gomme?.(["ab"])).toEqual([[2, 97]]);
  });
  it("sonuTekrarla ile son adımı tekrarlar", async () => {
    const s = sahteSaglayici(["x"], { sonuTekrarla: true, yurtIci: false, ad: "d" });
    await s.sohbet({ mesajlar: [] });
    expect((await s.sohbet({ mesajlar: [] })).icerik).toBe("x");
    expect(s.yurtIci).toBe(false);
  });
});

describe("kayıt ve oynatma", () => {
  it("kaydeder, dosyaya yazar, okur ve ağsız oynatır", async () => {
    const gercek = sahteSaglayici(["kayıtlı yanıt"]);
    const { saglayici, kaset } = kaydeden(gercek);
    const istek = { mesajlar: [{ rol: "kullanici" as const, icerik: "soru" }], sinyal: new AbortController().signal };
    await saglayici.sohbet(istek);
    expect(kaset.kayitlar[0]?.istek).not.toHaveProperty("sinyal");
    const yol = join(await mkdtemp(join(tmpdir(), "yz-kaset-")), "kaset.json");
    await kasetYaz(yol, kaset);
    const okunan = await kasetOku(yol);
    const oynat = oynatan(okunan);
    expect((await oynat.sohbet({ mesajlar: istek.mesajlar })).icerik).toBe("kayıtlı yanıt");
    await expect(oynat.sohbet({ mesajlar: [] })).rejects.toThrow(/kayıt yok/u);
  });
  it("uyuşmayan istek reddedilir, sıkı eşleşme kapatılabilir", async () => {
    const kaset = {
      saglayici: "x",
      model: "m",
      kayitlar: [
        {
          istek: { mesajlar: [{ rol: "kullanici" as const, icerik: "a" }] },
          yanit: { icerik: "y", aracCagrilari: [] },
        },
      ],
    };
    await expect(oynatan(kaset).sohbet({ mesajlar: [] })).rejects.toThrow(/uyuşmuyor/u);
    expect((await oynatan(kaset, { sikiEslesme: false }).sohbet({ mesajlar: [] })).icerik).toBe("y");
  });
  it("test/fixtures içindeki kayıtlı kaseti oynatır", async () => {
    const kaset = await kasetOku(new URL("./fixtures/evren-kaset.json", import.meta.url).pathname);
    const s = oynatan(kaset);
    const y = await s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "Merhaba" }] });
    expect(y.icerik).toBe("Merhaba, nasıl yardımcı olabilirim?");
  });
});
