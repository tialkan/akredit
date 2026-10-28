// Kendini kapatan PÜKÖ (İP-39): eşik altı ölçüm → karar kartı → önlem → gelecek dönemin Bologna taslağı
// (İP-38 sessiz devir girdisi) ve süreç motoru eylemi → sonraki dönem ölçümüyle önce/sonra karşılaştırması
// → otomatik kapanış ve kanıt bağlantısı. İyileşmediyse yeni karar kartı.
//
// Sayılar yalnız `@akredit/cekirdek` ve `@akredit/olcme` hesaplarından gelir. Model yalnız önlem metni
// önerir; rakam içeren metin düşürülür.

import {
  type EsikAltiOlcum,
  istisnalariKumele,
  type KartKararSuresi,
  katmanBelirle,
  type OnayYorgunlugu,
  onayYorgunlugu,
  onlemMetniGecerliMi,
  pukoKapanisi,
  zorunluKararDenetle,
} from "@akredit/cekirdek";
import type { KokNeden } from "@akredit/olcme";
import { type GunlukGirdisi, gunlugeYaz, type Islem } from "@akredit/vt";
import { z } from "zod";
import type {
  KararKarti,
  OnlemSecenegi,
  OtomatikKayit,
  PukoDeposu,
  PukoKaydi,
  PukoOlayi,
  SessizDevirGirdisi,
  SurecEylemi,
} from "./turler.ts";

export * from "./turler.ts";

/** Ölçüm girdisi: hesaplanmış bir ÇK ya da PÇ değeri (eşiği geçen ya da geçmeyen). */
export const PukoOlcumu = z
  .object({
    olcumTuru: z.enum(["ck", "pc"]),
    kod: z.string().min(1),
    dersKodu: z.string().min(1),
    donem: z.string().min(1),
    deger: z.number().finite(),
    esik: z.number().finite(),
    kaynak: z.object({
      kanitId: z.string().optional(),
      hesapSurumu: z.string().min(1),
      girdiOzeti: z.string().optional(),
    }),
  })
  .strict();
export type PukoOlcumu = z.infer<typeof PukoOlcumu>;

/** Modelin önerdiği önlem metinleri. Kurum izni ve sağlayıcı seçimi çağıranın işidir. */
export type OnlemOnericisi = (girdi: {
  olcumTuru: "ck" | "pc";
  kod: string;
  dersKodlari: string[];
  kokNedenler: KokNeden[];
}) => Promise<unknown>;

const OnericiCiktisi = z.array(z.string()).max(10);

/** Model yoksa ya da yetersizse kullanılan hazır önlemler (rakamsız). */
export const KURAL_ONLEMLERI: readonly string[] = [
  "Zor çıkan soruların konusunu derste ek uygulama ve örnek çözümle yeniden işle.",
  "Bu çıktıyı ölçen soruları gözden geçir; çıktıyla uyumunu ve açıklığını düzelt.",
  "Dönem içinde kısa ara değerlendirme ekleyip geri bildirimi erken ver.",
];

export interface KartUretmeBaglami {
  kimlik: () => string;
  zaman: string;
  /** Ders kodu + ÇK/PÇ kodu → kök nedenler. PÇ kümesinde dersin o PÇ'ye katkılı ÇK'larının nedenleri. */
  kokNeden: (o: EsikAltiOlcum) => KokNeden[];
  onerici?: OnlemOnericisi;
  /** İyileşmeyen önceki döngüler: küme anahtarı → PÜKÖ kimliği. */
  oncekiler?: ReadonlyMap<string, string>;
}

export interface KartUretmeSonucu {
  otomatik: OtomatikKayit[];
  kartlar: KararKarti[];
}

