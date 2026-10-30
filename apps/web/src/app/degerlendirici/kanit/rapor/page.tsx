import type { Metadata } from "next";
import Link from "next/link";
import { BosDurum, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { portalAc } from "../../_portal/durum.tsx";
import { hataBilgisi } from "../../_portal/portal.ts";
import { portalRaporlari } from "./portal-raporu.ts";

export const metadata: Metadata = { title: "Raporlar" };
export const dynamic = "force-dynamic";

export default async function PortalRaporlari() {
  const acilis = await portalAc();
  if ("durum" in acilis) return acilis.durum;
  let liste: Awaited<ReturnType<typeof portalRaporlari>>;
  try {
    liste = await portalRaporlari(acilis.p);
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return (
      <>
        <SayfaBasligi baslik="Raporlar" />
        <BosDurum baslik="Raporlar açılamadı" aciklama={h.ileti} />
      </>
    );
  }
  return (
    <>
      <nav aria-label="Kırıntı yolu" className="mb-2 text-sm">
        <Link href="/degerlendirici" className="inline-block py-1 underline underline-offset-4">
          Kanıt odasına dön
        </Link>
      </nav>
      <SayfaBasligi
        baslik="Raporlar"
        aciklama="Raporu açın, bir cümleyi seçince kanıtı yanda görürsünüz. Görüntülemeler kuruma açık günlüğe yazılır."
      />
      {liste.length === 0 ? (
        <p>Erişiminizin kapsamında rapor yok.</p>
      ) : (
        <ul className="space-y-2">
          {liste.map((r) => (
            <li key={r.id}>
              <Link
                href={`/degerlendirici/kanit/rapor/${r.id}`}
                className="inline-block py-1 underline underline-offset-4"
              >
                {r.ad}
              </Link>
              <span className="text-sm text-soluk">
                {" "}
                · {r.donem || "dönem yok"} · {r.bolumSayisi} bölüm
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
