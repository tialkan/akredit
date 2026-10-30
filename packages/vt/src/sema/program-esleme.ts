// Program tablo eşlemeleri (İP-47, 0130 göçü). Yalnız eklenir: aynı anahtarın son kararı geçerlidir.
// Öneri (YZ ya da kişi) tabloya girmez; karar, karar veren kişi ve dayanakla yazılır.

import { bigint, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kisi, kurumIdSutunu, program } from "./kurum.ts";
import { kimlik, olusturma, zaman } from "./ortak.ts";

export const programEsleme = pgTable("program_esleme", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  /** Ekleme sırası; aynı anahtarda en büyük sıralı karar geçerlidir. */
  sira: bigint("sira", { mode: "number" }).generatedByDefaultAsIdentity(),
  programId: uuid("program_id")
    .notNull()
    .references(() => program.id),
  /** Seçmeli yer sayısında boş; öteki türlerde çerçeve kodu. */
  cerceveKod: text("cerceve_kod"),
  /** "ders_kategorisi" | "pc_kurul" | "secmeli_yer" */
  tur: text("tur").notNull(),
  /** Ders kodu, program çıktısı kodu ya da yarıyıl. */
  anahtar: text("anahtar").notNull(),
  /** Kategori kodu (metin), kurul çıktısı kodları (dizi) ya da yer sayısı (tam sayı). */
  deger: jsonb("deger").notNull(),
  /** "oneri" | "karar" */
  durum: text("durum").notNull(),
  /** "yz" | "kisi" */
  uretici: text("uretici").notNull(),
  kararVerenKisiId: uuid("karar_veren_kisi_id").references(() => kisi.id),
  dayanak: text("dayanak"),
  zaman: zaman("zaman").notNull(),
  olusturma: olusturma(),
});
