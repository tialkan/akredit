// Kurum dolaşımı ve kurum ayarındaki bağlayıcı bölümü.
// İşçi ayrıcalıksız kullanıcıyla bağlanır; kurum listesi yalnız kimlik döndüren `isci_kurumlari()` işleviyle
// (0010 göçü) alınır. Kurumun içi her zaman `kiraciIslemi` ile o kurumun kimliğiyle okunur ve yazılır.

import { kiraciIslemi, type SorguSonucu, satirlar, sema, type Vt } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

export async function kurumlariListele(db: Vt): Promise<string[]> {
  const s = (await db.execute(sql`select isci_kurumlari()::text as id`)) as unknown as SorguSonucu<{ id: string }>;
  return satirlar(s).map((x) => x.id);
}

export const BAGLAYICI_TURLERI = ["bologna", "avesis", "yokatlas", "eposta", "drive"] as const;
export type BaglayiciTuru = (typeof BAGLAYICI_TURLERI)[number];

const Son = z
  .object({ zaman: z.string(), eklenen: z.number().int(), zatenVar: z.number().int(), ileti: z.string().optional() })
  .optional();

/** Kurum ayarındaki `baglayicilar` bölümü. Açık olmayan ya da geçersiz bağlayıcı çalışmaz. */
export const BaglayiciAyarSemasi = z.object({
  bologna: z.object({ acik: z.boolean(), adresler: z.array(z.url()).min(1).max(50), son: Son }).optional(),
  /** AVESİS: adresler kişi kaydındaki `avesis_adresi` sütunundan okunur. */
  avesis: z.object({ acik: z.boolean(), son: Son }).optional(),
  yokatlas: z
    .object({ acik: z.boolean(), programKodlari: z.array(z.string().regex(/^\d{9}$/u)).min(1), son: Son })
    .optional(),
  eposta: z
    .object({
      acik: z.boolean(),
      saglayici: z.enum(["google", "microsoft"]),
      sunucu: z.string().min(1),
      port: z.number().int().default(993),
      kullanici: z.email(),
      kutu: z.string().default("INBOX"),
      guvenilirSunucu: z.string().min(1),
      izinliGonderenler: z.array(z.string().min(3)).min(1),
      /** Şifreli OAuth belirteci (belirtecKasasi). Açık metin belirteç burada bulunmaz. */
      belirtec: z.string().min(10),
      durum: z.object({ uidGecerlilik: z.number().int(), sonUid: z.number().int() }).nullable().default(null),
      son: Son,
    })
    .optional(),
  drive: z
    .object({
      acik: z.boolean(),
      saglayici: z.enum(["google", "microsoft"]),
      klasorId: z.string().min(1),
      belirtec: z.string().min(10),
      durum: z.record(z.string(), z.string()).default({}),
      son: Son,
    })
    .optional(),
});
export type BaglayiciAyari = z.infer<typeof BaglayiciAyarSemasi>;

/**
 * Kurumun bir bağlayıcı ayarını okur. Ayar yoksa, kapalıysa ya da geçersizse `null` (bağlayıcı çalışmaz).
 * Her bağlayıcı ayrı doğrulanır: birindeki hata diğerini kapatmaz.
 */
export async function baglayiciAyari<T extends BaglayiciTuru>(
  db: Vt,
  kurumId: string,
  tur: T,
): Promise<NonNullable<BaglayiciAyari[T]> | null> {
  const [k] = await kiraciIslemi(db, kurumId, (tx) =>
    tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId)),
  );
  const ham = ((k?.a ?? {}) as { baglayicilar?: Record<string, unknown> }).baglayicilar?.[tur];
  if (!ham) return null;
  const alan = BaglayiciAyarSemasi.shape[tur];
  const d = alan.safeParse(ham);
  if (!d.success || !d.data || !(d.data as { acik: boolean }).acik) return null;
  return d.data as NonNullable<BaglayiciAyari[T]>;
}

/** Bağlayıcı ayarının alanlarını birleştirir (ör. eşitleme durumu, şifreli yeni belirteç, son çalışma). */
export async function baglayiciAyariGuncelle(
  db: Vt,
  kurumId: string,
  tur: BaglayiciTuru,
  alanlar: Record<string, unknown>,
): Promise<void> {
  const yama = JSON.stringify(alanlar);
  await kiraciIslemi(db, kurumId, (tx) =>
    tx.execute(sql`update kurum set ayarlar = jsonb_set(
        jsonb_set(ayarlar, '{baglayicilar}', coalesce(ayarlar->'baglayicilar', '{}'::jsonb), true),
        array['baglayicilar', ${tur}::text],
        coalesce(ayarlar->'baglayicilar'->${tur}::text, '{}'::jsonb) || ${yama}::jsonb,
        true)
      where id = ${kurumId}::uuid`),
  );
}
