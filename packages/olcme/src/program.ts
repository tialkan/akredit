// Program düzeyi PÇ sağlanması: derslerin PÇ değerlerinin ağırlıklı ortalaması.

import { sirala } from "./istatistik.ts";
import type { PcSaglanmasi } from "./turler.ts";

export type ProgramAgirligi = "esit" | "akts" | "katki";

export interface ProgramDersGirdisi {
  dersKodu: string;
  /** "akts" ağırlığında zorunlu. */
  akts?: number;
  ogrenciSayisi: number;
  pcSaglanmasi: PcSaglanmasi[];
}

export interface ProgramPcSonucu {
  pcKod: string;
  deger: number | null;
  dersSayisi: number;
  /** Katkı veren derslerin öğrenci sayıları toplamı (aynı öğrenci birden çok derste sayılabilir). */
  ogrenciSayisi: number;
  dersler: { dersKodu: string; deger: number; agirlik: number }[];
}

/** Program PÇ = Σ_ders PÇ_ders · a_ders / Σ a_ders; a: 1 (eşit), AKTS ya da dersin o PÇ'ye katkı toplamı. */
export function programPcHesapla(
  dersler: readonly ProgramDersGirdisi[],
  secenek: { agirlik: ProgramAgirligi } = { agirlik: "esit" },
): ProgramPcSonucu[] {
  const sirali = [...dersler].sort((a, b) => sirala(a.dersKodu, b.dersKodu));
  const pcler = [...new Set(sirali.flatMap((d) => d.pcSaglanmasi.map((p) => p.pcKod)))].sort(sirala);
  return pcler.map((pc) => {
    const katkilar: ProgramPcSonucu["dersler"] = [];
    let ogrenciSayisi = 0;
    for (const d of sirali) {
      const p = d.pcSaglanmasi.find((x) => x.pcKod === pc);
      if (!p || p.deger === null) continue;
      let agirlik: number;
      if (secenek.agirlik === "esit") agirlik = 1;
      else if (secenek.agirlik === "katki") agirlik = p.katkiToplami;
      else {
        if (d.akts === undefined || !(d.akts > 0))
          throw new RangeError(`${d.dersKodu} dersinin AKTS değeri yok. AKTS'yi girin ya da eşit ağırlık seçin.`);
        agirlik = d.akts;
      }
      katkilar.push({ dersKodu: d.dersKodu, deger: p.deger, agirlik });
      ogrenciSayisi += d.ogrenciSayisi;
    }
    const at = katkilar.reduce((t, x) => t + x.agirlik, 0);
    const deger = at > 0 ? katkilar.reduce((t, x) => t + x.deger * x.agirlik, 0) / at : null;
    return { pcKod: pc, deger, dersSayisi: katkilar.length, ogrenciSayisi, dersler: katkilar };
  });
}
