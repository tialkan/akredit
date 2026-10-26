// Kimlik katmanının ayarları: ortam değişkenlerinden ya da kurum ayarından gelir, zod ile doğrulanır.

import { z } from "zod";

const OidcAyari = z.object({
  issuer: z.url(),
  pkce: z.boolean().default(true),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  discoveryEndpoint: z.url(),
  authorizationEndpoint: z.url().optional(),
  tokenEndpoint: z.url().optional(),
  jwksEndpoint: z.url().optional(),
  userInfoEndpoint: z.url().optional(),
  scopes: z.array(z.string()).default(["openid", "email", "profile"]),
});

const SamlAyari = z.object({
  /** Hizmet sağlayıcı (SP) varlık kimliği: YETKİM federasyonuna bu adla kaydolunur. */
  issuer: z.url(),
  /** Kimlik sağlayıcının (IdP) tek oturum adresi. */
  entryPoint: z.url(),
  /** IdP imza sertifikası (PEM). */
  cert: z.string().min(1),
  callbackUrl: z.string().min(1),
  wantAssertionsSigned: z.boolean().default(true),
  idpMetadata: z.object({ metadata: z.string().optional(), entityID: z.string().optional() }).default({}),
  spMetadata: z.object({ entityID: z.string().optional() }).default({}),
  identifierFormat: z.string().optional(),
  mapping: z
    .object({
      id: z.string(),
      email: z.string(),
      name: z.string(),
      emailVerified: z.string().optional(),
    })
    .optional(),
});

export const SsoSaglayicisi = z
  .object({
    /** Kurumun e-posta alan adı (ör. ornek.edu.tr); girişte sağlayıcıyı seçmek için. */
    domain: z.string().min(3),
    providerId: z.string().regex(/^[a-z0-9-]+$/u),
    oidcConfig: OidcAyari.optional(),
    samlConfig: SamlAyari.optional(),
  })
  .refine((x) => Boolean(x.oidcConfig) !== Boolean(x.samlConfig), "Sağlayıcı ya OIDC ya SAML olmalı.");
export type SsoSaglayicisi = z.infer<typeof SsoSaglayicisi>;

export const KimlikAyari = z.object({
  /** Uygulamanın kök adresi (ör. https://akredit.org). */
  temelAdres: z.url(),
  /** Oturum imza anahtarı; en az 32 karakter, depoya yazılmaz. */
  gizli: z.string().min(32, "Kimlik gizli anahtarı en az 32 karakter olmalı."),
  uretim: z.boolean(),
  izinliKokenler: z.array(z.url()).default([]),
  ssoSaglayicilari: z.array(SsoSaglayicisi).default([]),
});
export type KimlikAyari = z.infer<typeof KimlikAyari>;

/** Ortam değişkenlerinden ayar: AKREDIT_ADRES, AKREDIT_KIMLIK_GIZLI, AKREDIT_SSO (JSON). */
export function ortamdanAyar(ortam: Record<string, string | undefined>): KimlikAyari {
  return KimlikAyari.parse({
    temelAdres: ortam.AKREDIT_ADRES,
    gizli: ortam.AKREDIT_KIMLIK_GIZLI,
    uretim: ortam.NODE_ENV === "production",
    ssoSaglayicilari: ortam.AKREDIT_SSO ? JSON.parse(ortam.AKREDIT_SSO) : [],
  });
}
