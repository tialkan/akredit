import type { Metadata } from "next";
import { Kart, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { GERCEK_VERI } from "../../../veri/sunucu.ts";
import { KararKartlari } from "./karar-kartlari.tsx";
import { NihaiOnayOrnegi } from "./nihai-onay.tsx";
import { ornekKararKartlari, ornekYoneticiOzeti } from "./ornek.ts";

export const metadata: Metadata = { title: "Karar kartları" };

const ACIKLAMA =
  "Yalnız sizin vermeniz gereken kararlar. Eşiği geçen sonuçlar ve resmî sistemde onaylı veriler buraya düşmez; kendiliğinden kayda girer.";

export default async function KararlarSayfasi() {
  if (GERCEK_VERI)
    return (
      <>
        <SayfaBasligi baslik="Karar kartları" aciklama={ACIKLAMA} />
        <Kart baslik="Henüz karar kartı yok">
          <p>Dönem ölçümleri hesaplandığında eşiğin altında kalan sonuçlar burada karar kartı olarak görünür.</p>
        </Kart>
      </>
    );
  const { otomatik, kartlar } = await ornekKararKartlari();
  return (
    <>
      <SayfaBasligi baslik="Karar kartları" aciklama={ACIKLAMA} />
      <p className="mb-4 text-soluk">Bu dönem {otomatik.length} sonuç eşiği geçti ve onaya düşmeden kayda girdi.</p>
      <KararKartlari ilkKartlar={kartlar} />
      <div className="mt-8">
        <NihaiOnayOrnegi ozet={ornekYoneticiOzeti()} />
      </div>
    </>
  );
}
