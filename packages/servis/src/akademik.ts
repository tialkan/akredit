// Program, ders, matris ve ölçme servisi (salt okunur). Sayılar yalnız veritabanındaki deterministik
// sonuçlardan gelir (`olcme_sonucu`, `@akredit/olcme` üretir); sonuç yoksa liste boş döner, sayı uydurulmaz.

import { type Islem, sema } from "@akredit/vt";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { islem, type ServisBaglami } from "./baglam.ts";
import { bulunamadi } from "./hata.ts";
import type { Cikti, Ders, OlcmeSatiri, Program } from "./semalar.ts";

type CiktiC = z.infer<typeof Cikti>;
type DersC = z.infer<typeof Ders>;
type ProgramC = z.infer<typeof Program>;
type OlcmeC = z.infer<typeof OlcmeSatiri>;

/** Kurum ayarında sağlanma eşiği yoksa kullanılan varsayılan (0-1). */
export const VARSAYILAN_ESIK = 0.5;

const UUID = /^[0-9a-f-]{36}$/iu;

/** Sahibin her kod için en son sürümdeki çıktıları. */
async function ciktilar(tx: Islem, tur: "program" | "ders", sahipIdler: string[]): Promise<CiktiC[]> {
  if (sahipIdler.length === 0) return [];
  const satir = await tx
    .select()
    .from(sema.cikti)
    .where(and(eq(sema.cikti.tur, tur), inArray(sema.cikti.sahipId, sahipIdler)))
    .orderBy(asc(sema.cikti.kod), asc(sema.cikti.surum));
  const son = new Map<string, (typeof satir)[number]>();
  for (const c of satir) son.set(`${c.sahipId}:${c.kod}`, c);
  return [...son.values()].map((c) => ({
    id: c.id,
    tur: c.tur,
    sahipId: c.sahipId,
    kod: c.kod,
    metin: c.metin,
    surum: c.surum,
    oncekiSurumId: c.oncekiSurumId,
  }));
}

const OlcmeSonucuBicimi = z.object({
  ciktilar: z.array(
    z.object({
      ciktiId: z.string().optional(),
      kod: z.string(),
      saglanma: z.number().min(0).max(1),
    }),
  ),
});

/** Ders açılışlarının en son ölçme sonucundan çıktı sağlanma satırları. Biçim tanınmazsa boş. */
async function olcmeSatirlari(tx: Islem, dersId: string): Promise<OlcmeC[]> {
  const satir = await tx
    .select({ sonuc: sema.olcmeSonucu.sonuc, olusturma: sema.olcmeSonucu.olusturma })
    .from(sema.olcmeSonucu)
    .innerJoin(sema.dersAcilisi, eq(sema.dersAcilisi.id, sema.olcmeSonucu.dersAcilisiId))
    .where(eq(sema.dersAcilisi.dersId, dersId));
  const son = satir.sort((a, b) => b.olusturma.getTime() - a.olusturma.getTime())[0];
  const p = OlcmeSonucuBicimi.safeParse(son?.sonuc);
  return p.success
    ? p.data.ciktilar.map((c) => ({ ciktiId: c.ciktiId ?? c.kod, kod: c.kod, saglanma: c.saglanma }))
    : [];
}

async function bekleyenBolognaTaslagi(tx: Islem, dersId: string): Promise<boolean> {
  const r = await tx
    .select({ id: sema.oneri.id })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(and(eq(sema.oneri.tur, "bologna_taslagi"), eq(sema.oneri.hedefId, dersId), isNull(sema.karar.id)))
    .limit(1);
  return r.length > 0;
}

async function dersGorunumu(tx: Islem, d: typeof sema.ders.$inferSelect): Promise<DersC> {
  const c = await ciktilar(tx, "ders", [d.id]);
  const bekliyor = await bekleyenBolognaTaslagi(tx, d.id);
  return {
    id: d.id,
    kod: d.kod,
    ad: d.ad,
    akts: d.akts,
    yariyil: d.yariyil,
    ciktilar: c,
    bolognaDurumu: bekliyor ? "onay_bekliyor" : c.length === 0 ? "eksik" : "guncel",
    bolognaNotu: bekliyor
      ? "Onayınızı bekleyen bir Bologna taslağı var."
      : c.length === 0
        ? "Dersin öğrenme çıktıları henüz girilmemiş."
        : "Ders öğrenme çıktıları kayıtlı.",
    // Ders dosyası İP-16'da gelir; o zamana kadar liste boştur.
    dersDosyasi: [],
    olcme: await olcmeSatirlari(tx, d.id),
  };
}

