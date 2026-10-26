// Servis bağlamı: kim (aktör), hangi veritabanı, şimdi ne zaman. Aktör her zaman oturumdan ya da API
// anahtarından gelir; istemcinin gönderdiği bir kimlik hiçbir zaman aktör olarak kullanılmaz. Günlüğe
// yazılan aktör de budur (inceleme dalga 1, bulgu 6).

import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import {
  type Eylem,
  type KapsamTuru,
  kimlikOlayi,
  type RolAtamasi,
  type YetkiHedefi,
  type YetkiKisisi,
  yetkiliMi,
} from "@akredit/yetki";
import { eq } from "drizzle-orm";
import { bulunamadi, vtHatasiCevir, yetkiYok } from "./hata.ts";

export interface Aktor extends YetkiKisisi {
  /** Oturumla mı (insan, tarayıcı) yoksa API anahtarıyla mı geldi? */
  tur: "oturum" | "anahtar";
  /** API anahtarıyla gelindiyse anahtarın izinleri; yetki, rollerle bunun kesişimidir. */
  anahtarKapsami: readonly Eylem[] | null;
}

export interface ServisBaglami {
  db: Vt;
  aktor: Aktor;
  simdi: () => Date;
}

export interface Hedef {
  tur: KapsamTuru;
  id: string;
}

/** Kişinin rol atamalarını kiracı işleminde okur. */
export async function atamalariOku(tx: Islem, kisiId: string): Promise<RolAtamasi[]> {
  const satirlar = await tx.select().from(sema.rolAtamasi).where(eq(sema.rolAtamasi.kisiId, kisiId));
  return satirlar.map((r) => ({
    rol: r.rol,
    kapsam: { tur: r.kapsamTuru, id: r.kapsamId },
    baslangic: r.baslangic,
    bitis: r.bitis,
  }));
}

/** Aktörü veritabanından kurar: kişi bu kurumda olmalı. */
export async function aktorYukle(
  db: Vt,
  kurumId: string,
  kisiId: string,
  tur: Aktor["tur"] = "oturum",
  anahtarKapsami: readonly Eylem[] | null = null,
): Promise<Aktor> {
  const atamalar = await kiraciIslemi(db, kurumId, async (tx) => {
    const [k] = await tx.select({ id: sema.kisi.id }).from(sema.kisi).where(eq(sema.kisi.id, kisiId));
    if (!k) throw bulunamadi();
    return atamalariOku(tx, kisiId);
  });
  return { kisiId, kurumId, atamalar, tur, anahtarKapsami };
}

