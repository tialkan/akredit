import { Bell, ClipboardCheck, FileSearch, FolderInput, PenLine, Ruler, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";

const SISTEM = [
  { simge: FolderInput, ad: "Kanıt toplar", metin: "Belgeleri, tutanakları ve ders dosyalarını tek yerde, değiştirilemez biçimde saklar." },
  { simge: Ruler, ad: "Ölçer", metin: "Ders ve program çıktılarının sağlanma düzeyini not verisinden hesaplar." },
  { simge: PenLine, ad: "Yazar", metin: "Rapor bölümlerini kanıta atıf vererek taslak olarak hazırlar." },
  { simge: FileSearch, ad: "Denetler", metin: "Eksik kanıtı, tutarsız sayıyı ve kaynaksız cümleyi işaretler." },
  { simge: Bell, ad: "Hatırlatır", metin: "Son tarihleri ve bekleyen işleri zamanında bildirir." },
];

const ADIMLAR = [
  { ad: "Bağlayın", metin: "Ders bilgi paketi, not listeleri ve belgeler sisteme alınır." },
  { ad: "Sistem hazırlasın", metin: "Kanıtlar eşlenir, ölçümler hesaplanır, taslaklar kanıta bağlanarak yazılır." },
  { ad: "Siz karar verin", metin: "Onay kutusunda her öneriyi kanıtıyla görür; onaylar, düzeltir ya da reddedersiniz." },
  { ad: "Kayıt kalsın", metin: "Her karar adınız, zamanı ve dayanağıyla değiştirilemez günlüğe yazılır." },
];

const SSS = [
  {
    s: "Akredit akreditasyon almamızı garanti eder mi?",
    c: "Hayır. Akredit hazırlık işini kolaylaştırır; değerlendirme ve karar akreditasyon kuruluşunundur. Hiçbir kuruluşla bağımız yoktur.",
  },
  {
    s: "Yapay zekâ benim yerime karar verir mi?",
    c: "Hayır. Sistem yalnız öneri hazırlar. Kurum adına beyan, akreditasyonu etkileyen onaylar ve dış kuruma gönderim her zaman bir kişinin kararıdır.",
  },
  {
    s: "Sistem bir şey uydurursa ne olur?",
    c: "Her olgusal cümle bir kanıta, dosya ve sayfasıyla bağlanmak zorundadır. Bağlanamayan içerik “EKSİK” olarak işaretlenir. Sayılar yapay zekâdan değil, hesaplamadan gelir.",
  },
  {
    s: "Öğrenci verisi nereye gider?",
    c: "Öğrenci kimlikleri takma adla tutulur. Kişisel veri, kurumunuz izin vermedikçe yurt dışındaki bir yapay zekâ hizmetine gönderilmez.",
  },
  {
    s: "Kendi sunucumuzda çalıştırabilir miyiz?",
    c: "Kod açık kaynaktır (Apache 2.0). Kurum içi kurulum ve yerel model desteği yol haritasındadır; henüz hazır değildir.",
  },
  {
    s: "Şu an kullanılabilir mi?",
    c: "Hayır, geliştirme sürüyor. Bu sitedeki panel kurgu örnek veriyle çalışan bir önizlemedir.",
  },
];

export default function AnaSayfa() {
  return (
    <>
      <section className="border-b border-cizgi">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <p className="mb-3 font-semibold text-vurgu">Yükseköğretimde kalite ve akreditasyon</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Sistem hazırlar, kanıtını gösterir. <span className="text-vurgu">Siz yalnız onaylarsınız.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-soluk">
            Akredit, kalite güvencesi ve akreditasyon işlerini kanıta dayalı, kayıtlı ve onaylı yürüten açık kaynak bir
            platformdur. Amacı, öğretim elemanının bu işlere ayırdığı zamanı en aza indirmektir.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/nasil-calisir" className={dugmeSinifi("birincil")}>
              Nasıl çalıştığını görün
            </Link>
            <Link href="/panel/onaylar" className={dugmeSinifi("ikincil")}>
              Onay kutusunu deneyin (örnek veri)
            </Link>
          </div>
          <p className="mt-4 text-sm text-soluk">Geliştirme aşamasındadır; henüz kurumlara açık değildir.</p>
        </div>
      </section>

      <section aria-labelledby="kim-ne-yapar" className="mx-auto max-w-6xl px-4 py-14">
        <h2 id="kim-ne-yapar" className="text-2xl font-bold tracking-tight">
          Kim ne yapar?
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="rounded-lg border border-cizgi bg-yuzey p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardCheck aria-hidden className="size-5 text-vurgu" />
              Sistemin yaptığı
            </h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {SISTEM.map((s) => (
                <li key={s.ad} className="flex gap-3">
                  <s.simge aria-hidden className="mt-1 size-5 shrink-0 text-vurgu" />
                  <div>
                    <p className="font-semibold">{s.ad}</p>
                    <p className="text-soluk">{s.metin}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border-2 border-vurgu bg-vurgu-zemin p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <UserCheck aria-hidden className="size-5 text-vurgu" />
              Sizin yaptığınız
            </h3>
            <p className="mt-4 text-lg font-semibold">Onaylamak.</p>
            <p className="mt-2">
              Önerileri kanıtıyla birlikte görürsünüz. Onaylar, düzeltir ya da reddedersiniz. Düşük riskli işleri toplu
              onaylayabilir, yüksek riskli olanları tek tek incelersiniz.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="adimlar" className="border-y border-cizgi bg-yuzey">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="adimlar" className="text-2xl font-bold tracking-tight">
            Dört adımda nasıl çalışır
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADIMLAR.map((a, i) => (
              <li key={a.ad} className="border-l-4 border-vurgu pl-4">
                <p className="text-sm font-semibold text-soluk">Adım {i + 1}</p>
                <p className="text-lg font-semibold">{a.ad}</p>
                <p className="mt-1 text-soluk">{a.metin}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6">
            <Link href="/nasil-calisir" className="font-semibold text-vurgu underline underline-offset-4">
              Ayrıntılı anlatım
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 md:grid-cols-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck aria-hidden className="size-5 text-vurgu" />
            Güvenlik ve KVKK
          </h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-soluk">
            <li>Kanıt dosyaları içerik özetiyle saklanır, silinmez, üzerine yazılmaz.</li>
            <li>Kararlar değiştirilemez günlüğe yazılır.</li>
            <li>Öğrenci kimlikleri takma adla tutulur.</li>
            <li>Parola ve doğrulama kodu yapay zekâya hiç gösterilmez.</li>
          </ul>
          <p className="mt-3">
            <Link href="/guvenlik" className="font-semibold text-vurgu underline underline-offset-4">
              Güvenlik yaklaşımı
            </Link>
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Açık kaynak</h2>
          <p className="mt-3 text-soluk">
            Kodun tamamı Apache 2.0 lisansıyla açıktır. Kurumlar ne yaptığını kendileri inceleyebilir; tek bir firmaya
            bağımlı kalmaz.
          </p>
          <p className="mt-3">
            <Link href="/acik-kaynak" className="font-semibold text-vurgu underline underline-offset-4">
              Açık kaynak hakkında
            </Link>
          </p>
        </div>
        <div>
          <h2 className="text-xl font-bold">Kurumlar için</h2>
          <p className="mt-3 text-soluk">
            Pilot uygulamaya katılmak ya da görüş bildirmek isteyen kalite komisyonları ve program sorumluları bize
            yazabilir.
          </p>
          <p className="mt-3">
            <Link href="/iletisim" className="font-semibold text-vurgu underline underline-offset-4">
              İletişim
            </Link>
          </p>
        </div>
      </section>

      <section aria-labelledby="sss" className="border-t border-cizgi bg-yuzey">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 id="sss" className="text-2xl font-bold tracking-tight">
            Sık sorulan sorular
          </h2>
          <div className="mt-6 divide-y divide-cizgi border-y border-cizgi">
            {SSS.map((x) => (
              <details key={x.s} className="group py-2">
                <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{x.s}</summary>
                <p className="pb-3 text-soluk">{x.c}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
