import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { portalAc } from "../_portal/durum.tsx";
import { SoruFormu } from "./soru-formu.tsx";

export const metadata: Metadata = { title: "Soru sor" };
export const dynamic = "force-dynamic";

export default async function SoruSayfasi() {
  const acilis = await portalAc();
  if ("durum" in acilis) return acilis.durum;
  return (
    <>
      <SayfaBasligi
        baslik="Kanıtlara soru sorun"
        aciklama="Yanıtlar yalnız kanıtlara dayanır ve her cümle kaynağını gösterir. Kanıtla doğrulanamayan kısım EKSİK olarak işaretlenir. Sorular ve yanıtlar kuruma açık günlüğe yazılır."
      />
      <SoruFormu />
    </>
  );
}
