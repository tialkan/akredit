import type { Metadata } from "next";
import { BosDurum, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { portalAc } from "../../_portal/durum.tsx";
import { KanitGorunumu } from "../../_portal/gorunum.tsx";
import { hataBilgisi, kanitGoruntule } from "../../_portal/portal.ts";

export const metadata: Metadata = { title: "Kanıt" };
export const dynamic = "force-dynamic";

export default async function KanitGoruntuleyici({ params }: { params: Promise<{ id: string }> }) {
  const acilis = await portalAc();
  if ("durum" in acilis) return acilis.durum;
  const { id } = await params;
  let a: Awaited<ReturnType<typeof kanitGoruntule>>;
  try {
    a = await kanitGoruntule(acilis.p, id);
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return (
      <>
        <SayfaBasligi baslik="Kanıt" />
        <BosDurum baslik="Kanıt açılamadı" aciklama={h.ileti} />
      </>
    );
  }
  return <KanitGorunumu kanit={a.kanit} parcalar={a.parcalar} />;
}
