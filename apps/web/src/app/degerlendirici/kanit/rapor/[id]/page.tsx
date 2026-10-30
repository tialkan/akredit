import type { Metadata } from "next";
import Link from "next/link";
import { BosDurum, SayfaBasligi } from "../../../../../bilesenler/temel.tsx";
import { RaporOkuyucu } from "../../../../panel/raporlar/okuyucu.tsx";
import { portalAc } from "../../../_portal/durum.tsx";
import { hataBilgisi } from "../../../_portal/portal.ts";
import { portalRaporu } from "../portal-raporu.ts";

export const metadata: Metadata = { title: "Rapor" };
export const dynamic = "force-dynamic";

export default async function PortalRaporu({ params }: { params: Promise<{ id: string }> }) {
  const acilis = await portalAc();
  if ("durum" in acilis) return acilis.durum;
  const { id } = await params;
  let x: Awaited<ReturnType<typeof portalRaporu>>;
  try {
    x = await portalRaporu(acilis.p, id);
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return (
      <>
        <SayfaBasligi baslik="Rapor" />
        <BosDurum baslik="Rapor açılamadı" aciklama={h.ileti} />
      </>
    );
  }
  return (
    <>
      <nav aria-label="Kırıntı yolu" className="mb-2 text-sm">
        <Link href="/degerlendirici/kanit/rapor" className="inline-block py-1 underline underline-offset-4">
          Raporlara dön
        </Link>
      </nav>
      <SayfaBasligi
        baslik={x.rapor.ad}
        aciklama="Salt okunur görünüm. Bu görüntüleme kurumun erişim günlüğüne yazıldı."
      />
      <RaporOkuyucu
        bolumler={x.veri.bolumler}
        kanitlar={x.veri.kanitlar}
        erisilemeyen={x.veri.erisilemeyen}
        kanitYolu="/degerlendirici/kanit/"
      />
    </>
  );
}
