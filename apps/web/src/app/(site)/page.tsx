import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Bolum, Dayanak, Dayanaklar, DonemCizelgesi, YapisalVeri } from "../../site/bilesenler.tsx";
import { AKIS, DONEM_AKISI, DURUM_NOTU, INSANIN_ISI, SAYFALAR, SISTEMIN_ISI } from "../../site/icerik.ts";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

const DAYANAKLAR = [
  "Değişmez ilke 1 ve 2: CLAUDE.md. Atıf denetimi packages/cekirdek, sayılar packages/olcme.",
  "Risk sınıfları ve devredilemeyen kararlar: packages/cekirdek (ONERI_RISKI), docs/adr/0004.",
  "Yapay zekâ anahtarı: packages/servis/src/politika.ts (VARSAYILAN_OPENROUTER_MODELI), packages/yz/src/anahtar-kasasi.ts.",
  "Değiştirilemez günlük: packages/vt (yalnız ekleme tetikleyicileri), docs/adr/0002-veritabani-ve-degismezlik.md.",
  "Bir dönemin adımları: docs/raporlar/IP-14, IP-15, IP-16, IP-17, IP-18, IP-19, IP-20.",
];

/** Değiştirilemez günlükteki bir onay kaydının görünümü (kurgu veri). */
function OrnekKayit() {
  return (
    <figure className="rounded-sm border border-cizgi-guclu bg-yuzey">
      <figcaption className="flex items-center justify-between gap-4 border-b border-cizgi px-4 py-2 text-sm text-soluk">
        <span>Günlük kaydı</span>
        <span>Örnek, kurgu veri</span>
      </figcaption>
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 px-4 py-4 text-[0.95rem] sm:grid-cols-[7.5rem_1fr]">
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
      <section className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 pt-10 pb-14 sm:pt-16 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <p className="text-lg text-soluk">
              Üniversiteler için açık kaynak kalite güvencesi ve akreditasyon yazılımı.
            </p>
            <h1 className="mt-4 text-[2.3rem] leading-[1.1] tracking-[-0.02em] text-vurgu sm:text-[3.5rem]">
              {SAYFALAR.ana.baslik}
            </h1>
            <p className="mt-6 max-w-[58ch] text-lg">
              Akredit kanıtı kurumun sistemlerinden toplar, sayıları hesaplar ve raporu her cümlesine kaynak göstererek
              yazar.
              <Dayanak n={1} /> Öğretim elemanına kalan iş, önüne gelen önerileri kanıtıyla görüp onaylamaktır. Olgunluk
              düzeyi ve dış kuruma gönderim gibi kararlar hiçbir zaman otomatik verilmez.
              <Dayanak n={2} />
            </p>
            <p className="mt-4 max-w-[58ch] text-soluk">
              İlk etapta ücretsizdir. Yapay zekâ için kurum kendi OpenRouter anahtarını bir kez girer; kullanım ücreti
              kurumun hesabına yansır.
              <Dayanak n={3} />
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/nasil-calisir" className={dugmeSinifi("birincil", "orta", "rounded-sm")}>
                Nasıl çalıştığını okuyun
              </Link>
              <Link
                href="/kurum-ac"
                className="inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4"
              >
                Kurumunuzu açın
              </Link>
              <Link
                href="/panel/onaylar"
                className="inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4"
              >
                Örnek onay kutusunu açın
              </Link>
            </div>
          </div>
          <div>
            <OrnekKayit />
            <p className="mt-3 text-sm text-soluk">
              Her karar adla, zamanla ve dayanağıyla bu biçimde günlüğe eklenir.
              <Dayanak n={4} />
            </p>
          </div>
        </div>
      </section>

      <Bolum no={1} id="is-bolumu" baslik="İşi kim yapar" not="Sistemin işi ve size kalan iş, ayrı ayrı.">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <h3 className="text-lg font-semibold">Sistemin yaptığı</h3>
            <table className="mt-3 w-full text-left">
              <caption className="sr-only">Sistemin yaptığı işler</caption>
              <tbody>
                {SISTEMIN_ISI.map((s) => (
                  <tr key={s.is} className="border-t border-cizgi align-top">
                    <th scope="row" className="w-32 py-3 pr-4 font-semibold sm:w-36">
                      {s.is}
                    </th>
                    <td className="py-3 text-soluk">{s.ayrinti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="self-start rounded-sm bg-vurgu-zemin p-5">
            <h3 className="text-lg font-semibold text-vurgu">Size kalan</h3>
            <ul className="mt-3 space-y-3">
              {INSANIN_ISI.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </Bolum>

      <Bolum
        no={2}
        id="donem"
        baslik="Bir dönem nasıl geçer"
        not="Bir öğretim elemanının dönemi, örnek bir takvimle."
        zemin
      >
        <DonemCizelgesi adimlar={DONEM_AKISI} />
        <p className="mt-2 text-sm text-soluk">
          Adımların kaynağı:
          <Dayanak n={5} />
        </p>
      </Bolum>

      <Bolum no={3} id="akis" baslik="Bir önerinin yolu" not="Her öneri aynı altı adımdan geçer.">
        <ol className="grid gap-px overflow-hidden rounded-sm border border-cizgi bg-cizgi sm:grid-cols-2 lg:grid-cols-3">
          {AKIS.map((a, i) => (
            <li key={a.ad} className="bg-yuzey p-5">
              <p className="paragraf-no">{i + 1}</p>
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

      <Bolum no={4} id="kazanc" baslik="Hedefi ölçerek koyun" not="Hedef yazılıdır, sonuç henüz ölçülmedi." zemin>
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
          <p className="text-soluk">{DURUM_NOTU}</p>
        </div>
      </Bolum>

      <Bolum no={5} id="sayfalar" baslik="Ayrıntıları okuyun">
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
      <Dayanaklar ogeler={DAYANAKLAR} />
    </>
  );
}
