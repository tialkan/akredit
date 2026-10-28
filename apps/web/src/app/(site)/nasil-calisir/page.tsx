import type { Metadata } from "next";
import Link from "next/link";
import { AkisCizimi } from "../../../site/akis-cizimi.tsx";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { AKIS, ILKELER, RISKLER, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.nasil);

export default function NasilCalisir() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.nasil} />
      <SayfaBasi
        sayfa={SAYFALAR.nasil}
        ozet="Akredit işi ikiye böler. Hazırlığı sistem yapar, kararı yetkili kişi verir. Aradaki her adım kayıt altındadır."
      />
      <Bolum id="akis" baslik="Kanıttan günlüğe" not="Her öneri bu sırayla ilerler.">
        <AkisCizimi />
        <ol className="mt-8 divide-y divide-cizgi border-y border-cizgi">
          {AKIS.map((a, i) => (
            <li key={a.ad} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <p className="font-semibold">
                {i + 1}. {a.ad}
              </p>
              <p className="text-soluk">{a.metin}</p>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum id="riskler" baslik="Risk düzeyleri" not="Önerinin türü, nasıl onaylanacağını belirler." zemin>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">Öneri risk düzeyleri ve onay kuralları</caption>
            <thead>
              <tr className="border-b-2 border-cizgi-guclu">
                <th scope="col" className="py-2 pr-4">
                  Düzey
                </th>
                <th scope="col" className="py-2 pr-4">
                  Örnek
                </th>
                <th scope="col" className="py-2">
                  Nasıl onaylanır
                </th>
              </tr>
            </thead>
            <tbody>
              {RISKLER.map((r) => (
                <tr key={r.duzey} className="border-b border-cizgi align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {r.duzey}
                  </th>
                  <td className="py-3 pr-4">{r.ornek}</td>
                  <td className="py-3">{r.kural}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bolum>

      <Bolum id="yetki-devri" baslik="Yetki devri" not="Sık tekrarlanan işi otomatiğe bağlamak.">
        <Metin>
          <p>
            Kalite komisyonu başkanı ya da kurum yöneticisi, belirli türdeki düşük ve orta riskli önerilerin otomatik
            onaylanması için bir politika hazırlar. Politika önce taslaktır ve hiçbir şeye yetki vermez.
          </p>
          <p>
            Politika, yetkili kişi adını yazarak imzaladığında yürürlüğe girer. Kapsamı (öneri türleri, en yüksek risk,
            en düşük güven eşiği) yazılıdır ve imza günlüğe girer. Bu politikayla onaylanan her öneri, imzalayanın
            adıyla ve politikanın dayanak olarak gösterilmesiyle kaydedilir.
          </p>
          <p>
            İmzalayan kişi yetkisini yitirirse politika işlemez. İptal yeni bir kayıtla yapılır; eski kayıt silinmez.
            Yüksek riskli türler politika ekranında listelenmez bile.
          </p>
        </Metin>
      </Bolum>

      <Bolum
        id="ilkeler"
        baslik="Değişmez ilkeler"
        not="Kodla uygulanır. Kullanıcı ya da belge istese de esnemez."
        zemin
      >
        <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {ILKELER.map((i) => (
            <div key={i.ad} className="border-t border-cizgi pt-3">
              <dt className="font-semibold">{i.ad}</dt>
              <dd className="mt-1 text-soluk">{i.metin}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8">
          <Link href="/ne-yapar" className="font-semibold text-vurgu underline underline-offset-4">
            Modüllerin ne yaptığına bakın
          </Link>
        </p>
      </Bolum>
    </>
  );
}
