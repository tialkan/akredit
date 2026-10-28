import type { Metadata } from "next";
import Link from "next/link";
import { AkisCizimi } from "../../../site/akis-cizimi.tsx";
import {
  Bolum,
  Dayanak,
  Dayanaklar,
  DonemCizelgesi,
  Metin,
  SayfaBasi,
  YapisalVeri,
} from "../../../site/bilesenler.tsx";
import { AKIS, type DayanakKaynagi, DONEM_AKISI, depo, ILKELER, RISKLER, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.nasil);

const DAYANAKLAR: DayanakKaynagi[] = [
  {
    baslik: "Öneri ve karar akışı; yalnız ekleme yapılan, özet zinciriyle bağlı günlük: değişmezlik kararı.",
    adres: depo("docs/adr/0002-veritabani-ve-degismezlik.md"),
  },
  {
    baslik: "Risk sınıfları ve insan kararı: sıfır iş yükü kararı.",
    adres: depo("docs/adr/0004-sifir-is-yuku-ve-insan-karari.md"),
  },
  { baslik: "Yetki devri politikası: imza ve iptal.", adres: depo("packages/servis/src/politika.ts") },
  {
    baslik: "Bir dönemin adımları: süreç, Bologna, ders dosyası, anket, toplantı ve rapor iş paketlerinin raporları.",
    adres: depo("docs/raporlar"),
  },
  { baslik: "Değişmez ilkeler.", adres: depo("CLAUDE.md") },
];

export default function NasilCalisir() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.nasil} />
      <SayfaBasi
        sayfa={SAYFALAR.nasil}
        ozet="Akredit işi ikiye böler. Hazırlığı sistem yapar, kararı yetkili kişi verir. Aradaki her adım kayıt altındadır."
        kunye={[
          { deger: AKIS.length, ad: "adım: kanıttan günlüğe", dayanak: 1 },
          { deger: RISKLER.length, ad: "risk düzeyi", dayanak: 2 },
          { deger: ILKELER.length, ad: "değişmez ilke", dayanak: 5 },
          { deger: DONEM_AKISI.reduce((t, a) => t + a.dokunus, 0), ad: "dokunuş: örnek bir dönemde", dayanak: 4 },
        ]}
      />
      <Bolum no={1} id="akis" baslik="Kanıttan günlüğe" not="Her öneri bu sırayla ilerler.">
        <p className="mb-6 max-w-[62ch]">
          Bir öneri altı adımdan geçer. Her adımın çıktısı bir sonrakinin girdisidir ve kayıtlıdır.
          <Dayanak n={1} tekrar />
        </p>
        <AkisCizimi />
        <ol className="mt-8 divide-y divide-cizgi border-y border-cizgi">
          {AKIS.map((a, i) => (
            <li key={a.ad} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
              <p className="font-semibold">
                <span className="paragraf-no">{i + 1}.</span> {a.ad}
              </p>
              <p className="text-soluk">{a.metin}</p>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum
        no={2}
        id="donem"
        baslik="Bir dönemi baştan sona izleyin"
        not="Sistemin yaptığı ve hocaya kalan, zaman sırasıyla."
        zemin
      >
        <p className="mb-6 max-w-[62ch]">
          Aşağıdaki çizelge bir öğretim elemanının bir dönemini gösterir. Sağ sütun hocanın bütün işidir.
          <Dayanak n={4} tekrar />
        </p>
        <DonemCizelgesi adimlar={DONEM_AKISI} />
      </Bolum>

      <Bolum no={3} id="riskler" baslik="Risk düzeyleri" not="Önerinin türü, nasıl onaylanacağını belirler.">
        <p className="mb-4 max-w-[62ch]">
          Her öneri türünün sabit bir risk düzeyi vardır. Düzey, onayın biçimini belirler.
          <Dayanak n={2} tekrar />
        </p>
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

      <Bolum no={4} id="yetki-devri" baslik="Yetki devri" not="Sık tekrarlanan işi otomatiğe bağlamak." zemin>
        <Metin>
          <p>
            Kalite komisyonu başkanı ya da kurum yöneticisi, belirli türdeki düşük ve orta riskli önerilerin otomatik
            onaylanması için bir politika hazırlar. Politika önce taslaktır ve hiçbir şeye yetki vermez.
            <Dayanak n={3} />
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
        no={5}
        id="ilkeler"
        baslik="Değişmez ilkeler"
        not={
          <>
            Kodla uygulanır. Kullanıcı ya da belge istese de esnemez.
            <Dayanak n={5} tekrar />
          </>
        }
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
      <Dayanaklar ogeler={DAYANAKLAR} />
    </>
  );
}
