import type { Metadata } from "next";
import { SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { ENVANTER_BASLIKLARI } from "../../../../veri/veri-akisi.ts";
import { guncelEnvanter } from "../../../../veri/veri-akisi-girdi.ts";

export const metadata: Metadata = { title: "Veri akışı" };

export default function VeriAkisiSayfasi() {
  const satirlar = guncelEnvanter();
  return (
    <>
      <SayfaBasligi
        baslik="Veri akışı"
        aciklama="Hangi kişisel verinin nereye, hangi amaçla gittiğini gösterir. Bu sayfa yalnız okunur."
        eylem={
          <a className="underline" href="/panel/ayarlar/veri-akisi/csv" download>
            Tabloyu indir
          </a>
        }
      />
      <p role="note" className="mt-4 rounded-sm border-2 border-risk-orta bg-risk-orta-zemin p-3 text-risk-orta">
        Taslaktır; hukuk biriminizin incelemesi gerekir. "Doğrulanmadı" yazan bilgiler henüz resmî kaynakla
        karşılaştırılmadı.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <caption className="sr-only">Kişisel veri işleme faaliyetleri</caption>
          <thead>
            <tr>
              {ENVANTER_BASLIKLARI.map(([k, b]) => (
                <th key={k} scope="col" className="border-b p-2 text-left align-bottom">
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {satirlar.map((s) => (
              <tr key={s.faaliyet} className="align-top">
                {ENVANTER_BASLIKLARI.map(([k], i) =>
                  i === 0 ? (
                    <th key={k} scope="row" className="border-b p-2 text-left font-semibold">
                      {s[k]}
                    </th>
                  ) : (
                    <td key={k} className="border-b p-2">
                      {s[k].replaceAll("DOĞRULANMADI", "doğrulanmadı")}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
