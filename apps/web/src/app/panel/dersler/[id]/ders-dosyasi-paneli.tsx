"use client";

// Ders dosyası paneli (İP-16): dönem sonu not dökümünü yükle → eşlemeyi onay kutusunda onayla → ders dosyası ve
// ölçme raporu kendiliğinden hazırlanır → indir ve onayla. Sayılar sunucuda ölçme motorundan gelir.

import { useCallback, useEffect, useId, useState } from "react";
import { Dugme } from "../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../veri/istemci.ts";

interface Durum {
  dersAcilisiId: string;
  donem: string;
  asama:
    | "dokum_bekliyor"
    | "esleme_onayda"
    | "esleme_reddedildi"
    | "olcme_bekliyor"
    | "onay_bekliyor"
    | "onaylandi"
    | "reddedildi";
  eksikler: string[];
  etkilesim: { adimSayisi: number; kararSayisi: number; yuklemeSayisi: number; toplamSureMs: number };
}

const ASAMA: Record<Durum["asama"], string> = {
  dokum_bekliyor: "Not dökümü bekleniyor.",
  esleme_onayda: "Soru-çıktı eşlemesi onay kutunuzda bekliyor.",
  esleme_reddedildi: "Eşleme reddedildi. Dökümü yeni dönem kaydıyla yeniden yükleyin.",
  olcme_bekliyor: "Eşleme onaylandı; ölçme sırada.",
  onay_bekliyor: "Ders dosyası hazır. İndirip inceleyin, onay kutusundan onaylayın.",
  onaylandi: "Ders dosyası onaylandı.",
  reddedildi: "Ders dosyası reddedildi.",
};

const TURLER = [
  ["ara_sinav", "Ara sınav"],
  ["yariyil_sonu", "Yarıyıl sonu sınavı"],
  ["butunleme", "Bütünleme"],
  ["kisa_sinav", "Kısa sınav"],
  ["odev", "Ödev"],
  ["proje", "Proje"],
  ["uygulama", "Uygulama"],
  ["diger", "Diğer"],
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

function base64(dosya: File): Promise<string> {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(String(r.result).split(",")[1] ?? "");
    r.onerror = () => red(r.error);
    r.readAsDataURL(dosya);
  });
}

