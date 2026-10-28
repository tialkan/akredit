// Kök neden (İP-39): eşik altı bir ÇK'nın hangi sorulardan kaynaklandığı. Soru bazlı madde analizinden
// (güçlük, ayırt edicilik) türetilir; yorum değil, hesaptır. Karar kartında "kök neden" olarak gösterilir.

import type { DersOlcmeVerisi } from "@akredit/cekirdek";
import { sirala } from "./istatistik.ts";
import type { DersOlcmeSonucu } from "./turler.ts";

export type KokNedenTuru = "zor_soru" | "ayirt_etmeyen_soru" | "tek_olcum";

export interface KokNeden {
  tur: KokNedenTuru;
  aracId?: string;
  soruNo?: string;
  /** Güçlük indeksi (0-1) ya da ayırt edicilik; hesaptan. */
  deger?: number;
  aciklama: string;
}

/** Güçlük indeksi bunun altındaki soru "zor" sayılır. */
export const ZOR_SORU_ESIGI = 0.5;
/** Ayırt edicilik bunun altındaki soru öğrenciyi ayırt etmiyor sayılır (yaygın ölçüt). */
export const AYIRT_EDICILIK_ESIGI = 0.2;

/**
 * ÇK'yı ölçen soruları madde analiziyle tarar. Zor sorular güçlükten artan sırada, sonra ayırt etmeyen
 * sorular; ÇK tek soruyla ölçülüyorsa bu da bir neden olarak eklenir. Sıra deterministiktir.
 */
export function kokNedenAnalizi(veri: DersOlcmeVerisi, sonuc: DersOlcmeSonucu, ckKod: string): KokNeden[] {
  const sorular: { aracId: string; soruNo: string }[] = [];
  for (const a of veri.araclar)
    for (const s of a.sorular)
      if (s.eslemeler.some((e) => e.ciktiKod === ckKod)) sorular.push({ aracId: a.id, soruNo: s.no });
  const maddeler = sonuc.maddeAnalizi.flatMap((a) => a.maddeler);
  const bul = (q: { aracId: string; soruNo: string }) =>
    maddeler.find((m) => m.aracId === q.aracId && m.soruNo === q.soruNo);
  const zor: KokNeden[] = [];
  const ayirtsiz: KokNeden[] = [];
  for (const q of [...sorular].sort((a, b) => sirala(a.aracId, b.aracId) || sirala(a.soruNo, b.soruNo))) {
    const m = bul(q);
    if (!m) continue;
    if (m.guclukIndeksi !== null && m.guclukIndeksi < ZOR_SORU_ESIGI)
      zor.push({
        tur: "zor_soru",
        aracId: q.aracId,
        soruNo: q.soruNo,
        deger: m.guclukIndeksi,
        aciklama: `${q.soruNo} numaralı soruda öğrenciler puanın ancak %${Math.round(m.guclukIndeksi * 100)} kadarını aldı.`,
      });
    else if (m.ayirtEdicilik !== null && m.ayirtEdicilik < AYIRT_EDICILIK_ESIGI)
      ayirtsiz.push({
        tur: "ayirt_etmeyen_soru",
        aracId: q.aracId,
        soruNo: q.soruNo,
        deger: m.ayirtEdicilik,
        aciklama: `${q.soruNo} numaralı soru başarılı ve başarısız öğrenciyi ayırt etmiyor.`,
      });
  }
  zor.sort((a, b) => (a.deger ?? 0) - (b.deger ?? 0));
  const nedenler = [...zor, ...ayirtsiz];
  if (sorular.length === 1)
    nedenler.push({ tur: "tek_olcum", aciklama: "Bu çıktı tek bir soruyla ölçülüyor; sonuç o soruya bağlı." });
  return nedenler;
}
