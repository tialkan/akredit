import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kart, KirintiYolu, SayfaBasligi } from "../../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../../../veri/sunucu.ts";
import { TaramaPaneli } from "./tarama-paneli.tsx";

export async function generateStaticParams() {
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).dersler()).map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const x = await (await panelVeriKaynagi()).ders((await params).id);
  return { title: x ? `${x.kod} · Sınav taraması` : "Sınav taraması" };
}

export default async function TaramaSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const ders = await (await panelVeriKaynagi()).ders((await params).id);
  if (!ders) notFound();
  return (
    <>
      <KirintiYolu
        ogeler={[
          { ad: "Panel", href: "/panel" },
          { ad: "Dersler", href: "/panel/dersler" },
          { ad: ders.kod, href: `/panel/dersler/${ders.id}` },
          { ad: "Sınav taraması" },
        ]}
      />
      <SayfaBasligi
        baslik="Sınav kâğıdı taraması"
        aciklama={`${ders.kod} ${ders.ad}: soru bazlı puanlar taranmış kâğıtlardan okunur, emin olunamayanları siz onaylarsınız.`}
      />
      <Kart baslik="Vize">
        <TaramaPaneli />
      </Kart>
    </>
  );
}
