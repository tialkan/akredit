"use client";

// Program öz değerlendirme raporu paneli (İP-19): program ve çerçeve seç → taslağı kur → kapsamayı ve eksikleri
// gör → eksikler için görev aç → raporu (Word) ve ziyaret paketini (Excel) indir. Onay, onay kutusundan verilir.

import { useCallback, useEffect, useId, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../veri/istemci.ts";

interface OdrDurumu {
  raporId: string;
  cerceveKod: string;
  surum: number;
  onay: { onaylayan: string; zaman: string } | null;
  bolumler: { kod: string; baslik: string; olcutSayisi: number; kapsanan: number }[];
  eksikler: { olcutKod: string; baslik: string; neden: string }[];
  cikarilanCumle: number;
}

/** Çerçeve kodları `@akredit/cerceveler` ile aynıdır; resmî metni doğrulanmamış olanlar belirtilir. */
export const CERCEVELER = [
  ["akredit-onlisans-ic", "Önlisans iç öz değerlendirme çerçevesi (resmî değil)"],
  ["mudek", "MÜDEK (ölçüt metni doğrulanmadı)"],
  ["yokak-kurumsal", "YÖKAK ölçütleri (ölçüt metni doğrulanmadı)"],
  ["bologna-akts-ic", "Bologna/AKTS iç denetimi (resmî değil)"],
] as const;

async function iste<T>(
  yol: string,
  yontem = "GET",
  govde?: unknown,
): Promise<{ tamam: true; deger: T } | { tamam: false; hata: string }> {
  try {
    const y = await fetch(`/api/v1${yol}`, {
      method: yontem,
      credentials: "same-origin",
      headers: {
        accept: "application/json",
        ...(govde === undefined ? {} : { "content-type": "application/json" }),
        ...(yontem === "GET" ? {} : { "idempotency-key": crypto.randomUUID() }),
      },
      ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
    });
    const v = (await y.json().catch(() => null)) as { hata?: string } | null;
    return y.ok
      ? { tamam: true, deger: v as T }
      : { tamam: false, hata: v?.hata ?? "İşlem yapılamadı. Yeniden deneyin." };
  } catch {
    return { tamam: false, hata: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." };
  }
}

export function OdrPaneli({ programlar }: { programlar: { id: string; ad: string }[] }) {
  const kimlik = useId();
  const [programId, setProgramId] = useState(programlar[0]?.id ?? "");
  const [cerceveKod, setCerceveKod] = useState<string>(CERCEVELER[0][0]);
  const [liste, setListe] = useState<OdrDurumu[]>([]);
  const [ileti, setIleti] = useState("");
  const [mesgul, setMesgul] = useState(false);

  const yenile = useCallback(async () => {
    if (!programId) return;
    const s = await iste<OdrDurumu[]>(`/programlar/${encodeURIComponent(programId)}/odr`);
    if (s.tamam) setListe(s.deger);
    else setIleti(s.hata);
  }, [programId]);

  useEffect(() => {
    if (GERCEK_VERI) void yenile();
  }, [yenile]);

  if (!GERCEK_VERI) return <p className="text-soluk">Öz değerlendirme raporu örnek veri kipinde kapalıdır.</p>;
  if (!programlar.length) return <p>Yetkili olduğunuz bir program yok.</p>;

  const guncel = liste.find((x) => x.cerceveKod === cerceveKod) ?? null;

  async function kur() {
    setMesgul(true);
    setIleti("");
    const s = await iste<OdrDurumu>("/odr", "POST", { programId, cerceveKod });
    setMesgul(false);
    setIleti(
      s.tamam
        ? `Sürüm ${s.deger.surum} hazırlandı. ${s.deger.eksikler.length} eksik var. Onay önerisi onay kutunuza düştü.`
        : s.hata,
    );
    await yenile();
  }

  async function eksikler() {
    if (!guncel) return;
    setMesgul(true);
    const s = await iste<{ acilan: string[]; zatenVar: string[] }>(`/odr/${guncel.raporId}/eksikler`, "POST", {});
    setMesgul(false);
    setIleti(
      s.tamam
        ? `${s.deger.acilan.length} görev açıldı.${s.deger.zatenVar.length ? ` ${s.deger.zatenVar.length} eksik için görev zaten vardı.` : ""}`
        : s.hata,
    );
  }

  async function indir(bicim: "docx" | "xlsx") {
    if (!guncel) return;
    const s = await iste<{ dosyaAdi: string; mime: string; icerikBase64: string }>(
      `/odr/${guncel.raporId}/belge?bicim=${bicim}`,
    );
    if (!s.tamam) return setIleti(s.hata);
    const ikili = Uint8Array.from(atob(s.deger.icerikBase64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([ikili], { type: s.deger.mime }));
    const a = document.createElement("a");
    a.href = url;
    a.download = s.deger.dosyaAdi;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section aria-labelledby={`${kimlik}-baslik`} className="space-y-3 rounded-sm border border-cizgi bg-yuzey p-5">
      <h2 id={`${kimlik}-baslik`} className="text-lg font-semibold">
        Program öz değerlendirme raporu
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col text-sm" htmlFor={`${kimlik}-program`}>
          Program
          <select
            id={`${kimlik}-program`}
            className="rounded border border-cizgi-guclu p-2"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
          >
            {programlar.map((p) => (
              <option key={p.id} value={p.id}>
                {p.ad}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm" htmlFor={`${kimlik}-cerceve`}>
          Çerçeve
          <select
            id={`${kimlik}-cerceve`}
            className="rounded border border-cizgi-guclu p-2"
            value={cerceveKod}
            onChange={(e) => setCerceveKod(e.target.value)}
          >
            {CERCEVELER.map(([k, ad]) => (
              <option key={k} value={k}>
                {ad}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Dugme tur="birincil" onClick={kur} disabled={mesgul || !programId}>
        {guncel ? "Taslağı yeniden hazırla" : "Taslağı hazırla"}
      </Dugme>
      {guncel && (
        <>
          <p>
            Sürüm {guncel.surum} · {guncel.onay ? `Onaylandı (${guncel.onay.onaylayan})` : "Onay bekliyor"}
          </p>
          <table className="w-full text-sm">
            <caption className="sr-only">Bölümlere göre kapsama</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  Bölüm
                </th>
                <th scope="col" className="text-right">
                  Kanıtlı ölçüt
                </th>
              </tr>
            </thead>
            <tbody>
              {guncel.bolumler.map((b) => (
                <tr key={b.kod}>
                  <td>
                    {b.kod}. {b.baslik}
                  </td>
                  <td className="text-right">
                    {b.kapsanan} / {b.olcutSayisi}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {guncel.eksikler.length > 0 && (
            <div>
              <p className="font-semibold text-risk-yuksek">EKSİK</p>
              <ul className="list-disc pl-5 text-sm">
                {guncel.eksikler.map((e) => (
                  <li key={e.olcutKod}>
                    {e.olcutKod} {e.baslik}: {e.neden}
                  </li>
                ))}
              </ul>
              <Dugme onClick={eksikler} disabled={mesgul}>
                Eksikler için görev aç
              </Dugme>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Dugme onClick={() => indir("docx")}>Raporu indir (Word)</Dugme>
            <Dugme onClick={() => indir("xlsx")}>Ziyaret paketini indir (Excel)</Dugme>
          </div>
        </>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {ileti}
      </p>
    </section>
  );
}
