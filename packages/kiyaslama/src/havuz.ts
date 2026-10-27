// Kiracılar arası izinli, anonim, toplulaştırılmış kıyaslama. Saf mantık; IO yok.
import { z } from "zod";

/** Yeniden tanımlamaya karşı varsayılan en az grup büyüklüğü (isteyen kurum hariç). */
export const EN_AZ_GRUP = 5;

/** Kurumun kıyaslama havuzuna katılım izni. Kişi alanı yalnız izni veren yetkilinin kimliğidir. */
export const KiyaslamaIzniSemasi = z
  .object({
    kurumId: z.string().min(1),
    /** İzin verilen gösterge kodları; "*" bütün göstergeler. */
    gostergeler: z.array(z.string().min(1)).min(1),
    verenKisiId: z.string().min(1),
    verildi: z.string().datetime(),
    bitis: z.string().datetime().nullable(),
    geriAlindi: z.string().datetime().nullable(),
  })
  .strict();
export type KiyaslamaIzni = z.infer<typeof KiyaslamaIzniSemasi>;

/** Bir kurumun bir göstergedeki dönem değeri. Yalnız kurum düzeyi toplam; kişi alanı kabul edilmez. */
export const KatkiSemasi = z
  .object({
    kurumId: z.string().min(1),
    gostergeKodu: z.string().min(1),
    donem: z.string().min(1),
    deger: z.number().finite(),
  })
  .strict();
export type Katki = z.infer<typeof KatkiSemasi>;

export function izinGecerliMi(izin: KiyaslamaIzni, gostergeKodu: string, an: string): boolean {
  const t = Date.parse(an);
  if (Date.parse(izin.verildi) > t) return false;
  if (izin.bitis && Date.parse(izin.bitis) <= t) return false;
  if (izin.geriAlindi && Date.parse(izin.geriAlindi) <= t) return false;
  return izin.gostergeler.includes("*") || izin.gostergeler.includes(gostergeKodu);
}

/** İzinli kurum kimlikleri (aynı kurumun birden çok izninden biri geçerliyse yeter). */
export function izinliKurumlar(izinler: readonly KiyaslamaIzni[], gostergeKodu: string, an: string): Set<string> {
  return new Set(izinler.filter((i) => izinGecerliMi(i, gostergeKodu, an)).map((i) => i.kurumId));
}

export function yuvarla(x: number, basamak = 2): number {
  const k = 10 ** basamak;
  return Math.round(x * k) / k + 0;
}

/** Sıralı dizide doğrusal aradeğerlemeli yüzdelik (R-7). */
export function yuzdelik(sirali: readonly number[], p: number): number {
  const h = (sirali.length - 1) * p;
  const a = Math.floor(h);
  const b = Math.min(a + 1, sirali.length - 1);
  return (sirali[a] as number) + (h - a) * ((sirali[b] as number) - (sirali[a] as number));
}

export type HavuzSonucu =
  | {
      durum: "hazir";
      gostergeKodu: string;
      donem: string;
      /** Gruptaki kurum sayısı (isteyen dahil). Kurum kimliği verilmez. */
      kurumSayisi: number;
      ortalama: number;
      medyan: number;
      ceyrek1: number;
      ceyrek3: number;
      /** İsteyenin kendi değeri ve grubun yüzde kaçının altında kaldığı; isteyen katılmadıysa null. */
      kendi: { deger: number; altindakiOran: number } | null;
    }
  | {
      durum: "yetersiz_grup";
      gostergeKodu: string;
      donem: string;
      ileti: string;
    };

export interface HavuzSecenekleri {
  enAzGrup?: number;
  basamak?: number;
}

/**
 * Bir gösterge ve dönem için izinli kurumların toplulaştırılmış dağılımı.
 * - Yalnız `an` anında geçerli izni olan kurumların değerleri hesaba girer.
 * - İsteyen kurum yalnız kendi izni varsa hesaba girer ve yalnız kendi değerini görür.
 * - İsteyen hariç izinli kurum sayısı `enAzGrup`tan azsa hiçbir sayı verilmez.
 * - En küçük/en büyük değer verilmez (tek kurumu ele verir); çeyrekler ve medyan yuvarlanır.
 * - Aynı kurumdan birden çok katkı çelişki sayılır ve o kurum dışlanır.
 */
export function havuzKiyasla(
  isteyenKurumId: string,
  gostergeKodu: string,
  donem: string,
  katkilar: readonly unknown[],
  izinler: readonly unknown[],
  an: string,
  secenek: HavuzSecenekleri = {},
): HavuzSonucu {
  const enAz = Math.max(secenek.enAzGrup ?? EN_AZ_GRUP, EN_AZ_GRUP);
  const basamak = secenek.basamak ?? 2;
  const izinli = izinliKurumlar(
    izinler.map((i) => KiyaslamaIzniSemasi.parse(i)),
    gostergeKodu,
    an,
  );
  const kurumDegeri = new Map<string, number[]>();
  for (const ham of katkilar) {
    const k = KatkiSemasi.parse(ham);
    if (k.gostergeKodu !== gostergeKodu || k.donem !== donem || !izinli.has(k.kurumId)) continue;
    const liste = kurumDegeri.get(k.kurumId) ?? [];
    liste.push(k.deger);
    kurumDegeri.set(k.kurumId, liste);
  }
  const degerler = new Map<string, number>();
  for (const [kurum, d] of kurumDegeri) if (d.length === 1) degerler.set(kurum, d[0] as number);

  const digerSayisi = [...degerler.keys()].filter((k) => k !== isteyenKurumId).length;
  if (digerSayisi < enAz) {
    return {
      durum: "yetersiz_grup",
      gostergeKodu,
      donem,
      ileti: `Kıyaslama için en az ${enAz} kurumun izinli verisi gerekir. Şimdilik gösterilemiyor.`,
    };
  }
  const sirali = [...degerler.values()].sort((a, b) => a - b);
  const toplam = sirali.reduce((a, b) => a + b, 0);
  const kendiDeger = degerler.get(isteyenKurumId);
  return {
    durum: "hazir",
    gostergeKodu,
    donem,
    kurumSayisi: sirali.length,
    ortalama: yuvarla(toplam / sirali.length, basamak),
    medyan: yuvarla(yuzdelik(sirali, 0.5), basamak),
    ceyrek1: yuvarla(yuzdelik(sirali, 0.25), basamak),
    ceyrek3: yuvarla(yuzdelik(sirali, 0.75), basamak),
    kendi:
      kendiDeger === undefined
        ? null
        : {
            deger: kendiDeger,
            altindakiOran: yuvarla(sirali.filter((d) => d < kendiDeger).length / sirali.length, 2),
          },
  };
}
