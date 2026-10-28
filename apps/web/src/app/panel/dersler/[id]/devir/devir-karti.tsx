"use client";

// Ders sayfasındaki dönem devri kartı (İP-38). Birincil eylem: fark özetini okuyup onaylamak ya da değiştirmek.
// Durum: taslak hazır, itiraz süresi (iş günü), varsayılan onay, kaynağa yazma (bekliyor, deneme, yazıldı, hata).
// Örnek veri kipinde kurgu bir durum gösterilir; eylemler çalışmaz.

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";
import { bolognaIstegi, ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";

interface Durum {
  oneriId: string;
  dersKodu: string;
  donemAdi: string;
  durum: "taslak_hazir" | "hoca_degistiriyor" | "onaylandi" | "duzeltildi" | "reddedildi" | "varsayilan_onaylandi";
  ozet: string;
  risk: "dusuk" | "orta" | "yuksek";
  riskNedenleri: string[];
  fark: { alan: string; onceki: string; yeni: string; neden: string }[];
  onlemler: { eylemId: string; tanim: string; uygulandi: boolean }[];
  bulgular: { kural: string; aciklama: string }[];
  sureSonu: string | null;
  kalanIsGunu: number | null;
  politikaAdi: string | null;
  karar: { sonuc: string; dayanak: string; kararVeren: string; zaman: string } | null;
  yazma: { durum: "bekliyor" | "kuru" | "yazildi" | "hata" | "izin_yok"; zaman: string | null; ileti: string } | null;
}

/** Kurgu örnek (adlar ve tarihler uydurmadır). */
const ORNEK: Durum = {
  oneriId: "ornek-devir",
  dersKodu: "BP102",
  donemAdi: "2026-2027 Güz",
  durum: "taslak_hazir",
  ozet: "Geçen dönemden 1 alan değişti: yontem. Uygulanan önlemler: Yönteme haftalık proje eklensin.",
  risk: "dusuk",
  riskNedenleri: [],
  fark: [
    {
      alan: "yontem",
      onceki: "Anlatım ve uygulama.",
      yeni: "Anlatım, uygulama ve haftalık proje.",
      neden: "PÜKÖ önlemi",
    },
  ],
  onlemler: [{ eylemId: "e1", tanim: "Yönteme haftalık proje eklensin", uygulandi: true }],
  bulgular: [],
  sureSonu: "2026-11-03T09:00:00.000Z",
  kalanIsGunu: 4,
  politikaAdi: "Dönem devri yönergesi md. 5",
  karar: null,
  yazma: null,
};

const ALAN_ADI: Record<string, string> = {
  amac: "Dersin amacı",
  icerik: "Dersin içeriği",
  yontem: "Öğretim yöntemi",
  notlar: "Ders notları",
  akts: "AKTS",
  tul: "Teorik + uygulama + laboratuvar",
  ad: "Ders adı",
  kod: "Ders kodu",
  programCiktilari: "Program çıktıları",
};

const DURUM_METNI: Record<Durum["durum"], string> = {
  taslak_hazir: "Taslak hazır, kararınızı bekliyor",
  hoca_degistiriyor: "Taslağı değiştiriyorsunuz",
  onaylandi: "Onayladınız",
  duzeltildi: "Düzelterek onayladınız",
  reddedildi: "Reddettiniz",
  varsayilan_onaylandi: "Süre dolduğu için onaylanmış sayıldı",
};

const YAZMA_METNI: Record<NonNullable<Durum["yazma"]>["durum"], string> = {
  bekliyor: "Kaynağa yazılmayı bekliyor",
  kuru: "Deneme yapıldı, yazılmayı bekliyor",
  yazildi: "Bologna sistemine yazıldı",
  hata: "Kaynağa yazılamadı",
  izin_yok: "Kurum izni olmadığı için yazılmadı",
};

const tarih = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

export function DevirKarti({ dersId }: { dersId: string }) {
  const kimlik = useId();
  const [durum, setDurum] = useState<Durum | null | undefined>(GERCEK_VERI ? undefined : ORNEK);
  const [ileti, setIleti] = useState("");
  const [mesgul, setMesgul] = useState(false);
  const d = encodeURIComponent(dersId);

  const yukle = useCallback(async () => {
    const s = await bolognaIstegi<Durum | null>("GET", `/dersler/${d}/devir`);
    if (s.tamam) setDurum(s.deger);
    else {
      setDurum(null);
      setIleti(s.hata);
    }
  }, [d]);

  useEffect(() => {
    if (GERCEK_VERI) void yukle();
  }, [yukle]);

  async function karar(sonuc: "onaylandi" | "reddedildi") {
    if (!GERCEK_VERI) return setIleti(ORNEK_KIP_ILETISI);
    setMesgul(true);
    setIleti("");
    const s = await bolognaIstegi("POST", `/dersler/${d}/devir/karar`, { sonuc });
    setMesgul(false);
    if (!s.tamam) return setIleti(s.hata);
    setIleti(sonuc === "onaylandi" ? "Onayınız kaydedildi." : "Reddiniz kaydedildi; taslak kaynağa yazılmaz.");
    await yukle();
  }

  if (durum === undefined) return <p className="text-soluk">Yükleniyor…</p>;
  if (durum === null)
    return (
      <div className="space-y-2">
        <p>Bu ders için yeni dönem taslağı yok. Dönem başında geçen dönemin onaylı paketi kendiliğinden devredilir.</p>
        {ileti && <p role="status">{ileti}</p>}
      </div>
    );

  const bekliyor = durum.durum === "taslak_hazir";
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[12rem_1fr]">
        <dt className="font-semibold">Dönem</dt>
        <dd>{durum.donemAdi}</dd>
        <dt className="font-semibold">Durum</dt>
        <dd>{DURUM_METNI[durum.durum]}</dd>
        {bekliyor && (
          <>
            <dt className="font-semibold">Süre</dt>
            <dd>
              {durum.sureSonu && durum.kalanIsGunu !== null
                ? `${durum.kalanIsGunu} iş günü kaldı (${tarih(durum.sureSonu)}). İtiraz etmezseniz "${durum.politikaAdi}" uyarınca onaylanmış sayılır.`
                : "Bu taslak sizin kararınızı ister; süre dolumuyla onaylanmaz."}
            </dd>
          </>
        )}
        {durum.karar && (
          <>
            <dt className="font-semibold">Karar</dt>
            <dd>
              {durum.karar.dayanak === "sure_dolumu"
                ? `${tarih(durum.karar.zaman)}: süre dolumuyla, "${durum.politikaAdi ?? "yetki devri"}" politikası dayanağıyla ${durum.karar.kararVeren} adına`
                : `${tarih(durum.karar.zaman)}: ${durum.karar.kararVeren}`}
            </dd>
          </>
        )}
        {durum.yazma && (
          <>
            <dt className="font-semibold">Kaynağa yazma</dt>
            <dd className={durum.yazma.durum === "hata" ? "text-risk-yuksek" : ""}>
              {YAZMA_METNI[durum.yazma.durum]}. {durum.yazma.ileti}
            </dd>
          </>
        )}
      </dl>

      <section aria-labelledby={`${kimlik}-fark`} className="space-y-2">
        <h3 id={`${kimlik}-fark`} className="font-semibold">
          Fark özeti
        </h3>
        <p>{durum.ozet}</p>
        {durum.riskNedenleri.length > 0 && (
          <ul className="list-disc pl-5 text-risk-orta">
            {durum.riskNedenleri.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
        {durum.fark.length > 0 && (
          <table className="w-full text-sm">
            <caption className="sr-only">Geçen döneme göre değişen alanlar</caption>
            <thead>
              <tr className="border-b border-cizgi text-left">
                <th scope="col" className="py-1 pr-3">
                  Alan
                </th>
                <th scope="col" className="py-1 pr-3">
                  Geçen dönem
                </th>
                <th scope="col" className="py-1 pr-3">
                  Yeni dönem
                </th>
                <th scope="col" className="py-1">
                  Neden
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {durum.fark.map((f) => (
                <tr key={f.alan}>
                  <th scope="row" className="py-1 pr-3 text-left font-semibold">
                    {ALAN_ADI[f.alan] ?? f.alan}
                  </th>
                  <td className="py-1 pr-3">{f.onceki}</td>
                  <td className="py-1 pr-3">{f.yeni}</td>
                  <td className="py-1">{f.neden}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {bekliyor && (
        <div className="flex flex-wrap items-center gap-3">
          <Dugme tur="birincil" onClick={() => karar("onaylandi")} disabled={mesgul}>
            Onayla
          </Dugme>
          <Link
            className="inline-flex min-h-11 items-center rounded border border-cizgi-guclu bg-yuzey px-4 hover:bg-yuzey-2"
            href={`/panel/dersler/${d}/bologna`}
          >
            Değiştir
          </Link>
          <Dugme tur="sessiz" onClick={() => karar("reddedildi")} disabled={mesgul}>
            Reddet
          </Dugme>
        </div>
      )}
      <p role="status" aria-live="polite" className="text-sm">
        {ileti}
      </p>
    </div>
  );
}