async function secenekleriKur(
  baglam: KartUretmeBaglami,
  girdi: Parameters<OnlemOnericisi>[0],
): Promise<OnlemSecenegi[]> {
  const metinler: { metin: string; uretici: "yz" | "kural" }[] = [];
  if (baglam.onerici) {
    try {
      const ham = OnericiCiktisi.safeParse(await baglam.onerici(girdi));
      if (ham.success)
        for (const m of ham.data) {
          if (!onlemMetniGecerliMi(m).gecerli) continue;
          if (metinler.some((x) => x.metin === m.trim())) continue;
          metinler.push({ metin: m.trim(), uretici: "yz" });
          if (metinler.length === 3) break;
        }
    } catch {
      // Model hatası kartı durdurmaz; hazır önlemler kullanılır.
    }
  }
  for (const m of KURAL_ONLEMLERI) {
    if (metinler.length >= 3) break;
    if (metinler.length >= 2 && baglam.onerici) break;
    metinler.push({ metin: m, uretici: "kural" });
  }
  return metinler.map((m) => ({ id: baglam.kimlik(), ...m }));
}

/**
 * Ölçümleri katmanlara ayırır. Eşiği geçenler katman 0: günlüğe "otomatik" diye girecek kayıt olur.
 * Eşik altında kalanlar kümelenir; her küme için katman 2 karar kartı üretilir.
 */
export async function kartlariUret(olcumlerGirdi: unknown, baglam: KartUretmeBaglami): Promise<KartUretmeSonucu> {
  const olcumler = z.array(PukoOlcumu).parse(olcumlerGirdi);
  const otomatik: OtomatikKayit[] = [];
  for (const o of olcumler) {
    const katman = katmanBelirle({ tur: "olcum", olcumTuru: o.olcumTuru, deger: o.deger, esik: o.esik });
    if (katman.katman === 0)
      otomatik.push({ aciklama: "Otomatik kayıt. Dayanak: kaynak sistem ve deterministik hesap.", olcum: o, katman });
  }
  const kartlar: KararKarti[] = [];
  for (const kume of istisnalariKumele(olcumler)) {
    const kokNedenler: Record<string, KokNeden[]> = {};
    for (const o of kume.olcumler) kokNedenler[o.dersKodu] = baglam.kokNeden(o);
    const secenekler = await secenekleriKur(baglam, {
      olcumTuru: kume.olcumTuru,
      kod: kume.kod,
      dersKodlari: kume.olcumler.map((o) => o.dersKodu),
      kokNedenler: Object.values(kokNedenler).flat(),
    });
    kartlar.push({
      id: baglam.kimlik(),
      pukoId: baglam.kimlik(),
      kume,
      katman: katmanBelirle({ tur: "olcum", olcumTuru: kume.olcumTuru, deger: kume.enDusuk, esik: kume.esik }),
      kokNedenler,
      secenekler,
      oncekiPukoId: baglam.oncekiler?.get(kume.anahtar) ?? null,
      olusturma: baglam.zaman,
    });
  }
  return { otomatik, kartlar };
}

/** Kartları depoya "açıldı" olayı olarak ekler. */
export async function kartlariAc(depo: PukoDeposu, kartlar: readonly KararKarti[]): Promise<void> {
  for (const kart of kartlar) await depo.ekle({ tur: "acildi", pukoId: kart.pukoId, kart, zaman: kart.olusturma });
}

/** Olaylardan güncel PÜKÖ kayıtları. */
export async function pukoKayitlari(depo: PukoDeposu): Promise<PukoKaydi[]> {
  const kayitlar = new Map<string, PukoKaydi>();
  for (const o of await depo.olaylar()) {
    if (o.tur === "acildi") {
      kayitlar.set(o.pukoId, { pukoId: o.pukoId, durum: "acik", kart: o.kart, onlem: null, kapanis: null });
      continue;
    }
    const k = kayitlar.get(o.pukoId);
    if (!k) continue;
    if (o.tur === "onlem_secildi" && k.durum === "acik") {
      k.onlem = o;
      k.durum = "onlem_secildi";
    } else if (o.tur === "kapandi" && k.durum === "onlem_secildi") {
      k.kapanis = o;
      k.durum = o.durum;
    }
  }
  return [...kayitlar.values()];
}

