"use client";

// Sıralanabilir tablo. Başlıklar düğmedir (klavyeyle Enter/Boşluk), sıralama aria-sort ile duyurulur.

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { type SiralamaYonu, sirala } from "../veri/yardimci.ts";

// Sunucu bileşenlerinden de kullanılabilsin diye hücreler hazır çizilmiş gelir, işlev geçmez.
export interface TabloSutunu {
  anahtar: string;
  baslik: string;
  /** Sütun sıralanabilir; değer satırın `degerler` alanından okunur. */
  siralanabilir?: boolean;
  /** Satır başlığı (th scope=row) olarak çizilir. */
  satirBasligi?: boolean;
  sinif?: string;
}

export interface TabloSatiri {
  anahtar: string;
  hucreler: Record<string, ReactNode>;
  degerler?: Record<string, string | number>;
}

export function Tablo({
  baslik,
  sutunlar,
  satirlar,
  bosMetin = "Gösterilecek kayıt yok.",
}: {
  /** Tablonun görünür başlığı (caption). */
  baslik: string;
  sutunlar: TabloSutunu[];
  satirlar: readonly TabloSatiri[];
  bosMetin?: string;
}) {
  const [siralama, setSiralama] = useState<{ anahtar: string; yon: SiralamaYonu } | null>(null);

  const sirali = useMemo(() => {
    if (!siralama) return satirlar;
    return sirala(satirlar, (s) => s.degerler?.[siralama.anahtar] ?? "", siralama.yon);
  }, [satirlar, siralama]);

  const degistir = (anahtar: string) =>
    setSiralama((s) => (s?.anahtar === anahtar && s.yon === "artan" ? { anahtar, yon: "azalan" } : { anahtar, yon: "artan" }));

  return (
    <div className="overflow-x-auto rounded-lg border border-cizgi bg-yuzey">
      <table className="w-full border-collapse text-left">
        <caption className="px-4 pt-3 pb-2 text-left font-semibold">{baslik}</caption>
        <thead>
          <tr className="border-y border-cizgi bg-yuzey-2">
            {sutunlar.map((s) => {
              const aktif = siralama?.anahtar === s.anahtar;
              const ariaSort = aktif ? (siralama?.yon === "artan" ? "ascending" : "descending") : undefined;
              return (
                <th key={s.anahtar} scope="col" aria-sort={ariaSort} className={`px-4 py-2 text-sm font-semibold ${s.sinif ?? ""}`}>
                  {s.siralanabilir ? (
                    <button
                      type="button"
                      onClick={() => degistir(s.anahtar)}
                      className="inline-flex min-h-8 items-center gap-1 hover:underline"
                    >
                      {s.baslik}
                      {aktif ? (
                        siralama?.yon === "artan" ? (
                          <ArrowUp aria-hidden className="size-4" />
                        ) : (
                          <ArrowDown aria-hidden className="size-4" />
                        )
                      ) : (
                        <ArrowUpDown aria-hidden className="size-4 text-soluk" />
                      )}
                      <span className="sr-only">
                        {aktif ? (siralama?.yon === "artan" ? ", artan sıralı" : ", azalan sıralı") : ", sırala"}
                      </span>
                    </button>
                  ) : (
                    s.baslik
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sirali.length === 0 ? (
            <tr>
              <td colSpan={sutunlar.length} className="px-4 py-6 text-center text-soluk">
                {bosMetin}
              </td>
            </tr>
          ) : (
            sirali.map((satir) => (
              <tr key={satir.anahtar} className="border-b border-cizgi last:border-b-0">
                {sutunlar.map((s) =>
                  s.satirBasligi ? (
                    <th key={s.anahtar} scope="row" className={`px-4 py-2 text-left font-semibold ${s.sinif ?? ""}`}>
                      {satir.hucreler[s.anahtar]}
                    </th>
                  ) : (
                    <td key={s.anahtar} className={`px-4 py-2 align-top ${s.sinif ?? ""}`}>
                      {satir.hucreler[s.anahtar]}
                    </td>
                  ),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
