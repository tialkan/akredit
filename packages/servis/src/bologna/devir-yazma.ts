// Onaylanmış devir taslağını kaynağa (Proliz Bologna/OBS) geri yazma (İP-38).
//
// Kurallar:
//   - Kurumun yazılı izni olmadan HİÇ çalışmaz. İzin kurum ayarında açık kayıttır: kim (adıyla, hesabındaki gibi
//     yazarak), ne zaman, yazı sayısı; yalnız eklenir (geri alma yeni kayıt), günlüğe girer.
//   - Kuru çalıştırma varsayılandır. Gerçek yazma yalnız izin kaydında "gerçek yazma" açıkça seçildiyse ve çağıran
//     kuru olmayan kipi istediyse yapılır.
//   - Yalnız onaylı taslağın yazma planındaki alanlar yazılır; giriş bilgisi alanı plana giremez.
//   - Her alan işlemi ve sonuç günlüğe girer. Değerlerin kendisi değil SHA-256 özeti yazılır (yetkili e-postası
//     gibi alanlar günlükte açık durmasın). Giriş bilgisi yazıcıya servisten hiç verilmez (ilke 8).

import type { KaynakYazmaAlani, KaynakYazmaRaporu } from "@akredit/baglayicilar";
import { ozetHesapla } from "@akredit/cekirdek";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { ServisHatasi } from "../hata.ts";
import { adlarAyniMi } from "../yardimci.ts";
import { onayliDevirler, yazmaDurumuOku } from "./devir.ts";
import { girisAlaniVarMi, yazmaPlaniKur } from "./saf.ts";

/** Kaynağa yazan tarayıcı ajanı (`@akredit/baglayicilar` prolizaYaz + Playwright). */
export interface DevirYazici {
  yaz(is: { dersKodu: string; alanlar: KaynakYazmaAlani[]; kuru: boolean }): Promise<KaynakYazmaRaporu>;
}

const IzinKaydi = z.object({
  acik: z.boolean(),
  gercekYazma: z.boolean(),
  yaziSayisi: z.string(),
  verenKisiId: z.string(),
  verenAd: z.string(),
  zaman: z.string(),
});
type IzinKaydi = z.infer<typeof IzinKaydi>;

const KurumYazmaAyari = z
  .object({
    kaynagaYazma: z
      .object({ izinler: z.array(IzinKaydi) })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const YazmaIzniGirdisi = z
  .object({
    acik: z.boolean(),
    /** Kapalıyken yalnız kuru çalıştırma yapılır (neyin değişeceği raporlanır, kaynağa yazılmaz). */
    gercekYazma: z.boolean().default(false),
    /** Kurumun yazılı izninin sayısı / tarihi (EBYS evrak sayısı). */
    yaziSayisi: z.string().trim().min(1, "Yazılı iznin sayısını yazın.").max(200),
    /** İzni veren kişi adını hesabındaki gibi yazar. */
    imzalayanAd: z.string().trim().min(1, "Adınızı yazın.").max(200),
  })
  .strict();

export const YazmaIzni = z
  .object({
    acik: z.boolean(),
    gercekYazma: z.boolean(),
    yaziSayisi: z.string(),
    veren: z.string(),
    zaman: z.string(),
  })
  .nullable();

async function izinler(tx: Islem, kurumId: string): Promise<IzinKaydi[]> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const a = KurumYazmaAyari.safeParse(k?.a ?? {});
  return a.success ? (a.data.kaynagaYazma?.izinler ?? []) : [];
}

/** Yürürlükteki izin: son kayıt. */
export async function gecerliYazmaIzni(tx: Islem, kurumId: string): Promise<IzinKaydi | null> {
  const l = await izinler(tx, kurumId);
  return l.at(-1) ?? null;
}

const izinGorunumu = (i: IzinKaydi | null): z.infer<typeof YazmaIzni> =>
  i ? { acik: i.acik, gercekYazma: i.gercekYazma, yaziSayisi: i.yaziSayisi, veren: i.verenAd, zaman: i.zaman } : null;

export async function kaynagaYazmaIzni(b: ServisBaglami): Promise<z.infer<typeof YazmaIzni>> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur: "kurum", id: b.aktor.kurumId });
    return izinGorunumu(await gecerliYazmaIzni(tx, b.aktor.kurumId));
  });
}

/** Kurumun yazılı iznini kaydeder ya da geri alır (yeni kayıtla). Yalnız oturumdaki kurum yöneticisi. */
export async function kaynagaYazmaIzniVer(b: ServisBaglami, girdi: unknown): Promise<z.infer<typeof YazmaIzni>> {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Kaynağa yazma izni yalnız oturum açmış kişi tarafından verilir.");
  const g = YazmaIzniGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", { tur: "kurum", id: b.aktor.kurumId });
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    if (!kisi || !adlarAyniMi(g.imzalayanAd, kisi.ad))
      throw new ServisHatasi("kural_ihlali", "İzni kaydetmek için adınızı hesabınızdaki gibi yazın.");
    const [k] = await tx.select().from(sema.kurum).where(eq(sema.kurum.id, b.aktor.kurumId));
    const eski = (k?.ayarlar ?? {}) as Record<string, unknown>;
    const kayit: IzinKaydi = {
      acik: g.acik,
      gercekYazma: g.acik && g.gercekYazma,
      yaziSayisi: g.yaziSayisi,
      verenKisiId: b.aktor.kisiId,
      verenAd: kisi.ad,
      zaman: b.simdi().toISOString(),
    };
    await tx
      .update(sema.kurum)
      .set({
        ayarlar: {
          ...eski,
          kaynagaYazma: {
            ...((eski.kaynagaYazma as object) ?? {}),
            izinler: [...(await izinler(tx, b.aktor.kurumId)), kayit],
          },
        },
      })
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(
      tx,
      b,
      "bologna.kaynaga_yazma_izni",
      { tur: "kurum", id: b.aktor.kurumId },
      { acik: kayit.acik, gercekYazma: kayit.gercekYazma, yaziSayisi: kayit.yaziSayisi, veren: kisi.ad },
    );
    return izinGorunumu(kayit);
  });
}

