import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { OLCUTLER } from "../../../veri/ornek.ts";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { KanitListesi } from "./kanit-listesi.tsx";

export const metadata: Metadata = { title: "Kanıtlar" };

const SAYAC_ADI = {
  isleniyor: "İşleniyor",
  tamam: "İşlendi",
  hata: "İşlenemedi",
  ocr_bekliyor: "Taranmış, okunmayı bekliyor",
  kisisel_veri: "Kişisel veri bulundu",
} as const;

export default async function KanitlarSayfasi() {
  const kaynak = await panelVeriKaynagi();
  const [kanitlar, hat] = await Promise.all([kaynak.kanitlar(), kaynak.kanitHattiOzeti()]);
  // Örnek veride ölçüt listesi sabittir; gerçek veride kanıtların bağlı olduğu ölçütlerden çıkar.
  const olcutler = GERCEK_VERI ? [...new Set(kanitlar.flatMap((k) => k.olcutler))].sort() : OLCUTLER;
  return (
    <>
      <SayfaBasligi baslik="Kanıtlar" aciklama="Bütün belgeler tek yerde. Her dosya içerik özetiyle saklanır." />
      <section aria-labelledby="hat-baslik" className="mb-6 rounded-lg border border-cizgi bg-yuzey p-4">
        <h2 id="hat-baslik" className="font-semibold">
          Belge işleme durumu
        </h2>
        <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {(Object.keys(SAYAC_ADI) as (keyof typeof SAYAC_ADI)[]).map((a) => (
            <div key={a} className="flex gap-2">
              <dt className="text-soluk">{SAYAC_ADI[a]}</dt>
              <dd className="font-semibold">{hat.sayac[a]}</dd>
            </div>
          ))}
        </dl>
      </section>
      <KanitListesi kanitlar={kanitlar} olcutler={olcutler} />
    </>
  );
}
