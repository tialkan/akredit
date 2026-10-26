import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type DugmeTuru = "birincil" | "ikincil" | "sessiz" | "tehlike";
export type DugmeBoyu = "kucuk" | "orta";

const TUR_SINIFI: Record<DugmeTuru, string> = {
  birincil: "bg-vurgu text-vurgu-metin border-vurgu hover:opacity-90",
  ikincil: "bg-yuzey text-metin border-cizgi-guclu hover:bg-yuzey-2",
  sessiz: "bg-transparent text-metin border-transparent hover:bg-yuzey-2",
  tehlike: "bg-yuzey text-risk-yuksek border-risk-yuksek hover:bg-risk-yuksek-zemin",
};

// En küçük hedef 24px (WCAG 2.5.8); orta boy 44px dokunma hedefi.
const BOY_SINIFI: Record<DugmeBoyu, string> = {
  kucuk: "min-h-9 px-3 text-sm",
  orta: "min-h-11 px-4",
};

export function dugmeSinifi(tur: DugmeTuru = "ikincil", boy: DugmeBoyu = "orta", ek = ""): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-50",
    TUR_SINIFI[tur],
    BOY_SINIFI[boy],
    ek,
  ].join(" ");
}

interface DugmeOzellikleri extends ButtonHTMLAttributes<HTMLButtonElement> {
  tur?: DugmeTuru;
  boy?: DugmeBoyu;
  simge?: ReactNode;
}

export function Dugme({ tur, boy, simge, className = "", children, type = "button", ...diger }: DugmeOzellikleri) {
  return (
    <button type={type} className={dugmeSinifi(tur, boy, className)} {...diger}>
      {simge}
      {children}
    </button>
  );
}

interface BaglantiDugmeOzellikleri extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  tur?: DugmeTuru;
  boy?: DugmeBoyu;
}

export function BaglantiDugme({ href, tur, boy, className = "", children, ...diger }: BaglantiDugmeOzellikleri) {
  return (
    <Link href={href} className={dugmeSinifi(tur, boy, className)} {...diger}>
      {children}
    </Link>
  );
}
