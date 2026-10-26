import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { veriKaynagi } from "../../../veri/bellek.ts";
import { OLCUTLER } from "../../../veri/ornek.ts";
import { KanitListesi } from "./kanit-listesi.tsx";

export const metadata: Metadata = { title: "Kanıtlar" };

export default async function KanitlarSayfasi() {
  const kanitlar = await veriKaynagi().kanitlar();
  return (
    <>
      <SayfaBasligi baslik="Kanıtlar" aciklama="Bütün belgeler tek yerde. Her dosya içerik özetiyle saklanır." />
      <KanitListesi kanitlar={kanitlar} olcutler={OLCUTLER} />
    </>
  );
}
