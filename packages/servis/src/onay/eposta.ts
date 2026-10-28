// İmzalı e-posta bağlantısıyla karar (İP-13).
//
// Bağlantı tek kullanımlık, süreli ve kişiye bağlıdır:
// - Jeton `yuk.imza` biçimindedir; yük `{k: kurum, i: bağlantı}`, imza HMAC-SHA256 (gizli anahtar sunucuda).
//   Jetonda öneri, kişi ya da sonuç yoktur: bunlar veritabanındaki bağlantı kaydından okunur, jeton
//   değiştirilerek başka karara çevrilemez.
// - Kullanım `onay_baglantisi_kullanimi` tablosuna bağlantı kimliğiyle eklenir; birincil anahtar ikinci
//   kullanımı (eşzamanlı olanı da) reddeder. Kayıtlar yalnız eklenir.
// - Yüksek riskli öneriye bağlantı üretilmez, üretilmiş olsa da kullanılamaz (servis + tetikleyici + karar anı).
// - Karar anında kişinin o hedefte hâlâ karar yetkisi olmalı. Karar `dogrudan` dayanakla, kişinin adıyla
//   yazılır; günlükte `yol: "eposta"`.
// - GET ile karar verilmez (e-posta istemcilerinin bağlantı ön izlemesi kararı tüketmesin): önce `onizle`,
//   sonra kişinin düğmeye basmasıyla `kullan`.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { etkinRisk } from "@akredit/cekirdek";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, desc, eq, isNull } from "drizzle-orm";
import { aktorYetkiliMi, atamalariOku, hedefZinciri } from "../baglam.ts";
import { ServisHatasi, vtHatasiCevir } from "../hata.ts";
import { hedefVeKonum } from "../oneri.ts";
import { onayBaglantisi, onayBaglantisiKullanimi } from "./tablolar.ts";

export const BAGLANTI_EN_UZUN_SAAT = 14 * 24;
const VARSAYILAN_SAAT = 72;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export type BaglantiSonucu = "onaylandi" | "reddedildi";

const b64 = (x: Buffer | string) => Buffer.from(x).toString("base64url");

function imza(gizli: string, yuk: string): string {
  return b64(createHmac("sha256", gizli).update(`akredit.onay.v1:${yuk}`).digest());
}

function gizliDenetle(gizli: string) {
  if (Buffer.byteLength(gizli) < 32) throw new Error("Onay bağlantısı anahtarı en az 32 bayt olmalı.");
}

export function jetonUret(gizli: string, kurumId: string, baglantiId: string): string {
  gizliDenetle(gizli);
  const yuk = b64(JSON.stringify({ k: kurumId, i: baglantiId }));
  return `${yuk}.${imza(gizli, yuk)}`;
}

const gecersiz = () => new ServisHatasi("bulunamadi", "Bu bağlantı geçerli değil. Kararı panelden verebilirsiniz.");

/** Jetonu doğrular; imza tutmazsa ya da biçim bozuksa hata. */
export function jetonCoz(gizli: string, jeton: string): { kurumId: string; baglantiId: string } {
  gizliDenetle(gizli);
  const [yuk, im, fazla] = jeton.split(".");
  if (!yuk || !im || fazla !== undefined || jeton.length > 400) throw gecersiz();
  const beklenen = Buffer.from(imza(gizli, yuk));
  const gelen = Buffer.from(im);
  if (beklenen.length !== gelen.length || !timingSafeEqual(beklenen, gelen)) throw gecersiz();
  let x: unknown;
  try {
    x = JSON.parse(Buffer.from(yuk, "base64url").toString("utf8"));
  } catch {
    throw gecersiz();
  }
  const { k, i } = (x ?? {}) as { k?: unknown; i?: unknown };
  if (typeof k !== "string" || typeof i !== "string" || !UUID.test(k) || !UUID.test(i)) throw gecersiz();
  return { kurumId: k, baglantiId: i };
}

