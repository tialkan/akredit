// Atıf çapasını kanıt parçalarıyla eşler (İP-44): kanıt panelinde hangi parçanın ve parça içinde hangi
// satırın vurgulanacağını bulur. PDF sayfa, DOCX bölüm (ya da sayfa), XLSX hücre ve satır, sunu slayt çapası.

import type { Capa } from "../turler.ts";

export interface PanelParcasi {
  id: string;
  sira: number;
  metin: string;
  capa: unknown;
}

export interface ParcaVurgusu {
  parcaId: string;
  /** Parça metnindeki vurgulanacak satırların sırası (0'dan); boşsa parçanın tamamı. */
  satirlar: number[];
}

interface Hucre {
  sayfa: string | null;
  ilk: number;
  son: number;
}

/** "Sayfa1!B12" ya da "Sayfa1!A3:D7" yazımından sayfa adı ve satır aralığı. */
export function hucreAraligi(hucre: string): Hucre | null {
  const m = /^(?:(.+)!)?\$?[A-Z]+\$?(\d+)(?::\$?[A-Z]+\$?(\d+))?$/u.exec(hucre.trim());
  if (!m) return null;
  const ilk = Number(m[2]);
  return { sayfa: m[1] ?? null, ilk, son: m[3] ? Number(m[3]) : ilk };
}

function capaOku(c: unknown): Capa {
  return (c && typeof c === "object" ? c : {}) as Capa;
}

/** Parça bu çapaya uyuyor mu; uyuyorsa parça içinde vurgulanacak satırlar. */
export function capaEslestir(parca: PanelParcasi, atif: Capa): ParcaVurgusu | null {
  const p = capaOku(parca.capa);
  const tam = { parcaId: parca.id, satirlar: [] as number[] };
  if (atif.hucre || (atif.satir !== undefined && p.hucre)) {
    const hedef = atif.hucre
      ? hucreAraligi(atif.hucre)
      : { sayfa: null, ilk: atif.satir as number, son: atif.satir as number };
    const kendi = p.hucre ? hucreAraligi(p.hucre) : null;
    if (!hedef || !kendi) return null;
    if (hedef.sayfa && kendi.sayfa && hedef.sayfa !== kendi.sayfa) return null;
    if (hedef.son < kendi.ilk || hedef.ilk > kendi.son) return null;
    // Parça metni: [tablo adı], başlık satırı, sonra kendi.ilk..kendi.son satırları sırayla.
    const satirlar = parca.metin.split("\n");
    const govdeBasi = satirlar.length - (kendi.son - kendi.ilk + 1);
    const vurgu: number[] = [];
    for (let r = Math.max(hedef.ilk, kendi.ilk); r <= Math.min(hedef.son, kendi.son); r++) {
      const i = govdeBasi + (r - kendi.ilk);
      if (i >= 0 && i < satirlar.length) vurgu.push(i);
    }
    return { parcaId: parca.id, satirlar: vurgu };
  }
  if (atif.sayfa !== undefined) {
    if (p.sayfa === undefined) return null;
    const son = atif.sayfaSon ?? atif.sayfa;
    const pSon = p.sayfaSon ?? p.sayfa;
    return p.sayfa <= son && pSon >= atif.sayfa ? tam : null;
  }
  if (atif.slayt !== undefined) return p.slayt === atif.slayt ? tam : null;
  if (atif.bolum !== undefined) {
    if (p.bolum === undefined) return null;
    const a = atif.bolum.trim().toLocaleLowerCase("tr-TR");
    const b = p.bolum.trim().toLocaleLowerCase("tr-TR");
    return a === b || b.startsWith(`${a}.`) || b.startsWith(`${a} `) ? tam : null;
  }
  if (atif.satir !== undefined) {
    if (p.satir !== undefined) return p.satir === atif.satir ? tam : null;
    return null;
  }
  return null;
}

/** Çapaya uyan parçalar; çapa yoksa boş (panel belgenin başından açılır). */
export function vurgulanacaklar(parcalar: readonly PanelParcasi[], capa: Capa | null | undefined): ParcaVurgusu[] {
  if (!capa || Object.keys(capa).length === 0) return [];
  return parcalar.flatMap((p) => {
    const v = capaEslestir(p, capa);
    return v ? [v] : [];
  });
}

/** Çapanın okunur yazımı: "s. 3", "s. 3-5", "Sayfa1!B12", "satır 4", "slayt 2", "bölüm 2.1". */
export function capaYaz(capa: Capa | null | undefined): string {
  if (!capa) return "";
  if (capa.hucre) return capa.hucre;
  if (capa.sayfa !== undefined) return capa.sayfaSon ? `s. ${capa.sayfa}-${capa.sayfaSon}` : `s. ${capa.sayfa}`;
  if (capa.slayt !== undefined) return `slayt ${capa.slayt}`;
  if (capa.bolum) return `bölüm ${capa.bolum}`;
  if (capa.satir !== undefined) return `satır ${capa.satir}`;
  return "";
}
