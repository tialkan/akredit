// Sahte OIDC sağlayıcısıyla uçtan uca giriş: yetkilendirme → kod → belirteç (PKCE) → oturum.

import { sema } from "@akredit/vt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { istekBaglami } from "./erisim.ts";
import { type SahteOidc, sahteOidcBaslat } from "./sahte-idp.ts";
import { CerezKavanozu, istek, kimlikIstegi, type TestOrtami, testOrtami } from "./test-yardimci.ts";
import { davetKabulEt, davetOlustur } from "./yonetim.ts";

let o: TestOrtami;
let idp: SahteOidc;

beforeAll(async () => {
  idp = await sahteOidcBaslat();
  o = await testOrtami({
    sso: [
      {
        domain: "a.ornek.edu.tr",
        providerId: "a-oidc",
        oidcConfig: {
          issuer: idp.issuer,
          pkce: true,
          clientId: idp.istemciKimligi,
          clientSecret: idp.istemciGizlisi,
          discoveryEndpoint: `${idp.issuer}/.well-known/openid-configuration`,
          scopes: ["openid", "email", "profile"],
        },
      },
    ],
  });
}, 60_000);
afterAll(async () => {
  await o.kapat();
  await idp.kapat();
});

async function oidcGiris(): Promise<{ kavanoz: CerezKavanozu; yanit: Response }> {
  const kavanoz = new CerezKavanozu();
  const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/sso", {
    govde: { providerId: "a-oidc", callbackURL: "/panel" },
    kavanoz,
  });
  if (y.status !== 200) throw new Error(`sso başlatma: ${y.status} ${await y.text()}`);
  const { url } = (await y.json()) as { url: string };
  const geri = idp.yetkilendir(url);
  const yanit = await kimlikIstegi(o.k, geri, { kavanoz });
  return { kavanoz, yanit };
}

