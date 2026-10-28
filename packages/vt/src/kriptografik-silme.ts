// Kriptografik silme (İP-40): silme hakkı ile değiştirilemez kaydın uzlaştırılması.
//
// Kişiye özgü 32 baytlık veri anahtarı üretilir, kurum ana anahtarıyla (AES-256-GCM) sarılıp `kisi_anahtari`
// tablosunda tutulur. Kişiye ait değerler bu anahtarla şifrelenip değiştirilemez kayıtlara yazılabilir.
// Silme: anahtar satırı silinir (bağlı takma ad eşlemeleri de silinir), günlüğe yeni bir "kvkk.silme_uygulandi"
// kaydı eklenir. Eski kayıtlar ve özet zinciri değişmez; şifreli değerler artık kimseyle ilişkilendirilemez.
// Bunun hukuken anonimleştirme sayılıp sayılmadığı DOĞRULANMADI (docs/hukuk/saklama-imha-politikasi.md).

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Islem } from "./baglanti.ts";
import { gunlugeYaz, type SorguSonucu, satirlar } from "./gunluk.ts";

const SURUM = "a1";

function sar(anahtar: Uint8Array, acik: Uint8Array): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", anahtar, iv);
  const govde = Buffer.concat([c.update(acik), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), govde]);
}

function ac(anahtar: Uint8Array, sarili: Uint8Array): Buffer {
  const b = Buffer.from(sarili);
  const d = createDecipheriv("aes-256-gcm", anahtar, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]);
}

function anaAnahtarDenetle(ana: Uint8Array): void {
  if (ana.length !== 32) throw new TypeError("Kurum ana anahtarı 32 bayt olmalı.");
}

/** Kişi için anahtar oluşturur (varsa olanı döndürür). Kiracı işlemi içinde çağrılır. Anahtar kimliğini döndürür. */
export async function kisiAnahtariOlustur(tx: Islem, konu: string, anaAnahtar: Uint8Array): Promise<string> {
  anaAnahtarDenetle(anaAnahtar);
  const var_ = satirlar(
    (await tx.execute(sql`select id::text as id from kisi_anahtari where konu = ${konu}`)) as unknown as SorguSonucu<{
      id: string;
    }>,
  )[0];
  if (var_) return var_.id;
  const sarili = sar(anaAnahtar, randomBytes(32));
  const r = satirlar(
    (await tx.execute(
      sql`insert into kisi_anahtari (kurum_id, konu, anahtar_sarili) values (etkin_kurum(), ${konu}, ${sarili}) returning id::text as id`,
    )) as unknown as SorguSonucu<{ id: string }>,
  )[0];
  if (!r) throw new Error("Kişi anahtarı eklenemedi.");
  return r.id;
}

async function veriAnahtari(tx: Islem, anahtarId: string, anaAnahtar: Uint8Array): Promise<Buffer | null> {
  anaAnahtarDenetle(anaAnahtar);
  const r = satirlar(
    (await tx.execute(
      sql`select anahtar_sarili from kisi_anahtari where id = ${anahtarId}::uuid`,
    )) as unknown as SorguSonucu<{ anahtar_sarili: Uint8Array }>,
  )[0];
  return r ? ac(anaAnahtar, r.anahtar_sarili) : null;
}

/** Değeri kişinin anahtarıyla şifreler: "a1:<anahtarId>:<base64>". Değiştirilemez kayda yazılabilir. */
export async function kisiyeOzguSifrele(
  tx: Islem,
  anahtarId: string,
  acikMetin: string,
  anaAnahtar: Uint8Array,
): Promise<string> {
  const k = await veriAnahtari(tx, anahtarId, anaAnahtar);
  if (!k) throw new Error("Kişi anahtarı yok; bu kişiye ait veri silinmiş olabilir.");
  return `${SURUM}:${anahtarId}:${sar(k, Buffer.from(acikMetin, "utf8")).toString("base64")}`;
}

/** Şifreli değeri çözer. Anahtar silinmişse `null` (kriptografik olarak silinmiş). */
export async function kisiyeOzguCoz(tx: Islem, sifreli: string, anaAnahtar: Uint8Array): Promise<string | null> {
  const [surum, anahtarId, govde] = sifreli.split(":");
  if (surum !== SURUM || !anahtarId || !govde) throw new TypeError("Şifreli değer biçimi tanınmadı.");
  const k = await veriAnahtari(tx, anahtarId, anaAnahtar);
  return k ? ac(k, Buffer.from(govde, "base64")).toString("utf8") : null;
}

export interface SilmeTalebi {
  /** Silme talebinin kimliği (başvuru kaydı). */
  talepId: string;
  anahtarId: string;
  /** Onaylayan kişinin kimliği (ilke 3: adıyla). */
  onaylayanId: string;
  /** Dayanak: ör. "KVKK m. 7 talebi, başvuru 2026/14" (DOĞRULANMADI işaretli hukuki atıf kurumun işidir). */
  dayanak: string;
  zaman?: Date;
}

export interface SilmeSonucu {
  silinenAnahtar: number;
  silinenEsleme: number;
  gunlukId: string;
}

/**
 * Kriptografik silme: anahtarı ve bağlı takma ad eşlemelerini siler, günlüğe yeni kayıt ekler.
 * Var olan hiçbir günlük, kanıt ya da karar kaydı değişmez. Kiracı işlemi içinde çağrılır.
 */
export async function kriptografikSil(tx: Islem, t: SilmeTalebi): Promise<SilmeSonucu> {
  const esleme = satirlar(
    (await tx.execute(
      sql`delete from takma_ad where kisi_anahtari_id = ${t.anahtarId}::uuid returning id`,
    )) as unknown as SorguSonucu<{ id: string }>,
  ).length;
  const anahtar = satirlar(
    (await tx.execute(
      sql`delete from kisi_anahtari where id = ${t.anahtarId}::uuid returning id`,
    )) as unknown as SorguSonucu<{ id: string }>,
  ).length;
  if (anahtar === 0) throw new Error("Silinecek kişi anahtarı bulunamadı.");
  const g = await gunlugeYaz(tx, {
    aktor: { tur: "kisi", id: t.onaylayanId },
    eylem: "kvkk.silme_uygulandi",
    hedef: { tur: "kisi_anahtari", id: t.anahtarId },
    ayrinti: { talepId: t.talepId, dayanak: t.dayanak, yontem: "kriptografik", silinenEsleme: esleme },
    ...(t.zaman ? { zaman: t.zaman } : {}),
  });
  return { silinenAnahtar: anahtar, silinenEsleme: esleme, gunlukId: g.id };
}
