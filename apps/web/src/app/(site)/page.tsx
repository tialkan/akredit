import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Bolum, YapisalVeri } from "../../site/bilesenler.tsx";
import { AKIS, DURUM_NOTU, INSANIN_ISI, SAYFALAR, SISTEMIN_ISI } from "../../site/icerik.ts";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

/** Sitenin imza öğesi: değiştirilemez günlükteki bir onay kaydının görünümü (kurgu veri). */
function OrnekKayit() {
  return (
    <figure className="rounded-sm border border-cizgi-guclu bg-yuzey">
      <figcaption className="flex items-center justify-between border-b border-cizgi px-4 py-2 text-sm text-soluk">
        <span>Günlük kaydı</span>
        <span>Örnek, kurgu veri</span>
      </figcaption>
      <dl className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-2 px-4 py-4 text-[0.95rem]">
        <dt className="text-soluk">Öneri</dt>
        <dd>BP101 ders dosyası, 2026 Güz</dd>
        <dt className="text-soluk">Dayanak</dt>
        <dd>
          Not dökümü, sayfa 1<span className="block text-sm text-soluk">özet 3f9a…c21e</span>
        </dd>
        <dt className="text-soluk">Hesap</dt>
        <dd>ÇK1 sağlanma düzeyi ölçme motorundan</dd>
        <dt className="text-soluk">Karar</dt>
        <dd className="font-semibold text-petrol">
          <svg aria-hidden viewBox="0 0 16 16" className="mr-1 inline size-4 align-[-2px]">
            <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          Onaylandı
        </dd>
        <dt className="text-soluk">Onaylayan</dt>
        <dd>Dr. Öğr. Üyesi Deniz Örnek</dd>
        <dt className="text-soluk">Zaman</dt>
        <dd>12.01.2027 14:32</dd>
      </dl>
      <p className="border-t border-cizgi px-4 py-2 text-sm text-soluk">Bu kayıt silinemez ve değiştirilemez.</p>
    </figure>
  );
}

export default function AnaSayfa() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.ana} />
      <section className="border-b border-cizgi">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 pt-10 pb-14 sm:pt-16 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
          <div>
            <p className="font-semibold text-soluk">Üniversiteler için kalite güvencesi ve akreditasyon</p>
            <h1 className="mt-4 text-[2.25rem] leading-[1.08] font-bold tracking-[-0.025em] text-vurgu sm:text-[3.4rem]">
              {SAYFALAR.ana.baslik}
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg">
              Akredit, kalite güvencesi ve akreditasyon için gereken kanıtı toplar, sayıları hesaplar ve raporu kanıta
              atıf vererek yazar. Öğretim elemanına kalan iş, önüne gelen önerileri kanıtıyla görüp onaylamaktır.
            </p>
            <p className="mt-4 max-w-[56ch] text-soluk">
              Açık kaynaktır. İlk etapta ücretsizdir; yapay zekâ için kurum kendi anahtarını getirir.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/nasil-calisir" className={dugmeSinifi("birincil", "orta", "rounded-sm")}>
                Nasıl çalıştığını okuyun
              </Link>
              <Link
                href="/panel/onaylar"
                className="inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4"
              >
                Örnek onay kutusunu açın
              </Link>
            </div>
            <p className="mt-6 max-w-[56ch] text-sm text-soluk">{DURUM_NOTU}</p>
          </div>
          <OrnekKayit />
        </div>
      </section>

      <Bolum id="is-bolumu" baslik="İşin bölümü" not="Kim ne yapar, açıkça.">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="text-lg font-semibold">Sistemin yaptığı</h3>
            <table className="mt-3 w-full text-left">
              <caption className="sr-only">Sistemin yaptığı işler</caption>
              <tbody>
                {SISTEMIN_ISI.map((s) => (
                  <tr key={s.is} className="border-t border-cizgi align-top">
                    <th scope="row" className="w-36 py-3 pr-4 font-semibold">
                      {s.is}
                    </th>
                    <td className="py-3 text-soluk">{s.ayrinti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-sm border border-vurgu bg-vurgu-zemin p-5">
            <h3 className="text-lg font-semibold text-vurgu">Size kalan</h3>
            <ul className="mt-3 space-y-3">
              {INSANIN_ISI.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </Bolum>

      <Bolum id="akis" baslik="Bir önerinin yolu" not="Her öneri aynı altı adımdan geçer." zemin>
        <ol className="grid gap-px overflow-hidden rounded-sm border border-cizgi bg-cizgi sm:grid-cols-2 lg:grid-cols-3">
          {AKIS.map((a, i) => (
            <li key={a.ad} className="bg-yuzey p-5">
              <p className="text-sm text-soluk">Adım {i + 1}</p>
              <p className={`mt-1 text-lg font-semibold ${a.ad === "Onay" ? "text-petrol" : ""}`}>{a.ad}</p>
              <p className="mt-1 text-soluk">{a.metin}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5">
          <Link href="/nasil-calisir" className="font-semibold text-vurgu underline underline-offset-4">
            Akışın ayrıntısı, risk düzeyleri ve yetki devri
          </Link>
        </p>
      </Bolum>

      <Bolum id="kazanc" baslik="Ne kazandırır" not="Hedef, ölçülebilir biçimde yazılıdır.">
        <div className="metin-sayfa [&>*:first-child]:mt-0">
          <p>
            Bologna sayfası, ders dosyası, ÇK ve PÇ hesabı, anket analizi, tutanak ve öz değerlendirme raporu bugün
            dönem başına saatler alıyor. Bu işin büyük kısmı veri taşıma, hesap ve yazımdır.
          </p>
          <p>
            Projenin hedefi, öğretim elemanının dönemlik kalite işini yalnız kararlardan oluşan 15 dakikanın altına
            indirmektir. Bu bir hedeftir, ölçülmüş bir sonuç değildir. Pilot uygulamada onay ekranında geçen süreyle
            ölçülecektir.
          </p>
        </div>
      </Bolum>

      <Bolum id="sayfalar" baslik="Ayrıntılar" zemin>
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {[
            SAYFALAR.neYapar,
            SAYFALAR.kimler,
            SAYFALAR.cerceveler,
            SAYFALAR.yz,
            SAYFALAR.giris,
            SAYFALAR.guvenlik,
            SAYFALAR.sinirlar,
            SAYFALAR.sss,
          ].map((s) => (
            <li key={s.yol} className="border-t border-cizgi py-4">
              <Link href={s.yol} className="text-lg font-semibold text-vurgu underline-offset-4 hover:underline">
                {s.ad}
              </Link>
              <p className="mt-1 text-soluk">{s.aciklama}</p>
            </li>
          ))}
        </ul>
      </Bolum>
    </>
  );
}
