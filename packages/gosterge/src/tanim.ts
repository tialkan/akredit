// Gösterge tanımı ve kaynak izi şemaları. Dışarıdan (kurum ayarı, vt `hesap_tanimi`) gelen tanım zod ile doğrulanır.

import { z } from "zod";

/** Hesap yöntemi. Hepsi deterministiktir; model hiçbir aşamada sayı üretmez. */
export const hesapYontemiSemasi = z.discriminatedUnion("tur", [
  /** Tek veri noktasının değeri (ör. YÖK Atlas doluluk). */
  z.object({ tur: z.literal("deger"), anahtar: z.string().min(1) }),
  /** Anahtarların toplamı. */
  z.object({ tur: z.literal("toplam"), anahtarlar: z.array(z.string().min(1)).min(1) }),
  /** Anahtarların aritmetik ortalaması. */
  z.object({ tur: z.literal("ortalama"), anahtarlar: z.array(z.string().min(1)).min(1) }),
  /** pay / payda × carpan (yüzde için 100). */
  z.object({
    tur: z.literal("oran"),
    pay: z.string().min(1),
    payda: z.string().min(1),
    carpan: z.number().positive().default(1),
  }),
]);
export type HesapYontemi = z.infer<typeof hesapYontemiSemasi>;

export const kaynakTuruSemasi = z.enum(["baglayici", "anket", "olcme", "elle"]);
export type KaynakTuru = z.infer<typeof kaynakTuruSemasi>;

export const hedefSemasi = z.object({ donem: z.string().min(1), deger: z.number().finite() });

export const gostergeTanimiSemasi = z.object({
  kod: z.string().min(1),
  ad: z.string().min(1),
  /** Ölçü birimi metni, ör. "%", "adet". */
  birim: z.string().default(""),
  plan: z.enum(["stratejik_plan", "faaliyet_raporu"]),
  /** Stratejik plandaki amaç/hedef kodu, ör. "A1.H2". */
  planHedefi: z.string().optional(),
  yontem: hesapYontemiSemasi,
  /** İzin verilen kaynak türleri; başka türden veri hesaba girmez. */
  kaynaklar: z.array(kaynakTuruSemasi).min(1),
  donemTuru: z.enum(["yil", "donem"]),
  /** Artan: büyük değer iyi; azalan: küçük değer iyi. */
  yon: z.enum(["artan", "azalan"]),
  hedefler: z.array(hedefSemasi).default([]),
  /** Hedefe göre bağıl tolerans (0,05 = %5). Bunun içindeki eksik "uyarı", ötesi "sapma". */
  tolerans: z.number().min(0).max(1).default(0.05),
});
export type GostergeTanimi = z.infer<typeof gostergeTanimiSemasi>;

/** Bir veri noktasının nereden geldiği. Her tür izlenebilir bir yere işaret eder. */
export const kaynakIziSemasi = z.discriminatedUnion("tur", [
  z.object({
    tur: z.literal("baglayici"),
    baglayici: z.string().min(1),
    adres: z.string().min(1),
    okunma: z.string().min(1),
    kanitId: z.string().min(1).optional(),
  }),
  z.object({ tur: z.literal("anket"), anketId: z.string().min(1), soru: z.string().min(1) }),
  z.object({ tur: z.literal("olcme"), sonucId: z.string().min(1) }),
  /** Elle giriş kanıtsız kabul edilmez (ilke 1). */
  z.object({
    tur: z.literal("elle"),
    kisiId: z.string().min(1),
    kanitId: z.string().min(1),
    zaman: z.string().min(1),
  }),
]);
export type KaynakIzi = z.infer<typeof kaynakIziSemasi>;

export const veriNoktasiSemasi = z.object({
  anahtar: z.string().min(1),
  donem: z.string().min(1),
  deger: z.number().finite(),
  kaynak: kaynakIziSemasi,
});
export type VeriNoktasi = z.infer<typeof veriNoktasiSemasi>;

export function gostergeTanimiOku(veri: unknown): GostergeTanimi {
  return gostergeTanimiSemasi.parse(veri);
}

export function veriNoktasiOku(veri: unknown): VeriNoktasi {
  return veriNoktasiSemasi.parse(veri);
}

/** Yöntemin ihtiyaç duyduğu veri anahtarları. */
export function gerekenAnahtarlar(y: HesapYontemi): string[] {
  switch (y.tur) {
    case "deger":
      return [y.anahtar];
    case "oran":
      return [y.pay, y.payda];
    default:
      return [...y.anahtarlar];
  }
}
