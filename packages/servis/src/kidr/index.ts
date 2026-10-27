// BİDR, KİDR ve olgunluk değerlendirmesi servisi (İP-20). Akış:
//   1. `bidrDerle`: birimin onaylı kanıt–ölçüt bağlarından BİDR taslağı (her alt ölçüt atıflı ya da EKSİK).
//   2. `kidrDerle`: kurum düzeyi kanıtlar + her birimin en son BİDR'si → KİDR taslağı.
//   3. `olgunlukOnerileriAc`: her alt ölçüt için yüksek riskli `olgunluk_duzeyi` önerisi; yalnız komisyon karar verir
//      (toplu onay, politika ve API anahtarı reddedilir: `oneri.ts`, `onay/motor.ts`, VT tetikleyicisi).
//   4. `gelismeyeAcikYonleriAktar` → `eylem` (PUKÖ planla); `eylemeKanitBagla` izleme kanıtı ekler.
//   5. `raporuDisaAktar`: DOCX + aktarım planı; `gonderimOnerisiAc` dış gönderimi insan kararına açar.

import { docxUret } from "@akredit/belge";
import { ozetHesapla } from "@akredit/cekirdek";
import { type Cerceve, YOKAK_KIDR_TASLAK } from "@akredit/cerceveler";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import {
  aktarimPlani,
  altOlcutler,
  type BidrOzeti,
  type BolumTaslagi,
  bidrBolumleri,
  GelismeyeAcikYonGirdisi,
  izlemeDurumu,
  type KanitKaydi,
  kapsamSayilari,
  kararDuzeyi,
  kidrBolumleri,
  OlgunlukAdayi,
  OlgunlukIcerigi,
  olgunlukOnerisiKur,
  raporDocxModeli,
} from "./derleme.ts";

export * from "./derleme.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");
const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

/** Bu İP'nin kullandığı çerçeve: KİDR yapısı (ölçüt kodları YÖKAK kurumsal ölçütleriyle aynı). */
export const KIDR_CERCEVESI: Cerceve = YOKAK_KIDR_TASLAK;
/** Kanıt bağlarının arandığı çerçeve kodları (VT `cerceve.kod`). */
const CERCEVE_KODLARI = ["yokak-kurumsal", "yokak-kidr"];

export const BidrGirdisi = z.object({ birimId: Kimlik, donemId: Kimlik.optional() }).strict();
export const KidrGirdisi = z.object({ donemId: Kimlik.optional() }).strict();
export const OlgunlukGirdisi = z
  .object({ raporId: Kimlik, adaylar: z.array(z.unknown()).max(500).optional() })
  .strict();

async function kanitKayitlari(tx: Islem): Promise<KanitKaydi[]> {
  const kanitlar = await tx.select().from(sema.kanit);
  if (!kanitlar.length) return [];
  const baglar = await tx
    .select({ kanitId: sema.kanitOlcutBaglantisi.kanitId, kod: sema.olcut.kod })
    .from(sema.kanitOlcutBaglantisi)
    .innerJoin(sema.olcut, eq(sema.olcut.id, sema.kanitOlcutBaglantisi.olcutId))
    .innerJoin(sema.cerceve, eq(sema.cerceve.id, sema.olcut.cerceveId))
    .where(inArray(sema.cerceve.kod, CERCEVE_KODLARI));
  const programlar = await tx.select({ id: sema.program.id, birimId: sema.program.birimId }).from(sema.program);
  const dersler = await tx.select({ id: sema.ders.id, programId: sema.ders.programId }).from(sema.ders);
  const pb = new Map(programlar.map((p) => [p.id, p.birimId]));
  const db = new Map(dersler.map((d) => [d.id, d.programId ? (pb.get(d.programId) ?? null) : null]));
  return kanitlar.map((k) => {
    const kapsamlar = Array.isArray(k.kapsamlar) ? (k.kapsamlar as { tur?: unknown; id?: unknown }[]) : [];
    let birimId: string | null = null;
    for (const c of kapsamlar) {
      if (typeof c.id !== "string") continue;
      const b =
        c.tur === "birim" ? c.id : c.tur === "program" ? pb.get(c.id) : c.tur === "ders" ? db.get(c.id) : undefined;
      if (b) {
        birimId = b;
        break;
      }
    }
    const ayrinti = k.kaynakAyrinti as { baslik?: unknown };
    return {
      id: k.id,
      ozet: k.ozet,
      baslik: typeof ayrinti.baslik === "string" && ayrinti.baslik.trim() ? ayrinti.baslik : k.dosyaAdi,
      olcutKodlari: [...new Set(baglar.filter((x) => x.kanitId === k.id).map((x) => x.kod))].sort(),
      birimId,
    };
  });
}

