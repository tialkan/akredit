import { ServisHatasi, sinavTarama } from "@akredit/servis";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KirintiYolu, SayfaBasligi } from "../../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi, servisBaglami } from "../../../../../veri/sunucu.ts";
import { TaramaEkrani } from "./tarama-ekrani.tsx";
import { ORNEK_PANEL, ORNEK_TARAMA, type PanelVerisi, type Sablon, type YuklemeDurumu } from "./veri.ts";

export async function generateStaticParams() {
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).dersler()).map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const x = await (await panelVeriKaynagi()).ders((await params).id);
  return { title: x ? `${x.kod} · Sınav taraması` : "Sınav taraması" };
}

/** Gerçek veri: dersin sınavları, şablonları, yüklemeleri ve taramaları. Yetki yoksa null. */
async function gercekPanel(dersId: string): Promise<PanelVerisi | null> {
  try {
    const p = await sinavTarama.taramaPaneli(await servisBaglami(), dersId);
    return { ...p, araclar: p.araclar.map((a) => ({ ...a, sablon: a.sablon as Sablon | null })) };
  } catch (e) {
    if (e instanceof ServisHatasi && (e.kod === "yetki_yok" || e.kod === "bulunamadi")) return null;
    throw e;
  }
}

export default async function TaramaSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const ders = await (await panelVeriKaynagi()).ders(id);
  if (!ders) notFound();
  const panel = GERCEK_VERI ? await gercekPanel(ders.id) : ORNEK_PANEL;
  // Yükleme formu yalnız kurum içi model tanımlıysa açıktır. Örnek kipte form görünür, gönderim çalışmaz.
  const yukleme: YuklemeDurumu = GERCEK_VERI ? sinavTarama.yerelModelDurumu(process.env) : { acik: true };
  return (
    <>
      <KirintiYolu
        ogeler={[
          { ad: "Panel", href: "/panel" },
          { ad: "Dersler", href: "/panel/dersler" },
          { ad: ders.kod, href: `/panel/dersler/${ders.id}` },
          { ad: "Sınav taraması" },
        ]}
      />
      <SayfaBasligi
        baslik="Sınav kâğıdı taraması"
        aciklama={`${ders.kod} ${ders.ad}: soru bazlı puanlar taranmış kâğıtlardan okunur, emin olunamayanları siz onaylarsınız.`}
      />
      {panel ? (
        <TaramaEkrani
          dersId={ders.id}
          panel={panel}
          yukleme={yukleme}
          ornekTarama={GERCEK_VERI ? null : ORNEK_TARAMA}
        />
      ) : (
        <p>Bu dersin sınav taramasını görme yetkiniz yok. Ders sorumlusuna başvurun.</p>
      )}
    </>
  );
}
