import type { Metadata } from "next";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { Kart, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import type { SurecGorevi } from "../../../veri/kaynak.ts";
import { panelSimdi, panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { gunFarki, tarihYaz } from "../../../veri/yardimci.ts";

export const metadata: Metadata = { title: "Takvim ve görevler" };

const DURUM: Record<SurecGorevi["durum"], string> = { bekliyor: "Bekliyor", devam: "Sürüyor", tamam: "✓ Tamamlandı" };
const AYLAR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

export default async function SureclerSayfasi() {
  const gorevler = await (await panelVeriKaynagi()).surecler();
  const aylar = new Map<string, SurecGorevi[]>();
  for (const g of [...gorevler].sort((a, b) => a.sonTarih.localeCompare(b.sonTarih))) {
    const anahtar = g.sonTarih.slice(0, 7);
    aylar.set(anahtar, [...(aylar.get(anahtar) ?? []), g]);
  }
  return (
    <>
      <SayfaBasligi baslik="Takvim ve görevler" aciklama="Kalite süreçlerinin son tarihleri ve sorumluları." />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Kart baslik="Takvim">
          <ol className="space-y-4">
            {[...aylar].map(([ay, liste]) => (
              <li key={ay}>
                <h3 className="font-semibold">
                  {AYLAR[Number(ay.slice(5, 7)) - 1]} {ay.slice(0, 4)}
                </h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {liste.map((g) => (
                    <li key={g.id} className={g.durum === "tamam" ? "text-soluk line-through" : ""}>
                      <span className="font-semibold">{Number(g.sonTarih.slice(8, 10))}</span> {g.baslik}
                      {g.durum === "tamam" ? <span className="sr-only"> (tamamlandı)</span> : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </Kart>
        <Tablo
          baslik="Görev listesi"
          sutunlar={[
            { anahtar: "baslik", baslik: "Görev", siralanabilir: true, satirBasligi: true },
            { anahtar: "son", baslik: "Son tarih", siralanabilir: true },
            { anahtar: "sorumlu", baslik: "Sorumlu", siralanabilir: true },
            { anahtar: "durum", baslik: "Durum", siralanabilir: true },
          ]}
          satirlar={gorevler.map((g) => {
            const kalan = gunFarki(panelSimdi(), g.sonTarih);
            return {
              anahtar: g.id,
              degerler: { baslik: g.baslik, son: g.sonTarih, sorumlu: g.sorumlu, durum: DURUM[g.durum] },
              hucreler: {
                baslik: (
                  <>
                    {g.baslik}
                    <span className="block text-sm font-normal text-soluk">{g.ilgili}</span>
                  </>
                ),
                son: (
                  <>
                    {tarihYaz(g.sonTarih)}
                    {g.durum !== "tamam" ? (
                      <span className={`block text-sm ${kalan <= 7 ? "font-semibold text-risk-yuksek" : "text-soluk"}`}>
                        {kalan < 0 ? `${-kalan} gün gecikti` : `${kalan} gün kaldı`}
                      </span>
                    ) : null}
                  </>
                ),
                sorumlu: g.sorumlu,
                durum: DURUM[g.durum],
              },
            };
          })}
        />
      </div>
    </>
  );
}
