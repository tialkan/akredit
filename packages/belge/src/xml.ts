// Küçük ve güvenli XML ayrıştırıcı. Office belgelerinin (OOXML, ODF) içini okumak için yeterlidir.
// Güvenlik: DTD (<!DOCTYPE …>) ve varlık tanımı (<!ENTITY …>) içeren belge reddedilir; yalnız XML'in
// beş öntanımlı varlığı ve sayısal karakter başvuruları çözülür. Dış kaynak hiçbir zaman yüklenmez.

export interface XmlDugum {
  ad: string;
  oz: Record<string, string>;
  cocuklar: (XmlDugum | string)[];
}

export class XmlHatasi extends Error {}

const ONTANIMLI: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function varlikCoz(metin: string): string {
  if (!metin.includes("&")) return metin;
  return metin.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (tam, ad: string) => {
    if (ad.startsWith("#x")) return kodNoktasi(Number.parseInt(ad.slice(2), 16), tam);
    if (ad.startsWith("#")) return kodNoktasi(Number.parseInt(ad.slice(1), 10), tam);
    return ONTANIMLI[ad] ?? tam;
  });
}

function kodNoktasi(n: number, yedek: string): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return yedek;
  return String.fromCodePoint(n);
}

const OZ_DESENI = /([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

/** XML metnini ağaca çevirir. DTD ya da varlık tanımı varsa `XmlHatasi` atar. */
export function xmlAyristir(xml: string): XmlDugum {
  if (/<!DOCTYPE/i.test(xml) || /<!ENTITY/i.test(xml)) {
    throw new XmlHatasi("Belgede güvenli olmayan XML tanımı (DTD) var.");
  }
  const kok: XmlDugum = { ad: "#kok", oz: {}, cocuklar: [] };
  const yigin: XmlDugum[] = [kok];
  let i = 0;
  const n = xml.length;
  while (i < n) {
    const lt = xml.indexOf("<", i);
    const ust = yigin[yigin.length - 1] as XmlDugum;
    if (lt === -1) {
      metinEkle(ust, xml.slice(i));
      break;
    }
    if (lt > i) metinEkle(ust, xml.slice(i, lt));
    if (xml.startsWith("<!--", lt)) {
      const son = xml.indexOf("-->", lt + 4);
      if (son === -1) throw new XmlHatasi("Kapanmamış yorum.");
      i = son + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const son = xml.indexOf("]]>", lt + 9);
      if (son === -1) throw new XmlHatasi("Kapanmamış CDATA.");
      ust.cocuklar.push(xml.slice(lt + 9, son));
      i = son + 3;
    } else if (xml.startsWith("<?", lt)) {
      const son = xml.indexOf("?>", lt + 2);
      if (son === -1) throw new XmlHatasi("Kapanmamış işlem talimatı.");
      i = son + 2;
    } else if (xml.startsWith("<!", lt)) {
      throw new XmlHatasi("Desteklenmeyen XML bildirimi.");
    } else if (xml[lt + 1] === "/") {
      const son = xml.indexOf(">", lt);
      if (son === -1) throw new XmlHatasi("Kapanmamış etiket.");
      const ad = xml.slice(lt + 2, son).trim();
      if (yigin.length <= 1 || ust.ad !== ad) throw new XmlHatasi(`Beklenmeyen kapanış etiketi: ${ad}`);
      yigin.pop();
      i = son + 1;
    } else {
      const son = etiketSonu(xml, lt);
      if (son === -1) throw new XmlHatasi("Kapanmamış etiket.");
      let ic = xml.slice(lt + 1, son);
      const kendindenKapali = ic.endsWith("/");
      if (kendindenKapali) ic = ic.slice(0, -1);
      const adSonu = ic.search(/[\s/]/);
      const ad = adSonu === -1 ? ic : ic.slice(0, adSonu);
      const oz: Record<string, string> = {};
      if (adSonu !== -1) {
        for (const m of ic.slice(adSonu).matchAll(OZ_DESENI)) {
          oz[m[1] as string] = varlikCoz(m[3] ?? m[4] ?? "");
        }
      }
      const dugum: XmlDugum = { ad, oz, cocuklar: [] };
      ust.cocuklar.push(dugum);
      if (!kendindenKapali) yigin.push(dugum);
      i = son + 1;
    }
  }
  if (yigin.length !== 1) throw new XmlHatasi("Kapanmamış öğe var.");
  const ilk = kok.cocuklar.find((c): c is XmlDugum => typeof c !== "string");
  if (!ilk) throw new XmlHatasi("Boş XML.");
  return ilk;
}

function etiketSonu(xml: string, bas: number): number {
  let tirnak: string | null = null;
  for (let j = bas + 1; j < xml.length; j++) {
    const c = xml[j];
    if (tirnak) {
      if (c === tirnak) tirnak = null;
    } else if (c === '"' || c === "'") tirnak = c;
    else if (c === ">") return j;
  }
  return -1;
}

function metinEkle(ust: XmlDugum, ham: string): void {
  if (ham.length === 0) return;
  ust.cocuklar.push(varlikCoz(ham));
}

/** Ad ön ekini (w:, a:, text:) yok sayarak yerel adı verir. */
export function yerelAd(ad: string): string {
  const k = ad.indexOf(":");
  return k === -1 ? ad : ad.slice(k + 1);
}

export function cocuklar(d: XmlDugum, ad?: string): XmlDugum[] {
  const sonuc: XmlDugum[] = [];
  for (const c of d.cocuklar) if (typeof c !== "string" && (ad === undefined || c.ad === ad)) sonuc.push(c);
  return sonuc;
}

export function ilkCocuk(d: XmlDugum, ad: string): XmlDugum | undefined {
  for (const c of d.cocuklar) if (typeof c !== "string" && c.ad === ad) return c;
  return undefined;
}

/** Ağacı derinlik öncelikli gezer; `gir` false dönerse alt ağaca inilmez. */
export function gez(d: XmlDugum, gir: (d: XmlDugum) => boolean | undefined): void {
  for (const c of d.cocuklar) {
    if (typeof c === "string") continue;
    if (gir(c) === false) continue;
    gez(c, gir);
  }
}

export function altlar(d: XmlDugum, ad: string): XmlDugum[] {
  const sonuc: XmlDugum[] = [];
  gez(d, (c) => {
    if (c.ad === ad) sonuc.push(c);
    return true;
  });
  return sonuc;
}

/** Düğümün tüm alt metnini birleştirir. */
export function icMetin(d: XmlDugum): string {
  let s = "";
  for (const c of d.cocuklar) s += typeof c === "string" ? c : icMetin(c);
  return s;
}
