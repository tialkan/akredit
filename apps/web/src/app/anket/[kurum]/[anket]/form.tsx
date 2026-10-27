"use client";

// Erişilebilir anket formu: her soru fieldset + legend; likert ve seçimler radyo/onay kutusu; zorunlu
// sorular hem görsel hem ekran okuyucu için belirtilir; sonuç iletisi canlı bölgede duyurulur.

import type { AnketTanimi } from "@akredit/anket/temel";
import { type ReactNode, useActionState } from "react";
import { type GonderimDurumu, yanitGonder } from "./eylem.ts";

const SECIM =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-cizgi px-3 py-2 hover:bg-yuzey-2";
const ALAN = "w-full rounded-md border border-cizgi-guclu bg-yuzey px-3 py-2 text-metin";

export function AnketFormu({
  tanim,
  kurum,
  anket,
  belirtec,
  aydinlatma,
}: {
  tanim: AnketTanimi;
  kurum: string;
  anket: string;
  belirtec: string | null;
  aydinlatma: ReactNode;
}) {
  const [durum, gonder, bekliyor] = useActionState<GonderimDurumu, FormData>(yanitGonder, { durum: "bos" });
  const coklu = tanim.sorular.filter((s) => s.tur === "coklu_secim").map((s) => s.kod);
  if (durum.durum === "tamam")
    return (
      <p role="status" className="rounded-lg border border-cizgi bg-yuzey p-5 text-lg font-semibold">
        {durum.ileti}
      </p>
    );
  return (
    <form action={gonder} className="space-y-6" noValidate={false}>
      <input type="hidden" name="kurum" value={kurum} />
      <input type="hidden" name="anket" value={anket} />
      <input type="hidden" name="coklu" value={coklu.join(",")} />
      {belirtec ? <input type="hidden" name="b" value={belirtec} /> : null}
      <p className="text-sm text-soluk">
        <span aria-hidden>*</span> ile işaretli sorular zorunludur.
      </p>
      {tanim.sorular.map((s, i) => {
        const ad = `s:${s.kod}`;
        const id = `soru-${s.kod}`;
        const etiket = (
          <>
            {i + 1}. {s.metin}
            {s.zorunlu ? (
              <>
                <span aria-hidden> *</span>
                <span className="sr-only"> (zorunlu)</span>
              </>
            ) : null}
          </>
        );
        if (s.tur === "acik" || s.tur === "sayi" || s.tur === "isyuku")
          return (
            <div key={s.kod}>
              <label htmlFor={id} className="mb-1 block font-semibold">
                {etiket}
              </label>
              {s.tur === "acik" ? (
                <textarea id={id} name={ad} className={`${ALAN} min-h-24`} maxLength={4000} required={s.zorunlu} />
              ) : (
                <input
                  id={id}
                  name={ad}
                  type="number"
                  inputMode="decimal"
                  min={s.enAz ?? 0}
                  max={s.enCok}
                  step="any"
                  className={`${ALAN} max-w-48`}
                  required={s.zorunlu}
                  aria-describedby={s.tur === "isyuku" ? `${id}-ipucu` : undefined}
                />
              )}
              {s.tur === "isyuku" ? (
                <p id={`${id}-ipucu`} className="mt-1 text-sm text-soluk">
                  Dönem boyunca toplam saat. Tahmini değer yeterlidir.
                </p>
              ) : null}
            </div>
          );
        const secenekler = s.secenekler ?? [];
        return (
          <fieldset key={s.kod} className="space-y-2">
            <legend className="mb-2 font-semibold">{etiket}</legend>
            {secenekler.map((sec, j) => (
              <label key={sec} className={SECIM}>
                <input
                  type={s.tur === "coklu_secim" ? "checkbox" : "radio"}
                  name={ad}
                  value={s.tur === "likert" ? String(j + 1) : sec}
                  required={s.zorunlu && s.tur !== "coklu_secim"}
                  className="size-5 accent-[var(--vurgu)]"
                />
                {sec}
              </label>
            ))}
          </fieldset>
        );
      })}
      <div className="rounded-lg border border-cizgi bg-yuzey-2 p-4 text-sm">{aydinlatma}</div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="aydinlatma" value="evet" required className="mt-1 size-5 accent-[var(--vurgu)]" />
        <span>Aydınlatma metnini okudum.</span>
      </label>
      <div aria-live="polite">
        {durum.durum === "hata" ? (
          <p role="alert" className="font-semibold text-risk-yuksek">
            {durum.ileti}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={bekliyor}
        className="inline-flex min-h-11 items-center rounded-md border border-vurgu bg-vurgu px-4 font-semibold text-vurgu-metin disabled:opacity-50"
      >
        {bekliyor ? "Gönderiliyor…" : "Yanıtları gönder"}
      </button>
    </form>
  );
}
