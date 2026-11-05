import { describe, expect, it } from "vitest";
import { SAYFALAR } from "../site/icerik.ts";
import {
  GUVENLIK_BASLIKLARI,
  ONBELLEK_DEGERI,
  ONBELLEKLI_YOLLAR,
  onbellekPolitikasi,
  surumBelirle,
} from "./basliklar.ts";

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
  it("herkese açık sayfalar kısa süre paylaşılan önbellekte", () => {
    for (const y of ["/", "/proje", "/iletisim", "/mcp-kullan", "/kvkk", "/belgeler/hoca", "/proje/"])
      expect(onbellekPolitikasi(y), y).toBe(ONBELLEK_DEGERI);
    expect(ONBELLEK_DEGERI).toContain("s-maxage=300");
    expect(ONBELLEK_DEGERI).toContain("stale-while-revalidate");
  });
  it("panel, API, MCP, giriş ve formlar önbelleğe alınmaz", () => {
    for (const y of [
      "/panel",
      "/panel/onaylar",
      "/api/v1/x",
      "/mcp",
      "/giris",
      "/davet",
      "/kurum-ac",
      "/pilot",
      "/deneyin",
      "/degerlendirici",
      "/kurulum",
      "/anket/a/b",
      "/onay/eposta",
    ])
      expect(onbellekPolitikasi(y), y).toBeNull();
  });
  it("listedeki her yol sitede gerçek bir sayfa", () => {
    const yollar = new Set<string>(Object.values(SAYFALAR).map((s) => s.yol));
    for (const y of ONBELLEKLI_YOLLAR) expect(yollar.has(y), y).toBe(true);
  });
});
