// Sınav taramasının panele ve işçiye bağlantısı (İP-43 açık kalanları; inceleme dalga 8 bulgu 4).
//
// Akış: panel dosyayı alır (`taramaIstegiKaydet`): türü ve boyutu denetlenir, dosya kanıt deposuna konur ve bir
// istek satırı yazılır. İşçi süreç turunda bekleyen istekleri kuyruğa koyar; iş dosyayı `kanitAl` ile
// `kaynakAyrinti.amac = "sinav_taramasi"` vererek kanıt olarak alır (metin ve YZ kuyruğuna girmez) ve taramayı
// çalıştırır. Sonuç (`tamam` ya da `hata`) istek başına bir kez yazılır.
//
// Numara kutusu kırpıntısı (açık numara) kanıt deposundadır ama kanıt satırı yoktur; kanıt uçlarından erişilemez.
// Tek yol `kirpintiBaglantisi`: yalnız taramayı başlatan kişi ve dersin onay yetkilisi (karar.ver), yalnız erişim
// süresi içinde, kısa süreli imzalı bağlantıyla. Her erişim günlüğe yazılır.

import { createHash } from "node:crypto";
import { gunlugeYaz, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { aktorYetkiliMi, gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi, yetkiYok } from "../hata.ts";
import { NUMARA_ALANI, Sablon } from "./turler.ts";
import { ortamdanYerelModel, yerelOkuyucuKur } from "./yerel-model.ts";

const uuid = z.string().uuid();

/** Tek yüklemenin üst sınırı (kanıt hattının varsayılan sınırı ile aynı). */
export const TARAMA_DOSYA_SINIRI = 100 * 1024 * 1024;
/** Numara kutusu görüntüsüne erişim, taramadan sonra bu kadar gün açıktır. */
export const KIRPINTI_ERISIM_GUN = 30;
/** Kırpıntı için verilen imzalı bağlantının ömrü (saniye). */
export const KIRPINTI_BAGLANTI_SN = 300;

export type TaramaDosyaTuru = "pdf" | "zip" | "png" | "jpeg" | "tiff";

const IMZALAR: { tur: TaramaDosyaTuru; mime: string; imza: number[] }[] = [
  { tur: "pdf", mime: "application/pdf", imza: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { tur: "zip", mime: "application/zip", imza: [0x50, 0x4b, 0x03, 0x04] },
  { tur: "png", mime: "image/png", imza: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { tur: "jpeg", mime: "image/jpeg", imza: [0xff, 0xd8, 0xff] },
  { tur: "tiff", mime: "image/tiff", imza: [0x49, 0x49, 0x2a, 0x00] },
  { tur: "tiff", mime: "image/tiff", imza: [0x4d, 0x4d, 0x00, 0x2a] },
];

/** Dosyanın türünü içerikten (imza baytları) bulur; dosya adına ya da tarayıcının bildirdiği türe güvenmez. */
export function taramaDosyaTuru(v: Uint8Array): { tur: TaramaDosyaTuru; mime: string } | null {
  for (const i of IMZALAR) if (i.imza.every((b, n) => v[n] === b)) return { tur: i.tur, mime: i.mime };
  return null;
}

/**
 * Yükleme formunun açık olup olmadığı. Yerel model tanımlı değilse ya da kurum ağının dışındaysa form kapalıdır
 * ve ileti nedenini söyler. Ağa çıkılmaz; yalnız sunucu ayarı denetlenir.
 */
export function yerelModelDurumu(
  ortam: Record<string, string | undefined>,
): { acik: true } | { acik: false; ileti: string } {
  try {
    yerelOkuyucuKur(ortamdanYerelModel(ortam));
    return { acik: true };
  } catch (e) {
    if (e instanceof ServisHatasi) return { acik: false, ileti: e.message };
    throw e;
  }
}

/** Depodan gereken en küçük arayüz (`@akredit/depo` `NesneDeposu` ile uyumlu). */
export interface TaramaDeposu {
  koy(kurumId: string, veri: Uint8Array, secenek?: { mime?: string }): Promise<{ anahtar: string; ozet: string }>;
  baglanti(anahtar: string, sureSn: number, simdi?: number): Promise<string>;
}

export const TaramaIstegiGirdisi = z
  .object({ olcmeAraciId: uuid, esik: z.number().min(0.5).max(1).optional() })
  .strict();

async function aracVeDers(tx: Parameters<Parameters<typeof islem>[1]>[0], aracId: string) {
  const [r] = await tx
    .select({ arac: sema.olcmeAraci, dersId: sema.dersAcilisi.dersId })
    .from(sema.olcmeAraci)
    .innerJoin(sema.dersAcilisi, eq(sema.dersAcilisi.id, sema.olcmeAraci.dersAcilisiId))
    .where(eq(sema.olcmeAraci.id, aracId));
  if (!r) throw bulunamadi();
  return r;
}

function dosyaAdiTemizle(ad: string): string {
  const son = ad.split(/[\\/]/u).at(-1) ?? "";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: denetim karakterleri bilerek atılıyor
  const temiz = son.replace(/[\u0000-\u001f\u007f]/gu, "").trim();
  return temiz.slice(0, 200) || "tarama";
}

/**
 * Panelden gelen tarama dosyasını kaydeder. Yetki ve şablon dosya depoya konmadan önce denetlenir. Dosya yalnız
 * depoya konur; kanıt olarak alınması ve okunması işçidedir. Yerel model yoksa istek hiç yazılmaz.
 */
export async function taramaIstegiKaydet(
  b: ServisBaglami,
  girdi: unknown,
  dosya: { veri: Uint8Array; dosyaAdi: string },
  d: { depo: TaramaDeposu; ortam: Record<string, string | undefined> },
): Promise<{ istekId: string }> {
  const g = TaramaIstegiGirdisi.parse(girdi);
  const durum = yerelModelDurumu(d.ortam);
  if (!durum.acik) throw new ServisHatasi("kural_ihlali", durum.ileti);
  if (dosya.veri.byteLength === 0) throw new ServisHatasi("gecersiz_istek", "Dosya boş. Taranmış kâğıtları seçin.");
  if (dosya.veri.byteLength > TARAMA_DOSYA_SINIRI)
    throw new ServisHatasi("gecersiz_istek", "Dosya çok büyük (en çok 100 MB). Kâğıtları bölerek yükleyin.");
  const tur = taramaDosyaTuru(dosya.veri);
  if (!tur)
    throw new ServisHatasi(
      "gecersiz_istek",
      "Taranmış kâğıtları PDF, PNG, JPEG ya da TIFF olarak (ya da PDF'lerden oluşan ZIP ile) yükleyin.",
    );
  // Önce yetki ve şablon: yetkisiz kişinin dosyası depoya hiç konmaz.
  await islem(b, async (tx, gerekli) => {
    const { dersId } = await aracVeDers(tx, g.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const [s] = await tx
      .select({ id: sema.sinavSablonu.id })
      .from(sema.sinavSablonu)
      .where(eq(sema.sinavSablonu.olcmeAraciId, g.olcmeAraciId))
      .limit(1);
    if (!s) throw new ServisHatasi("kural_ihlali", "Önce örnek kâğıt üzerinde numara ve soru kutularını işaretleyin.");
  });
  const nesne = await d.depo.koy(b.aktor.kurumId, dosya.veri, { mime: tur.mime });
  return islem(b, async (tx, gerekli) => {
    const { dersId } = await aracVeDers(tx, g.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const [r] = await tx
      .insert(sema.sinavTaramaIstegi)
      .values({
        kurumId: b.aktor.kurumId,
        olcmeAraciId: g.olcmeAraciId,
        depoAnahtari: nesne.anahtar,
        ozet: nesne.ozet,
        dosyaAdi: dosyaAdiTemizle(dosya.dosyaAdi),
        mime: tur.mime,
        boyut: dosya.veri.byteLength,
        esik: g.esik ?? null,
        isteyenKisiId: b.aktor.kisiId,
      })
      .returning({ id: sema.sinavTaramaIstegi.id });
    if (!r) throw new Error("İstek eklenemedi.");
    await gunluge(
      tx,
      b,
      "sinav.tarama_istendi",
      { tur: "sinav_tarama_istegi", id: r.id },
      { olcmeAraciId: g.olcmeAraciId, ozet: nesne.ozet, boyut: dosya.veri.byteLength, tur: tur.tur },
    );
    return { istekId: r.id };
  });
}

// ---------- İşçi tarafı (kişi oturumu yok; kiracı işlemiyle) ----------

export interface BekleyenIstek {
  id: string;
  olcmeAraciId: string;
  depoAnahtari: string;
  dosyaAdi: string;
  mime: string;
  esik: number | null;
  isteyenKisiId: string;
}

/** Sonucu yazılmamış istekler (eskiden yeniye). */
export async function bekleyenTaramaIstekleri(db: Vt, kurumId: string, enCok = 20): Promise<BekleyenIstek[]> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const istekler = await tx
      .select()
      .from(sema.sinavTaramaIstegi)
      .orderBy(asc(sema.sinavTaramaIstegi.olusturma), asc(sema.sinavTaramaIstegi.id));
    if (istekler.length === 0) return [];
    const biten = new Set(
      (
        await tx
          .select({ id: sema.sinavTaramaIstegiSonucu.istekId })
          .from(sema.sinavTaramaIstegiSonucu)
          .where(
            inArray(
              sema.sinavTaramaIstegiSonucu.istekId,
              istekler.map((i) => i.id),
            ),
          )
      ).map((x) => x.id),
    );
    return istekler
      .filter((i) => !biten.has(i.id))
      .slice(0, enCok)
      .map((i) => ({
        id: i.id,
        olcmeAraciId: i.olcmeAraciId,
        depoAnahtari: i.depoAnahtari,
        dosyaAdi: i.dosyaAdi,
        mime: i.mime,
        esik: i.esik,
        isteyenKisiId: i.isteyenKisiId,
      }));
  });
}

/** Tek isteği okur; sonucu yazılmışsa null. */
export async function taramaIstegiOku(db: Vt, kurumId: string, istekId: string): Promise<BekleyenIstek | null> {
  uuid.parse(istekId);
  return kiraciIslemi(db, kurumId, async (tx) => {
    const [i] = await tx.select().from(sema.sinavTaramaIstegi).where(eq(sema.sinavTaramaIstegi.id, istekId));
    if (!i) return null;
    const [s] = await tx
      .select({ id: sema.sinavTaramaIstegiSonucu.id })
      .from(sema.sinavTaramaIstegiSonucu)
      .where(eq(sema.sinavTaramaIstegiSonucu.istekId, istekId));
    if (s) return null;
    return {
      id: i.id,
      olcmeAraciId: i.olcmeAraciId,
      depoAnahtari: i.depoAnahtari,
      dosyaAdi: i.dosyaAdi,
      mime: i.mime,
      esik: i.esik,
      isteyenKisiId: i.isteyenKisiId,
    };
  });
}

export type IstekSonucu =
  | { durum: "tamam"; kanitId: string; taramaId: string }
  | { durum: "hata"; kanitId?: string | null; ileti: string };

/** İsteğin sonucunu bir kez yazar (ikinci yazım tekillik kısıtıyla reddedilir) ve günlüğe ekler. */
export async function taramaIstegiSonucuYaz(db: Vt, kurumId: string, istekId: string, s: IstekSonucu): Promise<void> {
  await kiraciIslemi(db, kurumId, async (tx) => {
    await tx.insert(sema.sinavTaramaIstegiSonucu).values({
      kurumId,
      istekId,
      durum: s.durum,
      kanitId: s.kanitId ?? null,
      taramaId: s.durum === "tamam" ? s.taramaId : null,
      ileti: s.durum === "hata" ? s.ileti.slice(0, 500) : null,
    });
    await gunlugeYaz(tx, {
      aktor: { tur: "sistem", id: null },
      eylem: s.durum === "tamam" ? "sinav.tarama_istegi_tamam" : "sinav.tarama_istegi_hata",
      hedef: { tur: "sinav_tarama_istegi", id: istekId },
      ayrinti:
        s.durum === "tamam"
          ? { kanitId: s.kanitId, taramaId: s.taramaId }
          : { kanitId: s.kanitId ?? null, ileti: s.ileti.slice(0, 500) },
    });
  });
}

// ---------- Panel ----------

export interface PanelAraci {
  id: string;
  ad: string;
  tur: string;
  donem: string;
  sorular: { numara: string; tamPuan: number }[];
  /** En son kaydedilen şablon; yoksa null. */
  sablon: Sablon | null;
}

export interface PanelIstegi {
  id: string;
  olcmeAraciId: string;
  dosyaAdi: string;
  zaman: string;
  durum: "bekliyor" | "tamam" | "hata";
  ileti: string | null;
  taramaId: string | null;
}

export interface PanelTaramasi {
  taramaId: string;
  olcmeAraciId: string;
  zaman: string;
  kagitSayisi: number;
  aktarildi: boolean;
}

export interface TaramaPaneliVerisi {
  araclar: PanelAraci[];
  istekler: PanelIstegi[];
  taramalar: PanelTaramasi[];
}

/** Dersin ölçme araçları (soruları ve şablonuyla), yükleme istekleri ve taramaları. Numara yoktur. */
export async function taramaPaneli(b: ServisBaglami, dersId: string): Promise<TaramaPaneliVerisi> {
  uuid.parse(dersId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.oku", { tur: "ders", id: dersId });
    const satirlar = await tx
      .select({ arac: sema.olcmeAraci, donem: sema.donem.ad, baslangic: sema.donem.baslangic })
      .from(sema.olcmeAraci)
      .innerJoin(sema.dersAcilisi, eq(sema.dersAcilisi.id, sema.olcmeAraci.dersAcilisiId))
      .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
      .where(eq(sema.dersAcilisi.dersId, dersId))
      .orderBy(desc(sema.donem.baslangic), asc(sema.olcmeAraci.olusturma), asc(sema.olcmeAraci.id));
    const ids = satirlar.map((s) => s.arac.id);
    if (ids.length === 0) return { araclar: [], istekler: [], taramalar: [] };
    const sorular = await tx
      .select()
      .from(sema.soru)
      .where(inArray(sema.soru.olcmeAraciId, ids))
      .orderBy(asc(sema.soru.numara));
    const sablonlar = await tx
      .select()
      .from(sema.sinavSablonu)
      .where(inArray(sema.sinavSablonu.olcmeAraciId, ids))
      .orderBy(desc(sema.sinavSablonu.olusturma), desc(sema.sinavSablonu.id));
    const sonSablon = new Map<string, Sablon>();
    for (const s of sablonlar) {
      if (sonSablon.has(s.olcmeAraciId)) continue;
      const p = Sablon.safeParse(s.sablon);
      if (p.success) sonSablon.set(s.olcmeAraciId, p.data);
    }
    const istekler = await tx
      .select({ i: sema.sinavTaramaIstegi, s: sema.sinavTaramaIstegiSonucu })
      .from(sema.sinavTaramaIstegi)
      .leftJoin(sema.sinavTaramaIstegiSonucu, eq(sema.sinavTaramaIstegiSonucu.istekId, sema.sinavTaramaIstegi.id))
      .where(inArray(sema.sinavTaramaIstegi.olcmeAraciId, ids))
      .orderBy(desc(sema.sinavTaramaIstegi.olusturma))
      .limit(50);
    const taramalar = await tx
      .select({ t: sema.sinavTaramasi, o: sema.sinavOzetOnayi.id })
      .from(sema.sinavTaramasi)
      .leftJoin(sema.sinavOzetOnayi, eq(sema.sinavOzetOnayi.taramaId, sema.sinavTaramasi.id))
      .where(inArray(sema.sinavTaramasi.olcmeAraciId, ids))
      .orderBy(desc(sema.sinavTaramasi.olusturma), desc(sema.sinavTaramasi.id))
      .limit(50);
    return {
      araclar: satirlar.map(({ arac, donem }) => ({
        id: arac.id,
        ad: arac.ad ?? arac.tur,
        tur: arac.tur,
        donem,
        sorular: sorular
          .filter((q) => q.olcmeAraciId === arac.id)
          .map((q) => ({ numara: q.numara, tamPuan: Number(q.tamPuan) })),
        sablon: sonSablon.get(arac.id) ?? null,
      })),
      istekler: istekler.map(({ i, s }) => ({
        id: i.id,
        olcmeAraciId: i.olcmeAraciId,
        dosyaAdi: i.dosyaAdi,
        zaman: i.olusturma.toISOString(),
        durum: !s ? "bekliyor" : s.durum === "tamam" ? "tamam" : "hata",
        ileti: s?.ileti ?? null,
        taramaId: s?.taramaId ?? null,
      })),
      taramalar: taramalar.map(({ t, o }) => ({
        taramaId: t.id,
        olcmeAraciId: t.olcmeAraciId,
        zaman: t.olusturma.toISOString(),
        kagitSayisi: t.kagitSayisi,
        aktarildi: Boolean(o),
      })),
    };
  });
}

// ---------- Numara kutusu kırpıntısı (inceleme dalga 8, bulgu 4) ----------

/**
 * Numara kutusunun görüntüsü için kısa süreli imzalı bağlantı. Yalnız taramayı başlatan kişi ve dersin onay
 * yetkilisi (karar.ver) alabilir; tarama üzerinden `KIRPINTI_ERISIM_GUN` gün geçtiyse bağlantı verilmez. Her
 * verilen bağlantı günlüğe yazılır (kim, hangi kâğıt, ne gerekçeyle; numara yok).
 */
export async function kirpintiBaglantisi(
  b: ServisBaglami,
  hucreId: string,
  d: { depo: Pick<TaramaDeposu, "baglanti">; erisimGun?: number; sureSn?: number },
): Promise<{ adres: string; bitis: string }> {
  uuid.parse(hucreId);
  const erisimGun = d.erisimGun ?? KIRPINTI_ERISIM_GUN;
  const sureSn = d.sureSn ?? KIRPINTI_BAGLANTI_SN;
  return islem(b, async (tx, gerekli) => {
    const [h] = await tx.select().from(sema.sinavHucresi).where(eq(sema.sinavHucresi.id, hucreId));
    if (!h || h.alan !== NUMARA_ALANI || !h.kirpintiOzeti) throw bulunamadi();
    const [t] = await tx.select().from(sema.sinavTaramasi).where(eq(sema.sinavTaramasi.id, h.taramaId));
    if (!t) throw bulunamadi();
    const { dersId } = await aracVeDers(tx, t.olcmeAraciId);
    const zincir = await gerekli("olcme.oku", { tur: "ders", id: dersId });
    const sahip = t.baslatanKisiId !== null && t.baslatanKisiId === b.aktor.kisiId;
    const onayYetkilisi = aktorYetkiliMi(b.aktor, "karar.ver", zincir, b.simdi());
    if (!sahip && !onayYetkilisi) throw yetkiYok();
    const simdi = b.simdi();
    const son = t.olusturma.getTime() + erisimGun * 86_400_000;
    if (simdi.getTime() > son)
      throw new ServisHatasi(
        "kural_ihlali",
        `Numara kutusunun görüntüsüne erişim süresi doldu (taramadan sonra ${erisimGun} gün). Kâğıdın aslına bakın.`,
      );
    const adres = await d.depo.baglanti(`${h.kurumId}/${h.kirpintiOzeti}`, sureSn, Math.floor(simdi.getTime() / 1000));
    await gunluge(
      tx,
      b,
      "sinav.kirpinti_erisimi",
      { tur: "sinav_hucresi", id: h.id },
      { taramaId: t.id, kagit: h.kagitSira, gerekce: sahip ? "tarama_sahibi" : "onay_yetkilisi", sureSn },
    );
    return { adres, bitis: new Date(simdi.getTime() + sureSn * 1000).toISOString() };
  });
}

// ---------- Aktarım öncesi özet (inceleme dalga 8, bulgu 3) ----------

/** Otomatik okunan ve kişinin düzeltmediği hücrelerin özeti: kimlik ve değerin SHA-256 özeti. */
export function otomatikOzet(hucreler: readonly { hucreId: string; deger: number | null }[]): string {
  const satirlar = hucreler.map((h) => `${h.hucreId}:${h.deger === null ? "" : h.deger.toFixed(3)}`).sort();
  return createHash("sha256").update(satirlar.join("\n")).digest("hex");
}
