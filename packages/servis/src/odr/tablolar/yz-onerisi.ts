// ÖDR tablo eşlemesi için YZ öneri işi (İP-47). Akış:
//   1. Panelde "Öneri iste": `oneriIste` isteği değiştirilemez günlüğe yazar (`program_esleme.oneri_istendi`).
//   2. İşçi süreç turunda `bekleyenOneriIstekleri` ile yanıtlanmamış istekleri bulur ve kuyruğa koyar.
//   3. İş, isteyen kişinin yetkisiyle `onerileriUret` çağırır: kurumun sağlayıcısı (çıkış kapısı ve maske
//      `kurumSaglayicisi` içinde) ile `eslemeOnerisi` görevi çalışır, kurala uyan her öğe `eslemeOner` ile
//      yalnız öneri olarak yazılır. Öneri tabloya girmez; kurum kullanıcısı onaylar (ilke 3).
//   4. Sonuç (`program_esleme.oneri_tamamlandi`) istek kimliğiyle günlüğe yazılır; istek bir kez işlenir.
// Model sayı önermez (seçmeli yer sayısı yok), karar vermez. Girdi Bologna metni veridir (ilke 5).

import { type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import {
  type EslemeOnerisiGirdisi,
  eslemeOnerileriniAyikla,
  eslemeOnerisi,
  gorevCalistir,
  type MaskeSecenegi,
  type Saglayici,
  YzHatasi,
} from "@akredit/yz";
import { asc, inArray } from "drizzle-orm";
import { z } from "zod";
import { aktorYukle, gunluge, islem, type ServisBaglami } from "../../baglam.ts";
import { okumalar } from "../../bologna/index.ts";
import { ServisHatasi } from "../../hata.ts";
import { kurumSaglayicisi, YzAnahtariYokHatasi } from "../../yz-fabrika.ts";
import { cerceveGerekli, DurumGirdisi, eslemeOner, type OneriKaynagi, programTablolari } from "./index.ts";

export const ISTENDI = "program_esleme.oneri_istendi";
export const TAMAMLANDI = "program_esleme.oneri_tamamlandi";

/** Bologna ders bilgilerinden modele gidecek kısa metin: yalnız amaç ve içerik alanları, kırpılmış. */
export function dersBilgisi(bilgiler: Record<string, string>): string {
  return Object.entries(bilgiler)
    .filter(([k]) => /amac|amaç|içerik|icerik/iu.test(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
    .slice(0, 800);
}

/** Panelden öneri isteği. İstek günlüğe yazılır; işçi işler. */
export async function oneriIste(b: ServisBaglami, girdi: unknown): Promise<{ istekId: string }> {
  const g = DurumGirdisi.parse(girdi);
  cerceveGerekli(g.cerceveKod);
  return islem(b, async (tx, gerekli) => {
    await gerekli("rapor.duzenle", { tur: "program", id: g.programId });
    const [okuma] = await okumalar(tx, g.programId, 1);
    if (!okuma)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Bu programın Bologna verisi aktarılmadı. Önce ders bilgi paketini aktarın.",
      );
    const k = await gunluge(tx, b, ISTENDI, { tur: "program", id: g.programId }, { cerceve: g.cerceveKod });
    return { istekId: k?.id ?? "" };
  });
}

export interface OneriIstegi {
  istekId: string;
  kisiId: string;
  programId: string;
  cerceveKod: string;
  zaman: string;
}

async function istekleriOku(tx: Islem): Promise<{ bekleyen: OneriIstegi[]; son: Map<string, OneriDurumu> }> {
  const r = await tx
    .select()
    .from(sema.gunluk)
    .where(inArray(sema.gunluk.eylem, [ISTENDI, TAMAMLANDI]))
    .orderBy(asc(sema.gunluk.sira));
  const istekler = new Map<string, OneriIstegi>();
  const biten = new Map<string, Record<string, unknown>>();
  for (const x of r) {
    const a = (x.ayrinti ?? {}) as Record<string, unknown>;
    if (x.eylem === ISTENDI && x.aktorId && x.hedefId && typeof a.cerceve === "string")
      istekler.set(x.id, {
        istekId: x.id,
        kisiId: x.aktorId,
        programId: x.hedefId,
        cerceveKod: a.cerceve,
        zaman: x.zaman.toISOString(),
      });
    if (x.eylem === TAMAMLANDI && typeof a.istek === "string") biten.set(a.istek, a);
  }
  const son = new Map<string, OneriDurumu>();
  for (const i of istekler.values()) {
    const a = biten.get(i.istekId);
    son.set(`${i.programId}|${i.cerceveKod}`, {
      zaman: i.zaman,
      durum: a ? (a.durum === "tamam" ? "tamam" : "olmadi") : "bekliyor",
      onerilen: typeof a?.onerilen === "number" ? a.onerilen : 0,
      reddedilen: typeof a?.reddedilen === "number" ? a.reddedilen : 0,
      ileti: typeof a?.ileti === "string" ? a.ileti : null,
    });
  }
  return { bekleyen: [...istekler.values()].filter((i) => !biten.has(i.istekId)), son };
}

/** İşçi için: kurumun yanıtlanmamış öneri istekleri. */
export async function bekleyenOneriIstekleri(db: Vt, kurumId: string): Promise<OneriIstegi[]> {
  return kiraciIslemi(db, kurumId, async (tx) => (await istekleriOku(tx)).bekleyen);
}

export interface OneriDurumu {
  zaman: string;
  durum: "bekliyor" | "tamam" | "olmadi";
  onerilen: number;
  reddedilen: number;
  ileti: string | null;
}

/** Panel için: programın bu çerçevedeki son öneri isteğinin durumu. */
export async function oneriDurumu(b: ServisBaglami, girdi: unknown): Promise<OneriDurumu | null> {
  const g = DurumGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.oku", { tur: "program", id: g.programId });
    return (await istekleriOku(tx)).son.get(`${g.programId}|${g.cerceveKod}`) ?? null;
  });
}

