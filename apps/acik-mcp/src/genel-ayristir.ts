// Proliz dışı Bologna sayfaları için genel ayrıştırıcı. HTML ya da düz metin alır; Türkçe ve İngilizce alan
// etiketlerine (Amaç/Objective, İçerik/Content, Öğrenme Çıktıları/Learning Outcomes...) göre bölümlere ayırır.
// Ağ yoktur, model yoktur: yalnız etiket eşleme ve sayı okuma. Bulunamayan alan boş kalır, tahmin edilmez.
//
// Kişi satırları (Dersi Veren, Instructor, e-posta, telefon) ayrıştırmadan önce bellekte atılır. Kaynaklar
// bölümü künye olarak ayrı alınır (yazar adları yayımlanmış künyedir).
//
// Düz metin (dış inceleme 2026-11-05): tarayıcıda Ctrl+A, Ctrl+C ile kopyalanan sayfada tablolar sekmeyle ayrılır.
// ÖÇ-PÇ katkı matrisi ve ders yapısı bu sekmeli metinden de okunur; Proliz sayfasının düz metni tanınır.

import { metin as htmlMetni, sayi } from "@akredit/baglayicilar/bologna-ayristir";

export type GenelAlan =
  | "kod"
  | "ad"
  | "yariyil"
  | "tul"
  | "kredi"
  | "akts"
  | "dil"
  | "tur"
  | "onKosul"
  | "amac"
  | "icerik"
  | "yontem"
  | "notlar"
  | "ciktilar"
  | "haftalar"
  | "degerlendirme"
  | "isyuku"
  | "kaynaklar"
  | "katki"
  | "dersYapisi"
  | "kisi";

/** Etiketler küçük harfle, Türkçe karakterle yazılır. Uzun etiket önce denenir. */
const ETIKETLER: Record<GenelAlan, string[]> = {
  kod: ["ders kodu", "dersin kodu", "kodu", "kod", "course code", "code"],
  ad: ["ders adı", "dersin adı", "adı", "course name", "course title", "name"],
  yariyil: ["yarıyıl", "dönem", "semester"],
  tul: ["t+u+l", "t+u+l saat", "teori+uygulama+laboratuvar", "t+p+l", "theory+practice+lab"],
  kredi: ["kredi", "ulusal kredi", "yerel kredi", "credit", "credits", "local credit", "national credit"],
  akts: ["akts", "akts kredisi", "ects", "ects credit", "ects credits"],
  dil: ["dersin dili", "öğretim dili", "dil", "language", "language of instruction", "course language"],
  tur: ["dersin türü", "ders türü", "türü", "tür", "course type", "type of course", "type"],
  onKosul: ["ön koşul", "ön koşullar", "ön koşul dersleri", "önkoşul", "önkoşullar", "prerequisite", "prerequisites"],
  amac: [
    "dersin amacı",
    "amaç",
    "amacı",
    "dersin amaçları",
    "objective",
    "objectives",
    "course objective",
    "course objectives",
    "aim",
    "aims",
  ],
  icerik: [
    "dersin içeriği",
    "içerik",
    "içeriği",
    "ders içeriği",
    "content",
    "contents",
    "course content",
    "course contents",
    "course description",
  ],
  yontem: [
    "yöntem ve teknikler",
    "öğretim yöntem ve teknikleri",
    "öğretim yöntemleri",
    "yöntemler",
    "yöntem",
    "teaching methods",
    "methods",
    "learning and teaching methods",
    "planned learning activities and teaching methods",
  ],
  notlar: ["ders notları", "course notes", "lecture notes"],
  ciktilar: [
    "öğrenme çıktıları",
    "dersin öğrenme çıktıları",
    "ders öğrenme çıktıları",
    "learning outcomes",
    "course learning outcomes",
  ],
  haftalar: [
    "haftalık konular",
    "haftalık ders konuları",
    "haftalık ders akışı",
    "haftalık ders planı",
    "ders akışı",
    "weekly topics",
    "weekly schedule",
    "course schedule",
    "weekly subjects",
  ],
  degerlendirme: [
    "değerlendirme",
    "değerlendirme sistemi",
    "değerlendirme yöntemleri",
    "ölçme ve değerlendirme",
    "assessment",
    "assessment methods",
    "evaluation",
    "grading",
  ],
  isyuku: [
    "akts iş yükü",
    "akts iş yükü tablosu",
    "iş yükü",
    "ects workload",
    "workload",
    "ects allocated based on student workload",
  ],
  kaynaklar: [
    "kaynaklar",
    "kaynak",
    "ders kitabı",
    "önerilen kaynaklar",
    "diğer kaynaklar",
    "yardımcı kaynaklar",
    "references",
    "resources",
    "textbook",
    "textbooks",
    "recommended sources",
    "reading list",
  ],
  katki: [
    "program çıktısına katkı",
    "program çıktısına katkısı",
    "prg.çıktısına katkısı",
    "prg. çıktısına katkısı",
    "program çıktılarına katkı",
    "dersin program çıktılarına katkısı",
    "öğrenme çıktılarının program çıktılarına katkısı",
    "ders öğrenme çıktıları ve program çıktıları ilişkisi",
    "contribution to program outcomes",
    "contribution of learning outcomes to programme outcomes",
  ],
  dersYapisi: ["ders yapısı", "dersin yapısı", "ders kategorisi", "course structure", "course category"],
  kisi: [
    "dersi veren",
    "dersi verenler",
    "dersi veren öğretim elemanı",
    "dersi veren öğretim elemanları",
    "öğretim elemanı",
    "öğretim elemanları",
    "öğretim üyesi",
    "dersin sorumlusu",
    "dersin koordinatörü",
    "dersin yardımcıları",
    "dersin yetkilileri",
    "koordinatör",
    "sorumlu",
    "iletişim",
    "e-posta",
    "eposta",
    "telefon",
    "instructor",
    "instructors",
    "lecturer",
    "assistant",
    "assistants",
    "coordinator",
    "course coordinator",
    "contact",
    "e-mail",
    "email",
    "phone",
  ],
};