/** Hedefin kapsam zinciri, veritabanından (kiracı işleminde). Başka kurumun kaydı görünmez: `null`. */
export async function hedefZinciri(
  tx: Islem,
  kurumId: string,
  tur: KapsamTuru,
  id: string,
): Promise<YetkiHedefi | null> {
  const kok = { tur: "kurum" as const, id: kurumId };
  if (tur === "kurum") return id === kurumId ? { kurumId, zincir: [kok] } : null;
  const birimZinciri = async (birimId: string) => {
    const zincir: { tur: "birim"; id: string }[] = [];
    let simdiki: string | null = birimId;
    for (let i = 0; simdiki && i < 10; i++) {
      const [b] = await tx
        .select({ id: sema.birim.id, ust: sema.birim.ustBirimId })
        .from(sema.birim)
        .where(eq(sema.birim.id, simdiki));
      if (!b) return null;
      zincir.unshift({ tur: "birim", id: b.id });
      simdiki = b.ust;
    }
    return zincir;
  };
  if (tur === "birim") {
    const z = await birimZinciri(id);
    return z ? { kurumId, zincir: [kok, ...z] } : null;
  }
  const programZinciri = async (programId: string) => {
    const [p] = await tx
      .select({ id: sema.program.id, birimId: sema.program.birimId })
      .from(sema.program)
      .where(eq(sema.program.id, programId));
    if (!p) return null;
    const z = await birimZinciri(p.birimId);
    return z ? [kok, ...z, { tur: "program" as const, id: p.id }] : null;
  };
  if (tur === "program") {
    const z = await programZinciri(id);
    return z ? { kurumId, zincir: z } : null;
  }
  const [d] = await tx
    .select({ id: sema.ders.id, programId: sema.ders.programId })
    .from(sema.ders)
    .where(eq(sema.ders.id, id));
  if (!d) return null;
  const z = await programZinciri(d.programId);
  return z ? { kurumId, zincir: [...z, { tur: "ders", id: d.id }] } : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** Aktör bu eylemi bu hedefte yapabilir mi? */
export function aktorYetkiliMi(a: Aktor, eylem: Eylem, hedef: YetkiHedefi, simdi: Date): boolean {
  if (a.anahtarKapsami && !a.anahtarKapsami.includes(eylem)) return false;
  return yetkiliMi(a, eylem, hedef, simdi);
}

/** Yetki denetleyicisi: aynı işlem içinde hedef zincirlerini önbellekler. */
export class Denetleyici {
  readonly #onbellek = new Map<string, YetkiHedefi | null>();
  readonly tx: Islem;
  readonly b: ServisBaglami;
  constructor(tx: Islem, b: ServisBaglami) {
    this.tx = tx;
    this.b = b;
  }
  async zincir(h: Hedef): Promise<YetkiHedefi | null> {
    if (h.tur !== "kurum" && !UUID.test(h.id)) return null;
    const anahtar = `${h.tur}:${h.id}`;
    if (!this.#onbellek.has(anahtar))
      this.#onbellek.set(anahtar, await hedefZinciri(this.tx, this.b.aktor.kurumId, h.tur, h.id));
    return this.#onbellek.get(anahtar) ?? null;
  }
  async izinliMi(eylem: Eylem, h: Hedef): Promise<boolean> {
    const z = await this.zincir(h);
    return z !== null && aktorYetkiliMi(this.b.aktor, eylem, z, this.b.simdi());
  }
  /** Listeyi, aktörün okuyabildiği kayıtlarla sınırlar. */
  async suz<T>(eylem: Eylem, liste: readonly T[], hedef: (x: T) => Hedef): Promise<T[]> {
    const sonuc: T[] = [];
    for (const x of liste) if (await this.izinliMi(eylem, hedef(x))) sonuc.push(x);
    return sonuc;
  }
}

class Reddedildi {
  readonly eylem: Eylem;
  readonly hedef: Hedef;
  constructor(eylem: Eylem, hedef: Hedef) {
    this.eylem = eylem;
    this.hedef = hedef;
  }
}

/**
 * Kiracı işleminde iş çalıştırır. İş içinde `gerekli(eylem, hedef)` yetkiyi denetler: hedef yoksa 404,
 * yetki yoksa 403 ve işlem geri alınır; ret ayrı bir işlemde günlüğe yazılır.
 */
export async function islem<T>(
  b: ServisBaglami,
  is: (tx: Islem, gerekli: (eylem: Eylem, hedef: Hedef) => Promise<YetkiHedefi>, d: Denetleyici) => Promise<T>,
): Promise<T> {
  const kurumId = b.aktor.kurumId;
  try {
    return await kiraciIslemi(b.db, kurumId, async (tx) => {
      const d = new Denetleyici(tx, b);
      const gerekli = async (eylem: Eylem, hedef: Hedef) => {
        const z = await d.zincir(hedef);
        if (!z) throw bulunamadi();
        if (!aktorYetkiliMi(b.aktor, eylem, z, b.simdi())) throw new Reddedildi(eylem, hedef);
        return z;
      };
      return is(tx, gerekli, d);
    });
  } catch (e) {
    if (e instanceof Reddedildi) {
      await kiraciIslemi(b.db, kurumId, (tx) =>
        gunlugeYaz(
          tx,
          kimlikOlayi({
            aktor: { tur: "kisi", id: b.aktor.kisiId },
            eylem: "kimlik.erisim_reddedildi",
            hedef: { tur: e.hedef.tur, id: e.hedef.id },
            ayrinti: { istenen: e.eylem, yol: b.aktor.tur },
          }),
        ),
      );
      throw yetkiYok();
    }
    throw vtHatasiCevir(e);
  }
}

/** Günlüğe aktörü bağlamdan alarak yazar; çağıran aktör veremez. */
export function gunluge(
  tx: Islem,
  b: ServisBaglami,
  eylem: string,
  hedef: { tur: string; id: string } | null,
  ayrinti: Record<string, string | number | boolean | null | string[]> = {},
) {
  return gunlugeYaz(tx, {
    aktor: { tur: "kisi", id: b.aktor.kisiId },
    eylem,
    hedef,
    ayrinti: { ...ayrinti, yol: b.aktor.tur },
    zaman: b.simdi(),
  });
}