export interface UretimSonucu {
  onerilen: number;
  reddedilen: number;
}

/**
 * Modelden öneri alır ve kurala uyanları yalnız öneri olarak yazar. Kararı olan satır için öneri istenmez.
 * Kaynak: ders önerisinde Bologna okuma kanıtı ve ders kodu, PÇ önerisinde PÇ metni ve kurul çıktıları.
 */
export async function onerileriUret(
  b: ServisBaglami,
  girdi: unknown,
  secenek: { saglayici: Saglayici; maske?: MaskeSecenegi },
): Promise<UretimSonucu> {
  const g = DurumGirdisi.parse(girdi);
  const cerceve = cerceveGerekli(g.cerceveKod);
  const d = await programTablolari(b, g);
  if (!d.bologna)
    throw new ServisHatasi(
      "gecersiz_istek",
      "Bu programın Bologna verisi aktarılmadı. Önce ders bilgi paketini aktarın.",
    );
  const kanitId = d.bologna.kanitId;
  const okuma = await islem(b, async (tx) => (await okumalar(tx, g.programId, 1))[0]);
  const veri = okuma?.veri as
    | {
        dersler: Array<{ kod: string; ad?: string; bilgiler?: Record<string, string>; hata?: string; bos?: boolean }>;
        programCiktilari: { kod: string; metin: string }[];
      }
    | undefined;
  const kararsizDers = new Set(d.eslemeler.dersler.filter((s) => !s.karar).map((s) => s.anahtar));
  const kararsizPc = new Set(d.eslemeler.pcKurul.filter((s) => !s.karar).map((s) => s.anahtar));
  const yzGirdisi: EslemeOnerisiGirdisi = {
    dersEslemeAdi: d.cerceve.dersEslemeAdi,
    dersKodlari: d.cerceve.dersKodlari,
    kurulCiktilari: kararsizPc.size ? d.cerceve.kurulCiktilari : [],
    dersler: (veri?.dersler ?? [])
      .filter((x) => !x.hata && !x.bos && kararsizDers.has(x.kod))
      .map((x) => ({ kod: x.kod, ad: x.ad ?? "", bilgi: dersBilgisi(x.bilgiler ?? {}) })),
    programCiktilari: (veri?.programCiktilari ?? []).filter((p) => kararsizPc.has(p.kod)),
    ...(secenek.maske ? { maske: secenek.maske } : {}),
  };
  if (!yzGirdisi.dersler.length && !yzGirdisi.programCiktilari.length) return { onerilen: 0, reddedilen: 0 };
  const r = await gorevCalistir(eslemeOnerisi, yzGirdisi, secenek.saglayici);
  const a = eslemeOnerileriniAyikla(r.veri, yzGirdisi);
  const kaynak = (k: string): OneriKaynagi => {
    const [tur, anahtar = ""] = k.split(/:(.*)/su);
    if (tur === "ders") return { tur: "bologna", anahtar, kanitId };
    if (tur === "pc") return { tur: "pc", anahtar, kanitId };
    return { tur: "kurul", anahtar };
  };
  let onerilen = 0;
  let reddedilen = a.reddedilen.length;
  const yaz = async (
    tur: "ders_kategorisi" | "pc_kurul",
    anahtar: string,
    deger: string | string[],
    gerekce: string,
    kaynaklar: string[],
  ) => {
    try {
      await eslemeOner(b, {
        programId: g.programId,
        cerceveKod: cerceve.kod,
        tur,
        anahtar,
        deger,
        uretici: "yz",
        gerekce: { metin: gerekce, kaynaklar: kaynaklar.map(kaynak) },
      });
      onerilen++;
    } catch (e) {
      if (!(e instanceof ServisHatasi) && !(e instanceof z.ZodError)) throw e;
      reddedilen++;
    }
  };
  for (const o of a.dersler) await yaz("ders_kategorisi", o.dersKod, o.deger, o.gerekce, o.kaynaklar);
  for (const o of a.pcKurul) await yaz("pc_kurul", o.pcKod, o.kurulCiktilari, o.gerekce, o.kaynaklar);
  return { onerilen, reddedilen };
}

