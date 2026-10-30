// Saha ziyareti hazırlık simülatörü servisi (İP-48). Akış:
//   1. `hazirla`: program + çerçeve için onaylı kanıt bağları (ÖDR ile aynı kural) ve son ÖDR sürümündeki
//      EKSİK cümleler toplanır; `sorulariKur` soru listesini, kanıt eşlemesini ve hazırlık oranını kurar.
//      Sağlayıcı verilirse model yalnız soruların dilini düzeltir ve ölçüte bağlı soru önerir; çıktısı
//      öğe öğe ayıklanır, cevap yazamaz.
//   2. `provaIsaretle`: kişi bir soru için "hazırım" ya da "eksik var" der; işaret günlüğe yazılır, "eksik
//      var" komisyona görev açar (aynı soru için açık görev varsa yenisini açmaz).
// Hazırlık oranı kanıtlı soru / soru oranıdır; "başarı olasılığı" gibi ölçülmemiş bir rakam üretilmez.

import { type Cerceve, tumOlcutler } from "@akredit/cerceveler";
import { gunlugeYaz, type Islem, sema } from "@akredit/vt";
import type { Eylem } from "@akredit/yetki";
import { gorevCalistir, type Saglayici, sahaSorulari, sahaSorulariniAyikla } from "@akredit/yz";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { type Denetleyici, gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { cerceveBul, onayliKanitlar } from "../odr/index.ts";
import { type EksikCumle, ROLLER, type SahaListesi, sorulariKur } from "./sorular.ts";

export * from "./sorular.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");

export const HazirlikGirdisi = z
  .object({
    programId: Kimlik,
    cerceveKod: z.string().trim().min(1, "Çerçeveyi seçin.").max(100),
  })
  .strict();

export const ProvaGirdisi = z
  .object({
    programId: Kimlik,
    cerceveKod: z.string().trim().min(1).max(100),
    soruId: z.string().regex(/^[0-9a-f]{16}$/u, "Soru bulunamadı."),
    rol: z.enum(ROLLER),
    durum: z.enum(["hazirim", "eksik_var"]),
    not: z.string().trim().max(1000).optional(),
  })
  .strict();

export type ProvaDurumu = "hazirim" | "eksik_var";

export interface SahaDurumu extends SahaListesi {
  programId: string;
  programAd: string;
  /** EKSİK cümlelerin alındığı ÖDR sürümü; ÖDR yoksa null. */
  odrSurumu: number | null;
  /** Bu kişinin son prova işaretleri (soru kimliği → durum). */
  prova: Record<string, ProvaDurumu>;
  yz: { duzeltilen: number; onerilen: number; reddedilen: number } | null;
}

export interface ProvaSonucu {
  soruId: string;
  durum: ProvaDurumu;
  gorevId: string | null;
  zatenVardi: boolean;
}

// ÖDR bölüm sürümünde saklanan yapının bu iş için gereken kısmı.
const SaklananOdr = z
  .object({
    surum: z.number(),
    bolum: z
      .object({
        olcutler: z.array(
          z
            .object({
              kod: z.string(),
              paragraflar: z.array(z.object({ metin: z.string(), eksik: z.boolean() }).loose()),
            })
            .loose(),
        ),
      })
      .loose()
      .nullable(),
  })
  .loose();

/** Metinden EKSİK işaretli cümleleri ayırır: "[EKSİK: …]" parçası taşıyan her cümle. */
export function eksikCumleleri(metin: string): string[] {
  const parcalar = metin.match(/[^.!?\n[]*\[EKSİK[^\]]*\][^.!?\n]*[.!?]?/gu) ?? [];
  return [...new Set(parcalar.map((p) => p.replace(/\s+/gu, " ").trim()).filter(Boolean))];
}

