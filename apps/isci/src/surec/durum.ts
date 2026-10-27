// Panel için süreç örneği durumu: adımlar, görevler, son tarihler, sorumlular ve kanıt bağları.

import { SurecTanimi } from "@akredit/surec";
import { kiraciIslemi, sema } from "@akredit/vt";
import { desc, eq } from "drizzle-orm";
import type { SurecBaglami } from "./motor.ts";

export interface AdimGorunumu {
  kod: string;
  ad: string;
  puko: string;
  durum: "bekliyor" | "acik" | "tamam";
  gorevId: string | null;
  sorumluKisiId: string | null;
  sonTarih: string | null;
  gecikti: boolean;
  kanitIdleri: string[];
  enAzKanit: number;
}

export interface OrnekGorunumu {
  id: string;
  kod: string;
  ad: string;
  durum: "acik" | "kapali";
  baslangic: string;
  /** "3/5" gibi gösterim için. */
  tamamlanan: number;
  toplam: number;
  adimlar: AdimGorunumu[];
}

export async function surecDurumu(b: SurecBaglami, kurumId: string): Promise<OrnekGorunumu[]> {
  const simdi = b.saat.simdi();
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const ornekler = await tx
      .select({ o: sema.surecOrnegi, t: sema.surecTanimi })
      .from(sema.surecOrnegi)
      .innerJoin(sema.surecTanimi, eq(sema.surecTanimi.id, sema.surecOrnegi.surecTanimiId))
      .orderBy(desc(sema.surecOrnegi.olusturma));
    const gorevler = await tx.select().from(sema.gorev);
    return ornekler.map(({ o, t }) => {
      const tanim = SurecTanimi.parse(t.tanim);
      const gl = gorevler.filter((g) => g.surecOrnegiId === o.id);
      const adimlar: AdimGorunumu[] = tanim.adimlar.map((a) => {
        const g = gl.find((x) => (x.ayrinti as { adim?: string }).adim === a.kod);
        const ay = (g?.ayrinti ?? {}) as { sonTarih?: string; kanitIdleri?: string[] };
        const durum = !g ? "bekliyor" : g.durum === "tamam" ? "tamam" : "acik";
        return {
          kod: a.kod,
          ad: a.ad,
          puko: a.puko,
          durum,
          gorevId: g?.id ?? null,
          sorumluKisiId: g?.atananKisiId ?? null,
          sonTarih: ay.sonTarih ?? null,
          gecikti: durum === "acik" && !!ay.sonTarih && new Date(ay.sonTarih) < simdi,
          kanitIdleri: ay.kanitIdleri ?? [],
          enAzKanit: a.enAzKanit,
        };
      });
      const kapsam = o.kapsam as { motor?: { baslangic?: string } };
      return {
        id: o.id,
        kod: tanim.kod,
        ad: tanim.ad,
        durum: o.durum === "kapali" ? "kapali" : "acik",
        baslangic: kapsam.motor?.baslangic ?? o.olusturma.toISOString(),
        tamamlanan: adimlar.filter((a) => a.durum === "tamam").length,
        toplam: adimlar.length,
        adimlar,
      };
    });
  });
}
