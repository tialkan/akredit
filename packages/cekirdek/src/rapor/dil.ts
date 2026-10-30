// Rapor dil denetimi (İP-44). Yayımdan önce deterministik kurallarla bakar; model kullanmaz, metni düzeltmez,
// yalnız işaretler. Kurallar:
// - ustunluk: kanıtsız üstünlük ifadesi ("en iyi", "tamamen", "her zaman"). Cümlede atıf varsa işaretlenmez.
// - olcusuz-nicelik: "birçok", "büyük ölçüde" gibi ölçüsüz nicelik; cümlede sayı yoksa sayı istenir.
// - yaziyla-sayi: "beş toplantı" gibi yazıyla yazılmış sayı; rakamla yazılıp kanıta bağlanmalı.
// - oznesiz-eylem: edilgen ve öznesiz eylem ("yapılmıştır"); kim tarafından yapıldığı yazılmalı.
// - donem-tutarliligi: geçersiz akademik yıl ("2024-2026"), geçersiz tarih ("31.02.2025"), rapor
//   tarihinden sonraki tarih, rapor döneminden sonraki yıl.

import { ayracOrt, raporCumleleri } from "./cumle.ts";

export type DilKurali = "ustunluk" | "olcusuz-nicelik" | "yaziyla-sayi" | "oznesiz-eylem" | "donem-tutarliligi";
export type DilOnemi = "yuksek" | "orta" | "dusuk";

export interface DilBulgusu {
  kural: DilKurali;
  onem: DilOnemi;
  /** 1'den başlayan paragraf ve paragraf içi cümle numarası. */
  paragraf: number;
  cumle: number;
  /** Bulgunun dayandığı ifade (metinden birebir). */
  ifade: string;
  aciklama: string;
}

export interface DilDenetimSecenekleri {
  /** Rapor dönemi, ör. "2025-2026". Verilirse dönemden sonraki yıllar işaretlenir. */
  donem?: string;
  /** Raporun tarihi (YYYY-AA-GG). Verilirse bundan sonraki tarihler işaretlenir. */
  raporTarihi?: string;
}

export const DIL_ONEMI: Record<DilKurali, DilOnemi> = {
  ustunluk: "yuksek",
  "olcusuz-nicelik": "orta",
  "yaziyla-sayi": "orta",
  "oznesiz-eylem": "dusuk",
  "donem-tutarliligi": "yuksek",
};

/** Türkçe harf sınırı: önünde ve arkasında harf yok. */
const ON = "(?<![\\p{L}\\p{N}])";
const SON = "(?![\\p{L}\\p{N}])";
const ifade = (govde: string, ek = "") => new RegExp(`${ON}(?:${govde})${ek}${SON}`, "giu");

const USTUNLUK = ifade(
  [
    "en iyi(?:si|sidir|lerinden|lerden)?",
    "en başarılı(?:sı)?",
    "en yüksek",
    "tamamen",
    "tümüyle",
    "bütünüyle",
    "her zaman",
    "hiçbir zaman",
    "eksiksiz(?:dir)?",
    "kusursuz(?:dur)?",
    "mükemmel(?:dir)?",
    "örnek gösterilecek",
  ].join("|"),
);
const USTUNLUK_YUZDE = /%\s?100(?![\d,.])/gu;

const OLCUSUZ = ifade(
  [
    "birçok",
    "bir çok",
    "pek çok",
    "çok sayıda",
    "büyük ölçüde",
    "önemli ölçüde",
    "büyük çoğunluğu",
    "çoğu",
    "oldukça",
    "geniş katılım(?:lı)?",
    "yüksek oranda",
  ].join("|"),
);

