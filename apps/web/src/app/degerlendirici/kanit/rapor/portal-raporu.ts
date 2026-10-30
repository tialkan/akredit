// Değerlendirici portalında rapor okuyucusu (İP-44). Salt okunur: rapor ve kanıtlar servisten, değerlendiricinin
// portal bağlamıyla (yalnız etkin atamalar, okuma eylemleri) okunur. Her rapor görüntüleme, okuyucuya yüklenen
// kanıtların listesiyle değiştirilemez günlüğe `degerlendirici.` önekli eylemle yazılır; kurum bunu erişim
// günlüğünde görür. Bu modül hiçbir yazma işlevi sunmaz. Kurum içi dil bulguları portalda gösterilmez.

import { gunluge, islem, rapor as raporServisi } from "@akredit/servis";
import type { Rapor } from "../../../../veri/kaynak.ts";
import { type OkuyucuVerisi, okuyucuVerisiServisten } from "../../../panel/raporlar/okuyucu-verisi.ts";
import type { PortalBaglami } from "../../_portal/portal.ts";

export const RAPOR_EYLEMI = {
  listeGoruntulendi: "degerlendirici.rapor_listesi_goruntulendi",
  raporGoruntulendi: "degerlendirici.rapor_goruntulendi",
} as const;

export interface PortalRaporOzeti {
  id: string;
  ad: string;
  donem: string;
  bolumSayisi: number;
}

/** Değerlendiricinin kapsamında görebildiği raporlar. */
export async function portalRaporlari(p: PortalBaglami): Promise<PortalRaporOzeti[]> {
  const liste = await raporServisi.raporlar(p);
  await islem(p, (tx) => gunluge(tx, p, RAPOR_EYLEMI.listeGoruntulendi, null, { sonuc: liste.length }));
  return liste.map((r) => ({ id: r.id, ad: r.ad, donem: r.donem, bolumSayisi: r.bolumler.length }));
}

/** Tek rapor, okuyucu verisiyle. Görüntüleme ve panele yüklenen kanıtlar günlüğe yazılır. */
export async function portalRaporu(p: PortalBaglami, id: string): Promise<{ rapor: Rapor; veri: OkuyucuVerisi }> {
  const r = (await raporServisi.rapor(p, id)) as Rapor;
  const veri = await okuyucuVerisiServisten(p, r, false);
  await islem(p, (tx) =>
    gunluge(
      tx,
      p,
      RAPOR_EYLEMI.raporGoruntulendi,
      { tur: "rapor", id: r.id },
      {
        kanitlar: veri.kanitlar.map((k) => k.id),
        erisilemeyen: veri.erisilemeyen.length,
      },
    ),
  );
  return { rapor: r, veri };
}
