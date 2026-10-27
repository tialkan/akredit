// Öneri ve karar servisi. Karar insan kararıdır: API anahtarıyla verilemez, karar veren her zaman oturumdaki
// kişidir, günlüğe adıyla, zamanıyla ve dayanağıyla yazılır. Yüksek riskli öneriler toplu onaylanamaz
// (kural burada uygulanır; veritabanı tetikleyicisi son savunma hattıdır).

import { etkinRisk, type OneriTuru } from "@akredit/cekirdek";
import { type Islem, sema } from "@akredit/vt";
import { desc, eq, inArray, isNull } from "drizzle-orm";
import type { z } from "zod";
import { gunluge, type Hedef, islem, type ServisBaglami } from "./baglam.ts";
import { bulunamadi, ServisHatasi } from "./hata.ts";
import { kanitHedefi } from "./kanit.ts";
import {
  type Karar,
  KararGirdisi,
  type OneriGorunumu,
  type Sayfa,
  SayfaGirdisi,
  sayfala,
  TopluKararGirdisi,
} from "./semalar.ts";

type OneriSatiri = typeof sema.oneri.$inferSelect;
type KararSatiri = typeof sema.karar.$inferSelect;
type Gorunum = z.infer<typeof OneriGorunumu>;
type KararCiktisi = z.infer<typeof Karar>;

const TUR_ADI: Record<OneriTuru, string> = {
  kanit_etiketi: "Kanıt etiketi",
  toplanti_tutanagi: "Toplantı tutanağı",
  anket_ozeti: "Anket özeti",
  matris_katkisi: "Matris katkısı",
  soru_cikti_eslemesi: "Soru-çıktı eşlemesi",
  bologna_taslagi: "Bologna taslağı",
  rapor_bolumu: "Rapor bölümü",
  eylem: "Eylem",
  olgunluk_duzeyi: "Olgunluk düzeyi",
  yazma_plani: "Yazma planı",
  dis_gonderim: "Dış gönderim",
};

const insanKarari = (b: ServisBaglami) => {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi(
      "yetki_yok",
      "Onay kararı yalnız oturum açmış kişi tarafından verilir; API anahtarıyla verilemez.",
    );
};

/** Önerinin yetki hedefi ve arayüzde gösterilen konumu (veritabanından, istemciden değil). */
export async function hedefVeKonum(
  tx: Islem,
  kurumId: string,
  o: OneriSatiri,
): Promise<{ hedef: Hedef; konum: string }> {
  const uuid = /^[0-9a-f-]{36}$/iu.test(o.hedefId);
  if (uuid && o.hedefTuru === "ders") {
    const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.id, o.hedefId));
    if (d) return { hedef: { tur: "ders", id: d.id }, konum: `${d.kod} ${d.ad}` };
  }
  if (uuid && o.hedefTuru === "program") {
    const [p] = await tx.select().from(sema.program).where(eq(sema.program.id, o.hedefId));
    if (p) return { hedef: { tur: "program", id: p.id }, konum: p.ad };
  }
  if (uuid && o.hedefTuru === "birim") {
    const [bi] = await tx.select().from(sema.birim).where(eq(sema.birim.id, o.hedefId));
    if (bi) return { hedef: { tur: "birim", id: bi.id }, konum: bi.ad };
  }
  if (uuid && o.hedefTuru === "kanit") {
    const [k] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, o.hedefId));
    if (k) return { hedef: kanitHedefi(kurumId, k.kapsamlar), konum: k.dosyaAdi };
  }
  if (uuid && o.hedefTuru === "cikti") {
    const [c] = await tx.select().from(sema.cikti).where(eq(sema.cikti.id, o.hedefId));
    if (c && (c.tur === "ders" || c.tur === "program")) return { hedef: { tur: c.tur, id: c.sahipId }, konum: c.kod };
  }
  // Yeri bilinmeyen öneri kurum düzeyindedir: yalnız kurum kapsamında yetkili kişi görür ve karar verir.
  return { hedef: { tur: "kurum", id: kurumId }, konum: "Kurum geneli" };
}

