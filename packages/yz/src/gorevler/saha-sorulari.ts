// Saha ziyareti soruları (İP-48): model yalnız iki iş yapar.
//   1. Kuralla üretilmiş soruların dilini düzeltir (anlam, ölçüt kodu ve sayılar aynı kalır).
//   2. Bir ölçüt koduna bağlı yeni soru önerir.
// Model cevap yazmaz: şemada cevap alanı yoktur, her metin tek bir soru cümlesidir ve atıf, "cevap" ya da
// yeni sayı içeremez. Kurala uymayan her öğe tek tek ayıklanır (`sahaSorulariniAyikla`); geçenler listeye
// girer, ama soru listesinin kendisi yine kuralla kurulur.

import { z } from "zod";
import { guvenilmeyenSar, KALKAN_KURALI } from "../guvence/istem-kalkani.ts";
import { sayilariCikar } from "../guvence/sayi.ts";
import type { Gorev, KuralSorunu } from "./gorev.ts";

export interface SahaSorusuGirdisi {
  id: string;
  olcutKod: string;
  metin: string;
}

export interface SahaSorulariGirdisi {
  sorular: SahaSorusuGirdisi[];
  /** Çerçevedeki ölçüt kodları ve başlıkları; öneri yalnız bunlardan birine bağlanabilir. */
  olcutler: { kod: string; baslik: string }[];
  /** Ölçüt başına en çok öneri sayısı. */
  enCokOneri?: number;
}

const SoruMetni = z.string().trim().min(5).max(300);

export const SahaSorulariSemasi = z
  .object({
    duzeltmeler: z.array(z.object({ soruId: z.string().min(1), metin: SoruMetni }).strict()),
    oneriler: z.array(z.object({ olcutKod: z.string().min(1), metin: SoruMetni }).strict()),
  })
  .strict();
export type SahaSorulariCiktisi = z.infer<typeof SahaSorulariSemasi>;

