// Program öz değerlendirme raporu (ÖDR) servisi (İP-19). Akış:
//   1. `olustur`: çerçeve (kod) + program için onaylı kanıt bağları (kararlı `kanit_etiketi` önerileri), program
//      düzeyi PÇ hesabı (derslerin son ölçme sonuçlarından `programPcHesapla`) ve süreç kayıtları (eylemler)
//      toplanır; `odrKur` bölüm taslaklarını kurar. Her bölüm yeni bir `rapor_bolumu_surumu` olarak eklenir
//      (öncekine bağlı; üzerine yazılmaz), rapor onayı için yüksek riskli öneri açılır.
//   2. `eksikleriBaslat`: kanıtı olmayan ölçütler için görev açar (aynı ölçüte ikinci görev açılmaz).
//   3. `belge`: DOCX ÖDR ya da XLSX ziyaret hazırlık paketi, son sürümden deterministik üretilir.
// Sayılar yalnız ölçme hesabından gelir; metindeki her sayı denetimden geçer (`denetim.ts`).

import { docxUret, xlsxUret } from "@akredit/belge";
import { ozetHesapla } from "@akredit/cekirdek";
import { type Cerceve, ILK_CERCEVELER, tumOlcutler } from "@akredit/cerceveler";
import type { DersOlcmeSonucu, ProgramDersGirdisi } from "@akredit/olcme";
import { programPcHesapla } from "@akredit/olcme";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { type DersDosyasiSatiri, type OdrOnayi, type OdrSurumu, odrDocxModeli, ziyaretPaketiSayfalari } from "./belge.ts";
import { type HesapKaynagi, type OdrTaslagi, type OnayliKanit, odrKur, type SurecKaydi, bolumMetni } from "./kurucu.ts";

export * from "./belge.ts";
export * from "./denetim.ts";
export * from "./kurucu.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

