// Hedef sapması, eğilim, eylem önerisi ve rapor tabloları. Saf işlevler; zaman ve kimlik parametreyle gelir.

import type { KanitAtfi, KanitId, KurumId, Oneri, OneriId } from "@akredit/cekirdek";
import { type GostergeOlcumu, gostergeHesapla, kaynakKaniti, kaynakMetni, yuvarla } from "./hesap.ts";
import type { GostergeTanimi, VeriNoktasi } from "./tanim.ts";

export type SapmaDurumu = "hedefte" | "uyari" | "sapma" | "hedef_yok" | "EKSIK";

export interface HedefSapmasi {
  durum: SapmaDurumu;
  hedef: number | null;
  /** Hedefin gerisinde kalan miktar (iyi yönde ise 0). */
  gerilik: number | null;
  /** Gerilik / |hedef|; hedef 0 ise null. */
  bagilGerilik: number | null;
}

export function hedefBul(tanim: GostergeTanimi, donem: string): number | null {
  return tanim.hedefler.find((h) => h.donem === donem)?.deger ?? null;
}

export function hedefSapmasi(tanim: GostergeTanimi, olcum: GostergeOlcumu): HedefSapmasi {
  const hedef = hedefBul(tanim, olcum.donem);
  if (olcum.deger === null) return { durum: "EKSIK", hedef, gerilik: null, bagilGerilik: null };
  if (hedef === null) return { durum: "hedef_yok", hedef, gerilik: null, bagilGerilik: null };
  const gerilik = yuvarla(Math.max(0, tanim.yon === "artan" ? hedef - olcum.deger : olcum.deger - hedef));
  const bagilGerilik = hedef === 0 ? null : yuvarla(gerilik / Math.abs(hedef));
  let durum: SapmaDurumu;
  if (gerilik === 0) durum = "hedefte";
  else if (bagilGerilik !== null && bagilGerilik <= tanim.tolerans) durum = "uyari";
  else durum = "sapma";
  return { durum, hedef, gerilik, bagilGerilik };
}

export interface Egilim {
  /** En küçük kareler eğimi (dönem başına değişim); en az iki değer gerekir. */
  egim: number | null;
  yorum: "iyilesiyor" | "kotulesiyor" | "durgun" | "yetersiz_veri";
}

/** Ölçümler dönem sırasıyla verilir; EKSİK olanlar atlanır, sıra indeksi korunur. */
export function egilim(tanim: GostergeTanimi, olcumler: readonly GostergeOlcumu[]): Egilim {
  const noktalar = olcumler.flatMap((o, i) => (o.deger === null ? [] : [[i, o.deger] as const]));
  if (noktalar.length < 2) return { egim: null, yorum: "yetersiz_veri" };
  const n = noktalar.length;
  const ox = noktalar.reduce((t, [x]) => t + x, 0) / n;
  const oy = noktalar.reduce((t, [, y]) => t + y, 0) / n;
  const pay = noktalar.reduce((t, [x, y]) => t + (x - ox) * (y - oy), 0);
  const payda = noktalar.reduce((t, [x]) => t + (x - ox) ** 2, 0);
  const egim = yuvarla(pay / payda);
  if (egim === 0) return { egim, yorum: "durgun" };
  const iyi = tanim.yon === "artan" ? egim > 0 : egim < 0;
  return { egim, yorum: iyi ? "iyilesiyor" : "kotulesiyor" };
}

/** Süreç motoruna (İP-14) giden eylem önerisinin içeriği. */
export interface GostergeEylemIcerigi {
  kaynak: "gosterge_sapmasi";
  gostergeKod: string;
  donem: string;
  deger: number;
  hedef: number;
  gerilik: number;
  baslik: string;
  /** PUKÖ'de eylemin aşaması: sapma "önlem al" adımını açar. */
  pukoAsamasi: "onlem_al";
}

export interface OneriBaglami {
  kurumId: KurumId;
  simdi: string;
  oneriId: () => string;
}

export const GOSTERGE_KURAL_SURUMU = "1";

/**
 * Hedef sapmasında eylem önerisi üretir (yalnız "sapma" durumunda). Öneri kural üretimidir; sayıların hepsi
 * hesaptan gelir. Atıflar, ölçüme giren kanıtlardır. Kararı kişi verir (tür riski orta).
 */