async function kararYetkisi(
  tx: Islem,
  kurumId: string,
  kisiId: string,
  o: typeof sema.oneri.$inferSelect,
  simdi: Date,
) {
  const { hedef } = await hedefVeKonum(tx, kurumId, o);
  const zincir = await hedefZinciri(tx, kurumId, hedef.tur, hedef.id);
  const atamalar = await atamalariOku(tx, kisiId);
  return (
    zincir !== null &&
    aktorYetkiliMi({ kisiId, kurumId, atamalar, tur: "oturum", anahtarKapsami: null }, "karar.ver", zincir, simdi)
  );
}

export interface BaglantiGirdisi {
  kurumId: string;
  kisiId: string;
  oneriId: string;
  sonuc: BaglantiSonucu;
  simdi: Date;
  gizli: string;
  sureSaat?: number;
}

/** Bir kişi için bir öneriye karar bağlantısı üretir (işlem içinde). Jetonu döndürür. */
export async function baglantiUretIslemde(tx: Islem, g: BaglantiGirdisi): Promise<string> {
  const sure = g.sureSaat ?? VARSAYILAN_SAAT;
  if (!(sure > 0 && sure <= BAGLANTI_EN_UZUN_SAAT))
    throw new ServisHatasi("gecersiz_istek", "Bağlantı süresi geçersiz.");
  const [o] = await tx.select().from(sema.oneri).where(eq(sema.oneri.id, g.oneriId));
  if (!o) throw new ServisHatasi("bulunamadi", "Aradığınız kayıt bulunamadı.");
  if (etkinRisk(o) === "yuksek")
    throw new ServisHatasi("kural_ihlali", "Yüksek riskli öneriler e-postayla karara bağlanamaz; panelden inceleyin.");
  const [k] = await tx.select({ id: sema.karar.id }).from(sema.karar).where(eq(sema.karar.oneriId, o.id));
  if (k) throw new ServisHatasi("cakisma", "Bu öneriye zaten karar verilmiş.");
  if (!(await kararYetkisi(tx, g.kurumId, g.kisiId, o, g.simdi)))
    throw new ServisHatasi("yetki_yok", "Bu öneriye karar verme yetkiniz yok.");
  const id = randomUUID();
  await tx.insert(onayBaglantisi).values({
    id,
    kurumId: g.kurumId,
    oneriId: o.id,
    kisiId: g.kisiId,
    sonuc: g.sonuc,
    son: new Date(g.simdi.getTime() + sure * 3_600_000),
    olusturma: g.simdi,
  });
  return jetonUret(g.gizli, g.kurumId, id);
}

export function baglantiUret(db: Vt, g: BaglantiGirdisi): Promise<string> {
  return kiraciIslemi(db, g.kurumId, (tx) => baglantiUretIslemde(tx, g)).catch((e) => {
    throw vtHatasiCevir(e);
  });
}

export interface BaglantiOnizlemesi {
  baslik: string;
  oneriTuru: string;
  sonuc: BaglantiSonucu;
  kisiAd: string;
  son: string;
  /** Kullanılabilir mi? Değilse neden (kullanıcıya gösterilir). */
  durum: { gecerli: true } | { gecerli: false; neden: string };
}

async function baglantiYukle(tx: Islem, baglantiId: string) {
  const [bag] = await tx.select().from(onayBaglantisi).where(eq(onayBaglantisi.id, baglantiId));
  if (!bag) throw gecersiz();
  const [o] = await tx.select().from(sema.oneri).where(eq(sema.oneri.id, bag.oneriId));
  if (!o) throw gecersiz();
  return { bag, o };
}

