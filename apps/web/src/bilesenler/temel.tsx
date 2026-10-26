// Sunucuda çizilebilen temel bileşenler: risk rozeti, kart, boş durum, iskelet yükleme, kırıntı yolu.

import type { RiskDuzeyi } from "@akredit/cekirdek";
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RISK_ETIKETI } from "../veri/yardimci.ts";

const RISK_SINIFI: Record<RiskDuzeyi, string> = {
  dusuk: "bg-risk-dusuk-zemin text-risk-dusuk border-risk-dusuk",
  orta: "bg-risk-orta-zemin text-risk-orta border-risk-orta",
  yuksek: "bg-risk-yuksek-zemin text-risk-yuksek border-risk-yuksek",
};

/** Risk rengin yanında simge ve metinle de ayırt edilir (renk körlüğü). */
export function RiskSimgesi({ risk, className = "size-4" }: { risk: RiskDuzeyi; className?: string }) {
  if (risk === "yuksek") return <AlertOctagon aria-hidden className={className} />;
  if (risk === "orta") return <AlertTriangle aria-hidden className={className} />;
  return <CheckCircle2 aria-hidden className={className} />;
}

export function RiskRozeti({ risk, ek }: { risk: RiskDuzeyi; ek?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold ${RISK_SINIFI[risk]}`}
    >
      <RiskSimgesi risk={risk} />
      {RISK_ETIKETI[risk]}
      {ek ? <span className="font-normal">{ek}</span> : null}
    </span>
  );
}

export function Rozet({ children, vurgulu = false }: { children: ReactNode; vurgulu?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm ${
        vurgulu ? "border-vurgu bg-vurgu-zemin text-vurgu font-semibold" : "border-cizgi bg-yuzey-2 text-metin"
      }`}
    >
      {children}
    </span>
  );
}

export function EksikIsareti({ aciklama = "Kanıt bağlanamadı" }: { aciklama?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border-2 border-dashed border-risk-yuksek bg-risk-yuksek-zemin px-2 py-0.5 text-sm font-bold text-risk-yuksek">
      <AlertOctagon aria-hidden className="size-4" />
      EKSİK<span className="sr-only">: {aciklama}</span>
    </span>
  );
}

export function Kart({
  baslik,
  baslikDuzeyi = 2,
  eylem,
  children,
  className = "",
}: {
  baslik?: ReactNode;
  baslikDuzeyi?: 2 | 3;
  eylem?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const B = baslikDuzeyi === 2 ? "h2" : "h3";
  return (
    <section className={`rounded-lg border border-cizgi bg-yuzey p-5 ${className}`}>
      {baslik || eylem ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {baslik ? <B className="text-lg font-semibold">{baslik}</B> : <span />}
          {eylem}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function BosDurum({ baslik, aciklama, eylem }: { baslik: string; aciklama?: string; eylem?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-cizgi-guclu px-6 py-10 text-center">
      <Inbox aria-hidden className="mb-3 size-8 text-soluk" />
      <p className="text-lg font-semibold">{baslik}</p>
      {aciklama ? <p className="mt-1 max-w-prose text-soluk">{aciklama}</p> : null}
      {eylem ? <div className="mt-4">{eylem}</div> : null}
    </div>
  );
}

/** Yükleme sırasında yer tutucu. Ekran okuyucuya bir kez "Yükleniyor" söylenir. */
export function Iskelet({ satir = 3 }: { satir?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">Yükleniyor</span>
      {Array.from({ length: satir }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: sabit yer tutucular
          key={i}
          aria-hidden
          className="h-5 animate-pulse rounded bg-yuzey-2"
          style={{ width: `${90 - ((i * 17) % 40)}%` }}
        />
      ))}
    </div>
  );
}

export interface KirintiOgesi {
  ad: string;
  href?: string;
}

export function KirintiYolu({ ogeler }: { ogeler: KirintiOgesi[] }) {
  return (
    <nav aria-label="Kırıntı yolu" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-soluk">
        {ogeler.map((o, i) => {
          const son = i === ogeler.length - 1;
          return (
            <li key={o.href ?? o.ad} className="flex items-center gap-1">
              {o.href && !son ? (
                <Link href={o.href} className="underline underline-offset-2 hover:text-metin">
                  {o.ad}
                </Link>
              ) : (
                <span aria-current={son ? "page" : undefined} className={son ? "text-metin font-semibold" : ""}>
                  {o.ad}
                </span>
              )}
              {son ? null : <ChevronRight aria-hidden className="size-4" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SayfaBasligi({ baslik, aciklama, eylem }: { baslik: string; aciklama?: ReactNode; eylem?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{baslik}</h1>
        {aciklama ? <p className="mt-1 max-w-prose text-soluk">{aciklama}</p> : null}
      </div>
      {eylem}
    </div>
  );
}

/** Örnek veriyle çalışıldığını açıkça söyleyen şerit. */
export function OrnekVeriSeridi() {
  return (
    <p className="border-b border-cizgi bg-risk-orta-zemin px-4 py-2 text-center text-sm text-risk-orta">
      Bu panel şu an kurgu örnek veriyle çalışır. Gördüğünüz kurum, program, kişi ve sayılar gerçek değildir.
    </p>
  );
}
