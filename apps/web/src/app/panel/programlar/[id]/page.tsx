import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sekmeler } from "../../../../bilesenler/etkilesimli.tsx";
import { OlcmeCubuklari } from "../../../../bilesenler/olcme-cubuklari.tsx";
import { Kart, KirintiYolu, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { veriKaynagi } from "../../../../veri/bellek.ts";
import { matrisHucreYazisi } from "../../../../veri/yardimci.ts";

export async function generateStaticParams() {
  return (await veriKaynagi().programlar()).map((p) => ({ id: p.id }));
}

export const metadata: Metadata = { title: "Program" };

function hucreStili(seviye: number): { background: string; color: string } {
  if (seviye <= 0) return { background: "var(--isi-0)", color: "var(--metin)" };
  return { background: `var(--isi-${seviye})`, color: seviye >= 4 ? "var(--isi-metin-koyu)" : "var(--metin)" };
}

export default async function ProgramSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const kaynak = veriKaynagi();
  const program = await kaynak.program((await params).id);
  if (!program) notFound();
  const dersler = (await kaynak.dersler()).filter((d) => program.dersIdleri.includes(d.id));

  const matris = (
    <div className="overflow-x-auto rounded-lg border border-cizgi bg-yuzey">
      <table className="w-full border-collapse text-center">
        <caption className="px-4 pt-3 pb-2 text-left">
          <span className="font-semibold">Ders çıktısı × program çıktısı katkı matrisi.</span>{" "}
          <span className="text-sm text-soluk">Hücrede 1-5 katkı puanı; “–” ilişki yok; “?” kanıt yetersiz.</span>
        </caption>
        <thead>
          <tr className="bg-yuzey-2">
            <th scope="col" className="px-3 py-2 text-left">
              Ders çıktısı
            </th>
            {program.ciktilar.map((pc) => (
              <th key={pc.id} scope="col" className="px-3 py-2" title={pc.metin}>
                {pc.kod}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dersler.flatMap((d) =>
            d.ciktilar.map((dc) => (
              <tr key={dc.id} className="border-t border-cizgi">
                <th scope="row" className="px-3 py-1.5 text-left font-semibold whitespace-nowrap">
                  {d.kod} {dc.kod}
                </th>
                {program.ciktilar.map((pc) => {
                  const h = program.matris.find((m) => m.dersCiktisiId === dc.id && m.programCiktisiId === pc.id);
                  const y = h ? matrisHucreYazisi(h.deger) : { kisa: "", uzun: "Değer yok", seviye: 0 };
                  return (
                    <td
                      key={pc.id}
                      className="border-l border-cizgi px-3 py-1.5 font-semibold"
                      style={hucreStili(y.seviye)}
                    >
                      <span aria-hidden>{y.kisa}</span>
                      <span className="sr-only">{y.uzun}</span>
                    </td>
                  );
                })}
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <KirintiYolu ogeler={[{ ad: "Panel", href: "/panel" }, { ad: program.ad }]} />
      <SayfaBasligi
        baslik={program.ad}
        aciklama={`${program.duzey === "onlisans" ? "Önlisans" : "Lisans"} programı · ${program.birim}`}
      />
      <Sekmeler
        etiket="Program bölümleri"
        sekmeler={[
          {
            anahtar: "ciktilar",
            ad: "Program çıktıları",
            icerik: (
              <Kart>
                <dl className="divide-y divide-cizgi">
                  {program.ciktilar.map((pc) => (
                    <div key={pc.id} className="grid gap-1 py-2 sm:grid-cols-[4rem_1fr]">
                      <dt className="font-bold">{pc.kod}</dt>
                      <dd>{pc.metin}</dd>
                    </div>
                  ))}
                </dl>
              </Kart>
            ),
          },
          { anahtar: "matris", ad: "Matris", icerik: matris },
          {
            anahtar: "olcme",
            ad: "Ölçme özeti",
            icerik: (
              <Kart baslik="Program çıktılarının sağlanması">
                <OlcmeCubuklari
                  baslik="Program çıktısı başına sağlanma oranı (örnek veri)"
                  satirlar={program.olcme}
                  esik={program.esik}
                />
              </Kart>
            ),
          },
          {
            anahtar: "dersler",
            ad: "Dersler",
            icerik: (
              <ul className="grid gap-3 sm:grid-cols-2">
                {dersler.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/panel/dersler/${d.id}`}
                      className="block rounded-lg border border-cizgi bg-yuzey p-4 hover:border-vurgu"
                    >
                      <span className="font-semibold">
                        {d.kod} {d.ad}
                      </span>
                      <span className="block text-sm text-soluk">
                        {d.yariyil}. yarıyıl · {d.akts} AKTS
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </>
  );
}