async function engel(
  tx: Islem,
  kurumId: string,
  bag: typeof onayBaglantisi.$inferSelect,
  o: typeof sema.oneri.$inferSelect,
  simdi: Date,
): Promise<ServisHatasi | null> {
  const [kullanim] = await tx
    .select({ id: onayBaglantisiKullanimi.id })
    .from(onayBaglantisiKullanimi)
    .where(eq(onayBaglantisiKullanimi.id, bag.id));
  if (kullanim)
    return new ServisHatasi("cakisma", "Bu bağlantı daha önce kullanıldı. Bir bağlantı yalnız bir kez kullanılır.");
  if (simdi.getTime() >= bag.son.getTime())
    return new ServisHatasi("kural_ihlali", "Bu bağlantının süresi doldu. Kararı panelden verebilirsiniz.");
  if (etkinRisk(o) === "yuksek")
    return new ServisHatasi("kural_ihlali", "Yüksek riskli öneriler e-postayla karara bağlanamaz; panelden inceleyin.");
  const [k] = await tx.select({ id: sema.karar.id }).from(sema.karar).where(eq(sema.karar.oneriId, o.id));
  if (k) return new ServisHatasi("cakisma", "Bu öneriye zaten karar verilmiş.");
  if (!(await kararYetkisi(tx, kurumId, bag.kisiId, o, simdi)))
    return new ServisHatasi("yetki_yok", "Bu öneriye karar verme yetkiniz artık yok.");
  return null;
}

function baslikOku(o: typeof sema.oneri.$inferSelect): string {
  const b = (o.icerik as { baslik?: unknown } | null)?.baslik;
  return typeof b === "string" ? b : "Öneri";
}

/** Bağlantıyı açar, karar vermez. */
export async function baglantiOnizle(db: Vt, gizli: string, jeton: string, simdi: Date): Promise<BaglantiOnizlemesi> {
  const { kurumId, baglantiId } = jetonCoz(gizli, jeton);
  return kiraciIslemi(db, kurumId, async (tx) => {
    const { bag, o } = await baglantiYukle(tx, baglantiId);
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, bag.kisiId));
    const e = await engel(tx, kurumId, bag, o, simdi);
    return {
      baslik: baslikOku(o),
      oneriTuru: o.tur,
      sonuc: bag.sonuc as BaglantiSonucu,
      kisiAd: kisi?.ad ?? "",
      son: bag.son.toISOString(),
      durum: e ? { gecerli: false, neden: e.message } : { gecerli: true },
    };
  });
}

export interface BaglantiKarari {
  kararId: string;
  oneriId: string;
  sonuc: BaglantiSonucu;
  kararVeren: string;
}

/** Bağlantıyı kullanarak kararı verir. İkinci kez, süre dolunca ya da yüksek riskte reddeder. */
export async function baglantiKullan(db: Vt, gizli: string, jeton: string, simdi: Date): Promise<BaglantiKarari> {
  const { kurumId, baglantiId } = jetonCoz(gizli, jeton);
  try {
    return await kiraciIslemi(db, kurumId, async (tx) => {
      const { bag, o } = await baglantiYukle(tx, baglantiId);
      const e = await engel(tx, kurumId, bag, o, simdi);
      if (e) throw e;
      const sonuc = bag.sonuc as BaglantiSonucu;
      const [k] = await tx
        .insert(sema.karar)
        .values({
          kurumId,
          oneriId: o.id,
          sonuc,
          kararVerenKisiId: bag.kisiId,
          dayanak: "dogrudan",
          gerekce: null,
          zaman: simdi,
        })
        .returning();
      if (!k) throw new Error("Karar eklenemedi.");
      await tx.insert(onayBaglantisiKullanimi).values({ id: bag.id, kurumId, kararId: k.id, zaman: simdi });
      await gunlugeYaz(tx, {
        aktor: { tur: "kisi", id: bag.kisiId },
        eylem: "karar.verildi",
        hedef: { tur: "karar", id: k.id },
        ayrinti: {
          oneri: o.id,
          oneriTuru: o.tur,
          risk: etkinRisk(o),
          sonuc,
          dayanak: "dogrudan",
          toplu: false,
          baglanti: bag.id,
          yol: "eposta",
        },
        zaman: simdi,
      });
      return { kararId: k.id, oneriId: o.id, sonuc, kararVeren: bag.kisiId };
    });
  } catch (e) {
    if (e instanceof ServisHatasi) throw e;
    const c = vtHatasiCevir(e);
    if (c instanceof ServisHatasi && c.kod === "cakisma")
      throw new ServisHatasi("cakisma", "Bu bağlantı daha önce kullanıldı. Bir bağlantı yalnız bir kez kullanılır.");
    throw c;
  }
}

