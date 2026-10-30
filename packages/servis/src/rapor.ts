// Rapor ve süreç servisi (salt okunur). Rapor bölümünün geçerli sürümü, başka bir sürümün öncesi olmayan
// en yeni sürümdür. Atıflar metinden (`[K:özet …]`) ayrıştırılır; kanıta bağlanamayan paragraf `EKSİK`tir.

import { atiflariAyristir, eksikleriAyristir } from "@akredit/cekirdek";
import { type Islem, sema } from "@akredit/vt";
import { asc, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { type Hedef, islem, type ServisBaglami } from "./baglam.ts";
import { kabulBekleyenDisKanitlar } from "./belge-istegi/index.ts";
import { bulunamadi } from "./hata.ts";
import type { KanitAtfi, Rapor, SurecGorevi } from "./semalar.ts";

type RaporC = z.infer<typeof Rapor>;
type GorevC = z.infer<typeof SurecGorevi>;

const RAPOR_ADI: Record<string, string> = {
  kidr: "Kurum İç Değerlendirme Raporu",
  bidr: "Birim İç Değerlendirme Raporu",
  odr: "Öz Değerlendirme Raporu",
  ders_dosyasi: "Ders dosyası",
  olcme_raporu: "Ölçme raporu",
  anket_raporu: "Anket raporu",
  eylem_plani: "Eylem planı",
  ziyaret_paketi: "Ziyaret paketi",
};

function raporHedefi(kurumId: string, kapsam: unknown): Hedef {
  const k = kapsam as { tur?: unknown; id?: unknown } | null;
  if (k && (k.tur === "birim" || k.tur === "program" || k.tur === "ders") && typeof k.id === "string")
    return { tur: k.tur, id: k.id };
  return { tur: "kurum", id: kurumId };
}

/**
 * Paragraf atıflarını kurumun kanıtlarına çözer (özet önekiyle). Kabul edilmemiş dış birim kanıtına atıf
 * çözülmemiş sayılır, paragraf `EKSİK` olur (`atifaUygunMu` ile aynı kural).
 */
function paragraflar(
  metin: string,
  kanitlar: { id: string; ozet: string }[],
  uygunDegil: Set<string>,
): RaporC["bolumler"][number]["paragraflar"] {
  return metin
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const atiflar: z.infer<typeof KanitAtfi>[] = [];
      let cozulemeyen = false;
      for (const a of atiflariAyristir(p)) {
        const k = kanitlar.filter((x) => x.ozet.startsWith(a.ozetOneki));
        if (k.length !== 1 || uygunDegil.has((k[0] as { id: string }).id)) {
          cozulemeyen = true;
          continue;
        }
        atiflar.push({
          kanitId: (k[0] as { id: string }).id,
          ...(a.capa ? { capa: a.capa } : {}),
          ...(a.alinti ? { alinti: a.alinti } : {}),
        });
      }
      const eksik = eksikleriAyristir(p).length > 0 || atiflar.length === 0 || cozulemeyen;
      return { metin: p, atiflar, eksik };
    });
}

async function raporGorunumu(tx: Islem, r: typeof sema.rapor.$inferSelect): Promise<RaporC> {
  const surumler = await tx
    .select({ s: sema.raporBolumuSurumu, olcutKod: sema.olcut.kod, olcutBaslik: sema.olcut.baslik })
    .from(sema.raporBolumuSurumu)
    .leftJoin(sema.olcut, eq(sema.olcut.id, sema.raporBolumuSurumu.olcutId))
    .where(eq(sema.raporBolumuSurumu.raporId, r.id))
    .orderBy(asc(sema.raporBolumuSurumu.olusturma));
  const oncekiler = new Set(surumler.flatMap((x) => (x.s.oncekiSurumId ? [x.s.oncekiSurumId] : [])));
  const kanitlar = await tx.select({ id: sema.kanit.id, ozet: sema.kanit.ozet }).from(sema.kanit);
  const uygunDegil = await kabulBekleyenDisKanitlar(tx);
  const [donem] = r.donemId
    ? await tx.select({ ad: sema.donem.ad }).from(sema.donem).where(eq(sema.donem.id, r.donemId))
    : [];
  return {
    id: r.id,
    ad: r.baslik ?? RAPOR_ADI[r.tur] ?? r.tur,
    donem: donem?.ad ?? "",
    durum: "taslak",
    bolumler: surumler
      .filter((x) => !oncekiler.has(x.s.id))
      .map((x) => ({
        id: x.s.id,
        baslik: x.olcutBaslik ?? x.s.bolumKodu ?? "Bölüm",
        olcut: x.olcutKod ?? x.s.bolumKodu ?? "",
        paragraflar: paragraflar(x.s.metin, kanitlar, uygunDegil),
      })),
  };
}

export async function raporlar(b: ServisBaglami): Promise<RaporC[]> {
  return islem(b, async (tx, _g, d) => {
    const satir = await tx.select().from(sema.rapor).orderBy(desc(sema.rapor.olusturma));
    const gorunur = await d.suz("rapor.oku", satir, (r) => raporHedefi(b.aktor.kurumId, r.kapsam));
    const sonuc: RaporC[] = [];
    for (const r of gorunur) sonuc.push(await raporGorunumu(tx, r));
    return sonuc;
  });
}

export async function rapor(b: ServisBaglami, id: string): Promise<RaporC> {
  return islem(b, async (tx, gerekli) => {
    const [r] = /^[0-9a-f-]{36}$/iu.test(id) ? await tx.select().from(sema.rapor).where(eq(sema.rapor.id, id)) : [];
    if (!r) throw bulunamadi();
    await gerekli("rapor.oku", raporHedefi(b.aktor.kurumId, r.kapsam));
    return raporGorunumu(tx, r);
  });
}

/**
 * Süreç görevleri: kişiye atananlar her zaman; kurum düzeyinde öneri okuma yetkisi olan herkes bütün görevleri
 * görür. Son tarih, göreve bağlı en erken tarihtir.
 */
export async function surecler(b: ServisBaglami): Promise<GorevC[]> {
  return islem(b, async (tx, _g, d) => {
    const hepsi = await d.izinliMi("oneri.oku", { tur: "kurum", id: b.aktor.kurumId });
    const satir = await tx
      .select({ g: sema.gorev, kisi: sema.kisi.adSoyad })
      .from(sema.gorev)
      .leftJoin(sema.kisi, eq(sema.kisi.id, sema.gorev.atananKisiId));
    const tarihler = await tx.select().from(sema.sonTarih).orderBy(asc(sema.sonTarih.tarih));
    const sonuc: GorevC[] = [];
    for (const { g, kisi } of satir) {
      if (!hepsi && g.atananKisiId !== b.aktor.kisiId) continue;
      const t = tarihler.find((x) => x.gorevId === g.id);
      const ayrinti = g.ayrinti as { ilgili?: unknown };
      sonuc.push({
        id: g.id,
        baslik: g.baslik,
        sonTarih: t ? t.tarih.toISOString().slice(0, 10) : "",
        sorumlu: kisi ?? "Atanmadı",
        durum: g.durum === "tamam" ? "tamam" : g.durum === "devam" ? "devam" : "bekliyor",
        ilgili: typeof ayrinti.ilgili === "string" ? ayrinti.ilgili : "",
      });
    }
    return sonuc.sort((a, b) => (a.sonTarih || "9999").localeCompare(b.sonTarih || "9999"));
  });
}
