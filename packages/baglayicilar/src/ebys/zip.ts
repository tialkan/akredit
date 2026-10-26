// En küçük ZIP okuyucu (merkez dizin; stored ve deflate). @akredit/belge zip okuyucusunu dışa açmadığı için burada.
// Sayı, boyut ve sıkıştırma oranı sınırlıdır; yol geçişi ("../") olan girdiler reddedilir.

import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";
import { BaglayiciHatasi } from "../avesis/istek.ts";

export interface ZipSiniri {
  enCokGirdi: number;
  enBuyukToplam: number;
  enBuyukOran: number;
}
export const VARSAYILAN_ZIP_SINIRI: ZipSiniri = { enCokGirdi: 500, enBuyukToplam: 200 * 1024 * 1024, enBuyukOran: 200 };

export function zipOku(veri: Uint8Array, sinir: ZipSiniri = VARSAYILAN_ZIP_SINIRI): Map<string, Uint8Array> {
  const dv = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  let eocd = -1;
  for (let i = veri.length - 22; i >= Math.max(0, veri.length - 65_557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new BaglayiciHatasi("Paket okunamadı: dosya bir ZIP/EYP paketi değil.");
  const adet = dv.getUint16(eocd + 10, true);
  if (adet > sinir.enCokGirdi) throw new BaglayiciHatasi("Pakette çok fazla dosya var.");
  let p = dv.getUint32(eocd + 16, true);
  const cik = new Map<string, Uint8Array>();
  const td = new TextDecoder();
  let toplam = 0;
  for (let k = 0; k < adet; k++) {
    if (p + 46 > veri.length || dv.getUint32(p, true) !== 0x02014b50) throw new BaglayiciHatasi("Paket bozuk.");
    const yontem = dv.getUint16(p + 10, true);
    const sikisik = dv.getUint32(p + 20, true);
    const acik = dv.getUint32(p + 24, true);
    const adUz = dv.getUint16(p + 28, true);
    const ekUz = dv.getUint16(p + 30, true);
    const yorumUz = dv.getUint16(p + 32, true);
    const yerel = dv.getUint32(p + 42, true);
    const ad = td.decode(veri.subarray(p + 46, p + 46 + adUz));
    p += 46 + adUz + ekUz + yorumUz;
    if (ad.endsWith("/")) continue;
    if (ad.startsWith("/") || ad.split(/[\\/]/).includes("..")) throw new BaglayiciHatasi("Pakette güvensiz dosya yolu var.");
    toplam += acik;
    if (toplam > sinir.enBuyukToplam || (sikisik > 0 && acik / sikisik > sinir.enBuyukOran))
      throw new BaglayiciHatasi("Paket açıldığında çok büyük; daha küçük paketler yükleyin.");
    const yAdUz = dv.getUint16(yerel + 26, true);
    const yEkUz = dv.getUint16(yerel + 28, true);
    const bas = yerel + 30 + yAdUz + yEkUz;
    const ham = veri.subarray(bas, bas + sikisik);
    let icerik: Uint8Array;
    if (yontem === 0) icerik = ham;
    else if (yontem === 8) icerik = new Uint8Array(inflateRawSync(ham, { maxOutputLength: Math.max(acik, 1) }));
    else throw new BaglayiciHatasi("Paket desteklenmeyen biçimde sıkıştırılmış.");
    cik.set(ad, icerik);
  }
  return cik;
}

/** Testler ve basit paketler için ZIP yazıcı (deflate). */
export function zipYaz(dosyalar: Record<string, Uint8Array | string>): Uint8Array {
  const te = new TextEncoder();
  const yereller: Uint8Array[] = [];
  const merkez: Uint8Array[] = [];
  let ofset = 0;
  for (const [ad, d] of Object.entries(dosyalar)) {
    const acik = typeof d === "string" ? te.encode(d) : d;
    const sik = new Uint8Array(deflateRawSync(acik));
    const adB = te.encode(ad);
    const crc = crc32(acik) >>> 0;
    const y = new Uint8Array(30 + adB.length);
    const yv = new DataView(y.buffer);
    yv.setUint32(0, 0x04034b50, true);
    yv.setUint16(4, 20, true);
    yv.setUint16(6, 0x0800, true);
    yv.setUint16(8, 8, true);
    yv.setUint32(14, crc, true);
    yv.setUint32(18, sik.length, true);
    yv.setUint32(22, acik.length, true);
    yv.setUint16(26, adB.length, true);
    y.set(adB, 30);
    const m = new Uint8Array(46 + adB.length);
    const mv = new DataView(m.buffer);
    mv.setUint32(0, 0x02014b50, true);
    mv.setUint16(4, 20, true);
    mv.setUint16(6, 20, true);
    mv.setUint16(8, 0x0800, true);
    mv.setUint16(10, 8, true);
    mv.setUint32(16, crc, true);
    mv.setUint32(20, sik.length, true);
    mv.setUint32(24, acik.length, true);
    mv.setUint16(28, adB.length, true);
    mv.setUint32(42, ofset, true);
    m.set(adB, 46);
    yereller.push(y, sik);
    merkez.push(m);
    ofset += y.length + sik.length;
  }
  const mBoy = merkez.reduce((t, x) => t + x.length, 0);
  const son = new Uint8Array(22);
  const sv = new DataView(son.buffer);
  sv.setUint32(0, 0x06054b50, true);
  sv.setUint16(8, merkez.length, true);
  sv.setUint16(10, merkez.length, true);
  sv.setUint32(12, mBoy, true);
  sv.setUint32(16, ofset, true);
  const parcalar = [...yereller, ...merkez, son];
  const cik = new Uint8Array(parcalar.reduce((t, x) => t + x.length, 0));
  let o = 0;
  for (const x of parcalar) {
    cik.set(x, o);
    o += x.length;
  }
  return cik;
}