/** Türkçe küçük harf; noktasız ı da i sayılır, böylece "Instructor" ve "AMACI" aynı biçimde eşlenir. */
const kucuk = (s: string) => s.toLocaleLowerCase("tr").replace(/ı/gu, "i");
const sade = (s: string) =>
  kucuk(s)
    .replace(/[:：*•\-–]+\s*$/u, "")
    .replace(/\s*\(.*?\)\s*$/u, "")
    .replace(/\s+/gu, " ")
    .trim();

const ETIKET_TABLOSU: [string, GenelAlan][] = (Object.entries(ETIKETLER) as [GenelAlan, string[]][])
  .flatMap(([alan, xs]) => xs.map((x): [string, GenelAlan] => [kucuk(x), alan]))
  .sort((a, b) => b[0].length - a[0].length);

/** Bir hücre ya da satır başı bir etiket mi? Tam eşleşme (sondaki iki nokta ve parantez yok sayılır). */
export function etiketAlani(s: string): GenelAlan | null {
  const k = sade(s);
  if (!k || k.length > 60) return null;
  return ETIKET_TABLOSU.find(([e]) => e === k)?.[1] ?? null;
}

/** "Etiket: değer" biçiminde satır başı etiketi. */
function onekEtiketi(s: string): { alan: GenelAlan; kalan: string } | null {
  const m = s.match(/^([^:：]{2,60})[:：]\s*(.*)$/u);
  if (!m?.[1]) return null;
  const alan = etiketAlani(m[1]);
  return alan ? { alan, kalan: m[2] ?? "" } : null;
}

export type Satir = string[];

