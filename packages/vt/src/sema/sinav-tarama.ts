// Toplu sınav kâğıdı taraması (İP-43). Bütün tablolar yalnız eklenir (göç 0070 ve 0120 tetikleyicileri).
//
// - `sinav_sablonu`: soru kutularının yeri; ölçme aracına bağlı. Yeni sürüm yeni satırdır.
// - `sinav_taramasi`: bir yükleme (kanıt) ve onu okuyan yerel model.
// - `sinav_hucresi`: her kâğıdın her hücresi için okuma: değer, güven, durum, nedenler. Öğrenci yalnız takma adla.
// - `sinav_hucre_karari`: onay kuyruğundaki hücreye kişinin kararı (Katman 2, yalnız doğrudan) ya da otomatik
//   okunan hücrenin düzeltmesi.
// - `sinav_tarama_istegi`, `sinav_tarama_istegi_sonucu`, `sinav_ozet_onayi`: göç 0120 (aşağıda).
//
// Öğrenci numarası hiçbir sütuna yazılmaz; görüntü kırpıntısı kanıt deposunda, burada yalnız özeti durur.

import { sql } from "drizzle-orm";
import { check, integer, jsonb, numeric, pgTable, real, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { kanit } from "./kanit.ts";
import { kisi, kurumIdSutunu } from "./kurum.ts";
import { olcmeAraci } from "./olcme.ts";
import { kimlik, olusturma, zaman } from "./ortak.ts";

export const sinavSablonu = pgTable("sinav_sablonu", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  olcmeAraciId: uuid("olcme_araci_id")
    .notNull()
    .references(() => olcmeAraci.id),
  /** Kutular ve kâğıt sınırı kuralı (`@akredit/servis` `Sablon` şeması). */
  sablon: jsonb("sablon").notNull(),
  olusturanKisiId: uuid("olusturan_kisi_id").references(() => kisi.id),
  olusturma: olusturma(),
});

export const sinavTaramasi = pgTable("sinav_taramasi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  olcmeAraciId: uuid("olcme_araci_id")
    .notNull()
    .references(() => olcmeAraci.id),
  sablonId: uuid("sablon_id")
    .notNull()
    .references(() => sinavSablonu.id),
  kanitId: uuid("kanit_id")
    .notNull()
    .references(() => kanit.id),
  /** Okuyan yerel modelin adı ve modeli (yalnız kurum içi). */
  saglayici: text("saglayici").notNull(),
  model: text("model").notNull(),
  esik: real("esik").notNull(),
  kagitSayisi: integer("kagit_sayisi").notNull(),
  baslatanKisiId: uuid("baslatan_kisi_id").references(() => kisi.id),
  olusturma: olusturma(),
});

export const sinavHucresi = pgTable(
  "sinav_hucresi",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    taramaId: uuid("tarama_id")
      .notNull()
      .references(() => sinavTaramasi.id),
    kagitSira: integer("kagit_sira").notNull(),
    /** HMAC takma ad; numara okunamadıysa boş, hücre onaya düşer. */
    ogrenciTakmaAd: text("ogrenci_takma_ad"),
    /** Soru numarası, kâğıttaki toplam için `*toplam`, öğrenci numarası kutusu için `*numara`. */
    alan: text("alan").notNull(),
    deger: numeric("deger", { precision: 8, scale: 3 }),
    guven: real("guven").notNull(),
    durum: text("durum").notNull(),
    katman: smallint("katman").notNull(),
    nedenler: text("nedenler").array().notNull().default([]),
    kirpintiOzeti: text("kirpinti_ozeti"),
    olusturma: olusturma(),
  },
  (t) => [
    unique("sinav_hucresi_tekil").on(t.taramaId, t.kagitSira, t.alan),
    check("sinav_hucresi_durum", sql`${t.durum} in ('otomatik', 'onay_bekliyor')`),
    check("sinav_hucresi_guven", sql`${t.guven} >= 0 and ${t.guven} <= 1`),
  ],
);

