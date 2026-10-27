// ÖDR atıf ve sayı denetimi (saf). Her olgusal cümle ya onaylı bir kanıta ([K:…]) ya da deterministik bir
// hesaba ([H:…]) atıflıdır, ya da [EKSİK] işaretlidir. Cümledeki her sayı, atıf verdiği kaynağın izinli
// sayılarından biri olmalıdır; böylece modelin ya da elle yazılan metnin uydurduğu sayı rapora giremez.

import { atiflariAyristir, eksikleriAyristir } from "@akredit/cekirdek";

/** Hesap atfı: `[H:` + hesap kaynağının kısa kimliği (8-64 onaltılık) + `]`. */
const HESAP_ATFI = /\[H:([0-9a-f]{8,64})\]/gu;
const KANIT_ATFI = /\[K:[^\]]*\]/gu;
const EKSIK_ISARETI = /\[(?:EKS[İI]K|[Ee]ksik)(?::[^\]]*)?\]/gu;
/** Harf ya da noktayla yapışık rakamlar (PÇ1, P.3, ÖÇ2, B.1.3) kod sayılır, sayı değil. */
const KOD = /[\p{L}][\p{L}\d]*(?:\.\d+)+|[\p{L}]+\d+[\p{L}\d]*/gu;
const SAYI = /\d+(?:[.,]\d+)*/gu;

export interface DenetimKaynaklari {
  /** Onaylı kanıtlar: özet → izinli metinler (dosya adı, onay tarihi). */
  kanitlar: ReadonlyMap<string, readonly string[]>;
  /** Hesap kaynakları: kısa kimlik → izinli metinler (biçimlenmiş değerler). */
  hesaplar: ReadonlyMap<string, readonly string[]>;
}

export interface CumleDenetimi {
  gecerli: boolean;
  eksik: boolean;
  kanitOzetleri: string[];
  hesapKimlikleri: string[];
  sorunlar: string[];
}

/** Metindeki sayı simgeleri (kodlar hariç). */
export function sayilar(metin: string): string[] {
  return [...metin.replace(KOD, " ").matchAll(SAYI)].map((m) => m[0]);
}

export function hesapAtiflari(metin: string): string[] {
  return [...metin.matchAll(HESAP_ATFI)].map((m) => m[1] as string);
}

/** Tek cümleyi (paragrafı) denetler. */
export function cumleDenetle(cumle: string, k: DenetimKaynaklari): CumleDenetimi {
  const sorunlar: string[] = [];
  const eksik = eksikleriAyristir(cumle).length > 0;
  const kanitOzetleri: string[] = [];
  const izinli: string[] = [];
  for (const a of atiflariAyristir(cumle)) {
    const eslesen = [...k.kanitlar.keys()].filter((o) => o.startsWith(a.ozetOneki));
    if (eslesen.length !== 1) {
      sorunlar.push(`Onaylı kanıta bağlanamayan atıf: ${a.ham}`);
      continue;
    }
    const ozet = eslesen[0] as string;
    kanitOzetleri.push(ozet);
    izinli.push(...(k.kanitlar.get(ozet) ?? []));
  }
  const hesapKimlikleri: string[] = [];
  for (const h of hesapAtiflari(cumle)) {
    const eslesen = [...k.hesaplar.keys()].filter((x) => x.startsWith(h));
    if (eslesen.length !== 1) {
      sorunlar.push(`Bilinmeyen hesap atfı: [H:${h}]`);
      continue;
    }
    const kimlik = eslesen[0] as string;
    hesapKimlikleri.push(kimlik);
    izinli.push(...(k.hesaplar.get(kimlik) ?? []));
  }
  if (!eksik && kanitOzetleri.length + hesapKimlikleri.length === 0) sorunlar.push("Cümlede atıf yok.");
  const izinliSayilar = new Set(izinli.flatMap(sayilar));
  const govde = cumle.replace(KANIT_ATFI, " ").replace(HESAP_ATFI, " ").replace(EKSIK_ISARETI, " ");
  for (const s of sayilar(govde)) if (!izinliSayilar.has(s)) sorunlar.push(`Kaynağı gösterilmeyen sayı: ${s}`);
  return { gecerli: sorunlar.length === 0, eksik, kanitOzetleri, hesapKimlikleri, sorunlar };
}

/** Serbest metni cümlelere böler (nokta, soru ve ünlem işaretinden sonra boşluk). */
export function cumlelereBol(metin: string): string[] {
  return metin
    .split(/\n+|(?<=[.!?])\s+(?=[\p{Lu}\d[])/u)
    .map((c) => c.trim())
    .filter(Boolean);
}
