"use client";

// Üç araç, WAI-ARIA sekme düzeniyle: ok tuşları, Home ve End sekmeler arasında gezer. Her aracın kodu ve verisi
// (çerçeve metinleri büyüktür) yalnız sekmesi ilk açıldığında yüklenir. Seçili sekme adrese (#ck) yazılır.

import dynamic from "next/dynamic";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

const Yukleniyor = () => <p className="text-soluk">Araç yükleniyor.</p>;

const SEKMELER = [
  {
    id: "ck",
    ad: "ÇK/PÇ hesabı",
    Panel: dynamic(() => import("./ck-paneli.tsx"), { ssr: false, loading: Yukleniyor }),
  },
  {
    id: "bologna",
    ad: "Bologna denetimi",
    Panel: dynamic(() => import("./bologna-paneli.tsx"), { ssr: false, loading: Yukleniyor }),
  },
  {
    id: "olcut",
    ad: "Ölçüt arama",
    Panel: dynamic(() => import("./olcut-paneli.tsx"), { ssr: false, loading: Yukleniyor }),
  },
] as const;

type SekmeKimligi = (typeof SEKMELER)[number]["id"];

export function AracSekmeleri() {
  const [secili, setSecili] = useState<SekmeKimligi>("ck");
  // Açılmış sekmeler bağlı kalır: sekme değişince girilen veri kaybolmaz.
  const [acilan, setAcilan] = useState<Set<SekmeKimligi>>(new Set(["ck"]));
  const dugmeler = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const h = window.location.hash.slice(1);
    const s = SEKMELER.find((x) => x.id === h);
    if (s) {
      setSecili(s.id);
      setAcilan((a) => new Set([...a, s.id]));
    }
  }, []);

  function sec(id: SekmeKimligi, odak = false) {
    setSecili(id);
    setAcilan((a) => new Set([...a, id]));
    window.history.replaceState(null, "", `#${id}`);
    if (odak) dugmeler.current[id]?.focus();
  }

  function tus(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const son = SEKMELER.length - 1;
    const hedef =
      e.key === "ArrowRight"
        ? i === son
          ? 0
          : i + 1
        : e.key === "ArrowLeft"
          ? i === 0
            ? son
            : i - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? son
              : null;
    if (hedef === null) return;
    e.preventDefault();
    const s = SEKMELER[hedef];
    if (s) sec(s.id, true);
  }

  return (
    <div>
      <div role="tablist" aria-label="Araçlar" className="flex flex-wrap gap-2 border-b border-cizgi-guclu">
        {SEKMELER.map((s, i) => {
          const acik = s.id === secili;
          return (
            <button
              key={s.id}
              ref={(el) => {
                dugmeler.current[s.id] = el;
              }}
              type="button"
              role="tab"
              id={`sekme-${s.id}`}
              aria-selected={acik}
              aria-controls={`panel-${s.id}`}
              tabIndex={acik ? 0 : -1}
              onClick={() => sec(s.id)}
              onKeyDown={(e) => tus(e, i)}
              className={`-mb-px min-h-11 rounded-t-sm border px-4 text-lg ${
                acik
                  ? "border-cizgi-guclu border-b-yuzey bg-yuzey text-vurgu"
                  : "border-transparent text-metin hover:bg-yuzey-2"
              }`}
            >
              {s.ad}
            </button>
          );
        })}
      </div>
      {SEKMELER.map((s) => (
        <div
          key={s.id}
          role="tabpanel"
          id={`panel-${s.id}`}
          aria-labelledby={`sekme-${s.id}`}
          hidden={s.id !== secili}
          className="pt-6"
        >
          {acilan.has(s.id) ? <s.Panel /> : null}
        </div>
      ))}
    </div>
  );
}
