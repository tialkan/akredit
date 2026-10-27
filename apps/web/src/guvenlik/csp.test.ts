import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "../proxy.ts";
import { cspBasligi, cspBaslikAdi, cspKipi, nonceUret } from "./csp.ts";

const yonerge = (politika: string, ad: string) =>
  politika
    .split("; ")
    .find((y) => y.split(" ")[0] === ad)
    ?.split(" ")
    .slice(1);

describe("CSP (G-27-1)", () => {
  it("nonce 16 rastgele bayttır, her çağrıda farklıdır", () => {
    // 16 sıfır bayt base64'te 22 'A' + '=='.
    expect(nonceUret((b) => b.fill(0))).toBe(`${"A".repeat(22)}==`);
    const kume = new Set(Array.from({ length: 50 }, () => nonceUret()));
    expect(kume.size).toBe(50);
  });

  it("üretim politikası: betik yalnız nonce + strict-dynamic, satır içi betik ve eval yok", () => {
    const p = cspBasligi("QUJDREVGR0hJSktMTU5PUA==", { gelistirme: false });
    expect(yonerge(p, "script-src")).toEqual(["'self'", "'nonce-QUJDREVGR0hJSktMTU5PUA=='", "'strict-dynamic'"]);
    expect(p).not.toMatch(/unsafe-eval/);
    expect(yonerge(p, "script-src")).not.toContain("'unsafe-inline'");
    expect(yonerge(p, "object-src")).toEqual(["'none'"]);
    expect(yonerge(p, "frame-ancestors")).toEqual(["'none'"]);
    expect(yonerge(p, "base-uri")).toEqual(["'self'"]);
    expect(yonerge(p, "form-action")).toEqual(["'self'"]);
    expect(yonerge(p, "default-src")).toEqual(["'self'"]);
    expect(p).toContain("upgrade-insecure-requests");
  });

  it("geliştirmede yalnız eval eklenir", () => {
    const p = cspBasligi("QUJDREVGR0hJSktMTU5PUA==", { gelistirme: true });
    expect(yonerge(p, "script-src")).toContain("'unsafe-eval'");
  });

  it("başlık enjeksiyonuna yol açacak nonce reddedilir", () => {
    expect(() => cspBasligi("abc; script-src *", { gelistirme: false })).toThrow();
    expect(() => cspBasligi("", { gelistirme: false })).toThrow();
  });

  it("kip: varsayılan zorlar, 'rapor' yalnız raporlar", () => {
    expect(cspBaslikAdi(cspKipi(undefined))).toBe("Content-Security-Policy");
    expect(cspBaslikAdi(cspKipi("bilinmeyen"))).toBe("Content-Security-Policy");
    expect(cspBaslikAdi(cspKipi("rapor"))).toBe("Content-Security-Policy-Report-Only");
  });

  it("ara katman her istekte farklı nonce'lu başlık koyar ve nonce'u Next'e iletir", () => {
    const y1 = proxy(new NextRequest("https://akredit.kurum.example/panel"));
    const y2 = proxy(new NextRequest("https://akredit.kurum.example/panel"));
    const p1 = y1.headers.get("content-security-policy") ?? "";
    const p2 = y2.headers.get("content-security-policy") ?? "";
    const n1 = /'nonce-([^']+)'/.exec(p1)?.[1];
    expect(n1).toBeTruthy();
    expect(p1).not.toBe(p2);
    // Next.js istek başlıklarının üzerine yazımını x-middleware-request-* ile taşır.
    expect(y1.headers.get("x-middleware-request-x-nonce")).toBe(n1);
    expect(y1.headers.get("x-middleware-request-content-security-policy")).toBe(p1);
  });

  it("eşleyici sayfaları kapsar, durağan dosyaları ve API'yi dışarıda bırakır", () => {
    const kaynak = new RegExp(`^${config.matcher[0]?.source}$`);
    for (const yol of ["/", "/panel", "/giris", "/anket/k/a", "/degerlendirici/soru"])
      expect(kaynak.test(yol)).toBe(true);
    for (const yol of ["/api/auth/session", "/_next/static/x.js", "/_next/image", "/favicon.ico"])
      expect(kaynak.test(yol)).toBe(false);
  });
});
