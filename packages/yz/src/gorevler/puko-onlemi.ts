// PÜKÖ önlem önerisi (İP-39): eşik altı bir ders ya da program çıktısı için model kısa önlem metinleri önerir.
// Model sayı yazamaz: her metin rakamsız olmalı (oran, puan, tarih, kişi sayısı yok). Sayılar yalnız ölçme
// hesabından gelir ve kartta ayrıca gösterilir. Kök nedenler modele yalnız açıklama metni olarak gider
// (öğrenci, kişi adı ya da puan gitmez). Kurala uymayan her öneri tek tek ayıklanır.

import { z } from "zod";
import { guvenilmeyenSar, KALKAN_KURALI } from "../guvence/istem-kalkani.ts";
import type { Gorev, KuralSorunu } from "./gorev.ts";

export interface PukoOnlemiGirdisi {
  olcumTuru: "ck" | "pc";
  kod: string;
  dersKodlari: string[];
  /** Kök neden açıklamaları (`@akredit/olcme` madde analizinden). Rakamlar modele gitmeden ayıklanır. */
  kokNedenler: string[];
}

export const PukoOnlemiSemasi = z.object({ onlemler: z.array(z.string().trim().min(10).max(280)).max(5) }).strict();
export type PukoOnlemiCiktisi = z.infer<typeof PukoOnlemiSemasi>;

/** Önlem metninde rakam (Arap ya da başka yazım) var mı; varsa sorun. */
export function onlemMetniSorunu(metin: string): string | null {
  if (/\p{Nd}/u.test(metin)) return "Önlem metni sayı içeremez; sayılar ölçme hesabından gelir.";
  if (/\[(K|H):/u.test(metin)) return "Önlem metni atıf içeremez.";
  if (/[\p{Cc}]/u.test(metin)) return "Önlem metni tek paragraf olmalı.";
  return null;
}

/** Model çıktısını öğe öğe ayıklar: rakamsız, tekrarsız metinler kalır. */
export function pukoOnlemleriniAyikla(c: PukoOnlemiCiktisi): { onlemler: string[]; reddedilen: KuralSorunu[] } {
  const onlemler: string[] = [];
  const reddedilen: KuralSorunu[] = [];
  for (const [i, m] of c.onlemler.entries()) {
    const sorun = onlemMetniSorunu(m);
    if (sorun) {
      reddedilen.push({ alan: `onlemler.${i}`, aciklama: sorun });
      continue;
    }
    if (onlemler.includes(m.trim())) continue;
    onlemler.push(m.trim());
  }
  return { onlemler, reddedilen };
}

const rakamsiz = (s: string) => s.replace(/\p{Nd}+([.,]\p{Nd}+)?/gu, "…").replace(/%\s*…/gu, "…");

export const pukoOnlemi: Gorev<PukoOnlemiGirdisi, typeof PukoOnlemiSemasi> = {
  ad: "puko-onlemi",
  sema: PukoOnlemiSemasi,
  istem(g) {
    const nedenler = g.kokNedenler.length ? g.kokNedenler.map((n) => `- ${rakamsiz(n)}`).join("\n") : "- (yok)";
    return [
      {
        rol: "sistem",
        icerik: [
          "Sen bir yükseköğretim kalite güvencesi yardımcısısın. Öğrenme çıktısı eşiğin altında kalan bir ders için öğretim elemanına kısa önlem önerirsin.",
          "En çok üç önlem yaz. Her önlem tek cümle, emir kipinde ve uygulanabilir olsun.",
          "Hiç rakam, oran, puan, tarih ya da kişi sayısı yazma. Kurum, kişi, toplantı ya da sonuç uydurma.",
          KALKAN_KURALI,
        ].join("\n"),
      },
      {
        rol: "kullanici",
        icerik: `Çıktı: ${g.olcumTuru === "ck" ? "ders öğrenme çıktısı" : "program çıktısı"} ${g.kod}\nDersler: ${g.dersKodlari.join(", ")}\nKök nedenler:\n${guvenilmeyenSar(nedenler, { kaynak: "kok_nedenler" }).metin}`,
      },
    ];
  },
  denetle(c) {
    return pukoOnlemleriniAyikla(c).reddedilen;
  },
};
