// Rapor, süreç, eylem, toplantı, anket, gösterge (docs/mimari.md §3.6). `rapor_bolumu_surumu` yalnız eklenir.

import { boolean, integer, jsonb, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { cerceve, olcut } from "./cerceve.ts";
import { donem, kisi, kurumIdSutunu } from "./kurum.ts";
import { kimlik, olusturma, pukoAsamasi, raporTuru, zaman } from "./ortak.ts";

export const rapor = pgTable("rapor", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  tur: raporTuru("tur").notNull(),
  cerceveId: uuid("cerceve_id").references(() => cerceve.id),
  /** `{tur, id}` */
  kapsam: jsonb("kapsam").notNull(),
  donemId: uuid("donem_id").references(() => donem.id),
  baslik: text("baslik"),
  olusturma: olusturma(),
});

export const raporBolumuSurumu = pgTable("rapor_bolumu_surumu", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  raporId: uuid("rapor_id")
    .notNull()
    .references(() => rapor.id),
  olcutId: uuid("olcut_id").references(() => olcut.id),
  bolumKodu: text("bolum_kodu"),
  /** Atıflı Markdown. */
  metin: text("metin").notNull(),
  atiflar: jsonb("atiflar").notNull().default([]),
  denetimSonucu: jsonb("denetim_sonucu"),
  /** Bu sürümü üreten öneri (varsa). */
  oneriId: uuid("oneri_id"),
  oncekiSurumId: uuid("onceki_surum_id"),
  olusturma: olusturma(),
});

export const surecTanimi = pgTable("surec_tanimi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kod: text("kod").notNull(),
  ad: text("ad").notNull(),
  tanim: jsonb("tanim").notNull().default({}),
  surum: integer("surum").notNull().default(1),
  olusturma: olusturma(),
});

export const surecOrnegi = pgTable("surec_ornegi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  surecTanimiId: uuid("surec_tanimi_id")
    .notNull()
    .references(() => surecTanimi.id),
  kapsam: jsonb("kapsam").notNull().default({}),
  durum: text("durum").notNull().default("acik"),
  olusturma: olusturma(),
});

export const gorev = pgTable("gorev", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  surecOrnegiId: uuid("surec_ornegi_id").references(() => surecOrnegi.id),
  baslik: text("baslik").notNull(),
  atananKisiId: uuid("atanan_kisi_id").references(() => kisi.id),
  durum: text("durum").notNull().default("acik"),
  ayrinti: jsonb("ayrinti").notNull().default({}),
  olusturma: olusturma(),
});

export const sonTarih = pgTable("son_tarih", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  gorevId: uuid("gorev_id").references(() => gorev.id),
  ad: text("ad").notNull(),
  tarih: zaman("tarih").notNull(),
  olusturma: olusturma(),
});

export const bildirim = pgTable("bildirim", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kisiId: uuid("kisi_id")
    .notNull()
    .references(() => kisi.id),
  tur: text("tur").notNull(),
  icerik: jsonb("icerik").notNull().default({}),
  okundu: zaman("okundu"),
  olusturma: olusturma(),
});

export const eylem = pgTable("eylem", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  /** `{tur: bulgu|rapor|toplanti_karari|dis_degerlendirme, id}` */
  kaynak: jsonb("kaynak").notNull(),
  tanim: text("tanim").notNull(),
  sorumluKisiId: uuid("sorumlu_kisi_id").references(() => kisi.id),
  hedefTarih: zaman("hedef_tarih"),
  pukoAsamasi: pukoAsamasi("puko_asamasi").notNull().default("planla"),
  kanitIdleri: uuid("kanit_idleri").array().notNull().default([]),
  olusturma: olusturma(),
});

export const toplanti = pgTable("toplanti", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  baslik: text("baslik").notNull(),
  zaman: zaman("zaman").notNull(),
  katilimciKisiIdleri: uuid("katilimci_kisi_idleri").array().notNull().default([]),
  gundem: jsonb("gundem").notNull().default([]),
  tutanakKanitId: uuid("tutanak_kanit_id"),
  olusturma: olusturma(),
});

export const anket = pgTable("anket", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  baslik: text("baslik").notNull(),
  kapsam: jsonb("kapsam").notNull().default({}),
  baslangic: zaman("baslangic"),
  bitis: zaman("bitis"),
  olusturma: olusturma(),
});

export const anketSorusu = pgTable("anket_sorusu", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  anketId: uuid("anket_id")
    .notNull()
    .references(() => anket.id),
  sira: integer("sira").notNull(),
  metin: text("metin").notNull(),
  tur: text("tur").notNull(),
  secenekler: jsonb("secenekler"),
});

/** Anonim yanıt: kişi kimliği tutulmaz. */
export const anketYaniti = pgTable("anket_yaniti", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  anketId: uuid("anket_id")
    .notNull()
    .references(() => anket.id),
  yanitlar: jsonb("yanitlar").notNull(),
  olusturma: olusturma(),
});

/** Tekrar yanıt engeli (İP-17, 0007): yalnız belirteç özeti ve bayrak; kişi ve yanıtla bağı yoktur. */
export const anketBelirteci = pgTable("anket_belirteci", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  anketId: uuid("anket_id")
    .notNull()
    .references(() => anket.id),
  ozet: text("ozet").notNull(),
  kaynak: text("kaynak").notNull(),
  kullanildi: boolean("kullanildi").notNull().default(false),
});

export const gosterge = pgTable("gosterge", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  kod: text("kod").notNull(),
  ad: text("ad").notNull(),
  birim: text("birim"),
  hesapTanimi: jsonb("hesap_tanimi").notNull().default({}),
  olusturma: olusturma(),
});

export const gostergeOlcumu = pgTable("gosterge_olcumu", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  gostergeId: uuid("gosterge_id")
    .notNull()
    .references(() => gosterge.id),
  donemId: uuid("donem_id").references(() => donem.id),
  deger: numeric("deger"),
  kaynak: jsonb("kaynak").notNull().default({}),
  olusturma: olusturma(),
});