/** "bir" kasıtlı olarak yok: belirsizlik sözcüğü olarak çok yaygın. */
const SAYI_SOZCUKLERI = [
  "iki",
  "üç",
  "dört",
  "beş",
  "altı",
  "yedi",
  "sekiz",
  "dokuz",
  "on",
  "yirmi",
  "otuz",
  "kırk",
  "elli",
  "altmış",
  "yetmiş",
  "seksen",
  "doksan",
  "yüz",
  "bin",
];
// Sayı sözcüğü ardından bir sözcük gelmeli ("beş toplantı", "on iki öğrenci"); "yüz yüze" deyimi hariç.
const YAZIYLA = new RegExp(
  `${ON}(?:${SAYI_SOZCUKLERI.join("|")})(?:\\s+(?:${SAYI_SOZCUKLERI.join("|")}))*${SON}(?=\\s+\\p{L})(?!\\s+yüze)`,
  "giu",
);

// Edilgen eylem: ünlüden sonra -n- ya da -ıl/il/ul/ül- ve ardından -mıştır / -mektedir.
const EDILGEN = /(?<![\p{L}])(\p{L}*?(?:[ıiuü]l|[aeıioöuü]n))(?:m[ıiuü]ş|m[ae]kt[ae])[dt][ıiuü]r(?![\p{L}])/giu;
/** -n- ile biten ama edilgen olmayan gövdeler (yanlış pozitifleri önler). */
const EDILGEN_DEGIL = new Set([
  "bulun",
  "kazan",
  "dön",
  "in",
  "yan",
  "sön",
  "kon",
  "utan",
  "uyan",
  "inan",
  "kan",
  "san",
  "din",
  "dinlen",
  "ısın",
  "eğlen",
  "öğren",
  "çalışıl",
]);
const OZNE_ISARETI = /tarafından|eliyle|(?<![\p{L}])\p{Lu}\p{L}*(?:ca|ce|ça|çe)(?![\p{L}])/u;

const AKADEMIK_YIL = /(?<!\d)((?:19|20)\d{2})\s?[-/]\s?((?:19|20)\d{2})(?!\d)/gu;
const TARIH = /(?<![\d.])(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})(?![\d])/gu;
const ISO_TARIH = /(?<![\d-])((?:19|20)\d{2})-(\d{2})-(\d{2})(?![\d])/gu;
const YIL = /(?<![\d.\-/])((?:19|20)\d{2})(?![\d])/gu;

