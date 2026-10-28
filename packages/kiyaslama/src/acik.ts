// Herkese açık verilerle kıyas: YÖK Atlas program istatistikleri ve kamuya açık KİDR'ler.
// Her açık kayıt kaynak adresi, okunma zamanı ve (KİDR için) belge özetiyle gelir; kaynaksız kayıt reddedilir.
import { z } from "zod";
import { yuvarla, yuzdelik } from "./havuz.ts";

export const AcikKaynakSemasi = z
  .object({
    adres: z.string().url(),
    okunma: z.string().datetime(),
    /** Belgenin SHA-256 özeti (KİDR PDF'i); web tablosu için isteğe bağlı. */
    ozet: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
  })
  .strict();
export type AcikKaynak = z.infer<typeof AcikKaynakSemasi>;

/**
 * `@akredit/baglayicilar` YÖK Atlas `ProgramIstatistigi` çıktısının kıyas için gereken alt kümesi.
 * YÖK Atlas tercih kılavuzu yanıtı artık yerleşen sayısını vermiyor: `yerlesen` gelmeyebilir ve `doluluk`
 * null olur. Eksik alan "veri yok" sayılır; kontenjandan ya da başka bir alandan tahmin edilmez.
 * Bağlayıcının ek alanları (program adı, akademik kadro) yok sayılır.
 */
export const AtlasKaydiSemasi = z.object({
  programKodu: z.string().regex(/^\d{9}$/),
  yil: z.number().int().nullable(),
  kontenjan: z.number().int().nonnegative().nullable(),
  yerlesen: z.number().int().nonnegative().nullable().optional().default(null),
  tabanPuan: z.number().nullable(),
  basariSirasi: z.number().int().nullable(),
  doluluk: z.number().min(0).nullable(),
  kaynak: AcikKaynakSemasi,
});
export type AtlasKaydi = z.infer<typeof AtlasKaydiSemasi>;

export const ATLAS_ALANLARI = ["doluluk", "tabanPuan", "basariSirasi", "kontenjan", "yerlesen"] as const;
export type AtlasAlani = (typeof ATLAS_ALANLARI)[number];

