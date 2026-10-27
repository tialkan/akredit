// YÖK Atlas program istatistikleri (tercih kılavuzu JSON API'si).
// Yapı 2026-10-27'de canlı sayfadan doğrulandı (kurum: EBYÜ): eski HTML parça yolu
// (`/content/lisans-dynamic/1000_1.php`) kaldırılmış, 418 döndürüyor. Uygulama artık
// `POST /api/tercih-kilavuz/search` ile Spring sayfası (content, totalElements, totalPages, yil) alıyor.
// Kayıt: docs/baglayicilar/canli-dogrulama-2026-10-27/yokatlas-arama-ebyu-hukuk.json
//
// Doluluk: yanıtta "yerleşen" alanı YOK (yalnız kontenjan ve son yerleşenin puanı/sırası var).
// Doluluk oranı bu yüzden hesaplanmaz, null kalır; tahmin edilmez.
// `kosulList` (uzun koşul metinleri) alınmaz.

import { z } from "zod";
import { BaglayiciHatasi, istek, type KullanimKosulu, sinirlayici } from "../avesis/istek.ts";
import type { DisBaglam, Kaynak } from "../baglayici.ts";

export const YOKATLAS_KOSULU: KullanimKosulu = {
  kaynak: "YÖK Atlas (Yükseköğretim Kurulu)",
  durum: "DOĞRULANMADI",
  not: "Yapı 2026-10-27'de canlı sayfadan doğrulandı (kurum: EBYÜ). Herkese açık program istatistikleri okunur; toplu indirme yapılmaz. Sitenin kullanım koşulları ve otomatik erişim izni DOĞRULANMADI; kurum yöneticisi onaylamadan açılmamalı.",
  enAzAralikMs: 2000,
};

export const YOKATLAS_TABAN = "https://yokatlas.yok.gov.tr";
export const ARAMA_ADRESI = `${YOKATLAS_TABAN}/api/tercih-kilavuz/search`;

export const DOLULUK_NOTU =
  "YÖK Atlas tercih kılavuzu yanıtında yerleşen sayısı bulunmuyor; doluluk oranı hesaplanamaz.";

/** Sayı ya da sayı metni ("393.72695") → number; boşsa null. */
const sayiAlani = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v.trim());
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Sayı bekleniyor." });
      return z.NEVER;
    }
    return n;
  });

/** API kaydının kullandığımız alanları. Bilinmeyen alanlar yok sayılır (kosulList dahil). */
export const KilavuzKaydiSemasi = z.object({
  kilavuzKodu: z.union([z.number().int(), z.string().regex(/^\d{9}$/)]),
  yil: z.number().int(),
  universiteAdi: z.string().nullish(),
  birimAdi: z.string().nullish(),
  fymkAdi: z.string().nullish(),
  puanTuru: z.string().nullish(),
  ogrenimSuresi: sayiAlani,
  kontenjan: sayiAlani,
  kontenjanObs: sayiAlani,
  minPuan: sayiAlani,
  basariSirasi: sayiAlani,
  gk1: sayiAlani,
  minPuan1: sayiAlani,
  basariSirasi1: sayiAlani,
  gk2: sayiAlani,
  minPuan2: sayiAlani,
  basariSirasi2: sayiAlani,
  gk3: sayiAlani,
  minPuan3: sayiAlani,
  basariSirasi3: sayiAlani,
  prof: sayiAlani,
  doc: sayiAlani,
  dou: sayiAlani,
  arGor: sayiAlani,
  uniAkreditasyon: z.string().nullish(),
});

export const AramaYanitiSemasi = z.object({
  content: z.array(KilavuzKaydiSemasi),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative().optional(),
  yil: z.number().int().optional(),
});

const OncekiYilSemasi = z.object({
  yil: z.number().int(),
  kontenjan: z.number().nullable(),
  tabanPuan: z.number().nullable(),
  basariSirasi: z.number().nullable(),
});

export const ProgramIstatistigiSemasi = z.object({
  programKodu: z.string().regex(/^\d{9}$/),
  yil: z.number().int(),
  programAdi: z.string().nullable(),
  puanTuru: z.string().nullable(),
  ogrenimSuresi: z.number().nullable(),
  kontenjan: z.number().int().nonnegative().nullable(),
  kontenjanObs: z.number().int().nonnegative().nullable(),
  tabanPuan: z.number().nullable(),
  basariSirasi: z.number().int().nullable(),
  /** gk1..3 / minPuan1..3 / basariSirasi1..3: yil-1, yil-2, yil-3. */
  oncekiYillar: z.array(OncekiYilSemasi),
  akademikKadro: z.object({
    prof: z.number().nullable(),
    doc: z.number().nullable(),
    drOgrUyesi: z.number().nullable(),
    arGor: z.number().nullable(),
  }),
  /** Kaynaktaki `uniAkreditasyon` alanı (üniversite düzeyi; program akreditasyonu değildir). */
  akreditasyon: z.string().nullable(),
  /** Her zaman null: yanıtta yerleşen sayısı yok (bkz. DOLULUK_NOTU). */
  doluluk: z.null(),
});
export type ProgramIstatistigi = z.infer<typeof ProgramIstatistigiSemasi>;