/** Son ÖDR sürümündeki EKSİK cümleler (ölçüt koduyla). */
async function odrEksikleri(
  tx: Islem,
  programId: string,
  cerceve: Cerceve,
): Promise<{ surum: number | null; cumleler: EksikCumle[] }> {
  const raporlar = await tx.select().from(sema.rapor).where(eq(sema.rapor.tur, "odr"));
  const r = raporlar.find((x) => {
    const k = x.kapsam as { tur?: unknown; id?: unknown; cerceve?: unknown };
    return k.tur === "program" && k.id === programId && k.cerceve === cerceve.kod;
  });
  if (!r) return { surum: null, cumleler: [] };
  const s = await tx
    .select()
    .from(sema.raporBolumuSurumu)
    .where(eq(sema.raporBolumuSurumu.raporId, r.id))
    .orderBy(asc(sema.raporBolumuSurumu.olusturma), asc(sema.raporBolumuSurumu.id));
  const ayrik = s.flatMap((x) => {
    const d = SaklananOdr.safeParse(x.denetimSonucu);
    return d.success ? [d.data] : [];
  });
  if (!ayrik.length) return { surum: null, cumleler: [] };
  const son = Math.max(...ayrik.map((x) => x.surum));
  const kodlar = new Set(tumOlcutler(cerceve.olcutler).map((o) => o.kod));
  const cumleler: EksikCumle[] = [];
  for (const x of ayrik.filter((y) => y.surum === son))
    for (const o of x.bolum?.olcutler ?? []) {
      if (!kodlar.has(o.kod)) continue;
      for (const p of o.paragraflar)
        if (p.eksik) for (const c of eksikCumleleri(p.metin)) cumleler.push({ olcutKod: o.kod, metin: c });
    }
  return { surum: son, cumleler };
}

const KurumBolumu = z.object({ eksik: z.boolean() }).loose();

/**
 * Kurum kapsamındaki raporların eksikleri: en son KİDR ve programın biriminin en son BİDR'si. Her bölümün son
 * sürümü okunur; EKSİK işaretli bölümde "[EKSİK: …]" cümleleri, yoksa bölüm metninin başı soru üretir.
 * Yalnız seçilen çerçevede bulunan ölçüt kodları alınır.
 */
async function kurumEksikleri(tx: Islem, birimId: string, cerceve: Cerceve): Promise<EksikCumle[]> {
  const kodlar = new Set(tumOlcutler(cerceve.olcutler).map((o) => o.kod));
  const raporlar = await tx
    .select()
    .from(sema.rapor)
    .where(inArray(sema.rapor.tur, ["kidr", "bidr"]))
    .orderBy(desc(sema.rapor.olusturma), desc(sema.rapor.id));
  const secilen = [
    raporlar.find((r) => r.tur === "kidr"),
    raporlar.find((r) => r.tur === "bidr" && (r.kapsam as { id?: unknown }).id === birimId),
  ].filter((r): r is (typeof raporlar)[number] => Boolean(r));
  const sonuc: EksikCumle[] = [];
  for (const r of secilen) {
    const satir = await tx
      .select()
      .from(sema.raporBolumuSurumu)
      .where(eq(sema.raporBolumuSurumu.raporId, r.id))
      .orderBy(asc(sema.raporBolumuSurumu.olusturma), asc(sema.raporBolumuSurumu.id));
    const oncekiler = new Set(satir.flatMap((x) => (x.oncekiSurumId ? [x.oncekiSurumId] : [])));
    for (const x of satir) {
      if (oncekiler.has(x.id) || !x.bolumKodu || !kodlar.has(x.bolumKodu)) continue;
      const d = KurumBolumu.safeParse(x.denetimSonucu);
      const cumleler = eksikCumleleri(x.metin ?? "");
      if (cumleler.length) for (const c of cumleler) sonuc.push({ olcutKod: x.bolumKodu, metin: c });
      else if (d.success && d.data.eksik)
        sonuc.push({
          olcutKod: x.bolumKodu,
          metin: `${r.tur === "kidr" ? "KİDR" : "BİDR"} bölümü EKSİK: ${(x.metin ?? "").replace(/\s+/gu, " ").trim().slice(0, 160)}`,
        });
    }
  }
  return sonuc;
}

/** Saklanan son model önerileri (günlükte `saha.yz_onerileri`; yalnız eklenir, son kayıt geçerlidir). */
async function sakliOneriler(tx: Islem, programId: string, cerceveKod: string) {
  const g = await tx
    .select({ ayrinti: sema.gunluk.ayrinti })
    .from(sema.gunluk)
    .where(
      and(
        eq(sema.gunluk.eylem, "saha.yz_onerileri"),
        eq(sema.gunluk.hedefTuru, "program"),
        eq(sema.gunluk.hedefId, programId),
      ),
    )
    .orderBy(desc(sema.gunluk.sira));
  for (const x of g) {
    const a = SakliOneri.safeParse(x.ayrinti);
    if (a.success && a.data.cerceveKod === cerceveKod) return a.data.oneriler;
  }
  return [];
}