/** Kamuya açık KİDR'den, bir kişinin kaynağı göstererek girdiği olgunluk düzeyi. */
export const AcikKidrKaydiSemasi = z
  .object({
    /** Kurumun açık adı kaynak belgedeki gibidir; doğrulanmamış ad yazılmaz. */
    kurumAdi: z.string().min(1),
    yil: z.number().int(),
    olcutKod: z.string().min(1),
    duzey: z.number().int().min(1).max(5),
    sayfa: z.number().int().positive(),
    kaynak: AcikKaynakSemasi.extend({
      ozet: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  })
  .strict();
export type AcikKidrKaydi = z.infer<typeof AcikKidrKaydiSemasi>;

export type AcikKiyas =
  | {
      durum: "hazir";
      alan: string;
      kendi: number;
      karsilastirmaSayisi: number;
      medyan: number;
      ceyrek1: number;
      ceyrek3: number;
      /** Kendi değerinden küçük değerlerin oranı. */
      altindakiOran: number;
      kaynaklar: AcikKaynak[];
    }
  | { durum: "EKSIK"; alan: string; neden: string }
  /** Kaynak bu alanı hiç yayımlamıyor (ör. YÖK Atlas yerleşen sayısı). Değer uydurulmaz. */
  | { durum: "veri_yok"; alan: string; neden: string };

/** YÖK Atlas'ın artık yayımlamadığı alanlar. */
export const ATLAS_VERI_YOK_ALANLARI: readonly AtlasAlani[] = ["doluluk", "yerlesen"];
export const ATLAS_VERI_YOK_NEDENI =
  "Veri yok: YÖK Atlas artık yerleşen sayısını yayımlamıyor, doluluk oranı hesaplanamaz.";

function dagilim(alan: string, kendi: number | null, digerler: { deger: number; kaynak: AcikKaynak }[]): AcikKiyas {
  if (kendi === null) return { durum: "EKSIK", alan, neden: "Kendi değeriniz yok." };
  if (digerler.length === 0) return { durum: "EKSIK", alan, neden: "Karşılaştırılacak açık veri yok." };
  const sirali = digerler.map((d) => d.deger).sort((a, b) => a - b);
  return {
    durum: "hazir",
    alan,
    kendi,
    karsilastirmaSayisi: sirali.length,
    medyan: yuvarla(yuzdelik(sirali, 0.5), 4),
    ceyrek1: yuvarla(yuzdelik(sirali, 0.25), 4),
    ceyrek3: yuvarla(yuzdelik(sirali, 0.75), 4),
    altindakiOran: yuvarla(sirali.filter((d) => d < kendi).length / sirali.length, 2),
    kaynaklar: digerler.map((d) => d.kaynak).sort((a, b) => a.adres.localeCompare(b.adres)),
  };
}

/** Kendi programının YÖK Atlas değerlerini aynı yılın benzer programlarıyla kıyaslar. */
export function atlasKiyasla(kendiHam: unknown, benzerHam: readonly unknown[], alan: AtlasAlani): AcikKiyas {
  const kendi = AtlasKaydiSemasi.parse(kendiHam);
  const benzer = benzerHam
    .map((b) => AtlasKaydiSemasi.parse(b))
    .filter((b) => b.programKodu !== kendi.programKodu && b.yil === kendi.yil);
  const digerler: { deger: number; kaynak: AcikKaynak }[] = [];
  const gorulen = new Set<string>();
  for (const b of benzer) {
    const d = b[alan];
    if (d === null || gorulen.has(b.programKodu)) continue;
    gorulen.add(b.programKodu);
    digerler.push({ deger: d, kaynak: b.kaynak });
  }
  if (kendi[alan] === null && digerler.length === 0 && ATLAS_VERI_YOK_ALANLARI.includes(alan))
    return { durum: "veri_yok", alan, neden: ATLAS_VERI_YOK_NEDENI };
  return dagilim(alan, kendi[alan], digerler);
}

/** `@akredit/servis` kidr.olgunlukDurumu çıktısının alt kümesi; yalnız komisyon kararı kesin düzeydir. */
export interface KendiOlgunluk {
  olcutKod: string;
  karar: "bekliyor" | "onaylandi" | "duzeltildi" | "reddedildi";
  kesinDuzey: number | null;
}

/** Kurumun kesin olgunluk düzeylerini kamuya açık KİDR kayıtlarıyla ölçüt ölçüt kıyaslar. */
export function kidrKiyasla(
  kendiDurum: readonly KendiOlgunluk[],
  acikHam: readonly unknown[],
  yil: number,
): AcikKiyas[] {
  const acik = acikHam.map((a) => AcikKidrKaydiSemasi.parse(a)).filter((a) => a.yil === yil);
  const kodlar = [...new Set(kendiDurum.map((k) => k.olcutKod))].sort();
  return kodlar.map((kod) => {
    const k = kendiDurum.find(
      (d) => d.olcutKod === kod && (d.karar === "onaylandi" || d.karar === "duzeltildi") && d.kesinDuzey !== null,
    );
    const gorulen = new Set<string>();
    const digerler: { deger: number; kaynak: AcikKaynak }[] = [];
    for (const a of acik) {
      if (a.olcutKod !== kod || gorulen.has(a.kurumAdi)) continue;
      gorulen.add(a.kurumAdi);
      digerler.push({ deger: a.duzey, kaynak: a.kaynak });
    }
    if (!k) return { durum: "EKSIK", alan: kod, neden: "Bu ölçüt için komisyonun kesin düzeyi yok." } as const;
    return dagilim(kod, k.kesinDuzey, digerler);
  });
}
