import type { Metadata } from "next";
import { Tablo } from "../../../../bilesenler/tablo.tsx";
import { Kart, KirintiYolu, SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI } from "../../../../veri/sunucu.ts";
import { tarihYaz } from "../../../../veri/yardimci.ts";
import { programDenetimleri } from "../_bologna/veri.ts";
import { OkumaFormu } from "./okuma-formu.tsx";

export const metadata: Metadata = { title: "Bologna denetimi" };

const DEGISIM: Record<string, string> = {
  iyilesti: "İyileşti",
  kotulesti: "Kötüleşti",
  ayni: "Değişmedi",
  yeni: "İlk okuma",
};

const sayilar = (x: { hata: number; uyari: number } | null) => (x ? `${x.hata} hata, ${x.uyari} uyarı` : "—");

export default async function BolognaDenetimiSayfasi() {
  const programlar = await programDenetimleri();
  return (
    <>
      <KirintiYolu
        ogeler={[
          { ad: "Panel", href: "/panel" },
          { ad: "Dersler", href: "/panel/dersler" },
          { ad: "Bologna denetimi" },
        ]}
      />
      <SayfaBasligi
        baslik="Bologna denetimi"
        aciklama="Programdaki bütün derslerin ders bilgi paketleri kurallardan geçirilir. Her okuma kanıt olarak saklanır; son iki okuma ders ders karşılaştırılır."
      />
      {programlar.length === 0 ? <p>Görebildiğiniz program yok.</p> : null}
      <div className="space-y-6">
        {programlar.map((p) => (
          <Kart key={p.id} baslik={p.ad}>
            <p>
              {p.denetim.okuma
                ? `Son okuma: ${tarihYaz(p.denetim.okuma.okundu)}${p.denetim.oncekiOkuma ? ` · önceki: ${tarihYaz(p.denetim.oncekiOkuma.okundu)}` : ""}`
                : "Bu programın Bologna sayfaları henüz okunmadı."}
            </p>
            <OkumaFormu programId={p.id} gercek={GERCEK_VERI} />
            {p.denetim.dersler.length ? (
              <div className="mt-4">
                <Tablo
                  baslik="Ders ders önce ve sonra"
                  sutunlar={[
                    { anahtar: "kod", baslik: "Ders", siralanabilir: true, satirBasligi: true },
                    { anahtar: "once", baslik: "Önceki okuma" },
                    { anahtar: "sonra", baslik: "Son okuma", siralanabilir: true },
                    { anahtar: "degisim", baslik: "Durum" },
                  ]}
                  satirlar={p.denetim.dersler.map((d) => ({
                    anahtar: d.kod,
                    degerler: { kod: d.kod, sonra: d.sonra.hata * 1000 + d.sonra.uyari },
                    hucreler: {
                      kod: d.kod,
                      once: sayilar(d.once),
                      sonra: sayilar(d.sonra),
                      degisim: DEGISIM[d.degisim],
                    },
                  }))}
                />
              </div>
            ) : null}
            {p.denetim.bulgular.length ? (
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Bütün bulgular ({p.denetim.bulgular.length})</summary>
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  {p.denetim.bulgular.map((b) => (
                    <li key={`${b.konu}-${b.kural}-${b.aciklama}`}>
                      <span className="font-semibold">{b.konu}</span> · {b.duzey === "hata" ? "Hata" : "Uyarı"}:{" "}
                      {b.aciklama}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </Kart>
        ))}
      </div>
    </>
  );
}
