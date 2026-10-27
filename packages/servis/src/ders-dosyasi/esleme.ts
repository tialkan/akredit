// Soru → ders öğrenme çıktısı (ÇK) eşleme önerisi (saf mantık, İP-16).
//
// Kaynak sırası: (1) aynı dersin önceki döneminde onaylanmış eşleme (araç türü + soru no ile taşınır),
// (2) model adayları (ilk dönem; yalnız derste var olan ÇK kodları kabul edilir), (3) hiçbiri yoksa soru
// `EKSİK` kalır. Eşleme uydurulmaz; insan tek bir orta riskli kararla onaylar ya da metni düzelterek onaylar.

import type { OlcmeAraciTuru } from "@akredit/cekirdek";
import { z } from "zod";

export interface EslemeAraci {
  ad: string;
  tur: OlcmeAraciTuru;
  sorular: { no: string }[];
}

export interface EslemeSatiri {
  aracAdi: string;
  aracTur: OlcmeAraciTuru;
  soruNo: string;
  /** Boşsa soru eşlenmemiştir (EKSİK). */
  ckKodlari: string[];
  kaynak: "onceki_donem" | "yz" | "yok" | "insan";
}

export interface EslemeOnerisi {
  satirlar: EslemeSatiri[];
  /** Eşlenemeyen soruların "Araç · Soru" adları. */
  eksikler: string[];
  /** Reddedilen model adayları ve nedenleri. */
  reddedilenler: { aday: string; neden: string }[];
}

const ModelAdayi = z.object({
  aracAdi: z.string().optional(),
  soruNo: z.string().min(1),
  ckKodlari: z.array(z.string()).min(1),
});

export const soruAdi = (aracAdi: string, soruNo: string) => `${aracAdi} · S${soruNo}`;

/** Eşleme önerisini kurar. `onceki` önceki dönemin onaylı eşlemesidir (yoksa boş). */
export function eslemeOnerisiKur(g: {
  araclar: readonly EslemeAraci[];
  ckKodlari: readonly string[];
  onceki?: readonly EslemeSatiri[];
  adaylar?: readonly unknown[];
}): EslemeOnerisi {
  const ckler = new Set(g.ckKodlari);
  const reddedilenler: EslemeOnerisi["reddedilenler"] = [];
  const adaylar = new Map<string, string[]>();
  for (const [i, ham] of (g.adaylar ?? []).entries()) {
    const a = ModelAdayi.safeParse(ham);
    if (!a.success) {
      reddedilenler.push({ aday: `#${i + 1}`, neden: "Aday biçimi tanınmadı." });
      continue;
    }
    const bilinmeyen = a.data.ckKodlari.filter((k) => !ckler.has(k));
    if (bilinmeyen.length) {
      reddedilenler.push({
        aday: `#${i + 1} (S${a.data.soruNo})`,
        neden: `Derste olmayan çıktı: ${bilinmeyen.join(", ")}.`,
      });
      continue;
    }
    adaylar.set(`${a.data.aracAdi ?? ""}|${a.data.soruNo}`, [...new Set(a.data.ckKodlari)]);
  }
  const satirlar: EslemeSatiri[] = [];
  const eksikler: string[] = [];
  for (const arac of g.araclar)
    for (const s of arac.sorular) {
      const eski = g.onceki?.find((o) => o.aracTur === arac.tur && o.soruNo === s.no && o.ckKodlari.length > 0);
      const eskiKodlar = eski?.ckKodlari.filter((k) => ckler.has(k)) ?? [];
      const model = adaylar.get(`${arac.ad}|${s.no}`) ?? adaylar.get(`|${s.no}`);
      let satir: EslemeSatiri;
      if (eskiKodlar.length)
        satir = { aracAdi: arac.ad, aracTur: arac.tur, soruNo: s.no, ckKodlari: eskiKodlar, kaynak: "onceki_donem" };
      else if (model) satir = { aracAdi: arac.ad, aracTur: arac.tur, soruNo: s.no, ckKodlari: model, kaynak: "yz" };
      else satir = { aracAdi: arac.ad, aracTur: arac.tur, soruNo: s.no, ckKodlari: [], kaynak: "yok" };
      if (satir.ckKodlari.length === 0) eksikler.push(soruAdi(arac.ad, s.no));
      satirlar.push(satir);
    }
  return { satirlar, eksikler, reddedilenler };
}

/** İnsanın okuyup düzeltebileceği metin: her satır `Araç · S1: ÇK1, ÇK2` (eşlenmemişse `EKSİK`). */
export function eslemeMetni(satirlar: readonly EslemeSatiri[]): string {
  return satirlar
    .map((s) => `${soruAdi(s.aracAdi, s.soruNo)}: ${s.ckKodlari.length ? s.ckKodlari.join(", ") : "EKSİK"}`)
    .join("\n");
}

export class EslemeMetniHatasi extends Error {}

/**
 * Düzeltilmiş eşleme metnini okur. Her soru tam bir kez yazılmalı; ÇK kodları derste olmalı. `EKSİK` ya da boş
 * değer sorunun eşlenmediğini söyler.
 */
export function eslemeMetniOku(
  metin: string,
  araclar: readonly EslemeAraci[],
  ckKodlari: readonly string[],
): EslemeSatiri[] {
  const ckler = new Set(ckKodlari);
  const beklenen = new Map<string, { arac: EslemeAraci; no: string }>();
  for (const a of araclar) for (const s of a.sorular) beklenen.set(soruAdi(a.ad, s.no), { arac: a, no: s.no });
  const bulunan = new Map<string, EslemeSatiri>();
  for (const [i, ham] of metin.split(/\r?\n/u).entries()) {
    const satir = ham.trim();
    if (!satir) continue;
    const ayrac = satir.lastIndexOf(":");
    if (ayrac < 0) throw new EslemeMetniHatasi(`${i + 1}. satır "Araç · S1: ÇK1" biçiminde değil.`);
    const ad = satir.slice(0, ayrac).trim();
    const b = beklenen.get(ad);
    if (!b) throw new EslemeMetniHatasi(`${i + 1}. satırdaki soru (${ad}) bu dersin sınavlarında yok.`);
    if (bulunan.has(ad)) throw new EslemeMetniHatasi(`${ad} birden çok kez yazılmış.`);
    const deger = satir.slice(ayrac + 1).trim();
    const kodlar =
      deger === "" || deger.toLocaleUpperCase("tr") === "EKSİK"
        ? []
        : [
            ...new Set(
              deger
                .split(/[,;]/u)
                .map((k) => k.trim())
                .filter(Boolean),
            ),
          ];
    const yok = kodlar.filter((k) => !ckler.has(k));
    if (yok.length) throw new EslemeMetniHatasi(`${ad} için yazılan çıktı derste yok: ${yok.join(", ")}.`);
    bulunan.set(ad, { aracAdi: b.arac.ad, aracTur: b.arac.tur, soruNo: b.no, ckKodlari: kodlar, kaynak: "insan" });
  }
  const eksik = [...beklenen.keys()].filter((k) => !bulunan.has(k));
  if (eksik.length) throw new EslemeMetniHatasi(`Şu sorular metinde yok: ${eksik.join(", ")}.`);
  return [...beklenen.keys()].map((k) => bulunan.get(k) as EslemeSatiri);
}
