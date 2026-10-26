"use client";

// İstemci bileşenleri: sekmeler, iletişim kutusu, bildirim (toast).

import { X } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Dugme } from "./dugme.tsx";

// ---------- Sekmeler (WAI-ARIA tabs, ok tuşlarıyla gezinme) ----------

export interface Sekme {
  anahtar: string;
  ad: string;
  icerik: ReactNode;
}

export function Sekmeler({ etiket, sekmeler }: { etiket: string; sekmeler: Sekme[] }) {
  const kok = useId();
  const [secili, setSecili] = useState(0);
  const dugmeler = useRef<(HTMLButtonElement | null)[]>([]);

  const git = (i: number) => {
    const n = sekmeler.length;
    const yeni = (i + n) % n;
    setSecili(yeni);
    dugmeler.current[yeni]?.focus();
  };

  const tus = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") git(secili + 1);
    else if (e.key === "ArrowLeft") git(secili - 1);
    else if (e.key === "Home") git(0);
    else if (e.key === "End") git(sekmeler.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div>
      <div role="tablist" aria-label={etiket} className="flex flex-wrap gap-1 border-b border-cizgi" onKeyDown={tus}>
        {sekmeler.map((s, i) => (
          <button
            key={s.anahtar}
            ref={(el) => {
              dugmeler.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${kok}-sekme-${s.anahtar}`}
            aria-selected={i === secili}
            aria-controls={`${kok}-panel-${s.anahtar}`}
            tabIndex={i === secili ? 0 : -1}
            onClick={() => setSecili(i)}
            className={`-mb-px min-h-11 border-b-2 px-4 font-semibold ${
              i === secili ? "border-vurgu text-vurgu" : "border-transparent text-soluk hover:text-metin"
            }`}
          >
            {s.ad}
          </button>
        ))}
      </div>
      {sekmeler.map((s, i) => (
        <div
          key={s.anahtar}
          role="tabpanel"
          id={`${kok}-panel-${s.anahtar}`}
          aria-labelledby={`${kok}-sekme-${s.anahtar}`}
          hidden={i !== secili}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: WAI-ARIA sekme paneli odaklanabilir olmalı
          tabIndex={0}
          className="pt-4"
        >
          {s.icerik}
        </div>
      ))}
    </div>
  );
}

// ---------- İletişim kutusu (yerel <dialog>: odak tuzağı ve Esc tarayıcıdan) ----------

export function IletisimKutusu({
  acik,
  kapat,
  baslik,
  aciklama,
  children,
  altlik,
}: {
  acik: boolean;
  kapat: () => void;
  baslik: string;
  aciklama?: string;
  children?: ReactNode;
  altlik?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const kok = useId();
  const onceki = useRef<Element | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (acik && !d.open) {
      onceki.current = document.activeElement;
      d.showModal();
    } else if (!acik && d.open) {
      d.close();
    }
  }, [acik]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${kok}-baslik`}
      aria-describedby={aciklama ? `${kok}-aciklama` : undefined}
      onClose={() => {
        kapat();
        if (onceki.current instanceof HTMLElement) onceki.current.focus();
      }}
      onCancel={(e) => {
        e.preventDefault();
        kapat();
      }}
      className="m-auto w-[min(36rem,calc(100vw-2rem))] rounded-lg border border-cizgi bg-yuzey p-0 text-metin shadow-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-cizgi px-5 py-4">
        <div>
          <h2 id={`${kok}-baslik`} className="text-lg font-semibold">
            {baslik}
          </h2>
          {aciklama ? (
            <p id={`${kok}-aciklama`} className="mt-1 text-sm text-soluk">
              {aciklama}
            </p>
          ) : null}
        </div>
        <Dugme tur="sessiz" boy="kucuk" onClick={kapat} aria-label="Kapat" simge={<X aria-hidden className="size-5" />} />
      </div>
      <div className="max-h-[65vh] overflow-y-auto px-5 py-4">{children}</div>
      {altlik ? <div className="flex flex-wrap justify-end gap-2 border-t border-cizgi px-5 py-3">{altlik}</div> : null}
    </dialog>
  );
}

// ---------- Bildirim (toast). aria-live bölgesi sayfada hep vardır. ----------

interface BildirimKaydi {
  id: number;
  metin: string;
  tur: "basari" | "hata" | "bilgi";
}

type BildirimGonder = (metin: string, tur?: BildirimKaydi["tur"]) => void;

const BildirimBaglami = createContext<BildirimGonder>(() => {});

export function useBildirim(): BildirimGonder {
  return useContext(BildirimBaglami);
}

export function BildirimSaglayici({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<BildirimKaydi[]>([]);
  const sayac = useRef(0);

  const kaldir = useCallback((id: number) => setListe((l) => l.filter((b) => b.id !== id)), []);
  const gonder = useCallback<BildirimGonder>(
    (metin, tur = "bilgi") => {
      sayac.current += 1;
      const id = sayac.current;
      setListe((l) => [...l.slice(-2), { id, metin, tur }]);
      // Okumaya yetecek süre; kullanıcı kapatabilir (WCAG 2.2.1).
      window.setTimeout(() => kaldir(id), 8000);
    },
    [kaldir],
  );

  return (
    <BildirimBaglami.Provider value={gonder}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        <div role="status" aria-live="polite" className="contents">
          {liste
            .filter((b) => b.tur !== "hata")
            .map((b) => (
              <BildirimKutusu key={b.id} kayit={b} kaldir={kaldir} />
            ))}
        </div>
        <div role="alert" className="contents">
          {liste
            .filter((b) => b.tur === "hata")
            .map((b) => (
              <BildirimKutusu key={b.id} kayit={b} kaldir={kaldir} />
            ))}
        </div>
      </div>
    </BildirimBaglami.Provider>
  );
}

function BildirimKutusu({ kayit, kaldir }: { kayit: BildirimKaydi; kaldir: (id: number) => void }) {
  const renk =
    kayit.tur === "hata"
      ? "border-risk-yuksek bg-risk-yuksek-zemin text-risk-yuksek"
      : kayit.tur === "basari"
        ? "border-risk-dusuk bg-risk-dusuk-zemin text-risk-dusuk"
        : "border-cizgi-guclu bg-yuzey text-metin";
  return (
    <div className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border px-4 py-3 shadow-lg ${renk}`}>
      <p className="flex-1 font-semibold">{kayit.metin}</p>
      <button type="button" onClick={() => kaldir(kayit.id)} aria-label="Bildirimi kapat" className="rounded p-1">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
