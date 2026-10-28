"use client";

// Yönetici özeti (İP-39): nihai rapor ya da dış gönderim onayından önce bir sayfalık özet. Sayılar hesaptan.
// Onaylayan özeti görmeden ("okudum" işareti, özetin imzasıyla) onay düğmesi çalışmaz; kural çekirdekte de
// denetlenir (`nihaiOnayKapisi`).

import { nihaiOnayKapisi, type YoneticiOzeti as Ozet } from "@akredit/cekirdek";
import { useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { IsaretKutusu } from "../../../bilesenler/form.tsx";

const sayi = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
const isaretli = (x: number) => `${x > 0 ? "+" : ""}${sayi(x)}`;

export function YoneticiOzeti({
  ozet,
  baslik = "Yönetici özeti",
  onayla,
}: {
  ozet: Ozet;
  baslik?: string;
  /** Kapı açıksa çağrılır; görülen özetin imzasını alır. */
  onayla: (gorulenImza: string) => void;
}) {
  const [gorulme, setGorulme] = useState<{ imza: string; zaman: string } | null>(null);
  const kapi = nihaiOnayKapisi(ozet, gorulme);
  return (
    <section aria-labelledby="yonetici-ozeti-baslik" className="rounded border border-cizgi bg-yuzey p-4">
      <h2 id="yonetici-ozeti-baslik" className="text-lg font-bold">
        {baslik}
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold">Yükselen göstergeler</h3>
          {ozet.yukselen.length ? (
            <ul className="mt-1 space-y-1">
              {ozet.yukselen.map((g) => (
                <li key={g.kod}>
                  {g.ad}: {sayi(g.onceki ?? 0)} → {sayi(g.simdiki ?? 0)} ({isaretli(g.fark)}){" "}
                  <span className="text-sm text-soluk">Kaynak: {g.kaynak}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-soluk">Yok.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Düşen göstergeler</h3>
          {ozet.dusen.length ? (
            <ul className="mt-1 space-y-1">
              {ozet.dusen.map((g) => (
                <li key={g.kod}>
                  {g.ad}: {sayi(g.onceki ?? 0)} → {sayi(g.simdiki ?? 0)} ({isaretli(g.fark)}){" "}
                  <span className="text-sm text-soluk">Kaynak: {g.kaynak}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-soluk">Yok.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Raporun beyan ettiği gelişmeye açık yönler</h3>
          {ozet.gelismeyeAcikYonler.length ? (
            <ul className="mt-1 list-disc pl-5">
              {ozet.gelismeyeAcikYonler.map((y) => (
                <li key={y}>{y}</li>
              ))}
            </ul>
          ) : (
            <p className="text-soluk">Rapor gelişmeye açık yön beyan etmiyor.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold">İyileştirme döngüleri</h3>
          <dl className="mt-1 grid grid-cols-2 gap-x-4">
            <dt>Karar bekleyen</dt>
            <dd>{ozet.puko.acik}</dd>
            <dt>Önlem uygulanıyor</dt>
            <dd>{ozet.puko.onlemSecildi}</dd>
            <dt>Kapandı, iyileşti</dt>
            <dd>{ozet.puko.iyilesti}</dd>
            <dt>Kapandı, iyileşmedi</dt>
            <dd>{ozet.puko.iyilesmedi}</dd>
          </dl>
        </div>
      </div>
      <p className="mt-3 text-sm text-soluk">
        Değişmeyen gösterge: {ozet.degismeyen}. Önceki değeri olmayan gösterge: {ozet.karsilastirilamayan}.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <IsaretKutusu
          etiket="Özeti okudum"
          checked={gorulme?.imza === ozet.imza}
          onChange={(e) =>
            setGorulme(e.currentTarget.checked ? { imza: ozet.imza, zaman: new Date().toISOString() } : null)
          }
        />
        <Dugme
          tur="birincil"
          disabled={!kapi.gecerli}
          aria-describedby="yonetici-ozeti-kapi"
          onClick={() => kapi.gecerli && gorulme && onayla(gorulme.imza)}
        >
          Raporu onayla
        </Dugme>
        <span id="yonetici-ozeti-kapi" className="text-sm text-soluk" aria-live="polite">
          {kapi.gecerli ? "Özeti gördünüz; onay verebilirsiniz." : kapi.neden}
        </span>
      </div>
    </section>
  );
}
