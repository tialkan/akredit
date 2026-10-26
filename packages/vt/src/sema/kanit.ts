// Kanıt (docs/mimari.md §3.3). `kanit` ve `kanit_parcasi` yalnız eklenir; işleme durumu ayrı tabloda ilerler.
// Gömme parça eklenirken verilir; gömmesiz eklenen parçanın gömmesi yeni parça sürümüyle değil,
// `kanit_isleme` üzerinden yeniden parçalama ile gelir (İP-10).

import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, pgTable, text, unique, uuid, vector } from "drizzle-orm/pg-core";
import { olcut } from "./cerceve.ts";
import { kurumIdSutunu } from "./kurum.ts";
import { kanitIslemeDurumu, kanitKaynakTuru, kimlik, kisiselVeriDurumu, olusturma } from "./ortak.ts";

export const GOMME_BOYUTU = 1024;

export const kanit = pgTable(
  "kanit",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    ozet: text("ozet").notNull(),
    dosyaAdi: text("dosya_adi").notNull(),
    mime: text("mime").notNull(),
    boyut: bigint("boyut", { mode: "number" }).notNull(),
    depoAnahtari: text("depo_anahtari").notNull(),
    kaynakTuru: kanitKaynakTuru("kaynak_turu").notNull(),
    kaynakAyrinti: jsonb("kaynak_ayrinti").notNull().default({}),
    belgeTarihi: text("belge_tarihi"),
    /** `[{tur, id}]` biçiminde kapsamlar (birim, program, ders, dönem). */
    kapsamlar: jsonb("kapsamlar").notNull().default([]),
    yukleyenKisiId: uuid("yukleyen_kisi_id"),
    kisiselVeri: kisiselVeriDurumu("kisisel_veri").notNull().default("bilinmiyor"),
    olusturma: olusturma(),
  },
  (t) => [
    unique("kanit_kurum_ozet_tekil").on(t.kurumId, t.ozet),
    check("kanit_ozet_bicimi", sql`${t.ozet} ~ '^[0-9a-f]{64}$'`),
  ],
);

export const kanitIsleme = pgTable("kanit_isleme", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kanitId: uuid("kanit_id")
    .notNull()
    .references(() => kanit.id),
  durum: kanitIslemeDurumu("durum").notNull(),
  ayrinti: jsonb("ayrinti").notNull().default({}),
  olusturma: olusturma(),
});

export const kanitParcasi = pgTable(
  "kanit_parcasi",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    kanitId: uuid("kanit_id")
      .notNull()
      .references(() => kanit.id),
    sira: integer("sira").notNull(),
    capa: jsonb("capa").notNull(),
    metin: text("metin").notNull(),
    gomme: vector("gomme", { dimensions: GOMME_BOYUTU }),
    dil: text("dil"),
    olusturma: olusturma(),
  },
  (t) => [unique("kanit_parcasi_sira_tekil").on(t.kanitId, t.sira), index("kanit_parcasi_kanit_idx").on(t.kanitId)],
);

export const kanitOlcutBaglantisi = pgTable("kanit_olcut_baglantisi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kanitId: uuid("kanit_id")
    .notNull()
    .references(() => kanit.id),
  parcaId: uuid("parca_id").references(() => kanitParcasi.id),
  olcutId: uuid("olcut_id")
    .notNull()
    .references(() => olcut.id),
  /** Bağı doğuran onaylı karar (karar tablosu oneri.ts içinde; döngüsel içe aktarmayı önlemek için FK göçte). */
  kararId: uuid("karar_id").notNull(),
  olusturma: olusturma(),
});
