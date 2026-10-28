import { EYLEMLER, KURUM_DUZEYI_EYLEMLER, ROL_EYLEMLERI, ROLLER } from "@akredit/yetki";
import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, SayfaBasi, Tanimlar, YapisalVeri } from "../../../site/bilesenler.tsx";
import { DONEM_AKISI, DORT_ROL, EYLEM_ADI, ROL_ADI, SAYFALAR, SORUMLULUK } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kimler);

/** Öğretim elemanının dokunuşları: örnek dönem akışında hocaya kalan adımlar. */
const DOKUNUSLAR = DONEM_AKISI.filter((a) => a.dokunus > 0);

export default function KimlerIcin() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.kimler} />
      <SayfaBasi
        sayfa={SAYFALAR.kimler}
        ozet="Akredit dört karar vericiye dört ayrı soruyla bakar. Evrak işini sistem yapar; her role kendi kararı kalır. Herkes yalnız kendi kapsamını görür."
      >
        <nav aria-label="Roller" className="mt-8">
          <ul className="flex flex-wrap gap-2 text-sm">
            {DORT_ROL.map((r) => (
              <li key={r.kimlik}>
                <a
                  href={`#${r.kimlik}`}
                  className="inline-flex min-h-11 items-center rounded-sm border border-cizgi px-3 transition-colors duration-150 hover:border-vurgu hover:text-vurgu"
                >
                  {r.ad}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </SayfaBasi>
      {DORT_ROL.map((r, i) => (
        <Bolum key={r.kimlik} id={r.kimlik} baslik={r.ad} not={r.soru} zemin={i % 2 === 1}>
          <Tanimlar ogeler={r.maddeler.map((m) => ({ ad: m.baslik, deger: m.metin }))} />
          {r.kimlik === "ogretim-elemani" ? (
            <div className="mt-8">
              <h3 className="text-lg font-semibold">Ne zaman bir dokunuş</h3>
              <ol className="mt-3 border-b border-cizgi">
                {DOKUNUSLAR.map((a) => (
                  <li key={a.zaman} className="grid gap-1 border-t border-cizgi py-3 sm:grid-cols-[10rem_1fr] sm:gap-6">
                    <p className="font-semibold text-vurgu">{a.zaman}</p>
                    <p>
                      {a.hoca} <span className="whitespace-nowrap text-sm text-soluk">({a.dokunus} dokunuş)</span>
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-soluk">
                Zamanlar örnektir, kurumun süreç takvimi belirler. Akışın tamamı{" "}
                <Link href="/#donem" className="font-semibold text-vurgu underline underline-offset-4">
                  ana sayfada
                </Link>
                .
              </p>
            </div>
          ) : null}
          <div className="mt-8 rounded-sm border border-cizgi-guclu bg-yuzey p-5">
            <p className="font-semibold text-petrol">Size kalan karar</p>
            <p className="mt-1">{r.karar}</p>
            <p className="mt-3 text-sm text-soluk">Sistemdeki rol: {r.roller.map((x) => ROL_ADI[x]).join(", ")}.</p>
          </div>
        </Bolum>
      ))}
      <Bolum id="sorumluluk" baslik="Sorumluluk" not="Bütün roller için aynı kural.">
        <p className="max-w-[62ch]">{SORUMLULUK}</p>
        <p className="mt-4 max-w-[62ch] text-soluk">
          Dış değerlendirici kuruma süreli, salt okunur bir hesapla katılır ve karar veremez. Gözlemci yalnız kanıt ve
          rapor okur.
        </p>
      </Bolum>
      <Bolum
        id="matris"
        baslik="Yetki tablosu"
        not="Tablo, sistemin kullandığı yetki tanımından doğrudan üretilir. Kapsam ayrıca denetlenir."
        zemin
      >
        {/* Kaydırılan bölge klavyeyle odaklanabilmeli (WCAG 2.1.1, axe scrollable-region-focusable). */}
        <section
          className="overflow-x-auto rounded-sm border border-cizgi bg-yuzey"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılabilir tablo klavyeyle kaydırılır
          tabIndex={0}
          aria-label="Yetki tablosu, yatay kaydırılabilir"
        >
          <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
            <caption className="sr-only">Rollere göre izin verilen işlemler</caption>
            <thead className="bg-zemin">
              <tr>
                <th scope="col" className="sticky left-0 bg-zemin px-3 py-2">
                  İşlem
                </th>
                {ROLLER.map((r) => (
                  <th key={r} scope="col" className="px-2 py-2 align-bottom font-semibold">
                    {ROL_ADI[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EYLEMLER.map((e) => (
                <tr key={e} className="border-t border-cizgi">
                  <th scope="row" className="sticky left-0 bg-yuzey px-3 py-2 font-normal">
                    {EYLEM_ADI[e] ?? e}
                    {KURUM_DUZEYI_EYLEMLER.has(e) ? (
                      <span className="block text-xs text-soluk">yalnız kurum düzeyinde</span>
                    ) : null}
                  </th>
                  {ROLLER.map((r) => {
                    const var_ = ROL_EYLEMLERI[r].has(e);
                    return (
                      <td key={r} className="px-2 py-2 text-center">
                        {var_ ? (
                          <span className="font-semibold text-vurgu">Evet</span>
                        ) : (
                          <span className="text-soluk">Hayır</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <p className="mt-4 text-soluk">
          API anahtarıyla çalışan araçlar kişinin rolleriyle sınırlıdır ve karar veremez.
        </p>
      </Bolum>
    </>
  );
}
