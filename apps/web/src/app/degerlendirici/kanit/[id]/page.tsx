import type { Metadata } from "next";
import Link from "next/link";
import { BosDurum, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { portalAc } from "../../_portal/durum.tsx";
import { hataBilgisi, kanitGoruntule } from "../../_portal/portal.ts";

export const metadata: Metadata = { title: "Kanıt" };
export const dynamic = "force-dynamic";

function konum(c: Record<string, unknown>): string {
  if (typeof c.sayfa === "number") return `Sayfa ${c.sayfa}`;
  if (typeof c.bolum === "string") return `Bölüm ${c.bolum}`;
  if (typeof c.satir === "number") return `Satır ${c.satir}`;
  if (typeof c.slayt === "number") return `Slayt ${c.slayt}`;
  return "";
}

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
    return <BosDurum baslik="Kanıt açılamadı" aciklama={h.ileti} />;
  }
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/degerlendirici" className="underline underline-offset-4">
          Kanıt odasına dön
        </Link>
      </p>
      <SayfaBasligi
        baslik={a.kanit.baslik}
        aciklama={`${a.kanit.dosyaAdi} · içerik özeti ${a.kanit.ozet.slice(0, 12)}`}
      />
      {a.kanit.olcutler.length > 0 && <p className="mb-4 text-sm">Ölçütler: {a.kanit.olcutler.join(", ")}</p>}
      {a.parcalar.length === 0 ? (
        <p>Bu belgenin metni henüz okunmadı.</p>
      ) : (
        <ol className="space-y-4">
          {a.parcalar.map((p) => (
            <li key={p.id} className="rounded border border-cizgi bg-yuzey p-3">
              <p className="mb-1 text-sm text-soluk">
                {konum(p.capa as Record<string, unknown>) || `Parça ${p.sira + 1}`}
              </p>
              <p className="whitespace-pre-wrap">{p.metin}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
