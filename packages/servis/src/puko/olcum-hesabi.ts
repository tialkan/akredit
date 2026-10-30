// PÜKÖ ölçümlerinin sunucu hesabı (inceleme dalga 8, bulgu 1). Gövde yalnız hangi ders, dönem ve çıktının
// işleneceğini söyler; değer, eşik ve kaynak kurumun kayıtlı not ve soru verisinden `@akredit/olcme` ile
// hesaplanır. Soru-çıktı eşlemesi soruda kayıtlı eşlemedir (`soru.cikti_eslemesi`); soruda eşleme yoksa ders
// dosyası akışında onaylanmış eşleme kullanılır (inceleme dalga 8, bulgu 12).

import { dersiOlc } from "@akredit/olcme";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { dersCiktilari, esikOku, matrisOku, onayliEslemeSatirlari, soruEslemesi } from "../ders-dosyasi/index.ts";
import { ServisHatasi } from "../hata.ts";
import type { PukoOlcumu } from "./index.ts";

export const PukoOlcumSecimi = z
  .object({
    olcumTuru: z.enum(["ck", "pc"]),
    kod: z.string().min(1).max(50),
    dersKodu: z.string().min(1).max(50),
    donem: z.string().min(1).max(100),
  })
  .strict();
export type PukoOlcumSecimi = z.infer<typeof PukoOlcumSecimi>;

/** Seçilen ders ve dönemler için ölçümleri kayıtlı veriden hesaplar. Kayıtlı olmayan ders ya da dönem 404'tür. */
export async function olcumleriHesapla(tx: Islem, kurumId: string, secimler: PukoOlcumSecimi[]): Promise<PukoOlcumu[]> {
  const gruplar = new Map<string, PukoOlcumSecimi[]>();
  for (const s of secimler) {
    const a = JSON.stringify([s.dersKodu, s.donem]);
    gruplar.set(a, [...(gruplar.get(a) ?? []), s]);
  }
  const esik = await esikOku(tx, kurumId);
  const sonuc: PukoOlcumu[] = [];
  for (const grup of gruplar.values()) {
    const { dersKodu, donem } = grup[0] as PukoOlcumSecimi;
    const dersler = await tx.select().from(sema.ders).where(eq(sema.ders.kod, dersKodu));
    if (dersler.length === 0) throw new ServisHatasi("bulunamadi", `${dersKodu} dersi kayıtlı değil.`);
    if (dersler.length > 1)
      throw new ServisHatasi("kural_ihlali", `${dersKodu} kodu birden çok derste kayıtlı. Ders kodunu tekleştirin.`);
    const ders = dersler[0] as (typeof dersler)[number];
    const [dn] = await tx.select().from(sema.donem).where(eq(sema.donem.ad, donem));
    if (!dn) throw new ServisHatasi("bulunamadi", `${donem} dönemi kayıtlı değil.`);
    const acilislar = await tx
      .select()
      .from(sema.dersAcilisi)
      .where(and(eq(sema.dersAcilisi.dersId, ders.id), eq(sema.dersAcilisi.donemId, dn.id)));
    if (acilislar.length > 1)
      throw new ServisHatasi(
        "kural_ihlali",
        `${dersKodu} dersi ${donem} döneminde birden çok şubeyle açılmış. Şubeler ayrı ölçülür.`,
      );
    const acilis = acilislar[0];
    const ckler = await dersCiktilari(tx, ders.id);
    // Eşleme eski bir çıktı sürümüne bağlı olabilir: bütün sürümlerin kimliği koda çevrilir.
    const butunCk = await tx
      .select({ id: sema.cikti.id, kod: sema.cikti.kod })
      .from(sema.cikti)
      .where(and(eq(sema.cikti.tur, "ders"), eq(sema.cikti.sahipId, ders.id)));
    const ckKod = new Map(butunCk.map((c) => [c.id, c.kod]));
    const araclar = acilis
      ? await tx
          .select()
          .from(sema.olcmeAraci)
          .where(eq(sema.olcmeAraci.dersAcilisiId, acilis.id))
          .orderBy(asc(sema.olcmeAraci.olusturma), asc(sema.olcmeAraci.id))
      : [];
    const ids = araclar.map((a) => a.id);
    const sorular = ids.length ? await tx.select().from(sema.soru).where(inArray(sema.soru.olcmeAraciId, ids)) : [];
    const puanlar = ids.length
      ? await tx.select().from(sema.ogrenciPuani).where(inArray(sema.ogrenciPuani.olcmeAraciId, ids))
      : [];
    const soruNo = new Map(sorular.map((q) => [q.id, q.numara]));
    const onayli = acilis ? await onayliEslemeSatirlari(tx, ders.id, acilis.id) : null;
    const gecerli = new Set(ckler.map((c) => c.kod));
    const s = dersiOlc(
      {
        dersKodu,
        donem,
        ciktilar: ckler.map((c) => ({ kod: c.kod, metin: c.metin })),
        araclar: araclar.map((a) => ({
          id: a.id,
          tur: a.tur,
          ad: a.ad ?? a.tur,
          agirlik: Number(a.agirlik),
          sorular: sorular
            .filter((q) => q.olcmeAraciId === a.id)
            .map((q) => ({
              no: q.numara,
              tamPuan: Number(q.tamPuan),
              eslemeler: soruEslemesi(q, a.ad ?? a.tur, ckKod, onayli, gecerli),
            })),
        })),
        puanlar: puanlar.map((p) => ({
          ogrenci: p.ogrenciTakmaAd,
          aracId: p.olcmeAraciId,
          soruNo: p.soruId ? (soruNo.get(p.soruId) ?? "*") : "*",
          puan: p.puan === null ? null : Number(p.puan),
        })),
      },
      { matris: await matrisOku(tx, ckler), ...(esik !== undefined ? { esik } : {}) },
    );
    for (const x of grup) {
      const deger =
        x.olcumTuru === "ck"
          ? (s.ckBasarilari.find((c) => c.ckKod === x.kod)?.ortalama ?? null)
          : (s.pcSaglanmasi.find((p) => p.pcKod === x.kod)?.deger ?? null);
      sonuc.push({
        ...x,
        // Puan yoksa ölçüm yoktur: değer `null` (bu dönem hesaplanamadı).
        deger: s.ogrenciSayisi > 0 ? deger : null,
        esik: s.esik,
        kaynak: { hesapSurumu: s.hesapSurumu, girdiOzeti: s.girdiOzeti },
      });
    }
  }
  return sonuc;
}
