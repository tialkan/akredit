// Ana sayfa: tek amaç (kurucu isteği, İP-49). Akredit'i yapay zekânıza ekleyin, sonra akredit yazın.
// Kurulum adımları elle yazılmaz; herkese açık MCP'nin kurulum rehberinden (kurulum_yardimi aracı) okunur.
// Platform tanıtımı ve diğer her şey /proje sayfasındadır.

import { type Adim, AKREDIT_ODAKLARI } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BelirmeGozlemcisi } from "../../site/belirme.tsx";
import { YapisalVeri } from "../../site/bilesenler.tsx";
import { GORSELLER, Gorsel } from "../../site/gorsel.tsx";
import { SAYFALAR } from "../../site/icerik.ts";
import { KopyalaKutusu } from "../../site/kopyala.tsx";
import {
  GELISTIRICI_ARACLARI,
  KURULUM_ISTEGI,
  kurulumAdimlari,
  MCP_ADRESI,
  UYGULAMALAR,
  type Uygulama,
} from "../../site/kurulum.ts";
import { sayfaUstVerisi } from "../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.ana);

/** Kısa örnek konuşma. Kurgudur; menü, akredit başlangıcının gerçek odak listesinden okunur. */
const ORNEK: { kim: "Siz" | "Asistan"; metin: string }[] = [
  { kim: "Siz", metin: "akredit" },
  {
    kim: "Asistan",
    metin: ["Neye odaklanalım? Numarasını yazın.", ...AKREDIT_ODAKLARI.map((o) => `${o.no}) ${o.ad}`)].join("\n"),
  },
  { kim: "Siz", metin: "1" },
  {
    kim: "Asistan",
    metin: "Parolanızı bana yazmayın; yalnız OBS'nin kendi ekranına girin. OBS adresiniz nedir?",
  },
  { kim: "Siz", metin: "obs.kurgu.edu.tr" },
];

const SSS: { soru: string; cevap: string }[] = [
  {
    soru: "Akredit araçları görünmüyor",
    cevap: `Yeni bir sohbet açın. + düğmesinden Akredit'in açık olduğuna bakın. Adres tam olarak ${MCP_ADRESI} olmalı.`,
  },
  {
    soru: "Ücretli mi?",
    cevap: "Hayır, hesap da gerekmez. Yapay zekâ hizmetinizin kendi planı ayrıca geçerlidir.",
  },
  {
    soru: "Yazdıklarım nereye gidiyor?",
    cevap:
      "İstek içeriği kaydedilmez; yalnız araç adı, süre ve boyut yazılır. Öğrenci adı, numara ya da parola göndermeyin.",
  },
  {
    soru: "ChatGPT'de olmuyor",
    cevap: "Ayarlarda geliştirici kipi açık olmalı. Kurum hesabında bunu yönetici açar.",
  },
];

const BAG = "text-vurgu underline underline-offset-4";

/** Kapanış sloganı; kelimeleri sırayla belirir. */
const SLOGAN = "Kurallar ve hesaplar Akredit'te. Karar ve son tık sizde.";

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
    <details id={`kur-${u.kimlik}`} open={u.acik} className="kart group rounded-sm border border-cizgi-guclu bg-yuzey">
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
      {children}
    </h2>
  );
}

