// Sayfa üst verisi ve yapılandırılmış veri (schema.org JSON-LD). Saf işlevler; test edilir.

import type { Metadata } from "next";
import { SAYFALAR, type SayfaBilgisi, SITE_ADRESI } from "./icerik.ts";

export function tamAdres(yol: string): string {
  return yol === "/" ? `${SITE_ADRESI}/` : `${SITE_ADRESI}${yol}`;
}

/** Her sayfaya özgün başlık, açıklama, canonical ve paylaşım kartı. */
export function sayfaUstVerisi(s: SayfaBilgisi): Metadata {
  return {
    title: s.yol === "/" ? { absolute: s.title } : s.title,
    description: s.aciklama,
    alternates: { canonical: tamAdres(s.yol) },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "Akredit",
      url: tamAdres(s.yol),
      title: s.title,
      description: s.aciklama,
      images: [{ url: "/marka/og.png", width: 1200, height: 630, alt: "Akredit" }],
    },
  };
}

export const KURULUS = {
  "@type": "Organization",
  "@id": `${SITE_ADRESI}/#kurulus`,
  name: "Akredit",
  url: `${SITE_ADRESI}/`,
  logo: `${SITE_ADRESI}/marka/simge-512.png`,
  description: SAYFALAR.ana.aciklama,
};

export function kirintiYolu(s: SayfaBilgisi) {
  const ogeler = [{ ad: SAYFALAR.ana.ad, yol: "/" }, ...(s.yol === "/" ? [] : [{ ad: s.ad, yol: s.yol }])];
  return {
    "@type": "BreadcrumbList",
    itemListElement: ogeler.map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: o.ad,
      item: tamAdres(o.yol),
    })),
  };
}

export function sssVerisi(sorular: readonly { soru: string; cevap: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: sorular.map((x) => ({
      "@type": "Question",
      name: x.soru,
      acceptedAnswer: { "@type": "Answer", text: x.cevap },
    })),
  };
}

/** Bir sayfanın JSON-LD grafiği: kuruluş, kırıntı yolu ve isteğe bağlı ek düğümler. */
export function yapisalVeri(s: SayfaBilgisi, ek: object[] = []): string {
  const graf = { "@context": "https://schema.org", "@graph": [KURULUS, kirintiYolu(s), ...ek] };
  // "<" kaçışlanır: metin </script> ile betik bloğunu kapatamaz.
  return JSON.stringify(graf).replace(/</gu, "\\u003c");
}
