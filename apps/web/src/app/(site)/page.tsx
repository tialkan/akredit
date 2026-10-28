import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { Bolum, Dayanak, Dayanaklar, DonemCizelgesi, Olculer, YapisalVeri } from "../../site/bilesenler.tsx";
import { yokakOzeti } from "../../site/cerceve-ozeti.ts";
import {
  AKIS,
  type DayanakKaynagi,
  DONEM_AKISI,
  DORT_ROL,
  depo,
  IS_BOLUMU,
  KONUM_TABLOSU,
  SAYFALAR,
  SORUMLULUK,
  VAAT_CERCEVESI,
} from "../../site/icerik.ts";
import { OnayOnizleme } from "../../site/onay-onizleme.tsx";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

const DAYANAKLAR: DayanakKaynagi[] = [
  {
    baslik: "Kanıtsız iddia ve uydurma yasağı, atıf denetimi, belirlenimci ölçme: değişmez ilkeler.",
    adres: depo("CLAUDE.md"),
  },
  {
    baslik: "Risk sınıfları ve devredilemeyen kararlar: sıfır iş yükü ve insan kararı kaydı.",
    adres: depo("docs/adr/0004-sifir-is-yuku-ve-insan-karari.md"),
  },
  { baslik: "Yapay zekâ anahtarının şifreli saklanması ve kurum anahtarıyla çalışma.", adres: depo("packages/yz") },
  {
    baslik: "Yalnız ekleme yapılan günlük ve özet zinciri: veritabanı ve değişmezlik kararı.",
    adres: depo("docs/adr/0002-veritabani-ve-degismezlik.md"),
  },
  {
    baslik: "Bir dönemin adımları: süreç, Bologna, ders dosyası, anket, toplantı ve rapor iş paketlerinin raporları.",
    adres: depo("docs/raporlar"),
  },
  {
    baslik: "Ölçüt sayıları resmî kılavuzdan çıkarılan çerçeve verisinden sayılır.",
    adres: depo("packages/cerceveler"),
  },
  { baslik: "Mevcut sistemlerden okunanlar ve okunmayanlar: bağlayıcılar.", adres: depo("packages/baglayicilar") },
];

