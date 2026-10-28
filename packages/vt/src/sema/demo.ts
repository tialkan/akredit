// Demo nesli (İP-41, 0050 göçü). Kiracı tablosu değildir: yalnız kimlik/oturum katmanı erişir. Satır yalnız
// `demo_kurumu_ac()` işleviyle eklenir; işaretli kurumun içi her zaman `kiraciIslemi` ile yazılır ve okunur.

import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { kurum } from "./kurum.ts";
import { olusturma, zaman } from "./ortak.ts";

export const demoNesli = pgTable("demo_nesli", {
  id: uuid("id").primaryKey().defaultRandom(),
  demoKurumId: uuid("demo_kurum_id")
    .notNull()
    .unique()
    .references(() => kurum.id),
  tohum: integer("tohum").notNull(),
  veriSurumu: text("veri_surumu").notNull(),
  /** Yükleme bittiğinde dolar; yalnız hazır nesil etkin olabilir. */
  hazir: zaman("hazir"),
  olusturma: olusturma(),
});
