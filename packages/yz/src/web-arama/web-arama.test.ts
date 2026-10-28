// OpenRouter web araması: ağsız (sahte fetch). İstek gövdesinin parametre adları belgedeki adlarla birebir
// denetlenir; yanıt notları zod ile doğrulanır; kurum politikası izinsiz kurumda hiçbir isteğe izin vermez.

import { describe, expect, it } from "vitest";
import { type FetchIslevi, YzHatasi } from "../saglayici.ts";
import {
  atiflariCoz,
  kurumSonucTavani,
  openrouterWebArayici,
  sahteWebArayici,
  sonucSiniri,
  WEB_ARAMA_MUTLAK_TAVAN,
  webAramaGovdesi,
  webAramaMaliyeti,
  webAramaPolitikasi,
} from "./index.ts";

function sahteFetch(yanit: unknown) {
  const cagrilar: { adres: string; govde: Record<string, unknown>; basliklar: Record<string, string> }[] = [];
  const f: FetchIslevi = async (adres, ayar) => {
    cagrilar.push({
      adres,
      govde: JSON.parse(String(ayar.body)),
      basliklar: ayar.headers as Record<string, string>,
    });
    return new Response(JSON.stringify(yanit), { status: 200, headers: { "content-type": "application/json" } });
  };
  return Object.assign(f, { cagrilar });
}

// Belgedeki not biçimi: message.annotations[] → { type: "url_citation", url_citation: { url, title, content, ... } }.
const YANIT = {
  choices: [
    {
      message: {
        content: "Örnek uygulamalar şunlardır... (model metni; olgu sayılmaz)",
        annotations: [
          {
            type: "url_citation",
            url_citation: {
              url: "https://kalite.ornek-a.edu.tr/paydas-anketi#bolum",
              title: "Paydaş anketi sonuçları",
              content: "Dış paydaş anketi her yıl yapılır [...] sonuçlar kurulda görüşülür.",
              start_index: 0,
              end_index: 10,
            },
          },
          // Aynı adres ikinci kez: tekilleşir.
          { type: "url_citation", url_citation: { url: "https://kalite.ornek-a.edu.tr/paydas-anketi" } },
          // Kurumun kendi alan adı: başka kurum örneği olamaz, atlanır.
          { type: "url_citation", url_citation: { url: "https://www.bizim.edu.tr/kalite", title: "Bizim" } },
          // Geçersiz adres ve tanınmayan not türü: atlanır, hata vermez.
          { type: "url_citation", url_citation: { url: "javascript:alert(1)" } },
          { type: "file_citation", file: "x" },
          { type: "url_citation", url_citation: { url: "https://ornek-b.edu.tr/danisma", title: "Danışma kurulu" } },
          { type: "url_citation", url_citation: { url: "https://ornek-c.edu.tr/eylem", title: "Eylem planı" } },
        ],
      },
    },
  ],
  usage: { prompt_tokens: 10, completion_tokens: 5, server_tool_use: { web_search_requests: 1 } },
};

