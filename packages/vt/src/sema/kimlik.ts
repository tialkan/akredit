// Kimlik altyapısı (İP-09): Better Auth tabloları ve Akredit'e özgü üyelik, davet, API anahtarı, giriş izi.
//
// Bu tablolar kiracı tablosu DEĞİLDİR: giriş anında kullanıcının hangi kuruma ait olduğu henüz bilinmez
// (e-posta, davet belirteci ya da API anahtarı önekiyle aranır). Bu yüzden `kurum_id` yerine `bagli_kurum_id`
// sütunu taşırlar; satır güvenliği açıktır ve `akredit_uygulama` rolüne hiçbir yetki verilmez. Yalnız kimlik
// katmanı (`akredit_kimlik` rolü) erişir. Kiracı verisine geçiş her zaman `kiraciIslemi` ile olur.
//
// Better Auth sütunlarının TypeScript adları kütüphanenin alan adlarıyla aynıdır (uyarlayıcı bunları bekler);
// SQL adları Türkçe ASCII'dir.

import { boolean, index, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { kisi, kurum } from "./kurum.ts";
import { kapsamTuru, kimlik, olusturma, rol, zaman } from "./ortak.ts";

const zamanZorunlu = (ad: string) => zaman(ad).notNull().defaultNow();

export const kimlikKullanici = pgTable("kimlik_kullanici", {
  id: text("id").primaryKey(),
  name: text("ad").notNull(),
  email: text("eposta").notNull().unique(),
  emailVerified: boolean("eposta_dogrulandi").notNull().default(false),
  image: text("resim"),
  createdAt: zamanZorunlu("olusturma"),
  updatedAt: zamanZorunlu("guncelleme"),
});

export const kimlikOturum = pgTable(
  "kimlik_oturum",
  {
    id: text("id").primaryKey(),
    expiresAt: zaman("bitis").notNull(),
    /** Çerezdeki oturum belirteci. Günlüğe ve modele girmez. */
    token: text("belirtec").notNull().unique(),
    createdAt: zamanZorunlu("olusturma"),
    updatedAt: zamanZorunlu("guncelleme"),
    ipAddress: text("ip_adresi"),
    userAgent: text("tarayici"),
    userId: text("kullanici_id")
      .notNull()
      .references(() => kimlikKullanici.id, { onDelete: "cascade" }),
  },
  (t) => [index("kimlik_oturum_kullanici").on(t.userId)],
);

/**
 * Bağlı hesaplar (SSO). `password` sütunu yalnız uyarlayıcı uyumu için vardır; göçteki kısıt onu her zaman
 * NULL tutar: Akredit parola saklamaz (sihirli bağlantı ve SSO).
 */
export const kimlikHesap = pgTable(
  "kimlik_hesap",
  {
    id: text("id").primaryKey(),
    accountId: text("hesap_kimligi").notNull(),
    providerId: text("saglayici").notNull(),
    userId: text("kullanici_id")
      .notNull()
      .references(() => kimlikKullanici.id, { onDelete: "cascade" }),
    accessToken: text("erisim_belirteci"),
    refreshToken: text("yenileme_belirteci"),
    idToken: text("kimlik_belirteci"),
    accessTokenExpiresAt: zaman("erisim_belirteci_bitis"),
    refreshTokenExpiresAt: zaman("yenileme_belirteci_bitis"),
    scope: text("kapsam"),
    password: text("parola"),
    createdAt: zamanZorunlu("olusturma"),
    updatedAt: zamanZorunlu("guncelleme"),
  },
  (t) => [index("kimlik_hesap_kullanici").on(t.userId)],
);

/** Sihirli bağlantı belirteçleri ve SSO durum kayıtları (kısa ömürlü). */
export const kimlikDogrulama = pgTable(
  "kimlik_dogrulama",
  {
    id: text("id").primaryKey(),
    identifier: text("tanimlayici").notNull(),
    value: text("deger").notNull(),
    expiresAt: zaman("bitis").notNull(),
    createdAt: zamanZorunlu("olusturma"),
    updatedAt: zamanZorunlu("guncelleme"),
  },
  (t) => [index("kimlik_dogrulama_tanimlayici").on(t.identifier)],
);

/** Better Auth SSO eklentisinin sağlayıcı tablosu (OIDC/SAML yapılandırması). */
export const kimlikSsoSaglayici = pgTable("kimlik_sso_saglayici", {
  id: text("id").primaryKey(),
  issuer: text("yayinci").notNull(),
  oidcConfig: text("oidc_ayari"),
  samlConfig: text("saml_ayari"),
  userId: text("kullanici_id").references(() => kimlikKullanici.id, { onDelete: "cascade" }),
  providerId: text("saglayici").notNull().unique(),
  organizationId: text("organizasyon"),
  domain: text("alan_adi").notNull(),
  domainVerified: boolean("alan_adi_dogrulandi"),
});

/** Kullanıcı ↔ kurum ↔ kişi bağı. Bir kullanıcı bir kurumda bir kişidir. */
export const kimlikUyelik = pgTable(
  "kimlik_uyelik",
  {
    id: kimlik(),
    /** Toplu içe aktarmada kullanıcı henüz giriş yapmamış olabilir; ilk girişte e-postayla bağlanır. */
    kullaniciId: text("kullanici_id").references(() => kimlikKullanici.id),
    eposta: text("eposta").notNull(),
    bagliKurumId: uuid("bagli_kurum_id")
      .notNull()
      .references(() => kurum.id),
    kisiId: uuid("kisi_id")
      .notNull()
      .references(() => kisi.id),
    /** Demo ziyaretçisinin üyeliği (İP-41): bu andan sonra istek bağlamı kurulmaz. */
    demoBitis: zaman("demo_bitis"),
    /** Demo ziyaretçisinin seçtiği rol (rehber turu için). */
    demoRolu: text("demo_rolu"),
    olusturma: olusturma(),
  },
  (t) => [
    unique("kimlik_uyelik_kurum_eposta").on(t.bagliKurumId, t.eposta),
    index("kimlik_uyelik_eposta").on(t.eposta),
  ],
);

/** Davetler: belirtecin yalnız SHA-256 özeti saklanır. */
export const kimlikDavet = pgTable("kimlik_davet", {
  id: kimlik(),
  bagliKurumId: uuid("bagli_kurum_id")
    .notNull()
    .references(() => kurum.id),
  eposta: text("eposta").notNull(),
  adSoyad: text("ad_soyad").notNull(),
  rol: rol("rol").notNull(),
  kapsamTuru: kapsamTuru("kapsam_turu").notNull(),
  kapsamId: uuid("kapsam_id").notNull(),
  /** Rol atamasının bitişi (değerlendirici için zorunlu). */
  rolBitis: zaman("rol_bitis"),
  belirtecOzeti: text("belirtec_ozeti").notNull().unique(),
  sonGecerlilik: zaman("son_gecerlilik").notNull(),
  davetEdenKisiId: uuid("davet_eden_kisi_id")
    .notNull()
    .references(() => kisi.id),
  kabulZamani: zaman("kabul_zamani"),
  kabulEdenKullaniciId: text("kabul_eden_kullanici_id").references(() => kimlikKullanici.id),
  olusturma: olusturma(),
});

/** API anahtarları (CLI, MCP, bağlayıcılar): yalnız önek ve özet saklanır. */
export const kimlikApiAnahtari = pgTable("kimlik_api_anahtari", {
  id: kimlik(),
  bagliKurumId: uuid("bagli_kurum_id")
    .notNull()
    .references(() => kurum.id),
  kisiId: uuid("kisi_id")
    .notNull()
    .references(() => kisi.id),
  ad: text("ad").notNull(),
  onek: text("onek").notNull().unique(),
  ozet: text("ozet").notNull(),
  kapsam: text("kapsam").array().notNull(),
  bitis: zaman("bitis").notNull(),
  iptal: zaman("iptal"),
  sonKullanim: zaman("son_kullanim"),
  olusturma: olusturma(),
});

/** Şüpheli giriş tespiti için kaba ağ ve cihaz izi (IP adresi değil, özeti). */
export const kimlikGirisIzi = pgTable(
  "kimlik_giris_izi",
  {
    id: kimlik(),
    kullaniciId: text("kullanici_id")
      .notNull()
      .references(() => kimlikKullanici.id, { onDelete: "cascade" }),
    ag: text("ag"),
    cihaz: text("cihaz").notNull(),
    ayrinti: jsonb("ayrinti").notNull().default({}),
    zaman: zamanZorunlu("zaman"),
  },
  (t) => [index("kimlik_giris_izi_kullanici").on(t.kullaniciId)],
);
