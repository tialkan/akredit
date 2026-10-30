import type { Metadata } from "next";
import { Kart, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { GERCEK_VERI, kararKartlariVerisi } from "../../../veri/sunucu.ts";
import { KararKartlari } from "./karar-kartlari.tsx";
import { NihaiOnayOrnegi } from "./nihai-onay.tsx";
import { ornekKararKartlari, ornekYoneticiOzeti } from "./ornek.ts";

export const metadata: Metadata = { title: "Karar kartları" };

const ACIKLAMA =
  "Yalnız sizin vermeniz gereken kararlar. Eşiği geçen sonuçlar ve resmî sistemde onaylı veriler buraya düşmez; kendiliğinden kayda girer.";

/** Örnek kipte önlemin uygulanacağı dönem önerisi (örnek kartların dönemi 2026-2027 Güz). */
const ORNEK_HEDEF_DONEM = "2027-2028 Güz";

export default async function KararlarSayfasi() {
  if (GERCEK_VERI) {
    const veri = await kararKartlariVerisi();
    if (!veri)
      return (
        <>
          <SayfaBasligi baslik="Karar kartları" aciklama={ACIKLAMA} />
          <Kart baslik="Bu sayfayı görme yetkiniz yok">
            <p>Karar kartlarını kurum düzeyinde ölçme sonuçlarını görebilen kişiler görür.</p>
          </Kart>
        </>
      );
    return (
      <>
        <SayfaBasligi baslik="Karar kartları" aciklama={ACIKLAMA} />
        <p className="mb-4 text-soluk">
          Şimdiye kadar {veri.otomatikSayisi} sonuç eşiği geçti ve onaya düşmeden kayda girdi.
        </p>
        <KararKartlari ilkKartlar={veri.kartlar} gercek />
      </>
    );
  }
  const { otomatik, kartlar } = await ornekKararKartlari();
  return (
    <>
      <SayfaBasligi baslik="Karar kartları" aciklama={ACIKLAMA} />
      <p className="mb-4 text-soluk">Bu dönem {otomatik.length} sonuç eşiği geçti ve onaya düşmeden kayda girdi.</p>
      <KararKartlari ilkKartlar={kartlar.map((k) => ({ ...k, hedefDonem: ORNEK_HEDEF_DONEM }))} />
      <div className="mt-8">
        <NihaiOnayOrnegi ozet={ornekYoneticiOzeti()} />
      </div>
    </>
  );
}
