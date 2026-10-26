// Değiştirilemez günlük yardımcıları. Kayıt `kanonikJson` ile kanonik metne çevrilir; özet zincirini
// veritabanı tetikleyicisi kurar. Aynı hesap burada da yapılır, böylece dışa aktarılan satırlar
// veritabanı olmadan doğrulanabilir.

import { randomBytes } from "node:crypto";
import { type JsonDegeri, kanonikJson, ozetHesapla, uuidv7 } from "@akredit/cekirdek";
import { sql } from "drizzle-orm";
import { type Islem, kiraciIslemi, type Vt } from "./baglanti.ts";
import { gunluk } from "./sema/index.ts";

export type AktorTuru = "kisi" | "sistem" | "yz";

export interface GunlukGirdisi {
  aktor: { tur: AktorTuru; id: string | null };
  /** ör. "karar.verildi", "politika.imzalandi", "kanit.eklendi" */
  eylem: string;
  hedef?: { tur: string; id: string } | null;
  ayrinti?: { [anahtar: string]: JsonDegeri };
  /** Verilmezse şimdi. */
  zaman?: Date;
  /** Verilmezse UUID v7. */
  id?: string;
}

export interface KanonikGunlukKaydi {
  id: string;
  kurumId: string;
  zaman: string;
  aktor: { tur: AktorTuru; id: string | null };
  eylem: string;
  hedef: { tur: string; id: string } | null;
  ayrinti: { [anahtar: string]: JsonDegeri };
}

/** Günlük kaydının kanonik nesnesini ve metnini üretir. */
export function gunlukKanonigi(kurumId: string, girdi: GunlukGirdisi): { kayit: KanonikGunlukKaydi; kanonik: string } {
  const zaman = girdi.zaman ?? new Date();
  const kayit: KanonikGunlukKaydi = {
    id: girdi.id ?? uuidv7(zaman.getTime(), randomBytes(10)),
    kurumId,
    zaman: zaman.toISOString(),
    aktor: { tur: girdi.aktor.tur, id: girdi.aktor.id },
    eylem: girdi.eylem,
    hedef: girdi.hedef ?? null,
    ayrinti: girdi.ayrinti ?? {},
  };
  return { kayit, kanonik: kanonikJson(kayit) };
}

/** `ozet = sha256(UTF-8(onceki_ozet || kanonik))`; ilk kayıtta önceki özet boş metindir. SQL'deki `gunluk_ozeti` ile aynı. */
export function gunlukOzeti(oncekiOzet: string | null, kanonik: string): string {
  return ozetHesapla((oncekiOzet ?? "") + kanonik);
}

/** Etkin kurumun günlüğüne bir kayıt ekler (kiracı işlemi içinde çağrılır). Eklenen satırı döndürür. */
export async function gunlugeYaz(tx: Islem, girdi: GunlukGirdisi) {
  const sonuc = (await tx.execute(sql`select etkin_kurum()::text as kurum`)) as unknown as SorguSonucu<{
    kurum: string | null;
  }>;
  const kurumId = satirlar(sonuc)[0]?.kurum;
  if (!kurumId) throw new Error("Günlüğe yazmak için etkin kurum ayarlanmalı.");
  const { kayit, kanonik } = gunlukKanonigi(kurumId, girdi);
  const [satir] = await tx
    .insert(gunluk)
    .values({
      id: kayit.id,
      kurumId,
      zaman: new Date(kayit.zaman),
      aktorTuru: kayit.aktor.tur,
      aktorId: kayit.aktor.id,
      eylem: kayit.eylem,
      hedefTuru: kayit.hedef?.tur ?? null,
      hedefId: kayit.hedef?.id ?? null,
      ayrinti: kayit.ayrinti,
      kanonik,
    })
    .returning();
  if (!satir) throw new Error("Günlük kaydı eklenemedi.");
  return satir;
}

/** Kurumun günlük zincirini veritabanında doğrular: ilk bozuk kaydın kimliği ya da `null`. */
export async function zinciriDogrula(db: Vt, kurumId: string): Promise<string | null> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const sonuc = (await tx.execute(
      sql`select gunluk_zinciri_dogrula(${kurumId}::uuid)::text as bozuk`,
    )) as unknown as SorguSonucu<{ bozuk: string | null }>;
    return satirlar(sonuc)[0]?.bozuk ?? null;
  });
}

export interface DisaAktarilanGunlukSatiri {
  id: string;
  sira: number;
  kanonik: string;
  oncekiOzet: string | null;
  ozet: string;
}

/** Dışa aktarılmış satırları (sıraya göre) veritabanı olmadan doğrular: ilk bozuk kaydın kimliği ya da `null`. */
export function zinciriDisaridanDogrula(satirlar_: readonly DisaAktarilanGunlukSatiri[]): string | null {
  let onceki: string | null = null;
  let beklenen = 1;
  for (const s of [...satirlar_].sort((a, b) => a.sira - b.sira)) {
    if (s.sira !== beklenen || s.oncekiOzet !== onceki || s.ozet !== gunlukOzeti(onceki, s.kanonik)) return s.id;
    onceki = s.ozet;
    beklenen++;
  }
  return null;
}

/** Sürücüler `execute` sonucunu farklı biçimde döndürür: PGlite `{rows}`, postgres-js dizi. */
export type SorguSonucu<T> = { rows: T[] } | T[];
export function satirlar<T>(sonuc: SorguSonucu<T>): T[] {
  return Array.isArray(sonuc) ? sonuc : sonuc.rows;
}