/** Program çıktısı kodu (P1, PÇ2, PO3) ve ders çıktısı kodu (Ö1, ÖÇ2, LO3) ya da "Tüm" satırı. */
const P_KODU = /^(?:P|PÇ|PC|PO|PY)\s*-?\s*(\d{1,2})$/iu;
const O_KODU = /^(?:Ö|ÖÇ|DÖÇ|LO|CLO|ÇK)\s*-?\s*(\d{1,2})$|^(Tüm|All)$/iu;

/** Katkı matrisinin başlık ya da değer satırı mı? Böyle satırlarda boş hücre "-" olarak korunur (sütun hizası). */
function matrisSatiri(h: string[]): boolean {
  if (h.filter((x) => P_KODU.test(x)).length >= 2) return true;
  const ilk = h.findIndex((x) => x !== "");
  return (
    ilk >= 0 &&
    O_KODU.test(h[ilk] ?? "") &&
    h.length - ilk >= 3 &&
    h.slice(ilk + 1).every((x) => x === "" || /^[1-5-]$/u.test(x))
  );
}

/** HTML ya da düz metni satır ve hücrelere çevirir. Tablo hücreleri sekmeyle ayrılır. */
export function satirlara(girdi: string): Satir[] {
  const htmlMi = /<\/?(table|tr|td|th|p|div|br|li|h\d|body|span)\b/iu.test(girdi);
  const duz = htmlMi
    ? girdi
        .replace(/<(script|style)\b[\s\S]*?<\/\1>/giu, "")
        .replace(/<\/t[dh]>/giu, "\u0001")
        .replace(/<\/tr>|<br\s*\/?>|<\/p>|<\/li>|<\/div>|<\/h\d>|<\/table>/giu, "\n")
        .split("\n")
        .map((s) =>
          s
            .split("\u0001")
            .map((h) => htmlMetni(h))
            .join("\t"),
        )
        .join("\n")
    : girdi;
  return duz
    .split(/\r?\n/u)
    .map((s) => {
      const h = s.split("\t").map((x) => x.replace(/\s+/gu, " ").trim());
      return matrisSatiri(h) ? h.map((x) => x || "-") : h.filter(Boolean);
    })
    .filter((r) => r.some((x) => x && x !== "-"));
}

/**
 * Sekmeli satırlardan ÖÇ-PÇ katkı matrisi: başlıkta en az iki P kodu, altında Ö satırları. Değerler "1"-"5" ya da
 * boş. Başlıkta satır etiketi sütunu yoksa veri satırları bir sütun kaydırılır. Bulunamazsa boş nesne.
 */
export function katkiMatrisi(satirlar: Satir[]): Record<string, Record<string, string>> {
  for (let i = 0; i < satirlar.length; i++) {
    const baslik = satirlar[i] ?? [];
    const sutunlar = baslik
      .map((h, j) => ({ j, m: h.match(P_KODU) }))
      .filter((x): x is { j: number; m: RegExpMatchArray } => x.m !== null);
    if (sutunlar.length < 2) continue;
    const kayma = P_KODU.test(baslik[0] ?? "") ? 1 : 0;
    const sonuc: Record<string, Record<string, string>> = {};
    for (let k = i + 1; k < satirlar.length; k++) {
      const r = satirlar[k] ?? [];
      const m = (r[0] ?? "").match(O_KODU);
      if (!m) break;
      const anahtar = m[2] ? "Tüm" : `Ö${Number(m[1])}`;
      sonuc[anahtar] = Object.fromEntries(
        sutunlar.map(({ j, m: pm }) => {
          const v = (r[j + kayma] ?? "").trim();
          return [`P${Number(pm[1])}`, /^[1-5]$/u.test(v) ? v : ""];
        }),
      );
    }
    if (Object.keys(sonuc).length) return sonuc;
  }
  return {};
}

const INGILIZCE_ALAN =
  /\b(course objectives?|learning outcomes|course contents?|weekly (topics|schedule|subjects)|ects workload|assessment methods?|teaching methods|course description)\b|\(\s*([iİ]ngilizce|english)\s*\)|[iİ]ngilizce (amaç|içerik|adı)/iu;

