// Kanıt atıf sözdizimi. Rapor taslakları, öneriler ve YZ çıktıları bu biçimi kullanır.
//
//   Atıf   := "[K:" ÖZET ( " " KONUM )* ( " " ALINTI )? "]"
//   ÖZET   := kanıt içerik özetinin ilk 6-64 onaltılık karakteri (önerilen 8)
//   KONUM  := "s." SAYI ("-" SAYI)?   sayfa ya da sayfa aralığı
//           | "b." METİN              bölüm (boşluksuz)
//           | "st." SAYI              satır
//           | "h." HÜCRE             tablo hücresi, ör. B12
//           | "sl." SAYI             slayt
//   ALINTI := '"' 1-300 karakter '"'  (tipografik “ ” de olur; içinde " ve ] olmaz)
//   Eksik  := "[EKSİK" ( ":" açıklama )? "]"
//
// Örnek: Kurul toplantısı yapıldı [K:1a2b3c4d s.3 "danışma kurulu toplandı"].
// Eski Akreddit biçimi "[K:1a2b3c4d]" ve "[K:1a2b3c4d s. 3]" de geçerlidir.

import type { Capa } from "./turler.ts";

export interface Atif {
  /** Metindeki ham yazım. */
  ham: string;
  /** Küçük harfli özet öneki. */
  ozetOneki: string;
  capa: Capa | null;
  alinti: string | null;
  /** Tanınmayan konum parçaları (eski serbest yazım). Boş değilse uyarı verilir. */
  taninmayan: string | null;
  baslangic: number;
  bitis: number;
}

export interface EksikIsareti {
  ham: string;
  aciklama: string;
  baslangic: number;
  bitis: number;
}

const ATIF = /\[K:([0-9a-fA-F]{6,64})([^\]]*)\]/gu;
const EKSIK = /\[(?:EKS[İI]K|[Ee]ksik)(?::\s*([^\]]*))?\]/gu;
const ALINTI_SONDA = /["“]([^"“”\]]{1,300})["”]\s*$/u;
const KONUM_BOSLUGU = /\b(s|b|st|h|sl)\.\s+/gu;

const KONUM_KALIPLARI: readonly [RegExp, (m: RegExpMatchArray, capa: Capa) => void][] = [
  [
    /^s\.(\d+)(?:-(\d+))?$/u,
    (m, capa) => {
      capa.sayfa = Number(m[1]);
      if (m[2]) capa.sayfaSon = Number(m[2]);
    },
  ],
  [/^b\.(\S+)$/u, (m, capa) => (capa.bolum = m[1])],
  [/^st\.(\d+)$/u, (m, capa) => (capa.satir = Number(m[1]))],
  [/^h\.(\S+)$/u, (m, capa) => (capa.hucre = m[1])],
  [/^sl\.(\d+)$/u, (m, capa) => (capa.slayt = Number(m[1]))],
];

function konumCoz(kuyruk: string): { capa: Capa | null; taninmayan: string | null } {
  const capa: Capa = {};
  const kalan: string[] = [];
  const parcalar = kuyruk.replace(KONUM_BOSLUGU, "$1.").split(/\s+/u).filter(Boolean);
  for (const p of parcalar) {
    const eslesen = KONUM_KALIPLARI.find(([kalip]) => kalip.test(p));
    const m = eslesen ? p.match(eslesen[0]) : null;
    if (eslesen && m) eslesen[1](m, capa);
    else kalan.push(p);
  }
  return { capa: Object.keys(capa).length ? capa : null, taninmayan: kalan.length ? kalan.join(" ") : null };
}

/** Metindeki bütün kanıt atıflarını sırasıyla döndürür. */
export function atiflariAyristir(metin: string): Atif[] {
  const sonuc: Atif[] = [];
  for (const m of metin.matchAll(ATIF)) {
    const ozetOneki = (m[1] ?? "").toLowerCase();
    let kuyruk = (m[2] ?? "").trim();
    let alinti: string | null = null;
    const a = kuyruk.match(ALINTI_SONDA);
    if (a && a.index !== undefined) {
      alinti = (a[1] ?? "").trim() || null;
      kuyruk = kuyruk.slice(0, a.index).trim();
    }
    const { capa, taninmayan } = konumCoz(kuyruk);
    const baslangic = m.index ?? 0;
    sonuc.push({ ham: m[0], ozetOneki, capa, alinti, taninmayan, baslangic, bitis: baslangic + m[0].length });
  }
  return sonuc;
}

/** Metindeki [EKSİK: …] işaretlerini döndürür. */
export function eksikleriAyristir(metin: string): EksikIsareti[] {
  return [...metin.matchAll(EKSIK)].map((m) => {
    const baslangic = m.index ?? 0;
    return { ham: m[0], aciklama: (m[1] ?? "").trim(), baslangic, bitis: baslangic + m[0].length };
  });
}

/** Kanonik atıf yazımı. Özetin ilk 8 karakteri kullanılır. */
export function atifYaz(ozet: string, capa?: Capa | null, alinti?: string | null): string {
  const parcalar = [`K:${ozet.slice(0, 8).toLowerCase()}`];
  if (capa?.sayfa !== undefined)
    parcalar.push(`s.${capa.sayfa}${capa.sayfaSon !== undefined ? `-${capa.sayfaSon}` : ""}`);
  if (capa?.bolum) parcalar.push(`b.${capa.bolum.replace(/\s+/gu, "_")}`);
  if (capa?.satir !== undefined) parcalar.push(`st.${capa.satir}`);
  if (capa?.hucre) parcalar.push(`h.${capa.hucre}`);
  if (capa?.slayt !== undefined) parcalar.push(`sl.${capa.slayt}`);
  if (alinti) parcalar.push(`"${alinti.replace(/["\]“”]/gu, "'").slice(0, 300)}"`);
  return `[${parcalar.join(" ")}]`;
}