/** Sağlayıcı fabrikası: üretimde `kurumSaglayicisi`, testte sahte sağlayıcı. */
export type SaglayiciFabrikasi = (kurumId: string) => Promise<{ saglayici: Saglayici; maske?: MaskeSecenegi }>;

export const varsayilanFabrika =
  (b: { db: ServisBaglami["db"]; simdi: () => Date }): SaglayiciFabrikasi =>
  async (kurumId) => {
    const k = await kurumSaglayicisi(b.db, kurumId, { simdi: b.simdi });
    return { saglayici: k.saglayici, maske: k.ayar.maske };
  };

/**
 * İşçinin tek isteği işlemesi. İsteyen kişinin yetkisiyle çalışır. Sonuç ne olursa olsun (anahtar yok,
 * yurt dışı izni yok, model hatası) istek kimliğiyle günlüğe yazılır ve yeniden işlenmez.
 */
export async function istegiIsle(
  ortak: { db: ServisBaglami["db"]; simdi: () => Date; fabrika?: SaglayiciFabrikasi },
  kurumId: string,
  istek: OneriIstegi,
): Promise<{ durum: "tamam" | "olmadi" } & UretimSonucu> {
  const aktor = await aktorYukle(ortak.db, kurumId, istek.kisiId);
  const b: ServisBaglami = { db: ortak.db, aktor, simdi: ortak.simdi };
  let sonuc: { durum: "tamam" | "olmadi"; ileti: string | null } & UretimSonucu;
  try {
    const s = await (ortak.fabrika ?? varsayilanFabrika(ortak))(kurumId);
    const u = await onerileriUret(b, { programId: istek.programId, cerceveKod: istek.cerceveKod }, s);
    sonuc = { durum: "tamam", ileti: null, ...u };
  } catch (e) {
    const ileti =
      e instanceof YzAnahtariYokHatasi
        ? "Kurumun yapay zekâ anahtarı tanımlı değil. Kurum yöneticisine başvurun."
        : e instanceof YzHatasi && e.tur === "politika"
          ? "Kurum ayarı bu veriyi yapay zekâ hizmetine göndermeye izin vermiyor."
          : e instanceof ServisHatasi
            ? e.message
            : e instanceof YzHatasi
              ? "Yapay zekâ hizmetinden öneri alınamadı. Daha sonra yeniden isteyin."
              : null;
    if (ileti === null) throw e;
    sonuc = { durum: "olmadi", ileti, onerilen: 0, reddedilen: 0 };
  }
  await islem(b, (tx) =>
    gunluge(
      tx,
      b,
      TAMAMLANDI,
      { tur: "program", id: istek.programId },
      {
        istek: istek.istekId,
        cerceve: istek.cerceveKod,
        durum: sonuc.durum,
        onerilen: sonuc.onerilen,
        reddedilen: sonuc.reddedilen,
        ileti: sonuc.ileti,
      },
    ),
  );
  return { durum: sonuc.durum, onerilen: sonuc.onerilen, reddedilen: sonuc.reddedilen };
}
