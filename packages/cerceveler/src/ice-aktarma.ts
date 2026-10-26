// Resmî belgeden ölçüt ağacı taslağı çıkarma ve uzman onayı. Saf işlevler: belge metni
// (sayfa sayfa) dışarıda çıkarılır (@akredit/belge), burada yalnız yapı kurulur.
// Metin belgeden alınır; hiçbir başlık ya da metin burada üretilmez.

import { z } from "zod";
import { type Cerceve, cerceveSemasi, type KaynakBelge, type Olcut, tumOlcutler } from "./sema.ts";

export const belgeSayfasiSemasi = z.object({ sayfa: z.number().int().positive(), metin: z.string() });
export type BelgeSayfasi = z.infer<typeof belgeSayfasiSemasi>;

/** Ölçüt satırını tanıyan desen: 1. grup kod, 2. grup başlık. Varsayılan "A.1.2 Başlık" biçimi. */
export const VARSAYILAN_KOD_DESENI = /^([A-Z](?:\.\d+)+)\.?\s+(\S.*)$/;

const ustKod = (kod: string): string | null => {
  const i = kod.lastIndexOf(".");
  return i < 0 ? null : kod.slice(0, i);
};

/**
 * Sayfa metinlerinden ölçüt ağacı taslağı. Kod satırından sonra gelen satırlar, bir sonraki
 * kod satırına kadar ölçütün metnidir. Her ölçüt ilk göründüğü sayfayı taşır.
 * Üst kodu belgede bulunmayan ölçüt köke eklenir ve uyarı verilir.
 */
export function olcutTaslagiCikar(
  sayfalar: readonly BelgeSayfasi[],
  desen: RegExp = VARSAYILAN_KOD_DESENI,
): { olcutler: Olcut[]; uyarilar: string[] } {
  const sirali = sayfalar.map((s) => belgeSayfasiSemasi.parse(s)).sort((a, b) => a.sayfa - b.sayfa);
  const duz: { olcut: Olcut; satirlar: string[] }[] = [];
  const uyarilar: string[] = [];
  let gecerli: { olcut: Olcut; satirlar: string[] } | null = null;
  for (const s of sirali) {
    for (const ham of s.metin.split(/\r?\n/)) {
      const satir = ham.trim();
      if (!satir) continue;
      const m = desen.exec(satir);
      if (m?.[1] && m[2]) {
        if (duz.some((d) => d.olcut.kod === m[1])) {
          uyarilar.push(`${m[1]} kodu ${s.sayfa}. sayfada yeniden geçiyor; ilk geçiş kullanıldı.`);
          gecerli = null;
          continue;
        }
        gecerli = {
          olcut: {
            kod: m[1],
            baslik: m[2].trim(),
            metin: "",
            metinDurumu: "resmi",
            kaynakSayfa: s.sayfa,
            kanitGereksinimleri: [],
            altOlcutler: [],
          },
          satirlar: [],
        };
        duz.push(gecerli);
      } else if (gecerli) {
        gecerli.satirlar.push(satir);
      }
    }
  }
  const harita = new Map<string, Olcut>();
  const kok: Olcut[] = [];
  for (const d of duz) {
    // Metni olmayan ölçütte başlık, belgedeki metnin kendisidir.
    d.olcut.metin = d.satirlar.length ? d.satirlar.join(" ") : d.olcut.baslik;
    harita.set(d.olcut.kod, d.olcut);
    const ust = ustKod(d.olcut.kod);
    const ustOlcut = ust ? harita.get(ust) : undefined;
    if (ustOlcut) ustOlcut.altOlcutler.push(d.olcut);
    else {
      if (ust && ust.includes(".")) uyarilar.push(`${d.olcut.kod} için üst ölçüt ${ust} belgede bulunamadı.`);
      kok.push(d.olcut);
    }
  }
  return { olcutler: kok, uyarilar };
}

/** İçe aktarılan taslağı doğrulanmamış bir çerçeve olarak kurar. */
export function taslakCerceve(girdi: {
  kod: string;
  ad: string;
  surum: string;
  kaynak: KaynakBelge;
  yayimTarihi: string | null;
  sayfalar: readonly BelgeSayfasi[];
  desen?: RegExp;
}): { cerceve: Cerceve; uyarilar: string[] } {
  if (!girdi.kaynak.sha256) throw new Error("Belge özeti yok. Önce resmî belgeyi indirip özetini kaydedin.");
  const { olcutler, uyarilar } = olcutTaslagiCikar(girdi.sayfalar, girdi.desen);
  if (olcutler.length === 0) throw new Error("Belgede ölçüt bulunamadı. Kod desenini denetleyin.");
  const cerceve = cerceveSemasi.parse({
    kod: girdi.kod,
    ad: girdi.ad,
    surum: girdi.surum,
    resmi: true,
    kaynak: girdi.kaynak,
    yayimTarihi: girdi.yayimTarihi,
    dogrulandi: false,
    dogrulayan: null,
    dogrulamaZamani: null,
    olgunlukDuzeyleri: [],
    olcutler,
    raporSablonu: [],
  });
  return { cerceve, uyarilar };
}

/**
 * Uzman onayı. Onay insan kararıdır: onaylayanın adı ve zamanı zorunludur.
 * Yeni bir nesne döner; verilen çerçeve değişmez.
 */
export function uzmanOnayi(cerceve: Cerceve, onay: { dogrulayan: string; zaman: string }): Cerceve {
  if (!onay.dogrulayan.trim()) throw new Error("Onaylayanın adı yazılmalı. Onayı yapay zekâ veremez.");
  if (!cerceve.resmi) throw new Error("İç çerçeve resmî metin olarak onaylanamaz.");
  if (tumOlcutler(cerceve.olcutler).some((o) => o.metinDurumu !== "resmi"))
    throw new Error("Doğrulanmamış ölçüt metni var. Önce metni resmî belgeden alın.");
  return cerceveSemasi.parse({
    ...structuredClone(cerceve),
    dogrulandi: true,
    dogrulayan: onay.dogrulayan.trim(),
    dogrulamaZamani: onay.zaman,
  });
}
