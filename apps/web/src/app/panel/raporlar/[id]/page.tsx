import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EksikIsareti, KirintiYolu, Rozet, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../../veri/sunucu.ts";
import { bolumKapsamasi, raporKapsamasi } from "../kapsama.ts";

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
  const kanitAdlari = Object.fromEntries((await kaynak.kanitlar()).map((k) => [k.id, k.baslik]));
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
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Rapor bölümleri" className="lg:sticky lg:top-4 lg:self-start">
          <ol className="space-y-1 rounded-lg border border-cizgi bg-yuzey p-3">
            {rapor.bolumler.map((b, i) => {
              const bk = bolumKapsamasi(b);
              return (
                <li key={b.id}>
                  <a
                    href={`#${b.id}`}
                    className="flex min-h-11 items-center justify-between gap-2 rounded px-2 hover:bg-yuzey-2"
                  >
                    <span>
                      {i + 1}. {b.baslik}
                    </span>
                    <span className={`text-sm ${bk.eksik ? "font-bold text-risk-yuksek" : "text-soluk"}`}>
                      {bk.atifli}/{bk.toplam}
                      <span className="sr-only"> paragraf kanıtlı</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
        <article className="space-y-8 rounded-lg border border-cizgi bg-yuzey p-6">
          {rapor.bolumler.map((b, i) => (
            <section key={b.id} id={b.id} aria-labelledby={`${b.id}-b`} className="scroll-mt-4">
              <h2 id={`${b.id}-b`} className="flex flex-wrap items-center gap-2 text-xl font-bold">
                {i + 1}. {b.baslik} <Rozet>{b.olcut}</Rozet>
              </h2>
              <div className="mt-3 space-y-4">
                {b.paragraflar.map((p, j) => {
                  const eksik = p.eksik || p.atiflar.length === 0;
                  return (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: paragraflar sabit sıralı
                      key={j}
                      className={eksik ? "rounded border-l-4 border-risk-yuksek bg-risk-yuksek-zemin p-3" : ""}
                    >
                      <p className="max-w-prose text-lg">
                        {eksik ? (
                          <>
                            <EksikIsareti /> <span className="text-soluk">{p.metin}</span>
                          </>
                        ) : (
                          p.metin
                        )}
                      </p>
                      {p.atiflar.length ? (
                        <ul className="mt-1 flex flex-wrap gap-2" aria-label="Kanıt atıfları">
                          {p.atiflar.map((a) => (
                            <li key={`${a.kanitId}-${a.parcaId}`}>
                              <Link
                                href={`/panel/kanitlar/${a.kanitId}${a.parcaId ? `#${a.parcaId}` : ""}`}
                                className="inline-flex min-h-8 items-center gap-1 rounded-full border border-vurgu bg-vurgu-zemin px-3 text-sm font-semibold text-vurgu hover:underline"
                              >
                                <FileText aria-hidden className="size-4" />
                                {kanitAdlari[a.kanitId] ?? a.kanitId}
                                {a.capa?.sayfa ? `, s. ${a.capa.sayfa}` : ""}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </article>
      </div>
    </>
  );
}
