// /deneyin araçlarının ortak görünüm parçaları. Kalın yazı yok; kutularda sol çizgi yok.

import type { ReactNode } from "react";

export const DUGME =
  "inline-flex min-h-11 items-center justify-center rounded-sm border border-vurgu bg-vurgu px-4 text-vurgu-metin hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const IKINCIL =
  "inline-flex min-h-11 items-center justify-center rounded-sm border border-cizgi-guclu bg-yuzey px-4 text-metin hover:bg-yuzey-2";
export const ALAN =
  "w-full min-w-0 rounded-sm border border-cizgi-guclu bg-yuzey px-3 py-2 text-base text-metin placeholder:text-soluk";
export const ETIKET = "block text-base text-metin";
export const NOT = "text-base text-soluk";

/** Bilgi kutusu: ince çerçeve ve zemin. */
export function Kutu({ children, tur = "bilgi" }: { children: ReactNode; tur?: "bilgi" | "uyari" | "basari" }) {
  const renk =
    tur === "uyari"
      ? "border-risk-orta bg-risk-orta-zemin"
      : tur === "basari"
        ? "border-risk-dusuk bg-risk-dusuk-zemin"
        : "border-cizgi-guclu bg-zemin";
  return <div className={`rounded-sm border px-4 py-3 ${renk}`}>{children}</div>;
}

/** Yatay kaydırılabilir tablo sarmalı: dar ekranda sayfa taşmaz, tablo kendi içinde kayar. */
export function Tablo({ baslik, sutunlar, satirlar }: { baslik: string; sutunlar: string[]; satirlar: ReactNode[][] }) {
  return (
    <section
      className="max-w-full overflow-x-auto rounded-sm border border-cizgi"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılabilir tablo klavyeyle kaydırılır (WCAG 2.1.1)
      tabIndex={0}
      aria-label={baslik}
    >
      <table className="w-full border-collapse text-left text-base">
        <caption className="sr-only">{baslik}</caption>
        <thead className="bg-zemin">
          <tr>
            {sutunlar.map((s) => (
              <th key={s} scope="col" className="border-b border-cizgi px-3 py-2 font-normal text-soluk">
                {s}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((r, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: satırlar sabit sıradadır
            <tr key={i} className="border-b border-cizgi last:border-b-0">
              {r.map((h, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: hücreler sabit sıradadır
                <td key={j} className="px-3 py-2 align-top">
                  {h}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
