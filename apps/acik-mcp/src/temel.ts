// Araçların ortak yapı taşları: araç tanımı, hata türü, kaynak biçimi ve her yanıttaki not.
// Ayrı dosyadadır, çünkü hem ölçüt araçları (araclar.ts) hem Bologna araçları (bologna.ts) kullanır.

import type { z } from "zod";
import type { KisiselVeriKapsami } from "./kisisel-veri.ts";

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
  /** Bu adımda hocaya bir şey sorulmalı mı; verilmezse aracın varsayılanı (o da yoksa false). */
  hocayaSimdiSor?: boolean;
}

export interface AracBaglami {
  simdi: () => Date;
  /** Dış istek için fetch; testlerde sahtesi verilir. Verilmezse genel fetch kullanılır. */
  fetch?: typeof fetch;
}

export interface AcikArac<S extends z.ZodObject = z.ZodObject> {
  ad: string;
  baslik: string;
  aciklama: string;
  girdi: S;
  /** Yanıtta dönen varsayılan "sonraki adım" önerisi. */
  sonrakiAdim: string;
  /** Yanıttaki hocayaSimdiSor bayrağının varsayılanı: true yalnız hocanın karar verdiği duraklarda. */
  hocayaSimdiSor?: boolean;
  /** Kişisel veri reddinde iletiye eklenecek, bu araca özgü ipucu. */
  kisiselVeriIpucu?: string;
  /**
   * Kişisel veri denetiminden önce, yalnız bellekte çalışan ayıklama. Atılan değerler hiçbir yere yazılmaz;
   * yalnız atılan alanların adları döner. Ayıklamadan sonra kalan girdi yine denetlenir.
   */
  onAyikla?: (girdi: unknown) => { girdi: unknown; atilan: string[]; ileti?: string };
  /**
   * Kişisel veri taramasından önce çalışan red denetimi. İleti dönerse çağrı işlenmeden "kisisel_veri" koduyla
   * reddedilir; değerler hiçbir yere yazılmaz.
   */
  onDenetim?: (girdi: unknown) => string | null;
  /** Kişisel veri denetiminin kapsamı; varsayılan "ogrenci" (bkz. kisisel-veri.ts). */
  kisiselVeriKapsami?: KisiselVeriKapsami;
  /** Araç dış ağa (yalnız izinli hostlara) istek atar mı. */
  disAg?: boolean;
  /** Künye kuralıyla denetlenen alan adları: altındaki yazar adları kişisel veri sayılmaz (e-posta, telefon yine sayılır). */
  kunyeAlanlari?: readonly string[];
  calistir: (girdi: z.infer<S>, b: AracBaglami) => AracSonucu | Promise<AracSonucu>;
}

export const arac = <S extends z.ZodObject>(a: AcikArac<S>): AcikArac<S> => a;

/** Araç girdisi hatası: kullanıcıya gösterilecek Türkçe ileti. */
export class AracHatasi extends Error {}

/**
 * Peşin onay (tam otonom kip): hoca başta bir kez "hepsini yap ve kaydet" der; asistan ara durak olmadan tarar, doldurur,
 * OBS'ye kaydeder, geri okuyup doğrular ve sonda tek rapor verir. Onay hocanın kendi sözleriyle verilir ve kayda
 * geçer (ilke 3); metinde kayıt/yetki sözü yoksa onay sayılmaz. Onaya Gönder yine hocadadır; bilinmeyen resmî bilgi
 * uydurulmaz, EKSİK bırakılıp raporda listelenir (ilke 2).
 */
const PESIN_ONAY = /hepsini|sen hallet|hallet|otonom|sormadan|tam yetki|kaydet|yaz ve kaydet|onaylıyorum|onayliyorum/iu;
/**
 * Olumsuz söz onay değildir: "kaydetme", "kaydetmeden önce sor", "sen halletme", "OBS'ye yazma", "onaylamıyorum",
 * "istemiyorum", "hayır", "değil". Ad-fiil ("kaydetmek") olumsuz sayılmaz; "kaydetmeni" gibi belirsiz biçimler
 * bilerek olumsuz sayılır: kuşkuda onay yoktur, hocaya bir kez sorulur (ilke 3).
 */
const PESIN_ONAY_OLUMSUZ =
  /kaydetme(?!k)|halletme(?!k)|(?<!\p{L})(yazma|yapma)(?!k)|onaylam[ıi]yorum|istem[ie]yorum|(?<!\p{L})istemem|verm[ie]yorum|(?<!\p{L})(hay[ıi]r|de[ğg]il)(?!\p{L})/iu;
export function pesinOnayVar(metin: string | undefined): boolean {
  if (!metin || metin.trim().length < 3) return false;
  // Büyük harfle yazılan Türkçe metin (DEĞİL, HAYIR) için ayrıca Türkçe küçük harfle de bakılır.
  const kucuk = metin.toLocaleLowerCase("tr");
  if (PESIN_ONAY_OLUMSUZ.test(metin) || PESIN_ONAY_OLUMSUZ.test(kucuk)) return false;
  return PESIN_ONAY.test(metin);
}
export const PESIN_ONAY_ACIKLAMASI =
  "Hocanın peşin onayı, kendi sözleriyle olduğu gibi (ör. 'hepsini yap ve kaydet'). Varsa ve kayıt sözü içeriyorsa ara durak olmadan yazılıp kaydedilir; sonda tek rapor verilir. Olumsuz söz ('kaydetme', 'kaydetmeden önce sor') onay sayılmaz. Onaya Gönder hocada kalır.";

export const KOD_KAYNAGI = (yol: string, ad: string): Kaynak => ({ ad, adres: `${DEPO}/tree/main/${yol}` });
