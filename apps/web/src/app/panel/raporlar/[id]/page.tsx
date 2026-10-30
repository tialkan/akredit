import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KirintiYolu, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi, servisBaglami } from "../../../../veri/sunucu.ts";
import { DilDenetimiOzeti } from "../dil-denetimi.tsx";
import { raporKapsamasi } from "../kapsama.ts";
import { RaporOkuyucu } from "../okuyucu.tsx";
import { okuyucuVerisiKaynaktan, okuyucuVerisiServisten } from "../okuyucu-verisi.ts";
import { DilBulgulariFormu } from "./dil-formu.tsx";

export async function generateStaticParams() {
  // Gerçek veride sayfalar istek anında, oturumdaki kişinin yetkisiyle üretilir.
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).raporlar()).map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const x = await (await panelVeriKaynagi()).rapor((await params).id);
  return { title: x ? `${x.ad} · Rapor` : "Rapor" };
}

export default async function RaporSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const kaynak = await panelVeriKaynagi();
  const rapor = await kaynak.rapor((await params).id);
  if (!rapor) notFound();
  const v = GERCEK_VERI
    ? await okuyucuVerisiServisten(await servisBaglami(), rapor)
    : await okuyucuVerisiKaynaktan(kaynak, rapor);
  const k = raporKapsamasi(rapor);
  return (
    <>
      <KirintiYolu
        ogeler={[{ ad: "Panel", href: "/panel" }, { ad: "Raporlar", href: "/panel/raporlar" }, { ad: rapor.ad }]}
      />
      <SayfaBasligi
        baslik={rapor.ad}
        aciklama={`${rapor.donem} · ${k.atifli} / ${k.toplam} paragraf kanıta bağlı, ${k.eksik} paragraf EKSİK`}
      />
      <DilDenetimiOzeti
        bulgular={v.dil}
        yayimUyarisi={v.yayimUyarisi}
        eylem={GERCEK_VERI && v.dil.length ? <DilBulgulariFormu raporId={rapor.id} /> : undefined}
      />
      <nav aria-label="Rapor bölümleri" className="mb-4">
        <ol className="flex flex-wrap gap-2 text-sm">
          {rapor.bolumler.map((b, i) => (
            <li key={b.id}>
              <a
                href={`#${b.id}`}
                className="inline-flex min-h-11 items-center rounded px-2 underline underline-offset-4"
              >
                {i + 1}. {b.baslik}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <RaporOkuyucu bolumler={v.bolumler} kanitlar={v.kanitlar} erisilemeyen={v.erisilemeyen} />
    </>
  );
}
