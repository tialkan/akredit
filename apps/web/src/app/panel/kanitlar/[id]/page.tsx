import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KirintiYolu, Rozet, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, panelVeriKaynagi } from "../../../../veri/sunucu.ts";
import { boyutYaz, islemeMetni, tarihYaz } from "../../../../veri/yardimci.ts";

export async function generateStaticParams() {
  // Gerçek veride sayfalar istek anında, oturumdaki kişinin yetkisiyle üretilir.
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).kanitlar()).map((k) => ({ id: k.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const a = await (await panelVeriKaynagi()).kanit((await params).id);
  return { title: a?.kanit.baslik ?? "Kanıt" };
}

export default async function KanitSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const ayrinti = await (await panelVeriKaynagi()).kanit((await params).id);
  if (!ayrinti) notFound();
  const { kanit, parcalar } = ayrinti;
  return (
    <>
      <KirintiYolu
        ogeler={[{ ad: "Panel", href: "/panel" }, { ad: "Kanıtlar", href: "/panel/kanitlar" }, { ad: kanit.baslik }]}
      />
      <SayfaBasligi baslik={kanit.baslik} aciklama={kanit.dosyaAdi} />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="metin-baslik" className="rounded-sm border border-cizgi bg-yuzey">
          <h2 id="metin-baslik" className="border-b border-cizgi px-5 py-3 text-lg font-semibold">
            Belgenin metni
          </h2>
          <ol className="divide-y divide-cizgi">
            {parcalar.map((p) => (
              <li key={p.id} id={p.id} className="scroll-mt-4 px-5 py-4 target:bg-vurgu-zemin">
                <a href={`#${p.id}`} className="text-sm font-semibold text-soluk underline underline-offset-2">
                  Sayfa {p.capa.sayfa}
                  <span className="sr-only"> bağlantısı</span>
                </a>
                <p className="mt-1 max-w-prose text-lg">{p.metin}</p>
              </li>
            ))}
          </ol>
        </section>
        <aside aria-label="Kanıt bilgileri" className="space-y-4">
          <div className="rounded-sm border border-cizgi bg-yuzey p-4">
            <h2 className="font-semibold">Bağlı ölçütler</h2>
            <p className="mt-2 flex flex-wrap gap-1">
              {kanit.olcutler.map((o) => (
                <Rozet key={o} vurgulu>
                  {o}
                </Rozet>
              ))}
            </p>
          </div>
          <dl className="space-y-2 rounded-sm border border-cizgi bg-yuzey p-4 text-sm">
            <div>
              <dt className="font-semibold">Belge tarihi</dt>
              <dd>{kanit.belgeTarihi ? tarihYaz(kanit.belgeTarihi) : "Bilinmiyor"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Eklenme</dt>
              <dd>{tarihYaz(kanit.eklenme)}</dd>
            </div>
            {kanit.isleme ? (
              <div>
                <dt className="font-semibold">İşleme durumu</dt>
                <dd>{islemeMetni(kanit.isleme)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="font-semibold">Boyut</dt>
              <dd>{boyutYaz(kanit.boyut)}</dd>
            </div>
            <div>
              <dt className="font-semibold">İçerik özeti</dt>
              <dd className="font-mono break-all text-soluk">{kanit.ozet}</dd>
            </div>
          </dl>
          <p className="text-sm text-soluk">
            Bu dosya değiştirilemez. Yeni sürüm yüklenirse ayrı kayıt olarak eklenir.
          </p>
        </aside>
      </div>
    </>
  );
}
