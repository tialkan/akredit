import type { Metadata } from "next";
import Link from "next/link";
import { Kart, Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { tarihYaz } from "../../../veri/yardimci.ts";
import { type Toplanti, toplantilariGetir } from "./veri.ts";

export const metadata: Metadata = { title: "Toplantılar" };

const DURUM: Record<Toplanti["durum"], string> = {
  planlandi: "Planlandı",
  taslak_onayda: "Tutanak onayınızı bekliyor",
  kesinlesti: "✓ Tutanak onaylandı",
};

export default async function ToplantilarSayfasi() {
  const liste = await toplantilariGetir();
  return (
    <>
      <SayfaBasligi
        baslik="Toplantılar"
        aciklama="Gündem açık eylemlerden ve eksik işlerden hazırlanır. Tutanak taslağı yalnız toplantı notundaki ya da kaydındaki kararlardan yazılır; siz onaylayınca kesinleşir ve kararlar eyleme dönüşür."
      />
      {liste.length === 0 ? (
        <p>Henüz toplantı yok.</p>
      ) : (
        <ul className="space-y-6">
          {liste.map((t) => (
            <li key={t.id}>
              <Kart baslik={t.baslik}>
                <p>
                  {tarihYaz(t.zaman)} · {t.katilimciSayisi} katılımcı ·{" "}
                  <Rozet vurgulu={t.durum === "taslak_onayda"}>{DURUM[t.durum]}</Rozet>
                </p>
                <h3 className="mt-3 font-semibold">Gündem</h3>
                <ol className="mt-1 list-decimal space-y-1 pl-6">
                  {t.gundem.map((m) => (
                    <li key={m.sira}>
                      {m.baslik}
                      {m.gecikmis ? <span className="ml-2 font-semibold">(süresi geçti)</span> : null}
                    </li>
                  ))}
                </ol>
                {t.durum === "taslak_onayda" ? (
                  <p className="mt-3">
                    <Link className="underline" href="/panel/onaylar">
                      Tutanak taslağını incele ve onayla
                    </Link>
                  </p>
                ) : null}
              </Kart>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