async function olcutIdleri(tx: Islem): Promise<Map<string, string>> {
  const satir = await tx
    .select({ id: sema.olcut.id, kod: sema.olcut.kod })
    .from(sema.olcut)
    .innerJoin(sema.cerceve, eq(sema.cerceve.id, sema.olcut.cerceveId))
    .where(eq(sema.cerceve.kod, "yokak-kurumsal"));
  return new Map(satir.map((x) => [x.kod, x.id]));
}

async function raporYaz(
  tx: Islem,
  b: ServisBaglami,
  tur: "bidr" | "kidr",
  kapsam: { tur: string; id: string },
  donemId: string | undefined,
  baslik: string,
  bolumler: BolumTaslagi[],
): Promise<string> {
  const [r] = await tx
    .insert(sema.rapor)
    .values({ kurumId: b.aktor.kurumId, tur, kapsam, donemId: donemId ?? null, baslik })
    .returning();
  if (!r) throw new Error("Rapor eklenemedi.");
  const olcutler = await olcutIdleri(tx);
  if (bolumler.length)
    await tx.insert(sema.raporBolumuSurumu).values(
      bolumler.map((x) => ({
        kurumId: b.aktor.kurumId,
        raporId: r.id,
        olcutId: olcutler.get(x.kod) ?? null,
        bolumKodu: x.kod,
        metin: x.metin,
        atiflar: x.kanitIdleri.map((kanitId) => ({ kanitId })),
        denetimSonucu: { ustBolum: x.ustBolum, baslik: x.baslik, eksik: x.eksik },
      })),
    );
  const s = kapsamSayilari(bolumler);
  await gunluge(tx, b, `rapor.${tur}_derlendi`, { tur: "rapor", id: r.id }, { ...s, cerceve: KIDR_CERCEVESI.kod });
  return r.id;
}

async function donemAdi(tx: Islem, donemId: string | undefined): Promise<string> {
  if (!donemId) return "";
  const [d] = await tx.select({ ad: sema.donem.ad }).from(sema.donem).where(eq(sema.donem.id, donemId));
  if (!d)
    throw new ServisHatasi("gecersiz_istek", "Seçilen dönem bulunamadı.", [
      { alan: "donemId", ileti: "Dönem bulunamadı." },
    ]);
  return d.ad;
}

export interface DerlemeSonucu {
  raporId: string;
  altOlcutSayisi: number;
  kanitliAltOlcut: number;
  eksikAltOlcut: number;
  kanitSayisi: number;
}

/** Birimin BİDR taslağı. Her çağrı yeni bir rapor kaydıdır (eski taslak değişmez). */
export async function bidrDerle(b: ServisBaglami, girdi: unknown): Promise<DerlemeSonucu> {
  const g = BidrGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "birim", id: g.birimId });
    const [birim] = await tx.select().from(sema.birim).where(eq(sema.birim.id, g.birimId));
    if (!birim) throw bulunamadi();
    const donem = await donemAdi(tx, g.donemId);
    const bolumler = bidrBolumleri(KIDR_CERCEVESI, birim, await kanitKayitlari(tx));
    const raporId = await raporYaz(
      tx,
      b,
      "bidr",
      { tur: "birim", id: birim.id },
      g.donemId,
      `${birim.ad} Birim İç Değerlendirme Raporu${donem ? ` ${donem}` : ""}`,
      bolumler,
    );
    return { raporId, ...kapsamSayilari(bolumler) };
  });
}

type BolumSatiri = typeof sema.raporBolumuSurumu.$inferSelect;

/** Raporun her bölüm kodu için geçerli (öncesi olmayan en yeni) sürümü. */
async function gecerliBolumler(tx: Islem, raporId: string): Promise<BolumSatiri[]> {
  const satir = await tx
    .select()
    .from(sema.raporBolumuSurumu)
    .where(eq(sema.raporBolumuSurumu.raporId, raporId))
    .orderBy(asc(sema.raporBolumuSurumu.olusturma), asc(sema.raporBolumuSurumu.id));
  const oncekiler = new Set(satir.flatMap((x) => (x.oncekiSurumId ? [x.oncekiSurumId] : [])));
  return satir.filter((x) => !oncekiler.has(x.id));
}

