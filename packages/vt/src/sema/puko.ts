// Kendini kapatan PÜKÖ olayları (İP-39, 0102 göçü). Yalnız eklenir: döngünün durumu olaylardan türetilir.
// Önlem seçimi olayında karar veren kişi ayrı sütundadır; yabancı anahtar ve tetikleyici kişinin aynı kurumda
// olduğunu denetler.

import { bigint, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kisi, kurumIdSutunu } from "./kurum.ts";
import { kimlik, olusturma, zaman } from "./ortak.ts";

export const pukoOlayi = pgTable("puko_olayi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  /** Ekleme sırası (kimlik sütunu); olaylar bu sırayla okunur. */
  sira: bigint("sira", { mode: "number" }).generatedByDefaultAsIdentity(),
  pukoId: text("puko_id").notNull(),
  /** "acildi" | "onlem_secildi" | "kapandi" */
  tur: text("tur").notNull(),
  olay: jsonb("olay").notNull(),
  kararVerenKisiId: uuid("karar_veren_kisi_id").references(() => kisi.id),
  zaman: zaman("zaman").notNull(),
  olusturma: olusturma(),
});
