// İdempotens: durum değiştiren istek `Idempotency-Key` başlığıyla gelirse ilk yanıt saklanır; aynı anahtarla
// aynı istek tekrar gelirse işlem yeniden yapılmaz, saklanan yanıt döner. Aynı anahtar başka bir gövdeyle
// kullanılırsa reddedilir. Kayıtlar kişi ve kurum başınadır.

import { type SorguSonucu, satirlar, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";

export interface TekrarAnahtari {
  kurumId: string;
  kisiId: string;
  anahtar: string;
}

export type Ayirma =
  | { tur: "yeni" }
  | { tur: "tekrar"; durum: number; govde: unknown }
  | { tur: "isleniyor" }
  | { tur: "uyusmazlik" };

export interface TekrarDeposu {
  /** Anahtarı bu istek özeti için ayırır ya da önceki sonucu döndürür. */
  ayir(a: TekrarAnahtari, istekOzeti: string): Promise<Ayirma>;
  tamamla(a: TekrarAnahtari, durum: number, govde: unknown): Promise<void>;
  /** İşlem beklenmeyen biçimde bittiyse ayırmayı bırakır (yeniden denenebilsin). */
  birak(a: TekrarAnahtari): Promise<void>;
}

const k = (a: TekrarAnahtari) => `${a.kurumId}:${a.kisiId}:${a.anahtar}`;

export function bellekTekrarDeposu(): TekrarDeposu {
  const m = new Map<string, { ozet: string; durum: number | null; govde: unknown }>();
  return {
    async ayir(a, ozet) {
      const v = m.get(k(a));
      if (!v) {
        m.set(k(a), { ozet, durum: null, govde: null });
        return { tur: "yeni" };
      }
      if (v.ozet !== ozet) return { tur: "uyusmazlik" };
      return v.durum === null ? { tur: "isleniyor" } : { tur: "tekrar", durum: v.durum, govde: v.govde };
    },
    async tamamla(a, durum, govde) {
      const v = m.get(k(a));
      if (v) Object.assign(v, { durum, govde });
    },
    async birak(a) {
      m.delete(k(a));
    },
  };
}

/** Veritabanında (`istek_tekrari`, göç 0005) tutulan depo. Sahip bağlantısıyla çalışır, kiracı tablosu değildir. */
export function vtTekrarDeposu(db: Vt): TekrarDeposu {
  return {
    async ayir(a, ozet) {
      const eklenen = satirlar(
        (await db.execute(sql`
          insert into istek_tekrari (bagli_kurum_id, kisi_id, anahtar, istek_ozeti)
          values (${a.kurumId}::uuid, ${a.kisiId}::uuid, ${a.anahtar}, ${ozet})
          on conflict do nothing returning anahtar`)) as unknown as SorguSonucu<{ anahtar: string }>,
      );
      if (eklenen.length) return { tur: "yeni" };
      const [v] = satirlar(
        (await db.execute(sql`
          select istek_ozeti, durum, yanit from istek_tekrari
          where bagli_kurum_id = ${a.kurumId}::uuid and kisi_id = ${a.kisiId}::uuid and anahtar = ${a.anahtar}`)) as unknown as SorguSonucu<{
          istek_ozeti: string;
          durum: number | null;
          yanit: unknown;
        }>,
      );
      if (!v) return { tur: "isleniyor" };
      if (v.istek_ozeti !== ozet) return { tur: "uyusmazlik" };
      return v.durum === null ? { tur: "isleniyor" } : { tur: "tekrar", durum: v.durum, govde: v.yanit };
    },
    async tamamla(a, durum, govde) {
      await db.execute(sql`
        update istek_tekrari set durum = ${durum}, yanit = ${JSON.stringify(govde ?? null)}::jsonb
        where bagli_kurum_id = ${a.kurumId}::uuid and kisi_id = ${a.kisiId}::uuid and anahtar = ${a.anahtar}`);
    },
    async birak(a) {
      await db.execute(sql`
        delete from istek_tekrari
        where bagli_kurum_id = ${a.kurumId}::uuid and kisi_id = ${a.kisiId}::uuid and anahtar = ${a.anahtar}
          and durum is null`);
    },
  };
}
