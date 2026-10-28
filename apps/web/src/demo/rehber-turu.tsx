"use client";

// Demo şeridi ve rehber turu (İP-41). Şerit her demo sayfasının üstünde durur. Tur 3-5 adımdır; adımlar
// bağlantıdır, klavyeyle gezilir, ekran okuyucu için bölge adı ve adım sayısı vardır. Kapatılan tur oturum
// boyunca kapalı kalır (sessionStorage; erişilemezse yalnız bu sayfada kapanır).

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { dugmeSinifi } from "../bilesenler/dugme.tsx";
import { DEMO_ROL_BILGISI, DEMO_SERIDI, type DemoRolu, demoRoluMu } from "./roller.ts";

const ANAHTAR = "akredit-demo-tur";

export function DemoSeridi({ rol }: { rol: DemoRolu }) {
  return (
    <p
      className="border-b border-cizgi bg-risk-orta-zemin px-4 py-2 text-center text-sm text-risk-orta"
      data-demo-seridi
    >
      <strong>{DEMO_SERIDI}</strong> Rol: {DEMO_ROL_BILGISI[rol].ad}.{" "}
      <Link href="/deneyin" className="underline underline-offset-4">
        Başka bir rol seçin
      </Link>
    </p>
  );
}

export function RehberTuru({ rol: sunucuRolu }: { rol: DemoRolu | null }) {
  const p = useSearchParams();
  const urlRolu = p?.get("rol");
  const rol: DemoRolu | null = sunucuRolu ?? (demoRoluMu(urlRolu) ? urlRolu : null);
  const [adim, setAdim] = useState(0);
  const [acik, setAcik] = useState(true);
  useEffect(() => {
    try {
      const k = sessionStorage.getItem(ANAHTAR);
      if (k === "kapali" && p?.get("tur") !== "1") setAcik(false);
      else if (k && /^\d+$/u.test(k)) setAdim(Number(k));
    } catch {
      // Depolama kapalıysa tur yine çalışır.
    }
  }, [p]);
  if (!rol) return null;
  const tur = DEMO_ROL_BILGISI[rol].tur;
  const a = tur[Math.min(adim, tur.length - 1)];
  const yaz = (deger: string) => {
    try {
      sessionStorage.setItem(ANAHTAR, deger);
    } catch {
      // yok sayılır
    }
  };
  const git = (n: number) => {
    setAdim(n);
    yaz(String(n));
  };
  return (
    <>
      <DemoSeridi rol={rol} />
      {acik && a ? (
        <section aria-label="Rehber turu" className="border-b border-cizgi bg-yuzey px-4 py-3" data-rehber-turu>
          <div className="mx-auto flex max-w-5xl flex-wrap items-start gap-x-6 gap-y-2">
            <p className="text-sm text-soluk tabular-nums">
              Adım {Math.min(adim, tur.length - 1) + 1} / {tur.length}
            </p>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">{a.baslik}</h2>
              <p className="mt-1 text-sm">{a.metin}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={a.yol}
                className="inline-flex min-h-11 items-center rounded px-3 font-semibold text-vurgu underline underline-offset-4"
              >
                Bu sayfaya git
              </Link>
              <button
                type="button"
                className={dugmeSinifi("ikincil", "kucuk", "min-h-11")}
                onClick={() => git(adim - 1)}
                disabled={adim === 0}
              >
                Geri
              </button>
              {adim < tur.length - 1 ? (
                <button
                  type="button"
                  className={dugmeSinifi("birincil", "kucuk", "min-h-11")}
                  onClick={() => git(adim + 1)}
                >
                  İleri
                </button>
              ) : null}
              <button
                type="button"
                className="min-h-11 rounded px-3 underline underline-offset-4"
                onClick={() => {
                  setAcik(false);
                  yaz("kapali");
                }}
              >
                Turu kapat
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