/** Sayfada İngilizce alan var mı (İngilizce etiket ya da "(İngilizce)" alanı). Bologna araçlarının ingilizce değeri. */
export function ingilizceAlanVar(girdi: string): boolean {
  return INGILIZCE_ALAN.test(girdi.slice(0, 400_000));
}

const PROLIZ_METNI =
  /Yarıyıl\s*\t\s*Kodu|Prg\.\s*Çıktısına\s*Katkısı|Sür\.\s*Kalkınma\s*Amaçları|Semester\s*\t\s*Code/iu;

/** Proliz ders sayfasının düz metni mi (Ctrl+A, Ctrl+C)? */
export function prolizMetniMi(girdi: string): boolean {
  return !/<\/?(table|tr|td)\b/iu.test(girdi) && PROLIZ_METNI.test(girdi);
}

export interface Bolum {
  alan: GenelAlan;
  /** Sayfadaki etiket, olduğu gibi (ör. "Dersi Verenler"). */
  etiket?: string;
  /** Etiketle aynı satırdaki değer (hücreler). */
  deger: string[];
  /** Etiketten sonraki satırlar. */
  satirlar: Satir[];
}

/**
 * Satırları etiketli bölümlere ayırır. Başlık satırı (bütün hücreleri etiket olan) bir sonraki satırla
 * eşlenir: "Ders Kodu | Ders Adı | AKTS" ve altında "KRG101 | ... | 5".
 */
export function bolumlere(satirlar: Satir[]): { bolumler: Bolum[]; sahipsiz: Satir[] } {
  const bolumler: Bolum[] = [];
  const sahipsiz: Satir[] = [];
  let aktif: Bolum | null = null;
  for (let i = 0; i < satirlar.length; i++) {
    const r = satirlar[i] ?? [];
    const alanlar = r.map(etiketAlani);
    const sonraki = satirlar[i + 1];
    if (
      r.length >= 2 &&
      alanlar.every(Boolean) &&
      sonraki &&
      sonraki.length === r.length &&
      !sonraki.some((h) => etiketAlani(h))
    ) {
      r.forEach((_, j) => {
        bolumler.push({ alan: alanlar[j] as GenelAlan, etiket: r[j] ?? "", deger: [sonraki[j] ?? ""], satirlar: [] });
      });
      aktif = null;
      i++;
      continue;
    }
    const ilk = r[0] ?? "";
    const tam = etiketAlani(ilk);
    const onek = tam ? null : onekEtiketi(ilk);
    if (tam || onek) {
      const deger = tam ? r.slice(1) : [onek?.kalan ?? "", ...r.slice(1)].filter(Boolean);
      const etiket = tam ? ilk : ilk.slice(0, ilk.length - (onek?.kalan.length ?? 0));
      aktif = { alan: (tam ?? onek?.alan) as GenelAlan, etiket, deger, satirlar: [] };
      bolumler.push(aktif);
      continue;
    }
    if (aktif) aktif.satirlar.push(r);
    else sahipsiz.push(r);
  }
  return { bolumler, sahipsiz };
}

/** Kaynak satırından numara ya da imi atar. */
const maddeAt = (s: string) => s.replace(/^\s*(\[\d+\]|\d{1,2}[.)-]|[-•*–])\s*/u, "").trim();

/**
 * Düz metin ya da HTML'den görev bölümlerini (Dersi Verenler, Koordinatör, iletişim) yetkililer listesine, kaynaklar
 * bölümünü künye listesine ayırır. Değerler olduğu gibi korunur; hiçbir şey atılmaz.
 */