const atifIdleri = (x: BolumSatiri) =>
  (Array.isArray(x.atiflar) ? (x.atiflar as { kanitId?: unknown }[]) : []).flatMap((a) =>
    typeof a.kanitId === "string" ? [a.kanitId] : [],
  );

/** Kurumun KİDR taslağı: birimlerin en son BİDR'leri ve kurum düzeyi kanıtlar birleşir. */
export async function kidrDerle(b: ServisBaglami, girdi: unknown = {}): Promise<DerlemeSonucu> {
  const g = KidrGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "kurum", id: b.aktor.kurumId });
    const [kurum] = await tx.select().from(sema.kurum).where(eq(sema.kurum.id, b.aktor.kurumId));
    if (!kurum) throw bulunamadi();
    const donem = await donemAdi(tx, g.donemId);
    const birimler = await tx.select({ id: sema.birim.id, ad: sema.birim.ad }).from(sema.birim);
    const raporlar = await tx
      .select()
      .from(sema.rapor)
      .where(eq(sema.rapor.tur, "bidr"))
      .orderBy(desc(sema.rapor.olusturma), desc(sema.rapor.id));
    const bidrler: BidrOzeti[] = [];
    for (const birim of birimler) {
      const r = raporlar.find((x) => {
        const k = x.kapsam as { id?: unknown };
        return k.id === birim.id && (!g.donemId || x.donemId === g.donemId);
      });
      if (!r) continue;
      bidrler.push({
        raporId: r.id,
        birimId: birim.id,
        birimAdi: birim.ad,
        bolumler: (await gecerliBolumler(tx, r.id)).map((x) => ({
          kod: x.bolumKodu ?? "",
          metin: x.metin,
          kanitIdleri: atifIdleri(x),
        })),
      });
    }
    const bolumler = kidrBolumleri(KIDR_CERCEVESI, kurum.ad, await kanitKayitlari(tx), birimler, bidrler);
    const raporId = await raporYaz(
      tx,
      b,
      "kidr",
      { tur: "kurum", id: kurum.id },
      g.donemId,
      `${kurum.ad} Kurum İç Değerlendirme Raporu${donem ? ` ${donem}` : ""}`,
      bolumler,
    );
    return { raporId, ...kapsamSayilari(bolumler) };
  });
}

async function raporYukle(tx: Islem, raporId: string) {
  const [r] = await tx.select().from(sema.rapor).where(eq(sema.rapor.id, raporId));
  if (!r || (r.tur !== "kidr" && r.tur !== "bidr")) throw bulunamadi();
  const k = r.kapsam as { tur?: unknown; id?: unknown };
  const hedef =
    r.tur === "bidr" && typeof k.id === "string"
      ? { tur: "birim" as const, id: k.id }
      : { tur: "kurum" as const, id: r.kurumId };
  return { r, hedef };
}

/**
 * Raporun her alt ölçütü için olgunluk önerisi açar (yalnız henüz önerisi olmayanlar). Öneri yüksek risklidir;
 * politika uygulanmaz, toplu onaylanamaz. Adaylar (model ya da kişi) zod ile doğrulanır; geçersizi atlanır.
 */
