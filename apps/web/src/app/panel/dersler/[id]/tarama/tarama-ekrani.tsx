"use client";

// Sınav taraması ekranının akışı (İP-43): sınavı seç → kutuları işaretle (şablon) → kâğıtları yükle → okunan
// puanları onayla ve aktar. Gerçek veri kipinde veriler sunucudan gelir; örnek kipte kurgu veriyle çalışır.

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Kart } from "../../../../../bilesenler/temel.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";
import { taramaGetirEylem } from "./eylem.ts";
import { SablonDuzenleyici } from "./sablon-duzenleyici.tsx";
import { TaramaPaneli } from "./tarama-paneli.tsx";
import type { PanelVerisi, Tarama, YuklemeDurumu } from "./veri.ts";
import { YuklemeFormu } from "./yukleme-formu.tsx";

export function TaramaEkrani({
  dersId,
  panel,
  yukleme,
  ornekTarama,
}: {
  dersId: string;
  panel: PanelVerisi;
  yukleme: YuklemeDurumu;
  /** Örnek kipte gösterilen kurgu tarama. */
  ornekTarama: Tarama | null;
}) {
  const kimlik = useId();
  const router = useRouter();
  const [aracId, setAracId] = useState(panel.araclar[0]?.id ?? "");
  const arac = panel.araclar.find((a) => a.id === aracId);
  const taramalar = panel.taramalar.filter((t) => t.olcmeAraciId === aracId);
  const [taramaId, setTaramaId] = useState(taramalar[0]?.taramaId ?? "");
  const [tarama, setTarama] = useState<Tarama | null>(ornekTarama);
  const [ileti, setIleti] = useState("");

  useEffect(() => {
    if (!GERCEK_VERI || !taramaId) return;
    let iptal = false;
    setTarama(null);
    setIleti("Tarama yükleniyor.");
    void taramaGetirEylem(taramaId).then((r) => {
      if (iptal) return;
      if (r.tamam) {
        setTarama(r.veri);
        setIleti("");
      } else setIleti(r.ileti);
    });
    return () => {
      iptal = true;
    };
  }, [taramaId]);

  if (!arac)
    return (
      <Kart>
        <p>Bu derste kayıtlı bir sınav (ölçme aracı) yok. Önce ders dosyası ekranından sınavı ve sorularını girin.</p>
      </Kart>
    );

  return (
    <div className="space-y-6">
      {panel.araclar.length > 1 && (
        <div className="flex flex-col">
          <label htmlFor={`${kimlik}-arac`} className="font-semibold">
            Sınav
          </label>
          <select
            id={`${kimlik}-arac`}
            className="min-h-11 w-80 max-w-full rounded border border-cizgi-guclu bg-yuzey px-2"
            value={aracId}
            onChange={(e) => {
              setAracId(e.target.value);
              setTaramaId(panel.taramalar.find((t) => t.olcmeAraciId === e.target.value)?.taramaId ?? "");
            }}
          >
            {panel.araclar.map((a) => (
              <option key={a.id} value={a.id}>
                {a.ad} · {a.donem}
              </option>
            ))}
          </select>
        </div>
      )}

      <Kart baslik={`1. Kutuları işaretleyin: ${arac.ad}`}>
        {arac.sorular.length === 0 ? (
          <p>Bu sınavın soruları ve azami puanları kayıtlı değil. Önce soruları girin.</p>
        ) : (
          <SablonDuzenleyici key={arac.id} dersId={dersId} arac={arac} />
        )}
      </Kart>

      <Kart baslik="2. Taranmış kâğıtları yükleyin">
        <YuklemeFormu
          dersId={dersId}
          olcmeAraciId={arac.id}
          sablonVar={arac.sablon !== null}
          durum={yukleme}
          istekler={panel.istekler.filter((i) => i.olcmeAraciId === arac.id)}
          onYuklendi={() => router.refresh()}
        />
      </Kart>

      <Kart baslik="3. Okunan puanları onaylayın">
        {taramalar.length === 0 ? (
          <p>Bu sınav için okunmuş tarama yok. Kâğıtları yükledikten sonra burada görünür.</p>
        ) : (
          <div className="space-y-4">
            {taramalar.length > 1 && (
              <div className="flex flex-col">
                <label htmlFor={`${kimlik}-tarama`} className="font-semibold">
                  Tarama
                </label>
                <select
                  id={`${kimlik}-tarama`}
                  className="min-h-11 w-80 max-w-full rounded border border-cizgi-guclu bg-yuzey px-2"
                  value={taramaId}
                  onChange={(e) => setTaramaId(e.target.value)}
                >
                  {taramalar.map((t) => (
                    <option key={t.taramaId} value={t.taramaId}>
                      {new Date(t.zaman).toLocaleString("tr-TR")} · {t.kagitSayisi} kâğıt
                      {t.aktarildi ? " · aktarıldı" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {ileti && (
              <p role="status" aria-live="polite">
                {ileti}
              </p>
            )}
            {tarama && <TaramaPaneli key={tarama.taramaId} dersId={dersId} ilk={tarama} />}
          </div>
        )}
      </Kart>
    </div>
  );
}
