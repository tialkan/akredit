// iCalendar (RFC 5545) çıktısı ve akademik takvim içe aktarma.
// Çıktı: CRLF satır sonu, 75 sekizliği aşan satırlar katlanır, metin kaçışlanır, her olayın kalıcı
// UID'si vardır. İçe aktarma: VEVENT'lerden tarih okunur; olay adı kurumun verdiği eşleşmeyle takvim
// anahtarına çevrilir. Eşleşmeyen olay yok sayılmaz, ayrıca döndürülür; tarih tahmin edilmez.

import { z } from "zod";

export interface TakvimOlayi {
  /** Kalıcı kimlik (ör. görev kimliği); UID `<uid>@akredit.org` olur. */
  uid: string;
  baslik: string;
  aciklama?: string;
  /** Tüm gün olay: "YYYY-MM-DD". */
  tarih?: string;
  /** Saatli olay (UTC'ye çevrilerek yazılır). */
  baslangic?: Date;
  bitis?: Date;
  /** Kaç gün önce alarm (VALARM). */
  alarmGunOnce?: number[];
  durum?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
}

function kacisla(m: string): string {
  return m.replace(/\\/gu, "\\\\").replace(/;/gu, "\\;").replace(/,/gu, "\\,").replace(/\r?\n/gu, "\\n");
}

/** 75 sekizliği aşan satırı katlar; çok baytlı karakteri bölmez. */
export function satirKatla(satir: string): string {
  const enc = new TextEncoder();
  const parcalar: string[] = [];
  let simdiki = "";
  let bayt = 0;
  for (const ch of satir) {
    const b = enc.encode(ch).length;
    const sinir = parcalar.length === 0 ? 75 : 74; // devam satırı baştaki boşlukla 75
    if (bayt + b > sinir) {
      parcalar.push(simdiki);
      simdiki = "";
      bayt = 0;
    }
    simdiki += ch;
    bayt += b;
  }
  parcalar.push(simdiki);
  return parcalar.join("\r\n ");
}

const tarihIcs = (t: string) => t.replaceAll("-", "");
const zamanIcs = (d: Date) =>
  `${d
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}/u, "")}`;

