// Ajan döngüsü: apps/cli/lib/ajan.mjs düzeninin genelleştirilmiş hali.
// Yetki kodla uygulanır: "onay_gerektirir" araç çalıştırılmaz, "bekleyen onay" olarak döner; "yasak" reddedilir.
import { z } from "zod";
import { type AracCagrisi, type AracTanimi, type Mesaj, type Saglayici, YzHatasi } from "./saglayici.ts";

export type AracYetkisi = "okuma" | "oneri" | "onay_gerektirir" | "yasak";

export interface Arac<A = unknown> {
  ad: string;
  aciklama: string;
  sema: z.ZodType<A>;
  yetki: AracYetkisi;
  calistir(argumanlar: A, baglam: { sinyal?: AbortSignal }): Promise<unknown> | unknown;
}

/** Tür güvenli araç tanımı yardımcısı. */
export function aracTanimla<S extends z.ZodType>(arac: {
  ad: string;
  aciklama: string;
  sema: S;
  yetki: AracYetkisi;
  calistir(argumanlar: z.infer<S>, baglam: { sinyal?: AbortSignal }): Promise<unknown> | unknown;
}): Arac {
  return arac as unknown as Arac;
}

export interface BekleyenOnay {
  cagriId: string;
  arac: string;
  argumanlar: unknown;
}

export type AjanOlayi =
  | { tur: "model_yaniti"; tur_no: number; icerik: string; aracCagrilari: AracCagrisi[] }
  | { tur: "arac_calisti"; arac: string; cagriId: string; basarili: boolean }
  | { tur: "arac_reddedildi"; arac: string; cagriId: string; neden: string }
  | { tur: "onay_bekliyor"; arac: string; cagriId: string }
  | { tur: "bitti"; neden: AjanBitisNedeni };

export type AjanBitisNedeni = "yanit" | "tur_siniri" | "onay_bekliyor" | "iptal";

export interface AjanAyari {
  saglayici: Saglayici;
  mesajlar: Mesaj[];
  araclar: Arac[];
  /** En çok model turu. Varsayılan 12. */
  turSiniri?: number;
  /** Araç çıktısının modele giden en çok karakteri. Varsayılan 8000. */
  aracCiktisiSiniri?: number;
  sinyal?: AbortSignal;
  olay?: (o: AjanOlayi) => void;
}

export interface AjanSonucu {
  yanit: string;
  neden: AjanBitisNedeni;
  mesajlar: Mesaj[];
  bekleyenOnaylar: BekleyenOnay[];
  turSayisi: number;
}

export function kisalt(metin: string, sinir: number): string {
  if (metin.length <= sinir) return metin;
  return `${metin.slice(0, sinir)}\n[… ${metin.length - sinir} karakter kısaltıldı]`;
}

export function aracTanimlari(araclar: Arac[]): AracTanimi[] {
  return araclar
    .filter((a) => a.yetki !== "yasak")
    .map((a) => {
      const { $schema: _s, ...parametreler } = z.toJSONSchema(a.sema) as Record<string, unknown>;
      return { ad: a.ad, aciklama: a.aciklama, parametreler };
    });
}

export async function ajanCalistir(ayar: AjanAyari): Promise<AjanSonucu> {
  const turSiniri = ayar.turSiniri ?? 12;
  const ciktiSiniri = ayar.aracCiktisiSiniri ?? 8000;
  const mesajlar: Mesaj[] = [...ayar.mesajlar];
  const tanimlar = aracTanimlari(ayar.araclar);
  const kayit = new Map(ayar.araclar.map((a) => [a.ad, a]));
  const bekleyen: BekleyenOnay[] = [];
  const bitir = (neden: AjanBitisNedeni, yanit: string, tur: number): AjanSonucu => {
    ayar.olay?.({ tur: "bitti", neden });
    return { yanit, neden, mesajlar, bekleyenOnaylar: bekleyen, turSayisi: tur };
  };

  let sonYanit = "";
  for (let tur = 1; tur <= turSiniri; tur++) {
    if (ayar.sinyal?.aborted) return bitir("iptal", sonYanit, tur - 1);
    let yanit: Awaited<ReturnType<Saglayici["sohbet"]>>;
    try {
      yanit = await ayar.saglayici.sohbet({
        mesajlar,
        ...(tanimlar.length ? { araclar: tanimlar } : {}),
        ...(ayar.sinyal ? { sinyal: ayar.sinyal } : {}),
      });
    } catch (e) {
      if (e instanceof YzHatasi && e.tur === "iptal") return bitir("iptal", sonYanit, tur - 1);
      throw e;
    }
    sonYanit = yanit.icerik;
    ayar.olay?.({ tur: "model_yaniti", tur_no: tur, icerik: yanit.icerik, aracCagrilari: yanit.aracCagrilari });
    mesajlar.push({ rol: "asistan", icerik: yanit.icerik, aracCagrilari: yanit.aracCagrilari });
    if (!yanit.aracCagrilari.length) return bitir("yanit", yanit.icerik, tur);

    for (const c of yanit.aracCagrilari) {
      const arac = kayit.get(c.ad);
      const cevapla = (icerik: string) => mesajlar.push({ rol: "arac", icerik, aracCagriId: c.id });
      if (!arac || arac.yetki === "yasak") {
        const neden = arac ? "Bu araç kullanılamaz." : "Böyle bir araç yok.";
        ayar.olay?.({ tur: "arac_reddedildi", arac: c.ad, cagriId: c.id, neden });
        cevapla(`REDDEDİLDİ: ${neden}`);
        continue;
      }
      const arg = arac.sema.safeParse(c.argumanlar);
      if (!arg.success) {
        const neden = `Argümanlar geçersiz: ${arg.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`;
        ayar.olay?.({ tur: "arac_reddedildi", arac: c.ad, cagriId: c.id, neden });
        cevapla(`REDDEDİLDİ: ${neden}`);
        continue;
      }
      if (arac.yetki === "onay_gerektirir") {
        bekleyen.push({ cagriId: c.id, arac: c.ad, argumanlar: arg.data });
        ayar.olay?.({ tur: "onay_bekliyor", arac: c.ad, cagriId: c.id });
        cevapla("BEKLİYOR: Bu işlem bir kişinin onayını bekliyor; sen yapmış sayılmazsın.");
        continue;
      }
      try {
        const sonuc = await arac.calistir(arg.data, ayar.sinyal ? { sinyal: ayar.sinyal } : {});
        const metin = typeof sonuc === "string" ? sonuc : JSON.stringify(sonuc);
        cevapla(kisalt(metin ?? "", ciktiSiniri));
        ayar.olay?.({ tur: "arac_calisti", arac: c.ad, cagriId: c.id, basarili: true });
      } catch (e) {
        cevapla(`HATA: ${e instanceof Error ? e.message : String(e)}`);
        ayar.olay?.({ tur: "arac_calisti", arac: c.ad, cagriId: c.id, basarili: false });
      }
    }
    if (bekleyen.length) return bitir("onay_bekliyor", sonYanit, tur);
  }
  return bitir("tur_siniri", sonYanit, turSiniri);
}
