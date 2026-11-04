// Ana sayfa: tek amaç (kurucu isteği, İP-49). Akredit'i yapay zekânıza ekleyin, sonra akredit yazın.
// Kurulum adımları elle yazılmaz; herkese açık MCP'nin kurulum rehberinden (kurulum_yardimi aracı) okunur.
// Platform tanıtımı ve diğer her şey /proje sayfasındadır.

import { type Adim, AKREDIT_ODAKLARI } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import { YapisalVeri } from "../../site/bilesenler.tsx";
import { SAYFALAR } from "../../site/icerik.ts";
import { KopyalaKutusu } from "../../site/kopyala.tsx";
import { GELISTIRICI_ARACLARI, kurulumAdimlari, MCP_ADRESI, UYGULAMALAR, type Uygulama } from "../../site/kurulum.ts";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

/** Kısa örnek konuşma. Kurgudur; menü, akredit başlangıcının gerçek odak listesinden okunur. */
const ORNEK: { kim: "Siz" | "Asistan"; metin: string }[] = [
  { kim: "Siz", metin: "akredit" },
  {
    kim: "Asistan",
    metin: [
      "Bugün neye odaklanalım? Numarasını yazmanız yeter.",
      ...AKREDIT_ODAKLARI.map((o) => `${o.no}) ${o.ad}`),
    ].join("\n"),
  },
  { kim: "Siz", metin: "1" },
  {
    kim: "Asistan",
    metin:
      "Önce bir kural: kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Bana yazmayın. OBS adresiniz nedir?",
  },
  { kim: "Siz", metin: "obs.kurgu.edu.tr" },
];

const SSS: { soru: string; cevap: string }[] = [
  {
    soru: "Akredit araçları görünmüyor",
    cevap: `Yeni bir sohbet açın; eklediğiniz araç eski sohbette görünmeyebilir. Yazı kutusunun altındaki + düğmesinden ya da araç menüsünden Akredit'in açık olduğuna bakın (adı sizde farklı olabilir). Adresin tam olarak ${MCP_ADRESI} olduğunu denetleyin. Komut görünmüyorsa "Akredit ile başlayalım" yazmanız yeter.`,
  },
  {
    soru: "Ücretli mi?",
    cevap:
      "Hayır. Akredit ücretsizdir, hesap açmanız gerekmez. Kullandığınız yapay zekâ hizmetinin kendi planı ayrıca geçerlidir; özel araç ekleme her planda açık olmayabilir.",
  },
  {
    soru: "Yazdıklarım nereye gidiyor?",
    cevap:
      "Akredit yalnız okur ve hesaplar. İstek içeriği kaydedilmez; kayda yalnız araç adı, süre ve istek boyutu yazılır. Öğrenci adı ve numarası, parola ya da doğrulama kodu göndermeyin. Kullandığınız yapay zekâ hizmetinin kendi veri politikası ayrıca geçerlidir.",
  },
  {
    soru: "ChatGPT'de olmuyor",
    cevap:
      "ChatGPT'de araç eklemek için ayarlarda geliştirici kipinin açık olması gerekir. İş ve kurum hesaplarında bu ayarı yönetici açar; açamıyorsanız yöneticinize sorun ya da Claude ile deneyin.",
  },
];

const BAG = "text-vurgu underline underline-offset-4";