function icerikOku(o: OneriSatiri): { baslik: string; metin: string } {
  const i = o.icerik as { baslik?: unknown; metin?: unknown };
  if (i && typeof i.baslik === "string" && typeof i.metin === "string") return { baslik: i.baslik, metin: i.metin };
  return { baslik: TUR_ADI[o.tur], metin: JSON.stringify(o.icerik, null, 2) };
}

function gorunum(o: OneriSatiri, konum: string): Gorunum {
  return {
    id: o.id,
    kurumId: o.kurumId,
    tur: o.tur,
    hedef: { tur: o.hedefTuru, id: o.hedefId },
    icerik: icerikOku(o),
    gerekce: o.gerekce,
    atiflar: Array.isArray(o.atiflar) ? (o.atiflar as Gorunum["atiflar"]) : [],
    guven: o.guven,
    uretici: o.uretici as Record<string, unknown>,
    risk: o.risk,
    olusturma: o.olusturma.toISOString(),
    konum,
  };
}

function kararCiktisi(k: KararSatiri): KararCiktisi {
  return {
    id: k.id,
    oneriId: k.oneriId,
    sonuc: k.sonuc,
    duzeltme: (k.duzeltme as KararCiktisi["duzeltme"]) ?? null,
    kararVeren: k.kararVerenKisiId,
    dayanak:
      k.dayanak === "politika" && k.politikaId ? { tur: "politika", politikaId: k.politikaId } : { tur: "dogrudan" },
    gerekce: k.gerekce,
    zaman: k.zaman.toISOString(),
  };
}

/** Karar bekleyen ve aktörün görebildiği öneriler (en yeni önce). */
export async function bekleyenOneriler(b: ServisBaglami, g: SayfaGirdisi = {}): Promise<Sayfa<Gorunum>> {
  const s = SayfaGirdisi.parse(g);
  return islem(b, async (tx, _gerekli, d) => {
    const satir = await tx
      .select({ o: sema.oneri })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(isNull(sema.karar.id))
      .orderBy(desc(sema.oneri.olusturma), desc(sema.oneri.id));
    const liste: Gorunum[] = [];
    for (const { o } of satir) {
      const { hedef, konum } = await hedefVeKonum(tx, b.aktor.kurumId, o);
      if (await d.izinliMi("oneri.oku", hedef)) liste.push(gorunum(o, konum));
    }
    return sayfala(liste, { sinir: s.sinir, ...(s.imlec ? { imlec: s.imlec } : {}) });
  });
}

/** Aktörün görebildiği önerilere verilmiş kararlar (en yeni önce). */
export async function kararlar(b: ServisBaglami, g: SayfaGirdisi = {}): Promise<Sayfa<KararCiktisi>> {
  const s = SayfaGirdisi.parse(g);
  return islem(b, async (tx, _gerekli, d) => {
    const satir = await tx
      .select({ k: sema.karar, o: sema.oneri })
      .from(sema.karar)
      .innerJoin(sema.oneri, eq(sema.oneri.id, sema.karar.oneriId))
      .orderBy(desc(sema.karar.zaman), desc(sema.karar.id));
    const liste: KararCiktisi[] = [];
    for (const { k, o } of satir) {
      const { hedef } = await hedefVeKonum(tx, b.aktor.kurumId, o);
      if (await d.izinliMi("oneri.oku", hedef)) liste.push(kararCiktisi(k));
    }
    return sayfala(liste, { sinir: s.sinir, ...(s.imlec ? { imlec: s.imlec } : {}) });
  });
}

async function oneriYukle(tx: Islem, idler: string[]): Promise<Map<string, OneriSatiri>> {
  const satir = await tx.select().from(sema.oneri).where(inArray(sema.oneri.id, idler));
  return new Map(satir.map((o) => [o.id, o]));
}

async function kararliIdler(tx: Islem, idler: string[]): Promise<Set<string>> {
  const satir = await tx.select({ id: sema.karar.oneriId }).from(sema.karar).where(inArray(sema.karar.oneriId, idler));
  return new Set(satir.map((x) => x.id));
}

