// KVKK maskeleme: kişisel veriyi yer tutucuyla değiştirir, eşlemeyle kayıpsız geri çevirir.
// Aynı yazım aynı yer tutucuyu alır; geri çevirme yazımı birebir korur.
import { kucukHarf } from "@akredit/cekirdek";

export type VeriTuru = "KİŞİ" | "TCKN" | "TELEFON" | "EPOSTA" | "IBAN" | "ÖĞRENCİ-NO" | "ADRES" | "İMZA";

/** Bütün türler (çıkış kaydı ve envanter bu sırayla yazar). */
export const VERI_TURLERI: readonly VeriTuru[] = [
  "KİŞİ",
  "TCKN",
  "TELEFON",
  "EPOSTA",
  "IBAN",
  "ÖĞRENCİ-NO",
  "ADRES",
  "İMZA",
];

export interface MaskeSecenegi {
  /** Maskelenecek kişi adları (ad soyad ya da tek ad). Türkçe büyük/küçük harf duyarsız eşleşir. */
  adlar?: string[];
  /** Kurumun öğrenci numarası desenleri. */
  ogrenciNoDesenleri?: RegExp[];
  /** Kapatılacak türler (varsayılan hepsi açık). */
  kapali?: VeriTuru[];
  /**
   * Bağlamla kişi adı yakalama: unvan, "Adı Soyadı:" etiketi, yaygın Türkçe ad + büyük harfle başlayan soyad.
   * Varsayılan açık.
   */
  baglamliAd?: boolean;
}

const DESEN_EN_UZUN = 200;

/**
 * Kurum ayarındaki öğrenci numarası deseni kullanılabilir mi? Derlenmeli, en çok 200 karakter olmalı ve boş
 * metni eşlememeli (boşu eşleyen desen maskelemede sonsuz döngü ya da anlamsız eşleşme üretir). İnceleme 4-7 #7.
 */
export function ogrenciNoDeseniGecerliMi(desen: string): boolean {
  if (typeof desen !== "string" || desen.length === 0 || desen.length > DESEN_EN_UZUN) return false;
  try {
    return !new RegExp(desen, "u").test("");
  } catch {
    return false;
  }
}

/**
 * Desenleri derler; geçersiz olanı atlar. Bozuk bir ayar bütün YZ çağrılarını durdurmaz; numara yine
 * etiketsiz uzun sayı kuralıyla maskelenir.
 */
