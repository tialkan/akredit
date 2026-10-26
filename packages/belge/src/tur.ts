// Belge türü tahmini: önce sihirli baytlar, sonra uzantı, sonra MIME.

import type { BelgeIpucu, BelgeTuru } from "./turler.ts";
import { zipAdlari } from "./zip.ts";

/** Eski ikili Office biçimleri (OLE): .doc, .xls, .ppt. */
export function oleMi(v: Uint8Array): boolean {
  const imza = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return v.length >= 8 && imza.every((b, i) => v[i] === b);
}

function basliyor(v: Uint8Array, baytlar: number[], kayma = 0): boolean {
  if (v.length < kayma + baytlar.length) return false;
  return baytlar.every((b, i) => v[kayma + i] === b);
}

/** Uzantıyı küçük harfle verir (nokta olmadan). */
export function uzanti(ad?: string): string {
  if (!ad) return "";
  const m = /\.([^./\\]+)$/.exec(ad);
  return m ? (m[1] as string).toLowerCase() : "";
}

const UZANTI: Record<string, BelgeTuru> = {
  pdf: "pdf",
  docx: "docx",
  docm: "docx",
  xlsx: "xlsx",
  xlsm: "xlsx",
  pptx: "pptx",
  odt: "odt",
  ods: "ods",
  odp: "pptx",
  csv: "csv",
  tsv: "csv",
  htm: "html",
  html: "html",
  xhtml: "html",
  txt: "metin",
  md: "metin",
  markdown: "metin",
  json: "json",
  png: "gorsel",
  jpg: "gorsel",
  jpeg: "gorsel",
  tif: "gorsel",
  tiff: "gorsel",
};

const MIME: Record<string, BelgeTuru> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.presentation": "pptx",
  "text/csv": "csv",
  "text/html": "html",
  "text/plain": "metin",
  "text/markdown": "metin",
  "application/json": "json",
  "image/png": "gorsel",
  "image/jpeg": "gorsel",
  "image/tiff": "gorsel",
};

function zipTuru(v: Uint8Array): BelgeTuru | undefined {
  // ODF: ilk dosya sıkıştırılmamış "mimetype"; içeriği yerel başlıktan sonra gelir.
  const metin = new TextDecoder("latin1").decode(v.subarray(0, 200));
  if (metin.includes("mimetypeapplication/vnd.oasis.opendocument.")) {
    if (metin.includes("opendocument.text")) return "odt";
    if (metin.includes("opendocument.spreadsheet")) return "ods";
    if (metin.includes("opendocument.presentation")) return "pptx";
  }
  let adlar: string[];
  try {
    adlar = zipAdlari(v);
  } catch {
    return undefined;
  }
  if (adlar.includes("[Content_Types].xml")) {
    if (adlar.some((a) => a.startsWith("word/"))) return "docx";
    if (adlar.some((a) => a.startsWith("xl/"))) return "xlsx";
    if (adlar.some((a) => a.startsWith("ppt/"))) return "pptx";
  }
  return undefined;
}

/** Bir ODP dosyası mı? (`pptx` türü altında ele alınır, içi farklıdır.) */
export function odfMi(v: Uint8Array): boolean {
  const metin = new TextDecoder("latin1").decode(v.subarray(0, 200));
  return metin.includes("mimetypeapplication/vnd.oasis.opendocument.");
}

export function turTahminEt(veri: Uint8Array, ipucu?: BelgeIpucu): BelgeTuru {
  if (basliyor(veri, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  if (basliyor(veri, [0x89, 0x50, 0x4e, 0x47])) return "gorsel";
  if (basliyor(veri, [0xff, 0xd8, 0xff])) return "gorsel";
  if (basliyor(veri, [0x49, 0x49, 0x2a, 0x00]) || basliyor(veri, [0x4d, 0x4d, 0x00, 0x2a])) return "gorsel";
  if (basliyor(veri, [0x50, 0x4b, 0x03, 0x04])) {
    const z = zipTuru(veri);
    if (z) return z;
  }
  const u = uzanti(ipucu?.ad);
  if (u && UZANTI[u]) return UZANTI[u];
  const mime = ipucu?.mime?.split(";")[0]?.trim().toLowerCase();
  if (mime && MIME[mime]) return MIME[mime];
  if (oleMi(veri)) return "bilinmiyor";
  // İçerikten metin türü tahmini.
  const bas = new TextDecoder("utf-8").decode(veri.subarray(0, 512)).replace(/^﻿/, "").trimStart();
  if (veri.subarray(0, 4096).includes(0)) return "bilinmiyor";
  if (/^<(!doctype html|html|head|body)/i.test(bas)) return "html";
  if (/^[{[]/.test(bas)) {
    try {
      JSON.parse(new TextDecoder().decode(veri));
      return "json";
    } catch {
      /* düz metin */
    }
  }
  return veri.length > 0 ? "metin" : "bilinmiyor";
}
