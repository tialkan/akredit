// Katılımcının gördüğü anket sayfası. Giriş istemez; kimlik sorulmaz. Davet bağlantısında `?b=` belirteci
// yalnız tekrar yanıtı engellemek içindir, yanıtla birlikte saklanmaz.
// Örnek: /anket/ornek/ders_degerlendirme (hazır şablon, yanıt kaydedilmez).

import { type AnketTanimi, sablon } from "@akredit/anket/temel";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { gercekVeriMi } from "../../../api/_ortak/sunucu.ts";
import { anketBaglami, ORNEK_KURUM } from "../../sunucu.ts";
import { AnketFormu } from "./form.tsx";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anket", robots: { index: false } };

function Aydinlatma() {
  // docs/hukuk/aydinlatma-metinleri.md, C bölümü (anket katılımcıları). Kurum adı kurum ayarından gelir.
  return (
    <>
      <p className="font-semibold">Kişisel verilerin korunması hakkında</p>
      <p className="mt-1">
        Bu anket anonimdir: adınız, e-posta adresiniz ya da öğrenci numaranız yanıtlarınızla birlikte kaydedilmez.
        Yanıtlar ders, program ve hizmet kalitesini değerlendirmek için kullanılır. Az yanıt alınan sorularda sonuç
        gösterilmez. Ayrıntı için kurumunuzun aydınlatma metnine bakın.
      </p>
    </>
  );
}

export default async function AnketSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ kurum: string; anket: string }>;
  searchParams: Promise<{ b?: string }>;
}) {
  const { kurum, anket } = await params;
  const { b } = await searchParams;
  let tanim: AnketTanimi | undefined;
  let acik = true;
  let bitis: string | null = null;
  if (kurum === ORNEK_KURUM || !gercekVeriMi()) {
    tanim = sablon(anket);
  } else {
    const { anketFormu } = await import("@akredit/anket/vt");
    try {
      const f = await anketFormu(await anketBaglami(), kurum, anket);
      tanim = f.tanim;
      acik = f.acik;
      bitis = f.bitis;
    } catch {
      tanim = undefined;
    }
  }
  if (!tanim) notFound();
  return (
    <main id="icerik" className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{tanim.baslik}</h1>
      {tanim.aciklama ? <p className="mt-2 text-soluk">{tanim.aciklama}</p> : null}
      {bitis ? (
        <p className="mt-1 text-sm text-soluk">
          Son gün: {new Date(bitis).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })}
        </p>
      ) : null}
      <div className="mt-6">
        {acik ? (
          <AnketFormu tanim={tanim} kurum={kurum} anket={anket} belirtec={b ?? null} aydinlatma={<Aydinlatma />} />
        ) : (
          <p role="status" className="rounded-sm border border-cizgi bg-yuzey p-5">
            Bu anket şu anda yanıt kabul etmiyor.
          </p>
        )}
      </div>
    </main>
  );
}
