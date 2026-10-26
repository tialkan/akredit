// Sayı güvencesi: metindeki sayıları (Türkçe ondalık virgül, yüzde, tarih) çıkarır ve
// atıf yapılan parçalarda ya da verilen hesap sonuçlarında geçmeyenleri raporlar.
import { atiflariAyristir } from "@akredit/cekirdek";
import type { AtifKaynagi } from "./atif.ts";

export type SayiTuru = "sayi" | "yuzde" | "tarih";

export interface BulunanSayi {
  ham: string;
  tur: SayiTuru;
  /** Sayı ve yüzde için sayısal değer; tarih için ISO "YYYY-AA-GG". */
  deger: number | string;
  baslangic: number;
  bitis: number;
}

const AYLAR = [
  "ocak",
  "şubat",
  "mart",
  "nisan",
  "mayıs",
  "haziran",
  "temmuz",
  "ağustos",
  "eylül",
  "ekim",
  "kasım",
  "aralık",
];

const iki = (n: number) => String(n).padStart(2, "0");

const TARIH_NOKTALI = /(?<![\d.])(\d{1,2})[./](\d{1,2})[./](\d{4})(?![\d])/gu;
const TARIH_ISO = /(?<![\d-])(\d{4})-(\d{2})-(\d{2})(?![\d])/gu;
const TARIH_YAZILI = new RegExp(`(?<![\\d])(\\d{1,2})\\s+(${AYLAR.join("|")})\\s+(\\d{4})(?![\\d])`, "giu");
// %45, % 45,5, 45%, 1.250,75, 3,5, 12
const SAYI = /(%\s?)?(?<![\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?|\d+\.\d+)(?![\d])(\s?%)?/gu;

/** "1.250,75" → 1250.75; "3,5" → 3.5; "3.5" → 3.5. */
export function turkceSayiCoz(ham: string): number {
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/u.test(ham)) return Number(ham.replace(/\./gu, "").replace(",", "."));
  return Number(ham.replace(",", "."));
}

export function sayilariCikar(metin: string): BulunanSayi[] {
  const sonuc: BulunanSayi[] = [];
  const dolu: [number, number][] = [];
  const ekle = (b: BulunanSayi) => {
    if (dolu.some(([a, s]) => b.baslangic < s && b.bitis > a)) return;
    dolu.push([b.baslangic, b.bitis]);
    sonuc.push(b);
  };
  const tarih = (m: RegExpMatchArray, g: number, a: number, y: number) => {
    if (a < 1 || a > 12 || g < 1 || g > 31) return;
    ekle({
      ham: m[0],
      tur: "tarih",
      deger: `${y}-${iki(a)}-${iki(g)}`,
      baslangic: m.index ?? 0,
      bitis: (m.index ?? 0) + m[0].length,
    });
  };
  for (const m of metin.matchAll(TARIH_ISO)) tarih(m, Number(m[3]), Number(m[2]), Number(m[1]));
  for (const m of metin.matchAll(TARIH_NOKTALI)) tarih(m, Number(m[1]), Number(m[2]), Number(m[3]));
  for (const m of metin.matchAll(TARIH_YAZILI))
    tarih(m, Number(m[1]), AYLAR.indexOf((m[2] ?? "").toLocaleLowerCase("tr-TR")) + 1, Number(m[3]));
  for (const m of metin.matchAll(SAYI)) {
    const yuzde = Boolean(m[1] || m[3]);
    ekle({
      ham: m[0].trim(),
      tur: yuzde ? "yuzde" : "sayi",
      deger: turkceSayiCoz(m[2] ?? ""),
      baslangic: m.index ?? 0,
      bitis: (m.index ?? 0) + m[0].length,
    });
  }
  return sonuc.sort((a, b) => a.baslangic - b.baslangic);
}

function esit(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export interface SayiDenetimi {
  sayilar: BulunanSayi[];
  /** Kaynakta ya da hesap sonuçlarında geçmeyenler. */
  dayanaksiz: BulunanSayi[];
}

/**
 * Metindeki sayıların dayanağını denetler. Atıfların içindeki sayılar (sayfa, alıntı) denetlenmez.
 * Dayanak: metinde atıf yapılan kanıtların parçaları (atıf yoksa bütün kaynaklar) ve verilen hesap sonuçları.
 * Yüzde, hesap sonucunda oran (0-1) olarak da bulunabilir: %45 ↔ 0,45.
 */
export function sayilariDenetle(
  metin: string,
  secenek: { kaynaklar?: AtifKaynagi[]; hesapSonuclari?: number[]; tarihler?: string[] } = {},
): SayiDenetimi {
  let atifsiz = metin;
  const atiflar = atiflariAyristir(metin);
  for (const a of atiflar) atifsiz = atifsiz.slice(0, a.baslangic) + " ".repeat(a.ham.length) + atifsiz.slice(a.bitis);
  const kaynaklar = secenek.kaynaklar ?? [];
  const onekler = atiflar.map((a) => a.ozetOneki);
  const ilgili = onekler.length
    ? kaynaklar.filter((k) => onekler.some((o) => k.ozet.toLowerCase().startsWith(o)))
    : kaynaklar;
  const dayanak = ilgili.flatMap((k) => k.parcalar.flatMap((p) => sayilariCikar(p.metin)));
  const sayilar = sayilariCikar(atifsiz).map((s) => ({ ...s, ham: metin.slice(s.baslangic, s.bitis).trim() }));
  const hesap = secenek.hesapSonuclari ?? [];
  const dayanaksiz = sayilar.filter((s) => {
    if (s.tur === "tarih")
      return (
        !dayanak.some((d) => d.tur === "tarih" && d.deger === s.deger) && !secenek.tarihler?.includes(String(s.deger))
      );
    const v = s.deger as number;
    const kaynaktaVar = dayanak.some((d) => d.tur !== "tarih" && esit(d.deger as number, v));
    const hesaptaVar = hesap.some((h) => esit(h, v) || (s.tur === "yuzde" && esit(h * 100, v)));
    return !kaynaktaVar && !hesaptaVar;
  });
  return { sayilar, dayanaksiz };
}