const yokak = yokakOzeti();
const DOKUNUS = DONEM_AKISI.reduce((t, a) => t + a.dokunus, 0);
const BAG = "font-semibold text-vurgu underline underline-offset-4";

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
              {/* Bölüm işareti ve numarası bölünmez boşlukla bağlıdır; dar ekranda satıra kırılmaz (İP-42). */}
              <span className="paragraf-no shrink-0 whitespace-nowrap text-lg" aria-hidden>
                {"§ 0"}
              </span>
              <span className="text-lg">Üniversiteler için açık kaynak kalite güvencesi ve akreditasyon yazılımı.</span>
            </p>
            <h1 className="mt-6 text-[2.6rem] leading-[1.03] tracking-[-0.03em] text-vurgu sm:text-[3.9rem] xl:text-[4.35rem]">
              {SAYFALAR.ana.baslik}
            </h1>
            <p className="mt-5 font-serif text-[1.5rem] leading-snug font-semibold text-metin sm:text-[1.85rem]">
              {VAAT_CERCEVESI}
            </p>
            <p className="mt-5 max-w-[56ch] text-lg">
              Akredit kanıtı kurumun sistemlerinden toplar, sayıları hesaplar, raporu yazar ve süreci takip eder. Kanıtı
              olmayan olgusal cümle rapora girmez, EKSİK olarak işaretlenir.
              <Dayanak n={1} /> Öğretim elemanına sıfır evrak işi kalır: önüne gelen karara kanıtıyla bakar ve tek
              dokunuşla karar verir. Olgunluk düzeyi ve dış kuruma gönderim gibi kararlar hiçbir zaman otomatik
              verilmez.
              <Dayanak n={2} />
            </p>
            <p className="mt-4 max-w-[56ch] text-soluk">
              İlk etapta ücretsizdir. Yapay zekâ için kurum kendi OpenRouter anahtarını bir kez girer; kullanım ücreti
              kurumun hesabına yansır.
              <Dayanak n={3} />
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/pilot" className={dugmeSinifi("birincil", "orta", "rounded-sm")}>
                Pilot kurum olun
              </Link>
              <Link href="/nasil-calisir" className={`inline-flex min-h-11 items-center ${BAG}`}>
                Nasıl çalıştığını okuyun
              </Link>
              <Link href="/deneyin" className={`inline-flex min-h-11 items-center ${BAG}`}>
                Hesap açmadan deneyin
              </Link>
              <Link href="/panel/onaylar" className={`inline-flex min-h-11 items-center ${BAG}`}>
                Örnek onay kutusunu açın
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 lg:mt-20">
            <OnayOnizleme />
            <p className="mt-3 text-sm text-soluk">
              Her karar adla, zamanla ve dayanağıyla günlüğe eklenir. Kayıt iz bırakmadan değiştirilemez: her değişiklik
              yeni kayıt olarak görünür, kayıtlar özet zinciriyle birbirine bağlıdır.
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

      <Bolum
        no={1}
        id="is-bolumu"
        baslik="İşi kim yapar"
        not="Veri toplama, hesap, yazım ve takip sistemde. Pedagojik ve kurumsal karar insanda."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">İşin sistem ile insan arasındaki bölümü</caption>
            <thead>
              <tr className="border-b-2 border-cizgi-guclu">
                <th scope="col" className="py-2 pr-4">
                  İş
                </th>
                <th scope="col" className="py-2 pr-4">
                  Sistem
                </th>
                <th scope="col" className="py-2">
                  Size kalan
                </th>
              </tr>
            </thead>
            <tbody>
              {IS_BOLUMU.map((s) => (
                <tr key={s.alan} className="border-b border-cizgi align-top">
                  <th scope="row" className="w-32 py-3 pr-4 font-semibold">
                    {s.alan}
                  </th>
                  <td className="py-3 pr-4 text-soluk">{s.sistem}</td>
                  <td className={`py-3 ${s.alan === "Karar" ? "font-semibold text-petrol" : ""}`}>{s.insan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside aria-labelledby="sorumluluk" className="mt-8 rounded-sm border border-cizgi-guclu bg-zemin p-5">
          <h3 id="sorumluluk" className="text-lg font-semibold text-vurgu">
            Sorumluluk kimde
          </h3>
          <p className="mt-2">{SORUMLULUK}</p>
        </aside>
      </Bolum>

      <Bolum no={2} id="roller" baslik="Kim için ne yapar" not="Dört karar verici, dört ayrı soru." zemin>
        <ul className="grid gap-px overflow-hidden rounded-sm border border-cizgi bg-cizgi sm:grid-cols-2">
          {DORT_ROL.map((r) => (
            <li key={r.kimlik} className="bg-yuzey p-5">
              <Link
                href={`/kimler-icin#${r.kimlik}`}
                className="inline-flex min-h-11 items-center text-xl font-semibold text-vurgu underline underline-offset-4"
              >
                {r.ad}
              </Link>
              <p className="mt-1 text-soluk">{r.kisa}</p>
            </li>
          ))}
        </ul>
      </Bolum>

      <Bolum no={3} id="donem" baslik="Bir dönem nasıl geçer" not="Bir öğretim elemanının dönemi, örnek bir takvimle.">
        <DonemCizelgesi adimlar={DONEM_AKISI} />
        <p className="mt-2 text-sm text-soluk">
          Adımların kaynağı:
          <Dayanak n={5} tekrar />
        </p>
      </Bolum>

      <Bolum no={4} id="akis" baslik="Bir önerinin yolu" not="Her öneri aynı altı adımdan geçer." zemin>
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
          <Link href="/nasil-calisir" className={BAG}>
            Akışın ayrıntısı, risk düzeyleri ve yetki devri
          </Link>
        </p>
      </Bolum>

      <Bolum
        no={5}
        id="konum"
        baslik="Mevcut sistemlerin üstünde çalışır"
        not="Akredit hiçbir sistemin yerine geçmez. Kurumun kullandığı sistemlerden okur."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <caption className="sr-only">Mevcut sistemlerle bağlantı</caption>
            <thead>
              <tr className="border-b-2 border-cizgi-guclu">
                <th scope="col" className="py-2 pr-4">
                  Sistem
                </th>
                <th scope="col" className="py-2 pr-4">
                  Nasıl bağlanır
                </th>
                <th scope="col" className="py-2">
                  Sınır
                </th>
              </tr>
            </thead>
            <tbody>
              {KONUM_TABLOSU.map((k) => (
                <tr key={k.sistem} className="border-b border-cizgi align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {k.sistem}
                  </th>
                  <td className="py-3 pr-4">{k.baglanti}</td>
                  <td className="py-3 text-soluk">{k.sinir}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-soluk">
          Her bağlayıcının okuduğu ve okumadığı Ne yapar sayfasında.
          <Dayanak n={7} />
        </p>
      </Bolum>

      <Bolum no={6} id="kazanc" baslik="Hedefi ölçerek koyun" not="Hedef yazılıdır, sonuç pilotta ölçülecek." zemin>
        <div className="metin-sayfa [&>*:first-child]:mt-0">
          <p>
            Bologna sayfası, ders dosyası, ÇK ve PÇ hesabı, anket analizi, tutanak ve öz değerlendirme raporu bugün
            dönem başına saatler alıyor. Bu işin büyük kısmı veri taşıma, hesap ve yazımdır. Bunları sistem yapar.
          </p>
          <p>
            Hedef, öğretim elemanının dönemlik kalite işini yalnız kararlardan oluşan 15 dakikanın altına indirmektir.
            Pilot uygulamada onay ekranında geçen süreyle ölçülecek, sonuç bu sitede yayımlanacak.
          </p>
          <p>
            <Link href="/pilot" className={BAG}>
              Pilot kurum olarak başvurun
            </Link>
            . Modüllerin bugünkü durumu{" "}
            <Link href="/ne-yapar" className={BAG}>
              Ne yapar
            </Link>{" "}
            sayfasında, sıradaki işler{" "}
            <Link href="/yol-haritasi" className={BAG}>
              Yol haritası
            </Link>{" "}
            sayfasında.
          </p>
        </div>
      </Bolum>

      <Bolum no={7} id="sayfalar" baslik="Ayrıntıları okuyun">
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {[
            SAYFALAR.neYapar,
            SAYFALAR.kimler,
            SAYFALAR.cerceveler,
            SAYFALAR.yz,
            SAYFALAR.giris,
            SAYFALAR.guvenlik,
            SAYFALAR.sinirlar,
            SAYFALAR.yolHaritasi,
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