export const sinavHucreKarari = pgTable(
  "sinav_hucre_karari",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    hucreId: uuid("hucre_id")
      .notNull()
      .references(() => sinavHucresi.id),
    sonuc: text("sonuc").notNull(),
    deger: numeric("deger", { precision: 8, scale: 3 }),
    /** Numara kutusu kararında kişinin girdiği numaranın takma adı. */
    ogrenciTakmaAd: text("ogrenci_takma_ad"),
    kararVerenKisiId: uuid("karar_veren_kisi_id")
      .notNull()
      .references(() => kisi.id),
    dayanak: text("dayanak").notNull().default("dogrudan"),
    zaman: zaman("zaman").notNull().defaultNow(),
  },
  (t) => [
    unique("sinav_hucre_karari_tekil").on(t.hucreId),
    check("sinav_hucre_karari_sonuc", sql`${t.sonuc} in ('onaylandi', 'duzeltildi')`),
    check("sinav_hucre_karari_dayanak", sql`${t.dayanak} = 'dogrudan'`),
  ],
);

// Göç 0120: panelden yükleme isteği, sonucu ve aktarım öncesi özet onayı. Üçü de yalnız eklenir.

/** Panelden yüklenen tarama dosyası; işçi `kanitAl` ile kanıt olarak alır ve taramayı çalıştırır. */
export const sinavTaramaIstegi = pgTable("sinav_tarama_istegi", {
  id: kimlik(),
  kurumId: kurumIdSutunu(),
  olcmeAraciId: uuid("olcme_araci_id")
    .notNull()
    .references(() => olcmeAraci.id),
  depoAnahtari: text("depo_anahtari").notNull(),
  ozet: text("ozet").notNull(),
  dosyaAdi: text("dosya_adi").notNull(),
  mime: text("mime").notNull(),
  boyut: integer("boyut").notNull(),
  esik: real("esik"),
  isteyenKisiId: uuid("isteyen_kisi_id")
    .notNull()
    .references(() => kisi.id),
  olusturma: olusturma(),
});

/** İsteğin sonucu, istek başına bir kez: `tamam` (tarama) ya da `hata` (Türkçe ileti). */
export const sinavTaramaIstegiSonucu = pgTable(
  "sinav_tarama_istegi_sonucu",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    istekId: uuid("istek_id")
      .notNull()
      .references(() => sinavTaramaIstegi.id),
    durum: text("durum").notNull(),
    kanitId: uuid("kanit_id").references(() => kanit.id),
    taramaId: uuid("tarama_id").references(() => sinavTaramasi.id),
    ileti: text("ileti"),
    olusturma: olusturma(),
  },
  (t) => [unique("sinav_tarama_istegi_sonucu_tekil").on(t.istekId)],
);

/**
 * Otomatik okunan hücrelerin aktarımdan önce kişiye gösterilen özetinin onayı (Katman 1, yalnız doğrudan).
 * `ozet`, onaylanan hücrelerin (kimlik ve değer) SHA-256 özetidir: kişinin gördüğü küme ile aktarılan aynıdır.
 */
export const sinavOzetOnayi = pgTable(
  "sinav_ozet_onayi",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    taramaId: uuid("tarama_id")
      .notNull()
      .references(() => sinavTaramasi.id),
    otomatikSayisi: integer("otomatik_sayisi").notNull(),
    ozet: text("ozet").notNull(),
    katman: smallint("katman").notNull().default(1),
    kural: text("kural").notNull(),
    dayanak: text("dayanak").notNull().default("dogrudan"),
    onaylayanKisiId: uuid("onaylayan_kisi_id")
      .notNull()
      .references(() => kisi.id),
    zaman: zaman("zaman").notNull().defaultNow(),
  },
  (t) => [unique("sinav_ozet_onayi_tekil").on(t.taramaId)],
);
