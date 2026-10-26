import type { Rapor, RaporBolumu } from "../../../veri/kaynak.ts";

export interface Kapsama {
  toplam: number;
  atifli: number;
  eksik: number;
}

/** Bölümdeki paragrafların kaçı kanıta bağlı, kaçı EKSİK. Atıfsız paragraf eksik sayılır. */
export function bolumKapsamasi(b: RaporBolumu): Kapsama {
  const toplam = b.paragraflar.length;
  const atifli = b.paragraflar.filter((p) => !p.eksik && p.atiflar.length > 0).length;
  return { toplam, atifli, eksik: toplam - atifli };
}

export function raporKapsamasi(r: Rapor): Kapsama {
  return r.bolumler
    .map(bolumKapsamasi)
    .reduce((a, b) => ({ toplam: a.toplam + b.toplam, atifli: a.atifli + b.atifli, eksik: a.eksik + b.eksik }), {
      toplam: 0,
      atifli: 0,
      eksik: 0,
    });
}
