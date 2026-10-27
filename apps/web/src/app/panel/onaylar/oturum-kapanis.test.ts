// İnceleme dalga 3: oturum kapanınca (ya da sona erince) önbellekteki onay listesi temizlenmeli; aynı
// cihazdaki sonraki kişi çevrim dışıyken öncekinin önerilerini görmemeli.
import { describe, expect, it } from "vitest";
import { cikisYanitiniSertlestir, ONBELLEK_ADI, servisCalisaniKaynagi } from "./mobil.ts";

type Dinleyici = (e: unknown) => void;

function ortam() {
  const depolar = new Map<string, Map<string, Response>>();
  const dinleyiciler = new Map<string, Dinleyici>();
  let ag: (u: string) => Promise<Response> = async () => new Response("[]", { status: 200 });
  const caches = {
    keys: async () => [...depolar.keys()],
    delete: async (ad: string) => depolar.delete(ad),
    open: async (ad: string) => {
      if (!depolar.has(ad)) depolar.set(ad, new Map());
      const d = depolar.get(ad) as Map<string, Response>;
      return {
        match: async (r: Request) => d.get(r.url)?.clone(),
        put: async (r: Request, y: Response) => void d.set(r.url, y),
      };
    },
  };
  const self = {
    location: { origin: "https://akredit.org" },
    addEventListener: (t: string, f: Dinleyici) => dinleyiciler.set(t, f),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
    registration: {},
  };
  new Function("self", "caches", "fetch", servisCalisaniKaynagi())(self, caches, (r: Request) => ag(r.url));
  const getir = async (url: string) => {
    let p: Promise<Response> | undefined;
    (dinleyiciler.get("fetch") as Dinleyici)({
      request: new Request(url),
      respondWith: (x: Promise<Response>) => {
        p = x;
      },
    });
    return p as Promise<Response>;
  };
  const ileti = async (data: unknown) => {
    let p: Promise<unknown> = Promise.resolve();
    (dinleyiciler.get("message") as Dinleyici | undefined)?.({
      data,
      waitUntil: (x: Promise<unknown>) => {
        p = x;
      },
    });
    await p;
  };
  return {
    depolar,
    getir,
    ileti,
    agAyarla: (f: typeof ag) => {
      ag = f;
    },
  };
}

const LISTE = "https://akredit.org/api/v1/oneriler";
const cevrimDisi = async (): Promise<Response> => {
  throw new TypeError("çevrim dışı");
};

describe("oturum kapanışında onay önbelleği", () => {
  it("oturum kapandı iletisi önbelleği siler; çevrim dışı eski liste gösterilmez", async () => {
    const o = ortam();
    await o.getir(LISTE);
    expect(o.depolar.get(ONBELLEK_ADI)?.size).toBe(1);
    await o.ileti({ tur: "oturum-kapandi" });
    o.agAyarla(cevrimDisi);
    await expect(o.getir(LISTE)).rejects.toThrow();
  });

  it("oturum sona erince (401) önbellekteki liste silinir", async () => {
    const o = ortam();
    await o.getir(LISTE);
    o.agAyarla(async () => new Response("{}", { status: 401 }));
    await o.getir(LISTE);
    o.agAyarla(cevrimDisi);
    await expect(o.getir(LISTE)).rejects.toThrow();
  });

  it("çıkış yanıtı tarayıcı önbelleğini temizletir", () => {
    const y = cikisYanitiniSertlestir("/api/kimlik/sign-out", new Response(null, { status: 200 }));
    expect(y.headers.get("clear-site-data")).toBe('"cache"');
    const d = cikisYanitiniSertlestir("/api/kimlik/get-session", new Response(null, { status: 200 }));
    expect(d.headers.get("clear-site-data")).toBeNull();
  });
});