export function ogrenciNoDesenleriniDerle(desenler: readonly string[]): RegExp[] {
  return desenler.filter(ogrenciNoDeseniGecerliMi).map((d) => new RegExp(d, "gu"));
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
// Cep (5xx), sabit hat (2xx-4xx alan kodu) ve 850 numaraları.
const TELEFON = /(?<![\d+])(?:\+90[\s-]?|0[\s-]?)\(?(?:[2-5]\d{2}|850)\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/gu;
const TCKN = /(?<!\d)\d{11}(?!\d)/gu;

// ---------- Bağlamlı desenler (İP-40) ----------
// Etiketten sonra gelen değer: öğrenci numarası.
const OGRENCI_NO_ETIKETLI =
  /(?<=(?:[ÖO]ğrenci|ÖĞRENCİ|Okul|OKUL)\s*(?:[Nn]o|NO|[Nn]umaras[ıi]|NUMARASI)\s*[:.]?\s*)\d{5,12}(?!\d)/gu;
// Etiketsiz uzun sayı (8-12 hane): kimlik ya da öğrenci numarası olabilir; varsayılan olarak maskelenir.
const UZUN_SAYI = /(?<![\p{L}\p{N}\-.,/])\d{8,12}(?![\p{L}\p{N}\-/]|[.,]\d)/gu;
// Adres: sokak/cadde/mahalle sözcüğü, önündeki en çok üç sözcük ve satırın kalanı (en çok 100 karakter).
const ADRES =
  /(?:[\p{L}\d.'’-]+\s+){0,3}(?:Mahallesi|Mah\.|MAH\.|Caddesi|Cad\.|CAD\.|Sokağı|Sokak|Sok\.|SOK\.|Bulvarı|Blv\.|Apartmanı|Apt\.)[^\n]{0,100}/gu;
// İmza alanı: "İmza:" etiketinden sonra satırın kalanı.
const IMZA = /(?<=(?:İmza|İMZA|Imza|İmzası)\s*[:：]\s*)[^\s][^\n]*/gu;
// "Adı Soyadı:" ve benzeri etiketten sonra gelen değer.
const AD_ETIKETLI =
  /(?<=(?:Ad[ıi]?\s*[-/]?\s*Soyad[ıi]?|ADI?\s*[-/]?\s*SOYADI?|Öğrencinin Adı|Danışman[ıi]?|Hazırlayan|Onaylayan)\s*[:：]\s*)[^\s,;(][^\n,;(]*[^\s,;(]/gu;
// Unvandan sonra gelen bir-üç büyük harfli sözcük (araya giren unvan sözcükleri hariç).
const UNVANLI =
  /(?<=(?:Prof\.|Doç\.|Dr\.|Öğr\.\s*Gör\.|Öğr\.\s*Üyesi|Arş\.\s*Gör\.|Sayın|Bay|Bayan)\s+)(?!(?:Dr|Öğr|Gör|Üyesi|Arş|Doç|Prof)\.?(?:\s|$))\p{Lu}[\p{L}'’]+(?:\s+(?!(?:Dr|Öğr|Gör|Üyesi|Arş)\.)\p{Lu}[\p{L}'’]+){0,2}/gu;

/**
 * Yaygın Türkçe adlar. Tek başına ad maskelenmez (ör. "Deniz" denizi de anlatır); ardından büyük harfle
 * başlayan bir soyad geldiğinde ad-soyad sayılır.
 */
export const TURKCE_ADLAR: readonly string[] = [
  "Ahmet",
  "Mehmet",
  "Mustafa",
  "Ali",
  "Hüseyin",
  "Hasan",
  "İbrahim",
  "İsmail",
  "Osman",
  "Yusuf",
  "Murat",
  "Ömer",
  "Ramazan",
  "Halil",
  "Süleyman",
  "Abdullah",
  "Mahmut",
  "Recep",
  "Salih",
  "Fatih",
  "Kadir",
  "Emre",
  "Hakan",
  "Burak",
  "Serkan",
  "Volkan",
  "Kemal",
  "Orhan",
  "Cem",
  "Can",
  "Emir",
  "Eren",
  "Efe",
  "Kerem",
  "Yiğit",
  "Barış",
  "Onur",
  "Tolga",
  "Tuncay",
  "Uğur",
  "Selim",
  "Serdar",
  "Sinan",
  "Tarık",
  "Tayfun",
  "Levent",
  "Erkan",
  "Ercan",
  "Erdem",
  "Gökhan",
  "Cengiz",
  "Bülent",
  "Metin",
  "Nihat",
  "Oğuz",
  "Okan",
  "Özgür",
  "Sefa",
  "Şahin",
  "Yasin",
  "Yunus",
  "Furkan",
  "Enes",
  "Berk",
  "Batuhan",
  "Alper",
  "Arda",
  "Deniz",
  "Ege",
  "Kaan",
  "Mert",
  "Taha",
  "Halit",
  "Hamza",
  "Fatma",
  "Ayşe",
  "Emine",
  "Hatice",
  "Zeynep",
  "Elif",
  "Meryem",
  "Şerife",
  "Zehra",
  "Sultan",
  "Hanife",
  "Merve",
  "Özlem",
  "Esra",
  "Yasemin",
  "Hülya",
  "Leyla",
  "Aysel",
  "Gül",
  "Gülsüm",
  "Büşra",
  "Kübra",
  "Rabia",
  "Sevgi",
  "Sibel",
  "Songül",
  "Derya",
  "Dilek",
  "Ebru",
  "Ecem",
  "Ece",
  "Ela",
  "Esma",
  "Ezgi",
  "Gamze",
  "Gizem",
  "Hande",
  "İrem",
  "Melek",
  "Melike",
  "Nur",
  "Nurcan",
  "Pınar",
  "Selin",
  "Seda",
  "Sena",
  "Sevda",
  "Şeyma",
  "Tuba",
  "Tuğba",
  "Yağmur",
  "Zübeyde",
  "Aylin",
  "Ayla",
  "Canan",
  "Defne",
  "Duygu",
  "Filiz",
  "Nermin",
  "Nilay",
  "Asya",
  "Azra",
  "Beyza",
  "Buse",
  "Cansu",
  "Damla",
  "Dilara",
  "Eda",
  "Eylül",
  "Hilal",
  "İlknur",
  "Ilgın",
];

const AD_LISTESI = new RegExp(
  `(?<![\\p{L}])(?:${TURKCE_ADLAR.join("|")})(?:\\s+\\p{Lu}\\p{Ll}+)?\\s+\\p{Lu}\\p{L}+(?![\\p{L}])`,
  "gu",
);

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
  tara(OGRENCI_NO_ETIKETLI, "ÖĞRENCİ-NO");
  tara(UZUN_SAYI, "ÖĞRENCİ-NO");
  tara(IMZA, "İMZA");
  tara(ADRES, "ADRES");
  if (secenek.baglamliAd !== false) {
    tara(AD_ETIKETLI, "KİŞİ");
    tara(UNVANLI, "KİŞİ");
    tara(AD_LISTESI, "KİŞİ");
  }
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
  return metin.replace(
    /\[(?:KİŞİ|TCKN|TELEFON|EPOSTA|IBAN|ÖĞRENCİ-NO|ADRES|İMZA)-\d+\]/gu,
    (yt) => tablo.get(yt) ?? yt,
  );
}

// ---------- Şüphe denetimi (İP-40) ----------

export type SupheTuru = "ETİKETLİ-KİMLİK" | "ÖZEL-NİTELİKLİ" | "EPOSTA-BENZERİ" | "UZUN-SAYI";

export interface SupheBulgusu {
  tur: SupheTuru;
  sayi: number;
}

// Etiketten sonra yer tutucu olmayan bir değer: maskeleyici bu alanı tanımıyor demektir.
const ETIKETLI_KIMLIK =
  /(?:t\.?\s?c\.?\s*kimlik(?:\s*no)?|tc\s*no|kimlik\s*no|doğum\s*tarihi|doğum\s*yeri|anne\s*adı|baba\s*adı|pasaport\s*no|sicil\s*no)\s*[:：]\s*(?!\[)[^\s]/gu;
// Özel nitelikli kişisel veri ipuçları: maskelemeyle güvenceye alınamaz, insan bakmalı.
const OZEL_NITELIKLI =
  /(?<![\p{L}])(?:sağlık raporu|heyet raporu|engel(?:li(?:lik)?)? oranı|engel durumu|tanısı?\s*[:：]|teşhis|adli sicil|sabıka|dini inanç|mezhep|sendika üyeliği|kan grubu|biyometrik|psikiyatri|tedavi gör)/gu;
const EPOSTA_BENZERI = /[^\s[\]]+@[^\s[\]]+/gu;
const KALAN_UZUN_SAYI = /(?<![\p{L}\p{N}-])\d{8,}(?![\p{L}\p{N}-])/gu;

/**
 * Maskelenmiş metinde kalan şüpheli içeriği sayar; değer döndürmez. Boş dizi: şüphe yok.
 * Bu bulgulardan biri varsa çıkış kapısı çağrıyı yapmaz, iş insana düşer.
 */
export function supheliIcerik(maskeli: string): SupheBulgusu[] {
  const kucuk = konumKoruyanKucuk(maskeli);
  const say = (re: RegExp, m: string) => [...m.matchAll(re)].length;
  const sonuc: SupheBulgusu[] = [];
  const ekle = (tur: SupheTuru, sayi: number) => {
    if (sayi > 0) sonuc.push({ tur, sayi });
  };
  ekle("ETİKETLİ-KİMLİK", say(ETIKETLI_KIMLIK, kucuk));
  ekle("ÖZEL-NİTELİKLİ", say(OZEL_NITELIKLI, kucuk));
  ekle("EPOSTA-BENZERİ", say(EPOSTA_BENZERI, maskeli));
  ekle("UZUN-SAYI", say(KALAN_UZUN_SAYI, maskeli));
  return sonuc;
}

/** Eşlemelerden türe göre farklı değer sayısı (değerin kendisi yok). */
export function turSayilari(eslemeler: readonly Esleme[]): Partial<Record<VeriTuru, number>> {
  const s: Partial<Record<VeriTuru, number>> = {};
  for (const e of eslemeler) s[e.tur] = (s[e.tur] ?? 0) + 1;
  return s;
}
