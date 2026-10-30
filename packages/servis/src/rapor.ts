// Rapor ve süreç servisi (salt okunur). Rapor bölümünün geçerli sürümü, başka bir sürümün öncesi olmayan
// en yeni sürümdür. Atıflar metinden (`[K:özet …]`) ayrıştırılır; kanıta bağlanamayan paragraf `EKSİK`tir.

import { atiflariAyristir, type DilBulgusu, dilDenetle, eksikleriAyristir, hesapAtiflari } from "@akredit/cekirdek";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import { gunluge, type Hedef, islem, type ServisBaglami } from "./baglam.ts";
import { kabulBekleyenDisKanitlar } from "./belge-istegi/index.ts";
import { bulunamadi } from "./hata.ts";
import { kanit as kanitAyrintisi } from "./kanit.ts";
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
      // Hesap atfı ([H:…], İP-19) deterministik hesaba bağlıdır; paragrafı tek başına kanıtlı kılar.
      const hesapli = hesapAtiflari(p).length > 0;
      const eksik = eksikleriAyristir(p).length > 0 || (atiflar.length === 0 && !hesapli) || cozulemeyen;
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

// ---------------------------------------------------------------- İP-44: dil denetimi ve kanıt paneli

/** Dil bulgusu önerisinin üreticisi; aynı bulgu bir kez öneri olur. */
const DIL_URETICI = { kural: "rapor-dil-denetimi", surum: "1" } as const;
const DIL_HEDEF_TURU = "rapor_bolumu_surumu";

export interface BolumDilBulgusu extends DilBulgusu {
  bolumId: string;
  bolumBasligi: string;
  /** Bulgu öneri olarak kaydedildiyse öneri kimliği. */
  oneriId: string | null;
  /** Kararı verilmemiş (kaydedilmemiş bulgu da açıktır). */
  acik: boolean;
}

export interface DilDenetimiSonucu {
  raporId: string;
  bulgular: BolumDilBulgusu[];
  /** Kararı verilmemiş (açık) yüksek önemli bulgu sayısı; yayım bu varken uyarı gösterir. */
  acikYuksek: number;
  /** Yayım uyarısı (Katman 2 karar ekranı için); açık yüksek bulgu yoksa null. */
  yayimUyarisi: string | null;
}

function bulguAnahtari(bolumId: string, b: Pick<DilBulgusu, "kural" | "paragraf" | "cumle" | "ifade">): string {
  return `${bolumId}|${b.kural}|${b.paragraf}|${b.cumle}|${b.ifade}`;
}

async function dilDenetimiYap(tx: Islem, r: typeof sema.rapor.$inferSelect): Promise<DilDenetimiSonucu> {
  const g = await raporGorunumu(tx, r);
  const secenek = { ...(g.donem ? { donem: g.donem } : {}), raporTarihi: r.olusturma.toISOString().slice(0, 10) };
  const ham: { bolumId: string; bolumBasligi: string; b: DilBulgusu }[] = [];
  for (const bolum of g.bolumler) {
    const metin = bolum.paragraflar.map((p) => p.metin).join("\n\n");
    for (const b of dilDenetle(metin, secenek)) ham.push({ bolumId: bolum.id, bolumBasligi: bolum.baslik, b });
  }
  const bolumIdleri = g.bolumler.map((b) => b.id);
  const kayitli = bolumIdleri.length
    ? await tx
        .select({ id: sema.oneri.id, icerik: sema.oneri.icerik, karar: sema.karar.id })
        .from(sema.oneri)
        .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
        .where(
          and(
            eq(sema.oneri.tur, "rapor_bolumu"),
            eq(sema.oneri.hedefTuru, DIL_HEDEF_TURU),
            inArray(sema.oneri.hedefId, bolumIdleri),
          ),
        )
    : [];
  const oneriler = new Map<string, { id: string; acik: boolean }>();
  for (const o of kayitli) {
    const i = o.icerik as { anahtar?: unknown };
    if (typeof i.anahtar === "string") oneriler.set(i.anahtar, { id: o.id, acik: o.karar === null });
  }
  const bulgular = ham.map(({ bolumId, bolumBasligi, b }) => {
    const o = oneriler.get(bulguAnahtari(bolumId, b));
    return { ...b, bolumId, bolumBasligi, oneriId: o?.id ?? null, acik: o ? o.acik : true };
  });
  const acikYuksek = bulgular.filter((b) => b.onem === "yuksek" && b.acik).length;
  return {
    raporId: r.id,
    bulgular,
    acikYuksek,
    yayimUyarisi: acikYuksek
      ? `Raporda kararı verilmemiş ${acikYuksek} yüksek önemli dil bulgusu var. Yayımlamadan önce bulguları inceleyin.`
      : null,
  };
}

async function raporSatiri(tx: Islem, id: string) {
  const [r] = /^[0-9a-f-]{36}$/iu.test(id) ? await tx.select().from(sema.rapor).where(eq(sema.rapor.id, id)) : [];
  if (!r) throw bulunamadi();
  return r;
}

/** Raporun geçerli bölümlerini dil kurallarıyla denetler (salt okunur, modelsiz). */
export async function dilDenetimi(b: ServisBaglami, id: string): Promise<DilDenetimiSonucu> {
  return islem(b, async (tx, gerekli) => {
    const r = await raporSatiri(tx, id);
    await gerekli("rapor.oku", raporHedefi(b.aktor.kurumId, r.kapsam));
    return dilDenetimiYap(tx, r);
  });
}

