// PDF metin çıkarma (unpdf / PDF.js). Sayfa başına bir bölüm; metin katmanı yoksa OCR'a yönlendirilir.

import { extractText, getDocumentProxy } from "unpdf";
import type { BelgeBolumu } from "./turler.ts";

export interface PdfSonucu {
  bolumler: BelgeBolumu[];
  tablolar: never[];
  sayfaSayisi: number;
  ocrGerekli: boolean;
  uyarilar: string[];
}

/** Sayfa başına ortalama bu kadar harften azı varsa metin katmanı "seyrek" sayılır. */
const SEYREK_ESIK = 20;

export class ZamanAsimi extends Error {}

export async function zamanSinirli<T>(is: Promise<T>, ms: number): Promise<T> {
  let zamanlayici: ReturnType<typeof setTimeout> | undefined;
  const asim = new Promise<never>((_, reddet) => {
    zamanlayici = setTimeout(() => reddet(new ZamanAsimi("zaman aşımı")), ms);
  });
  try {
    return await Promise.race([is, asim]);
  } finally {
    clearTimeout(zamanlayici);
  }
}

export async function pdfOku(veri: Uint8Array, zamanAsimiMs: number): Promise<PdfSonucu> {
  // PDF.js tamponu devralabilir; özgün veriyi korumak için kopya verilir.
  const kopya = new Uint8Array(veri);
  const is = (async () => {
    const belge = await getDocumentProxy(kopya);
    try {
      return await extractText(belge, { mergePages: false });
    } finally {
      await (belge as unknown as { destroy?: () => Promise<void> }).destroy?.();
    }
  })();
  const { totalPages, text } = await zamanSinirli(is, zamanAsimiMs);
  const bolumler: BelgeBolumu[] = text.map((t, i) => ({
    capa: { sayfa: i + 1 },
    metin: t.replace(/[ \t]+\n/g, "\n").trim(),
  }));
  const harf = bolumler.reduce((n, b) => n + (b.metin.match(/\p{L}/gu)?.length ?? 0), 0);
  const ocrGerekli = totalPages > 0 && harf / totalPages < SEYREK_ESIK;
  const uyarilar: string[] = [];
  if (ocrGerekli) {
    uyarilar.push(
      harf === 0
        ? "Bu PDF taranmış bir görüntü, içinde okunabilir metin yok. Metin tanıma (OCR) sırasına alınmalı."
        : "Bu PDF'te çok az okunabilir metin var, büyük bölümü taranmış olabilir. Metin tanıma (OCR) sırasına alınmalı.",
    );
  }
  return { bolumler, tablolar: [], sayfaSayisi: totalPages, ocrGerekli, uyarilar };
}
