// Değiştirilemez günlük (docs/mimari.md §3.7) ve öğrenci takma ad eşlemesi.

import { bigint, customType, jsonb, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { kurumIdSutunu } from "./kurum.ts";
import { aktorTuru, kimlik, olusturma, zaman } from "./ortak.ts";

/**
 * Kurum başına özet zinciri. `kanonik`, kaydın `@akredit/cekirdek` `kanonikJson` ile üretilmiş metnidir;
 * tetikleyici `sira`, `onceki_ozet` ve `ozet = sha256(coalesce(onceki_ozet,'') || kanonik)` alanlarını doldurur
 * ve öteki sütunların kanonik metinle uyuştuğunu denetler.
 */
export const gunluk = pgTable(
  "gunluk",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    sira: bigint("sira", { mode: "number" }).notNull().default(0),
    zaman: zaman("zaman").notNull(),
    aktorTuru: aktorTuru("aktor_turu").notNull(),
    aktorId: text("aktor_id"),
    eylem: text("eylem").notNull(),
    hedefTuru: text("hedef_turu"),
    hedefId: text("hedef_id"),
    ayrinti: jsonb("ayrinti").notNull().default({}),
    kanonik: text("kanonik").notNull(),
    oncekiOzet: text("onceki_ozet"),
    ozet: text("ozet").notNull().default(""),
  },
  (t) => [unique("gunluk_sira_tekil").on(t.kurumId, t.sira)],
);

const bytea = customType<{ data: Uint8Array; driverData: Uint8Array }>({ dataType: () => "bytea" });

/**
 * Gerçek öğrenci numarası → takma ad. Numara uygulamada şifrelenir (bytea), bu tablo KVKK gereği
 * silinebilir; değişmez tablolar buna yabancı anahtarla bağlanmaz.
 */
export const takmaAd = pgTable(
  "takma_ad",
  {
    id: kimlik(),
    kurumId: kurumIdSutunu(),
    takmaAd: text("takma_ad").notNull(),
    numaraSifreli: bytea("numara_sifreli").notNull(),
    anahtarSurumu: text("anahtar_surumu").notNull(),
    /** Kişiye özgü anahtar (İP-40); anahtar silinince eşleme de silinir. */
    kisiAnahtariId: uuid("kisi_anahtari_id"),
    olusturma: olusturma(),
  },
  (t) => [unique("takma_ad_tekil").on(t.kurumId, t.takmaAd)],
);
