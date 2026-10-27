// Test ve değerlendirme için kurgu örnek: apps/cli/bilgi/bologna-taslak-ornek.json taslağından üretilen model
// çıktısı ve girdisi. Adlar, adresler ve özetler uydurmadır.

import type { AtifKaynagi } from "../../guvence/atif.ts";
import { type BolognaTaslagiCiktisi, type BolognaTaslagiGirdisi, DAYANAKLI_BOLUMLER } from "./index.ts";
import ornek from "./ornek-taslak.json" with { type: "json" };

export const OKUMA_OZET = "ab12cd34".padEnd(64, "0");
export const BEYAN_OZET = "ef56ab78".padEnd(64, "0");

export const ornekKaynak = (ozet = OKUMA_OZET, kod = "TBP201") => `[K:${ozet.slice(0, 8)} b.${kod}.kaynaklar]`;

export function ornekOkuma(ozet = OKUMA_OZET, kod = "TBP201"): AtifKaynagi {
  return {
    ozet,
    parcalar: [
      {
        capa: { bolum: `${kod}.amac` },
        metin: "Dersin amacı HTML, CSS ve JavaScript ile web sayfası geliştirmektir.",
      },
      {
        capa: { bolum: `${kod}.kaynaklar` },
        metin: "JavaScript: The Definitive Guide; HTML and CSS: Design and Build Websites",
      },
    ],
  };
}

export function ornekGirdi(): BolognaTaslagiGirdisi {
  return {
    sabit: {
      kod: ornek.kod,
      ad: ornek.ad,
      akts: ornek.akts,
      tul: ornek.tul,
      programCiktilari: ornek.programCiktilari,
      yetkililer: ornek.yetkililer,
    },
    okuma: ornekOkuma(),
    beyan: {
      ozet: BEYAN_OZET,
      parcalar: [
        { capa: { bolum: "beyan" }, metin: "Dönem projesi var, sorular deneme@ornek.edu.tr adresine yazılır." },
      ],
    },
  };
}

/** Örnek taslaktan model çıktısı: sistem alanları çıkarılır, dayanak ve kaynak atıfları eklenir. */
export function ornekCikti(ozet = OKUMA_OZET, kod = "TBP201"): BolognaTaslagiCiktisi {
  const o = structuredClone(ornek);
  return {
    amac: o.amac,
    icerik: o.icerik,
    yontem: o.yontem,
    notlar: o.notlar,
    onKosul: "Yok",
    degerlendirme: o.degerlendirme,
    isyuku: o.isyuku,
    dersYapisi: o.dersYapisi,
    ciktilar: o.ciktilar as BolognaTaslagiCiktisi["ciktilar"],
    haftalar: o.haftalar,
    kaynaklar: o.kaynaklar.map((k) => ({ yazar: k.yazar, eser: k.eser, atif: ornekKaynak(ozet, kod) })),
    katki: o.katki,
    ska: o.ska,
    dayanaklar: DAYANAKLI_BOLUMLER.map((bolum) => ({ bolum, atif: `[K:${ozet.slice(0, 8)} b.${kod}.amac]` })),
  };
}
