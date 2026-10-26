// Better Auth yapılandırması: e-postayla sihirli bağlantı, kurumsal tek oturum (OIDC ve SAML 2.0).
// Parola ile giriş kapalıdır; hesap yalnız davet ya da toplu içe aktarmayla açılmış bir üyelikle oluşur.
// Giriş bilgisi (belirteç, kod, çerez) hiçbir zaman günlüğe yazılmaz: kimlik olayları `kimlikOlayi` ile
// ayıklanır, kütüphanenin kendi günlükleri de `gizliAyikla`dan geçer.

import { gunlugeYaz, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import {
  agParmakIzi,
  cihazParmakIzi,
  gizliAyikla,
  kimlikOlayi,
  OTURUM_SURESI_SN,
  OTURUM_YENILEME_SN,
  SIHIRLI_BAGLANTI_SURESI_SN,
  supheliGirisMi,
} from "@akredit/yetki";
import { sso } from "@better-auth/sso";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { KimlikAyari } from "./ayar.ts";

export interface EpostaGonderici {
  /** Sihirli bağlantıyı gönderir. Bağlantı gizlidir: günlüğe yazılmaz, modele verilmez. */
  sihirliBaglanti(alici: string, baglanti: string): Promise<void>;
  /** Şüpheli giriş bildirimi (bağlantı içermez). */
  supheliGiris(alici: string, ayrinti: { zaman: Date; cihaz: string }): Promise<void>;
}

export type Kayitci = (duzey: string, ileti: string, ayrinti?: unknown) => void;

export interface KimlikSecenekleri {
  db: Vt;
  ayar: KimlikAyari;
  eposta: EpostaGonderici;
  kayitci?: Kayitci;
  /** Testte zamanı sabitlemek için. */
  simdi?: () => Date;
}

export const KIMLIK_YOLU = "/api/kimlik";

/** Kullanıcının e-postasına açılmış üyelikleri, henüz bağlanmamışsa kullanıcıya bağlar. */
async function uyelikleriBagla(db: Vt, kullaniciId: string, eposta: string) {
  await db
    .update(sema.kimlikUyelik)
    .set({ kullaniciId })
    .where(and(eq(sema.kimlikUyelik.eposta, eposta.toLowerCase()), isNull(sema.kimlikUyelik.kullaniciId)));
  return db.select().from(sema.kimlikUyelik).where(eq(sema.kimlikUyelik.kullaniciId, kullaniciId));
}

/** Hesap açılabilir mi? Yalnız bir üyelik ya da süresi geçmemiş açık davet varsa. */
async function hesapAcilabilirMi(db: Vt, eposta: string, simdi: Date): Promise<boolean> {
  const e = eposta.toLowerCase();
  const uyelik = await db
    .select({ id: sema.kimlikUyelik.id })
    .from(sema.kimlikUyelik)
    .where(eq(sema.kimlikUyelik.eposta, e))
    .limit(1);
  if (uyelik.length > 0) return true;
  const davetler = await db
    .select({ son: sema.kimlikDavet.sonGecerlilik })
    .from(sema.kimlikDavet)
    .where(and(eq(sema.kimlikDavet.eposta, e), isNull(sema.kimlikDavet.kabulZamani)));
  return davetler.some((d) => d.son.getTime() > simdi.getTime());
}

function istemciIp(basliklar: Headers | undefined): string | null {
  const x = basliklar?.get("x-forwarded-for");
  return x?.split(",")[0]?.trim() || basliklar?.get("x-real-ip") || null;
}

export function kimlikSunucusuOlustur(s: KimlikSecenekleri) {
  const { db, ayar } = s;
  const simdi = s.simdi ?? (() => new Date());
  const kayitci: Kayitci = s.kayitci ?? (() => {});

  const auth = betterAuth({
    appName: "Akredit",
    baseURL: ayar.temelAdres,
    basePath: KIMLIK_YOLU,
    secret: ayar.gizli,
    trustedOrigins: [new URL(ayar.temelAdres).origin, ...ayar.izinliKokenler],
    telemetry: { enabled: false },
    logger: {
      level: "warn",
      log: (duzey, ileti, ...ek) => kayitci(duzey, String(gizliAyikla(ileti)), gizliAyikla(ek)),
    },
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        kimlikKullanici: sema.kimlikKullanici,
        kimlikOturum: sema.kimlikOturum,
        kimlikHesap: sema.kimlikHesap,
        kimlikDogrulama: sema.kimlikDogrulama,
        kimlikSsoSaglayici: sema.kimlikSsoSaglayici,
      },
    }),
    user: { modelName: "kimlikKullanici" },
    session: {
      modelName: "kimlikOturum",
      expiresIn: OTURUM_SURESI_SN,
      updateAge: OTURUM_YENILEME_SN,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: "kimlikHesap",
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, trustedProviders: ayar.ssoSaglayicilari.map((x) => x.providerId) },
    },
    verification: { modelName: "kimlikDogrulama" },
    emailAndPassword: { enabled: false },
    advanced: {
      useSecureCookies: ayar.uretim,
      cookiePrefix: "akredit",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: ayar.uretim },
    },
    rateLimit: { enabled: ayar.uretim },
    databaseHooks: {
      user: {
        create: {
          before: async (kullanici) => {
            // Davet ya da içe aktarma olmadan hesap açılmaz (kayıt herkese açık değildir).
            if (!(await hesapAcilabilirMi(db, kullanici.email, simdi()))) return false;
            return { data: { ...kullanici, email: kullanici.email.toLowerCase() } };
          },
        },
      },
      session: {
        create: {
          after: async (oturum, baglam) => {
            const [kullanici] = await db
              .select()
              .from(sema.kimlikKullanici)
              .where(eq(sema.kimlikKullanici.id, oturum.userId));
            if (!kullanici) return;
            const basliklar = baglam?.request?.headers ?? baglam?.headers;
            const iz = {
              ag: agParmakIzi(istemciIp(basliklar), ayar.gizli),
              cihaz: cihazParmakIzi(basliklar?.get("user-agent")),
            };
            const onceki = await db
              .select({ ag: sema.kimlikGirisIzi.ag, cihaz: sema.kimlikGirisIzi.cihaz })
              .from(sema.kimlikGirisIzi)
              .where(eq(sema.kimlikGirisIzi.kullaniciId, kullanici.id))
              .orderBy(desc(sema.kimlikGirisIzi.zaman))
              .limit(50);
            const supheli = supheliGirisMi(onceki, iz);
            await db.insert(sema.kimlikGirisIzi).values({ kullaniciId: kullanici.id, ag: iz.ag, cihaz: iz.cihaz });
            const yol = baglam?.path ?? "";
            const yontem = yol.includes("magic-link") ? "sihirli_baglanti" : yol.includes("sso") ? "kurumsal" : "diger";
            const uyelikler = await uyelikleriBagla(db, kullanici.id, kullanici.email);
            for (const u of uyelikler) {
              await kiraciIslemi(db, u.bagliKurumId, async (tx) => {
                await gunlugeYaz(
                  tx,
                  kimlikOlayi({ aktor: { tur: "kisi", id: u.kisiId }, eylem: "kimlik.giris", ayrinti: { yontem } }),
                );
                if (supheli)
                  await gunlugeYaz(
                    tx,
                    kimlikOlayi({
                      aktor: { tur: "kisi", id: u.kisiId },
                      eylem: "kimlik.supheli_giris",
                      ayrinti: { cihaz: iz.cihaz, yeniAg: true },
                    }),
                  );
              });
            }
            if (supheli) await s.eposta.supheliGiris(kullanici.email, { zaman: simdi(), cihaz: iz.cihaz });
          },
        },
      },
    },
    plugins: [
      magicLink({
        expiresIn: SIHIRLI_BAGLANTI_SURESI_SN,
        storeToken: "hashed",
        sendMagicLink: async ({ email, url }) => {
          await s.eposta.sihirliBaglanti(email, url);
        },
      }),
      sso({
        modelName: "kimlikSsoSaglayici",
        defaultSSO: ayar.ssoSaglayicilari,
        // Sağlayıcılar kurum ayarından gelir; kullanıcılar sağlayıcı kaydedemez.
        providersLimit: 0,
        organizationProvisioning: { disabled: true },
      }),
    ],
  });

  return { auth, db, ayar, simdi };
}

export type KimlikSunucusu = ReturnType<typeof kimlikSunucusuOlustur>;
