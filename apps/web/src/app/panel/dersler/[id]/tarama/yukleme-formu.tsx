"use client";

// Taranmış kâğıtların yükleme formu (İP-43). Kurum içi model yoksa form kapalıdır ve nedeni yazılır; kâğıtlar
// kurum dışına gönderilmez. Dosya `yukle` ucuna gider; okuma arka planda yapılır, sonuç istek listesinde görünür.

import { useId, useRef, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";
import { ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";
import type { PanelIstegi, YuklemeDurumu } from "./veri.ts";

const DURUM_METNI: Record<PanelIstegi["durum"], string> = {
  bekliyor: "Sırada: kâğıtlar okunuyor",
  tamam: "Okundu",
  hata: "Okunamadı",
};

export function YuklemeFormu({
  dersId,
  olcmeAraciId,
  sablonVar,
  durum,
  istekler,
  onYuklendi,
}: {
  dersId: string;
  olcmeAraciId: string;
  sablonVar: boolean;
  durum: YuklemeDurumu;
  istekler: PanelIstegi[];
  onYuklendi: () => void;
}) {
  const kimlik = useId();
  const dosya = useRef<HTMLInputElement>(null);
  const [ileti, setIleti] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const kapali = !durum.acik || !sablonVar;

  async function gonder() {
    setHata("");
    const f = dosya.current?.files?.[0];
    if (!f) return setHata("Taranmış kâğıtların dosyasını seçin.");
    if (!GERCEK_VERI) return setIleti(ORNEK_KIP_ILETISI);
    const form = new FormData();
    form.set("olcmeAraciId", olcmeAraciId);
    form.set("dosya", f);
    setGonderiliyor(true);
    try {
      const r = await fetch(`/panel/dersler/${encodeURIComponent(dersId)}/tarama/yukle`, {
        method: "POST",
        body: form,
        redirect: "manual",
      });
      if (r.type === "opaqueredirect" || r.status === 401)
        return setHata("Oturumunuz kapanmış. Yeniden giriş yapıp dosyayı tekrar yükleyin.");
      const j = (await r.json().catch(() => ({}))) as { hata?: string };
      if (!r.ok) return setHata(j.hata ?? "Dosya yüklenemedi. Yeniden deneyin.");
      if (dosya.current) dosya.current.value = "";
      setIleti("Dosya alındı. Kâğıtlar kurum içinde okunuyor; bitince aşağıdaki listede görünür.");
      onYuklendi();
    } catch {
      setHata("Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin.");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="space-y-3">
      {!durum.acik ? (
        <p id={`${kimlik}-kapali`} className="rounded border border-risk-orta bg-risk-orta-zemin p-3">
          Yükleme kapalı. {durum.ileti}
        </p>
      ) : !sablonVar ? (
        <p id={`${kimlik}-kapali`} className="rounded border border-cizgi-guclu bg-yuzey-2 p-3">
          Yükleme için önce yukarıda numara ve soru kutularını işaretleyip şablonu kaydedin.
        </p>
      ) : (
        <p className="text-sm text-soluk">
          Tek PDF (çok sayfalı), PNG, JPEG ya da TIFF görüntü veya PDF'lerden oluşan ZIP; en çok 100 MB. Kâğıtlar yalnız
          kurum içindeki modelle okunur.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label htmlFor={`${kimlik}-d`} className="text-sm font-semibold">
            Taranmış kâğıtlar
          </label>
          <input
            id={`${kimlik}-d`}
            ref={dosya}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/tiff,application/zip,.pdf,.zip,.tif,.tiff"
            disabled={kapali}
            aria-describedby={kapali ? `${kimlik}-kapali` : undefined}
            aria-invalid={hata ? true : undefined}
            className="text-sm"
          />
        </div>
        <Dugme tur="birincil" disabled={kapali || gonderiliyor} onClick={gonder}>
          {gonderiliyor ? "Yükleniyor" : "Kâğıtları yükle"}
        </Dugme>
      </div>
      {hata && <p className="text-risk-yuksek">{hata}</p>}
      <p role="status" aria-live="polite" className="min-h-6">
        {ileti}
      </p>
      {istekler.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="text-left font-semibold">Yüklemeler</caption>
            <thead>
              <tr className="border-b border-cizgi text-left">
                <th scope="col" className="py-1 pr-3">
                  Dosya
                </th>
                <th scope="col" className="py-1 pr-3">
                  Zaman
                </th>
                <th scope="col" className="py-1">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {istekler.map((i) => (
                <tr key={i.id}>
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {i.dosyaAdi}
                  </th>
                  <td className="py-1 pr-3">{new Date(i.zaman).toLocaleString("tr-TR")}</td>
                  <td className="py-1">
                    {DURUM_METNI[i.durum]}
                    {i.ileti && <span className="block text-risk-yuksek">{i.ileti}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
