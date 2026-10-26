import type { Metadata } from "next";
import Link from "next/link";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { veriKaynagi } from "../../../veri/bellek.ts";
import { BolognaRozeti } from "./bologna-rozeti.tsx";

export const metadata: Metadata = { title: "Dersler" };

export default async function DerslerSayfasi() {
  const dersler = await veriKaynagi().dersler();
  return (
    <>
      <SayfaBasligi baslik="Dersler" aciklama="Ders bilgi paketi ve ders dosyası durumları." />
      <Tablo
        baslik="Programın dersleri"
        sutunlar={[
          { anahtar: "ders", baslik: "Ders", siralanabilir: true, satirBasligi: true },
          { anahtar: "yariyil", baslik: "Yarıyıl", siralanabilir: true },
          { anahtar: "akts", baslik: "AKTS", siralanabilir: true },
          { anahtar: "bologna", baslik: "Ders bilgi paketi" },
          { anahtar: "dosya", baslik: "Ders dosyası", siralanabilir: true },
        ]}
        satirlar={dersler.map((d) => {
          const tamam = d.dersDosyasi.filter((x) => x.tamam).length;
          return {
            anahtar: d.id,
            degerler: { ders: d.kod, yariyil: d.yariyil, akts: d.akts, dosya: tamam },
            hucreler: {
              ders: (
                <Link href={`/panel/dersler/${d.id}`} className="text-vurgu underline underline-offset-2">
                  {d.kod} {d.ad}
                </Link>
              ),
              yariyil: d.yariyil,
              akts: d.akts,
              bologna: <BolognaRozeti durum={d.bolognaDurumu} />,
              dosya: `${tamam} / ${d.dersDosyasi.length} belge`,
            },
          };
        })}
      />
    </>
  );
}