export async function olgunlukOnerileriAc(
  b: ServisBaglami,
  girdi: unknown,
): Promise<{ oneriIdleri: string[]; atlananAday: number }> {
  const g = OlgunlukGirdisi.parse(girdi);
  const adaylar = new Map<string, OlgunlukAdayi>();
  let atlanan = 0;
  for (const a of g.adaylar ?? []) {
    const p = OlgunlukAdayi.safeParse(a);
    if (p.success) adaylar.set(p.data.olcutKod, p.data);
    else atlanan++;
  }
  return islem(b, async (tx, gerekli) => {
    const { r, hedef } = await raporYukle(tx, g.raporId);
    await gerekli("rapor.duzenle", hedef);
    const mevcut = await tx
      .select({ icerik: sema.oneri.icerik })
      .from(sema.oneri)
      .where(
        and(eq(sema.oneri.tur, "olgunluk_duzeyi"), eq(sema.oneri.hedefTuru, hedef.tur === "birim" ? "birim" : "rapor")),
      );
    const acik = new Set(
      mevcut.flatMap((m) => {
        const p = OlgunlukIcerigi.safeParse(m.icerik);
        return p.success && p.data.raporId === r.id ? [p.data.olcutKod] : [];
      }),
    );
    const idler: string[] = [];
    for (const bolum of await gecerliBolumler(tx, r.id)) {
      const kod = bolum.bolumKodu ?? "";
      if (!kod || acik.has(kod)) continue;
      const ayr = (bolum.denetimSonucu ?? {}) as { baslik?: unknown };
      const o = olgunlukOnerisiKur({
        raporId: r.id,
        bolum: { kod, baslik: typeof ayr.baslik === "string" ? ayr.baslik : kod, kanitIdleri: atifIdleri(bolum) },
        rubrik: KIDR_CERCEVESI.olgunlukDuzeyleri,
        aday: adaylar.get(kod),
      });
      const [s] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: b.aktor.kurumId,
          tur: "olgunluk_duzeyi",
          hedefTuru: hedef.tur === "birim" ? "birim" : "rapor",
          hedefId: hedef.tur === "birim" ? hedef.id : r.id,
          icerik: json(o.icerik),
          gerekce: o.gerekce,
          atiflar: o.atiflar,
          guven: null,
          ureticiTuru: adaylar.has(kod) ? "yz" : "kural",
          uretici: { kural: "kidr.olgunluk", surum: "1", aday: adaylar.has(kod) },
          risk: "yuksek",
        })
        .returning();
      if (!s) throw new Error("Öneri eklenemedi.");
      idler.push(s.id);
    }
    await gunluge(tx, b, "rapor.olgunluk_onerileri_acildi", { tur: "rapor", id: r.id }, { sayi: idler.length });
    return { oneriIdleri: idler, atlananAday: atlanan };
  });
}

export interface OlgunlukDurumu {
  olcutKod: string;
  oneriId: string;
  onerilenDuzey: number | null;
  karar: "bekliyor" | "onaylandi" | "duzeltildi" | "reddedildi";
  kesinDuzey: number | null;
  kararVerenKisiId: string | null;
}

async function olgunlukDurumlari(tx: Islem, raporId: string): Promise<OlgunlukDurumu[]> {
  const satir = await tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(eq(sema.oneri.tur, "olgunluk_duzeyi"))
    .orderBy(asc(sema.oneri.olusturma), asc(sema.oneri.id));
  const sonuc: OlgunlukDurumu[] = [];
  for (const { o, k } of satir) {
    const p = OlgunlukIcerigi.safeParse(o.icerik);
    if (!p.success || p.data.raporId !== raporId) continue;
    const duzeltme = (k?.duzeltme as { metin?: unknown } | null)?.metin;
    sonuc.push({
      olcutKod: p.data.olcutKod,
      oneriId: o.id,
      onerilenDuzey: p.data.onerilenDuzey,
      karar: k ? k.sonuc : "bekliyor",
      kesinDuzey: kararDuzeyi(
        p.data,
        k ? { sonuc: k.sonuc, duzeltmeMetni: typeof duzeltme === "string" ? duzeltme : null } : null,
      ),
      kararVerenKisiId: k?.kararVerenKisiId ?? null,
    });
  }
  return sonuc;
}

export async function olgunlukDurumu(b: ServisBaglami, raporId: string): Promise<OlgunlukDurumu[]> {
  return islem(b, async (tx, gerekli) => {
    if (!Kimlik.safeParse(raporId).success) throw bulunamadi();
    const { r, hedef } = await raporYukle(tx, raporId);
    await gerekli("rapor.oku", hedef);
    return olgunlukDurumlari(tx, r.id);
  });
}