export const OnlemSecimi = z
  .object({
    kartId: z.string().min(1),
    secim: z.union([
      z.object({ secenekId: z.string().min(1) }).strict(),
      z.object({ kendiMetni: z.string().min(1).max(280) }).strict(),
    ]),
    kararVeren: z.string().min(1),
    dayanak: z.enum(["dogrudan", "politika", "sure"]).default("dogrudan"),
    toplu: z.boolean().optional(),
    hedefDonem: z.string().min(1),
    /** Kartın açılmasından karara kadar geçen süre (ms). Onay yorgunluğu göstergesi için. */
    sureMs: z.number().int().min(0).max(3_600_000),
  })
  .strict();

export class PukoHatasi extends Error {
  override name = "PukoHatasi";
}

/**
 * Önlemi seçer (katman 2, kişi kararı). Seçilen önlem her ders için sessiz devir girdisine ve tek bir
 * süreç eylemine dönüşür. Kişinin kendi yazdığı metin sayı içerebilir: o metin modelden değil kişiden gelir.
 */
export async function onlemSec(
  depo: PukoDeposu,
  girdi: unknown,
  baglam: { kimlik: () => string; zaman: string },
): Promise<{ devir: SessizDevirGirdisi[]; eylem: SurecEylemi }> {
  const g = OnlemSecimi.parse(girdi);
  const kayit = (await pukoKayitlari(depo)).find((k) => k.kart.id === g.kartId);
  if (!kayit) throw new PukoHatasi("Karar kartı bulunamadı. Sayfayı yenileyip yeniden deneyin.");
  if (kayit.durum !== "acik") throw new PukoHatasi("Bu kart için zaten karar verildi.");
  const denetim = zorunluKararDenetle(kayit.kart.katman, g);
  if (!denetim.gecerli) throw new PukoHatasi(denetim.hatalar.join(" "));
  let onlem: OnlemSecenegi;
  if ("secenekId" in g.secim) {
    const id = g.secim.secenekId;
    const s = kayit.kart.secenekler.find((x) => x.id === id);
    if (!s) throw new PukoHatasi("Seçilen önlem bu kartta yok.");
    onlem = s;
  } else {
    onlem = { id: baglam.kimlik(), metin: g.secim.kendiMetni.trim(), uretici: "kisi" };
  }
  await depo.ekle({
    tur: "onlem_secildi",
    pukoId: kayit.pukoId,
    kartId: kayit.kart.id,
    onlem,
    kararVeren: g.kararVeren,
    hedefDonem: g.hedefDonem,
    sureMs: g.sureMs,
    zaman: baglam.zaman,
  });
  const dersKodlari = kayit.kart.kume.olcumler.map((o) => o.dersKodu);
  return {
    devir: dersKodlari.map((dersKodu) => ({
      dersKodu,
      hedefDonem: g.hedefDonem,
      alan: "ogretim_yontemi_ve_onlem",
      metin: onlem.metin,
      dayanak: { tur: "puko", pukoId: kayit.pukoId, kararVeren: g.kararVeren, zaman: baglam.zaman },
    })),
    eylem: {
      tur: "puko_eylemi",
      pukoId: kayit.pukoId,
      baslik: `${kayit.kart.kume.kod} için önlem: ${onlem.metin}`,
      dersKodlari,
      hedefDonem: g.hedefDonem,
    },
  };
}

/**
 * Sonraki dönemin ölçümleri geldiğinde önlemi seçilmiş ve hedef dönemi bu olan PÜKÖ kayıtlarını kapatır.
 * Karşılaştırma deterministiktir; kapanış kaydı ölçme sonucunun kanıtına bağlanır. İyileşmeyen döngüler
 * için aynı kümede yeni karar kartı üretilir ve açılır.
 */
