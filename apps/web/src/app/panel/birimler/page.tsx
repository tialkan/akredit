import type { Metadata } from "next";
import { BaglantiDugme } from "../../../bilesenler/dugme.tsx";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { BirimYonetimi } from "./yonetim.tsx";

export const metadata: Metadata = { title: "Birimler ve programlar" };

export default function BirimlerSayfasi() {
  return (
    <>
      <SayfaBasligi
        baslik="Birimler ve programlar"
        aciklama="Birim ve program ekleyin, düzeltin, kişilere rol atayın. Her düzeltmenin eski değeri geçmişte kalır."
        eylem={<BaglantiDugme href="/kurulum">Kurulum sihirbazı</BaglantiDugme>}
      />
      <BirimYonetimi />
    </>
  );
}
