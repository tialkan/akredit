// Testler için sahte kimlik sağlayıcılar. Ağ yoktur: OIDC sağlayıcısı yalnız 127.0.0.1'de dinler,
// SAML sağlayıcısı süreç içinde imzalı yanıt üretir. Kullanıcı bilgileri uydurmadır.

import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, SignJWT } from "jose";

export interface SahteKullanici {
  sub: string;
  email: string;
  name: string;
}

export interface SahteOidc {
  issuer: string;
  istemciKimligi: string;
  istemciGizlisi: string;
  /** Sonraki yetkilendirmede dönecek kullanıcı. */
  kullanici: SahteKullanici;
  /** Belirteç ucuna gelen istekler (PKCE ve istemci doğrulaması denetimi için). */
  belirtecIstekleri: URLSearchParams[];
  /** Yetkilendirme adresini işler: kod üretir ve geri dönüş adresini verir. */
  yetkilendir(adres: string): string;
  kapat(): Promise<void>;
}

export async function sahteOidcBaslat(): Promise<SahteOidc> {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "sahte-1", alg: "RS256", use: "sig" };
  const kodlar = new Map<string, { nonce: string | null; challenge: string | null; kullanici: SahteKullanici }>();
  const durum: Omit<SahteOidc, "issuer" | "yetkilendir" | "kapat"> = {
    istemciKimligi: "akredit-test",
    istemciGizlisi: "sahte-istemci-gizlisi",
    kullanici: { sub: "oidc-1", email: "kisi@a.ornek.edu.tr", name: "Deneme OIDC" },
    belirtecIstekleri: [],
  };
  let issuer = "";
  const sunucu: Server = createServer(async (istek, yanit) => {
    const url = new URL(istek.url ?? "/", issuer);
    const json = (veri: unknown, durumKodu = 200) => {
      yanit.writeHead(durumKodu, { "content-type": "application/json" });
      yanit.end(JSON.stringify(veri));
    };
    if (url.pathname === "/.well-known/openid-configuration")
      return json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        jwks_uri: `${issuer}/jwks`,
        userinfo_endpoint: `${issuer}/userinfo`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
        token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
        code_challenge_methods_supported: ["S256"],
      });
    if (url.pathname === "/jwks") return json({ keys: [jwk] });
    if (url.pathname === "/token") {
      let govde = "";
      for await (const parca of istek) govde += parca;
      const p = new URLSearchParams(govde);
      durum.belirtecIstekleri.push(p);
      const yetki = istek.headers.authorization;
      const temel = yetki?.startsWith("Basic ") ? Buffer.from(yetki.slice(6), "base64").toString() : null;
      const [id, gizli] = temel
        ? temel.split(":").map(decodeURIComponent)
        : [p.get("client_id"), p.get("client_secret")];
      if (id !== durum.istemciKimligi || gizli !== durum.istemciGizlisi) return json({ error: "invalid_client" }, 401);
      const k = kodlar.get(p.get("code") ?? "");
      if (!k) return json({ error: "invalid_grant" }, 400);
      kodlar.delete(p.get("code") ?? "");
      if (k.challenge) {
        const v = p.get("code_verifier") ?? "";
        if (createHash("sha256").update(v).digest("base64url") !== k.challenge)
          return json({ error: "invalid_grant", error_description: "pkce" }, 400);
      }
      const simdi = Math.floor(Date.now() / 1000);
      const idToken = await new SignJWT({
        email: k.kullanici.email,
        email_verified: true,
        name: k.kullanici.name,
        ...(k.nonce ? { nonce: k.nonce } : {}),
      })
        .setProtectedHeader({ alg: "RS256", kid: "sahte-1" })
        .setIssuer(issuer)
        .setAudience(durum.istemciKimligi)
        .setSubject(k.kullanici.sub)
        .setIssuedAt(simdi)
        .setExpirationTime(simdi + 300)
        .sign(privateKey);
      return json({
        access_token: `erisim-${k.kullanici.sub}`,
        token_type: "Bearer",
        expires_in: 300,
        id_token: idToken,
      });
    }
    if (url.pathname === "/userinfo")
      return json({
        sub: durum.kullanici.sub,
        email: durum.kullanici.email,
        email_verified: true,
        name: durum.kullanici.name,
      });
    json({ error: "not_found" }, 404);
  });
  await new Promise<void>((r) => sunucu.listen(0, "127.0.0.1", r));
  issuer = `http://127.0.0.1:${(sunucu.address() as AddressInfo).port}`;
  return Object.assign(durum, {
    issuer,
    yetkilendir(adres: string) {
      const u = new URL(adres);
      if (u.origin !== issuer || u.pathname !== "/authorize") throw new Error(`beklenmeyen adres: ${adres}`);
      if (u.searchParams.get("client_id") !== durum.istemciKimligi) throw new Error("istemci kimliği yanlış");
      const kod = randomBytes(16).toString("hex");
      kodlar.set(kod, {
        nonce: u.searchParams.get("nonce"),
        challenge: u.searchParams.get("code_challenge"),
        kullanici: { ...durum.kullanici },
      });
      const geri = new URL(u.searchParams.get("redirect_uri") ?? "");
      geri.searchParams.set("code", kod);
      geri.searchParams.set("state", u.searchParams.get("state") ?? "");
      return geri.toString();
    },
    kapat: () => new Promise<void>((r) => sunucu.close(() => r())),
  });
}

/** Test sertifikası ve anahtarı (yalnız test için üretilmiş, kendinden imzalı; gizli değildir). */
export function testSertifikasi() {
  const dizin = new URL("./test/fixtures/", import.meta.url);
  return {
    sertifika: readFileSync(new URL("idp-sertifika.pem", dizin), "utf8"),
    anahtar: readFileSync(new URL("idp-anahtar.pem", dizin), "utf8"),
  };
}
