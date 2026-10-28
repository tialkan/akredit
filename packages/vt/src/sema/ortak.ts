// Ortak sütun yardımcıları ve sayılabilir türler (PostgreSQL enum).
// Sütun adları snake_case Türkçe ASCII, TypeScript alanları camelCase.

import { randomBytes } from "node:crypto";
import { uuidv7 } from "@akredit/cekirdek";
import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

/** Uygulama tarafında UUID v7 üretir (zamana göre sıralı). */
export function yeniKimlik(): string {
  return uuidv7(Date.now(), randomBytes(10));
}

/** Birincil anahtar: uygulamada UUID v7, SQL ile doğrudan eklemede gen_random_uuid(). */
export const kimlik = () => uuid("id").primaryKey().defaultRandom().$defaultFn(yeniKimlik);

/** Oluşturma zamanı (timestamptz). */
export const olusturma = () => timestamp("olusturma", { withTimezone: true }).notNull().defaultNow();

export const zaman = (ad: string) => timestamp(ad, { withTimezone: true });

export const birimTuru = pgEnum("birim_turu", [
  "fakulte",
  "myo",
  "enstitu",
  "yuksekokul",
  "bolum",
  "anabilim_dali",
  "idari",
]);
export const programDuzeyi = pgEnum("program_duzeyi", ["onlisans", "lisans", "yuksek_lisans", "doktora"]);
export const kapsamTuru = pgEnum("kapsam_turu", ["kurum", "birim", "program", "ders"]);
export const rol = pgEnum("rol", [
  "kurum_yoneticisi",
  "kalite_komisyonu_baskani",
  "kalite_komisyonu_uyesi",
  "birim_kalite_sorumlusu",
  "program_sorumlusu",
  "ogretim_elemani",
  "degerlendirici",
  "gozlemci",
]);
export const kanitKaynakTuru = pgEnum("kanit_kaynak_turu", ["yukleme", "baglayici", "eposta", "uretilen"]);
export const kisiselVeriDurumu = pgEnum("kisisel_veri_durumu", ["yok", "maskeli", "var", "bilinmiyor"]);
export const kanitIslemeDurumu = pgEnum("kanit_isleme_durumu", [
  "bekliyor",
  "metin_cikarildi",
  "ocr_gerekli",
  "gomme_tamam",
  "hata",
]);
export const ciktiTuru = pgEnum("cikti_turu", ["pea", "program", "ders", "tyyc"]);
export const olcmeAraciTuru = pgEnum("olcme_araci_turu", [
  "ara_sinav",
  "yariyil_sonu",
  "odev",
  "proje",
  "kisa_sinav",
  "uygulama",
  "butunleme",
  "diger",
]);
export const riskDuzeyi = pgEnum("risk_duzeyi", ["dusuk", "orta", "yuksek"]);
export const oneriTuru = pgEnum("oneri_turu", [
  "kanit_etiketi",
  "toplanti_tutanagi",
  "anket_ozeti",
  "matris_katkisi",
  "soru_cikti_eslemesi",
  "bologna_taslagi",
  "rapor_bolumu",
  "eylem",
  "olgunluk_duzeyi",
  "yazma_plani",
  "dis_gonderim",
  "dis_ornek",
  "bologna_devri",
]);
export const ureticiTuru = pgEnum("uretici_turu", ["yz", "kural", "kisi"]);
export const kararSonucu = pgEnum("karar_sonucu", ["onaylandi", "duzeltildi", "reddedildi"]);
export const kararDayanagi = pgEnum("karar_dayanagi", ["dogrudan", "politika", "sure_dolumu"]);
export const raporTuru = pgEnum("rapor_turu", [
  "kidr",
  "bidr",
  "odr",
  "ders_dosyasi",
  "olcme_raporu",
  "anket_raporu",
  "eylem_plani",
  "ziyaret_paketi",
]);
export const pukoAsamasi = pgEnum("puko_asamasi", ["planla", "uygula", "kontrol_et", "onlem_al"]);
export const aktorTuru = pgEnum("aktor_turu", ["kisi", "sistem", "yz"]);