export function genelAyikla(girdi: string): {
  metin: string;
  kaynaklar: string[];
  yetkililer: { rol: string; deger: string }[];
} {
  const { bolumler, sahipsiz } = bolumlere(satirlara(girdi));
  const kaynaklar: string[] = [];
  const yetkililer: { rol: string; deger: string }[] = [];
  const kalan: string[] = sahipsiz.map((r) => r.join("\t"));
  for (const b of bolumler) {
    if (b.alan === "kisi") {
      const deger = [b.deger.join(" "), ...b.satirlar.map((r) => r.join(" "))]
        .map((x) => x.trim())
        .filter(Boolean)
        .join(", ");
      const rol = (b.etiket ?? "").replace(/[:\s]+$/u, "").trim() || "Dersin yetkilileri";
      if (deger) yetkililer.push({ rol: rol.slice(0, 80), deger: deger.slice(0, 1000) });
      continue;
    }
    if (b.alan === "kaynaklar") {
      for (const x of [b.deger.join(" "), ...b.satirlar.map((r) => r.join(" "))])
        for (const parca of x.split(/\s*;\s*(?=\S)/u)) {
          const k = maddeAt(parca);
          if (k.length >= 5) kaynaklar.push(k);
        }
      continue;
    }
    const etiket = ETIKETLER[b.alan][0] ?? b.alan;
    kalan.push([`${etiket}:`, ...b.deger].join("\t"));
    for (const r of b.satirlar) kalan.push(r.join("\t"));
  }
  return { metin: kalan.join("\n"), kaynaklar, yetkililer };
}

export interface GenelDers {
  kod?: string;
  ad?: string;
  yariyil: number | null;
  tul?: string;
  kredi: number | null;
  akts: number | null;
  amac?: string;
  icerik?: string;
  yontem?: string;
  notlar?: string;
  ciktilar: { kod: string; metin: string }[];
  degerlendirme: { ad: string; sayi: number | null; katki: number | null }[];
  isyuku: { ad: string; sayi: number | null; sure: number | null; toplam: number | null }[];
  dersYapisi: { alan: string; yuzde: number | null }[];
  haftalar: number;
  haftaKonulari: string[];
  katki: Record<string, Record<string, string>>;
}

export interface GenelSonuc {
  ders: GenelDers;
  bilgiler: { dil?: string; tur?: string; onKosul?: string };
  bulunan: string[];
  bulunamayan: string[];
  guven: "yüksek" | "orta" | "düşük";
}

const ALAN_ADI: Record<string, string> = {
  kod: "Ders kodu",
  ad: "Ders adı",
  tul: "T+U+L",
  kredi: "Kredi",
  akts: "AKTS",
  dil: "Dersin dili",
  tur: "Dersin türü",
  onKosul: "Ön koşul",
  amac: "Dersin amacı",
  icerik: "Dersin içeriği",
  yontem: "Yöntem ve teknikler",
  notlar: "Ders notları",
  ciktilar: "Öğrenme çıktıları",
  haftalar: "Haftalık konular",
  degerlendirme: "Değerlendirme",
  isyuku: "AKTS iş yükü",
  kaynaklar: "Kaynaklar",
  katki: "Program çıktısına katkı",
  dersYapisi: "Ders yapısı",
};
export const GENEL_ALAN_ADLARI = ALAN_ADI;

const sayilar = (s: string) =>
  [...s.replace(/(\d),(\d)/gu, "$1.$2").matchAll(/(?<![\p{L}\d])%?\s*(\d+(?:\.\d+)?)/gu)].map((m) => Number(m[1]));
const TOPLAM = /^(toplam|total|genel toplam|akts|ects)/iu;
const HAFTA = /^(?:(\d{1,2})\s*(?:\.|\)|-)?\s*(?:hafta|week)?|(?:hafta|week)\s*(\d{1,2}))(?![\d+])/iu;

/** Tablo satırı ("Ara Sınav | 1 | %40") ya da düz satır ("Ara Sınav 1 %40"): ad ve sayılar. */
function adVeSayilar(r: Satir): { ad: string; n: number[] } {
  if (r.length > 1) return { ad: (r[0] ?? "").trim(), n: sayilar(r.slice(1).join(" ")) };
  const m = (r[0] ?? "").match(/^(.*?\p{L}[^\d%]*?)\s*[:=-]?\s+((?:%?\s*\d+(?:[.,]\d+)?\s*%?\s*[x×]?\s*)+)$/u);
  return m ? { ad: (m[1] ?? "").trim(), n: sayilar(m[2] ?? "") } : { ad: (r[0] ?? "").trim(), n: [] };
}