async function kararEkle(
  tx: Islem,
  b: ServisBaglami,
  o: OneriSatiri,
  g: {
    sonuc: KararGirdisi["sonuc"];
    duzeltme?: string | undefined;
    gerekce?: string | undefined;
    sureMs?: number | undefined;
  },
  toplu: boolean,
): Promise<KararCiktisi> {
  const duzeltme = g.sonuc === "duzeltildi" ? { ...icerikOku(o), metin: (g.duzeltme ?? "").trim() } : null;
  const [k] = await tx
    .insert(sema.karar)
    .values({
      kurumId: b.aktor.kurumId,
      oneriId: o.id,
      sonuc: g.sonuc,
      duzeltme,
      kararVerenKisiId: b.aktor.kisiId,
      dayanak: "dogrudan",
      gerekce: g.gerekce?.trim() || null,
      zaman: b.simdi(),
    })
    .returning();
  if (!k) throw new Error("Karar eklenemedi.");
  await gunluge(
    tx,
    b,
    "karar.verildi",
    { tur: "karar", id: k.id },
    {
      oneri: o.id,
      oneriTuru: o.tur,
      risk: etkinRisk(o),
      sonuc: g.sonuc,
      dayanak: "dogrudan",
      toplu,
      ...(g.sureMs !== undefined ? { sureMs: g.sureMs } : {}),
    },
  );
  return kararCiktisi(k);
}

/** Tek öneriye karar: onay, düzeltme ya da ret. */
export async function kararVer(b: ServisBaglami, girdi: unknown): Promise<KararCiktisi> {
  insanKarari(b);
  const g = KararGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const o = (await oneriYukle(tx, [g.oneriId])).get(g.oneriId);
    if (!o) throw bulunamadi();
    const { hedef } = await hedefVeKonum(tx, b.aktor.kurumId, o);
    await gerekli("karar.ver", hedef);
    if ((await kararliIdler(tx, [o.id])).size)
      throw new ServisHatasi("cakisma", "Bu öneriye zaten karar verilmiş. Sayfayı yenileyin.");
    return kararEkle(tx, b, o, g, false);
  });
}

/**
 * Toplu onay. Yalnız düşük ve orta riskli öneriler toplu onaylanır; seçimde yüksek riskli (önerinin ya da
 * türünün riski) bir öneri varsa hiçbiri onaylanmaz. Biri bile geçersizse hiçbiri kaydedilmez (tek işlem).
 */
export async function topluKararVer(b: ServisBaglami, girdi: unknown): Promise<KararCiktisi[]> {
  insanKarari(b);
  const tg = TopluKararGirdisi.parse(girdi);
  const idler = [...new Set(tg.oneriIdleri)];
  const pay = tg.sureMs !== undefined ? Math.round(tg.sureMs / idler.length) : undefined;
  return islem(b, async (tx, gerekli) => {
    const oneriler = await oneriYukle(tx, idler);
    if (oneriler.size !== idler.length) throw bulunamadi();
    if ([...oneriler.values()].some((o) => etkinRisk(o) === "yuksek"))
      throw new ServisHatasi(
        "kural_ihlali",
        "Yüksek riskli öneriler toplu onaylanamaz. Onları tek tek inceleyip onaylayın.",
      );
    if ((await kararliIdler(tx, idler)).size)
      throw new ServisHatasi("cakisma", "Seçilen önerilerden birine zaten karar verilmiş. Sayfayı yenileyin.");
    const sonuc: KararCiktisi[] = [];
    for (const id of idler) {
      const o = oneriler.get(id) as OneriSatiri;
      const { hedef } = await hedefVeKonum(tx, b.aktor.kurumId, o);
      await gerekli("karar.ver", hedef);
      sonuc.push(await kararEkle(tx, b, o, { sonuc: "onaylandi", sureMs: pay }, true));
    }
    return sonuc;
  });
}

/** Panel özeti için: görünür bekleyen önerilerin etkin risk dağılımı. */
export function riskDagilimi(liste: readonly Pick<Gorunum, "tur" | "risk">[]) {
  const r = { dusuk: 0, orta: 0, yuksek: 0 };
  for (const o of liste) r[etkinRisk(o)]++;
  return r;
}
