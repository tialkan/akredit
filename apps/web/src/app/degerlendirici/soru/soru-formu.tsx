"use client";

import { type FormEvent, useState } from "react";

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

  async function gonder(e: FormEvent) {
    e.preventDefault();
    setYukleniyor(true);
    setHata(null);
    try {
      const r = await fetch("/degerlendirici/soru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ soru }),
      });
      const g = (await r.json()) as Yanit & { hata?: string };
      if (!r.ok) setHata(g.hata ?? "Soru yanıtlanamadı. Yeniden deneyin.");
      else setSonuc(g);
    } catch {
      setHata("Bağlantı kurulamadı. Yeniden deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={gonder} className="flex flex-col gap-2">
        <label htmlFor="soru" className="font-semibold">
          Sorunuz
        </label>
        <textarea
          id="soru"
          value={soru}
          onChange={(e) => setSoru(e.target.value)}
          minLength={3}
          maxLength={1000}
          required
          rows={3}
          className="rounded border border-cizgi p-2"
        />
        <button type="submit" disabled={yukleniyor} className="self-start rounded border border-cizgi px-3 py-1">
          {yukleniyor ? "Yanıtlanıyor…" : "Sor"}
        </button>
      </form>
      <div aria-live="polite" className="mt-4">
        {hata && <p role="alert">{hata}</p>}
        {sonuc && (
          <section aria-label="Yanıt" className="rounded border border-cizgi bg-yuzey p-3">
            <p className="whitespace-pre-wrap">{sonuc.yanit}</p>
            {sonuc.kaynaklar.length > 0 && (
              <ul className="mt-2 text-sm">
                {sonuc.kaynaklar.map((k) => (
                  <li key={k.kanitId}>
                    <a href={`/degerlendirici/kanit/${k.kanitId}`} className="underline underline-offset-4">
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
