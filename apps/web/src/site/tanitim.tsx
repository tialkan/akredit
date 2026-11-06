"use client";
// Sağ altta küçük, kapatılabilir tanıtım: kurucunun kendi projesi Mükerrer Frekans (kurucu isteği, İP-49).
// Çerez, yerel depolama ya da izleme yok; kapatma yalnız bu sayfa görüntülemesi içindir.
// 7 saniye sonra kendiliğinden kapanır. Fare üstündeyken ya da klavye odağındayken süre durur (WCAG 2.2.1).

import { useEffect, useRef, useState } from "react";

const SURE_MS = 7000;
const ADRES = "https://mukerrerfrekans.com";

export function Tanitim() {
  const [acik, setAcik] = useState(true);
  const [durdu, setDurdu] = useState(false);
  const kalan = useRef(SURE_MS);

  useEffect(() => {
    if (!acik || durdu) return;
    const baslangic = Date.now();
    const zamanlayici = setTimeout(() => setAcik(false), kalan.current);
    return () => {
      clearTimeout(zamanlayici);
      kalan.current = Math.max(0, kalan.current - (Date.now() - baslangic));
    };
  }, [acik, durdu]);

  if (!acik) return null;

  return (
    <aside
      aria-label="Tanıtım"
      onMouseEnter={() => setDurdu(true)}
      onMouseLeave={() => setDurdu(false)}
      onFocus={() => setDurdu(true)}
      onBlur={() => setDurdu(false)}
      className="tanitim fixed right-3 bottom-3 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-sm border border-cizgi-guclu bg-yuzey shadow-lg"
    >
      <a href={ADRES} className="flex items-center gap-3 p-3 pr-12 text-metin no-underline hover:bg-yuzey-2">
        {/* biome-ignore lint/performance/noImgElement: 56 piksellik sabit logo; görüntü iyileştirme gerekmez */}
        <img src="/gorsel/tanitim/mukerrer-frekans.png" alt="" width={56} height={56} className="shrink-0 rounded-sm" />
        <span className="grid gap-0.5 text-base leading-snug">
          <span className="font-baslik text-lg text-vurgu">Mükerrer Frekans</span>
          <span>Her sabah Resmî Gazete, enerjik bir radyo bülteniyle cebinizde.</span>
        </span>
      </a>
      <button
        type="button"
        onClick={() => setAcik(false)}
        aria-label="Tanıtımı kapat"
        className="absolute top-1 right-1 inline-flex size-11 items-center justify-center rounded-sm text-2xl leading-none text-soluk hover:bg-yuzey-2 hover:text-vurgu"
      >
        ×
      </button>
      <span
        aria-hidden
        className="tanitim-sure absolute bottom-0 left-0 h-1 w-full origin-left bg-vurgu"
        style={{ animationPlayState: durdu ? "paused" : "running", animationDuration: `${SURE_MS}ms` }}
      />
    </aside>
  );
}
