import type React from "react";

export function Logo() {
  return (
    <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-7 text-vurgu"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="m7.5 12.5 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Akredit
    </span>
  );
}

export function MetinSayfasi({ baslik, ozet, children }: { baslik: string; ozet?: string; children: React.ReactNode }) {
  return (
    <article className="metin-sayfa mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{baslik}</h1>
      {ozet ? <p className="mt-3 text-lg text-soluk">{ozet}</p> : null}
      {children}
    </article>
  );
}