export default function AnaSayfa() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.ana} />
      <BelirmeGozlemcisi />
      <section aria-labelledby="ana-baslik" className="ilk-ekran border-b border-cizgi bg-yuzey">
        <div className="mx-auto grid max-w-3xl items-center gap-8 px-4 pt-10 pb-10 sm:pt-14 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-14 lg:pt-16 lg:pb-16">
          <div>
            <h1
              id="ana-baslik"
              className="text-[2.3rem] leading-[1.08] tracking-[-0.025em] text-vurgu sm:text-[3.2rem]"
            >
              {SAYFALAR.ana.baslik}
            </h1>
            <p className="mt-5 max-w-[46ch] text-xl">Ücretsiz, açık kaynak, hesapsız. Kendi yapay zekânızda çalışır.</p>
            <p className="mt-3 text-lg">
              <Link href="/deneyin" className={`inline-flex min-h-11 items-center ${BAG}`}>
                Kurulum istemiyor musunuz? Araçları tarayıcıda deneyin
              </Link>
            </p>
          </div>
          <div className="gravur-levha w-full max-w-[17rem] justify-self-start lg:max-w-none lg:justify-self-end">
            <Gorsel
              gorsel={GORSELLER.calismaMasasi}
              alt="Gravür çizim: pencere önünde bir çalışma masası; üzerinde açık bir dizüstü bilgisayar, kitaplar ve bir fincan."
              boyutlar="(min-width: 64rem) 30rem, 17rem"
              oncelikli
            />
          </div>
        </div>
      </section>

      <section id="kurulum" aria-labelledby="adim-1" className="bg-zemin">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={1} id="adim-1">
            Akredit'i yapay zekânıza ekleyin
          </AdimBasligi>
          <h3 className="bolum-etiketi mt-6 text-lg text-metin">En kolay yol: kopyalayın, yapıştırın</h3>
          <p className="mt-1">
            Claude Code ya da Codex masaüstünde yeni bir oturuma yapıştırın; kurulumu kendisi yapar.
          </p>
          <ul className="mt-3 grid gap-2">
            <li>
              Claude Code:{" "}
              <a href="https://code.claude.com/docs/en/desktop" className="inline-flex min-h-11 items-center">
                Claude masaüstü
              </a>{" "}
              (Mac, Windows), Code sekmesi.
            </li>
            <li>
              Codex:{" "}
              <a href="https://learn.chatgpt.com/docs/app" className="inline-flex min-h-11 items-center">
                ChatGPT masaüstü
              </a>
              , Codex bölümü.
            </li>
          </ul>
          <KopyalaKutusu etiket="Claude Code ya da Codex'e yapıştırılacak metin" metin={KURULUM_ISTEGI} uzun />
          <p className="mt-2 text-base text-soluk">claude.ai ve ChatGPT sohbetinde aşağıdaki adımları izleyin.</p>
          <h3 className="bolum-etiketi mt-8 text-lg text-metin">Kendiniz ekleyin</h3>
          <div className="mt-4 grid gap-3">
            {UYGULAMALAR.map((u) => (
              <UygulamaBolumu key={u.kimlik} u={u} />
            ))}
          </div>
          <h3 className="bolum-etiketi mt-8 text-lg text-metin">Geliştirici araçları</h3>
          <div className="mt-3 grid gap-3">
            {GELISTIRICI_ARACLARI.map((u) => (
              <UygulamaBolumu key={u.kimlik} u={u} />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="adim-2" className="border-t border-cizgi bg-yuzey">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={2} id="adim-2">
            akredit yazın
          </AdimBasligi>
          <ol className="mt-4 grid list-decimal gap-2 pl-7">
            <li>Yeni sohbette akredit yazın.</li>
            <li>Menüden numarayla seçin.</li>
          </ol>
          <figure className="mt-6 rounded-sm border border-cizgi bg-zemin p-4 sm:p-5">
            <figcaption className="bolum-etiketi text-base text-soluk">Örnek konuşma (kurgu)</figcaption>
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
            OBS'de parolanızı yalnız OBS'nin kendi ekranına yazın; sohbete asla yazmayın.
          </p>
        </div>
      </section>

      <section aria-labelledby="takildiniz" className="border-t border-cizgi bg-zemin">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <div aria-hidden className="mx-auto mb-8 max-w-xl overflow-hidden border-y border-cizgi py-2">
            <Gorsel gorsel={GORSELLER.araclar} alt="" boyutlar="(min-width: 40rem) 36rem, calc(100vw - 2rem)" />
          </div>
          <h2 id="takildiniz" className="text-[1.75rem] leading-tight text-vurgu">
            Takıldınız mı?
          </h2>
          <div className="mt-4 grid gap-2">
            {SSS.map((s) => (
              <details key={s.soru} className="kart rounded-sm border border-cizgi bg-yuzey">
                <summary className="flex min-h-12 cursor-pointer items-center px-4 py-2">{s.soru}</summary>
                <p className="border-t border-cizgi px-4 py-3">{s.cevap}</p>
              </details>
            ))}
          </div>
          <p className="mt-6">
            <Link href="/mcp-kullan" className={`inline-flex min-h-11 items-center ${BAG}`}>
              Ayrıntılı rehber ve bütün araçlar
            </Link>
          </p>
        </div>
      </section>

      <section aria-label="Akredit'in ilkesi" className="border-t border-cizgi bg-yuzey">
        <div data-belir className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <p className="font-baslik text-[1.9rem] leading-[1.2] tracking-[-0.015em] text-balance text-vurgu sm:text-[2.6rem]">
            {SLOGAN.split(" ").map((k, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: sabit cümlenin kelimeleri; sıra değişmez
              <span key={i} className="slogan-kelime" style={{ "--sira": i } as CSSProperties}>
                {k}{" "}
              </span>
            ))}
          </p>
        </div>
      </section>
    </>
  );
}