describe("OpenRouter web araması", () => {
  it("sunucu aracı: belgedeki parametre adlarıyla istek kurar, anahtarı yalnız yetki başlığına koyar", async () => {
    const f = sahteFetch(YANIT);
    const a = openrouterWebArayici({
      anahtar: "sk-or-deneme",
      model: "openai/gpt-5.2",
      motor: "exa",
      fetch: f,
      simdi: () => new Date("2026-10-28T09:00:00Z"),
    });
    const s = await a.ara({ soru: "dış paydaş anketi örnek", enCokSonuc: 3, haricAlanlar: ["bizim.edu.tr"] });
    const c = f.cagrilar[0];
    expect(c?.adres).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(c?.basliklar.authorization).toBe("Bearer sk-or-deneme");
    expect(JSON.stringify(c?.govde)).not.toContain("sk-or-deneme");
    expect(c?.govde.tools).toEqual([
      {
        type: "openrouter:web_search",
        parameters: { engine: "exa", max_results: 3, max_total_results: 3, excluded_domains: ["bizim.edu.tr"] },
      },
    ]);
    expect(c?.govde.max_tool_calls).toBe(1);
    expect(c?.govde.plugins).toBeUndefined();
    // Yapılandırılmış kaynaklar: tekil, kurumun kendi alanı ve geçersiz adres yok, en çok 3.
    expect(s.kaynaklar.map((k) => k.adres)).toEqual([
      "https://kalite.ornek-a.edu.tr/paydas-anketi",
      "https://ornek-b.edu.tr/danisma",
      "https://ornek-c.edu.tr/eylem",
    ]);
    expect(s.kaynaklar[0]).toMatchObject({
      baslik: "Paydaş anketi sonuçları",
      alinti: "Dış paydaş anketi her yıl yapılır [...] sonuçlar kurulda görüşülür.",
      erisim: "2026-10-28T09:00:00.000Z",
    });
    expect(s.kaynaklar[1]?.baslik).toBe("Danışma kurulu");
    expect(s.aramaSayisi).toBe(1);
  });

  it("eklenti yolu: plugins: [{ id: 'web', max_results }]", () => {
    const g = webAramaGovdesi({ model: "m", yontem: "eklenti", motor: "exa" }, { soru: "x", enCokSonuc: 50 });
    expect(g.plugins).toEqual([{ id: "web", max_results: WEB_ARAMA_MUTLAK_TAVAN, engine: "exa" }]);
    expect(g.tools).toBeUndefined();
  });

  it("bozuk yanıt Türkçe hata verir; notsuz yanıt boş liste", () => {
    expect(() => atiflariCoz({ choices: [] }, { enCok: 5, erisim: "x" })).toThrow(YzHatasi);
    const s = atiflariCoz({ choices: [{ message: { content: "yok" } }] }, { enCok: 5, erisim: "x" });
    expect(s.kaynaklar).toEqual([]);
  });

  it("sonuç sınırı 1 ile mutlak tavan arasında", () => {
    expect(sonucSiniri(0)).toBe(1);
    expect(sonucSiniri(1000)).toBe(WEB_ARAMA_MUTLAK_TAVAN);
    expect(sonucSiniri(Number.NaN)).toBe(1);
    expect(kurumSonucTavani({ yurtDisiIzin: true })).toBe(5);
    expect(kurumSonucTavani({ yurtDisiIzin: true, webArama: { enCokSonuc: 3 } })).toBe(3);
  });

  it("maliyet belgedeki fiyattan: Exa 0,007 USD/istek, 10 sonuçtan sonrası 0,001 USD", () => {
    // 2 arama × 0,007 = 0,014; 12 sonuç → 2 fazla × 0,001 = 0,002; toplam 0,016.
    expect(webAramaMaliyeti("exa", 2, 12)).toBe(0.016);
    // Firecrawl: 1 × 0,005 + 4 × 0,0125 = 0,055.
    expect(webAramaMaliyeti("firecrawl", 1, 4)).toBe(0.055);
    expect(webAramaMaliyeti("native", 1, 4)).toBeNull();
  });
});

describe("kurum politikası", () => {
  const kaynaklar = Array.from({ length: 8 }, (_, i) => ({
    adres: `https://ornek-${i}.edu.tr/s`,
    baslik: `S${i}`,
    alinti: "a",
  }));

  it("yurt dışı izni yoksa web araması yapılmaz (istek gitmez)", () => {
    const a = sahteWebArayici(kaynaklar);
    expect(() => webAramaPolitikasi(a, { yurtDisiIzin: false, webArama: { acik: true } })).toThrow(/izin vermiyor/u);
    expect(a.istekler).toHaveLength(0);
  });

  it("web araması kurumda açık değilse yapılmaz", () => {
    const a = sahteWebArayici(kaynaklar);
    expect(() => webAramaPolitikasi(a, { yurtDisiIzin: true })).toThrow(/kapalı/u);
  });

  it("kurum tavanı istek başına sonucu kırpar, soru maskelenir", async () => {
    const a = sahteWebArayici(kaynaklar);
    const p = webAramaPolitikasi(a, { yurtDisiIzin: true, webArama: { acik: true, enCokSonuc: 2 } });
    const s = await p.ara({ soru: "deneme@ornek.edu.tr adresli kişinin anketi", enCokSonuc: 9 });
    expect(s.kaynaklar).toHaveLength(2);
    expect(a.istekler[0]?.enCokSonuc).toBe(2);
    expect(a.istekler[0]?.soru).not.toContain("deneme@ornek.edu.tr");
  });
});
