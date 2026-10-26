// Sağlanma oranı çubukları: her satırda sayı yazılıdır, eşik çizgisi hem çizgi hem metinle gösterilir.

import type { OlcmeSatiri } from "../veri/kaynak.ts";
import { yuzdeYaz } from "../veri/yardimci.ts";

export function OlcmeCubuklari({ baslik, satirlar, esik }: { baslik: string; satirlar: OlcmeSatiri[]; esik: number }) {
  return (
    <figure>
      <figcaption className="mb-3 text-sm text-soluk">
        {baslik}. Eşik {yuzdeYaz(esik)}; eşiğin altındakiler “eşik altı” olarak yazılır.
      </figcaption>
      <ul className="space-y-2">
        {satirlar.map((s) => {
          const alti = s.saglanma < esik;
          return (
            <li key={s.ciktiId} className="grid grid-cols-[3.5rem_1fr_6.5rem] items-center gap-3">
              <span className="font-semibold">{s.kod}</span>
              <span aria-hidden className="relative h-5 rounded bg-yuzey-2">
                <span
                  className={`block h-5 rounded ${alti ? "bg-risk-yuksek" : "bg-vurgu"}`}
                  style={{ width: `${Math.min(100, s.saglanma * 100)}%` }}
                />
                <span className="absolute -top-1 -bottom-1 w-0.5 bg-metin" style={{ left: `${esik * 100}%` }} />
              </span>
              <span className={`text-right ${alti ? "font-bold text-risk-yuksek" : ""}`}>
                {yuzdeYaz(s.saglanma)}
                {alti ? <span className="block text-xs">eşik altı</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
