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

/** Resmî alt ölçütte belgedeki olgunluk düzeyi metni (dereceli değerlendirme anahtarı). */
export const olgunlukTanimiSemasi = z.object({ duzey: z.number().int().min(1).max(5), metin: z.string().min(1) });
export type OlgunlukTanimi = z.infer<typeof olgunlukTanimiSemasi>;

export interface Olcut {
  kod: string;
  baslik: string;
  /** Başlığın kaynağı. "resmi" ise kaynak sayfası ve belge özeti zorunludur (bulgu D2-2). */
  baslikDurumu: MetinDurumu;
  /** Ölçüt metni. `metinDurumu` "dogrulanmadi" ise tam olarak DOGRULANMADI olur. */
  metin: string;
  metinDurumu: MetinDurumu;
  /** Metnin alındığı kaynak belge sayfası (1'den başlar). */
  kaynakSayfa: number | null;
  /** Metnin alındığı belge çerçevenin ana kaynağı değilse onun dosya adı (ekKaynaklar içinde olmalı). */
  kaynakDosya?: string | undefined;
  /** Belgedeki 1–5 olgunluk düzeyi metinleri (yalnız resmî metin). */
  olgunlukTanimlari?: OlgunlukTanimi[] | undefined;
  /** Belgedeki "Örnek Kanıtlar" maddeleri (yalnız resmî metin). */
  ornekKanitlar?: string[] | undefined;
  kanitGereksinimleri: KanitGereksinimi[];
  altOlcutler: Olcut[];
}

export const olcutSemasi: z.ZodType<Olcut> = z.lazy(() =>
  z
    .object({
      kod: z.string().min(1),
      baslik: z.string().min(1),
      baslikDurumu: metinDurumuSemasi,
      metin: z.string().min(1),
      metinDurumu: metinDurumuSemasi,
      kaynakSayfa: z.number().int().positive().nullable(),
      kaynakDosya: z.string().min(1).optional(),
      olgunlukTanimlari: z.array(olgunlukTanimiSemasi).optional(),
      ornekKanitlar: z.array(z.string().min(1)).optional(),
      kanitGereksinimleri: z.array(kanitGereksinimiSemasi),
      altOlcutler: z.array(olcutSemasi),
    })
    .superRefine((o, ctx) => {
      if (o.metinDurumu === "dogrulanmadi" && o.metin !== DOGRULANMADI)
        ctx.addIssue({ code: "custom", message: `${o.kod}: doğrulanmamış ölçütün metni ${DOGRULANMADI} olmalı.` });
      if (o.metinDurumu === "resmi" && o.kaynakSayfa === null)
        ctx.addIssue({ code: "custom", message: `${o.kod}: resmî metnin kaynak sayfası yazılmalı.` });
      if (o.baslikDurumu === "resmi" && o.kaynakSayfa === null)
        ctx.addIssue({ code: "custom", message: `${o.kod}: resmî başlığın kaynak sayfası yazılmalı.` });
      if (o.baslikDurumu === "dogrulanmadi" && o.metinDurumu === "resmi")
        ctx.addIssue({ code: "custom", message: `${o.kod}: başlığı doğrulanmamış ölçütün metni resmî olamaz.` });
      const t = o.olgunlukTanimlari;
      if (t?.length) {
        if (o.metinDurumu !== "resmi")
          ctx.addIssue({ code: "custom", message: `${o.kod}: olgunluk düzeyi metni yalnız resmî ölçütte olur.` });
        if (t.length !== 5 || t.some((d, i) => d.duzey !== i + 1))
          ctx.addIssue({ code: "custom", message: `${o.kod}: olgunluk düzeyleri 1'den 5'e sırayla yazılmalı.` });
      }
      if (o.ornekKanitlar?.length && o.metinDurumu !== "resmi")
        ctx.addIssue({ code: "custom", message: `${o.kod}: örnek kanıtlar yalnız resmî ölçütte olur.` });
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
  /** Başlık resmî belgeden alındıysa "resmi"; o zaman kaynak sayfası zorunludur. Yoksa doğrulanmamış sayılır. */
  baslikDurumu: metinDurumuSemasi.optional(),
  kaynakSayfa: z.number().int().positive().optional(),
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
    /** Ana kaynağın yanında metin alınan öteki resmî belgeler (ölçütte `kaynakDosya` ile anılır). */
    ekKaynaklar: z.array(kaynakBelgeSemasi).default([]),
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
    const belgeler = [...(c.kaynak ? [c.kaynak] : []), ...c.ekKaynaklar];
    const belgeOzeti = (dosya: string | undefined) =>
      dosya === undefined ? c.kaynak?.sha256 : belgeler.find((b) => b.dosya === dosya)?.sha256;
    for (const o of hepsi) {
      if (kodlar.has(o.kod)) sorun(`Ölçüt kodu iki kez geçiyor: ${o.kod}`);
      kodlar.add(o.kod);
      for (const [alan, durum] of [
        ["metin", o.metinDurumu],
        ["başlık", o.baslikDurumu],
      ] as const) {
        if (!c.resmi && durum === "resmi") sorun(`${o.kod}: iç çerçevede resmî ${alan} olamaz.`);
        if (c.resmi && durum === "ic") sorun(`${o.kod}: resmî çerçevede iç ${alan} olamaz.`);
        if (durum === "resmi" && !belgeOzeti(o.kaynakDosya))
          sorun(`${o.kod}: resmî ${alan} için kaynak belgenin SHA-256 özeti kayıtlı olmalı.`);
      }
      if (o.kaynakDosya !== undefined && !belgeler.some((b) => b.dosya === o.kaynakDosya))
        sorun(`${o.kod}: kaynak belge çerçevenin kaynakları arasında yok: ${o.kaynakDosya}`);
    }
    for (const b of c.raporSablonu) {
      if (b.baslikDurumu === "resmi" && (b.kaynakSayfa === undefined || !c.kaynak?.sha256))
        sorun(`Rapor bölümü ${b.kod}: resmî başlık için kaynak sayfası ve belge özeti yazılmalı.`);
      if (!c.resmi && b.baslikDurumu === "resmi") sorun(`Rapor bölümü ${b.kod}: iç çerçevede resmî başlık olamaz.`);
    }
    for (const b of c.raporSablonu)
      for (const k of b.olcutKodlari) if (!kodlar.has(k)) sorun(`Rapor bölümü ${b.kod} bilinmeyen ölçüte bağlı: ${k}`);
    if (c.dogrulandi) {
      if (!c.dogrulayan || !c.dogrulamaZamani) sorun("Doğrulanan çerçevede doğrulayan ve zaman yazılmalı.");
      if (c.resmi && hepsi.some((o) => o.metinDurumu !== "resmi" || o.baslikDurumu !== "resmi"))
        sorun("Doğrulanmamış ölçüt metni ya da başlığı varken çerçeve doğrulandı sayılamaz.");
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
