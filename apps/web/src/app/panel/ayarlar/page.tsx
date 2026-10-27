import type { Metadata } from "next";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { AyarlarFormu } from "./ayarlar-formu.tsx";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function AyarlarSayfasi() {
  const ayarlar = await (await panelVeriKaynagi()).ayarlar();
  return (
    <>
      <SayfaBasligi baslik="Ayarlar" aciklama="Kurum bilgisi, yapay zekâ hizmeti ve yetki politikaları." />
      <AyarlarFormu ilk={ayarlar} />
    </>
  );
}
