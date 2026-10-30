// Sınav taramasının saf mantığı (İP-43): kâğıt sınırı, numara okuma, hücre değerlendirmesi. IO yapmaz.
//
// Sayılar: soru puanlarının toplamı ve azami puan karşılaştırması burada, binde bir birimli tam sayılarla
// deterministik yapılır. Model hiçbir toplam ya da ortalama üretmez; ÇK/PÇ hesapları `@akredit/olcme`'dedir.

import type { KatmanSonucu } from "@akredit/cekirdek";
import { type HucreNedeni, type KagitSiniri, NUMARA_ALANI, TOPLAM_ALANI } from "./turler.ts";

export class KagitSiniriHatasi extends Error {}

/** Normalleştirilmiş metin: Türkçe büyük harf, işaretsiz (İ→I, Ş→S; tarayıcı metni ikisini de verebilir), tek boşluk. */
const norm = (s: string) =>
  s.toLocaleUpperCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/gu, " ").trim();

/**
 * Sayfaları kâğıtlara böler. Dönen her dizi bir kâğıdın sayfa sıralarıdır (0'dan başlar).
 * Sayfa düzeninde toplam sayfa kâğıt sayfasına bölünmezse ya da kapak işaretli ilk sayfa yoksa hata verir.
 */
export function kagitlaraBol(sinir: KagitSiniri, sayfaMetinleri: readonly string[]): number[][] {
  const n = sayfaMetinleri.length;
  if (n === 0) throw new KagitSiniriHatasi("Taranmış dosyada sayfa yok.");
  if (sinir.tur === "sayfa") {
    if (n % sinir.sayfaSayisi !== 0)
      throw new KagitSiniriHatasi(
        `Dosyada ${n} sayfa var; her kâğıt ${sinir.sayfaSayisi} sayfa olduğuna göre eksik ya da fazla sayfa var. Taramayı kontrol edin.`,
      );
    return Array.from({ length: n / sinir.sayfaSayisi }, (_, k) =>
      Array.from({ length: sinir.sayfaSayisi }, (_, i) => k * sinir.sayfaSayisi + i),
    );
  }
  const isaret = norm(sinir.isaret);
  const kagitlar: number[][] = [];
  for (let i = 0; i < n; i++) {
    const kapak = norm(sayfaMetinleri[i] ?? "").includes(isaret);
    if (kapak) kagitlar.push([i]);
    else if (kagitlar.length === 0)
      throw new KagitSiniriHatasi("İlk sayfada kapak işareti bulunamadı. Kâğıtları kapak sayfasıyla başlatın.");
    else kagitlar[kagitlar.length - 1]?.push(i);
  }
  return kagitlar;
}

// Tarayıcı metninde rakama benzeyen harfler.
const BENZER: Record<string, string> = { O: "0", o: "0", D: "0", I: "1", l: "1", i: "1", "|": "1", S: "5", B: "8" };

/**
 * Öğrenci numarası kutusunun metninden numarayı çıkarır. Okunamazsa ya da uzunluk tutmazsa null.
 * Dönen değer hemen takma ada çevrilmeli; hiçbir yere yazılmamalıdır.
 */
export function numarayiOku(metin: string, uzunluk?: number): string | null {
  const aday = [...metin.replace(/[\s.\-_/]/gu, "")].map((c) => BENZER[c] ?? c).join("");
  const bulunan = aday.match(/\d{4,14}/gu) ?? [];
  if (bulunan.length !== 1) return null;
  const no = bulunan[0] as string;
  if (uzunluk !== undefined && no.length !== uzunluk) return null;
  return no;
}

/** Model istemine giden metin güvenli mi: öğrenci numarası olabilecek 5 ve üzeri ardışık rakam yok. */
export function istemGuvenliMi(metin: string): boolean {
  return !/\d[\s.\-_/]?\d[\s.\-_/]?\d[\s.\-_/]?\d[\s.\-_/]?\d/u.test(metin);
}

/** Puanı binde bir birimli tam sayıya çevirir (veritabanı `numeric(8,3)` ile aynı ölçek). */
export function binde(x: number): number {
  return Math.round(x * 1000);
}

export interface OkunanHucre {
  alan: string;
  deger: number | null;
  guven: number;
  /** Modelin verdiği değer kutunun tarayıcı metninde geçiyor mu (`metindeSayiVarMi`). false ise onaya düşer. */
  metinde?: boolean;
}

/**
 * Modelin okuduğu değer kutunun tarayıcı metninde bir sayı olarak geçiyor mu (binde bir ölçekte eşitlik).
 * Model metinde olmayan bir sayı üretirse (uydurma, tahmin) değer otomatik kabul edilmez. Rakama benzeyen
 * harfler (O→0, l→1) numaradaki gibi düzeltilir.
 */