function AdimListesi({ adimlar }: { adimlar: Adim[] }) {
  return (
    <ol className="mt-4 grid gap-3">
      {adimlar.map((a) => (
        <li key={a.no} className="grid grid-cols-[2.25rem_1fr] gap-x-2">
          <span className="paragraf-no text-xl leading-7" aria-hidden>
            {a.no}.
          </span>
          <div>
            <p>
              <span className="sr-only">{a.no}. </span>
              {a.yap}
            </p>
            {a.goreceginiz ? <p className="text-soluk">Göreceğiniz: {a.goreceginiz}</p> : null}
            {a.degisebilir ? <p className="text-soluk">Menünün adı sizde biraz farklı olabilir.</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function UygulamaBolumu({ u }: { u: Uygulama }) {
  return (
    <details id={`kur-${u.kimlik}`} open={u.acik} className="group rounded-sm border border-cizgi-guclu bg-yuzey">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-xl text-vurgu [&::-webkit-details-marker]:hidden">
        <span>{u.ad}</span>
        <span aria-hidden className="text-2xl leading-none transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="border-t border-cizgi px-4 pt-2 pb-5">
        {u.komut ? <KopyalaKutusu etiket="Tek satırlık komut" metin={u.komut} /> : null}
        <KopyalaKutusu etiket="Akredit'in adresi" metin={MCP_ADRESI} />
        <AdimListesi adimlar={kurulumAdimlari(u)} />
        {u.ek ? <p className="mt-3 text-soluk">{u.ek}</p> : null}
      </div>
    </details>
  );
}

function AdimBasligi({ no, id, children }: { no: number; id: string; children: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-3 text-[1.9rem] leading-tight text-vurgu sm:text-[2.3rem]">
      <span className="paragraf-no shrink-0 whitespace-nowrap" aria-hidden>
        {`Adım ${no}`}
      </span>
      <span className="sr-only">{`Adım ${no}: `}</span>
      <span>{children}</span>
    </h2>
  );
}

export default function AnaSayfa() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.ana} />
      <section aria-labelledby="ana-baslik" className="border-b border-cizgi bg-yuzey">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-10 sm:pt-14">
          <h1 id="ana-baslik" className="text-[2.3rem] leading-[1.08] tracking-[-0.025em] text-vurgu sm:text-[3.2rem]">
            {SAYFALAR.ana.baslik}
          </h1>
          <p className="mt-5 text-xl">
            Ücretsiz ve açık kaynak. Hesap açmanız gerekmez. Claude ya da ChatGPT'ye bir kez ekleyin, sonra akredit
            yazarak başlayın.
          </p>
        </div>
      </section>

      <section id="kurulum" aria-labelledby="adim-1" className="bg-zemin">
        <div className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={1} id="adim-1">
            Akredit'i yapay zekânıza ekleyin
          </AdimBasligi>
          <p className="mt-3">Kullandığınız uygulamayı açın ve adımları sırayla izleyin.</p>
          <div className="mt-6 grid gap-3">
            {UYGULAMALAR.map((u) => (
              <UygulamaBolumu key={u.kimlik} u={u} />
            ))}
          </div>
          <h3 className="mt-8 text-xl text-metin">Bilgisayar kullananlar için</h3>
          <p className="mt-1 text-soluk">Geliştirici araçları: uçbirim ve kod düzenleyiciler.</p>
          <div className="mt-3 grid gap-3">
            {GELISTIRICI_ARACLARI.map((u) => (
              <UygulamaBolumu key={u.kimlik} u={u} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="adim-2" className="border-t border-cizgi bg-yuzey">
        <div className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={2} id="adim-2">
            akredit yazın
          </AdimBasligi>
          <ol className="mt-4 grid list-decimal gap-2 pl-7">
            <li>Yeni bir sohbet açın.</li>
            <li>Yazı kutusuna akredit yazıp gönderin.</li>
            <li>Asistan hangi aracı kullanmak istediğinizi sorar. Numarasını yazarak seçin.</li>
          </ol>
          <figure className="mt-6 rounded-sm border border-cizgi bg-zemin p-4 sm:p-5">
            <figcaption className="text-base text-soluk">
              Örnek konuşma (kurgudur, sizde biraz farklı olabilir)
            </figcaption>
            <dl className="mt-3 grid gap-3">
              {ORNEK.map((s, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: sabit, sırası değişmeyen örnek konuşma
                <div key={i} className="grid gap-x-3 sm:grid-cols-[5.5rem_1fr]">
                  <dt className={s.kim === "Siz" ? "text-petrol" : "text-soluk"}>{s.kim}</dt>
                  <dd className="whitespace-pre-line">{s.metin}</dd>
                </div>
              ))}
            </dl>
          </figure>
          <p
            role="note"
            className="mt-5 rounded-sm border border-risk-orta bg-risk-orta-zemin px-4 py-3 text-risk-orta"
          >
            Bologna için OBS'ye girerken kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi ekranına yazın; asistana
            ve sohbete asla yazmayın.
          </p>
        </div>
      </section>

      <section aria-labelledby="takildiniz" className="border-t border-cizgi bg-zemin">
        <div className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <h2 id="takildiniz" className="text-[1.75rem] leading-tight text-vurgu">
            Takıldınız mı?
          </h2>
          <div className="mt-4 grid gap-2">
            {SSS.map((s) => (
              <details key={s.soru} className="rounded-sm border border-cizgi bg-yuzey">
                <summary className="flex min-h-12 cursor-pointer items-center px-4 py-2">{s.soru}</summary>
                <p className="border-t border-cizgi px-4 py-3">{s.cevap}</p>
              </details>
            ))}
          </div>
          <p className="mt-6">
            <Link href="/mcp-kullan" className={`inline-flex min-h-11 items-center ${BAG}`}>
              Ayrıntılı kurulum rehberi ve bütün araçlar
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
