// YÖKAK resmî belgelerinden ölçüt ağacı çıkarma. Saf işlevler: sayfa metinleri dışarıda
// (@akredit/belge) çıkarılır. Hiçbir metin burada yazılmaz; yalnız belgedeki satırlar ayrılır.
// Ayrıştırılamayan kısım boş döner ve uyarı verilir; çağıran DOGRULANMADI işaretler.

import type { BelgeSayfasi } from "./ice-aktarma.ts";

/** Satırları tek boşlukla birleştirir (PDF satır sonları metnin parçası değildir). */
export const birlestir = (satirlar: readonly string[]): string => satirlar.join(" ").replace(/\s+/g, " ").trim();

/** Karşılaştırma için metni boşluk farkından arındırır. */
export const normalize = (metin: string): string => metin.replace(/\s+/g, " ").trim();

export interface UstOlcutHam {
  kod: string;
  baslik: string;
  /** Ana başlıkta (A–D) belgedeki açıklama satırları; yoksa boş. */
  metin: string;
  sayfa: number;
}

/**
 * "YÖKAK Değerlendirme Ölçütleri" belgesinden ana başlıklar (A.) ve ölçütler (A.1).
 * Ölçüt metni, sonraki koda ya da "Tablo 1." satırına kadar süren satırlardır.
 */
export function olcutleriCozumle(sayfalar: readonly BelgeSayfasi[]): UstOlcutHam[] {
  const sonuc: { o: UstOlcutHam; satirlar: string[]; acikParantez: boolean }[] = [];
  let gecerli: (typeof sonuc)[number] | null = null;
  let basladi = false;
  for (const s of [...sayfalar].sort((a, b) => a.sayfa - b.sayfa)) {
    for (const ham of s.metin.split(/\r?\n/)) {
      const satir = ham.trim();
      if (!satir) continue;
      if (/^Tablo 1\. /.test(satir)) return bitir(sonuc);
      const ana = /^([A-D])\.\s+(\S.*)$/.exec(satir);
      const olcut = /^([A-D]\.\d)\s+(\S.*)$/.exec(satir);
      const m = olcut ?? ana;
      if (m?.[1] && m[2]) {
        basladi = true;
        const baslik = m[2].trim();
        gecerli = {
          o: { kod: m[1], baslik, metin: "", sayfa: s.sayfa },
          satirlar: [],
          acikParantez: (baslik.match(/\(/g)?.length ?? 0) > (baslik.match(/\)/g)?.length ?? 0),
        };
        sonuc.push(gecerli);
        continue;
      }
      if (!basladi || !gecerli) continue;
      if (gecerli.acikParantez) {
        gecerli.o.baslik = `${gecerli.o.baslik} ${satir}`;
        gecerli.acikParantez = !satir.includes(")");
        continue;
      }
      gecerli.satirlar.push(satir);
    }
  }
  return bitir(sonuc);
}

function bitir(liste: { o: UstOlcutHam; satirlar: string[] }[]): UstOlcutHam[] {
  return liste.map(({ o, satirlar }) => ({ ...o, metin: birlestir(satirlar) }));
}

export interface AltOlcutHam {
  kod: string;
  baslik: string;
  /** Alt ölçüt açıklaması (dereceli anahtarda düzey tablosundan önceki paragraf). */
  metin: string;
  /** 1–5 olgunluk düzeyi metinleri; ayrıştırılamadıysa boş. */
  duzeyler: string[];
  ornekKanitlar: string[];
  sayfa: number;
}

/** Düzey sütunlarında satırlar dardır; açıklama paragrafının satırları geniştir. */
const SUTUN_GENISLIGI = 30;
const ACIKLAMA_GENISLIGI = 40;

/**
 * "YÖKAK Dereceli Değerlendirme Anahtarı" (Değerlendirme Programları Kılavuzu Ek-1)
 * sayfalarından alt ölçütler. Her alt ölçüt bir sayfadadır: kod ve başlık, açıklama,
 * beş düzey metni, "Örnek Kanıtlar" maddeleri.
 */
export function anahtariCozumle(sayfalar: readonly BelgeSayfasi[]): { altOlcutler: AltOlcutHam[]; uyarilar: string[] } {
  const altOlcutler: AltOlcutHam[] = [];
  const uyarilar: string[] = [];
  for (const s of [...sayfalar].sort((a, b) => a.sayfa - b.sayfa)) {
    const satirlar = s.metin
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    const i = satirlar.findIndex((x) => /^[A-D]\.\d\.\d+\.\s*\S/.test(x));
    const k = satirlar.indexOf("Örnek Kanıtlar");
    if (i < 0 || k < i || satirlar[i - 1] !== "1 2 3 4 5") continue;
    const m = /^([A-D]\.\d\.\d+)\.\s*(\S.*)$/.exec(satirlar[i] ?? "");
    if (!m?.[1] || !m[2]) continue;
    let baslik = m[2];
    let j = i + 1;
    // Başlık satırı kırılmışsa devamı küçük harfle başlar.
    while (j < k && /^\p{Ll}/u.test(satirlar[j] ?? "")) baslik = `${baslik} ${satirlar[j++]}`;
    baslik = baslik.replace(/\*+$/, "");
    // Açıklama ve düzeyler: noktayla biten satırlarda gruplara ayrılır; son beş grup düzeylerdir.
    const gruplar: string[][] = [];
    let g: string[] = [];
    for (const x of satirlar.slice(j, k)) {
      g.push(x);
      if (/\.\)?$/.test(x)) {
        gruplar.push(g);
        g = [];
      }
    }
    // Önce son beş grup düzey sayılır; düzey satırlarının hepsi dar olmalıdır.
    const duzeyGruplari = gruplar.slice(-5);
    const tamam =
      g.length === 0 && gruplar.length > 5 && duzeyGruplari.every((d) => d.every((x) => x.length <= SUTUN_GENISLIGI));
    // Düzeyler ayrılamazsa açıklama, en az bir geniş satır içeren baştaki gruplardır.
    let n = tamam ? gruplar.length - 5 : 0;
    if (!tamam) while (n < gruplar.length && gruplar[n]?.some((x) => x.length > ACIKLAMA_GENISLIGI)) n++;
    const aciklama = gruplar.slice(0, n).flat();
    const aciklamaTamam = aciklama.length > 0;
    if (!aciklamaTamam) uyarilar.push(`${m[1]} (${s.sayfa}. sayfa): açıklama ayrıştırılamadı.`);
    if (!tamam) uyarilar.push(`${m[1]} (${s.sayfa}. sayfa): düzey sütunları ayrıştırılamadı.`);
    // Örnek kanıtlar: "●" ile başlayan maddeler; dipnot ("*") ya da sayfa sonunda biter.
    const kanitlar: string[][] = [];
    for (const x of satirlar.slice(k + 1)) {
      if (x.startsWith("*")) break;
      if (x.startsWith("●")) kanitlar.push([x.replace(/^●\s*/, "")]);
      else kanitlar.at(-1)?.push(x);
    }
    altOlcutler.push({
      kod: m[1],
      baslik,
      metin: aciklamaTamam ? birlestir(aciklama) : "",
      duzeyler: tamam ? duzeyGruplari.map(birlestir) : [],
      ornekKanitlar: kanitlar.map(birlestir),
      sayfa: s.sayfa,
    });
  }
  return { altOlcutler, uyarilar };
}
