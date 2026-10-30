// Yönetici özeti kapısı (İP-39, İP-13 onay motoruna bağlantı). Nihai rapor ve dış gönderim kararından önce
// karar veren kişi bir sayfalık özeti görür. "Özet görüldü" bilgisi değiştirilemez günlüğe özetin imzasıyla
// yazılır; onay motoru (`kararVer`) bu türlerde onay ya da düzeltmeyi yalnız aynı kişinin güncel özeti
// gördüğü kayıt varsa kabul eder. Özet değişirse yeniden görmek gerekir (`nihaiOnayKapisi`).
//
// Sayılar `@akredit/gosterge` hesabından ve PÜKÖ olaylarından gelir; model yoktur.

import {
  type GostergeDegisimi,
  nihaiOnayKapisi,
  type OneriTuru,
  type YoneticiOzeti,
  yoneticiOzeti,
} from "@akredit/cekirdek";
import { gostergeHesapla } from "@akredit/gosterge";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { gostergeVerisi } from "../gosterge.ts";
import { ServisHatasi } from "../hata.ts";
import { pukoKayitlari, vtPukoDeposu } from "./index.ts";

/** Kararından önce yönetici özetinin görülmesi gereken öneri türleri: dış gönderim (nihai raporun gönderimi). */
export const NIHAI_ONAY_TURLERI: ReadonlySet<OneriTuru> = new Set<OneriTuru>(["dis_gonderim"]);

export const OZET_GORULDU_EYLEMI = "yonetici_ozeti.goruldu";

/** Kurumun güncel yönetici özeti, çağıranın işleminde. Yetki çağıranda denetlenir. */
export async function kurumYoneticiOzeti(tx: Islem, kurumId: string): Promise<YoneticiOzeti> {
  const pano = await gostergeVerisi(tx, kurumId);
  const son = pano.donemler.at(-1) ?? null;
  const onceki = pano.donemler.at(-2) ?? null;
  const gostergeler: GostergeDegisimi[] = pano.tanimlar.map((t) => ({
    kod: t.kod,
    ad: t.ad,
    onceki: onceki ? gostergeHesapla(t, onceki, pano.veriler).deger : null,
    simdiki: son ? gostergeHesapla(t, son, pano.veriler).deger : null,
    kaynak: "gösterge hesabı",
  }));
  // Gelişmeye açık yönler: dış değerlendirmeden aktarılmış eylemler (kurum beyanı, `gelismeyeAcikYonleriAktar`).
  const yonler = await tx
    .select({ tanim: sema.eylem.tanim })
    .from(sema.eylem)
    .where(sql`${sema.eylem.kaynak} ->> 'tur' = 'dis_degerlendirme'`)
    .orderBy(asc(sema.eylem.olusturma), asc(sema.eylem.id));
  const durumlar = (await pukoKayitlari(vtPukoDeposu(tx, kurumId))).map((k) => k.durum);
  return yoneticiOzeti(
    gostergeler,
    yonler.map((y) => y.tanim),
    durumlar,
  );
}

async function nihaiOneri(tx: Islem, oneriId: string) {
  const [o] = await tx.select().from(sema.oneri).where(eq(sema.oneri.id, oneriId));
  if (!o) throw new ServisHatasi("bulunamadi", "Öneri bulunamadı.");
  if (!NIHAI_ONAY_TURLERI.has(o.tur as OneriTuru))
    throw new ServisHatasi("kural_ihlali", "Bu öneri için yönetici özeti gerekmiyor.");
  return o;
}

/** Bir dış gönderim önerisinin kararından önce gösterilecek özet. */
export async function oneriYoneticiOzeti(b: ServisBaglami, oneriId: string): Promise<YoneticiOzeti> {
  if (!z.uuid().safeParse(oneriId).success) throw new ServisHatasi("bulunamadi", "Öneri bulunamadı.");
  return islem(b, async (tx, gerekli) => {
    await nihaiOneri(tx, oneriId);
    await gerekli("rapor.gonder", { tur: "kurum", id: b.aktor.kurumId });
    return kurumYoneticiOzeti(tx, b.aktor.kurumId);
  });
}

export const OzetGorulduGirdisi = z.object({ oneriId: z.uuid(), imza: z.string().min(1).max(200) }).strict();

/**
 * "Özet görüldü" kaydı: yalnız oturumdaki kişi, yalnız güncel özetin imzasıyla. Günlüğe adıyla (kişi kimliği),
 * zamanıyla ve özetin imzasıyla yazılır.
 */
export async function yoneticiOzetiGoruldu(b: ServisBaglami, girdi: unknown): Promise<{ imza: string; zaman: string }> {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Özeti yalnız oturum açmış kişi görmüş sayılır; API anahtarıyla olmaz.");
  const g = OzetGorulduGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await nihaiOneri(tx, g.oneriId);
    await gerekli("rapor.gonder", { tur: "kurum", id: b.aktor.kurumId });
    const ozet = await kurumYoneticiOzeti(tx, b.aktor.kurumId);
    if (ozet.imza !== g.imza)
      throw new ServisHatasi("kural_ihlali", "Özet siz açtıktan sonra değişti. Sayfayı yenileyip güncel özeti görün.");
    await gunluge(tx, b, OZET_GORULDU_EYLEMI, { tur: "oneri", id: g.oneriId }, { imza: ozet.imza });
    return { imza: ozet.imza, zaman: b.simdi().toISOString() };
  });
}

/**
 * Onay motorunun kapısı: nihai türde onay ya da düzeltme kararı, karar veren kişinin bu öneri için güncel
 * özeti gördüğü günlük kaydı olmadan verilemez. Ret kapıya takılmaz (gönderimi durdurmak her zaman açıktır).
 * Kapı geçerse görülen özetin imzası döner (karar günlüğüne yazılır).
 */
export async function nihaiKararKapisi(
  tx: Islem,
  kurumId: string,
  o: { id: string; tur: string },
  kisiId: string,
  sonuc: string,
): Promise<string | null> {
  if (!NIHAI_ONAY_TURLERI.has(o.tur as OneriTuru) || sonuc === "reddedildi") return null;
  const [kayit] = await tx
    .select({ ayrinti: sema.gunluk.ayrinti, zaman: sema.gunluk.zaman })
    .from(sema.gunluk)
    .where(
      and(
        eq(sema.gunluk.eylem, OZET_GORULDU_EYLEMI),
        eq(sema.gunluk.hedefTuru, "oneri"),
        eq(sema.gunluk.hedefId, o.id),
        eq(sema.gunluk.aktorId, kisiId),
      ),
    )
    .orderBy(desc(sema.gunluk.sira))
    .limit(1);
  const imza = (kayit?.ayrinti as { imza?: unknown } | undefined)?.imza;
  const ozet = await kurumYoneticiOzeti(tx, kurumId);
  const kapi = nihaiOnayKapisi(
    ozet,
    kayit && typeof imza === "string" ? { imza, zaman: kayit.zaman.toISOString() } : null,
  );
  if (!kapi.gecerli) throw new ServisHatasi("kural_ihlali", kapi.neden ?? "Önce yönetici özetini görün.");
  return ozet.imza;
}