/** Dış değerlendirme raporundaki gelişmeye açık yönleri eylem planına aktarır (kişinin yazdığı metinle). */
export async function gelismeyeAcikYonleriAktar(b: ServisBaglami, girdi: unknown): Promise<{ eylemIdleri: string[] }> {
  const g = GelismeyeAcikYonGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "kurum", id: b.aktor.kurumId });
    const [k] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.id, g.kaynakKanitId));
    if (!k)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Dış değerlendirme raporu kanıtlarda bulunamadı. Önce raporu yükleyin.",
        [{ alan: "kaynakKanitId", ileti: "Kanıt bulunamadı." }],
      );
    const idler: string[] = [];
    for (const y of g.yonler) {
      const [e] = await tx
        .insert(sema.eylem)
        .values({
          kurumId: b.aktor.kurumId,
          kaynak: { tur: "dis_degerlendirme", id: k.id, ...(y.olcutKod ? { olcutKod: y.olcutKod } : {}) },
          tanim: y.metin,
          sorumluKisiId: y.sorumluKisiId ?? null,
          hedefTarih: y.hedefTarih ? new Date(`${y.hedefTarih}T00:00:00Z`) : null,
          pukoAsamasi: "planla",
        })
        .returning();
      if (!e) throw new Error("Eylem eklenemedi.");
      idler.push(e.id);
    }
    await gunluge(tx, b, "eylem.dis_degerlendirmeden_aktarildi", { tur: "kanit", id: k.id }, { sayi: idler.length });
    return { eylemIdleri: idler };
  });
}

export const EylemKanitGirdisi = z.object({ eylemId: Kimlik, kanitId: Kimlik }).strict();

/** Eyleme izleme kanıtı bağlar (kanıt eklenir, çıkarılmaz) ve PUKÖ aşamasını "kontrol et"e alır. */
export async function eylemeKanitBagla(b: ServisBaglami, girdi: unknown): Promise<void> {
  const g = EylemKanitGirdisi.parse(girdi);
  await islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "kurum", id: b.aktor.kurumId });
    const [e] = await tx.select().from(sema.eylem).where(eq(sema.eylem.id, g.eylemId));
    const [k] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.id, g.kanitId));
    if (!e || !k) throw bulunamadi();
    if (e.kanitIdleri.includes(k.id)) return;
    await tx
      .update(sema.eylem)
      .set({
        kanitIdleri: [...e.kanitIdleri, k.id],
        pukoAsamasi: e.pukoAsamasi === "planla" || e.pukoAsamasi === "uygula" ? "kontrol_et" : e.pukoAsamasi,
      })
      .where(eq(sema.eylem.id, e.id));
    await gunluge(tx, b, "eylem.kanit_baglandi", { tur: "eylem", id: e.id }, { kanit: k.id });
  });
}

export interface EylemIzleme {
  id: string;
  tanim: string;
  kaynakKanitId: string;
  hedefTarih: string | null;
  pukoAsamasi: string;
  kanitIdleri: string[];
  durum: ReturnType<typeof izlemeDurumu>;
}

async function eylemListesi(tx: Islem, simdi: Date): Promise<EylemIzleme[]> {
  const satir = await tx.select().from(sema.eylem).orderBy(asc(sema.eylem.olusturma), asc(sema.eylem.id));
  return satir.flatMap((e) => {
    const k = e.kaynak as { tur?: unknown; id?: unknown };
    if (k.tur !== "dis_degerlendirme" || typeof k.id !== "string") return [];
    return [
      {
        id: e.id,
        tanim: e.tanim,
        kaynakKanitId: k.id,
        hedefTarih: e.hedefTarih ? e.hedefTarih.toISOString().slice(0, 10) : null,
        pukoAsamasi: e.pukoAsamasi,
        kanitIdleri: e.kanitIdleri,
        durum: izlemeDurumu(e, simdi),
      },
    ];
  });
}

export async function eylemIzleme(b: ServisBaglami): Promise<EylemIzleme[]> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.oku", { tur: "kurum", id: b.aktor.kurumId });
    return eylemListesi(tx, b.simdi());
  });
}

export interface DisaAktarimSonucu {
  dosyaAdi: string;
  mime: string;
  ozet: string;
  icerikBase64: string;
  plan: ReturnType<typeof aktarimPlani>;
}

