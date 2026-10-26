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
  return unzipSync(veri, { filter: (f) => (secici ? secici(f.name) : true) });
}

const cozucu = new TextDecoder("utf-8");
export function utf8(veri: Uint8Array | undefined): string | undefined {
  if (!veri) return undefined;
  const s = cozucu.decode(veri);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}