function gecerliTarih(y: number, a: number, g: number): boolean {
  if (a < 1 || a > 12 || g < 1) return false;
  const gunler = [
    31,
    y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return g <= (gunler[a - 1] as number);
}

const iki = (n: number) => String(n).padStart(2, "0");

function donemBitisi(donem: string | undefined): number | null {
  const m = donem ? /((?:19|20)\d{2})\s?[-/]\s?((?:19|20)\d{2})/u.exec(donem) : null;
  if (m) return Number(m[2]);
  const t = donem ? /((?:19|20)\d{2})/u.exec(donem) : null;
  return t ? Number(t[1]) : null;
}

/** Atıf, hesap ve EKSİK işaretlerini (köşeli ayraçları) boşlukla örter; içerikleri denetlenmez. */
function isaretsiz(metin: string): string {
  return ayracOrt(metin).replace(/\[x*\]/gu, (m) => " ".repeat(m.length));
}

function cumleyiDenetle(
  metin: string,
  atifli: boolean,
  s: DilDenetimSecenekleri,
): Omit<DilBulgusu, "paragraf" | "cumle">[] {
  const t = isaretsiz(metin);
  const b: Omit<DilBulgusu, "paragraf" | "cumle">[] = [];
  const ekle = (kural: DilKurali, ifade: string, aciklama: string, onem: DilOnemi = DIL_ONEMI[kural]) =>
    b.push({ kural, onem, ifade, aciklama });

  if (!atifli) {
    for (const m of [...t.matchAll(USTUNLUK), ...t.matchAll(USTUNLUK_YUZDE)])
      ekle("ustunluk", m[0], `"${m[0]}" kanıtsız bir üstünlük ifadesi. Kanıta bağla ya da ölçülü yaz.`);
  }
  if (!/\d/u.test(t)) {
    for (const m of t.matchAll(OLCUSUZ))
      ekle("olcusuz-nicelik", m[0], `"${m[0]}" ölçüsüz bir nicelik. Sayıyı yaz ve kaynağını göster.`);
  }
  for (const m of t.matchAll(YAZIYLA))
    ekle("yaziyla-sayi", m[0], `"${m[0]}" yazıyla yazılmış bir sayı. Rakamla yaz ve kanıta bağla.`);
  if (!OZNE_ISARETI.test(t)) {
    for (const m of t.matchAll(EDILGEN)) {
      if (EDILGEN_DEGIL.has((m[1] ?? "").toLocaleLowerCase("tr-TR"))) continue;
      ekle("oznesiz-eylem", m[0], `"${m[0]}" eylemini kimin yaptığı yazılmamış. Yapan birimi ya da kurulu yaz.`);
    }
  }

  for (const m of t.matchAll(AKADEMIK_YIL)) {
    const [a, c] = [Number(m[1]), Number(m[2])];
    if (c !== a + 1)
      ekle("donem-tutarliligi", m[0], `"${m[0]}" geçerli bir akademik yıl değil. Yıllar ardışık olmalı.`);
  }
  const raporTarihi = s.raporTarihi && /^\d{4}-\d{2}-\d{2}$/u.test(s.raporTarihi) ? s.raporTarihi : null;
  const tarihBak = (ham: string, y: number, a: number, g: number) => {
    if (!gecerliTarih(y, a, g)) ekle("donem-tutarliligi", ham, `"${ham}" geçerli bir tarih değil.`);
    else if (raporTarihi && `${y}-${iki(a)}-${iki(g)}` > raporTarihi)
      ekle("donem-tutarliligi", ham, `"${ham}" rapor tarihinden (${raporTarihi}) sonra. Tarihi denetle.`);
  };
  for (const m of t.matchAll(TARIH)) tarihBak(m[0], Number(m[3]), Number(m[2]), Number(m[1]));
  for (const m of t.matchAll(ISO_TARIH)) tarihBak(m[0], Number(m[1]), Number(m[2]), Number(m[3]));
  const bitis = donemBitisi(s.donem);
  if (bitis !== null) {
    // Tarih ve akademik yıl içindeki yıllar ayrıca denetlendi; burada tek başına yazılmış yıllar.
    const tek = t.replace(AKADEMIK_YIL, (x) => " ".repeat(x.length)).replace(TARIH, (x) => " ".repeat(x.length));
    for (const m of tek.matchAll(YIL)) {
      if (Number(m[1]) > bitis)
        ekle("donem-tutarliligi", m[0], `${m[0]} yılı rapor döneminden (${s.donem}) sonra. Dönemi denetle.`, "orta");
    }
    for (const m of t.matchAll(AKADEMIK_YIL)) {
      if (Number(m[2]) === Number(m[1]) + 1 && Number(m[2]) > bitis)
        ekle("donem-tutarliligi", m[0], `"${m[0]}" rapor döneminden (${s.donem}) sonra. Dönemi denetle.`, "orta");
    }
  }
  return b;
}

/** Rapor metnini (paragraflar boş satırla ayrılır) dil kurallarıyla denetler. Başlık ve tablolar atlanır. */
export function dilDenetle(metin: string, secenekler: DilDenetimSecenekleri = {}): DilBulgusu[] {
  const sonuc: DilBulgusu[] = [];
  metin.split(/\n\s*\n/u).forEach((paragraf, i) => {
    if (!paragraf.trim() || /^\s*(#|\||```)/u.test(paragraf)) return;
    raporCumleleri(paragraf.trim()).forEach((c, j) => {
      const atifli = c.atiflar.length + c.hesaplar.length > 0 && !c.eksik;
      for (const x of cumleyiDenetle(c.metin, atifli, secenekler)) sonuc.push({ ...x, paragraf: i + 1, cumle: j + 1 });
    });
  });
  return sonuc;
}

/** Yayım uyarısı için: açık yüksek önemli bulgu sayısı. */
export function yuksekOnemliSayisi(bulgular: readonly { onem: DilOnemi }[]): number {
  return bulgular.filter((b) => b.onem === "yuksek").length;
}
