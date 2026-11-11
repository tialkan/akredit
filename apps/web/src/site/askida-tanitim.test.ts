// Askıdaki sayfaların tanıtımı, form uçlarının GET yönlendirmesi ve panelin askıda yönlendirmesi (ADR 0008).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ASKIDA_TANITIMLARI, type AskidaSayfa, AskidaTanitim } from "./askida-tanitim.tsx";
import { askidaPanelYonlendirmesi, tanitimaYonlendir } from "./barindirma.ts";
import { GORSELLER } from "./gorsel.tsx";

describe("askıdaki sayfaların tanıtımı", () => {
  it("her sayfa 2-4 madde, kimin işine yarar ve kısa, sayısız, adressiz metin taşır", () => {
    for (const [ad, t] of Object.entries(ASKIDA_TANITIMLARI)) {
      expect(t.maddeler.length, ad).toBeGreaterThanOrEqual(2);
      expect(t.maddeler.length, ad).toBeLessThanOrEqual(4);
      for (const m of [...t.maddeler, t.kimin]) {
        expect(m, ad).not.toMatch(/\d/u); // sayı uydurulmaz
        expect(m, ad).not.toMatch(/@|https?:\/\/|\*\*/u);
        expect(m.length, ad).toBeLessThan(180);
      }
    }
  });

  it("görsel eşlemesi: kurum-ac ve kurulum → kurum platformu, pilot, giriş ve davet → giriş, demo", () => {
    const e: Record<AskidaSayfa, unknown> = {
      kurumAc: GORSELLER.kurumPlatformu,
      kurulum: GORSELLER.kurumPlatformu,
      pilot: GORSELLER.pilot,
      giris: GORSELLER.giris,
      davet: GORSELLER.giris,
      kurumDemosu: GORSELLER.kurumDemosu,
    };
    for (const [ad, g] of Object.entries(e)) expect(ASKIDA_TANITIMLARI[ad as AskidaSayfa].gorsel, ad).toBe(g);
    for (const g of [GORSELLER.kurumPlatformu, GORSELLER.pilot, GORSELLER.giris, GORSELLER.kurumDemosu])
      expect([g.en, g.boy, g.genislikler]).toEqual([1600, 640, [800, 1600]]);
  });

  it("çıktı: başlıklı bölüm, süs görseli tembel yüklenir, açık araçlara bağlantı verir", () => {
    const h = renderToStaticMarkup(createElement(AskidaTanitim, { sayfa: "pilot" }));
    expect(h).toContain('aria-labelledby="askida-tanitim"');
    expect(h).toContain("Hizmet açılınca burada");
    expect(h).toContain("Kimin işine yarar");
    expect(h).toMatch(/<img[^>]*alt=""[^>]*aria-hidden="true"[^>]*loading="lazy"/u);
    expect(h).toContain("/gorsel/pilot-800.webp 800w, /gorsel/pilot-1600.webp 1600w");
    expect(h).toContain('href="/mcp-kullan"');
    expect(h).toContain('href="/deneyin"');
  });
});

describe("panel ve değerlendirici: askıda yönlendirme", () => {
  it("barındırma ve demo kapalı, gerçek veri kipinde tanıtıma; aksi hâlde davranış aynen kalır", () => {
    expect(askidaPanelYonlendirmesi({}, true)).toBe("/kurum-demosu");
    expect(askidaPanelYonlendirmesi({ AKREDIT_BARINDIRMA: "0" }, true)).toBe("/kurum-demosu");
    expect(askidaPanelYonlendirmesi({ AKREDIT_BARINDIRMA: "1" }, true)).toBeNull();
    expect(askidaPanelYonlendirmesi({ AKREDIT_DEMO: "1" }, true)).toBeNull();
    expect(askidaPanelYonlendirmesi({}, false)).toBeNull(); // örnek veri derlemesi: panel kurgu veriyle açılır
  });
});

describe("form uçları tarayıcıda açılınca tanıtıma yönlenir", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("yanıt 303 ve göreli adres", () => {
    const y = tanitimaYonlendir("/pilot");
    expect(y.status).toBe(303);
    expect(y.headers.get("location")).toBe("/pilot");
  });

  it("her uç GET'te doğru sayfaya 303 döner, veritabanına gitmez", async () => {
    vi.stubEnv("AKREDIT_BARINDIRMA", "");
    const uclar: [Promise<{ GET: () => Response }>, string][] = [
      [import("../app/api/deneyin/route.ts"), "/kurum-demosu"],
      [import("../app/api/deneyin/cikis/route.ts"), "/kurum-demosu"],
      [import("../app/api/pilot/route.ts"), "/pilot"],
      [import("../app/api/kurum-acilisi/route.ts"), "/kurum-ac"],
      [import("../app/api/kurum-acilisi/dogrula/route.ts"), "/kurum-ac"],
      [import("../app/api/davet/route.ts"), "/davet"],
    ];
    for (const [uc, yol] of uclar) {
      const y = (await uc).GET();
      expect(y.status, yol).toBe(303);
      expect(y.headers.get("location"), yol).toBe(yol);
    }
  });
});
