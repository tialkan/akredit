// ZIP tabanlı biçimleri (OOXML, ODF) sınırlı açma. ZIP bombasına karşı dosya sayısı, açılmış toplam
// boyut ve sıkıştırma oranı denetlenir. fflate her girdiyi bildirilen boyutta bir tampona açar, bu yüzden
// başlıkta küçük boyut bildirip büyük veri açan bir girdi de sınırı aşamaz.

import { unzipSync } from "fflate";

export class GuvenlikHatasi extends Error {}

export interface ZipSinirlari {
  enBuyukAcilmisBoyut: number;
  enBuyukDosyaSayisi: number;
  enBuyukOran: number;
}

export const VARSAYILAN_ZIP: ZipSinirlari = {
  enBuyukAcilmisBoyut: 500 * 1024 * 1024,
  enBuyukDosyaSayisi: 10_000,
  enBuyukOran: 200,
};

export type ZipIcerik = Record<string, Uint8Array>;

/** ZIP'in içindekilerin adlarını açmadan listeler. */
export function zipAdlari(veri: Uint8Array): string[] {
  const adlar: string[] = [];
  unzipSync(veri, {
    filter: (f) => {
      adlar.push(f.name);
      return false;
    },
  });
  return adlar;
}

/** ZIP'i sınırlar içinde açar. `secici` verilirse yalnız seçilen dosyalar açılır. */
export function zipAc(veri: Uint8Array, sinir: ZipSinirlari, secici?: (ad: string) => boolean): ZipIcerik {
  let sayi = 0;
  let toplam = 0;
  const bilgi: { ad: string; boyut: number; acik: number }[] = [];
  unzipSync(veri, {
    filter: (f) => {
      sayi++;
      bilgi.push({ ad: f.name, boyut: f.size, acik: f.originalSize });
      return false;
    },
  });
  if (sayi > sinir.enBuyukDosyaSayisi) throw new GuvenlikHatasi("Arşivde çok fazla dosya var.");
  for (const b of bilgi) {
    toplam += b.acik;
    if (b.acik > 1024 * 1024 && b.acik / Math.max(b.boyut, 1) > sinir.enBuyukOran) {
      throw new GuvenlikHatasi("Arşivdeki bir dosya olağan dışı sıkıştırılmış (ZIP bombası olabilir).");
    }
  }
  if (toplam > sinir.enBuyukAcilmisBoyut) throw new GuvenlikHatasi("Arşivin açılmış boyutu sınırı aşıyor.");
  const acilan = unzipSync(veri, { filter: (f) => (secici ? secici(f.name) : true) });
  const bozuk = zipCrcUyusmayanlar(veri, acilan);
  if (bozuk.length) throw new GuvenlikHatasi("Arşivdeki bir dosya bozuk ya da kurcalanmış (denetim toplamı tutmuyor).");
  return acilan;
}

let CRC_TABLO: Uint32Array | undefined;
/** CRC-32 (IEEE 802.3, ZIP'in kullandığı çok terimli 0xEDB88320). */
export function crc32(veri: Uint8Array): number {
  if (!CRC_TABLO) {
    CRC_TABLO = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLO[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < veri.length; i++) c = (CRC_TABLO[(c ^ (veri[i] as number)) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const latin1 = new TextDecoder("latin1");
const utf8Cozucu = new TextDecoder("utf-8");

/** Merkez dizindeki her girdinin bildirilen CRC-32 ve açılmış boyutu. Okunamazsa null. */
export function zipMerkezDizini(veri: Uint8Array): Map<string, { crc: number; boyut: number }> | null {
  const v = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  for (let i = veri.byteLength - 22; i >= Math.max(0, veri.byteLength - 65_557); i--) {
    if (v.getUint32(i, true) !== 0x06054b50) continue;
    const sayi = v.getUint16(i + 10, true);
    let p = v.getUint32(i + 16, true);
    const sonuc = new Map<string, { crc: number; boyut: number }>();
    for (let n = 0; n < sayi; n++) {
      if (p + 46 > veri.byteLength || v.getUint32(p, true) !== 0x02014b50) return null;
      const bayrak = v.getUint16(p + 8, true);
      const adUz = v.getUint16(p + 28, true);
      const adBayt = veri.subarray(p + 46, p + 46 + adUz);
      const ad = (bayrak & 0x800 ? utf8Cozucu : latin1).decode(adBayt);
      sonuc.set(ad, { crc: v.getUint32(p + 16, true), boyut: v.getUint32(p + 24, true) });
      p += 46 + adUz + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return sonuc;
  }
  return null;
}

/**
 * Açılan her dosyanın CRC-32'sini merkez dizinde bildirilenle karşılaştırır. Bildirilen boyutu gerçekten
 * küçük gösterilmiş bir girdi fflate tarafından sessizce kesilir; kesik veri CRC'yi tutturamaz.
 * Uyuşmayan (ya da dizinde bulunmayan) dosya adlarını döndürür.
 */
export function zipCrcUyusmayanlar(veri: Uint8Array, acilan: ZipIcerik): string[] {
  const dizin = zipMerkezDizini(veri);
  const adlar = Object.keys(acilan);
  if (!dizin) return adlar;
  return adlar.filter((ad) => {
    const d = dizin.get(ad);
    const icerik = acilan[ad] as Uint8Array;
    return !d || d.boyut !== icerik.length || d.crc !== crc32(icerik);
  });
}

const cozucu = new TextDecoder("utf-8");
export function utf8(veri: Uint8Array | undefined): string | undefined {
  if (!veri) return undefined;
  const s = cozucu.decode(veri);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
