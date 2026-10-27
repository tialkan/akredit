// İnsan dakikası ölçümü (İP-13). Kaynak değiştirilemez günlüktür: her `karar.verildi` kaydı aktörü, öneri
// türünü (süreç), yolu (oturum/eposta/politika) ve arayüzün ölçtüğü `sureMs` değerini taşır. Pilot raporu
// (İP-30) bu çıktıyı kullanır: kişi ve süreç bazında toplam/ortanca dakika, karar oranları, yol dağılımı.
// Sayılar yalnız bu deterministik hesaptan gelir (ilke 2).

import { insanDakikasi, type KararSonucu, kararOranlari, ortanca } from "@akredit/cekirdek";
import { sema } from "@akredit/vt";
import { and, eq, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { islem, type ServisBaglami } from "../baglam.ts";

export const OlcumGirdisi = z
  .object({
    baslangic: z.iso.datetime({ offset: true }).optional(),
    bitis: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();

const Dakika = z.object({ kararSayisi: z.number(), olculen: z.number(), toplam: z.number(), ortanca: z.number() });

export const OlcumRaporu = z.object({
  aralik: z.object({ baslangic: z.string().nullable(), bitis: z.string().nullable() }),
  kisiler: z.array(Dakika.extend({ kisiId: z.string(), ad: z.string() })),
  surecler: z.array(Dakika.extend({ oneriTuru: z.string() })),
  yollar: z.record(z.string(), z.number()),
  oranlar: z.object({
    toplam: z.number(),
    onaylandi: z.number(),
    duzeltildi: z.number(),
    reddedildi: z.number(),
    yuzde: z.object({
      onaylandi: z.number().nullable(),
      duzeltildi: z.number().nullable(),
      reddedildi: z.number().nullable(),
    }),
  }),
});
export type OlcumRaporu = z.infer<typeof OlcumRaporu>;

export interface KararOlayi {
  kisiId: string | null;
  oneriTuru: string;
  sonuc: KararSonucu;
  yol: string;
  sureMs: number | null;
}

const yuvarla = (x: number) => Math.round(x * 100) / 100;

/** Saf hesap: günlük olaylarından rapor (kişi adları ayrı verilir). Testte elle doğrulanır. */
export function olcumHesapla(
  olaylar: readonly KararOlayi[],
  adlar: ReadonlyMap<string, string>,
  aralik: OlcumRaporu["aralik"],
): OlcumRaporu {
  // Politika kararları insan dakikası harcamaz: kişi listesine girmez, yol dağılımında görünür.
  const insan = olaylar.filter((o) => o.yol !== "politika" && o.kisiId);
  const kisiOlculen = insanDakikasi(
    insan
      .filter((o) => o.sureMs !== null)
      .map((o) => ({ kisiId: o.kisiId as string, dakika: (o.sureMs as number) / 60_000 })),
  );
  const kisiSayac = new Map<string, number>();
  for (const o of insan) kisiSayac.set(o.kisiId as string, (kisiSayac.get(o.kisiId as string) ?? 0) + 1);
  const kisiler = [...kisiSayac]
    .map(([kisiId, kararSayisi]) => {
      const d = kisiOlculen.find((x) => x.kisiId === kisiId);
      return {
        kisiId,
        ad: adlar.get(kisiId) ?? "Bilinmeyen kişi",
        kararSayisi,
        olculen: d?.kararSayisi ?? 0,
        toplam: yuvarla(d?.toplam ?? 0),
        ortanca: yuvarla(d?.ortanca ?? 0),
      };
    })
    .sort((a, b) => b.toplam - a.toplam || a.ad.localeCompare(b.ad, "tr"));
  const turler = new Map<string, KararOlayi[]>();
  for (const o of insan) turler.set(o.oneriTuru, [...(turler.get(o.oneriTuru) ?? []), o]);
  const surecler = [...turler]
    .map(([oneriTuru, l]) => {
      const d = l.flatMap((o) => (o.sureMs !== null ? [o.sureMs / 60_000] : []));
      return {
        oneriTuru,
        kararSayisi: l.length,
        olculen: d.length,
        toplam: yuvarla(d.reduce((a, b) => a + b, 0)),
        ortanca: yuvarla(ortanca(d)),
      };
    })
    .sort((a, b) => a.oneriTuru.localeCompare(b.oneriTuru));
  const yollar: Record<string, number> = {};
  for (const o of olaylar) yollar[o.yol] = (yollar[o.yol] ?? 0) + 1;
  const or = kararOranlari(olaylar.map((o) => o.sonuc));
  return {
    aralik,
    kisiler,
    surecler,
    yollar,
    oranlar: {
      toplam: or.toplam,
      onaylandi: or.onaylandi,
      duzeltildi: or.duzeltildi,
      reddedildi: or.reddedildi,
      yuzde: or.yuzde,
    },
  };
}

const SONUCLAR = new Set(["onaylandi", "duzeltildi", "reddedildi"]);

/** Kurumun ölçüm raporu; yalnız kurum düzeyinde `gunluk.oku` yetkisiyle. */
export async function insanDakikasiRaporu(b: ServisBaglami, girdi: unknown = {}): Promise<OlcumRaporu> {
  const g = OlcumGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("gunluk.oku", { tur: "kurum", id: b.aktor.kurumId });
    const kosul = [eq(sema.gunluk.eylem, "karar.verildi")];
    if (g.baslangic) kosul.push(gte(sema.gunluk.zaman, new Date(g.baslangic)));
    if (g.bitis) kosul.push(lt(sema.gunluk.zaman, new Date(g.bitis)));
    const satir = await tx
      .select()
      .from(sema.gunluk)
      .where(and(...kosul));
    const olaylar: KararOlayi[] = [];
    for (const s of satir) {
      const a = (s.ayrinti ?? {}) as Record<string, unknown>;
      const sonuc = String(a.sonuc);
      if (!SONUCLAR.has(sonuc)) continue;
      const imzalayan = typeof a.imzalayan === "string" ? a.imzalayan : null;
      olaylar.push({
        kisiId: s.aktorTuru === "kisi" ? s.aktorId : imzalayan,
        oneriTuru: typeof a.oneriTuru === "string" ? a.oneriTuru : "bilinmiyor",
        sonuc: sonuc as KararSonucu,
        yol: typeof a.yol === "string" ? a.yol : a.dayanak === "politika" ? "politika" : "oturum",
        sureMs: typeof a.sureMs === "number" && Number.isFinite(a.sureMs) ? a.sureMs : null,
      });
    }
    const adlar = new Map(
      (await tx.select({ id: sema.kisi.id, ad: sema.kisi.adSoyad }).from(sema.kisi)).map((k) => [k.id, k.ad]),
    );
    return olcumHesapla(olaylar, adlar, { baslangic: g.baslangic ?? null, bitis: g.bitis ?? null });
  });
}
