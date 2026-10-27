import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { OnayKutusu } from "./onay-kutusu.tsx";

export const metadata: Metadata = { title: "Onay kutusu" };

export default async function OnaylarSayfasi() {
  const kaynak = await panelVeriKaynagi();
  const [oneriler, kanitlar] = await Promise.all([kaynak.bekleyenOneriler(), kaynak.kanitlar()]);
  const kanitAdlari = Object.fromEntries(kanitlar.map((k) => [k.id, k.baslik]));
  return (
    <>
      <SayfaBasligi
        baslik="Onay kutusu"
        aciklama="Sistemin hazırladığı öneriler. Her birini kanıtıyla görün; onaylayın, düzeltin ya da reddedin."
      />
      <OnayKutusu ilkOneriler={oneriler} kanitAdlari={kanitAdlari} />
    </>
  );
}