export async function sonrakiDonemiIsle(
  depo: PukoDeposu,
  olcumlerGirdi: unknown,
  baglam: KartUretmeBaglami & { kanitId: string },
): Promise<{ kapananlar: PukoKaydi[]; yeniKartlar: KararKarti[] }> {
  const olcumler = z.array(PukoOlcumu).parse(olcumlerGirdi);
  const kapanacak = (await pukoKayitlari(depo)).filter(
    (k) => k.durum === "onlem_secildi" && olcumler.some((o) => o.donem === k.onlem?.hedefDonem),
  );
  const oncekiler = new Map<string, string>();
  const yeniden: PukoOlcumu[] = [];
  for (const k of kapanacak) {
    const hedef = k.onlem?.hedefDonem as string;
    const ilgili = olcumler.filter(
      (o) => o.donem === hedef && o.olcumTuru === k.kart.kume.olcumTuru && o.kod === k.kart.kume.kod,
    );
    const sonraki = new Map(ilgili.map((o) => [o.dersKodu, o.deger] as const));
    const r = pukoKapanisi(k.kart.kume.olcumler, sonraki);
    const olay: PukoOlayi = {
      tur: "kapandi",
      pukoId: k.pukoId,
      durum: r.durum,
      karsilastirma: r.karsilastirma,
      kanitId: baglam.kanitId,
      zaman: baglam.zaman,
    };
    await depo.ekle(olay);
    if (r.durum === "kapandi_iyilesmedi") {
      const dersler = new Set(k.kart.kume.olcumler.map((o) => o.dersKodu));
      const altta = ilgili.filter((o) => dersler.has(o.dersKodu) && o.deger < o.esik);
      // Ölçülemeyen ders sonraki kartta önceki değeriyle kalmaz; ölçülmedi bilgisi karşılaştırmada durur.
      yeniden.push(...altta);
      const anahtar =
        k.kart.kume.olcumTuru === "pc"
          ? `pc|${k.kart.kume.kod}|${hedef}`
          : `ck|${k.kart.kume.olcumler[0]?.dersKodu}|${k.kart.kume.kod}|${hedef}`;
      oncekiler.set(anahtar, k.pukoId);
    }
  }
  const { kartlar } = await kartlariUret(yeniden, { ...baglam, oncekiler });
  await kartlariAc(depo, kartlar);
  const guncel = await pukoKayitlari(depo);
  return {
    kapananlar: guncel.filter((k) => kapanacak.some((x) => x.pukoId === k.pukoId)),
    yeniKartlar: kartlar,
  };
}

/** Kurum düzeyi onay yorgunluğu: kişi alanı taşımaz, küçük kümede gizlidir. */
export async function pukoYorgunlugu(depo: PukoDeposu): Promise<OnayYorgunlugu> {
  const kararlar: KartKararSuresi[] = (await depo.olaylar())
    .filter((o): o is Extract<PukoOlayi, { tur: "onlem_secildi" }> => o.tur === "onlem_secildi")
    .map((o) => ({ katman: 2, sureMs: o.sureMs, sonuc: o.onlem.uretici === "kisi" ? "duzeltildi" : "onaylandi" }));
  return onayYorgunlugu(kararlar);
}

/**
 * Katman 0 kaydının günlük girdisi: kişi değil sistem yazar; dayanak kaynak sistem ve hesap sürümüdür.
 * Onaya düşmez, yalnız eklenir.
 */
export function otomatikGunlukGirdisi(k: OtomatikKayit, zaman: Date): GunlukGirdisi {
  return {
    aktor: { tur: "sistem", id: null },
    eylem: "karar.otomatik",
    hedef: { tur: "olcum", id: `${k.olcum.olcumTuru}|${k.olcum.dersKodu}|${k.olcum.kod}|${k.olcum.donem}` },
    ayrinti: {
      katman: 0,
      kural: k.katman.kural,
      dayanak: "kaynak sistem",
      deger: k.olcum.deger,
      esik: k.olcum.esik,
      hesapSurumu: k.olcum.kaynak.hesapSurumu,
      kanitId: k.olcum.kaynak.kanitId ?? null,
    },
    zaman,
  };
}

/** Katman 0 kayıtlarını kiracı işleminde değiştirilemez günlüğe yazar. */
export async function otomatikKayitlariYaz(tx: Islem, kayitlar: readonly OtomatikKayit[], zaman: Date): Promise<void> {
  for (const k of kayitlar) await gunlugeYaz(tx, otomatikGunlukGirdisi(k, zaman));
}
