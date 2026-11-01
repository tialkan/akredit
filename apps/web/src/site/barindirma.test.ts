// Barındırma bayrağı (ADR 0008): varsayılan kapalı; kapalıyken yeni kayıt uçları kayıt almaz.
import { afterEach, describe, expect, it, vi } from "vitest";
import { BARINDIRMA_KAPALI_YANITI, barindirmaAcik } from "./barindirma.ts";
import { DURUM_NOTU, PLATFORM_DURUMU, SPONSOR_CAGRISI } from "./icerik.ts";

describe("barındırma bayrağı", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("yalnız AKREDIT_BARINDIRMA=1 açar; tanımsız, boş, 0 ve başka değerler kapalı", () => {
    expect(barindirmaAcik({})).toBe(false);
    for (const d of ["", "0", "true", "evet", " 1"]) expect(barindirmaAcik({ AKREDIT_BARINDIRMA: d }), d).toBe(false);
    expect(barindirmaAcik({ AKREDIT_BARINDIRMA: "1" })).toBe(true);
  });

  it("kapalıyken pilot ve kurum açma uçları 503 döner, veritabanına gitmez", async () => {
    vi.stubEnv("AKREDIT_BARINDIRMA", "");
    const istek = () =>
      new Request("http://localhost/api", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
    for (const uc of [
      import("../app/api/pilot/route.ts"),
      import("../app/api/kurum-acilisi/route.ts"),
      import("../app/api/kurum-acilisi/dogrula/route.ts"),
    ]) {
      const y = await (await uc).POST(istek());
      expect(y.status).toBe(503);
      expect(await y.json()).toEqual(BARINDIRMA_KAPALI_YANITI.govde);
    }
  });

  it("durum metinleri: kısa, kalın yazısız (uzun tire kuralı kurallar.test.ts), iletişim kanalına yönlendirir, yeni adres uydurmaz", () => {
    for (const m of [...PLATFORM_DURUMU, SPONSOR_CAGRISI, DURUM_NOTU, BARINDIRMA_KAPALI_YANITI.govde.hata]) {
      expect(m).not.toMatch(/\*\*/u);
      expect(m).not.toMatch(/@|https?:\/\//u);
    }
    expect(SPONSOR_CAGRISI).toContain("iletişim sayfası");
    expect(PLATFORM_DURUMU.join(" ")).toMatch(/açık kaynak/u);
  });
});
