// Ders çıktısı × program çıktısı matrisi. apps/cli/bin/akreddit `matrisOlustur` ile aynı Markdown ve CSV biçimi.
// Yalnız onaylanan ya da düzeltilen kararlar girer; her hücrede son geçerli karar kullanılır.

import { gecerliKarar, kararIcerigi } from "./oneri.ts";
import type { IsoZaman, Karar, MatrisDegeri, Oneri } from "./turler.ts";

export interface MatrisDersCiktisi {
  /** Ders kodu, ör. "TBP201". */
  ders: string;
  /** Ders çıktısı kodu, ör. "Ö1". */
  kod: string;
}

export interface MatrisGirdisi {
  /** Program çıktısı kodları. */
  programCiktilari: readonly string[];
  dersCiktilari: readonly MatrisDersCiktisi[];
  /** `matris_katkisi` önerileri. Hedef kimliği "DERS.KOD|PKOD" biçimindedir. */
  oneriler: readonly Oneri<MatrisDegeri>[];
  kararlar: readonly Karar<MatrisDegeri>[];
  /** Tablonun oluşturulma zamanı (Markdown başlığında yazılır). */
  olusturma: IsoZaman;
}

export interface MatrisSonucu {
  /** "DERS.KOD" satır adları. */
  satirlar: string[];
  /** Program çıktısı kodları. */
  sutunlar: string[];
  /** satır → sütun → değer (karar yoksa null). */
  hucreler: Record<string, Record<string, MatrisDegeri | null>>;
  /** Karar bekleyen matris önerisi sayısı. */
  bekleyen: number;
  markdown: string;
  csv: string;
}

/** Matris önerisinin hedef kimliği. */
export function matrisHedefi(ders: string, dkod: string, pkod: string): string {
  return `${ders}.${dkod}|${pkod}`;
}

const sirala = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function matrisOlustur(g: MatrisGirdisi): MatrisSonucu {
  const sutunlar = [...g.programCiktilari].sort(sirala);
  const dersler = [...g.dersCiktilari].sort((a, b) => sirala(a.ders, b.ders) || sirala(a.kod, b.kod));
  const satirlar = dersler.map((d) => `${d.ders}.${d.kod}`);

  const matrisOnerileri = g.oneriler.filter((o) => o.tur === "matris_katkisi");
  const oneriById = new Map(matrisOnerileri.map((o) => [o.id as string, o]));
  const hedefKararlari = new Map<string, Karar<MatrisDegeri>[]>();
  const kararliOneriler = new Set<string>();
  for (const k of g.kararlar) {
    const o = oneriById.get(k.oneriId);
    if (!o) continue;
    kararliOneriler.add(o.id);
    const liste = hedefKararlari.get(o.hedef.id) ?? [];
    liste.push(k);
    hedefKararlari.set(o.hedef.id, liste);
  }
  const bekleyen = matrisOnerileri.filter((o) => !kararliOneriler.has(o.id)).length;

  const deger = (hedef: string): MatrisDegeri | null => {
    const k = gecerliKarar(hedefKararlari.get(hedef) ?? []);
    if (!k) return null;
    const o = oneriById.get(k.oneriId);
    return o ? kararIcerigi(o, k) : null;
  };

  const hucreler: Record<string, Record<string, MatrisDegeri | null>> = {};
  for (const s of satirlar) {
    const satir: Record<string, MatrisDegeri | null> = {};
    for (const p of sutunlar) satir[p] = deger(`${s}|${p}`);
    hucreler[s] = satir;
  }

  const yazim = (d: MatrisDegeri | null | undefined, csv: boolean): string => {
    if (!d) return "";
    if (d.tur === "puan") return String(d.puan);
    return csv ? d.tur : d.tur === "iliskisiz" ? "·" : "?";
  };
  const hucre = (s: string, p: string, csv: boolean) => yazim(hucreler[s]?.[p], csv);

  const markdown = [
    "# Ders çıktısı × program çıktısı matrisi",
    "",
    `Oluşturma: ${g.olusturma.slice(0, 16).replace("T", " ")}. Yalnız kullanıcının onayladığı ya da düzelttiği değerler yer alır.`,
    "",
    `| Ders çıktısı | ${sutunlar.join(" | ")} |`,
    `|---|${sutunlar.map(() => "---").join("|")}|`,
    ...satirlar.map((s) => `| ${s} | ${sutunlar.map((p) => hucre(s, p, false)).join(" | ")} |`),
    "",
    "Gösterim: 1-5 katkı düzeyi. `·` ilişkisiz. `?` kanıt yetersiz. Boş hücre henüz değerlendirilmedi. Bu tablo tasarım uyumunu gösterir, öğrenci başarısını göstermez.",
    bekleyen ? `\nKarar bekleyen ${bekleyen} matris önerisi var.` : "",
  ].join("\n");
  const csv = [
    ["ders_ciktisi", ...sutunlar].join(","),
    ...satirlar.map((s) => [s, ...sutunlar.map((p) => hucre(s, p, true))].join(",")),
  ].join("\n");

  return { satirlar, sutunlar, hucreler, bekleyen, markdown, csv };
}