/** Onaylanmış ve henüz kaynağa yazılmamış devir taslakları. */
export async function yazilacakDevirler(db: Vt, kurumId: string): Promise<string[]> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const liste: string[] = [];
    for (const d of await onayliDevirler(tx)) {
      const y = await yazmaDurumuOku(tx, d.oneriId);
      if (y.durum !== "yazildi") liste.push(d.oneriId);
    }
    return liste;
  });
}

export interface KaynagaYazmaSonucu {
  durum: "izin_yok" | "kuru" | "yazildi" | "hata";
  rapor: KaynakYazmaRaporu | null;
}

const kisaOzet = (s: string | null) => (s === null ? null : ozetHesapla(s).slice(0, 16));

/**
 * Onaylı devir taslağını kaynağa yazar. Sistem işidir (işçi): aktör günlükte "sistem"dir; dayanak taslağın
 * onay kararı ve kurumun yazılı iznidir.
 */
export async function devirKaynagaYaz(
  db: Vt,
  kurumId: string,
  oneriId: string,
  yazici: DevirYazici,
  simdi: Date,
  secenek: { kuru?: boolean } = {},
): Promise<KaynagaYazmaSonucu> {
  const hazirlik = await kiraciIslemi(db, kurumId, async (tx) => {
    const d = (await onayliDevirler(tx)).find((x) => x.oneriId === oneriId);
    if (!d) throw new ServisHatasi("kural_ihlali", "Bu taslak onaylanmadan kaynağa yazılmaz.");
    const [karar] = await tx.select().from(sema.karar).where(eq(sema.karar.oneriId, oneriId));
    const izin = await gecerliYazmaIzni(tx, kurumId);
    const yaz = (eylem: string, ayrinti: Record<string, string | number | boolean | null | string[]>) =>
      gunlugeYaz(tx, {
        aktor: { tur: "sistem", id: null },
        eylem,
        hedef: { tur: "oneri", id: oneriId },
        ayrinti,
        zaman: simdi,
      });
    if (!izin?.acik) {
      await yaz("bologna.kaynaga_yazma_izni_yok", { ileti: "Kurumun yazılı izni yok; kaynağa yazılmadı." });
      return null;
    }
    const alanlar = yazmaPlaniKur(d.taslak, `onaylı devir ${oneriId}`).map((a) => ({
      sekme: a.sekme,
      alan: a.alan,
      deger: a.deger,
    }));
    const giris = girisAlaniVarMi(alanlar);
    if (giris.length) throw new ServisHatasi("kural_ihlali", `Plana giriş bilgisi alanı giremez: ${giris.join(", ")}.`);
    const kuru = !izin.gercekYazma || secenek.kuru !== false;
    await yaz("bologna.kaynaga_yazma_basladi", {
      karar: karar?.id ?? null,
      dayanak: karar?.dayanak ?? null,
      izinYazisi: izin.yaziSayisi,
      izinVeren: izin.verenAd,
      kuru,
      alan: alanlar.length,
    });
    return { dersKodu: d.taslak.kod, alanlar, kuru };
  });
  if (!hazirlik) return { durum: "izin_yok", rapor: null };
  let rapor: KaynakYazmaRaporu;
  try {
    rapor = await yazici.yaz(hazirlik);
  } catch {
    rapor = { kuru: hazirlik.kuru, alanlar: [], kaydedildi: false, tamam: false, hata: "Tarayıcı ajanı çalışmadı." };
  }
  const durum: KaynagaYazmaSonucu["durum"] = !rapor.tamam ? "hata" : rapor.kuru ? "kuru" : "yazildi";
  await kiraciIslemi(db, kurumId, async (tx) => {
    for (const a of rapor.alanlar)
      await gunlugeYaz(tx, {
        aktor: { tur: "sistem", id: null },
        eylem: "bologna.kaynak_alani",
        hedef: { tur: "oneri", id: oneriId },
        ayrinti: {
          sekme: a.sekme,
          alan: a.alan,
          durum: a.durum,
          oncekiOzet: kisaOzet(a.onceki),
          yeniOzet: kisaOzet(a.yeni),
          kuru: rapor.kuru,
        },
        zaman: simdi,
      });
    const sayi = (d: string) => rapor.alanlar.filter((a) => a.durum === d).length;
    await gunlugeYaz(tx, {
      aktor: { tur: "sistem", id: null },
      eylem:
        durum === "yazildi"
          ? "bologna.kaynaga_yazildi"
          : durum === "kuru"
            ? "bologna.kaynak_kuru_calisma"
            : "bologna.kaynaga_yazma_hatasi",
      hedef: { tur: "oneri", id: oneriId },
      ayrinti: {
        kuru: rapor.kuru,
        kaydedildi: rapor.kaydedildi,
        dogrulandi: sayi("dogrulandi"),
        yazilacak: sayi("yazilacak"),
        ayni: sayi("ayni"),
        eslesmedi: sayi("eslesmedi"),
        dogrulanamadi: sayi("dogrulanamadi"),
        ileti: rapor.hata,
      },
      zaman: simdi,
    });
  });
  return { durum, rapor };
}
