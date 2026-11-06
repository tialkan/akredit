// Ana sayfa: tek amaç (kurucu isteği, İP-49). Akredit'i yapay zekânıza ekleyin, sonra akredit yazın.
// Kurulum adımları elle yazılmaz; herkese açık MCP'nin kurulum rehberinden (kurulum_yardimi aracı) okunur.
// Platform tanıtımı ve diğer her şey /proje sayfasındadır.

import { AKREDIT_ODAKLARI } from "@akredit/acik-mcp";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { dugmeSinifi } from "../../bilesenler/dugme.tsx";
import { AdimListesi } from "../../site/adim-listesi.tsx";
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
import { ornekDenetim } from "../../site/ornek-denetim.ts";
import { anaSayfaDugumleri, sayfaUstVerisi, sssVerisi } from "../../site/yapisal.ts";

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
    cevap:
      "Akredit ücretsizdir, hesap istemez. Claude ya da ChatGPT'nin ücretli planı (aylık 20 dolar) ayrıca gerekir.",
  },
  {
    soru: "Yazdıklarım nereye gidiyor?",
    cevap:
      "İstek içeriği kaydedilmez; yalnız araç adı, süre ve boyut yazılır. Öğrenci adı, numara ya da parola göndermeyin.",
  },
  {
    soru: "ChatGPT'de olmuyor",
    cevap:
      "Özel bağlayıcı eklemenin açık olup olmadığı planınıza göre değişebilir. Kurum hesabında izinleri yönetici verir.",
  },
];

const BAG = "text-vurgu underline underline-offset-4";

const ADIMLAR = [
  { id: "adim-1", ad: "Uygulamayı indirin" },
  { id: "adim-2", ad: "Akredit'i ekleyin" },
  { id: "adim-3", ad: "akredit yazın" },
];

/** Önerilen masaüstü uygulamaları. Plan adı ve fiyatı sağlayıcının fiyat sayfasındandır (Kasım 2026). */
const MASAUSTU = [
  {
    ad: "Claude",
    yer: "Mac ve Windows. Code sekmesi Claude Code'dur.",
    plan: "Claude Pro",
    indir: "https://code.claude.com/docs/en/desktop",
    fiyat: "https://claude.com/pricing",
  },
  {
    ad: "ChatGPT",
    yer: "Mac ve Windows. Codex bölümü kullanılır.",
    plan: "ChatGPT Plus",
    indir: "https://learn.chatgpt.com/docs/app",
    fiyat: "https://chatgpt.com/pricing",
  },
];

/** Kapanış sloganı; kelimeleri sırayla belirir. */
const SLOGAN = "Kurallar ve hesaplar Akredit'te. Karar ve son tık sizde.";

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

