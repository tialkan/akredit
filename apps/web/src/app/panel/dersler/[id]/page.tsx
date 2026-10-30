import { CheckCircle2, CircleDashed } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OlcmeCubuklari } from "../../../../bilesenler/olcme-cubuklari.tsx";
import { Kart, KirintiYolu, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../../veri/sunucu.ts";
import { BolognaRozeti } from "../bologna-rozeti.tsx";
import { ArastirmaPaneli } from "./arastirma/arastirma-paneli.tsx";
import { DersDosyasiPaneli } from "./ders-dosyasi-paneli.tsx";
import { DevirKarti } from "./devir/devir-karti.tsx";

export async function generateStaticParams() {
  // Gerçek veride sayfalar istek anında, oturumdaki kişinin yetkisiyle üretilir.
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).dersler()).map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const x = await (await panelVeriKaynagi()).ders((await params).id);
  return { title: x ? `${x.ad} · Ders` : "Ders" };
}

export default async function DersSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const ders = await (await panelVeriKaynagi()).ders((await params).id);
  if (!ders) notFound();
  return (
    <>
      <KirintiYolu
        ogeler={[{ ad: "Panel", href: "/panel" }, { ad: "Dersler", href: "/panel/dersler" }, { ad: ders.kod }]}
      />
      <SayfaBasligi baslik={`${ders.kod} ${ders.ad}`} aciklama={`${ders.yariyil}. yarıyıl · ${ders.akts} AKTS`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Kart baslik="Yeni dönem ders paketi" className="lg:col-span-2">
          <DevirKarti dersId={ders.id} />
        </Kart>
        <Kart baslik="Ders bilgi paketi" eylem={<BolognaRozeti durum={ders.bolognaDurumu} />}>
          <p>{ders.bolognaNotu}</p>
          <p className="mt-2">
            <Link className="text-vurgu underline underline-offset-2" href={`/panel/dersler/${ders.id}/bologna`}>
              Bologna asistanıyla taslak hazırla
            </Link>
          </p>
          <h3 className="mt-4 font-semibold">Ders çıktıları</h3>
          <dl className="mt-1 divide-y divide-cizgi">
            {ders.ciktilar.map((c) => (
              <div key={c.id} className="grid grid-cols-[3rem_1fr] py-1.5">
                <dt className="font-semibold">{c.kod}</dt>
                <dd>{c.metin}</dd>
              </div>
            ))}
          </dl>
        </Kart>
        <Kart baslik="Ders dosyası">
          <ul className="space-y-2">
            {ders.dersDosyasi.map((b) => (
              <li key={b.ad} className="flex items-center gap-2">
                {b.tamam ? (
                  <CheckCircle2 aria-hidden className="size-5 text-risk-dusuk" />
                ) : (
                  <CircleDashed aria-hidden className="size-5 text-risk-yuksek" />
                )}
                <span className="flex-1">{b.ad}</span>
                <span className={b.tamam ? "text-risk-dusuk" : "font-semibold text-risk-yuksek"}>
                  {b.tamam ? "Var" : "Eksik"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            <Link className="text-vurgu underline underline-offset-2" href={`/panel/dersler/${ders.id}/tarama`}>
              Taranmış sınav kâğıtlarından soru puanlarını oku
            </Link>
          </p>
          <div className="mt-4 border-t border-cizgi pt-4">
            <DersDosyasiPaneli dersId={ders.id} />
          </div>
        </Kart>
        <Kart baslik="Eksikleri gider, kanıt ara, Word paketi (isteğe bağlı)" className="lg:col-span-2">
          <ArastirmaPaneli dersId={ders.id} />
        </Kart>
        <Kart baslik="Ders çıktılarının sağlanması" className="lg:col-span-2">
          <OlcmeCubuklari baslik="Ders çıktısı başına sağlanma oranı (örnek veri)" satirlar={ders.olcme} esik={0.6} />
        </Kart>
      </div>
    </>
  );
}
