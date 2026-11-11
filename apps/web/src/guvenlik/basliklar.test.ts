import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DURAGAN_ONBELLEK, DURAGAN_YOLLAR, GUVENLIK_BASLIKLARI, surumBelirle } from "./basliklar.ts";

const deger = (ad: string) => GUVENLIK_BASLIKLARI.find((b) => b.key === ad)?.value;

describe("güvenlik başlıkları (İP-49)", () => {
  it("HSTS yalnız max-age, alt alan ve preload yok", () => {
    expect(deger("Strict-Transport-Security")).toBe("max-age=31536000");
  });
  it("nosniff, referrer ve aygıt izinleri kapalı", () => {
    expect(deger("X-Content-Type-Options")).toBe("nosniff");
    expect(deger("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    for (const izin of ["camera=()", "microphone=()", "geolocation=()"])
      expect(deger("Permissions-Policy")).toContain(izin);
  });
  it("CSP burada verilmez (istek başına nonce, proxy.ts)", () => {
    expect(deger("Content-Security-Policy")).toBeUndefined();
  });
});

describe("sürüm işareti", () => {
  it("commit varsa commit, yoksa ya da bilinmiyorsa paket sürümü", () => {
    expect(surumBelirle({ SOURCE_COMMIT: "1fbed5e0a1" }, "0.1.0")).toBe("1fbed5e0a1");
    expect(surumBelirle({}, "0.1.0")).toBe("0.1.0");
    expect(surumBelirle({ SOURCE_COMMIT: "bilinmiyor" }, "0.1.0")).toBe("0.1.0");
    // Başlığa satır sonu sızdırılamaz.
    expect(surumBelirle({ SOURCE_COMMIT: "a\r\nX-Kotu: 1" }, "0.1.0")).toBe("0.1.0");
  });
});

describe("önbellek politikası", () => {
  it("durağan varlıklar uzun ve değişmez önbellekte", () => {
    expect(DURAGAN_ONBELLEK).toContain("max-age=31536000");
    expect(DURAGAN_ONBELLEK).toContain("immutable");
    expect(DURAGAN_YOLLAR).toEqual(["/gorsel/:yol*", "/marka/:yol*", "/yazi-tipleri/:yol*"]);
  });
  it("proxy sayfalara paylaşılan önbellek başlığı vermez (nonce istek başına)", () => {
    const proxy = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
    expect(proxy).not.toMatch(/s-maxage|Cache-Control/u);
  });
});
