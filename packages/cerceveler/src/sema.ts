// Çerçeve şeması. Resmî ölçüt metni yalnız resmî belgeden gelir (CLAUDE.md ilke 6).
// Belgeden alınamayan metin `DOGRULANMADI` işaretiyle tutulur; yapılmış gibi yazılmaz.

import { z } from "zod";

/** Resmî belgeden alınamamış metnin yerine konan işaret. */
export const DOGRULANMADI = "DOĞRULANMADI" as const;

const sha256 = z.string().regex(/^[0-9a-f]{64}$/, "SHA-256 özeti 64 küçük onaltılık karakter olmalı.");
const isoTarih = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı.");

/** Çerçevenin dayandığı belge. `sha256` yalnız dosya gerçekten indirildiyse dolar. */
export const kaynakBelgeSemasi = z.object({
  adres: z.url(),
  erisimTarihi: isoTarih,
  sha256: sha256.nullable(),
  /** Depodaki kopya: kaynaklar/resmi/<dosya>. İndirilemediyse null. */
  dosya: z.string().min(1).nullable(),
  not: z.string().optional(),
});
export type KaynakBelge = z.infer<typeof kaynakBelgeSemasi>;

export const KANIT_TURLERI = [
  "belge",
  "tutanak",
  "anket",
  "istatistik",
  "ders_bilgi_paketi",
  "matris",
  "rapor",
  "web_sayfasi",
  "diger",
] as const;

export const kanitGereksinimiSemasi = z.object({
  tur: z.enum(KANIT_TURLERI),
  aciklama: z.string().min(1),
  /** Bu kanıtı otomatik üretebilecek süreç ya da bağlayıcı (ör. "baglayicilar/bologna"). Yoksa null. */
  uretenSurec: z.string().min(1).nullable(),
});
export type KanitGereksinimi = z.infer<typeof kanitGereksinimiSemasi>;

export const metinDurumuSemasi = z.enum(["resmi", "ic", "dogrulanmadi"]);
export type MetinDurumu = z.infer<typeof metinDurumuSemasi>;

export interface Olcut {
  kod: string;
  baslik: string;
  /** Ölçüt metni. `metinDurumu` "dogrulanmadi" ise tam olarak DOGRULANMADI olur. */
  metin: string;
  metinDurumu: MetinDurumu;
  /** Metnin alındığı kaynak belge sayfası (1'den başlar). */
  kaynakSayfa: number | null;
  kanitGereksinimleri: KanitGereksinimi[];
  altOlcutler: Olcut[];
}

export const olcutSemasi: z.ZodType<Olcut> = z.lazy(() =>
  z
    .object({
      kod: z.string().min(1),
      baslik: z.string().min(1),
      metin: z.string().min(1),
      metinDurumu: metinDurumuSemasi,
      kaynakSayfa: z.number().int().positive().nullable(),
      kanitGereksinimleri: z.array(kanitGereksinimiSemasi),
      altOlcutler: z.array(olcutSemasi),
    })
    .superRefine((o, ctx) => {
      if (o.metinDurumu === "dogrulanmadi" && o.metin !== DOGRULANMADI)
        ctx.addIssue({ code: "custom", message: `${o.kod}: doğrulanmamış ölçütün metni ${DOGRULANMADI} olmalı.` });
      if (o.metinDurumu === "resmi" && o.kaynakSayfa === null)
        ctx.addIssue({ code: "custom", message: `${o.kod}: resmî metnin kaynak sayfası yazılmalı.` });
    }),
);

export const olgunlukDuzeyiSemasi = z.object({
  duzey: z.number().int().min(1).max(5),
  ad: z.string().min(1),
  aciklama: z.string().min(1),
});
export type OlgunlukDuzeyi = z.infer<typeof olgunlukDuzeyiSemasi>;

export const raporBolumuSemasi = z.object({
  kod: z.string().min(1),
  baslik: z.string().min(1),
  /** Bölümde ele alınan ölçüt kodları. */
  olcutKodlari: z.array(z.string().min(1)),
});
export type RaporBolumu = z.infer<typeof raporBolumuSemasi>;

