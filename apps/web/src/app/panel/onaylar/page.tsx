import type { Metadata } from "next";
import Link from "next/link";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { MobilKurulum } from "./mobil-kurulum.tsx";
import { OnayKutusu } from "./onay-kutusu.tsx";

export const metadata: Metadata = {
  title: "Onay kutusu",
  manifest: "/panel/onaylar/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Onaylar", statusBarStyle: "default" },
};

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
      <p className="mb-4">
        Eşik altı sonuçlar için önlem kararları <Link href="/panel/kararlar">karar kartlarında</Link> verilir.
      </p>
      <MobilKurulum />
      <OnayKutusu ilkOneriler={oneriler} kanitAdlari={kanitAdlari} />
    </>
  );
}