// ---------- Özet e-postası ----------

export type OzetSikligi = "gunluk" | "haftalik";

export interface OzetAyari {
  gizli: string;
  /** Ör. https://akredit.org — bağlantılar `${temelAdres}/onay/eposta?jeton=…` biçiminde. */
  temelAdres: string;
  siklik: OzetSikligi;
  sureSaat?: number;
}

export interface OzetIletisi {
  konu: string;
  metin: string;
  /** Özete giren öneri sayısı (yüksek risk dahil). */
  oneriSayisi: number;
}

const TUR_ADI: Record<string, string> = {
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
  dis_ornek: "Başka kurumdan örnek (kanıt değildir)",
};

/**
 * Kişinin karar verebildiği bekleyen önerilerin özeti. Düşük/orta riskte onay ve ret bağlantıları üretilir;
 * yüksek riskte yalnız panel bağlantısı verilir. Bekleyen öneri yoksa `null` (e-posta gönderilmez).
 */
export async function onayOzeti(
  db: Vt,
  kurumId: string,
  kisiId: string,
  simdi: Date,
  ayar: OzetAyari,
): Promise<OzetIletisi | null> {
  const taban = ayar.temelAdres.replace(/\/+$/u, "");
  return kiraciIslemi(db, kurumId, async (tx) => {
    const satir = await tx
      .select({ o: sema.oneri })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(and(isNull(sema.karar.id)))
      .orderBy(desc(sema.oneri.olusturma));
    const yuksek: string[] = [];
    const diger: string[] = [];
    for (const { o } of satir) {
      if (!(await kararYetkisi(tx, kurumId, kisiId, o, simdi))) continue;
      const satirBasi = `• ${TUR_ADI[o.tur] ?? o.tur}: ${baslikOku(o)}`;
      if (etkinRisk(o) === "yuksek") {
        yuksek.push(`${satirBasi}\n  İncelemek için: ${taban}/panel/onaylar`);
        continue;
      }
      const bag = async (sonuc: BaglantiSonucu) =>
        `${taban}/onay/eposta?jeton=${encodeURIComponent(
          await baglantiUretIslemde(tx, {
            kurumId,
            kisiId,
            oneriId: o.id,
            sonuc,
            simdi,
            gizli: ayar.gizli,
            ...(ayar.sureSaat ? { sureSaat: ayar.sureSaat } : {}),
          }),
        )}`;
      diger.push(`${satirBasi}\n  Onayla: ${await bag("onaylandi")}\n  Reddet: ${await bag("reddedildi")}`);
    }
    const toplam = yuksek.length + diger.length;
    if (!toplam) return null;
    const donem = ayar.siklik === "gunluk" ? "Günlük" : "Haftalık";
    const sure = ayar.sureSaat ?? VARSAYILAN_SAAT;
    const parcalar = [
      `Kararınızı bekleyen ${toplam} öneri var.`,
      ...(yuksek.length
        ? [`Tek tek incelenmesi gerekenler (${yuksek.length}). Bunlar e-postayla onaylanamaz:`, ...yuksek]
        : []),
      ...(diger.length ? [`Bağlantıyla karar verebilecekleriniz (${diger.length}):`, ...diger] : []),
      `Her bağlantı yalnız bir kez ve ${sure} saat içinde kullanılabilir. Bağlantıyı açınca kararı bir kez daha onaylamanız istenir.`,
      `Bütün öneriler: ${taban}/panel/onaylar`,
    ];
    return { konu: `${donem} onay özeti: ${toplam} öneri bekliyor`, metin: parcalar.join("\n\n"), oneriSayisi: toplam };
  });
}