export function DersDosyasiPaneli({ dersId }: { dersId: string }) {
  const kimlik = useId();
  const [liste, setListe] = useState<Durum[] | null>(null);
  const [ileti, setIleti] = useState<string>("");
  const [mesgul, setMesgul] = useState(false);
  const [ad, setAd] = useState("Final");
  const [tur, setTur] = useState<(typeof TURLER)[number][0]>("yariyil_sonu");
  const [agirlik, setAgirlik] = useState("60");
  const [dosya, setDosya] = useState<File | null>(null);

  const yenile = useCallback(async () => {
    const s = await iste<Durum[]>(`/dersler/${encodeURIComponent(dersId)}/ders-dosyasi`);
    if (s.tamam) setListe(s.deger);
    else setIleti(s.hata);
  }, [dersId]);

  useEffect(() => {
    if (GERCEK_VERI) void yenile();
  }, [yenile]);

  if (!GERCEK_VERI) return <p className="text-soluk">Ders dosyası otomasyonu örnek veri kipinde kapalıdır.</p>;

  const guncel = liste?.[0];

  async function yukle(e: React.FormEvent) {
    e.preventDefault();
    if (!guncel || !dosya) return;
    setMesgul(true);
    setIleti("");
    const s = await iste<{ ogrenciSayisi: number; eksikler: string[] }>("/ders-dosyasi/dokum", "POST", {
      dersAcilisiId: guncel.dersAcilisiId,
      araclar: [{ ad, tur, agirlik: Number(agirlik), dosyaAdi: dosya.name, icerikBase64: await base64(dosya) }],
    });
    setMesgul(false);
    setIleti(
      s.tamam
        ? `${s.deger.ogrenciSayisi} öğrencinin notları alındı. Eşleme önerisi onay kutunuza düştü.${s.deger.eksikler.length ? ` Eşlenemeyen soru: ${s.deger.eksikler.join(", ")}.` : ""}`
        : s.hata,
    );
    await yenile();
  }

  async function indir(bicim: "docx" | "xlsx") {
    if (!guncel) return;
    const s = await iste<{ dosyaAdi: string; mime: string; icerikBase64: string }>(
      `/ders-dosyasi/${guncel.dersAcilisiId}/belge?bicim=${bicim}`,
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

  async function olustur() {
    if (!guncel) return;
    setMesgul(true);
    const s = await iste<Durum>(`/ders-dosyasi/${guncel.dersAcilisiId}/olustur`, "POST", {});
    setMesgul(false);
    setIleti(s.tamam ? "Ders dosyası hazırlandı." : s.hata);
    await yenile();
  }

  return (
    <div className="space-y-3">
      {liste === null ? (
        <p>Yükleniyor…</p>
      ) : !guncel ? (
        <p>Bu ders için açılmış bir dönem yok.</p>
      ) : (
        <>
          <p>
            <span className="font-semibold">{guncel.donem}:</span> {ASAMA[guncel.asama]}
          </p>
          {guncel.eksikler.length > 0 && (
            <p className="font-semibold text-risk-yuksek">EKSİK: {guncel.eksikler.join("; ")}</p>
          )}
          <p className="text-sm text-soluk">
            Sizin katkınız: {guncel.etkilesim.adimSayisi} adım ({guncel.etkilesim.yuklemeSayisi} yükleme,{" "}
            {guncel.etkilesim.kararSayisi} onay), yaklaşık {Math.round(guncel.etkilesim.toplamSureMs / 60_000)} dakika.
          </p>
          {guncel.asama === "dokum_bekliyor" && (
            <form onSubmit={yukle} className="space-y-2" aria-label="Not dökümü yükle">
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="flex flex-col text-sm" htmlFor={`${kimlik}-ad`}>
                  Sınavın adı
                  <input
                    id={`${kimlik}-ad`}
                    className="rounded border border-cizgi-guclu p-2"
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    required
                  />
                </label>
                <label className="flex flex-col text-sm" htmlFor={`${kimlik}-tur`}>
                  Türü
                  <select
                    id={`${kimlik}-tur`}
                    className="rounded border border-cizgi-guclu p-2"
                    value={tur}
                    onChange={(e) => setTur(e.target.value as typeof tur)}
                  >
                    {TURLER.map(([d, a]) => (
                      <option key={d} value={d}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col text-sm" htmlFor={`${kimlik}-agirlik`}>
                  Ders notundaki ağırlığı (%)
                  <input
                    id={`${kimlik}-agirlik`}
                    type="number"
                    min={0}
                    max={100}
                    className="rounded border border-cizgi-guclu p-2"
                    value={agirlik}
                    onChange={(e) => setAgirlik(e.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="flex flex-col text-sm" htmlFor={`${kimlik}-dosya`}>
                OBS not dökümü (soru bazlı Excel ya da CSV)
                <input
                  id={`${kimlik}-dosya`}
                  type="file"
                  accept=".xlsx,.csv,.ods"
                  onChange={(e) => setDosya(e.target.files?.[0] ?? null)}
                  required
                />
              </label>
              <Dugme type="submit" tur="birincil" disabled={mesgul || !dosya}>
                Dökümü yükle
              </Dugme>
            </form>
          )}
          {guncel.asama === "olcme_bekliyor" && (
            <Dugme tur="birincil" onClick={olustur} disabled={mesgul}>
              Ders dosyasını şimdi hazırla
            </Dugme>
          )}
          {(guncel.asama === "onay_bekliyor" || guncel.asama === "onaylandi") && (
            <div className="flex flex-wrap gap-2">
              <Dugme onClick={() => indir("docx")}>Ders dosyasını indir (Word)</Dugme>
              <Dugme onClick={() => indir("xlsx")}>Ölçme raporunu indir (Excel)</Dugme>
            </div>
          )}
        </>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {ileti}
      </p>
    </div>
  );
}