function matrisDegeri(deger: string): ProgramC["matris"][number]["deger"] | null {
  if (deger === "iliskisiz") return { tur: "iliskisiz" };
  if (deger === "yetersiz_kanit") return { tur: "yetersiz_kanit" };
  const n = Number(deger);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? { tur: "puan", puan: n } : null;
}

async function programGorunumu(tx: Islem, p: typeof sema.program.$inferSelect, esik: number): Promise<ProgramC> {
  const [birim] = await tx.select({ ad: sema.birim.ad }).from(sema.birim).where(eq(sema.birim.id, p.birimId));
  const dersler = await tx
    .select({ id: sema.ders.id })
    .from(sema.ders)
    .where(eq(sema.ders.programId, p.id))
    .orderBy(asc(sema.ders.yariyil), asc(sema.ders.kod));
  const dersCiktilari = await ciktilar(
    tx,
    "ders",
    dersler.map((d) => d.id),
  );
  const idler = dersCiktilari.map((c) => c.id);
  const katkilar = idler.length
    ? await tx
        .select()
        .from(sema.katki)
        .where(inArray(sema.katki.dersCiktiId, idler))
        .orderBy(asc(sema.katki.olusturma), asc(sema.katki.id))
    : [];
  // Hücre başına en son onaylı katkı geçerlidir (katkı satırı onaylı karara bağlıdır).
  const hucre = new Map<string, ProgramC["matris"][number]>();
  for (const k of katkilar) {
    const deger = matrisDegeri(k.deger);
    if (deger)
      hucre.set(`${k.dersCiktiId}:${k.programCiktiId}`, {
        dersCiktisiId: k.dersCiktiId,
        programCiktisiId: k.programCiktiId,
        deger,
      });
  }
  return {
    id: p.id,
    ad: p.ad,
    duzey: p.duzey,
    birim: birim?.ad ?? "",
    ciktilar: await ciktilar(tx, "program", [p.id]),
    dersIdleri: dersler.map((d) => d.id),
    matris: [...hucre.values()],
    // Program düzeyi sağlanma sonucu henüz üretilmiyor (İP-19); sayı uydurulmaz.
    olcme: [],
    esik,
  };
}

async function esikOku(tx: Islem, kurumId: string): Promise<number> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const e = (k?.a as { esikler?: { saglanma?: unknown } } | undefined)?.esikler?.saglanma;
  return typeof e === "number" && e >= 0 && e <= 1 ? e : VARSAYILAN_ESIK;
}

export async function programlar(b: ServisBaglami): Promise<ProgramC[]> {
  return islem(b, async (tx, _g, d) => {
    const satir = await tx.select().from(sema.program).orderBy(asc(sema.program.ad));
    const gorunur = await d.suz("olcme.oku", satir, (p) => ({ tur: "program", id: p.id }));
    const esik = await esikOku(tx, b.aktor.kurumId);
    return Promise.all(gorunur.map((p) => programGorunumu(tx, p, esik)));
  });
}

export async function program(b: ServisBaglami, id: string): Promise<ProgramC> {
  return islem(b, async (tx, gerekli) => {
    const [p] = UUID.test(id) ? await tx.select().from(sema.program).where(eq(sema.program.id, id)) : [];
    if (!p) throw bulunamadi();
    await gerekli("olcme.oku", { tur: "program", id });
    return programGorunumu(tx, p, await esikOku(tx, b.aktor.kurumId));
  });
}

export async function dersler(b: ServisBaglami): Promise<DersC[]> {
  return islem(b, async (tx, _g, d) => {
    const satir = await tx.select().from(sema.ders).orderBy(asc(sema.ders.yariyil), asc(sema.ders.kod));
    const gorunur = await d.suz("olcme.oku", satir, (x) => ({ tur: "ders", id: x.id }));
    const sonuc: DersC[] = [];
    for (const x of gorunur) sonuc.push(await dersGorunumu(tx, x));
    return sonuc;
  });
}

export async function ders(b: ServisBaglami, id: string): Promise<DersC> {
  return islem(b, async (tx, gerekli) => {
    const [x] = UUID.test(id) ? await tx.select().from(sema.ders).where(eq(sema.ders.id, id)) : [];
    if (!x) throw bulunamadi();
    await gerekli("olcme.oku", { tur: "ders", id });
    return dersGorunumu(tx, x);
  });
}
