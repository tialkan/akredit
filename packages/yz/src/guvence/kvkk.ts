// KVKK maskeleme: kişisel veriyi yer tutucuyla değiştirir, eşlemeyle kayıpsız geri çevirir.
// Aynı yazım aynı yer tutucuyu alır; geri çevirme yazımı birebir korur.
import { kucukHarf } from "@akredit/cekirdek";

export type VeriTuru = "KİŞİ" | "TCKN" | "TELEFON" | "EPOSTA" | "IBAN" | "ÖĞRENCİ-NO";

export interface MaskeSecenegi {
  /** Maskelenecek kişi adları (ad soyad ya da tek ad). Türkçe büyük/küçük harf duyarsız eşleşir. */
  adlar?: string[];
  /** Kurumun öğrenci numarası desenleri. */
  ogrenciNoDesenleri?: RegExp[];
  /** Kapatılacak türler (varsayılan hepsi açık). */
  kapali?: VeriTuru[];
}

export interface Esleme {
  yerTutucu: string;
  tur: VeriTuru;
  deger: string;
}

export interface MaskeSonucu {
  metin: string;
  eslemeler: Esleme[];
}

/** T.C. kimlik numarası sağlaması. */
export function tcknGecerliMi(no: string): boolean {
  if (!/^[1-9]\d{10}$/u.test(no)) return false;
  const d = [...no].map(Number) as number[];
  const g = (i: number) => d[i] ?? 0;
  const tek = g(0) + g(2) + g(4) + g(6) + g(8);
  const cift = g(1) + g(3) + g(5) + g(7);
  const on = (((tek * 7 - cift) % 10) + 10) % 10;
  if (on !== g(9)) return false;
  const toplam = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return toplam % 10 === g(10);
}

/** IBAN mod-97 sağlaması (boşluklar yok sayılır). */
export function ibanGecerliMi(iban: string): boolean {
  const s = iban.replace(/\s+/gu, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/u.test(s)) return false;
  const duzen = s.slice(4) + s.slice(0, 4);
  let kalan = 0;
  for (const ch of duzen) {
    const deger = /\d/u.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const r of deger) kalan = (kalan * 10 + Number(r)) % 97;
  }
  return kalan === 1;
}

interface Bulgu {
  bas: number;
  son: number;
  tur: VeriTuru;
}

const IBAN = /\bTR\d{2}(?:\s?[0-9A-Z]{4}){5}\s?\d{2}\b/giu;
const EPOSTA = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
const TELEFON = /(?<![\d+])(?:\+90[\s-]?|0[\s-]?)\(?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/gu;
const TCKN = /(?<!\d)\d{11}(?!\d)/gu;

function kacis(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/** Uzunluğu koruyarak Türkçe küçük harfe çevirir (konumlar değişmesin). */
function konumKoruyanKucuk(metin: string): string {
  let s = "";
  for (const ch of metin) {
    const k = kucukHarf(ch);
    s += k.length === ch.length ? k : ch;
  }
  return s;
}

function bul(metin: string, secenek: MaskeSecenegi): Bulgu[] {
  const kapali = new Set(secenek.kapali ?? []);
  const sonuc: Bulgu[] = [];
  const tara = (re: RegExp, tur: VeriTuru, gecerli?: (s: string) => boolean, kaynak = metin) => {
    if (kapali.has(tur)) return;
    const genel = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
    for (const m of kaynak.matchAll(genel)) {
      if (!m[0] || (gecerli && !gecerli(metin.slice(m.index, m.index + m[0].length)))) continue;
      sonuc.push({ bas: m.index, son: m.index + m[0].length, tur });
    }
  };
  tara(IBAN, "IBAN", ibanGecerliMi);
  tara(EPOSTA, "EPOSTA");
  tara(TELEFON, "TELEFON");
  tara(TCKN, "TCKN", tcknGecerliMi);
  for (const d of secenek.ogrenciNoDesenleri ?? []) tara(d, "ÖĞRENCİ-NO");
  if (secenek.adlar?.length && !kapali.has("KİŞİ")) {
    const kucuk = konumKoruyanKucuk(metin);
    const adlar = [...new Set(secenek.adlar.map((a) => konumKoruyanKucuk(a.trim())).filter(Boolean))].sort(
      (a, b) => b.length - a.length,
    );
    for (const ad of adlar) {
      const desen = ad.split(/\s+/u).map(kacis).join("\\s+");
      tara(new RegExp(`(?<![\\p{L}\\p{N}])${desen}(?![\\p{L}\\p{N}])`, "gu"), "KİŞİ", undefined, kucuk);
    }
  }
  // Çakışmalar: önce başlayan, eşitse uzun olan kalır.
  sonuc.sort((a, b) => a.bas - b.bas || b.son - a.son);
  const secilen: Bulgu[] = [];
  for (const b of sonuc) if (!secilen.length || b.bas >= (secilen.at(-1)?.son ?? 0)) secilen.push(b);
  return secilen;
}

/** Birden çok metni tutarlı yer tutucularla maskeleyen durum nesnesi. */
export function maskeleyici(secenek: MaskeSecenegi = {}) {
  const eslemeler: Esleme[] = [];
  const degerden = new Map<string, string>();
  const sayac = new Map<VeriTuru, number>();
  return {
    eslemeler,
    maskele(metin: string): string {
      let sonuc = "";
      let imlec = 0;
      for (const b of bul(metin, secenek)) {
        const deger = metin.slice(b.bas, b.son);
        const anahtar = `${b.tur}\u0000${deger}`;
        let yt = degerden.get(anahtar);
        if (!yt) {
          const n = (sayac.get(b.tur) ?? 0) + 1;
          sayac.set(b.tur, n);
          yt = `[${b.tur}-${n}]`;
          degerden.set(anahtar, yt);
          eslemeler.push({ yerTutucu: yt, tur: b.tur, deger });
        }
        sonuc += metin.slice(imlec, b.bas) + yt;
        imlec = b.son;
      }
      return sonuc + metin.slice(imlec);
    },
    kaldir(metin: string): string {
      return maskeKaldir(metin, eslemeler);
    },
  };
}

export function maskele(metin: string, secenek: MaskeSecenegi = {}): MaskeSonucu {
  const m = maskeleyici(secenek);
  return { metin: m.maskele(metin), eslemeler: m.eslemeler };
}

export function maskeKaldir(metin: string, eslemeler: Esleme[]): string {
  if (!eslemeler.length) return metin;
  const tablo = new Map(eslemeler.map((e) => [e.yerTutucu, e.deger]));
  return metin.replace(/\[(?:KİŞİ|TCKN|TELEFON|EPOSTA|IBAN|ÖĞRENCİ-NO)-\d+\]/gu, (yt) => tablo.get(yt) ?? yt);
}
