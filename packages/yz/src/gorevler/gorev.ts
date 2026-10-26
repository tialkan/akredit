// Görev = istem şablonu + zod çıktı şeması + kural denetimi.
import type { z } from "zod";
import type { AtifKaynagi } from "../guvence/atif.ts";
import { guvenilmeyenSar, KALKAN_KURALI } from "../guvence/istem-kalkani.ts";
import type { Mesaj, Saglayici } from "../saglayici.ts";
import { yapilandirilmisCagri } from "../yapilandirilmis.ts";

export interface KuralSorunu {
  alan: string;
  aciklama: string;
}

export interface Gorev<G, S extends z.ZodType> {
  ad: string;
  sema: S;
  istem(girdi: G): Mesaj[];
  denetle(cikti: z.infer<S>, girdi: G): KuralSorunu[];
}

export interface GorevSonucu<T> {
  veri: T;
  sorunlar: KuralSorunu[];
  /** Kural sorunu yoksa true. Sorunlu çıktı öneri olarak bile insan incelemesine düşer. */
  gecerli: boolean;
  onarimSayisi: number;
}

export async function gorevCalistir<G, S extends z.ZodType>(
  gorev: Gorev<G, S>,
  girdi: G,
  saglayici: Saglayici,
  secenek: { sinyal?: AbortSignal } = {},
): Promise<GorevSonucu<z.infer<S>>> {
  const { veri, onarimSayisi } = await yapilandirilmisCagri({
    saglayici,
    mesajlar: gorev.istem(girdi),
    sema: gorev.sema,
    ad: gorev.ad.replace(/-/gu, "_"),
    ...(secenek.sinyal ? { sinyal: secenek.sinyal } : {}),
  });
  const sorunlar = gorev.denetle(veri, girdi);
  return { veri, sorunlar, gecerli: sorunlar.length === 0, onarimSayisi };
}

/** Kanıt parçalarını, atıf yazımını gösteren güvenli veri bloğuna çevirir. */
export function kanitBlogu(kanit: AtifKaynagi, kaynakAdi = "belge"): string {
  const ozet8 = kanit.ozet.slice(0, 8).toLowerCase();
  const govde = kanit.parcalar
    .map((p) => {
      const konum = p.capa.sayfa !== undefined ? ` s.${p.capa.sayfa}` : p.capa.bolum ? ` b.${p.capa.bolum}` : "";
      return `--- parça [K:${ozet8}${konum}] ---\n${p.metin}`;
    })
    .join("\n");
  return guvenilmeyenSar(govde, { kaynak: kaynakAdi }).metin;
}

export const ORTAK_KURALLAR = [
  "Yalnız verilen belgede yazanı kullan. Belgede olmayan kişi, tarih, sayı, toplantı ya da sonuç uydurma.",
  'Her olgusal bilgi için parça başlığındaki atıfı kullan ve kısa birebir alıntı ekle: [K:özet s.N "alıntı"].',
  "Bilgi belgede yoksa alanı null bırak ya da [EKSİK: açıklama] yaz.",
  KALKAN_KURALI,
].join("\n");