/** Önce/sonra: kurgu ders sayfası, gerçek Bologna denetimi. Bulgu metinleri hesaptan gelir. */
function OnceSonra() {
  const { once, sonra } = ornekDenetim();
  return (
    <figure className="rounded-sm border border-cizgi-guclu bg-zemin p-4 text-base sm:p-5">
      <figcaption className="bolum-etiketi text-soluk">Örnek: kurgu bir ders sayfası, gerçek denetim</figcaption>
      <h2 className="mt-3 text-xl text-vurgu">Önce: {once.length} bulgu</h2>
      <ul className="mt-2 grid list-disc gap-1 pl-5">
        {once.map((b) => (
          <li key={b.kural}>{b.aciklama}</li>
        ))}
      </ul>
      <h2 className="mt-4 text-xl text-vurgu">Sonra: {sonra.length === 0 ? "bulgu yok" : `${sonra.length} bulgu`}</h2>
      <p className="mt-1 text-soluk">İş yükü, değerlendirme ve haftalar düzeltildi; denetim yeniden çalıştı.</p>
    </figure>
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
      <YapisalVeri sayfa={SAYFALAR.ana} ek={[...anaSayfaDugumleri(), sssVerisi(SSS)]} />
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
          </div>
          <OnceSonra />
        </div>
      </section>

      <nav aria-label="Kurulum adımları" className="border-b border-cizgi bg-zemin">
        <ol className="mx-auto grid max-w-3xl gap-2 px-4 py-4 text-base sm:grid-cols-3">
          {ADIMLAR.map((a, i) => (
            <li key={a.id}>
              <a
                href={`#${a.id}`}
                className="flex min-h-11 items-center gap-3 rounded-sm border border-cizgi bg-yuzey px-3 py-2 text-metin no-underline hover:border-vurgu"
              >
                <span
                  aria-hidden
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-vurgu font-baslik text-yuzey"
                >
                  {i + 1}
                </span>
                <span>{a.ad}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="kurulum" aria-labelledby="adim-1" className="bg-zemin">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={1} id="adim-1">
            Uygulamayı indirin
          </AdimBasligi>
          <p className="mt-3">Akredit en kolay bu iki masaüstü uygulamasından biriyle çalışır. Birini seçin.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {MASAUSTU.map((m) => (
              <div key={m.ad} className="kart flex flex-col rounded-sm border border-cizgi-guclu bg-yuzey p-5">
                <h3 className="text-2xl text-vurgu">{m.ad}</h3>
                <p className="mt-1 text-soluk">{m.yer}</p>
                <p className="mt-3">
                  Ücretli plan gerekir: <strong>{m.plan}</strong>, aylık 20 dolar.{" "}
                  <a href={m.fiyat} className={BAG}>
                    Planlar
                  </a>
                </p>
                <a href={m.indir} className={dugmeSinifi("birincil", "orta", "mt-5 min-h-11 self-start")}>
                  {m.ad} indir
                </a>
              </div>
            ))}
          </div>
          <p className="mt-4 text-base text-soluk">
            Uygulamayı açın, hesabınızla girin ve planınızı etkinleştirin. Akredit'in kendisi ücretsizdir.
          </p>
        </div>
      </section>

      <section aria-labelledby="adim-2" className="border-t border-cizgi bg-yuzey">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={2} id="adim-2">
            Akredit'i ekleyin
          </AdimBasligi>
          <ol className="mt-4 grid list-decimal gap-2 pl-7">
            <li>Claude'da Code sekmesini, ChatGPT'de Codex bölümünü açın.</li>
            <li>Yeni bir oturum başlatın.</li>
            <li>Aşağıdaki metni kopyalayıp yapıştırın. Kurulumu kendisi yapar; sizden yalnız onay ister.</li>
          </ol>
          <KopyalaKutusu etiket="Yapıştırılacak metin" metin={KURULUM_ISTEGI} uzun />
          <details className="kart mt-8 rounded-sm border border-cizgi bg-zemin">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 py-2">
              Başka bir uygulama mı kullanıyorsunuz? (claude.ai, ChatGPT sohbeti, Cursor, VS Code)
            </summary>
            <div className="grid gap-3 border-t border-cizgi p-4">
              {[...UYGULAMALAR, ...GELISTIRICI_ARACLARI].map((u) => (
                <UygulamaBolumu key={u.kimlik} u={{ ...u, acik: false }} />
              ))}
            </div>
          </details>
        </div>
      </section>

      <section aria-labelledby="adim-3" className="border-t border-cizgi bg-zemin">
        <div data-belir className="mx-auto max-w-3xl px-4 py-10 text-lg sm:py-14">
          <AdimBasligi no={3} id="adim-3">
            akredit yazın
          </AdimBasligi>
          <ol className="mt-4 grid list-decimal gap-2 pl-7">
            <li>Yeni sohbette akredit yazın.</li>
            <li>Menü gelmezse şunu yazın: Akredit araçlarıyla Bologna paketimi denetle</li>
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

      <section aria-labelledby="takildiniz" className="border-t border-cizgi bg-yuzey">
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
            <span className="sr-only">{SLOGAN}</span>
            {SLOGAN.split(" ").map((k, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: sabit cümlenin kelimeleri; sıra değişmez
              <span key={i} aria-hidden className="slogan-kelime" style={{ "--sira": i } as CSSProperties}>
                {k}{" "}
              </span>
            ))}
          </p>
        </div>
      </section>
    </>
  );
}
