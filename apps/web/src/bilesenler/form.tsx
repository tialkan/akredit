// Etiketli form öğeleri: metin alanı, çok satırlı metin, seçim ve işaret (onay) kutusu.
// Her öğe görünür etiket, isteğe bağlı ipucu ve hata iletisiyle aria-describedby üzerinden bağlanır.

import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";

const ALAN_SINIFI =
  "w-full rounded-md border border-cizgi-guclu bg-yuzey px-3 py-2 text-metin placeholder:text-soluk aria-[invalid=true]:border-risk-yuksek";

interface AlanCercevesi {
  etiket: ReactNode;
  ipucu?: ReactNode;
  hata?: string | null;
}

function aciklamaIdleri(id: string, ipucu: unknown, hata: unknown): string | undefined {
  return [ipucu ? `${id}-ipucu` : "", hata ? `${id}-hata` : ""].filter(Boolean).join(" ") || undefined;
}

function Altlik({ id, ipucu, hata }: { id: string; ipucu?: ReactNode; hata?: string | null }) {
  return (
    <>
      {ipucu ? (
        <p id={`${id}-ipucu`} className="mt-1 text-sm text-soluk">
          {ipucu}
        </p>
      ) : null}
      {hata ? (
        <p id={`${id}-hata`} className="mt-1 text-sm font-semibold text-risk-yuksek">
          {hata}
        </p>
      ) : null}
    </>
  );
}

export function MetinAlani({ etiket, ipucu, hata, id: verilen, className = "", ...diger }: AlanCercevesi & InputHTMLAttributes<HTMLInputElement>) {
  const uretilen = useId();
  const id = verilen ?? uretilen;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-semibold">
        {etiket}
      </label>
      <input
        id={id}
        className={ALAN_SINIFI}
        aria-invalid={hata ? true : undefined}
        aria-describedby={aciklamaIdleri(id, ipucu, hata)}
        {...diger}
      />
      <Altlik id={id} ipucu={ipucu} hata={hata} />
    </div>
  );
}

export function UzunMetinAlani({
  etiket,
  ipucu,
  hata,
  id: verilen,
  className = "",
  ...diger
}: AlanCercevesi & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const uretilen = useId();
  const id = verilen ?? uretilen;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-semibold">
        {etiket}
      </label>
      <textarea
        id={id}
        className={`${ALAN_SINIFI} min-h-24`}
        aria-invalid={hata ? true : undefined}
        aria-describedby={aciklamaIdleri(id, ipucu, hata)}
        {...diger}
      />
      <Altlik id={id} ipucu={ipucu} hata={hata} />
    </div>
  );
}

export function Secim({
  etiket,
  ipucu,
  hata,
  id: verilen,
  className = "",
  children,
  ...diger
}: AlanCercevesi & SelectHTMLAttributes<HTMLSelectElement>) {
  const uretilen = useId();
  const id = verilen ?? uretilen;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block font-semibold">
        {etiket}
      </label>
      <select
        id={id}
        className={`${ALAN_SINIFI} min-h-11`}
        aria-invalid={hata ? true : undefined}
        aria-describedby={aciklamaIdleri(id, ipucu, hata)}
        {...diger}
      >
        {children}
      </select>
      <Altlik id={id} ipucu={ipucu} hata={hata} />
    </div>
  );
}

export function IsaretKutusu({
  etiket,
  ipucu,
  id: verilen,
  className = "",
  ...diger
}: Omit<AlanCercevesi, "hata"> & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const uretilen = useId();
  const id = verilen ?? uretilen;
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <input
        id={id}
        type="checkbox"
        className="mt-1 size-5 shrink-0 accent-[var(--vurgu)]"
        aria-describedby={ipucu ? `${id}-ipucu` : undefined}
        {...diger}
      />
      <div>
        <label htmlFor={id} className="font-semibold">
          {etiket}
        </label>
        {ipucu ? (
          <p id={`${id}-ipucu`} className="text-sm text-soluk">
            {ipucu}
          </p>
        ) : null}
      </div>
    </div>
  );
}
