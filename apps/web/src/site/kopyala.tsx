"use client";

// Kopyala düğmeli tek satırlık metin (MCP adresi, Claude Code komutu). Klavyeyle kullanılır: düğme gerçek bir
// <button>'dır. Sonuç ekran okuyucuya canlı bölgeyle söylenir. Pano kapalıysa metni seçer ve ne yapılacağını söyler.

import { useId, useRef, useState } from "react";

export function KopyalaKutusu({ metin, etiket, uzun = false }: { metin: string; etiket: string; uzun?: boolean }) {
  const kimlik = useId();
  const kod = useRef<HTMLElement>(null);
  const [durum, setDurum] = useState("");

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setDurum("Kopyalandı.");
    } catch {
      const secim = window.getSelection();
      if (kod.current && secim) {
        const aralik = document.createRange();
        aralik.selectNodeContents(kod.current);
        secim.removeAllRanges();
        secim.addRange(aralik);
      }
      setDurum("Kopyalanamadı. Metin seçildi, Ctrl+C ile kopyalayın.");
    }
  }

  return (
    <div className="mt-3">
      <p id={kimlik} className="text-base text-soluk">
        {etiket}
      </p>
      <div className="mt-1 flex flex-wrap items-stretch gap-2">
        <code
          ref={kod}
          className={
            uzun
              ? "min-w-0 basis-full rounded-sm border border-cizgi-guclu bg-yuzey px-4 py-3 font-sans text-[1.05rem] leading-relaxed whitespace-pre-line"
              : "min-w-0 flex-1 rounded-sm border border-cizgi-guclu bg-yuzey px-3 py-2 font-mono text-[1.05rem] break-all"
          }
        >
          {metin}
        </code>
        <button
          type="button"
          onClick={kopyala}
          aria-describedby={kimlik}
          className="inline-flex min-h-12 min-w-28 items-center justify-center rounded-sm border border-vurgu bg-vurgu px-4 text-vurgu-metin hover:opacity-90"
        >
          Kopyala
        </button>
      </div>
      <p aria-live="polite" className="mt-1 min-h-6 text-base text-petrol">
        {durum}
      </p>
    </div>
  );
}
