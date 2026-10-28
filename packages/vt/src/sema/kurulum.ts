// İP-35: self-servis kurum açılışı ve birim/program düzeltme kaydı (göç 0009).

import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kisi, kurum, kurumIdSutunu } from "./kurum.ts";
import { kimlik, olusturma, zaman } from "./ortak.ts";

/** Kurum açılış başvurusu. Kiracı tablosu değildir (kurum henüz yok); yalnız belirteç özeti saklanır. */
export const kurumAcilisTalebi = pgTable("kurum_acilis_talebi", {
  id: kimlik(),
  kurumAdi: text("kurum_adi").notNull(),
  alanAdi: text("alan_adi").notNull(),
  yoneticiAdi: text("yonetici_adi").notNull(),
  eposta: text("eposta").notNull(),
  belirtecOzeti: text("belirtec_ozeti").notNull().unique(),
  /** Tuzlu ağ izi (hız sınırı). IP adresi saklanmaz. */
  agIzi: text("ag_izi"),
  sonGecerlilik: zaman("son_gecerlilik").notNull(),
  dogrulama: zaman("dogrulama"),
  acilanKurumId: uuid("acilan_kurum_id").references(() => kurum.id),
  olusturma: olusturma(),
});

/** Birim ve program düzeltmeleri: eski ve yeni değer yeni kayıt olarak eklenir (yalnız ekleme). */
export const kayitDuzeltmesi = pgTable("kayit_duzeltmesi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  hedefTuru: text("hedef_turu").notNull(),
  hedefId: uuid("hedef_id").notNull(),
  onceki: jsonb("onceki").notNull(),
  yeni: jsonb("yeni").notNull(),
  duzeltenKisiId: uuid("duzelten_kisi_id")
    .notNull()
    .references(() => kisi.id),
  olusturma: olusturma(),
});