/** Bir bölümün düz metni. */
const bolumMetni = (b: Bolum) =>
  [b.deger.join(" "), ...b.satirlar.map((r) => r.join(" "))].filter(Boolean).join("\n").trim();

/** Genel ayrıştırıcı. `kaynakSayisi` bölümü sayısı ayrıca verilir (künyeler ayıklamada ayrılır). */
export function genelAyristir(girdi: string, kaynakSayisi = 0): GenelSonuc {
  const satirlar = satirlara(girdi);
  const { bolumler } = bolumlere(satirlar);
  const ilk = (alan: GenelAlan) => bolumler.find((b) => b.alan === alan);
  const tekDeger = (alan: GenelAlan) => {
    const b = ilk(alan);
    if (!b) return undefined;
    const d = (b.deger[0] ?? b.satirlar[0]?.[0] ?? "").trim();
    return d || undefined;
  };
  const metinAlani = (alan: GenelAlan) => {
    const b = ilk(alan);
    const m = b ? bolumMetni(b) : "";
    return m || undefined;
  };

  // T+U+L: etiketten ya da metnin herhangi bir yerinden "3+0+0" kalıbı.
  const tulHam =
    tekDeger("tul") ??
    satirlar
      .flat()
      .join(" ")
      .match(/\b\d{1,2}\s*\+\s*\d{1,2}\s*\+\s*\d{1,2}\b/u)?.[0];
  const tul = tulHam?.match(/\d{1,2}\s*\+\s*\d{1,2}\s*\+\s*\d{1,2}/u)?.[0]?.replace(/\s/gu, "");

  const ciktiBolumu = ilk("ciktilar");
  const ciktiSatirlari = ciktiBolumu ? [ciktiBolumu.deger, ...ciktiBolumu.satirlar].filter((r) => r.length) : [];
  const NUMARA = /^(?:ö|öç|döç|lo|clo)?\s*(\d{1,2})\s*[.):-]?\s*/iu;
  const numarali = ciktiSatirlari.filter(
    (r) => NUMARA.test(r[0] ?? "") && (r.length > 1 || (r[0] ?? "").replace(NUMARA, "").length > 3),
  );
  const ciktilar = (numarali.length ? numarali : ciktiSatirlari.filter((r) => /^[-•*–]/u.test(r[0] ?? "")))
    .map((r) => {
      const ilkHucre = r[0] ?? "";
      const metin =
        r.length > 1 && /^(?:ö|öç|döç|lo|clo)?\s*\d{1,2}\s*[.):-]?\s*$/iu.test(ilkHucre)
          ? r.slice(1).join(" ")
          : maddeAt(ilkHucre.replace(NUMARA, "")) + (r.length > 1 ? ` ${r.slice(1).join(" ")}` : "");
      return metin.trim();
    })
    .filter((m) => m.length > 3)
    .map((metin, i) => ({ kod: `Ö${i + 1}`, metin }));

  const haftaBolumu = ilk("haftalar");
  const haftaKonulari = haftaBolumu
    ? haftaBolumu.satirlar
        .filter((r) => HAFTA.test(r.join(" ")) && r.join(" ").replace(HAFTA, "").trim().length > 1)
        .map((r) =>
          r
            .join(" ")
            .replace(HAFTA, "")
            .replace(/^[\s.:)-]+/u, "")
            .trim(),
        )
    : [];

  const satirTablosu = (alan: GenelAlan) => {
    const b = ilk(alan);
    return b ? [b.deger, ...b.satirlar].filter((r) => r.length) : [];
  };
  const degerlendirme = satirTablosu("degerlendirme")
    .map(adVeSayilar)
    .filter((x) => x.ad && /\p{L}/u.test(x.ad) && x.n.length >= 1 && !TOPLAM.test(x.ad))
    .map(({ ad, n }) => ({ ad, sayi: n.length >= 2 ? (n[0] ?? null) : 1, katki: n.at(-1) ?? null }));
  const isyuku = satirTablosu("isyuku")
    .map(adVeSayilar)
    .filter((x) => x.ad && /\p{L}/u.test(x.ad) && x.n.length >= 2 && !TOPLAM.test(x.ad))
    .map(({ ad, n }) => {
      const s = n[0] ?? null;
      const sure = n[1] ?? null;
      return {
        ad,
        sayi: s,
        sure,
        toplam: n.length >= 3 ? (n[2] ?? null) : s !== null && sure !== null ? s * sure : null,
      };
    });

  const katki = katkiMatrisi(satirlar);
  const dersYapisi = satirTablosu("dersYapisi")
    .map(adVeSayilar)
    .filter((x) => x.ad && /\p{L}/u.test(x.ad) && x.n.length >= 1 && !TOPLAM.test(x.ad))
    .map(({ ad, n }) => ({ alan: ad, yuzde: n.at(-1) ?? null }));

  const bilgiler = {
    ...(tekDeger("dil") ? { dil: tekDeger("dil") } : {}),
    ...(tekDeger("tur") ? { tur: tekDeger("tur") } : {}),
    ...(metinAlani("onKosul") ? { onKosul: metinAlani("onKosul") } : {}),
  };
  const ders: GenelDers = {
    ...(tekDeger("kod") ? { kod: tekDeger("kod") as string } : {}),
    ...(tekDeger("ad") ? { ad: tekDeger("ad") as string } : {}),
    yariyil: sayi(tekDeger("yariyil")),
    ...(tul ? { tul } : {}),
    kredi: sayi(tekDeger("kredi")),
    akts: sayi(tekDeger("akts")),
    ...(metinAlani("amac") ? { amac: metinAlani("amac") as string } : {}),
    ...(metinAlani("icerik") ? { icerik: metinAlani("icerik") as string } : {}),
    ...(metinAlani("yontem") ? { yontem: metinAlani("yontem") as string } : {}),
    ...(metinAlani("notlar") ? { notlar: metinAlani("notlar") as string } : {}),
    ciktilar,
    degerlendirme,
    isyuku,
    dersYapisi,
    haftalar: haftaKonulari.length,
    haftaKonulari,
    katki,
  };
  const varMi: Record<string, boolean> = {
    kod: Boolean(ders.kod),
    ad: Boolean(ders.ad),
    tul: Boolean(ders.tul),
    kredi: ders.kredi !== null,
    akts: ders.akts !== null,
    dil: Boolean(bilgiler.dil),
    tur: Boolean(bilgiler.tur),
    onKosul: Boolean(bilgiler.onKosul),
    amac: Boolean(ders.amac),
    icerik: Boolean(ders.icerik),
    yontem: Boolean(ders.yontem),
    notlar: Boolean(ders.notlar),
    ciktilar: ciktilar.length > 0,
    haftalar: haftaKonulari.length > 0,
    degerlendirme: degerlendirme.length > 0,
    isyuku: isyuku.length > 0,
    kaynaklar: kaynakSayisi > 0,
    katki: Object.keys(katki).length > 0,
    dersYapisi: dersYapisi.length > 0,
  };
  const bulunan = Object.keys(varMi).filter((k) => varMi[k]);
  const bulunamayan = Object.keys(varMi).filter((k) => !varMi[k]);
  const temel = ["ad", "akts", "amac", "icerik", "ciktilar", "haftalar", "degerlendirme", "isyuku"].filter(
    (k) => varMi[k],
  ).length;
  const guven = temel >= 7 ? "yüksek" : temel >= 4 ? "orta" : "düşük";
  return { ders, bilgiler, bulunan, bulunamayan, guven };
}
