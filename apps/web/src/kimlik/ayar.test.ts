import { describe, expect, it } from "vitest";
import { ortamdanAyar, tamAdres } from "./ayar.ts";

const GIZLI = "k".repeat(32);

describe("kimlik ayarı: kök adres", () => {
  it("şemasız alan adına https:// eklenir (Coolify SERVICE_FQDN yalnız alan adı verebilir)", () => {
    expect(tamAdres("akredit.org")).toBe("https://akredit.org");
    expect(tamAdres(" akredit.org ")).toBe("https://akredit.org");
    expect(tamAdres("https://akredit.org")).toBe("https://akredit.org");
    expect(tamAdres("http://localhost:3000")).toBe("http://localhost:3000");
    expect(tamAdres(undefined)).toBeUndefined();
    expect(tamAdres("")).toBe("");
  });

  it("ortamdan ayar şemasız adresi kabul eder; adres yoksa açık hatayla reddeder", () => {
    expect(ortamdanAyar({ AKREDIT_ADRES: "akredit.org", AKREDIT_KIMLIK_GIZLI: GIZLI }).temelAdres).toBe(
      "https://akredit.org",
    );
    expect(() => ortamdanAyar({ AKREDIT_KIMLIK_GIZLI: GIZLI })).toThrow();
  });
});