const SakliOneri = z
  .object({
    cerceveKod: z.string(),
    oneriler: z.array(z.object({ olcutKod: z.string(), metin: z.string() })),
  })
  .loose();

type Gerekli = (eylem: Eylem, hedef: { tur: "program" | "ders"; id: string }) => Promise<unknown>;

/**
 * Programda ya da programın bir dersinde yetki arar (öğretim elemanının kapsamı derstir). Hiçbirinde yoksa
 * program için `gerekli` çağrılır; o da 403 verir ve ret günlüğe yazılır.
 */
async function programdaYaDaDersinde(
  tx: Islem,
  d: Denetleyici,
  gerekli: Gerekli,
  eylem: Eylem,
  programId: string,
): Promise<void> {
  if (await d.izinliMi(eylem, { tur: "program", id: programId })) return;
  const dersler = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.programId, programId));
  for (const x of dersler) if (await d.izinliMi(eylem, { tur: "ders", id: x.id })) return;
  await gerekli(eylem, { tur: "program", id: programId });
}

async function programYukle(tx: Islem, programId: string) {
  const [p] = await tx.select().from(sema.program).where(eq(sema.program.id, programId));
  if (!p) throw bulunamadi();
  return p;
}

async function listeKur(tx: Islem, programId: string, cerceve: Cerceve) {
  const p = await programYukle(tx, programId);
  const dersler = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.programId, p.id));
  const kanitlar = await onayliKanitlar(tx, cerceve, p, new Set(dersler.map((d) => d.id)));
  const eksik = await odrEksikleri(tx, p.id, cerceve);
  const kurum = await kurumEksikleri(tx, p.birimId, cerceve);
  const yzOnerileri = await sakliOneriler(tx, p.id, cerceve.kod);
  return { p, kanitlar, eksik: { ...eksik, cumleler: [...eksik.cumleler, ...kurum] }, yzOnerileri };
}

async function provaIsaretleri(tx: Islem, b: ServisBaglami, programId: string, cerceveKod: string) {
  const g = await tx
    .select()
    .from(sema.gunluk)
    .where(and(eq(sema.gunluk.eylem, "saha.prova"), eq(sema.gunluk.aktorId, b.aktor.kisiId)))
    .orderBy(asc(sema.gunluk.sira));
  const sonuc: Record<string, ProvaDurumu> = {};
  for (const x of g) {
    const a = x.ayrinti as { programId?: unknown; cerceveKod?: unknown; durum?: unknown };
    if (a.programId !== programId || a.cerceveKod !== cerceveKod || !x.hedefId) continue;
    if (a.durum === "hazirim" || a.durum === "eksik_var") sonuc[x.hedefId] = a.durum;
  }
  return sonuc;
}

export interface HazirlikSecenegi {
  /** Verilirse model soruların dilini düzeltir ve ölçüte bağlı soru önerir. Politika çağıran tarafta uygulanır. */
  saglayici?: Saglayici;
}

