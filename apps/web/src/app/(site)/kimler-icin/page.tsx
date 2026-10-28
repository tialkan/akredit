import { EYLEMLER, KURUM_DUZEYI_EYLEMLER, ROL_EYLEMLERI, ROLLER } from "@akredit/yetki";
import type { Metadata } from "next";
import { Bolum, SayfaBasi, Tanimlar, YapisalVeri } from "../../../site/bilesenler.tsx";
import { EYLEM_ADI, ROL_ADI, ROL_ANLATIMLARI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kimler);

export default function KimlerIcin() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.kimler} />
      <SayfaBasi
        sayfa={SAYFALAR.kimler}
        ozet="Herkes yalnız kendi kapsamını görür: ders, program, birim ya da kurum. Bir kurumun kullanıcısı başka kurumun hiçbir kaydını göremez."
      />
      {ROL_ANLATIMLARI.map((r, i) => (
        <Bolum
          key={r.ad}
          id={`rol-${i}`}
          baslik={r.ad}
          not={r.roller.map((x) => ROL_ADI[x]).join(", ")}
          zemin={i % 2 === 1}
        >
          <Tanimlar
            ogeler={[
              { ad: "Ne görür", deger: r.gorur },
              { ad: "Ne yapar", deger: r.yapar },
            ]}
          />
        </Bolum>
      ))}
      <Bolum
        id="matris"
        baslik="Yetki tablosu"
        not="Tablo, sistemin kullandığı yetki tanımından doğrudan üretilir. Kapsam ayrıca denetlenir."
      >
        {/* Kaydırılan bölge klavyeyle odaklanabilmeli (WCAG 2.1.1, axe scrollable-region-focusable). */}
        <section
          className="overflow-x-auto rounded-sm border border-cizgi"
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
          Gözlemci yalnız kanıt ve rapor okur. API anahtarıyla çalışan araçlar kişinin rolleriyle sınırlıdır ve karar
          veremez.
        </p>
      </Bolum>
    </>
  );
}