/** DOCX dışa aktarım (her istekte kayıtlardan deterministik) ve YÖKAK aktarım planı. */
export async function raporuDisaAktar(b: ServisBaglami, raporId: string): Promise<DisaAktarimSonucu> {
  if (!Kimlik.safeParse(raporId).success) throw bulunamadi();
  const veri = await islem(b, async (tx, gerekli) => {
    const { r, hedef } = await raporYukle(tx, raporId);
    await gerekli("rapor.oku", hedef);
    const [kurum] = await tx.select().from(sema.kurum).where(eq(sema.kurum.id, b.aktor.kurumId));
    const donem = r.donemId ? await donemAdi(tx, r.donemId) : "";
    const bolumler = (await gecerliBolumler(tx, r.id)).map((x) => {
      const d = (x.denetimSonucu ?? {}) as { ustBolum?: unknown; baslik?: unknown; eksik?: unknown };
      return {
        kod: x.bolumKodu ?? "",
        baslik: typeof d.baslik === "string" ? d.baslik : (x.bolumKodu ?? ""),
        ustBolum: typeof d.ustBolum === "string" ? d.ustBolum : "",
        metin: x.metin,
        eksik: atifIdleri(x).length === 0,
      };
    });
    const sira = new Map(altOlcutler(KIDR_CERCEVESI).map((x, i) => [x.olcut.kod, i]));
    bolumler.sort((x, y) => (sira.get(x.kod) ?? 1e6) - (sira.get(y.kod) ?? 1e6));
    const durumlar = await olgunlukDurumlari(tx, r.id);
    const eylemler = r.tur === "kidr" ? await eylemListesi(tx, b.simdi()) : [];
    await gunluge(tx, b, "rapor.disa_aktarildi", { tur: "rapor", id: r.id }, { bicim: "docx" });
    return { r, kurumAdi: kurum?.ad ?? "", donem, bolumler, durumlar, eylemler };
  });
  const duzeyler: Record<string, number | null> = {};
  for (const d of veri.durumlar) duzeyler[d.olcutKod] = d.kesinDuzey;
  const bekleyen = veri.bolumler.filter(
    (x) => !veri.durumlar.some((d) => d.olcutKod === x.kod && d.karar !== "bekliyor"),
  ).length;
  const model = raporDocxModeli({
    baslik:
      veri.r.baslik ?? (veri.r.tur === "kidr" ? "Kurum İç Değerlendirme Raporu" : "Birim İç Değerlendirme Raporu"),
    kurumAdi: veri.kurumAdi,
    donem: veri.donem,
    cerceve: KIDR_CERCEVESI,
    bolumler: veri.bolumler,
    duzeyler,
    eylemler: veri.eylemler.map((e) => ({ tanim: e.tanim, durum: e.durum, hedefTarih: e.hedefTarih })),
    onaylandi: false,
  });
  const bayt = await docxUret(model);
  return {
    dosyaAdi: `${veri.r.tur}-${veri.r.id.slice(0, 8)}.docx`,
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ozet: ozetHesapla(bayt),
    icerikBase64: Buffer.from(bayt).toString("base64"),
    plan: aktarimPlani({
      eksikAltOlcut: veri.bolumler.filter((x) => x.eksik).length,
      kararBekleyenDuzey: bekleyen,
      cerceveDogrulandi: KIDR_CERCEVESI.dogrulandi,
    }),
  };
}

/** Dış kuruma gönderimi insan kararına açar (yüksek risk). Sistem hiçbir şey göndermez. */
export async function gonderimOnerisiAc(b: ServisBaglami, raporId: string): Promise<{ oneriId: string }> {
  if (!Kimlik.safeParse(raporId).success) throw bulunamadi();
  return islem(b, async (tx, gerekli) => {
    const { r } = await raporYukle(tx, raporId);
    if (r.tur !== "kidr") throw new ServisHatasi("kural_ihlali", "Yalnız kurum iç değerlendirme raporu gönderilir.");
    await gerekli("rapor.gonder", { tur: "kurum", id: b.aktor.kurumId });
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "dis_gonderim",
        hedefTuru: "rapor",
        hedefId: r.id,
        icerik: {
          baslik: "KİDR'yi YÖKAK sistemine gönder",
          metin: "Kurum adına beyan: raporu siz gönderirsiniz.",
          raporId: r.id,
        },
        gerekce: "Dış kuruma son gönderim insan kararıdır.",
        ureticiTuru: "kural",
        uretici: { kural: "kidr.gonderim", surum: "1" },
        risk: "yuksek",
      })
      .returning();
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunluge(tx, b, "rapor.gonderim_onerisi_acildi", { tur: "rapor", id: r.id }, { oneri: o.id });
    return { oneriId: o.id };
  });
}