export const cerceveSemasi = z
  .object({
    kod: z.string().regex(/^[a-z0-9-]+$/, "Çerçeve kodu küçük harf, rakam ve tire içerir."),
    ad: z.string().min(1),
    surum: z.string().min(1),
    /** false: Akredit iç çerçevesi, resmî bir kuruluşun ölçütü değildir. */
    resmi: z.boolean(),
    kaynak: kaynakBelgeSemasi.nullable(),
    yayimTarihi: isoTarih.nullable(),
    dogrulandi: z.boolean(),
    dogrulayan: z.string().min(1).nullable(),
    dogrulamaZamani: z.string().min(1).nullable(),
    olgunlukDuzeyleri: z.array(olgunlukDuzeyiSemasi),
    olcutler: z.array(olcutSemasi),
    raporSablonu: z.array(raporBolumuSemasi),
  })
  .superRefine((c, ctx) => {
    const sorun = (message: string) => ctx.addIssue({ code: "custom", message });
    if (c.resmi && c.kaynak === null) sorun("Resmî çerçevenin kaynak belgesi yazılmalı.");
    const hepsi = tumOlcutler(c.olcutler);
    const kodlar = new Set<string>();
    for (const o of hepsi) {
      if (kodlar.has(o.kod)) sorun(`Ölçüt kodu iki kez geçiyor: ${o.kod}`);
      kodlar.add(o.kod);
      if (!c.resmi && o.metinDurumu === "resmi") sorun(`${o.kod}: iç çerçevede resmî metin olamaz.`);
      if (c.resmi && o.metinDurumu === "ic") sorun(`${o.kod}: resmî çerçevede iç metin olamaz.`);
      if (o.metinDurumu === "resmi" && !c.kaynak?.sha256)
        sorun(`${o.kod}: resmî metin için kaynak belgenin SHA-256 özeti kayıtlı olmalı.`);
    }
    for (const b of c.raporSablonu)
      for (const k of b.olcutKodlari) if (!kodlar.has(k)) sorun(`Rapor bölümü ${b.kod} bilinmeyen ölçüte bağlı: ${k}`);
    if (c.dogrulandi) {
      if (!c.dogrulayan || !c.dogrulamaZamani) sorun("Doğrulanan çerçevede doğrulayan ve zaman yazılmalı.");
      if (c.resmi && hepsi.some((o) => o.metinDurumu !== "resmi"))
        sorun("Doğrulanmamış ölçüt metni varken çerçeve doğrulandı sayılamaz.");
      if (c.resmi && hepsi.length === 0) sorun("Ölçütü olmayan çerçeve doğrulanamaz.");
    }
  });
export type Cerceve = z.infer<typeof cerceveSemasi>;

/** Ağaçtaki bütün ölçütler, derinlik öncelikli sırayla. */
export function tumOlcutler(olcutler: readonly Olcut[]): Olcut[] {
  const sonuc: Olcut[] = [];
  const gez = (liste: readonly Olcut[]) => {
    for (const o of liste) {
      sonuc.push(o);
      gez(o.altOlcutler);
    }
  };
  gez(olcutler);
  return sonuc;
}

export type DogrulamaRozeti = "dogrulandi" | "uzman_dogrulamasi_bekliyor" | "ic_cerceve";

/** Arayüzde gösterilecek rozet ve metni. */
export function dogrulamaRozeti(c: Pick<Cerceve, "resmi" | "dogrulandi">): { rozet: DogrulamaRozeti; metin: string } {
  if (!c.resmi) return { rozet: "ic_cerceve", metin: "Akredit iç çerçevesi (resmî değil)" };
  if (c.dogrulandi) return { rozet: "dogrulandi", metin: "Uzman tarafından doğrulandı" };
  return { rozet: "uzman_dogrulamasi_bekliyor", metin: "Uzman doğrulaması bekliyor" };
}
