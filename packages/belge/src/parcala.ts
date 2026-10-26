// Belge metnini çapalı parçalara böler. Kurallar:
// - Her parça tek bir bölümden (dolayısıyla tek bir PDF sayfasından, tek slayttan) gelir; sayfa sınırı aşılmaz.
// - Paragraf sınırlarına saygı gösterilir; hedefi aşan tek paragraf cümle, gerekirse boşluk sınırından bölünür.
// - Tablo satırı bölünmez; büyük tablolar satır gruplarına ayrılır ve başlık satırı her grupta tekrarlanır.
//   Tek başına en büyük uzunluğu aşan bir satır yine bölünmez, kendi parçası olur (tek istisna).
// - Elektronik tablonun okunabilir metin bölümü (çapası bir tablonunkiyle aynı) tablo parçalarıyla
//   tekrarlanmasın diye atlanır.

import type { Capa } from "@akredit/cekirdek";
import type { BelgeMetni, HucreDegeri, Parca, ParcalamaSecenekleri, Tablo } from "./turler.ts";

function bosluktanBol(metin: string, en: number): string[] {
  const sonuc: string[] = [];
  let kalan = metin;
  while (kalan.length > en) {
    let kes = kalan.lastIndexOf(" ", en);
    if (kes < en / 2) kes = en;
    sonuc.push(kalan.slice(0, kes).trim());
    kalan = kalan.slice(kes).trim();
  }
  if (kalan) sonuc.push(kalan);
  return sonuc;
}

function paragrafBol(p: string, hedef: number, en: number): string[] {
  if (p.length <= en) return [p];
  const cumleler = p.match(/[^.!?…]+(?:[.!?…]+["')\]]*\s*|$)/g) ?? [p];
  const sonuc: string[] = [];
  let simdiki = "";
  for (const c0 of cumleler) {
    const c = c0.trim();
    if (!c) continue;
    if (c.length > en) {
      if (simdiki) sonuc.push(simdiki);
      simdiki = "";
      sonuc.push(...bosluktanBol(c, en));
      continue;
    }
    const aday = simdiki ? `${simdiki} ${c}` : c;
    if (aday.length > hedef && simdiki) {
      sonuc.push(simdiki);
      simdiki = c;
    } else simdiki = aday;
  }
  if (simdiki) sonuc.push(simdiki);
  return sonuc;
}

/** Metni paragraf sınırlarından hedef uzunluğa yakın gruplar. Hiçbir parça `en`i aşmaz. */
export function metniBol(metin: string, hedef: number, en: number): string[] {
  const paragraflar = metin
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .flatMap((p) => paragrafBol(p, hedef, en));
  const sonuc: string[] = [];
  let simdiki = "";
  for (const p of paragraflar) {
    const aday = simdiki ? `${simdiki}\n${p}` : p;
    if (simdiki && (aday.length > hedef || aday.length > en)) {
      sonuc.push(simdiki);
      simdiki = p;
    } else simdiki = aday;
  }
  if (simdiki) sonuc.push(simdiki);
  return sonuc;
}

function satirMetni(s: HucreDegeri[]): string {
  return s.map((h) => (h === null ? "" : String(h).replace(/\s*\n\s*/g, " "))).join(" | ");
}

function hucreAraligi(capa: Capa, ilkSatir: number, sonSatir: number, sutun: number): Capa {
  // "Sayfa!A1:D20" biçimindeki tablo çapasını satır grubuna daraltır.
  const m = capa.hucre ? /^(.*!)?([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(capa.hucre) : null;
  if (!m) return { ...capa, satir: ilkSatir };
  const sayfa = m[1] ?? "";
  const bas = Number(m[3]);
  const sonSutun = m[4] ?? sutunHarf(sutun);
  return { ...capa, hucre: `${sayfa}${m[2]}${bas + ilkSatir - 1}:${sonSutun}${bas + sonSatir - 1}` };
}

function sutunHarf(n: number): string {
  let s = "";
  let k = Math.max(n, 1);
  while (k > 0) {
    s = String.fromCharCode(65 + ((k - 1) % 26)) + s;
    k = Math.floor((k - 1) / 26);
  }
  return s;
}

function tabloParcalari(t: Tablo, hedef: number, en: number): { capa: Capa; metin: string }[] {
  const satirlar = t.satirlar.filter((s) => s.some((h) => h !== null && h !== ""));
  if (satirlar.length === 0) return [];
  const sutun = Math.max(...t.satirlar.map((s) => s.length));
  const ad = t.ad ? `${t.ad}\n` : "";
  const baslik = satirMetni(satirlar[0] as HucreDegeri[]);
  // Satırların tablo içindeki sıra numarası (1'den), boş satırlar atlanmış olsa da özgün sıra korunur.
  const sira = t.satirlar.map((s, i) => (s.some((h) => h !== null && h !== "") ? i + 1 : 0)).filter((n) => n > 0);
  const sonuc: { capa: Capa; metin: string }[] = [];
  const onEk = `${ad}${baslik}`;
  if (satirlar.length === 1) return [{ capa: hucreAraligi(t.capa, 1, 1, sutun), metin: onEk }];
  let grup: string[] = [];
  let ilk = 0;
  let son = 0;
  const bosalt = () => {
    if (grup.length === 0) return;
    sonuc.push({ capa: hucreAraligi(t.capa, ilk, son, sutun), metin: `${onEk}\n${grup.join("\n")}` });
    grup = [];
  };
  for (let i = 1; i < satirlar.length; i++) {
    const m = satirMetni(satirlar[i] as HucreDegeri[]);
    const no = sira[i] as number;
    const uzunluk = onEk.length + 1 + [...grup, m].join("\n").length;
    if (grup.length > 0 && (uzunluk > hedef || uzunluk > en)) bosalt();
    if (onEk.length + 1 + m.length > en) {
      // Tek satır başlıkla sığmıyor: satır bölünmez, başlıksız kendi parçası olur.
      bosalt();
      sonuc.push({ capa: hucreAraligi(t.capa, no, no, sutun), metin: m });
      continue;
    }
    if (grup.length === 0) ilk = no;
    grup.push(m);
    son = no;
  }
  bosalt();
  return sonuc;
}

function capaAyni(a: Capa, b: Capa): boolean {
  return a.hucre !== undefined && a.hucre === b.hucre;
}

export function parcalaUygula(belge: BelgeMetni, secenek?: ParcalamaSecenekleri): Parca[] {
  const en = Math.max(secenek?.enBuyukUzunluk ?? 1600, 50);
  const hedef = Math.min(Math.max(secenek?.hedefUzunluk ?? 1000, 20), en);
  const parcalar: Parca[] = [];
  const ekle = (capa: Capa, metin: string) => parcalar.push({ sira: parcalar.length, capa: { ...capa }, metin });
  for (const b of belge.bolumler) {
    if (belge.tablolar.some((t) => capaAyni(t.capa, b.capa))) continue;
    const metin = b.baslik && b.metin ? `${b.baslik}\n${b.metin}` : b.metin || b.baslik || "";
    for (const m of metniBol(metin, hedef, en)) ekle(b.capa, m);
  }
  for (const t of belge.tablolar) for (const p of tabloParcalari(t, hedef, en)) ekle(p.capa, p.metin);
  return parcalar;
}
