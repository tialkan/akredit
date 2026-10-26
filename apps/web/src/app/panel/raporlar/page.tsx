import type { Metadata } from "next";
import Link from "next/link";
import { Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { veriKaynagi } from "../../../veri/bellek.ts";
import { raporKapsamasi } from "./kapsama.ts";

export const metadata: Metadata = { title: "Raporlar" };

export default async function RaporlarSayfasi() {
  const raporlar = await veriKaynagi().raporlar();
  return (
    <>
      <SayfaBasligi
        baslik="Raporlar"
        aciklama="Taslak raporlar. Kanıta bağlanamayan paragraflar EKSİK olarak işaretlidir."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {raporlar.map((r) => {
          const k = raporKapsamasi(r);
          return (
            <li key={r.id} className="rounded-lg border border-cizgi bg-yuzey p-5">
              <h2 className="text-lg font-semibold">
                <Link href={`/panel/raporlar/${r.id}`} className="text-vurgu underline underline-offset-2">
                  {r.ad}
                </Link>
              </h2>
              <p className="mt-1 text-soluk">
                {r.donem} · {r.bolumler.length} bölüm
              </p>
              <p className="mt-3 flex flex-wrap gap-2">
                <Rozet vurgulu>{r.durum === "taslak" ? "Taslak" : "İncelemede"}</Rozet>
                <Rozet>
                  {k.atifli} / {k.toplam} paragraf kanıtlı
                </Rozet>
                {k.eksik > 0 ? <Rozet>{k.eksik} EKSİK</Rozet> : null}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
