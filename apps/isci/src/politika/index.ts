// Yetki devri işçisi (İP-13): her kurumda karar bekleyen önerilere politikaları uygular ve onay özeti
// e-postalarını gönderir. Kural ve kayıt `@akredit/servis` onay modülündedir; burası yalnız zamanlar.
//
// Özet sıklığı kurum ayarından okunur: `kurum.ayarlar.onay.ozet` = "gunluk" | "haftalik" | "kapali"
// (varsayılan "gunluk"). Haftalık özet pazartesi gönderilir. Aynı gün ikinci kez gönderilmez (`gonderilen`).

import { onay } from "@akredit/servis";
import type { EpostaTasiyici } from "@akredit/surec";
import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { eq, isNotNull } from "drizzle-orm";
import { z } from "zod";

export interface PolitikaIsciAyari {
  db: Vt;
  kurumlar: () => Promise<string[]>;
  saat: () => Date;
  /** Özet için; verilmezse özet gönderilmez. */
  eposta?: { tasiyici: EpostaTasiyici; gizli: string; temelAdres: string; sureSaat?: number };
  hata?: (kurumId: string, e: unknown) => void;
}

const OnayAyari = z
  .object({
    onay: z
      .object({ ozet: z.enum(["gunluk", "haftalik", "kapali"]).optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

async function ozetSikligi(db: Vt, kurumId: string): Promise<"gunluk" | "haftalik" | "kapali"> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
    const a = OnayAyari.safeParse(k?.a ?? {});
    return (a.success ? a.data.onay?.ozet : undefined) ?? "gunluk";
  });
}

export interface TurSonucu {
  otomatikKarar: number;
  gonderilenOzet: number;
}

export function politikaIscisi(ayar: PolitikaIsciAyari) {
  /** `kurum:kişi:gün` anahtarları: aynı gün aynı kişiye ikinci özet gitmez. */
  const gonderilen = new Set<string>();

  async function kurumTuru(kurumId: string, ozetGonder: boolean): Promise<TurSonucu> {
    const simdi = ayar.saat();
    const m = await onay.politikalariUygula(ayar.db, kurumId, simdi);
    let ozet = 0;
    if (ozetGonder && ayar.eposta) {
      const siklik = await ozetSikligi(ayar.db, kurumId);
      const gun = simdi.toISOString().slice(0, 10);
      const pazartesi = simdi.getUTCDay() === 1;
      if (siklik === "gunluk" || (siklik === "haftalik" && pazartesi)) {
        const kisiler = await kiraciIslemi(ayar.db, kurumId, (tx) =>
          tx.select({ id: sema.kisi.id, eposta: sema.kisi.eposta }).from(sema.kisi).where(isNotNull(sema.kisi.eposta)),
        );
        for (const k of kisiler) {
          const anahtar = `${kurumId}:${k.id}:${gun}`;
          if (!k.eposta || gonderilen.has(anahtar)) continue;
          const ileti = await onay.onayOzeti(ayar.db, kurumId, k.id, simdi, {
            gizli: ayar.eposta.gizli,
            temelAdres: ayar.eposta.temelAdres,
            siklik,
            ...(ayar.eposta.sureSaat ? { sureSaat: ayar.eposta.sureSaat } : {}),
          });
          gonderilen.add(anahtar);
          if (!ileti) continue;
          await ayar.eposta.tasiyici.gonder({ alici: k.eposta, konu: ileti.konu, metin: ileti.metin });
          ozet++;
        }
      }
    }
    return { otomatikKarar: m.kararlar.length, gonderilenOzet: ozet };
  }

  return {
    /** Bütün kurumlarda bir tur. Bir kurumdaki hata diğerlerini durdurmaz. */
    async tur(secenek: { ozet?: boolean } = {}): Promise<TurSonucu> {
      const t: TurSonucu = { otomatikKarar: 0, gonderilenOzet: 0 };
      for (const k of await ayar.kurumlar()) {
        try {
          const s = await kurumTuru(k, secenek.ozet ?? false);
          t.otomatikKarar += s.otomatikKarar;
          t.gonderilenOzet += s.gonderilenOzet;
        } catch (e) {
          ayar.hata?.(k, e);
        }
      }
      return t;
    },
    /** İP-21 `EylemAlicisi`: göstergelerin eylem önerileri kuyruğa yazılır, politika hemen uygulanır. */
    eylemAlicisi(kurumId: string) {
      return onay.oneriAlicisi(ayar.db, kurumId, ayar.saat);
    },
  };
}
