"use client";

import { type FormEvent, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { UzunMetinAlani } from "../../../bilesenler/form.tsx";

interface Yanit {
  yanit: string;
  gecerli: boolean;
  kaynaklar: { kanitId: string; ozet: string; baslik: string }[];
}

export function SoruFormu() {
  const [soru, setSoru] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Yanit | null>(null);
  const yanitRef = useRef<HTMLElement>(null);

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/degerlendirici/soru/yanit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ soru }),
      });
      const g = (await r.json()) as Yanit & { hata?: string };
      if (!r.ok) setHata(g.hata ?? "Soru yanıtlanamadı. Yeniden deneyin.");
      else {
        setSonuc(g);
        // Yanıt gelince odak yanıta taşınır; ekran okuyucu yanıtı baştan okur.
        requestAnimationFrame(() => yanitRef.current?.focus());
      }
    } catch {
      setHata("Bağlantı kurulamadı. Yeniden deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={gonder} aria-busy={yukleniyor} className="flex flex-col gap-3">
        <UzunMetinAlani
          id="soru"
          etiket="Sorunuz"
          ipucu="En az 3, en çok 1000 karakter."
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          minLength={3}
          maxLength={1000}
          required
          rows={3}
        />
        <Dugme type="submit" tur="birincil" disabled={yukleniyor} className="self-start">
          {yukleniyor ? "Yanıtlanıyor…" : "Sor"}
        </Dugme>
      </form>
      <div aria-live="polite" className="mt-4">
        {yukleniyor && <p className="text-soluk">Yanıt hazırlanıyor.</p>}
        {hata && (
          <p role="alert" className="font-semibold text-risk-yuksek">
            {hata}
          </p>
        )}
        {sonuc && (
          <section
            ref={yanitRef}
            tabIndex={-1}
            aria-labelledby="yanit-baslik"
            className="rounded border border-cizgi bg-yuzey p-3"
          >
            <h2 id="yanit-baslik" className="mb-1 font-semibold">
              Yanıt
            </h2>
            <p className="whitespace-pre-wrap">{sonuc.yanit}</p>
            {sonuc.kaynaklar.length > 0 && (
              <ul className="mt-2 text-sm">
                {sonuc.kaynaklar.map((k) => (
                  <li key={k.kanitId}>
                    <a
                      href={`/degerlendirici/kanit/${k.kanitId}`}
                      className="inline-block py-1 underline underline-offset-4"
                    >
                      {k.baslik}
                    </a>{" "}
                    <span className="text-soluk">({k.ozet.slice(0, 8)})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