/**
 * Dil bulgularını rapor kaydına öneri olarak ekler (yalnız yeni bulgular). Öneri metni düzeltmez, yalnız
 * işaretler; kişi kabul eder ya da gerekçesiyle reddeder.
 */
export async function dilBulgulariniKaydet(
  b: ServisBaglami,
  id: string,
): Promise<DilDenetimiSonucu & { eklenen: number }> {
  return islem(b, async (tx, gerekli) => {
    const r = await raporSatiri(tx, id);
    await gerekli("rapor.duzenle", raporHedefi(b.aktor.kurumId, r.kapsam));
    const once = await dilDenetimiYap(tx, r);
    const yeni = once.bulgular.filter((x) => x.oneriId === null);
    if (yeni.length)
      await tx.insert(sema.oneri).values(
        yeni.map((x) => ({
          kurumId: b.aktor.kurumId,
          tur: "rapor_bolumu" as const,
          hedefTuru: DIL_HEDEF_TURU,
          hedefId: x.bolumId,
          icerik: {
            tur: "dil_bulgusu",
            baslik: `Dil denetimi: ${x.bolumBasligi}, paragraf ${x.paragraf}, cümle ${x.cumle}`,
            metin: x.aciklama,
            raporId: r.id,
            kural: x.kural,
            onem: x.onem,
            ifade: x.ifade,
            paragraf: x.paragraf,
            cumle: x.cumle,
            anahtar: bulguAnahtari(x.bolumId, x),
          },
          gerekce: "Rapor dili deterministik kurallarla denetlendi. Metin değiştirilmedi.",
          atiflar: [],
          ureticiTuru: "kural" as const,
          uretici: DIL_URETICI,
          // Rapor bölümü önerisinin türü yüksek risklidir (VT kuralı): karar her zaman insanda, politikayla
          // kapanmaz. Bulgunun kendi önemi içerikte (`onem`) durur.
          risk: "yuksek" as const,
        })),
      );
    await gunluge(
      tx,
      b,
      "rapor.dil_denetimi",
      { tur: "rapor", id: r.id },
      {
        bulgu: once.bulgular.length,
        eklenen: yeni.length,
        acikYuksek: once.acikYuksek,
      },
    );
    return { ...(await dilDenetimiYap(tx, r)), eklenen: yeni.length };
  });
}

export interface PanelKaniti {
  id: string;
  baslik: string;
  dosyaAdi: string;
  mime: string;
  /** Tam içerik özeti (SHA-256). */
  ozet: string;
  parcalar: { id: string; sira: number; metin: string; capa: unknown }[];
  /** Kanıtın ölçüte bağlanma kararı (en yenisi); kararsızsa null. */
  onay: { sonuc: string; kisi: string | null; zaman: string; dayanak: string } | null;
}

/**
 * Rapor okuyucusunun yan paneli için kanıtlar. Her kanıt aktörün yetkisiyle okunur; okunamayan kanıt
 * `erisilemeyen` listesine girer (panel yetki olmadığını söyler).
 */
export async function kanitPaneli(
  b: ServisBaglami,
  kanitIdleri: readonly string[],
): Promise<{ kanitlar: PanelKaniti[]; erisilemeyen: string[] }> {
  const kanitlar: PanelKaniti[] = [];
  const erisilemeyen: string[] = [];
  for (const id of [...new Set(kanitIdleri)].slice(0, 200)) {
    try {
      const a = await kanitAyrintisi(b, id);
      kanitlar.push({
        id: a.kanit.id,
        baslik: a.kanit.baslik,
        dosyaAdi: a.kanit.dosyaAdi,
        mime: a.kanit.mime,
        ozet: a.kanit.ozet,
        parcalar: a.parcalar.map((p) => ({ id: p.id, sira: p.sira, metin: p.metin, capa: p.capa })),
        onay: null,
      });
    } catch {
      erisilemeyen.push(id);
    }
  }
  if (kanitlar.length) {
    const kararlar = await islem(b, (tx) =>
      tx
        .select({
          hedefId: sema.oneri.hedefId,
          sonuc: sema.karar.sonuc,
          dayanak: sema.karar.dayanak,
          zaman: sema.karar.zaman,
          kisi: sema.kisi.adSoyad,
        })
        .from(sema.oneri)
        .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
        .leftJoin(sema.kisi, eq(sema.kisi.id, sema.karar.kararVerenKisiId))
        .where(
          and(
            eq(sema.oneri.tur, "kanit_etiketi"),
            inArray(
              sema.oneri.hedefId,
              kanitlar.map((k) => k.id),
            ),
          ),
        )
        .orderBy(desc(sema.karar.zaman)),
    );
    for (const k of kanitlar) {
      const s = kararlar.find((x) => x.hedefId === k.id);
      if (s) k.onay = { sonuc: s.sonuc, kisi: s.kisi, zaman: s.zaman.toISOString(), dayanak: s.dayanak };
    }
  }
  return { kanitlar, erisilemeyen };
}

/** Rapordaki bütün atıfların kanıt kimlikleri (panelin önceden yükleyeceği kanıtlar). */
export function atifliKanitlar(r: RaporC): string[] {
  return [...new Set(r.bolumler.flatMap((b) => b.paragraflar.flatMap((p) => p.atiflar.map((a) => a.kanitId))))];
}