/** Soru listesini, kanıt eşlemesini ve hazırlık oranını kurar. */
export async function hazirla(b: ServisBaglami, girdi: unknown, secenek: HazirlikSecenegi = {}): Promise<SahaDurumu> {
  const g = HazirlikGirdisi.parse(girdi);
  const cerceve = cerceveBul(g.cerceveKod);
  const veri = await islem(b, async (tx, gerekli, d) => {
    await programYukle(tx, g.programId);
    await programdaYaDaDersinde(tx, d, gerekli, "rapor.oku", g.programId);
    const v = await listeKur(tx, g.programId, cerceve);
    return { ...v, prova: await provaIsaretleri(tx, b, g.programId, cerceve.kod) };
  });
  const temel = { cerceve, kanitlar: veri.kanitlar, eksikCumleler: veri.eksik.cumleler };
  // Saklanan model önerileri listede kalır ve prova işareti alabilir; yeni çağrı onları yenisiyle değiştirir.
  let liste = sorulariKur({ ...temel, yzOnerileri: veri.yzOnerileri });
  let yz: SahaDurumu["yz"] = null;
  if (secenek.saglayici) {
    // Modele yalnız soru metni ve ölçüt başlığı gider; kanıt içeriği ve kişi bilgisi gitmez.
    const yzGirdisi = {
      sorular: liste.sorular.map((s) => ({ id: s.id, olcutKod: s.olcutKod, metin: s.metin })),
      olcutler: tumOlcutler(cerceve.olcutler).map((o) => ({ kod: o.kod, baslik: o.baslik })),
    };
    const r = await gorevCalistir(sahaSorulari, yzGirdisi, secenek.saglayici);
    const a = sahaSorulariniAyikla(r.veri, yzGirdisi);
    liste = sorulariKur({
      ...temel,
      yzOnerileri: a.oneriler,
      dilDuzeltmeleri: new Map(a.duzeltmeler.map((d) => [d.soruId, d.metin])),
    });
    yz = { duzeltilen: a.duzeltmeler.length, onerilen: a.oneriler.length, reddedilen: a.reddedilen.length };
    // Ayıklanmış öneriler değiştirilemez günlüğe saklanır (D8-8): prova bu listeyle doğrulanır.
    await islem(b, (tx) =>
      gunlugeYaz(tx, {
        aktor: { tur: "kisi", id: b.aktor.kisiId },
        eylem: "saha.yz_onerileri",
        hedef: { tur: "program", id: g.programId },
        ayrinti: { cerceveKod: cerceve.kod, oneriler: a.oneriler, yol: b.aktor.tur },
        zaman: b.simdi(),
      }),
    );
  }
  await islem(b, (tx) =>
    gunluge(
      tx,
      b,
      "saha.hazirlandi",
      { tur: "program", id: g.programId },
      {
        cerceve: cerceve.kod,
        soru: liste.toplam.soru,
        kanitli: liste.toplam.kanitli,
        yz: yz !== null,
      },
    ),
  );
  return {
    ...liste,
    programId: veri.p.id,
    programAd: veri.p.ad,
    odrSurumu: veri.eksik.surum,
    prova: veri.prova,
    yz,
  };
}

/** Prova işareti. "Eksik var" komisyona görev açar; işaret günlüğe yazılır. */
export async function provaIsaretle(b: ServisBaglami, girdi: unknown): Promise<ProvaSonucu> {
  const g = ProvaGirdisi.parse(girdi);
  const cerceve = cerceveBul(g.cerceveKod);
  return islem(b, async (tx, gerekli, d) => {
    await programYukle(tx, g.programId);
    // Prova görev açar: salt okuma rolleri (gözlemci, değerlendirici) işaret koyamaz.
    await programdaYaDaDersinde(tx, d, gerekli, "kanit.yukle", g.programId);
    const { p, kanitlar, eksik, yzOnerileri } = await listeKur(tx, g.programId, cerceve);
    const liste = sorulariKur({ cerceve, kanitlar, eksikCumleler: eksik.cumleler, yzOnerileri });
    const soru = liste.sorular.find((s) => s.id === g.soruId);
    if (!soru)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Bu soru listede yok. Liste değişmiş olabilir; sayfayı yenileyip yeniden deneyin.",
      );
    let gorevId: string | null = null;
    let zatenVardi = false;
    if (g.durum === "eksik_var") {
      const acik = (await tx.select().from(sema.gorev)).find((x) => {
        const a = x.ayrinti as { sahaSoruId?: unknown; programId?: unknown };
        return a.sahaSoruId === soru.id && a.programId === p.id && x.durum !== "tamam";
      });
      if (acik) {
        gorevId = acik.id;
        zatenVardi = true;
      } else {
        const [yeni] = await tx
          .insert(sema.gorev)
          .values({
            kurumId: b.aktor.kurumId,
            baslik: `Saha ziyareti hazırlığı: ${soru.olcutKod} için eksik var`,
            ayrinti: JSON.parse(
              JSON.stringify({
                ilgili: `${p.ad} saha ziyareti provası`,
                hedefEkip: "komisyon",
                sahaSoruId: soru.id,
                programId: p.id,
                cerceveKod: cerceve.kod,
                olcutKod: soru.olcutKod,
                soru: soru.metin,
                rol: g.rol,
                not: g.not ?? null,
                mevcutKanit: soru.kanitlar.map((k) => k.dosyaAdi),
              }),
            ) as object,
          })
          .returning({ id: sema.gorev.id });
        if (!yeni) throw new Error("Görev eklenemedi.");
        gorevId = yeni.id;
      }
    }
    await gunluge(
      tx,
      b,
      "saha.prova",
      { tur: "saha_sorusu", id: soru.id },
      {
        programId: p.id,
        cerceveKod: cerceve.kod,
        olcutKod: soru.olcutKod,
        rol: g.rol,
        durum: g.durum,
        gorevId,
      },
    );
    return { soruId: soru.id, durum: g.durum, gorevId, zatenVardi };
  });
}