const CEVAP_IZI = /\[(K|H):|\bcevap\b|\byanıt\s*:|\bcevabı\s*:|evet,|hayır,/iu;

/** Metin tek bir soru cümlesi mi; cevap izi taşıyor mu? Sorun yoksa null. */
export function soruMetniSorunu(metin: string, izinliSayilar: readonly string[] = []): string | null {
  const t = metin.trim();
  if (!t.endsWith("?")) return "Metin soru değil (soru işaretiyle bitmeli).";
  // Satır sonu ya da noktalı virgül, noktasız ikinci bir cümleyi (cevabı) sorunun içine taşır.
  if (/[\p{Cc};]/u.test(t)) return "Metin tek bir soru olmalı; cevap ya da açıklama içeremez.";
  if ((t.match(/[.!?](\s|$)/gu) ?? []).length > 1) return "Metin tek bir soru olmalı; cevap ya da açıklama içeremez.";
  if (CEVAP_IZI.test(t)) return "Metin cevap ya da atıf içeriyor; model cevap yazmaz.";
  const izin = new Set(izinliSayilar);
  for (const s of sayilariCikar(t)) if (!izin.has(s.ham)) return `Metinde kaynağı olmayan sayı var: ${s.ham}`;
  return null;
}

const kodSayilari = (metin: string, kodlar: readonly string[]) => {
  // Ölçüt kodlarının içindeki rakamlar (P.1, B.1.3) sayı sayılmaz.
  let t = metin;
  for (const k of [...kodlar].sort((a, b) => b.length - a.length)) t = t.split(k).join(" ");
  return t;
};

export interface AyiklanmisSahaSorulari {
  duzeltmeler: { soruId: string; metin: string }[];
  oneriler: { olcutKod: string; metin: string }[];
  reddedilen: KuralSorunu[];
}

/** Model çıktısını öğe öğe denetler; kurala uyanları döndürür, uymayanları gerekçesiyle ayırır. */
export function sahaSorulariniAyikla(c: SahaSorulariCiktisi, g: SahaSorulariGirdisi): AyiklanmisSahaSorulari {
  const sorular = new Map(g.sorular.map((s) => [s.id, s]));
  const kodlar = g.olcutler.map((o) => o.kod);
  const kodKumesi = new Set(kodlar);
  const enCok = g.enCokOneri ?? 2;
  const reddedilen: KuralSorunu[] = [];
  const duzeltmeler: AyiklanmisSahaSorulari["duzeltmeler"] = [];
  const goruldu = new Set<string>();
  for (const [i, d] of c.duzeltmeler.entries()) {
    const alan = `duzeltmeler.${i}`;
    const s = sorular.get(d.soruId);
    if (!s || goruldu.has(d.soruId)) {
      reddedilen.push({ alan, aciklama: "Düzeltme bilinmeyen ya da yinelenen bir soruya ait." });
      continue;
    }
    if (!d.metin.includes(s.olcutKod)) {
      reddedilen.push({ alan, aciklama: `Düzeltilmiş soru ölçüt kodunu (${s.olcutKod}) korumalı.` });
      continue;
    }
    const izin = sayilariCikar(kodSayilari(s.metin, kodlar)).map((x) => x.ham);
    const sorun = soruMetniSorunu(kodSayilari(d.metin, kodlar), izin);
    if (sorun) {
      reddedilen.push({ alan, aciklama: sorun });
      continue;
    }
    goruldu.add(d.soruId);
    duzeltmeler.push({ soruId: d.soruId, metin: d.metin.trim() });
  }
  const oneriler: AyiklanmisSahaSorulari["oneriler"] = [];
  const sayac = new Map<string, number>();
  const metinler = new Set(g.sorular.map((s) => s.metin.trim().toLocaleLowerCase("tr")));
  for (const [i, o] of c.oneriler.entries()) {
    const alan = `oneriler.${i}`;
    if (!kodKumesi.has(o.olcutKod)) {
      reddedilen.push({ alan, aciklama: "Öneri çerçevedeki bir ölçüt koduna bağlı değil." });
      continue;
    }
    const sorun = soruMetniSorunu(kodSayilari(o.metin, kodlar));
    if (sorun) {
      reddedilen.push({ alan, aciklama: sorun });
      continue;
    }
    const anahtar = o.metin.trim().toLocaleLowerCase("tr");
    if (metinler.has(anahtar)) {
      reddedilen.push({ alan, aciklama: "Öneri listede zaten var." });
      continue;
    }
    const n = sayac.get(o.olcutKod) ?? 0;
    if (n >= enCok) {
      reddedilen.push({ alan, aciklama: `Bu ölçüt için en çok ${enCok} öneri alınır.` });
      continue;
    }
    sayac.set(o.olcutKod, n + 1);
    metinler.add(anahtar);
    oneriler.push({ olcutKod: o.olcutKod, metin: o.metin.trim() });
  }
  return { duzeltmeler, oneriler, reddedilen };
}

export const sahaSorulari: Gorev<SahaSorulariGirdisi, typeof SahaSorulariSemasi> = {
  ad: "saha-sorulari",
  sema: SahaSorulariSemasi,
  istem(g) {
    const olcutler = g.olcutler.map((o) => `${o.kod}: ${o.baslik}`).join("\n");
    const sorular = g.sorular.map((s) => `${s.id} | ${s.olcutKod} | ${s.metin}`).join("\n");
    return [
      {
        rol: "sistem",
        icerik: [
          "Sen bir akreditasyon saha ziyareti hazırlık yardımcısısın. İki iş yaparsın:",
          "1. Verilen soruların Türkçesini sadeleştir ve düzelt. Anlamı, ölçüt kodunu ve sayıları değiştirme. Her düzeltme tek bir soru cümlesidir ve soru işaretiyle biter.",
          `2. Değerlendiricinin sorabileceği yeni sorular öner. Her öneri listedeki bir ölçüt koduna bağlanır ve o kodu içerir. Ölçüt başına en çok ${g.enCokOneri ?? 2} öneri.`,
          "Soruları cevaplama. Cevap, açıklama, atıf, örnek ya da yeni sayı yazma. Kurum hakkında bilgi uydurma.",
          KALKAN_KURALI,
        ].join("\n"),
      },
      {
        rol: "kullanici",
        icerik: `Ölçütler:\n${guvenilmeyenSar(olcutler, { kaynak: "olcutler" }).metin}\n\nSorular (kimlik | ölçüt | metin):\n${guvenilmeyenSar(sorular, { kaynak: "sorular" }).metin}`,
      },
    ];
  },
  denetle(c, g) {
    return sahaSorulariniAyikla(c, g).reddedilen;
  },
};