function sonrakiGun(t: string): string {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Olayları .ics metnine çevirir. `damga` DTSTAMP'tir (testte sabit verilir). */
export function icsUret(olaylar: readonly TakvimOlayi[], ayar: { ad: string; damga: Date }): string {
  const s: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//akredit.org//Akredit Surec Motoru//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${kacisla(ayar.ad)}`,
  ];
  for (const o of olaylar) {
    s.push("BEGIN:VEVENT", `UID:${kacisla(o.uid)}@akredit.org`, `DTSTAMP:${zamanIcs(ayar.damga)}`);
    if (o.tarih) {
      s.push(`DTSTART;VALUE=DATE:${tarihIcs(o.tarih)}`, `DTEND;VALUE=DATE:${tarihIcs(sonrakiGun(o.tarih))}`);
    } else if (o.baslangic) {
      s.push(`DTSTART:${zamanIcs(o.baslangic)}`);
      s.push(`DTEND:${zamanIcs(o.bitis ?? new Date(o.baslangic.getTime() + 3_600_000))}`);
    } else throw new RangeError("Takvim olayının tarihi yok.");
    s.push(`SUMMARY:${kacisla(o.baslik)}`);
    if (o.aciklama) s.push(`DESCRIPTION:${kacisla(o.aciklama)}`);
    s.push(`STATUS:${o.durum ?? "CONFIRMED"}`, "TRANSP:TRANSPARENT");
    for (const g of o.alarmGunOnce ?? [])
      s.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${kacisla(o.baslik)}`, `TRIGGER:-P${g}D`, "END:VALARM");
    s.push("END:VEVENT");
  }
  s.push("END:VCALENDAR");
  return `${s.map(satirKatla).join("\r\n")}\r\n`;
}

// ---------- İçe aktarma ----------

export interface IcsOlayi {
  uid?: string;
  baslik: string;
  /** Yerel tarih "YYYY-MM-DD" (saatli olaylarda kurum saat diliminde değil, yazıldığı biçimde gün). */
  tarih: string;
  bitisTarihi?: string;
}

function katlamayiAc(metin: string): string[] {
  return metin
    .replace(/\r\n/gu, "\n")
    .replace(/\n[ \t]/gu, "")
    .split("\n");
}

function kacisCoz(m: string): string {
  return m.replace(/\\([\\;,nN])/gu, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

function icsTarihi(deger: string): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})/u.exec(deger.trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** .ics metnindeki VEVENT'leri okur. Bozuk olay atlanmaz; `hatalar`a yazılır. */
export function icsOku(metin: string): { olaylar: IcsOlayi[]; hatalar: string[] } {
  if (metin.length > 5_000_000) throw new RangeError("Takvim dosyası çok büyük.");
  const satirlar = katlamayiAc(metin);
  const olaylar: IcsOlayi[] = [];
  const hatalar: string[] = [];
  let ic: Record<string, string> | null = null;
  let derinlik = 0;
  for (const satir of satirlar) {
    if (satir === "BEGIN:VEVENT") {
      ic = {};
      derinlik = 0;
      continue;
    }
    if (!ic) continue;
    if (satir.startsWith("BEGIN:")) derinlik++;
    else if (satir.startsWith("END:") && satir !== "END:VEVENT") derinlik--;
    else if (satir === "END:VEVENT") {
      const tarih = ic.DTSTART ? icsTarihi(ic.DTSTART) : null;
      const baslik = ic.SUMMARY ? kacisCoz(ic.SUMMARY).trim() : "";
      if (!tarih || !baslik) hatalar.push(`Tarihi ya da adı okunamayan olay: ${baslik || "(adsız)"}`);
      else {
        const bitis = ic.DTEND ? icsTarihi(ic.DTEND) : null;
        olaylar.push({ baslik, tarih, ...(ic.UID ? { uid: ic.UID } : {}), ...(bitis ? { bitisTarihi: bitis } : {}) });
      }
      ic = null;
      continue;
    }
    if (derinlik > 0) continue;
    const iki = satir.indexOf(":");
    if (iki < 0) continue;
    const ad = satir.slice(0, iki).split(";")[0]?.toUpperCase() ?? "";
    if (ad === "DTSTART" || ad === "DTEND" || ad === "SUMMARY" || ad === "UID") ic[ad] = satir.slice(iki + 1);
  }
  return { olaylar, hatalar };
}

export const TakvimEslesmesi = z
  .array(
    z.object({
      /** Olay adında aranacak ifade (büyük/küçük harf duyarsız, Türkçe). */
      icerir: z.string().min(2).max(200),
      anahtar: z.string().regex(/^[a-z0-9_]{2,64}$/u),
      /** Olay birden çok gün sürüyorsa hangi gün alınır. */
      gun: z.enum(["baslangic", "bitis"]).default("baslangic"),
    }),
  )
  .min(1);
export type TakvimEslesmesi = z.infer<typeof TakvimEslesmesi>;

const kucult = (m: string) => m.toLocaleLowerCase("tr-TR");

function oncekiGun(t: string): string {
  const d = new Date(`${t}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Akademik takvim .ics'ini kurum takvimine çevirir. Bir anahtara birden çok olay uyarsa en erken
 * tarih alınmaz, çatışma olarak bildirilir: hangi tarihin geçerli olduğuna insan karar verir.
 */
export function akademikTakvimEsle(
  metin: string,
  eslesmeGirdisi: unknown,
): {
  takvim: Record<string, string>;
  eslesmeyen: string[];
  catisan: { anahtar: string; tarihler: string[] }[];
  hatalar: string[];
} {
  const eslesme = TakvimEslesmesi.parse(eslesmeGirdisi);
  const { olaylar, hatalar } = icsOku(metin);
  const adaylar = new Map<string, Set<string>>();
  const eslesmeyen: string[] = [];
  for (const o of olaylar) {
    const ad = kucult(o.baslik);
    const uyan = eslesme.filter((e) => ad.includes(kucult(e.icerir)));
    if (uyan.length === 0) eslesmeyen.push(o.baslik);
    for (const e of uyan) {
      // DTEND tüm gün olaylarda dışlayıcıdır: son gün = DTEND - 1.
      const t = e.gun === "bitis" && o.bitisTarihi ? oncekiGun(o.bitisTarihi) : o.tarih;
      const k = adaylar.get(e.anahtar) ?? new Set<string>();
      k.add(t);
      adaylar.set(e.anahtar, k);
    }
  }
  const takvim: Record<string, string> = {};
  const catisan: { anahtar: string; tarihler: string[] }[] = [];
  for (const [anahtar, tarihler] of adaylar) {
    const liste = [...tarihler].sort();
    if (liste.length === 1 && liste[0]) takvim[anahtar] = liste[0];
    else catisan.push({ anahtar, tarihler: liste });
  }
  return { takvim, eslesmeyen, catisan, hatalar };
}
