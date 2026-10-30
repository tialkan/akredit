// Program akreditasyonu ÖDR tablolarının Word (DOCX) ve Excel (XLSX) çıktısı (İP-47).
// Girdi, @akredit/cerceveler `sablonTablosu` çıktısıyla aynı yapıdadır. `null` hücre EKSİK demektir:
// belgeye "EKSİK" yazılır, boş bırakılmaz, sıfır yazılmaz.

import { docxYaz } from "./docx-uret.ts";
import type { DocxBolumu, DocxModeli, HucreDegeri } from "./turler.ts";
import { xlsxYaz } from "./xlsx.ts";

export const EKSIK_HUCRE = "EKSİK";

export type SablonSatiri = { ara: string } | { hucreler: (string | number | null)[]; toplam?: boolean };

export interface SablonTablosu {
  baslik: string;
  /** Tablonun altına yazılan açıklamalar: kaynak şablon, notlar. */
  aciklama: string[];
  basliklar: string[];
  satirlar: SablonSatiri[];
}

export interface TabloSablonuBelgesi {
  baslik: string;
  altBaslik?: string;
  /** Sayfa üstü (ör. kurum adı). "Taslak: onaylanmadı" kendiliğinden eklenir. */
  ustBilgi?: string;
  tablolar: SablonTablosu[];
}

const hucreMetni = (h: string | number | null): string =>
  h === null ? EKSIK_HUCRE : typeof h === "number" ? String(h).replace(".", ",") : h;

/** Satırları sütun sayısına eşitler; ara satır ilk hücreye yazılır. */
function satirMetinleri(t: SablonTablosu): string[][] {
  const n = t.basliklar.length;
  return t.satirlar.map((s) => {
    const hucreler = "ara" in s ? [s.ara] : s.hucreler.map(hucreMetni);
    return Array.from({ length: n }, (_, i) => hucreler[i] ?? "");
  });
}

export function eksikHucreSayisi(t: SablonTablosu): number {
  return t.satirlar.reduce((n, s) => n + ("ara" in s ? 0 : s.hucreler.filter((h) => h === null).length), 0);
}

/** Word modeli: her tablo bir bölüm; eksik hücre varsa tablonun üstünde uyarı. */
export function tabloSablonuModeli(b: TabloSablonuBelgesi): DocxModeli {
  const bolumler: DocxBolumu[] = b.tablolar.map((t) => {
    const eksik = eksikHucreSayisi(t);
    return {
      baslik: t.baslik,
      duzey: 2,
      icerik: [
        ...(eksik
          ? [
              {
                tur: "paragraf" as const,
                metin: `${eksik} hücre EKSİK: kaynağında veri yok. Veriyi tamamlayıp tabloyu yeniden üretin.`,
                vurgu: "eksik" as const,
              },
            ]
          : []),
        { tur: "tablo" as const, basliklar: t.basliklar, satirlar: satirMetinleri(t) },
        ...t.aciklama.map((metin) => ({ tur: "paragraf" as const, metin, vurgu: "not" as const })),
      ],
    };
  });
  return {
    baslik: b.baslik,
    ...(b.altBaslik ? { altBaslik: b.altBaslik } : {}),
    ustBilgi: [b.ustBilgi, "Taslak: onaylanmadı"].filter(Boolean).join(" · "),
    altBilgi: "Akredit: sayılar kurum verisinden hesaplandı, model kullanılmadı.",
    bolumler,
  };
}

/** ÖDR tablolarını Word belgesi olarak üretir. */
export async function tabloSablonuDocx(b: TabloSablonuBelgesi): Promise<Uint8Array> {
  return docxYaz(tabloSablonuModeli(b));
}

/** ÖDR tablolarını Excel olarak üretir: her tablo bir sayfa, sayılar sayı hücresi, EKSİK metin. */
export async function tabloSablonuXlsx(b: TabloSablonuBelgesi): Promise<Uint8Array> {
  return xlsxYaz(
    b.tablolar.map((t) => ({
      ad: t.baslik,
      basliklar: t.basliklar,
      satirlar: t.satirlar.map((s): HucreDegeri[] =>
        "ara" in s ? [s.ara] : s.hucreler.map((h) => (h === null ? EKSIK_HUCRE : h)),
      ),
    })),
  );
}
