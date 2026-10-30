import { describe, expect, it } from "vitest";
import { onlemGonder } from "./gonder.ts";

describe("onlemGonder (gerçek kip)", () => {
  it("önlemi /api/v1/puko/onlem ucuna tekrar anahtarıyla gönderir; gövdede karar veren yoktur", async () => {
    const istekler: { url: string; init: RequestInit }[] = [];
    const getir = async (url: string | URL | Request, init?: RequestInit) => {
      istekler.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ devir: [], eylem: {}, eylemIdleri: ["e1"], sorumsuzDersler: ["BP102"] }), { status: 200 });
    };
    const s = await onlemGonder(
      { kartId: "k1", secim: { secenekId: "s1" }, hedefDonem: "2026-2027 Güz", sureMs: 1500 },
      getir,
    );
    expect(s).toEqual({ tamam: true, sorumsuzDersler: ["BP102"] });
    expect(istekler[0]?.url).toBe("/api/v1/puko/onlem");
    expect(istekler[0]?.init.method).toBe("POST");
    const basliklar = new Headers(istekler[0]?.init.headers);
    expect(basliklar.get("idempotency-key")).toBeTruthy();
    const govde = JSON.parse(String(istekler[0]?.init.body)) as Record<string, unknown>;
    expect(govde).toEqual({ kartId: "k1", secim: { secenekId: "s1" }, hedefDonem: "2026-2027 Güz", sureMs: 1500 });
    expect(govde).not.toHaveProperty("kararVeren");
  });

  it("sunucunun hata iletisini döndürür; ağ hatasında genel ileti", async () => {
    const red = async () =>
      new Response(JSON.stringify({ hata: "Bu kart için zaten karar verildi." }), { status: 409 });
    expect(await onlemGonder({ kartId: "k", secim: { kendiMetni: "x" }, hedefDonem: "d", sureMs: 0 }, red)).toEqual({
      tamam: false,
      hata: "Bu kart için zaten karar verildi.",
    });
    const kopuk = async () => {
      throw new Error("ağ");
    };
    const s = await onlemGonder({ kartId: "k", secim: { kendiMetni: "x" }, hedefDonem: "d", sureMs: 0 }, kopuk);
    expect(s.tamam).toBe(false);
  });
});