/** Tek bir API kaydını program istatistiğine çevirir. */
export function kayittanIstatistik(ham: unknown): ProgramIstatistigi {
  const k = KilavuzKaydiSemasi.parse(ham);
  const kod = String(k.kilavuzKodu).padStart(9, "0");
  const onceki = ([1, 2, 3] as const)
    .map((i) => ({
      yil: k.yil - i,
      kontenjan: k[`gk${i}`],
      tabanPuan: k[`minPuan${i}`],
      basariSirasi: k[`basariSirasi${i}`],
    }))
    .filter((o) => o.kontenjan !== null || o.tabanPuan !== null || o.basariSirasi !== null);
  return ProgramIstatistigiSemasi.parse({
    programKodu: kod,
    yil: k.yil,
    programAdi: k.birimAdi ?? null,
    puanTuru: k.puanTuru?.trim() || null,
    ogrenimSuresi: k.ogrenimSuresi,
    kontenjan: k.kontenjan,
    kontenjanObs: k.kontenjanObs,
    tabanPuan: k.minPuan,
    basariSirasi: k.basariSirasi,
    oncekiYillar: onceki,
    akademikKadro: { prof: k.prof, doc: k.doc, drOgrUyesi: k.dou, arGor: k.arGor },
    akreditasyon: k.uniAkreditasyon?.trim() || null,
    doluluk: null,
  });
}

/** Arama yanıtını doğrular ve kayıtları çevirir. */
export function aramaYanitiCoz(ham: unknown): { programlar: ProgramIstatistigi[]; toplam: number } {
  const r = AramaYanitiSemasi.safeParse(ham);
  if (!r.success)
    throw new BaglayiciHatasi(
      "YÖK Atlas yanıtı beklenen biçimde değil; kaynak değişmiş olabilir. Daha sonra yeniden deneyin.",
    );
  return { programlar: r.data.content.map(kayittanIstatistik), toplam: r.data.totalElements };
}

export interface AramaFiltresi {
  kilavuzKodu?: string;
  universiteId?: number[];
}

/** Arama isteğinin gövdesi. */
export function aramaGovdesi(filtre: AramaFiltresi, page = 0, size = 100) {
  return { filters: filtre, page, size, sortBy: "basariSirasi", direction: "ASC" as const };
}

async function ara(
  baglam: DisBaglam,
  sinir: ReturnType<typeof sinirlayici>,
  filtre: AramaFiltresi,
): Promise<ReturnType<typeof aramaYanitiCoz>> {
  const y = await istek(baglam, sinir, ARAMA_ADRESI, {
    yontem: "POST",
    basliklar: { "Content-Type": "application/json", Accept: "application/json" },
    govde: JSON.stringify(aramaGovdesi(filtre)),
  });
  let json: unknown;
  try {
    json = await y.json();
  } catch {
    throw new BaglayiciHatasi("YÖK Atlas yanıtı okunamadı; kaynak değişmiş olabilir.");
  }
  return aramaYanitiCoz(json);
}

/** Programların istatistiklerini sırayla, en az 2 sn aralıkla okur (program başına bir arama). */
export async function programIstatistikleriniOku(
  kodlar: string[],
  baglam: DisBaglam,
  secenek: { aralikMs?: number } = {},
): Promise<{
  programlar: ProgramIstatistigi[];
  kaynaklar: Kaynak[];
  hatalar: { programKodu: string; ileti: string }[];
}> {
  const sinir = sinirlayici(baglam, Math.max(secenek.aralikMs ?? 0, YOKATLAS_KOSULU.enAzAralikMs));
  const programlar: ProgramIstatistigi[] = [];
  const kaynaklar: Kaynak[] = [];
  const hatalar: { programKodu: string; ileti: string }[] = [];
  for (const kod of kodlar) {
    if (!/^\d{9}$/.test(kod)) {
      hatalar.push({ programKodu: kod, ileti: "Program kodu 9 haneli olmalı." });
      continue;
    }
    try {
      const r = await ara(baglam, sinir, { kilavuzKodu: kod });
      const p = r.programlar.find((x) => x.programKodu === kod);
      if (!p) {
        hatalar.push({ programKodu: kod, ileti: "Bu kodla program bulunamadı. Kodu denetleyin." });
        continue;
      }
      programlar.push(p);
      kaynaklar.push({
        adres: ARAMA_ADRESI,
        okunma: baglam.simdi().toISOString(),
        aciklama: `YÖK Atlas tercih kılavuzu, program ${kod}`,
      });
    } catch (e) {
      hatalar.push({ programKodu: kod, ileti: e instanceof BaglayiciHatasi ? e.message : "Okunamadı." });
    }
  }
  return { programlar, kaynaklar, hatalar };
}
