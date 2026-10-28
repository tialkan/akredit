import type React from "react";
import { ISARET_KUTUSU, ISARET_YOLLARI } from "../marka/isaret.ts";

const KUTU = `${ISARET_KUTUSU.x} ${ISARET_KUTUSU.y} ${ISARET_KUTUSU.g} ${ISARET_KUTUSU.h}`;

/**
 * Akredit işareti (A + onay imi). Renkler tema belirteçlerinden gelir; sitede yalnız açık tema vardır; tek renk
 * sürümler ayrı dosyalardadır. Süs öğesidir; erişilebilir ad, onu saran bağlantıda ya da yanındaki "Akredit" kelimesindedir.
 */
export function Isaret({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg aria-hidden focusable="false" viewBox={KUTU} className={className}>
      <path d={ISARET_YOLLARI.solKol} fill="var(--isaret-a)" />
      <path d={ISARET_YOLLARI.sagKol} fill="var(--isaret-a)" />
      <path d={ISARET_YOLLARI.onay} fill="var(--isaret-onay)" />
    </svg>
  );
}

/** Yatay logo: işaret + "Akredit" kelimesi, sitenin yazı tipiyle (Source Sans 3, 700). */
export function Logo({ boy = "orta" }: { boy?: "orta" | "buyuk" }) {
  const buyuk = boy === "buyuk";
  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight text-[var(--isaret-a)] ${
        buyuk ? "gap-3 text-4xl" : "gap-2 text-xl"
      }`}
    >
      {/* İşaret yüksekliği büyük harf yüksekliğinin yaklaşık 1,1 katı; taban çizgisiyle hizalı durur. */}
      <Isaret className={buyuk ? "h-9 w-auto" : "h-[1.15rem] w-auto"} />
      <span className="leading-none">Akredit</span>
    </span>
  );
}

export function MetinSayfasi({ baslik, ozet, children }: { baslik: string; ozet?: string; children: React.ReactNode }) {
  return (
    <article className="metin-sayfa mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-[-0.01em] text-vurgu sm:text-4xl">{baslik}</h1>
      {ozet ? <p className="mt-3 text-lg text-soluk">{ozet}</p> : null}
      {children}
    </article>
  );
}
