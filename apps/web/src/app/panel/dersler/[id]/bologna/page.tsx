import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Kart, KirintiYolu, Rozet, SayfaBasligi } from "../../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../../../veri/sunucu.ts";
import { tarihYaz } from "../../../../../veri/yardimci.ts";
import { taslakGecmisi } from "../../_bologna/veri.ts";
import { BolognaAsistani } from "./asistan.tsx";

export async function generateStaticParams() {
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).dersler()).map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const x = await (await panelVeriKaynagi()).ders((await params).id);
  return { title: x ? `${x.kod} Bologna asistanı` : "Bologna asistanı" };
}

const KARAR: Record<string, string> = {
  onaylandi: "Onaylandı",
  duzeltildi: "Düzeltilerek onaylandı",
  reddedildi: "Reddedildi",
};

export default async function BolognaSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ders = await (await panelVeriKaynagi()).ders(id);
  if (!ders) notFound();
  const gecmis = await taslakGecmisi(id);
  const onayli = gecmis
    .filter((g) => g.karar === "onaylandi" || g.karar === "duzeltildi")
    .map((g) => ({ oneriId: g.oneriId, yazmaPlaniId: g.yazmaPlaniId }));
  return (
    <>
      <KirintiYolu
        ogeler={[
          { ad: "Panel", href: "/panel" },
          { ad: "Dersler", href: "/panel/dersler" },
          { ad: ders.kod, href: `/panel/dersler/${ders.id}` },
          { ad: "Bologna asistanı" },
        ]}
      />
      <SayfaBasligi
        baslik={`${ders.kod} ${ders.ad}: ders bilgi paketi`}
        aciklama="Birkaç cümle yazın; taslak programın Bologna sayfalarına ve sizin bilginize dayanarak hazırlanır, kurallardan geçirilir ve onayınıza gelir. Onayınız olmadan hiçbir şey OBS'ye yazılmaz."
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <BolognaAsistani dersId={ders.id} gercek={GERCEK_VERI} onayliTaslaklar={onayli} />
        <Kart baslik="Taslak geçmişi">
          {gecmis.length === 0 ? (
            <p>Henüz taslak yok.</p>
          ) : (
            <ol className="space-y-4">
              {[...gecmis].reverse().map((g) => (
                <li key={g.oneriId} className="border-b border-cizgi pb-3">
                  <p>
                    {tarihYaz(g.zaman)} ·{" "}
                    <Rozet vurgulu={g.karar === null}>{g.karar ? KARAR[g.karar] : "Onayınızı bekliyor"}</Rozet>
                  </p>
                  <p className="text-soluk">
                    {g.hata} hata, {g.uyari} uyarı{g.yazmaPlaniId ? " · yazma planı açıldı" : ""}
                  </p>
                  <ul className="mt-1 list-disc pl-6">
                    {g.fark.map((f) => (
                      <li key={f.alan}>
                        <span className="font-semibold">{f.alan}</span>: {f.neden.join(" ")}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </Kart>
      </div>
    </>
  );
}
