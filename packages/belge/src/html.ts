// HTML ve düz metin / Markdown okuma.

import type { OkumaSonucu } from "./ooxml.ts";
import type { BelgeBolumu, Tablo } from "./turler.ts";
import { varlikCoz } from "./xml.ts";

const HTML_VARLIK: Record<string, string> = { nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»" };

function htmlVarlik(s: string): string {
  return varlikCoz(s.replace(/&([a-z]+);/gi, (t, ad: string) => HTML_VARLIK[ad.toLowerCase()] ?? t));
}

function etiketsiz(s: string): string {
  return htmlVarlik(
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/[ \t\r\f]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function htmlOku(html: string): OkumaSonucu {
  const temiz = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template|iframe|svg|object)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style)\b[^>]*\/>/gi, "");
  const govde = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(temiz)?.[1] ?? temiz;
  const tablolar: Tablo[] = [];
  const bolumler: BelgeBolumu[] = [];
  let simdiki: BelgeBolumu = { capa: { bolum: "§1" }, metin: "" };
  const parcalar = govde.split(/(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]\s*>|<table\b[\s\S]*?<\/table\s*>)/i);
  for (const p of parcalar) {
    const h = /^<h([1-6])\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>$/i.exec(p);
    if (h) {
      const baslik = etiketsiz(h[2] as string);
      if (!baslik) continue;
      if (simdiki.metin || simdiki.baslik) bolumler.push(simdiki);
      simdiki = { capa: { bolum: baslik }, baslik, duzey: Number(h[1]), metin: "" };
      continue;
    }
    if (/^<table\b/i.test(p)) {
      const satirlar = [...p.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].map((tr) =>
        [...(tr[1] as string).matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]\s*>/gi)].map((td) =>
          etiketsiz(td[1] as string),
        ),
      );
      tablolar.push({ capa: { ...simdiki.capa }, ad: `Tablo ${tablolar.length + 1}`, satirlar });
      continue;
    }
    const m = etiketsiz(p);
    if (m) simdiki.metin = simdiki.metin ? `${simdiki.metin}\n${m}` : m;
  }
  if (simdiki.metin || simdiki.baslik) bolumler.push(simdiki);
  return { bolumler, tablolar, uyarilar: [] };
}

/** Düz metin ya da Markdown: `#` başlıkları bölüm olur. */
export function metinOku(metin: string, markdown: boolean): OkumaSonucu {
  if (!markdown) {
    return { bolumler: metin.trim() ? [{ capa: { satir: 1 }, metin: metin.trim() }] : [], tablolar: [], uyarilar: [] };
  }
  const bolumler: BelgeBolumu[] = [];
  let simdiki: BelgeBolumu = { capa: { satir: 1 }, metin: "" };
  let kodBlogu = false;
  metin.split(/\r?\n/).forEach((satir, i) => {
    if (/^\s*(```|~~~)/.test(satir)) kodBlogu = !kodBlogu;
    const h = kodBlogu ? null : /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(satir);
    if (h) {
      if (simdiki.metin.trim() || simdiki.baslik) bolumler.push({ ...simdiki, metin: simdiki.metin.trim() });
      const baslik = h[2] as string;
      simdiki = { capa: { bolum: baslik, satir: i + 1 }, baslik, duzey: (h[1] as string).length, metin: "" };
    } else simdiki.metin += `${satir}\n`;
  });
  if (simdiki.metin.trim() || simdiki.baslik) bolumler.push({ ...simdiki, metin: simdiki.metin.trim() });
  return { bolumler, tablolar: [], uyarilar: [] };
}