describe("sahte OIDC sağlayıcısıyla giriş", () => {
  it("davetli kullanıcı kurumsal girişle oturum açar; PKCE ve istemci doğrulaması kullanılır", async () => {
    const yonetici = (async () => {
      // Yönetici sihirli bağlantı olmadan da var: üyeliği tohumda. Daveti doğrudan oluşturmak için bağlam kur.
      const { sihirliGiris } = await import("./test-yardimci.ts");
      const { kavanoz } = await sihirliGiris(o, o.a.yoneticiEposta);
      return istekBaglami(o.k, istek("/", { kavanoz }));
    })();
    const d = await davetOlustur(o.k, await yonetici, {
      adSoyad: "Deneme OIDC",
      eposta: idp.kullanici.email,
      rol: "ogretim_elemani",
      kapsam: { tur: "ders", id: o.a.dersId },
    });

    const { kavanoz, yanit } = await oidcGiris();
    expect(yanit.status).toBe(302);
    expect(yanit.headers.get("location")).toBe("/panel");
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(true);
    const istekler = idp.belirtecIstekleri.at(-1);
    expect(istekler?.get("grant_type")).toBe("authorization_code");
    expect(istekler?.get("code_verifier")?.length).toBeGreaterThanOrEqual(43);

    await davetKabulEt(o.k, istek("/", { kavanoz }), d.belirtec);
    const b = await istekBaglami(o.k, istek("/", { kavanoz }));
    expect(b.kisi.kurumId).toBe(o.a.kurumId);
    expect(b.kisi.atamalar.map((x) => x.rol)).toEqual(["ogretim_elemani"]);

    const hesaplar = await o.db.select().from(sema.kimlikHesap);
    const oidcHesap = hesaplar.find((h) => h.providerId === "a-oidc");
    expect(oidcHesap?.accountId).toBe(idp.kullanici.sub);
    expect(oidcHesap?.password).toBeNull();
    // Sağlayıcı belirteçleri şifreli saklanır.
    expect(oidcHesap?.accessToken ?? "").not.toContain("erisim-");
  });

  it("davetsiz OIDC kullanıcısı için hesap açılmaz", async () => {
    idp.kullanici = { sub: "oidc-2", email: "davetsiz@a.ornek.edu.tr", name: "Deneme Davetsiz" };
    const { kavanoz } = await oidcGiris();
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(false);
    const k = await o.db.select().from(sema.kimlikKullanici);
    expect(k.map((x) => x.email)).not.toContain("davetsiz@a.ornek.edu.tr");
  });

  it("değiştirilmiş state ile geri dönüş oturum açmaz", async () => {
    idp.kullanici = { sub: "oidc-1", email: "kisi@a.ornek.edu.tr", name: "Deneme OIDC" };
    const kavanoz = new CerezKavanozu();
    const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/sso", {
      govde: { providerId: "a-oidc", callbackURL: "/panel" },
      kavanoz,
    });
    const { url } = (await y.json()) as { url: string };
    const geri = new URL(idp.yetkilendir(url));
    geri.searchParams.set("state", "uydurma-durum");
    await kimlikIstegi(o.k, geri.toString(), { kavanoz });
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(false);
  });

  it("kurum sağlayıcısı kendi alan adı dışındaki e-postayla başka kurumun üyeliğine bağlanamaz", async () => {
    // A'nın kimlik sağlayıcısı (alan adı a.ornek.edu.tr) B yöneticisinin e-postasını bildirir.
    // B yöneticisinin henüz hesabı yok; üyeliği tohumda. Hesap açılmamalı, B'ye bağlanmamalı.
    idp.kullanici = { sub: "oidc-saldiri", email: o.b.yoneticiEposta, name: "Deneme Saldırgan" };
    const { kavanoz } = await oidcGiris();
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(false);
    const k = await o.db.select().from(sema.kimlikKullanici);
    expect(k.map((x) => x.email)).not.toContain(o.b.yoneticiEposta);
  });

  // İP-27, inceleme dalga 2 #9: kod enjeksiyonu ve yeniden oynatma. @better-auth/sso 1.7 yetkilendirme
  // isteğine nonce koymuyor (yetki kodu akışında OIDC isteğe bağlı sayar); koruma PKCE + state + tek
  // kullanımlık koddur. Aşağıdaki testler bu korumanın nonce'un işini gördüğünü sınar.
  describe("kod enjeksiyonu ve yeniden oynatma", () => {
    async function baslat() {
      idp.kullanici = { sub: "oidc-1", email: "kisi@a.ornek.edu.tr", name: "Deneme OIDC" };
      const kavanoz = new CerezKavanozu();
      const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/sso", {
        govde: { providerId: "a-oidc", callbackURL: "/panel" },
        kavanoz,
      });
      const { url } = (await y.json()) as { url: string };
      return { kavanoz, url };
    }

    it("başka oturum için verilmiş kod kurbanın oturumuna sokulamaz (PKCE)", async () => {
      const saldirgan = await baslat();
      const kurban = await baslat();
      const saldirganGeri = new URL(idp.yetkilendir(saldirgan.url));
      const kurbanState = new URL(kurban.url).searchParams.get("state") ?? "";
      // Saldırganın kodu, kurbanın state'i ve çerezleriyle geri dönüşe gönderilir.
      saldirganGeri.searchParams.set("state", kurbanState);
      await kimlikIstegi(o.k, saldirganGeri.toString(), { kavanoz: kurban.kavanoz });
      expect(kurban.kavanoz.cerezler.has("akredit.session_token")).toBe(false);
      expect(idp.belirtecIstekleri.at(-1)?.get("code_verifier")).toBeTruthy();
    });

    it("kullanılmış geri dönüş adresi (kod + state) ikinci kez oturum açmaz", async () => {
      const { kavanoz, url } = await baslat();
      const geri = idp.yetkilendir(url);
      const onceki = new CerezKavanozu();
      for (const [a, d] of kavanoz.cerezler) onceki.cerezler.set(a, d);
      await kimlikIstegi(o.k, geri, { kavanoz });
      expect(kavanoz.cerezler.has("akredit.session_token")).toBe(true);
      // Saldırgan aynı adresi ve oturum öncesi çerezleri yeniden oynatır.
      await kimlikIstegi(o.k, geri, { kavanoz: onceki });
      expect(onceki.cerezler.has("akredit.session_token")).toBe(false);
    });
  });
});
