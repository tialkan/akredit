// Akreditasyon çerçeveleri (docs/mimari.md §3.2). Bu tablolar kurumlar arasında ortaktır, kurum_id
// taşımaz; uygulama rolü yalnız okuyabilir, yazma göçlerle ya da sahip rolüyle yapılır (İP-11).

import { type AnyPgColumn, boolean, integer, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { kimlik, olusturma, zaman } from "./ortak.ts";

export const cerceve = pgTable("cerceve", {
  id: kimlik(),
  kod: text("kod").notNull().unique(),
  ad: text("ad").notNull(),
  surum: text("surum").notNull(),
  kaynakAdresi: text("kaynak_adresi"),
  kaynakOzeti: text("kaynak_ozeti"),
  kaynakTarihi: zaman("kaynak_tarihi"),
  dogrulandi: boolean("dogrulandi").notNull().default(false),
  dogrulayan: text("dogrulayan"),
  olusturma: olusturma(),
});

export const olcut = pgTable(
  "olcut",
  {
    id: kimlik(),
    cerceveId: uuid("cerceve_id")
      .notNull()
      .references(() => cerceve.id),
    ustOlcutId: uuid("ust_olcut_id").references((): AnyPgColumn => olcut.id),
    kod: text("kod").notNull(),
    baslik: text("baslik").notNull(),
    resmiAciklama: text("resmi_aciklama"),
    sira: integer("sira").notNull(),
    olusturma: olusturma(),
  },
  (t) => [unique("olcut_cerceve_kod_tekil").on(t.cerceveId, t.kod)],
);

export const olgunlukDuzeyi = pgTable(
  "olgunluk_duzeyi",
  {
    id: kimlik(),
    olcutId: uuid("olcut_id")
      .notNull()
      .references(() => olcut.id),
    duzey: smallint("duzey").notNull(),
    tanim: text("tanim").notNull(),
  },
  (t) => [unique("olgunluk_olcut_duzey_tekil").on(t.olcutId, t.duzey)],
);

export const kanitGereksinimi = pgTable("kanit_gereksinimi", {
  id: kimlik(),
  olcutId: uuid("olcut_id")
    .notNull()
    .references(() => olcut.id),
  duzey: smallint("duzey"),
  beklenenKanitTuru: text("beklenen_kanit_turu").notNull(),
  otomatikKaynak: text("otomatik_kaynak"),
});
