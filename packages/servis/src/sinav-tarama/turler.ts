// Sınav taraması türleri (İP-43). Dışarıdan gelen her şey (şablon, model çıktısı) zod ile doğrulanır.

import { z } from "zod";

/** Kâğıt içindeki bir kutu. Konum sayfaya göre oransaldır (0-1), böylece tarama çözünürlüğünden bağımsızdır. */
export const KutuYeri = z
  .object({
    /** Kâğıdın kaçıncı sayfası (1'den başlar). */
    sayfa: z.number().int().min(1).max(20),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    genislik: z.number().gt(0).max(1),
    yukseklik: z.number().gt(0).max(1),
  })
  .strict()
  .refine((k) => k.x + k.genislik <= 1.0001 && k.y + k.yukseklik <= 1.0001, {
    message: "Kutu sayfanın dışına taşıyor.",
  });
export type KutuYeri = z.infer<typeof KutuYeri>;

/** Kâğıt sınırı: her kâğıt sabit sayıda sayfa ya da her kâğıt kapak işaretli bir sayfayla başlar. */
export const KagitSiniri = z.discriminatedUnion("tur", [
  z.object({ tur: z.literal("sayfa"), sayfaSayisi: z.number().int().min(1).max(20) }).strict(),
  z.object({ tur: z.literal("kapak"), isaret: z.string().trim().min(3).max(80) }).strict(),
]);
export type KagitSiniri = z.infer<typeof KagitSiniri>;

export const Sablon = z
  .object({
    sinir: KagitSiniri,
    numara: KutuYeri,
    /** Öğrenci numarasının hane sayısı; verilirse başka uzunluktaki okuma onaya düşer. */
    numaraUzunlugu: z.number().int().min(4).max(14).optional(),
    /** Kâğıttaki toplam puan kutusu (varsa okunur ve soru puanlarıyla karşılaştırılır). */
    toplam: KutuYeri.optional(),
    sorular: z
      .array(z.object({ soruNo: z.string().trim().min(1).max(10), kutu: KutuYeri }).strict())
      .min(1)
      .max(100),
  })
  .strict()
  .refine((s) => new Set(s.sorular.map((q) => q.soruNo)).size === s.sorular.length, {
    message: "Aynı soru numarası iki kez işaretlenmiş.",
  });
export type Sablon = z.infer<typeof Sablon>;

/** Bir kutunun taranmış görüntüsünden çıkan metin ve (varsa) görüntü kırpıntısı. */
export interface BolgeOkumasi {
  metin: string;
  kirpinti?: Uint8Array;
}

/**
 * Taranmış dosyanın sayfaları. Gerçek uygulama (işçide) sayfayı görüntüye çevirip kutuyu kırpar ve kurum içinde
 * metne çevirir; testlerde kayıtlı örnekten okunur. `ad` kutunun şablondaki adıdır (`*numara`, `*toplam`, soru no).
 */
export interface TaramaKaynagi {
  sayfaSayisi: number;
  sayfaMetni(sira: number): Promise<string>;
  bolge(sira: number, kutu: KutuYeri, ad: string): Promise<BolgeOkumasi>;
}

export const NUMARA_ALANI = "*numara";
export const TOPLAM_ALANI = "*toplam";

export type HucreNedeni =
  | "dusuk_guven"
  | "okunamadi"
  | "azami_asimi"
  | "toplam_tutarsiz"
  | "numara_okunamadi"
  | "metinde_yok";

/** Modelin bir kutu için verdiği yanıt. Model yalnız okur; toplam ya da ortalama üretmez. */
export const ModelOkumasi = z
  .object({
    deger: z.number().finite().nullable(),
    guven: z.number().min(0).max(1),
  })
  .strict();
export type ModelOkumasi = z.infer<typeof ModelOkumasi>;
