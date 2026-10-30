// Rapor paragrafını cümlelere ayırır ve her cümlenin atıflarını çıkarır (İP-44, cümleden kanıta tek tık).
// Saf işlev: model ve IO yok. Köşeli ayraç içindeki metin (atıf alıntısı, EKSİK açıklaması) bölünmez.

import { type Atif, atiflariAyristir, eksikleriAyristir } from "../atif.ts";

export interface RaporCumlesi {
  metin: string;
  /** Paragraf içindeki başlangıç ve bitiş konumu. */
  baslangic: number;
  bitis: number;
  /** Cümlenin kendi `[K:…]` atıfları. */
  atiflar: Atif[];
  /** Cümlenin kendi `[H:…]` hesap atıfları (kimlikler). */
  hesaplar: string[];
  /**
   * Cümle atıfını nereden alır: kendi atfı, paragrafın atfı (paragraf sonunda tek atıf yazımı) ya da hiç.
   * "yok" olan ya da EKSİK işareti taşıyan cümle kanıtsızdır.
   */
  kaynak: "kendi" | "paragraf" | "yok";
  eksik: boolean;
}

const HESAP = /\[H:([0-9a-fA-F]{6,64})\]/gu;
/** Sonunda nokta olan ve cümleyi bitirmeyen kısaltmalar. */
const KISALTMA = /(?:^|[\s(])(?:vb|vs|ör|bkz|Prof|Doç|Dr|Öğr|Gör|Arş|s|ss|No|Md|Yrd|krş)\.$/u;

export function hesapAtiflari(metin: string): string[] {
  return [...metin.matchAll(HESAP)].map((m) => (m[1] ?? "").toLowerCase());
}

/** Köşeli ayraç içini aynı uzunlukta "x" ile örter; konumlar korunur. */
export function ayracOrt(metin: string): string {
  return metin.replace(/\[[^\]]*\]/gu, (m) => `[${"x".repeat(Math.max(0, m.length - 2))}]`);
}

/** Yalnız atıf, hesap ya da EKSİK işaretinden oluşan parça (önceki cümleye eklenir). */
function yalnizIsaret(parca: string): boolean {
  return /^[\s.,;:]*(\[[^\]]*\][\s.,;:]*)+$/u.test(parca);
}

export function cumlelereAyir(paragraf: string): { metin: string; baslangic: number; bitis: number }[] {
  const ortulu = ayracOrt(paragraf);
  const kesimler: number[] = [];
  const bitis = /[.!?…]["'”’)]*\s+(?=[\p{Lu}\d["“(])/gu;
  for (const m of ortulu.matchAll(bitis)) {
    const son = (m.index ?? 0) + m[0].trimEnd().length;
    const once = ortulu.slice(0, son).replace(/["'”’)]+$/u, "");
    if (KISALTMA.test(once)) continue;
    // "3. bölüm" gibi sıra sayıları: noktadan önce tek başına sayı varsa ve sonrası küçük harfse zaten eşleşmez.
    kesimler.push((m.index ?? 0) + m[0].length);
  }
  const parcalar: { metin: string; baslangic: number; bitis: number }[] = [];
  let bas = 0;
  for (const k of [...kesimler, paragraf.length]) {
    const ham = paragraf.slice(bas, k);
    let sol = ham.length - ham.trimStart().length;
    let metin = ham.trim();
    // Noktadan sonra gelen baştaki işaretler ("… yapıldı. [K:…] Sonra …") önceki cümleye aittir.
    const bastaki = parcalar.length ? /^(?:\[[KH]:[^\]]*\][\s.,;:]*)+/u.exec(metin) : null;
    if (bastaki && bastaki[0].length < metin.length) {
      const onceki = parcalar.at(-1) as { metin: string; baslangic: number; bitis: number };
      const isaretSonu = bas + sol + bastaki[0].trimEnd().length;
      onceki.bitis = isaretSonu;
      onceki.metin = paragraf.slice(onceki.baslangic, isaretSonu);
      sol += bastaki[0].length;
      metin = metin.slice(bastaki[0].length).trim();
    }
    if (metin) {
      const onceki = parcalar.at(-1);
      if (onceki && yalnizIsaret(metin)) {
        onceki.metin = paragraf.slice(onceki.baslangic, bas + sol + metin.length);
        onceki.bitis = bas + sol + metin.length;
      } else parcalar.push({ metin, baslangic: bas + sol, bitis: bas + sol + metin.length });
    }
    bas = k;
  }
  return parcalar;
}

/**
 * Paragrafı atıflı cümlelere ayırır. Atıf kendinden önce gelen metni kapsar: atfı olmayan cümle, kendisinden
 * sonra gelen ilk atıflı cümlenin atfını alır ("Kurul toplandı. Karar alındı [K:…]."). Son atıftan sonra
 * gelen cümle kanıtsızdır.
 */
export function raporCumleleri(paragraf: string): RaporCumlesi[] {
  const ham = cumlelereAyir(paragraf).map((c) => ({
    ...c,
    atiflar: atiflariAyristir(c.metin),
    hesaplar: hesapAtiflari(c.metin),
    eksikIsareti: eksikleriAyristir(c.metin).length > 0,
  }));
  return ham.map(({ eksikIsareti, ...c }, i) => {
    const kendi = c.atiflar.length + c.hesaplar.length > 0;
    const sonraki =
      kendi || eksikIsareti ? undefined : ham.slice(i + 1).find((x) => x.atiflar.length + x.hesaplar.length > 0);
    const kaynak = kendi ? "kendi" : sonraki ? "paragraf" : "yok";
    return {
      ...c,
      atiflar: kendi ? c.atiflar : (sonraki?.atiflar ?? []),
      hesaplar: kendi ? c.hesaplar : (sonraki?.hesaplar ?? []),
      kaynak,
      eksik: eksikIsareti || kaynak === "yok",
    };
  });
}
