import { CalendarDays, Clock } from "lucide-react";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Kart, RiskSimgesi, SayfaBasligi } from "../../bilesenler/temel.tsx";
import { ORNEK_SIMDI } from "../../veri/ornek.ts";
import { panelVeriKaynagi } from "../../veri/sunucu.ts";
import { gunFarki, RISK_ETIKETI, RISK_SIRASI, sureYaz, tarihYaz } from "../../veri/yardimci.ts";

const RENK = {
  dusuk: { metin: "text-risk-dusuk" },
  orta: { metin: "text-risk-orta" },
  yuksek: { metin: "text-risk-yuksek" },
} as const;

export default async function PanelAnaSayfa() {
  const ozet = await (await panelVeriKaynagi()).panelOzeti();
  const toplam = ozet.bekleyen.dusuk + ozet.bekleyen.orta + ozet.bekleyen.yuksek;
  const enCokKanit = Math.max(1, ...ozet.kapsama.map((k) => k.kanitSayisi));
  return (
    <>
      <SayfaBasligi baslik="Genel bakış" aciklama={`Bugün ${toplam} karar sizi bekliyor.`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Kart
          baslik="Bekleyen kararlar"
          className="lg:col-span-2"
          eylem={
            <Link href="/panel/onaylar" className={dugmeSinifi("birincil", "kucuk")}>
              Onay kutusuna git
            </Link>
          }
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {RISK_SIRASI.map((r) => (
              <li key={r} className="rounded-sm border border-cizgi bg-yuzey-2 p-4">
                <p className={`flex items-center gap-1 font-semibold ${RENK[r].metin}`}>
                  <RiskSimgesi risk={r} />
                  {RISK_ETIKETI[r]}
                </p>
                <p className="text-3xl font-bold">{ozet.bekleyen[r]}</p>
                <p className="text-sm text-soluk">{r === "yuksek" ? "Tek tek incelenir" : "Toplu onaylanabilir"}</p>
              </li>
            ))}
          </ul>
        </Kart>
        <Kart baslik="Bu dönem harcadığınız süre">
          <p className="flex items-center gap-2 text-3xl font-bold">
            <Clock aria-hidden className="size-7 text-vurgu" />
            {sureYaz(ozet.harcananDakika)}
          </p>
          <p className="mt-2 text-soluk">
            {ozet.kararSayisi} karar verdiniz. Süre, karar başına ortalama inceleme süresinden hesaplanır.
          </p>
        </Kart>
        <Kart baslik="Yaklaşan son tarihler" className="lg:col-span-2">
          <ul className="divide-y divide-cizgi">
            {ozet.yaklasanlar.map((g) => {
              const kalan = gunFarki(ORNEK_SIMDI, g.sonTarih);
              return (
                <li key={g.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                  <CalendarDays aria-hidden className="size-5 text-soluk" />
                  <span className="flex-1 font-semibold">{g.baslik}</span>
                  <span className="text-soluk">{tarihYaz(g.sonTarih)}</span>
                  <span className={`text-sm font-semibold ${kalan <= 7 ? "text-risk-yuksek" : "text-soluk"}`}>
                    {kalan < 0 ? `${-kalan} gün gecikti` : kalan === 0 ? "Bugün" : `${kalan} gün kaldı`}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3">
            <Link href="/panel/surecler" className="font-semibold text-vurgu underline underline-offset-4">
              Bütün takvim
            </Link>
          </p>
        </Kart>
        <Kart baslik="Ölçüt kapsaması">
          <p className="mb-3 text-sm text-soluk">Her ölçüte bağlı kanıt sayısı (örnek ölçüt kodları).</p>
          <ul className="space-y-2">
            {ozet.kapsama.map((k) => (
              <li key={k.olcut} className="grid grid-cols-[3rem_1fr_2rem] items-center gap-2">
                <span className="font-semibold">{k.olcut}</span>
                <span aria-hidden className="h-3 rounded bg-yuzey-2">
                  <span
                    className="block h-3 rounded bg-vurgu"
                    style={{ width: `${(k.kanitSayisi / enCokKanit) * 100}%` }}
                  />
                </span>
                <span className="text-right">
                  {k.kanitSayisi}
                  <span className="sr-only"> kanıt</span>
                </span>
              </li>
            ))}
          </ul>
        </Kart>
      </div>
    </>
  );
}
