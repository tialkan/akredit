// Öneri, karar, yetki politikası (docs/mimari.md §3.5). Üçü de yalnız eklenir.
// Kurallar (tekil karar, politika dayanağı, yüksek risk yasağı) hem CHECK hem tetikleyiciyle uygulanır.

import { sql } from "drizzle-orm";
import { check, jsonb, pgTable, real, text, uuid } from "drizzle-orm/pg-core";
import { kisi, kurumIdSutunu } from "./kurum.ts";
import { kararDayanagi, kararSonucu, kimlik, olusturma, oneriTuru, riskDuzeyi, ureticiTuru, zaman } from "./ortak.ts";

export const oneri = pgTable(
  "oneri",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    tur: oneriTuru("tur").notNull(),
    hedefTuru: text("hedef_turu").notNull(),
    hedefId: text("hedef_id").notNull(),
    icerik: jsonb("icerik").notNull(),
    gerekce: text("gerekce").notNull(),
    /** `[{kanitId, parcaId?, capa?, alinti?}]` */
    atiflar: jsonb("atiflar").notNull().default([]),
    guven: real("guven"),
    ureticiTuru: ureticiTuru("uretici_turu").notNull(),
    /** yz: model + istem özeti; kural: kural + sürüm; kişi: kişi kimliği. */
    uretici: jsonb("uretici").notNull(),
    risk: riskDuzeyi("risk").notNull(),
    olusturma: olusturma(),
  },
  (t) => [check("oneri_guven_araligi", sql`${t.guven} is null or (${t.guven} >= 0 and ${t.guven} <= 1)`)],
);

export const yetkiPolitikasi = pgTable(
  "yetki_politikasi",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    ad: text("ad").notNull(),
    oneriTurleri: oneriTuru("oneri_turleri").array().notNull(),
    enYuksekRisk: riskDuzeyi("en_yuksek_risk").notNull(),
    enDusukGuven: real("en_dusuk_guven").notNull(),
    birimIdleri: uuid("birim_idleri").array(),
    programIdleri: uuid("program_idleri").array(),
    imzalayanKisiId: uuid("imzalayan_kisi_id")
      .notNull()
      .references(() => kisi.id),
    baslangic: zaman("baslangic").notNull(),
    bitis: zaman("bitis"),
    /** İptal yeni kayıtla yapılır: iptal eden politika eskisini gösterir. */
    iptalEttigiId: uuid("iptal_ettigi_id"),
    olusturma: olusturma(),
  },
  (t) => [
    check("politika_yuksek_risk_yok", sql`${t.enYuksekRisk} <> 'yuksek'`),
    check("politika_guven_araligi", sql`${t.enDusukGuven} >= 0 and ${t.enDusukGuven} <= 1`),
  ],
);

export const karar = pgTable(
  "karar",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    oneriId: uuid("oneri_id")
      .notNull()
      .unique("karar_oneri_tekil")
      .references(() => oneri.id),
    sonuc: kararSonucu("sonuc").notNull(),
    duzeltme: jsonb("duzeltme"),
    kararVerenKisiId: uuid("karar_veren_kisi_id")
      .notNull()
      .references(() => kisi.id),
    dayanak: kararDayanagi("dayanak").notNull(),
    politikaId: uuid("politika_id").references(() => yetkiPolitikasi.id),
    gerekce: text("gerekce"),
    zaman: zaman("zaman").notNull().defaultNow(),
  },
  (t) => [
    check(
      "karar_politika_dayanagi",
      sql`(${t.dayanak} = 'politika' and ${t.politikaId} is not null) or (${t.dayanak} = 'dogrudan' and ${t.politikaId} is null)`,
    ),
    check("karar_duzeltme", sql`(${t.sonuc} = 'duzeltildi') = (${t.duzeltme} is not null)`),
  ],
);
