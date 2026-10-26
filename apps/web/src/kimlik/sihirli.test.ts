import { sema } from "@akredit/vt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { istekBaglami } from "./erisim.ts";
import { istek, kimlikIstegi, sihirliGiris, type TestOrtami, testOrtami } from "./test-yardimci.ts";

let o: TestOrtami;
beforeAll(async () => {
  o = await testOrtami();
}, 60_000);
afterAll(() => o.kapat());

describe("sihirli bağlantıyla giriş", () => {
  it("üyeliği olan kullanıcı bağlantıyla girer, oturum çerezi HttpOnly ve SameSite=Lax", async () => {
    const { kavanoz, yanit } = await sihirliGiris(o, o.a.yoneticiEposta);
    expect(yanit.status).toBe(302);
    const cerez = yanit.headers.getSetCookie().find((c) => c.startsWith("akredit.session_token="));
    expect(cerez).toMatch(/HttpOnly/iu);
    expect(cerez).toMatch(/SameSite=Lax/iu);
    const b = await istekBaglami(o.k, istek("/panel", { kavanoz }));
    expect(b.kisi.kurumId).toBe(o.a.kurumId);
    expect(b.kisi.kisiId).toBe(o.a.yoneticiKisiId);
    expect(b.kisi.atamalar.map((x) => x.rol)).toEqual(["kurum_yoneticisi"]);
  });

  it("bağlantı tek kullanımlıktır", async () => {
    const son = o.eposta.kutu.filter((x) => x.tur === "sihirli").at(-1);
    const y = await kimlikIstegi(o.k, son?.baglanti ?? "");
    expect(y.headers.getSetCookie().some((c) => c.startsWith("akredit.session_token=") && !/Max-Age=0/iu.test(c))).toBe(
      false,
    );
  });

  it("üyeliği ya da daveti olmayan e-postayla hesap açılmaz", async () => {
    const eposta = "yabanci@kotu.example";
    await kimlikIstegi(o.k, "/api/kimlik/sign-in/magic-link", { govde: { email: eposta, callbackURL: "/panel" } });
    const son = o.eposta.kutu.filter((x) => x.alici === eposta).at(-1);
    if (son?.baglanti) await kimlikIstegi(o.k, son.baglanti);
    const kullanicilar = await o.db.select().from(sema.kimlikKullanici);
    expect(kullanicilar.map((x) => x.email)).not.toContain(eposta);
  });

  it("parola ile kayıt ve giriş uç noktaları kapalıdır", async () => {
    const kayit = await kimlikIstegi(o.k, "/api/kimlik/sign-up/email", {
      govde: { email: o.b.yoneticiEposta, password: "uydurma-parola-123", name: "X" },
    });
    expect(kayit.status).toBeGreaterThanOrEqual(400);
    const giris = await kimlikIstegi(o.k, "/api/kimlik/sign-in/email", {
      govde: { email: o.a.yoneticiEposta, password: "uydurma-parola-123" },
    });
    expect(giris.status).toBeGreaterThanOrEqual(400);
  });
});
