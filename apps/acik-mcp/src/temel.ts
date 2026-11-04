// Araçların ortak yapı taşları: araç tanımı, hata türü, kaynak biçimi ve her yanıttaki not.
// Ayrı dosyadadır, çünkü hem ölçüt araçları (araclar.ts) hem Bologna araçları (bologna.ts) kullanır.

import type { z } from "zod";

export const DEPO = "https://github.com/tialkan/akredit";

/** Her yanıtta yer alan not. */
export const AKREDIT_NOTU =
  "Akredit bağımsız, açık kaynak bir araçtır; YÖKAK ile bağı yoktur. Sonuçlar resmî değerlendirme yerine geçmez; beyan ve karar kurumdadır.";

export interface Kaynak {
  ad: string;
  adres: string;
  sayfa?: number | null;
  sha256?: string | null;
  erisimTarihi?: string;
}

export interface AracSonucu {
  sonuc: unknown;
  kaynak: Kaynak[];
  /** Asistana bir sonraki adım önerisi; verilmezse aracın varsayılanı kullanılır. */
  sonrakiAdim?: string;
}

export interface AracBaglami {
  simdi: () => Date;
}

export interface AcikArac<S extends z.ZodObject = z.ZodObject> {
  ad: string;
  baslik: string;
  aciklama: string;
  girdi: S;
  /** Yanıtta dönen varsayılan "sonraki adım" önerisi. */
  sonrakiAdim: string;
  /** Kişisel veri reddinde iletiye eklenecek, bu araca özgü ipucu. */
  kisiselVeriIpucu?: string;
  /**
   * Kişisel veri denetiminden önce, yalnız bellekte çalışan ayıklama. Atılan değerler hiçbir yere yazılmaz;
   * yalnız atılan alanların adları döner. Ayıklamadan sonra kalan girdi yine denetlenir.
   */
  onAyikla?: (girdi: unknown) => { girdi: unknown; atilan: string[] };
  calistir: (girdi: z.infer<S>, b: AracBaglami) => AracSonucu;
}

export const arac = <S extends z.ZodObject>(a: AcikArac<S>): AcikArac<S> => a;

/** Araç girdisi hatası: kullanıcıya gösterilecek Türkçe ileti. */
export class AracHatasi extends Error {}

export const KOD_KAYNAGI = (yol: string, ad: string): Kaynak => ({ ad, adres: `${DEPO}/tree/main/${yol}` });
