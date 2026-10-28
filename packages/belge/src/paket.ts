// Birden çok belgeyi tek .zip dosyasında paketleme (İP-37 Word paketi). Dosya adları düzleştirilir: klasör ve
// yol geçişi ("../") olmaz; aynı ad iki kez gelirse ikincisine sıra numarası eklenir.

import { zipSync } from "fflate";

export interface PaketDosyasi {
  ad: string;
  veri: Uint8Array;
}

/** Güvenli dosya adı: yalnız harf, rakam, nokta, tire ve alt çizgi; klasör kısmı atılır. */
export function guvenliDosyaAdi(ad: string): string {
  const son = ad.split(/[\\/]/u).pop() ?? "";
  const temiz = son.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^\.+/u, "");
  return temiz.slice(0, 150) || "belge";
}

/** Dosyaları .zip olarak paketler (sabit zaman damgasıyla: aynı girdi aynı bayt). */
export function zipPaketle(dosyalar: PaketDosyasi[]): Uint8Array {
  const icerik: Record<string, [Uint8Array, { mtime: Date; level: 6 }]> = {};
  for (const d of dosyalar) {
    const taban = guvenliDosyaAdi(d.ad);
    let ad = taban;
    for (let n = 2; ad in icerik; n++) ad = taban.replace(/(\.[^.]+)?$/u, `-${n}$1`);
    icerik[ad] = [d.veri, { mtime: new Date(Date.UTC(2026, 0, 1)), level: 6 }];
  }
  return zipSync(icerik);
}
