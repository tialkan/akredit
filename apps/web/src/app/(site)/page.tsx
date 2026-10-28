import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Bolum, Dayanak, Dayanaklar, DonemCizelgesi, Olculer, YapisalVeri } from "../../site/bilesenler.tsx";
import { yokakOzeti } from "../../site/cerceve-ozeti.ts";
import { AKIS, DONEM_AKISI, DURUM_NOTU, INSANIN_ISI, SAYFALAR, SISTEMIN_ISI } from "../../site/icerik.ts";
import { OnayOnizleme } from "../../site/onay-onizleme.tsx";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

const DAYANAKLAR = [
  "Değişmez ilke 1 ve 2: CLAUDE.md. Atıf denetimi packages/cekirdek, sayılar packages/olcme.",
  "Risk sınıfları ve devredilemeyen kararlar: packages/cekirdek (ONERI_RISKI), docs/adr/0004.",
  "Yapay zekâ anahtarı: packages/servis/src/politika.ts (VARSAYILAN_OPENROUTER_MODELI), packages/yz/src/anahtar-kasasi.ts.",
  "Değiştirilemez günlük: packages/vt (yalnız ekleme tetikleyicileri), docs/adr/0002-veritabani-ve-degismezlik.md.",
  "Bir dönemin adımları: docs/raporlar/IP-14, IP-15, IP-16, IP-17, IP-18, IP-19, IP-20.",
  "Ölçüt sayıları çerçeve verisinden sayılır, elle yazılmaz: packages/cerceveler (YOKAK_KURUMSAL_3_3), apps/web/src/site/cerceve-ozeti.ts.",
];

const yokak = yokakOzeti();
const DOKUNUS = DONEM_AKISI.reduce((t, a) => t + a.dokunus, 0);

/** İlk ekranın arkasındaki on iki sütunluk ince ızgara: yönetmelik ve rapor sayfasının dizgi ızgarası. Süstür. */
function BelgeIzgarasi() {
  return (
    <div aria-hidden className="belge-izgara hidden lg:block">
      <div className="mx-auto h-full max-w-6xl px-4">
        <div className="grid h-full grid-cols-12 gap-x-8">
          {Array.from({ length: 12 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: sabit, sırası değişmeyen süs çizgileri
            <span key={i} className="border-x border-cizgi/45" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AnaSayfa() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.ana} />
      <section className="relative border-b border-cizgi bg-yuzey">
        <BelgeIzgarasi />
        <div className="relative mx-auto grid max-w-6xl gap-x-8 gap-y-12 px-4 pt-10 pb-12 sm:pt-14 lg:grid-cols-12 lg:pt-14">
          <div className="lg:col-span-7">
            <p className="sayilar flex items-baseline gap-3 text-soluk">
              <span className="paragraf-no text-lg" aria-hidden>
                § 0
              </span>
              <span className="text-lg">Üniversiteler için açık kaynak kalite güvencesi ve akreditasyon yazılımı.</span>
            </p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.03] tracking-[-0.03em] text-vurgu sm:text-[3.9rem] xl:text-[4.35rem]">
              {SAYFALAR.ana.baslik}
            </h1>
            <p className="mt-6 max-w-[56ch] text-lg">
              Akredit kanıtı kurumun sistemlerinden toplar, sayıları hesaplar ve raporu her cümlesine kaynak göstererek
              yazar.
              <Dayanak n={1} /> Öğretim elemanına kalan iş, önüne gelen önerileri kanıtıyla görüp onaylamaktır. Olgunluk
              düzeyi ve dış kuruma gönderim gibi kararlar hiçbir zaman otomatik verilmez.
              <Dayanak n={2} />
            </p>
            <p className="mt-4 max-w-[56ch] text-soluk">
              İlk etapta ücretsizdir. Yapay zekâ için kurum kendi OpenRouter anahtarını bir kez girer; kullanım ücreti
              kurumun hesabına yansır.
              <Dayanak n={3} />
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/nasil-calisir" className={dugmeSinifi("birincil", "orta", "rounded-sm")}>
                Nasıl çalıştığını okuyun
              </Link>
              <Link
                href="/deneyin"
                className="inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4"
              >
                Hesap açmadan deneyin
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
          <div className="lg:col-span-5 lg:mt-20">
            <OnayOnizleme />
            <p className="mt-3 text-sm text-soluk">
              Her karar adla, zamanla ve dayanağıyla günlüğe eklenir; kayıt silinemez ve değiştirilemez.
              <Dayanak n={4} />
            </p>
          </div>
          <Olculer
            className="lg:col-span-12"
            ogeler={[
              { deger: yokak.olcutSayisi, ad: "YÖKAK ölçütü, resmî metinden", dayanak: 6 },
              { deger: yokak.altOlcutSayisi, ad: "alt ölçüt, resmî metinden", dayanak: 6, tekrar: true },
              { deger: AKIS.length, ad: "adım: kanıttan günlüğe", dayanak: 1, tekrar: true },
              { deger: DOKUNUS, ad: "dokunuş: örnek bir dönemde hocaya kalan", dayanak: 5 },
            ]}
          />
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
          <Dayanak n={5} tekrar />
        </p>
      </Bolum>

      <Bolum no={3} id="akis" baslik="Bir önerinin yolu" not="Her öneri aynı altı adımdan geçer.">
        <ol className="grid gap-px overflow-hidden rounded-sm border border-cizgi bg-cizgi sm:grid-cols-2 lg:grid-cols-3">
          {AKIS.map((a, i) => (
            <li key={a.ad} className="bg-yuzey p-5">
              <p className="paragraf-no text-[2rem] leading-none" aria-hidden>
                {i + 1}
              </p>
              <p className={`mt-3 text-lg font-semibold ${a.ad === "Onay" ? "text-petrol" : ""}`}>{a.ad}</p>
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
