// Değerlendirme düzeneği: görev + altın örnekler + puanlayıcılar → sonuç tablosu ve eşik.
import type { z } from "zod";
import { type Gorev, gorevCalistir } from "../gorevler/gorev.ts";
import type { Saglayici } from "../saglayici.ts";

export interface AltinOrnek<G> {
  ad: string;
  girdi: G;
  /** Çıktıda birebir eşleşmesi beklenen alanlar (üst düzey). */
  beklenen: Record<string, unknown>;
  /** Sahte sağlayıcıyla çalışırken dönecek model yanıtı. */
  sahteYanit?: string;
}

export interface OrnekSonucu {
  ornek: string;
  semaGecerli: boolean;
  atifGecerli: boolean;
  alanEslesme: number;
  sorunlar: string[];
}

export interface DegerlendirmeSonucu {
  gorev: string;
  ornekler: OrnekSonucu[];
  semaOrani: number;
  atifOrani: number;
  alanOrani: number;
  /** Eşik: atıf geçerliliği %100 ve şema geçerliliği %100. */
  gecti: boolean;
}

function ayniMi(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function degerlendir<G, S extends z.ZodType>(
  gorev: Gorev<G, S>,
  ornekler: AltinOrnek<G>[],
  saglayiciVer: (ornek: AltinOrnek<G>) => Saglayici,
): Promise<DegerlendirmeSonucu> {
  const sonuclar: OrnekSonucu[] = [];
  for (const o of ornekler) {
    try {
      const s = await gorevCalistir(gorev, o.girdi, saglayiciVer(o));
      const veri = s.veri as Record<string, unknown>;
      const anahtarlar = Object.keys(o.beklenen);
      const eslesen = anahtarlar.filter((k) => ayniMi(veri[k], o.beklenen[k])).length;
      sonuclar.push({
        ornek: o.ad,
        semaGecerli: true,
        atifGecerli: s.sorunlar.length === 0,
        alanEslesme: anahtarlar.length ? eslesen / anahtarlar.length : 1,
        sorunlar: s.sorunlar.map((x) => `${x.alan}: ${x.aciklama}`),
      });
    } catch (e) {
      sonuclar.push({
        ornek: o.ad,
        semaGecerli: false,
        atifGecerli: false,
        alanEslesme: 0,
        sorunlar: [e instanceof Error ? e.message : String(e)],
      });
    }
  }
  const oran = (f: (s: OrnekSonucu) => number) =>
    sonuclar.length ? sonuclar.reduce((t, s) => t + f(s), 0) / sonuclar.length : 0;
  const semaOrani = oran((s) => (s.semaGecerli ? 1 : 0));
  const atifOrani = oran((s) => (s.atifGecerli ? 1 : 0));
  return {
    gorev: gorev.ad,
    ornekler: sonuclar,
    semaOrani,
    atifOrani,
    alanOrani: oran((s) => s.alanEslesme),
    gecti: semaOrani === 1 && atifOrani === 1,
  };
}

const yuzde = (x: number) => `%${(x * 100).toFixed(0)}`;

export function sonucTablosu(s: DegerlendirmeSonucu): string {
  const satirlar = [
    `Görev: ${s.gorev}`,
    "| Örnek | Şema | Atıf | Alan |",
    "|---|---|---|---|",
    ...s.ornekler.map(
      (o) =>
        `| ${o.ornek} | ${o.semaGecerli ? "geçti" : "kaldı"} | ${o.atifGecerli ? "geçti" : "kaldı"} | ${yuzde(o.alanEslesme)} |`,
    ),
    `| Toplam | ${yuzde(s.semaOrani)} | ${yuzde(s.atifOrani)} | ${yuzde(s.alanOrani)} |`,
    s.gecti ? "Sonuç: eşik karşılandı." : "Sonuç: eşik karşılanmadı (atıf ve şema geçerliliği %100 olmalı).",
  ];
  const sorunlu = s.ornekler.filter((o) => o.sorunlar.length);
  for (const o of sorunlu) satirlar.push(`- ${o.ornek}: ${o.sorunlar.join("; ")}`);
  return satirlar.join("\n");
}
