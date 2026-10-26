// Sahte SAML 2.0 kimlik sağlayıcısıyla uçtan uca giriş: SP metaverisi → AuthnRequest → imzalı yanıt → ACS → oturum.
// IdP süreç içinde (samlify) çalışır; ağ yoktur. Sertifika yalnız test için üretilmiş, gizli değildir.

import { inflateRawSync } from "node:zlib";
import { sema } from "@akredit/vt";
import * as samlify from "samlify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { istekBaglami } from "./erisim.ts";
import { testSertifikasi } from "./sahte-idp.ts";
import {
  ADRES,
  CerezKavanozu,
  istek,
  kimlikIstegi,
  sihirliGiris,
  type TestOrtami,
  testOrtami,
} from "./test-yardimci.ts";
import { davetKabulEt, davetOlustur } from "./yonetim.ts";

const IDP_VARLIK = "https://idp.a.ornek.edu.tr/idp/shibboleth";
const IDP_GIRIS = "https://idp.a.ornek.edu.tr/idp/profile/SAML2/Redirect/SSO";
const SP_VARLIK = `${ADRES}/api/kimlik/sso/saml2/sp/metadata`;
const ACS = `${ADRES}/api/kimlik/sso/saml2/sp/acs/a-saml`;

let o: TestOrtami;
const { sertifika, anahtar } = testSertifikasi();

function idpOlustur(imzaAnahtari = anahtar) {
  return samlify.IdentityProvider({
    entityID: IDP_VARLIK,
    privateKey: imzaAnahtari,
    signingCert: sertifika,
    isAssertionEncrypted: false,
    wantAuthnRequestsSigned: false,
    singleSignOnService: [{ Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect", Location: IDP_GIRIS }],
  });
}

beforeAll(async () => {
  o = await testOrtami({
    sso: [
      {
        domain: "a.ornek.edu.tr",
        providerId: "a-saml",
        samlConfig: {
          issuer: SP_VARLIK,
          entryPoint: IDP_GIRIS,
          cert: sertifika,
          callbackUrl: "/panel",
          wantAssertionsSigned: true,
          idpMetadata: { entityID: IDP_VARLIK, cert: sertifika },
          spMetadata: {},
        },
      },
    ],
  });
}, 60_000);
afterAll(() => o.kapat());

async function samlGiris(eposta: string, imzaAnahtari = anahtar) {
  const kavanoz = new CerezKavanozu();
  const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/sso", {
    govde: { providerId: "a-saml", callbackURL: "/panel" },
    kavanoz,
  });
  if (y.status !== 200) throw new Error(`sso başlatma: ${y.status} ${await y.text()}`);
  const { url } = (await y.json()) as { url: string };
  const u = new URL(url);
  expect(`${u.origin}${u.pathname}`).toBe(IDP_GIRIS);
  const istekXml = inflateRawSync(Buffer.from(u.searchParams.get("SAMLRequest") ?? "", "base64")).toString("utf8");
  const istekId = /ID="([^"]+)"/u.exec(istekXml)?.[1] ?? "";
  expect(istekId).not.toBe("");

  const metaveri = await kimlikIstegi(o.k, "/api/kimlik/sso/saml2/sp/metadata?providerId=a-saml");
  const sp = samlify.ServiceProvider({ metadata: await metaveri.text() });
  const idp = idpOlustur(imzaAnahtari);
  const yanit = await idp.createLoginResponse(
    sp,
    { extract: { request: { id: istekId } } },
    "post",
    { email: eposta },
    undefined,
    false,
    u.searchParams.get("RelayState") ?? undefined,
  );
  const govde = new URLSearchParams({
    SAMLResponse: yanit.context,
    RelayState: u.searchParams.get("RelayState") ?? "",
  });
  const basliklar = new Headers({ "content-type": "application/x-www-form-urlencoded", cookie: kavanoz.baslik() });
  const acs = await o.k.auth.handler(new Request(ACS, { method: "POST", headers: basliklar, body: govde.toString() }));
  kavanoz.al(acs);
  return { kavanoz, acs, istekXml };
}

describe("sahte SAML sağlayıcısıyla giriş", () => {
  it("SP metaverisi YETKİM kaydı için ACS adresini ve imzalı onay isteğini bildirir", async () => {
    const y = await kimlikIstegi(o.k, "/api/kimlik/sso/saml2/sp/metadata?providerId=a-saml");
    expect(y.status).toBe(200);
    const xml = await y.text();
    expect(xml).toContain("EntityDescriptor");
    expect(xml).toContain(ACS);
    expect(xml).toMatch(/WantAssertionsSigned="true"/u);
  });

  it("davetli kullanıcı imzalı SAML yanıtıyla oturum açar", async () => {
    const { kavanoz: yk } = await sihirliGiris(o, o.a.yoneticiEposta);
    const yonetici = await istekBaglami(o.k, istek("/", { kavanoz: yk }));
    const d = await davetOlustur(o.k, yonetici, {
      adSoyad: "Deneme SAML",
      eposta: "saml@a.ornek.edu.tr",
      rol: "program_sorumlusu",
      kapsam: { tur: "program", id: o.a.programId },
    });
    const { kavanoz, acs } = await samlGiris("saml@a.ornek.edu.tr");
    expect(acs.status).toBe(302);
    expect(acs.headers.get("location") ?? "").not.toMatch(/error/u);
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(true);
    await davetKabulEt(o.k, istek("/", { kavanoz }), d.belirtec);
    const b = await istekBaglami(o.k, istek("/", { kavanoz }));
    expect(b.kisi.kurumId).toBe(o.a.kurumId);
    expect(b.kisi.atamalar.map((x) => x.rol)).toEqual(["program_sorumlusu"]);
    const hesap = (await o.db.select().from(sema.kimlikHesap)).find((h) => h.providerId === "a-saml");
    expect(hesap?.password).toBeNull();
  });

  it("başka anahtarla imzalanmış yanıt reddedilir", async () => {
    const { generateKeyPairSync } = await import("node:crypto");
    const sahte = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({
      type: "pkcs8",
      format: "pem",
    }) as string;
    const { kavanoz, acs } = await samlGiris("saml@a.ornek.edu.tr", sahte);
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(false);
    expect(acs.headers.get("location") ?? "").toMatch(/error/u);
    expect(acs.headers.get("location")).toContain("Invalid+SAML+response");
  });

  it("davetsiz SAML kullanıcısı için hesap açılmaz", async () => {
    const { kavanoz, acs } = await samlGiris("davetsiz-saml@a.ornek.edu.tr");
    expect(acs.headers.get("location")).toContain("error=unable_to_create_user");
    expect(kavanoz.cerezler.has("akredit.session_token")).toBe(false);
    const k = await o.db.select().from(sema.kimlikKullanici);
    expect(k.map((x) => x.email)).not.toContain("davetsiz-saml@a.ornek.edu.tr");
  });
});
