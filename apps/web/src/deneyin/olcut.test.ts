import { describe, expect, it } from "vitest";
import { CERCEVE_SECENEKLERI, olcutAra, olcutGetir } from "./olcut.ts";

describe("ölçüt arama", () => {
  it("beş kurumun çerçeveleri seçilebilir", () => {
    const adlar = CERCEVE_SECENEKLERI.map((c) => c.ad).join(" ");
    for (const k of ["YÖKAK", "MÜDEK", "FEDEK", "EPDAD", "SABAK"]) expect(adlar).toContain(k);
  });

  it("kodla arama ilk sırada o ölçütü verir", () => {
    const r = olcutAra("B.1", "yokak-kurumsal");
    expect(r.sonuclar[0]?.kod).toBe("B.1");
    expect(olcutAra("   ", "yokak-kurumsal").toplam).toBe(0);
  });

  it("ölçüt resmî belge, sayfa ve SHA-256 kaynağıyla ve uzman onayı etiketiyle gelir", () => {
    const o = olcutGetir("B.1.1", "yokak-kurumsal");
    expect(o.kod).toBe("B.1.1");
    expect(o.kaynak?.adres).toMatch(/^https:\/\/www\.yokak\.gov\.tr\//u);
    expect(o.kaynak?.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(o.kaynak?.sayfa).toBeGreaterThan(0);
    expect(o.uzmanOnayiBekliyor).toBe(true);
    expect(o.metin.length).toBeGreaterThan(10);
  });

  it("program çerçevesinde de çalışır", () => {
    const r = olcutAra("program çıktıları", "mudek-lisans");
    expect(r.sonuclar.length).toBeGreaterThan(0);
    const o = olcutGetir(r.sonuclar[0]?.kod ?? "", "mudek-lisans");
    expect(o.kaynak?.adres).toMatch(/mudek\.org\.tr/u);
  });
});
