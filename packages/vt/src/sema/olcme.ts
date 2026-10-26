// Çıktılar ve ölçme (docs/mimari.md §3.4). `cikti` ve `olcme_sonucu` yalnız eklenir.
// Öğrenci puanları yalnız takma adla tutulur; `takma_ad` tablosuna yabancı anahtar yoktur.

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { kanit } from "./kanit.ts";
import { dersAcilisi, kurumIdSutunu } from "./kurum.ts";
import { ciktiTuru, kimlik, olcmeAraciTuru, olusturma } from "./ortak.ts";

export const cikti = pgTable(
  "cikti",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    tur: ciktiTuru("tur").notNull(),
    /** Program çıktısında program, ders çıktısında ders kimliği. */
    sahipId: uuid("sahip_id").notNull(),
    kod: text("kod").notNull(),
    metin: text("metin").notNull(),
    surum: integer("surum").notNull().default(1),
    oncekiSurumId: uuid("onceki_surum_id").references((): AnyPgColumn => cikti.id),
    kaynakKanitId: uuid("kaynak_kanit_id").references(() => kanit.id),
    olusturma: olusturma(),
  },
  (t) => [
    unique("cikti_surum_tekil").on(t.sahipId, t.kod, t.surum),
    check("cikti_surum_pozitif", sql`${t.surum} >= 1`),
  ],
);

export const katki = pgTable(
  "katki",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    dersCiktiId: uuid("ders_cikti_id")
      .notNull()
      .references(() => cikti.id),
    programCiktiId: uuid("program_cikti_id")
      .notNull()
      .references(() => cikti.id),
    /** `1`-`5`, `iliskisiz` ya da `yetersiz_kanit`. */
    deger: text("deger").notNull(),
    /** Bu hücreyi doğuran karar (FK göçte). */
    kararId: uuid("karar_id").notNull(),
    olusturma: olusturma(),
  },
  (t) => [check("katki_deger", sql`${t.deger} in ('1','2','3','4','5','iliskisiz','yetersiz_kanit')`)],
);

export const olcmeAraci = pgTable("olcme_araci", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  dersAcilisiId: uuid("ders_acilisi_id")
    .notNull()
    .references(() => dersAcilisi.id),
  tur: olcmeAraciTuru("tur").notNull(),
  ad: text("ad"),
  agirlik: numeric("agirlik", { precision: 6, scale: 3 }).notNull(),
  tarih: date("tarih"),
  olusturma: olusturma(),
});

export const soru = pgTable(
  "soru",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    olcmeAraciId: uuid("olcme_araci_id")
      .notNull()
      .references(() => olcmeAraci.id),
    numara: text("numara").notNull(),
    tamPuan: numeric("tam_puan", { precision: 8, scale: 3 }).notNull(),
    /** `[{ciktiId, agirlik}]` */
    ciktiEslemesi: jsonb("cikti_eslemesi").notNull().default([]),
    olusturma: olusturma(),
  },
  (t) => [unique("soru_numara_tekil").on(t.olcmeAraciId, t.numara)],
);

export const ogrenciPuani = pgTable(
  "ogrenci_puani",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    olcmeAraciId: uuid("olcme_araci_id")
      .notNull()
      .references(() => olcmeAraci.id),
    soruId: uuid("soru_id").references(() => soru.id),
    /** Kurum anahtarıyla HMAC; gerçek numara burada tutulmaz. */
    ogrenciTakmaAd: text("ogrenci_takma_ad").notNull(),
    puan: numeric("puan", { precision: 8, scale: 3 }),
    olusturma: olusturma(),
  },
  (t) => [unique("ogrenci_puani_tekil").on(t.olcmeAraciId, t.soruId, t.ogrenciTakmaAd)],
);

export const olcmeSonucu = pgTable("olcme_sonucu", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  dersAcilisiId: uuid("ders_acilisi_id").references(() => dersAcilisi.id),
  hesapSurumu: text("hesap_surumu").notNull(),
  girdiOzeti: text("girdi_ozeti").notNull(),
  sonuc: jsonb("sonuc").notNull(),
  olusturma: olusturma(),
});
