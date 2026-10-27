// Kurum anahtar kasası: şifreleme gidiş-dönüş, kurum bağı, bozuk metin, ortam değişkeni, biçim denetimi.
import { describe, expect, it } from "vitest";
import {
  anahtarIzi,
  openrouterAnahtariBicimi,
  ortamdanAnahtarKasasi,
  saglayiciAnahtarKasasi,
  YzHatasi,
} from "../src/index.ts";

const ANA = new Uint8Array(32).fill(7);
// Uydurma anahtar; gerçek değildir.
const ORNEK = "sk-or-v1-ornekornekornekornek0000abcd";

describe("sağlayıcı anahtar kasası", () => {
  it("şifreler, düz metni içermez ve aynı kurumda çözer", () => {
    const k = saglayiciAnahtarKasasi(ANA);
    const s = k.sifrele(ORNEK, "kurum-a");
    expect(s.startsWith("v1.")).toBe(true);
    expect(s).not.toContain("ornek");
    expect(k.coz(s, "kurum-a")).toBe(ORNEK);
  });

  it("başka kurumda ve bozuk metinde açılmaz", () => {
    const k = saglayiciAnahtarKasasi(ANA);
    const s = k.sifrele(ORNEK, "kurum-a");
    expect(() => k.coz(s, "kurum-b")).toThrow(YzHatasi);
    expect(() => k.coz("v1.x.y.z", "kurum-a")).toThrow(YzHatasi);
    expect(() => k.coz("duz", "kurum-a")).toThrow(YzHatasi);
  });

  it("ana anahtar 32 bayt olmalı; ortam değişkeni yoksa null", () => {
    expect(() => saglayiciAnahtarKasasi(new Uint8Array(8))).toThrow();
    expect(ortamdanAnahtarKasasi({})).toBeNull();
    expect(ortamdanAnahtarKasasi({ AKREDIT_ANAHTAR_KASASI: "kisa" })).toBeNull();
    const k = ortamdanAnahtarKasasi({ AKREDIT_ANAHTAR_KASASI: Buffer.from(ANA).toString("base64") });
    expect(k?.coz(k.sifrele(ORNEK, "a"), "a")).toBe(ORNEK);
  });

  it("iz yalnız son dört karakter; OpenRouter biçimi", () => {
    expect(anahtarIzi(ORNEK)).toBe("abcd");
    expect(openrouterAnahtariBicimi(ORNEK)).toBe(true);
    expect(openrouterAnahtariBicimi("sk-proj-abc")).toBe(false);
  });
});
