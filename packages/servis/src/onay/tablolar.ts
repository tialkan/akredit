// Göç 0006 tabloları (İP-13). Şema `@akredit/vt` dışında, yalnız onay modülünün kullandığı yerde tanımlanır;
// tablolar yalnız eklenir (tetikleyici), kiracı yalıtımı satır güvenliğiyle.

import { sema } from "@akredit/vt";
import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

const zaman = (ad: string) => timestamp(ad, { withTimezone: true, mode: "date" });

export const onayBaglantisi = pgTable("onay_baglantisi", {
  id: uuid("id").primaryKey(),
  kurumId: uuid("kurum_id").notNull(),
  oneriId: uuid("oneri_id").notNull(),
  kisiId: uuid("kisi_id").notNull(),
  sonuc: sema.kararSonucu("sonuc").notNull(),
  son: zaman("son").notNull(),
  olusturma: zaman("olusturma").notNull(),
});

export const onayBaglantisiKullanimi = pgTable("onay_baglantisi_kullanimi", {
  id: uuid("id").primaryKey(),
  kurumId: uuid("kurum_id").notNull(),
  kararId: uuid("karar_id").notNull(),
  zaman: zaman("zaman").notNull(),
});
