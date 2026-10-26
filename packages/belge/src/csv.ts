// CSV okuma: kodlama (UTF-8 / Windows-1254), ayraç (; , sekme), tırnaklı alanlar, ondalık virgül.

import type { HucreDegeri } from "./turler.ts";

/** Baytları metne çevirir: BOM'lu ya da geçerli UTF-8 değilse Windows-1254 (Türkçe) varsayılır. */
export function metneCevir(veri: Uint8Array): { metin: string; kodlama: "utf-8" | "windows-1254" | "utf-16le" } {
  if (veri[0] === 0xef && veri[1] === 0xbb && veri[2] === 0xbf) {
    return { metin: new TextDecoder("utf-8").decode(veri.subarray(3)), kodlama: "utf-8" };
  }
  if (veri[0] === 0xff && veri[1] === 0xfe) {
    return { metin: new TextDecoder("utf-16le").decode(veri.subarray(2)), kodlama: "utf-16le" };
  }
  try {
    return { metin: new TextDecoder("utf-8", { fatal: true }).decode(veri), kodlama: "utf-8" };
  } catch {
    return { metin: new TextDecoder("windows-1254").decode(veri), kodlama: "windows-1254" };
  }
}

/** İlk satırlardaki tırnak dışı ayraç sayılarına bakarak ayracı seçer. */
export function ayracBul(metin: string): string {
  const adaylar = [";", ",", "\t"];
  const satirlar = metin
    .split(/\r?\n/)
    .filter((s) => s.trim() !== "")
    .slice(0, 20);
  let enIyi = ",";
  let enIyiPuan = -1;
  for (const a of adaylar) {
    const sayilar = satirlar.map((s) => tirnakDisiSay(s, a));
    const ilk = sayilar[0] ?? 0;
    if (ilk === 0) continue;
    const tutarli = sayilar.filter((n) => n === ilk).length;
    const puan = tutarli * 1000 + ilk;
    if (puan > enIyiPuan) {
      enIyiPuan = puan;
      enIyi = a;
    }
  }
  return enIyi;
}

function tirnakDisiSay(s: string, a: string): number {
  let n = 0;
  let ic = false;
  for (const c of s) {
    if (c === '"') ic = !ic;
    else if (c === a && !ic) n++;
  }
  return n;
}

/** RFC 4180 tarzı ayrıştırma; tırnak içinde ayraç, satır sonu ve "" kaçışı desteklenir. */
export function csvAyristir(metin: string, ayrac: string): string[][] {
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let alan = "";
  let ic = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i] as string;
    if (ic) {
      if (c === '"') {
        if (metin[i + 1] === '"') {
          alan += '"';
          i++;
        } else ic = false;
      } else alan += c;
    } else if (c === '"' && alan === "") ic = true;
    else if (c === ayrac) {
      satir.push(alan);
      alan = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan);
      satirlar.push(satir);
      satir = [];
      alan = "";
    } else alan += c;
  }
  if (alan !== "" || satir.length > 0) {
    satir.push(alan);
    satirlar.push(satir);
  }
  return satirlar.filter((s) => !(s.length === 1 && s[0] === ""));
}

/**
 * Hücre metnini sayıya çevirir. Başında sıfır olan tam sayılar (öğrenci numarası gibi) metin kalır.
 * `ondalikVirgul` true ise "3,5" → 3.5 ve "1.234,5" → 1234.5.
 */
export function hucreCoz(s: string, ondalikVirgul: boolean): HucreDegeri {
  const t = s.trim();
  if (t === "") return null;
  if (/^-?0\d/.test(t)) return t;
  if (ondalikVirgul) {
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^-?\d+(,\d+)?$/.test(t)) {
      return Number(t.replace(/\./g, "").replace(",", "."));
    }
  } else if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return s;
}

export interface CsvSonucu {
  satirlar: HucreDegeri[][];
  ayrac: string;
  kodlama: string;
}

export function csvOku(veri: Uint8Array): CsvSonucu {
  const { metin, kodlama } = metneCevir(veri);
  const ayrac = ayracBul(metin);
  const ham = csvAyristir(metin, ayrac);
  // Ayraç virgül değilse ondalık ayıracı virgül kabul edilir (Türkçe Excel dışa aktarımı).
  const ondalikVirgul = ayrac !== ",";
  return { satirlar: ham.map((s) => s.map((h) => hucreCoz(h, ondalikVirgul))), ayrac, kodlama };
}
