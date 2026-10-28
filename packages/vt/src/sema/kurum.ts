// Kurum yapısı: kurum, birim, program, ders, dönem, ders açılışı, kişi, rol ataması (docs/mimari.md §3.1).

import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { birimTuru, kapsamTuru, kimlik, olusturma, programDuzeyi, rol, zaman } from "./ortak.ts";

export const kurum = pgTable("kurum", {
  id: kimlik(),
  ad: text("ad").notNull(),
  kisaAd: text("kisa_ad"),
  alanAdi: text("alan_adi").unique(),
  /** YZ sağlayıcısı, yurt dışı YZ izni, AKTS saat aralığı, eşikler. */
  ayarlar: jsonb("ayarlar").notNull().default({}),
  /** Sentetik demo kurumu (İP-41, 0050). Yalnız `demo_kurumu_ac()` true verir; sonradan değiştirilemez. */
  demo: boolean("demo").notNull().default(false),
  olusturma: olusturma(),
});

/** Kiracı sütunu: her kiracı tablosunda bulunur, satır güvenliği buna göre süzer. */
export const kurumIdSutunu = () =>
  uuid("kurum_id")
    .notNull()
    .references(() => kurum.id);

export const birim = pgTable("birim", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  ustBirimId: uuid("ust_birim_id").references((): AnyPgColumn => birim.id),
  tur: birimTuru("tur").notNull(),
  ad: text("ad").notNull(),
  kod: text("kod"),
  olusturma: olusturma(),
});

export const program = pgTable("program", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  birimId: uuid("birim_id")
    .notNull()
    .references(() => birim.id),
  ad: text("ad").notNull(),
  duzey: programDuzeyi("duzey").notNull(),
  dil: text("dil").notNull().default("tr"),
  ogretimTuru: text("ogretim_turu"),
  bolognaAdresi: text("bologna_adresi"),
  yokAtlasKodu: text("yok_atlas_kodu"),
  olusturma: olusturma(),
});

export const ders = pgTable(
  "ders",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    programId: uuid("program_id")
      .notNull()
      .references(() => program.id),
    kod: text("kod").notNull(),
    ad: text("ad").notNull(),
    akts: integer("akts").notNull(),
    teorik: smallint("teorik").notNull().default(0),
    uygulama: smallint("uygulama").notNull().default(0),
    laboratuvar: smallint("laboratuvar").notNull().default(0),
    yariyil: smallint("yariyil").notNull(),
    zorunlu: boolean("zorunlu").notNull().default(true),
    dil: text("dil").notNull().default("tr"),
    olusturma: olusturma(),
  },
  (t) => [unique("ders_program_kod_tekil").on(t.programId, t.kod)],
);

export const donem = pgTable("donem", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  ad: text("ad").notNull(),
  baslangic: date("baslangic").notNull(),
  bitis: date("bitis").notNull(),
  olusturma: olusturma(),
});

export const kisi = pgTable("kisi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  adSoyad: text("ad_soyad").notNull(),
  unvan: text("unvan"),
  eposta: text("eposta"),
  avesisAdresi: text("avesis_adresi"),
  /** Better Auth kullanıcı kimliği (İP-09). */
  oturumKullaniciId: text("oturum_kullanici_id"),
  olusturma: olusturma(),
});

export const dersAcilisi = pgTable("ders_acilisi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  dersId: uuid("ders_id")
    .notNull()
    .references(() => ders.id),
  donemId: uuid("donem_id")
    .notNull()
    .references(() => donem.id),
  sorumluKisiIdleri: uuid("sorumlu_kisi_idleri").array().notNull().default([]),
  sube: text("sube"),
  olusturma: olusturma(),
});

export const rolAtamasi = pgTable("rol_atamasi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kisiId: uuid("kisi_id")
    .notNull()
    .references(() => kisi.id),
  rol: rol("rol").notNull(),
  kapsamTuru: kapsamTuru("kapsam_turu").notNull(),
  kapsamId: uuid("kapsam_id").notNull(),
  baslangic: zaman("baslangic").notNull().defaultNow(),
  bitis: zaman("bitis"),
  olusturma: olusturma(),
});