export const OdrGirdisi = z
  .object({
    programId: Kimlik,
    cerceveKod: z.string().trim().min(1, "Çerçeveyi seçin.").max(100),
    /** İnsanın ya da modelin önerdiği ek cümleler; denetimi geçmeyen cümle rapora girmez. */
    ekMetinler: z
      .array(
        z
          .object({ olcutKod: z.string().min(1).max(50), metin: z.string().min(1).max(5000), kaynak: z.enum(["yz", "kisi"]) })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict();

export const OdrBicimi = z.enum(["docx", "xlsx"]);

export const OdrDurumu = z.object({
  raporId: z.string(),
  programId: z.string(),
  cerceveKod: z.string(),
  surum: z.number(),
  surumler: z.array(z.object({ surum: z.number(), zaman: z.string(), eksikSayisi: z.number() })),
  onayOneriId: z.string().nullable(),
  onay: z.object({ onaylayan: z.string(), zaman: z.string(), dayanak: z.string() }).nullable(),
  bolumler: z.array(
    z.object({
      kod: z.string(),
      baslik: z.string(),
      olcutSayisi: z.number(),
      kapsanan: z.number(),
    }),
  ),
  eksikler: z.array(z.object({ olcutKod: z.string(), baslik: z.string(), neden: z.string() })),
  cikarilanCumle: z.number(),
});
export type OdrDurumu = z.infer<typeof OdrDurumu>;

export const EksikGorevleri = z.object({ acilan: z.array(z.string()), zatenVar: z.array(z.string()) });

export const OdrDosyasi = z.object({ dosyaAdi: z.string(), mime: z.string(), ozet: z.string(), icerikBase64: z.string() });

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/** Bölüm sürümünün `denetim_sonucu` alanında saklanan yapı. */
const SaklananBolum = z.object({
  odr: z.literal(1),
  surum: z.number(),
  sira: z.number(),
  bolum: z.unknown(),
  taslak: z.unknown().optional(),
});

export function cerceveBul(kod: string): Cerceve {
  const c = ILK_CERCEVELER.find((x) => x.kod === kod);
  if (!c) throw new ServisHatasi("gecersiz_istek", "Bu çerçeve bulunamadı. Listeden bir çerçeve seçin.");
  return c;
}

// ---------------------------------------------------------------------------------------------------------
// Veri toplama

async function programYukle(tx: Islem, programId: string) {
  const [p] = await tx.select().from(sema.program).where(eq(sema.program.id, programId));
  if (!p) throw bulunamadi();
  return p;
}

/** Programa ait sayılan kanıt: kapsamı bu program, programın dersi ya da birimi, ya da kapsamsız (kurum). */
function programaAit(kapsamlar: unknown, p: { id: string; birimId: string }, dersler: Set<string>): boolean {
  const l = Array.isArray(kapsamlar) ? (kapsamlar as { tur?: unknown; id?: unknown }[]) : [];
  if (l.length === 0) return true;
  return l.some(
    (k) =>
      (k.tur === "program" && k.id === p.id) ||
      (k.tur === "birim" && k.id === p.birimId) ||
      (k.tur === "ders" && typeof k.id === "string" && dersler.has(k.id)),
  );
}

const KanitEtiketi = z.object({ olcutKodlari: z.array(z.string()).optional() }).loose();

/** Kararla onaylanmış kanıt–ölçüt bağları. Düzeltilmiş kararda kodlar düzeltme metninden okunur. */
async function onayliKanitlar(
  tx: Islem,
  cerceve: Cerceve,
  p: { id: string; birimId: string },
  dersler: Set<string>,
): Promise<OnayliKanit[]> {
  const kodlar = new Set(tumOlcutler(cerceve.olcutler).map((o) => o.kod));
  const satir = await tx
    .select({ o: sema.oneri, k: sema.karar, kisi: sema.kisi.adSoyad })
    .from(sema.oneri)
    .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .innerJoin(sema.kisi, eq(sema.kisi.id, sema.karar.kararVerenKisiId))
    .where(and(eq(sema.oneri.tur, "kanit_etiketi"), eq(sema.oneri.hedefTuru, "kanit")))
    .orderBy(asc(sema.karar.zaman));
  const kanitlar = new Map((await tx.select().from(sema.kanit)).map((k) => [k.id, k]));
  const harita = new Map<string, OnayliKanit>();
  for (const r0 of satir) {
    const kn = kanitlar.get(r0.o.hedefId);
    if (!kn) continue;
    const r = { ...r0, kn };
    if (r.k.sonuc === "reddedildi" || !programaAit(r.kn.kapsamlar, p, dersler)) continue;
    let olcutler: string[];
    if (r.k.sonuc === "duzeltildi") {
      const metin = String((r.k.duzeltme as { metin?: unknown } | null)?.metin ?? "");
      olcutler = metin.split(/[\s,;:]+/u).map((x) => x.replace(/[.]+$/u, ""));
    } else olcutler = KanitEtiketi.safeParse(r.o.icerik).data?.olcutKodlari ?? [];
    olcutler = olcutler.filter((x) => kodlar.has(x));
    if (!olcutler.length) continue;
    const onceki = harita.get(r.kn.id);
    harita.set(r.kn.id, {
      kanitId: r.kn.id,
      ozet: r.kn.ozet,
      dosyaAdi: r.kn.dosyaAdi,
      olcutKodlari: [...new Set([...(onceki?.olcutKodlari ?? []), ...olcutler])].sort(),
      onayZamani: (onceki?.onayZamani ?? r.k.zaman.toISOString()) as string,
      onaylayan: onceki?.onaylayan ?? r.kisi,
    });
  }
  return [...harita.values()].sort((a, b) => a.dosyaAdi.localeCompare(b.dosyaAdi, "tr"));
}

const sayiYaz = (n: number, basamak = 1) =>
  n.toLocaleString("tr-TR", { minimumFractionDigits: basamak, maximumFractionDigits: basamak, useGrouping: false });

/** Program düzeyi PÇ hesabı (eşit ağırlık); derslerin her açılışından son ölçme sonucu. */
async function pcHesabi(tx: Islem, cerceve: Cerceve, dersIdleri: string[]): Promise<{ hesap: HesapKaynagi | null; dizin: DersDosyasiSatiri[] }> {
  if (!dersIdleri.length) return { hesap: null, dizin: [] };
  const acilislar = await tx
    .select({ a: sema.dersAcilisi, d: sema.ders, donem: sema.donem })
    .from(sema.dersAcilisi)
    .innerJoin(sema.ders, eq(sema.ders.id, sema.dersAcilisi.dersId))
    .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
    .where(inArray(sema.dersAcilisi.dersId, dersIdleri))
    .orderBy(asc(sema.ders.kod), asc(sema.donem.baslangic));
  const sonuclar = acilislar.length
    ? await tx
        .select()
        .from(sema.olcmeSonucu)
        .where(inArray(sema.olcmeSonucu.dersAcilisiId, acilislar.map((x) => x.a.id)))
        .orderBy(desc(sema.olcmeSonucu.olusturma), desc(sema.olcmeSonucu.id))
    : [];
  const raporlar = await tx.select().from(sema.rapor).where(eq(sema.rapor.tur, "ders_dosyasi"));
  const dizin: DersDosyasiSatiri[] = [];
  // Her ders için en son ölçülen açılış kullanılır (aynı ders iki kez sayılmaz).
  const dersSon = new Map<string, { kod: string; akts: number; os: typeof sema.olcmeSonucu.$inferSelect }>();
  for (const x of acilislar) {
    const os = sonuclar.find((s) => s.dersAcilisiId === x.a.id) ?? null;
    const r = raporlar.find((r) => (r.kapsam as { dersAcilisiId?: unknown }).dersAcilisiId === x.a.id) ?? null;
    dizin.push({
      dersKodu: x.d.kod,
      dersAdi: x.d.ad,
      donem: x.donem.ad,
      olcmeSonucu: os ? `${os.id} (${os.girdiOzeti.slice(0, 12)})` : "EKSİK",
      dersDosyasi: r ? (r.baslik ?? r.id) : "EKSİK",
    });
    if (os) dersSon.set(x.d.id, { kod: x.d.kod, akts: x.d.akts, os });
  }
  const girdiler: ProgramDersGirdisi[] = [...dersSon.values()].map((v) => {
    const s = v.os.sonuc as Partial<DersOlcmeSonucu>;
    return {
      dersKodu: v.kod,
      akts: v.akts,
      ogrenciSayisi: s.notIstatistikleri?.n ?? 0,
      pcSaglanmasi: s.pcSaglanmasi ?? [],
    };
  });
  const olcutKodlari = tumOlcutler(cerceve.olcutler)
    .filter((o) => o.kanitGereksinimleri.some((k) => k.uretenSurec === "olcme"))
    .map((o) => o.kod);
  const pc = programPcHesapla(girdiler, { agirlik: "esit" }).filter((x) => x.deger !== null);
  if (!pc.length || !olcutKodlari.length) return { hesap: null, dizin };
  const dayanaklar = [...dersSon.values()].map((v) => `${v.os.id}:${v.os.hesapSurumu}:${v.os.girdiOzeti}`).sort();
  return {
    hesap: {
      kimlik: ozetHesapla(`odr.pc.v1|${dayanaklar.join("|")}`),
      ad: "Program çıktısı sağlanma düzeyi (derslerin eşit ağırlıklı ortalaması, 0-100)",
      dayanak: dayanaklar.join("; "),
      satirlar: pc.map((x) => ({
        etiket: `${x.pcKod} program düzeyi sağlanma`,
        deger: sayiYaz(x.deger as number),
        aciklama: `${x.dersSayisi} ders, ${x.ogrenciSayisi} öğrenci kaydı`,
      })),
      olcutKodlari,
    },
    dizin,
  };
}

const EylemKaynagi = z.object({ olcutKodlari: z.array(z.string()).optional() }).loose();

async function surecKayitlari(tx: Islem, kanitlar: OnayliKanit[]): Promise<SurecKaydi[]> {
  const eylemler = await tx.select().from(sema.eylem).orderBy(asc(sema.eylem.olusturma));
  const tum = await tx.select({ id: sema.kanit.id, ozet: sema.kanit.ozet }).from(sema.kanit);
  const ozetler = new Map(tum.map((k) => [k.id, k.ozet]));
  const onayli = new Set(kanitlar.map((k) => k.ozet));
  return eylemler.flatMap((e) => {
    const kodlar = EylemKaynagi.safeParse(e.kaynak).data?.olcutKodlari ?? [];
    if (!kodlar.length) return [];
    const kanitOzetleri = e.kanitIdleri.flatMap((id) => {
      const o = ozetler.get(id);
      return o && onayli.has(o) ? [o] : [];
    });
    // Onaylı kanıtı olmayan eylem de listelenir; kurucu onu [EKSİK] yazar.
    return [{ tanim: e.tanim, pukoAsamasi: e.pukoAsamasi, olcutKodlari: kodlar, kanitOzetleri }];
  });
}

// ---------------------------------------------------------------------------------------------------------
// Kayıt ve görünüm

async function odrRaporu(tx: Islem, programId: string, cerceveKod: string) {
  const r = await tx.select().from(sema.rapor).where(eq(sema.rapor.tur, "odr")).orderBy(asc(sema.rapor.olusturma));
  return (
    r.find((x) => {
      const k = x.kapsam as { tur?: unknown; id?: unknown; cerceve?: unknown };
      return k.tur === "program" && k.id === programId && k.cerceve === cerceveKod;
    }) ?? null
  );
}

async function surumler(tx: Islem, raporId: string) {
  const s = await tx
    .select()
    .from(sema.raporBolumuSurumu)
    .where(eq(sema.raporBolumuSurumu.raporId, raporId))
    .orderBy(asc(sema.raporBolumuSurumu.olusturma), asc(sema.raporBolumuSurumu.id));
  return s.flatMap((x) => {
    const d = SaklananBolum.safeParse(x.denetimSonucu);
    return d.success ? [{ satir: x, d: d.data }] : [];
  });
}

async function onayDurumu(tx: Islem, raporId: string, surum: number) {
  const o = await tx
    .select({ o: sema.oneri, k: sema.karar, kisi: sema.kisi.adSoyad })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .leftJoin(sema.kisi, eq(sema.kisi.id, sema.karar.kararVerenKisiId))
    .where(and(eq(sema.oneri.tur, "rapor_bolumu"), eq(sema.oneri.hedefTuru, "rapor"), eq(sema.oneri.hedefId, raporId)))
    .orderBy(desc(sema.oneri.olusturma), desc(sema.oneri.id));
  const son = o.find((x) => (x.o.icerik as { surum?: unknown }).surum === surum) ?? null;
  const onay: OdrOnayi | null =
    son?.k && son.k.sonuc !== "reddedildi"
      ? {
          onaylayan: son.kisi ?? "",
          zaman: son.k.zaman.toISOString(),
          dayanak: son.k.dayanak === "dogrudan" ? "Doğrudan karar" : "Yetki devri politikası",
        }
      : null;
  return { onayOneriId: son?.o.id ?? null, onay };
}

interface Gorunum {
  raporId: string;
  programId: string;
  cerceveKod: string;
  taslak: OdrTaslagi;
  surum: number;
  surumler: OdrSurumu[];
  onayOneriId: string | null;
  onay: OdrOnayi | null;
}

async function gorunum(tx: Islem, r: typeof sema.rapor.$inferSelect): Promise<Gorunum> {
  const k = r.kapsam as { id: string; cerceve: string };
  const s = await surumler(tx, r.id);
  const son = Math.max(0, ...s.map((x) => x.d.surum));
  const tam = s.find((x) => x.d.surum === son && x.d.taslak);
  if (!tam) throw bulunamadi();
  const taslak = tam.d.taslak as OdrTaslagi;
  const gecmis = [...new Set(s.map((x) => x.d.surum))].sort((a, b) => a - b).map((n) => {
    const t = s.find((x) => x.d.surum === n && x.d.taslak);
    return {
      surum: n,
      zaman: t?.satir.olusturma.toISOString() ?? "",
      eksikSayisi: (t?.d.taslak as OdrTaslagi | undefined)?.eksikler.length ?? 0,
    };
  });
  const { onayOneriId, onay } = await onayDurumu(tx, r.id, son);
  return { raporId: r.id, programId: k.id, cerceveKod: k.cerceve, taslak, surum: son, surumler: gecmis, onayOneriId, onay };
}

function durumYaz(g: Gorunum): OdrDurumu {
  return {
    raporId: g.raporId,
    programId: g.programId,
    cerceveKod: g.cerceveKod,
    surum: g.surum,
    surumler: g.surumler,
    onayOneriId: g.onayOneriId,
    onay: g.onay,
    bolumler: g.taslak.bolumler.map((b) => ({
      kod: b.kod,
      baslik: b.baslik,
      olcutSayisi: b.olcutler.length,
      kapsanan: b.olcutler.filter((o) => o.kapsandi).length,
    })),
    eksikler: g.taslak.eksikler.map((e) => ({ olcutKod: e.olcutKod, baslik: e.baslik, neden: e.neden })),
    cikarilanCumle: g.taslak.cikarilanCumle,
  };
}

async function raporYukle(tx: Islem, id: string) {
  const [r] = await tx.select().from(sema.rapor).where(and(eq(sema.rapor.id, id), eq(sema.rapor.tur, "odr")));
  if (!r) throw bulunamadi();
  return r;
}

// ---------------------------------------------------------------------------------------------------------
// İşlevler

/** ÖDR taslağını kurar ve yeni sürüm olarak kaydeder. */
export async function olustur(b: ServisBaglami, girdi: unknown): Promise<OdrDurumu> {
  const g = OdrGirdisi.parse(girdi);
  const cerceve = cerceveBul(g.cerceveKod);
  return islem(b, async (tx, gerekli) => {
    const p = await programYukle(tx, g.programId);
    await gerekli("rapor.duzenle", { tur: "program", id: p.id });
    const dersler = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.programId, p.id));
    const dersIdleri = dersler.map((d) => d.id);
    const kanitlar = await onayliKanitlar(tx, cerceve, p, new Set(dersIdleri));
    const { hesap } = await pcHesabi(tx, cerceve, dersIdleri);
    const taslak = odrKur({
      cerceve,
      programAd: p.ad,
      kanitlar,
      hesaplar: hesap ? [hesap] : [],
      surecKayitlari: await surecKayitlari(tx, kanitlar),
      ...(g.ekMetinler ? { ekMetinler: g.ekMetinler } : {}),
    });
    let r = await odrRaporu(tx, p.id, cerceve.kod);
    if (!r) {
      const [yeni] = await tx
        .insert(sema.rapor)
        .values({
          kurumId: b.aktor.kurumId,
          tur: "odr",
          kapsam: json({ tur: "program", id: p.id, cerceve: cerceve.kod }),
          baslik: `${p.ad} öz değerlendirme raporu (${cerceve.ad})`,
        })
        .returning();
      if (!yeni) throw new Error("Rapor eklenemedi.");
      r = yeni;
    }
    const onceki = await surumler(tx, r.id);
    const surum = Math.max(0, ...onceki.map((x) => x.d.surum)) + 1;
    const sonBolum = new Map<string, string>();
    for (const x of onceki) if (x.satir.bolumKodu) sonBolum.set(x.satir.bolumKodu, x.satir.id);
    for (const bolum of taslak.bolumler) {
      const kanitIdleri = new Set(
        bolum.olcutler.flatMap((o) => o.paragraflar.flatMap((pp) => pp.kanitOzetleri)).map(
          (oz) => kanitlar.find((k) => k.ozet === oz)?.kanitId,
        ),
      );
      await tx.insert(sema.raporBolumuSurumu).values({
        kurumId: b.aktor.kurumId,
        raporId: r.id,
        bolumKodu: bolum.kod,
        metin: bolumMetni(bolum) || "[EKSİK: Bu bölümde ölçüt yok.]",
        atiflar: json([...kanitIdleri].filter(Boolean).map((kanitId) => ({ kanitId }))),
        // İlk bölüm bütün taslağı da taşır (ekler ve belge üretimi için).
        denetimSonucu: json({ odr: 1, surum, sira: bolum.sira, bolum, ...(bolum.sira === 1 ? { taslak } : {}) }),
        oncekiSurumId: sonBolum.get(bolum.kod) ?? null,
      });
    }
    if (!taslak.bolumler.length)
      await tx.insert(sema.raporBolumuSurumu).values({
        kurumId: b.aktor.kurumId,
        raporId: r.id,
        bolumKodu: "—",
        metin: "[EKSİK: Çerçevenin ölçütleri yok.]",
        denetimSonucu: json({ odr: 1, surum, sira: 1, bolum: null, taslak }),
        oncekiSurumId: sonBolum.get("—") ?? null,
      });
    await tx.insert(sema.oneri).values({
      kurumId: b.aktor.kurumId,
      tur: "rapor_bolumu",
      hedefTuru: "rapor",
      hedefId: r.id,
      icerik: json({
        baslik: `ÖDR onayı: ${p.ad} (sürüm ${surum})`,
        metin: `${taslak.bolumler.length} bölüm, ${taslak.eksikler.length} eksik. Rapor onaylanınca kurum adına beyan sayılır.`,
        raporId: r.id,
        surum,
      }),
      gerekce: "Öz değerlendirme raporu kurum adına beyandır; onay insan kararıdır.",
      atiflar: json(taslak.kanitlar.map((k) => ({ kanitId: k.kanitId }))),
      ureticiTuru: "kural",
      uretici: { kural: "odr-kurucu", surum: "1" },
      risk: "yuksek",
    });
    await gunluge(
      tx,
      b,
      "odr.olusturuldu",
      { tur: "rapor", id: r.id },
      { surum, cerceve: cerceve.kod, eksik: taslak.eksikler.length, cikarilan: taslak.cikarilanCumle },
    );
    return durumYaz(await gorunum(tx, r));
  });
}

export async function durum(b: ServisBaglami, raporId: string): Promise<OdrDurumu> {
  const id = Kimlik.parse(raporId);
  return islem(b, async (tx, gerekli) => {
    const r = await raporYukle(tx, id);
    await gerekli("rapor.oku", { tur: "program", id: (r.kapsam as { id: string }).id });
    return durumYaz(await gorunum(tx, r));
  });
}

/** Programın ÖDR'leri (çerçeve başına bir rapor). */
export async function programinRaporlari(b: ServisBaglami, programId: string): Promise<OdrDurumu[]> {
  const id = Kimlik.parse(programId);
  return islem(b, async (tx, gerekli) => {
    await programYukle(tx, id);
    await gerekli("rapor.oku", { tur: "program", id });
    const r = await tx.select().from(sema.rapor).where(eq(sema.rapor.tur, "odr")).orderBy(asc(sema.rapor.olusturma));
    const sonuc: OdrDurumu[] = [];
    for (const x of r) if ((x.kapsam as { id?: unknown }).id === id) sonuc.push(durumYaz(await gorunum(tx, x)));
    return sonuc;
  });
}

/** Son sürümdeki eksikler için görev açar; aynı rapor ve ölçüt için açık görev varsa yenisini açmaz. */
export async function eksikleriBaslat(b: ServisBaglami, raporId: string): Promise<z.infer<typeof EksikGorevleri>> {
  const id = Kimlik.parse(raporId);
  return islem(b, async (tx, gerekli) => {
    const r = await raporYukle(tx, id);
    const programId = (r.kapsam as { id: string }).id;
    await gerekli("rapor.duzenle", { tur: "program", id: programId });
    const g = await gorunum(tx, r);
    const var_ = await tx.select().from(sema.gorev);
    const acilan: string[] = [];
    const zatenVar: string[] = [];
    for (const e of g.taslak.eksikler) {
      const mevcut = var_.some((x) => {
        const a = x.ayrinti as { odrRaporId?: unknown; olcutKod?: unknown };
        return a.odrRaporId === r.id && a.olcutKod === e.olcutKod && x.durum !== "tamam";
      });
      if (mevcut) {
        zatenVar.push(e.olcutKod);
        continue;
      }
      await tx.insert(sema.gorev).values({
        kurumId: b.aktor.kurumId,
        baslik: `ÖDR eksiği: ${e.olcutKod} ${e.baslik}`,
        ayrinti: json({
          ilgili: `${g.taslak.programAd} öz değerlendirme raporu`,
          odrRaporId: r.id,
          olcutKod: e.olcutKod,
          neden: e.neden,
          beklenen: e.gereksinimler,
        }),
      });
      acilan.push(e.olcutKod);
    }
    await gunluge(tx, b, "odr.eksik_gorevleri_acildi", { tur: "rapor", id: r.id }, { acilan, zatenVar });
    return { acilan, zatenVar };
  });
}

/** DOCX ÖDR ya da XLSX ziyaret hazırlık paketi. */
export async function belge(b: ServisBaglami, raporId: string, bicim: unknown): Promise<z.infer<typeof OdrDosyasi>> {
  const id = Kimlik.parse(raporId);
  const tur = OdrBicimi.parse(bicim);
  const veri = await islem(b, async (tx, gerekli) => {
    const r = await raporYukle(tx, id);
    const programId = (r.kapsam as { id: string }).id;
    await gerekli("rapor.oku", { tur: "program", id: programId });
    const g = await gorunum(tx, r);
    const [kurum] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, b.aktor.kurumId));
    const dersler = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.programId, programId));
    const { dizin } = await pcHesabi(tx, cerceveBul(g.cerceveKod), dersler.map((d) => d.id));
    await gunluge(tx, b, "odr.indirildi", { tur: "rapor", id: r.id }, { bicim: tur, surum: g.surum });
    return {
      taslak: g.taslak,
      kurumAd: kurum?.ad ?? "",
      surum: g.surum,
      surumler: g.surumler,
      onay: g.onay,
      dersDosyalari: dizin,
    };
  });
  const dosya = tur === "docx" ? await docxUret(odrDocxModeli(veri)) : await xlsxUret(ziyaretPaketiSayfalari(veri));
  const ad = veri.taslak.programAd.replace(/[^\p{L}\p{N}-]+/gu, "-");
  return {
    dosyaAdi: `${ad}-${tur === "docx" ? "odr" : "ziyaret-paketi"}-s${veri.surum}.${tur}`,
    mime: MIME[tur],
    ozet: ozetHesapla(dosya),
    icerikBase64: Buffer.from(dosya).toString("base64"),
  };
}
