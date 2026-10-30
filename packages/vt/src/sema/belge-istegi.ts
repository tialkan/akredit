// Hesapsız belge isteme (İP-45, göç 0080). Üç tablo da yalnız eklenir ve kurum yalıtımlıdır.
// Bağlantı belirteci açık hâlde saklanmaz: `belirtecOzet` SHA-256 özetidir.

import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { kanitGereksinimi } from "./cerceve.ts";
import { kanit } from "./kanit.ts";
import { kisi, kurumIdSutunu } from "./kurum.ts";
import { oneri } from "./oneri.ts";

const an = (ad: string) => timestamp(ad, { withTimezone: true, mode: "date" });

export const belgeIstegi = pgTable(
  "belge_istegi",
  {
    id: uuid("id").primaryKey(),
    kurumId: kurumIdSutunu(),
    gereksinimId: uuid("gereksinim_id").references(() => kanitGereksinimi.id),
    istenen: text("istenen").notNull(),
    aliciEposta: text("alici_eposta"),
    birimAdi: text("birim_adi"),
    isteyenKisiId: uuid("isteyen_kisi_id")
      .notNull()
      .references(() => kisi.id),
    belirtecOzet: text("belirtec_ozet").notNull().unique(),
    son: an("son").notNull(),
    olusturma: an("olusturma").notNull(),
  },
  (t) => [check("belge_istegi_ozet_bicimi", sql`${t.belirtecOzet} ~ '^[0-9a-f]{64}$'`)],
);

export const belgeIstegiGonderimi = pgTable("belge_istegi_gonderimi", {
  id: uuid("id").primaryKey().defaultRandom(),
  kurumId: kurumIdSutunu(),
  istekId: uuid("istek_id")
    .notNull()
    .references(() => belgeIstegi.id),
  /** `ilk` ya da `hatirlatma`. */
  tur: text("tur").notNull(),
  /** `gonderildi` ya da `gonderilmedi`. */
  durum: text("durum").notNull(),
  neden: text("neden"),
  zaman: an("zaman").notNull(),
});

export const belgeIstegiYuklemesi = pgTable("belge_istegi_yuklemesi", {
  /** İstek kimliği (tek kullanım). */
  id: uuid("id")
    .primaryKey()
    .references(() => belgeIstegi.id),
  kurumId: kurumIdSutunu(),
  kanitId: uuid("kanit_id")
    .notNull()
    .references(() => kanit.id),
  oneriId: uuid("oneri_id")
    .notNull()
    .references(() => oneri.id),
  aciklama: text("aciklama"),
  agIzi: text("ag_izi"),
  zaman: an("zaman").notNull(),
});
