// Rapor dil denetimi özeti (İP-44): yayım uyarısı ve bulgu listesi. Bulgular metni düzeltmez, yalnız işaretler.

import type { ReactNode } from "react";
import { KURAL_ADI, ONEM_ADI } from "./okuyucu-modeli.ts";

export interface DilOzetiBulgusu {
  bolumBasligi: string;
  paragraf: number;
  cumle: number;
  kural: string;
  onem: string;
  aciklama: string;
  acik: boolean;
}

export function DilDenetimiOzeti({
  bulgular,
  yayimUyarisi,
  eylem,
}: {
  bulgular: DilOzetiBulgusu[];
  yayimUyarisi: string | null;
  eylem?: ReactNode;
}) {
  return (
    <section aria-labelledby="dil-denetimi" className="mb-6 rounded-sm border border-cizgi bg-yuzey p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="dil-denetimi" className="text-lg font-semibold">
          Dil denetimi
        </h2>
        {eylem}
      </div>
      {yayimUyarisi ? (
        <p className="mt-2 rounded-sm border border-risk-yuksek bg-risk-yuksek-zemin p-3">{yayimUyarisi}</p>
      ) : null}
      {bulgular.length === 0 ? (
        <p className="mt-2">Dil kurallarına takılan cümle yok.</p>
      ) : (
        <details className="mt-2">
          <summary className="min-h-11 cursor-pointer py-2">
            {bulgular.length} bulgu. Cümleler metinde dalgalı çizgiyle işaretli.
          </summary>
          <ul className="mt-2 space-y-2 text-sm">
            {bulgular.map((b, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: bulgular sabit sıralı
              <li key={i} className="rounded-sm border border-cizgi p-2">
                <span className="font-semibold">
                  {KURAL_ADI[b.kural] ?? b.kural} ({ONEM_ADI[b.onem] ?? b.onem}
                  {b.acik ? "" : ", karar verildi"})
                </span>
                <span className="text-soluk">
                  {" "}
                  · {b.bolumBasligi}, paragraf {b.paragraf}, cümle {b.cumle}
                </span>
                <br />
                {b.aciklama}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