export function metindeSayiVarMi(metin: string, deger: number | null): boolean {
  if (deger === null) return true;
  const duz = [...metin].map((c) => BENZER[c] ?? c).join("");
  const sayilar = duz.match(/\d+(?:[.,]\d+)?/gu) ?? [];
  return sayilar.some((s) => binde(Number(s.replace(",", "."))) === binde(deger));
}

export interface DegerlendirilmisHucre extends OkunanHucre {
  durum: "otomatik" | "onay_bekliyor";
  katman: 0 | 2;
  nedenler: HucreNedeni[];
}

/**
 * Bir kâğıdın hücrelerini değerlendirir. Eşik altı güven, okunamayan değer, azami puan aşımı ve kâğıttaki
 * toplamın soru puanlarıyla tutmaması onaya (Katman 2) düşer; toplam ve azami kuralları eşikten bağımsızdır.
 */
export function kagidiDegerlendir(g: {
  sorular: readonly OkunanHucre[];
  toplam: OkunanHucre | null;
  numaraOkundu: boolean;
  azami: ReadonlyMap<string, number>;
  esik: number;
}): DegerlendirilmisHucre[] {
  const nedenler = new Map<string, Set<HucreNedeni>>();
  const ekle = (alan: string, n: HucreNedeni) => {
    const s = nedenler.get(alan) ?? new Set<HucreNedeni>();
    s.add(n);
    nedenler.set(alan, s);
  };
  for (const h of [...g.sorular, ...(g.toplam ? [g.toplam] : [])]) {
    if (h.deger === null) ekle(h.alan, "okunamadi");
    if (h.metinde === false) ekle(h.alan, "metinde_yok");
    if (h.guven < g.esik) ekle(h.alan, "dusuk_guven");
    const azami = h.alan === TOPLAM_ALANI ? toplamAzami(g.azami) : g.azami.get(h.alan);
    if (h.deger !== null && (h.deger < 0 || (azami !== undefined && binde(h.deger) > binde(azami))))
      ekle(h.alan, "azami_asimi");
  }
  if (g.toplam && g.toplam.deger !== null && g.sorular.every((h) => h.deger !== null)) {
    const toplam = g.sorular.reduce((t, h) => t + binde(h.deger as number), 0);
    if (toplam !== binde(g.toplam.deger)) for (const h of [...g.sorular, g.toplam]) ekle(h.alan, "toplam_tutarsiz");
  }
  const sonuc: DegerlendirilmisHucre[] = [...g.sorular, ...(g.toplam ? [g.toplam] : [])].map((h) => {
    const n = [...(nedenler.get(h.alan) ?? [])].sort();
    const { metinde: _m, ...hucre } = h;
    return { ...hucre, durum: n.length ? "onay_bekliyor" : "otomatik", katman: n.length ? 2 : 0, nedenler: n };
  });
  sonuc.unshift({
    alan: NUMARA_ALANI,
    deger: null,
    guven: g.numaraOkundu ? 1 : 0,
    durum: g.numaraOkundu ? "otomatik" : "onay_bekliyor",
    katman: g.numaraOkundu ? 0 : 2,
    nedenler: g.numaraOkundu ? [] : ["numara_okunamadi"],
  });
  return sonuc;
}

function toplamAzami(azami: ReadonlyMap<string, number>): number {
  return [...azami.values()].reduce((t, x) => t + binde(x), 0) / 1000;
}

const GEREKCE: Record<HucreNedeni, string> = {
  okunamadi: "Puan okunamadı.",
  dusuk_guven: "Okuma güveni eşiğin altında.",
  azami_asimi: "Okunan puan sorunun azami puanını aşıyor ya da eksi.",
  toplam_tutarsiz: "Soru puanlarının toplamı kâğıttaki toplamla tutmuyor.",
  numara_okunamadi: "Öğrenci numarası okunamadı.",
  metinde_yok: "Okunan puan kutudaki yazıyla eşleşmiyor.",
};

/**
 * Onaya düşen hücrenin karar katmanı. Her zaman Katman 2'dir: puan kişinin akademik kararıdır, politika ya da
 * süre dolumuyla verilemez, toplu onaylanamaz (`zorunluKararDenetle`).
 */
export function hucreKatmani(nedenler: readonly HucreNedeni[]): KatmanSonucu {
  const ana = nedenler.includes("toplam_tutarsiz")
    ? "toplam_tutarsiz"
    : nedenler.includes("azami_asimi")
      ? "azami_asimi"
      : (nedenler[0] ?? "dusuk_guven");
  return {
    katman: 2,
    kural: `K2-sinav-${ana.replace(/_/gu, "-")}`,
    gerekce: `${nedenler.map((n) => GEREKCE[n]).join(" ")} Puanı siz onaylayın ya da düzeltin.`,
    devredilemez: true,
  };
}

export const NEDEN_METNI = GEREKCE;