export function sapmaEylemOnerisi(
  tanim: GostergeTanimi,
  olcum: GostergeOlcumu,
  b: OneriBaglami,
): Oneri<GostergeEylemIcerigi> | null {
  const s = hedefSapmasi(tanim, olcum);
  if (s.durum !== "sapma" || olcum.deger === null || s.hedef === null || s.gerilik === null) return null;
  const kanitlar = [...new Set(olcum.girdiler.map((g) => kaynakKaniti(g.kaynak)).filter((k) => k !== null))];
  const atiflar: KanitAtfi[] = kanitlar.map((k) => ({ kanitId: k as KanitId }));
  const kaynaklar = olcum.girdiler.map((g) => `${g.anahtar}: ${kaynakMetni(g.kaynak)}`).join("; ");
  return {
    id: b.oneriId() as OneriId,
    kurumId: b.kurumId,
    tur: "eylem",
    hedef: { tur: "gosterge", id: tanim.kod },
    icerik: {
      kaynak: "gosterge_sapmasi",
      gostergeKod: tanim.kod,
      donem: olcum.donem,
      deger: olcum.deger,
      hedef: s.hedef,
      gerilik: s.gerilik,
      baslik: `${tanim.ad} hedefin gerisinde: iyileştirme eylemi planla`,
      pukoAsamasi: "onlem_al",
    },
    gerekce: `${olcum.donem} değeri ${olcum.deger}${tanim.birim}, hedef ${s.hedef}${tanim.birim}. Hesap: ${olcum.hesap}. Kaynaklar: ${kaynaklar}.`,
    atiflar,
    guven: null,
    uretici: { tur: "kural", kural: "gosterge_hedef_sapmasi", surum: GOSTERGE_KURAL_SURUMU },
    risk: "orta",
    olusturma: b.simdi,
  };
}

/** Süreç motoru arayüzü (İP-14 bağlar). */
export interface EylemAlicisi {
  eylemOner(oneri: Oneri<GostergeEylemIcerigi>): void | Promise<void>;
}

export interface DenetimSonucu {
  olcumler: GostergeOlcumu[];
  oneriler: Oneri<GostergeEylemIcerigi>[];
}

/** Bütün göstergeleri bir dönem için hesaplar; sapan her gösterge için süreç motoruna eylem önerir. */
export async function gostergeleriDenetle(
  tanimlar: readonly GostergeTanimi[],
  veriler: readonly VeriNoktasi[],
  donem: string,
  b: OneriBaglami,
  alici: EylemAlicisi,
): Promise<DenetimSonucu> {
  const olcumler: GostergeOlcumu[] = [];
  const oneriler: Oneri<GostergeEylemIcerigi>[] = [];
  for (const t of tanimlar) {
    const o = gostergeHesapla(t, donem, veriler);
    olcumler.push(o);
    const oneri = sapmaEylemOnerisi(t, o, b);
    if (oneri) {
      await alici.eylemOner(oneri);
      oneriler.push(oneri);
    }
  }
  return { olcumler, oneriler };
}

export interface RaporSatiri {
  kod: string;
  ad: string;
  birim: string;
  plan: GostergeTanimi["plan"];
  planHedefi: string | null;
  /** Dönem → değer (EKSİK ise null). */
  degerler: Record<string, number | null>;
  hedef: number | null;
  sonDurum: SapmaDurumu;
  egilim: Egilim;
}

/** Stratejik plan / faaliyet raporu tablosu: her gösterge için dönem değerleri, son dönemin hedefi ve durumu. */
export function raporTablosu(
  tanimlar: readonly GostergeTanimi[],
  veriler: readonly VeriNoktasi[],
  donemler: readonly string[],
  plan?: GostergeTanimi["plan"],
): RaporSatiri[] {
  return tanimlar
    .filter((t) => !plan || t.plan === plan)
    .map((t) => {
      const olcumler = donemler.map((d) => gostergeHesapla(t, d, veriler));
      const son = olcumler[olcumler.length - 1];
      const sapma = son ? hedefSapmasi(t, son) : { durum: "EKSIK" as const, hedef: null };
      return {
        kod: t.kod,
        ad: t.ad,
        birim: t.birim,
        plan: t.plan,
        planHedefi: t.planHedefi ?? null,
        degerler: Object.fromEntries(olcumler.map((o) => [o.donem, o.deger])),
        hedef: sapma.hedef,
        sonDurum: sapma.durum,
        egilim: egilim(t, olcumler),
      };
    });
}
