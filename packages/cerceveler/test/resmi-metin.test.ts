// Resmî metin doğrulaması: veri dosyalarındaki her resmî başlık ve metin, kaynak belgenin
// (kaynaklar/resmi) çıkarılmış metninde birebir geçmeli. Belgeler @akredit/belge ile okunur.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { metinCikar } from "@akredit/belge";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type Cerceve,
  type KaynakBelge,
  normalize,
  tumOlcutler,
  YOKAK_ANAHTAR_3_3_UYARILAR,
  YOKAK_KIDR_3_2_1,
  YOKAK_KURUMSAL_3_3,
} from "../src/index.ts";

const KOK = new URL("../../../kaynaklar/resmi/", import.meta.url);
const sayfalar = new Map<string, string[]>();

async function oku(b: KaynakBelge): Promise<void> {
  if (!b.dosya || sayfalar.has(b.dosya)) return;
  const veri = new Uint8Array(readFileSync(new URL(b.dosya, KOK)));
  expect(createHash("sha256").update(veri).digest("hex")).toBe(b.sha256);
  const m = await metinCikar(veri);
  const dizi: string[] = [];
  for (const bl of m.bolumler) dizi[(bl.capa.sayfa ?? 1) - 1] = normalize(bl.metin);
  sayfalar.set(b.dosya, dizi);
}

/** Metin, belgenin verilen sayfasında (ya da sonraki sayfaya taşarak) birebir geçiyor mu? */
function sayfadaGecer(dosya: string, sayfa: number, metin: string): boolean {
  const s = sayfalar.get(dosya);
  if (!s) throw new Error(`Belge okunmadı: ${dosya}`);
  const pencere = `${s[sayfa - 1] ?? ""} ${s[sayfa] ?? ""}`;
  return pencere.includes(normalize(metin));
}

const CERCEVELER: Cerceve[] = [YOKAK_KURUMSAL_3_3, YOKAK_KIDR_3_2_1];

beforeAll(async () => {
  for (const c of CERCEVELER) for (const b of [c.kaynak, ...c.ekKaynaklar]) if (b) await oku(b);
}, 180_000);

describe.each(CERCEVELER.map((c) => [`${c.kod}@${c.surum}`, c] as const))("%s resmî metni", (_, c) => {
  const ana = c.kaynak?.dosya ?? "";
  const hepsi = tumOlcutler(c.olcutler);

  it("her resmî başlık, metin, düzey ve örnek kanıt belgenin kaynak sayfasında birebir geçer", () => {
    const eksik: string[] = [];
    let sayac = 0;
    for (const o of hepsi) {
      const dosya = o.kaynakDosya ?? ana;
      const parcalar: [string, string][] = [];
      if (o.baslikDurumu === "resmi") parcalar.push(["başlık", o.baslik]);
      if (o.metinDurumu === "resmi") parcalar.push(["metin", o.metin]);
      for (const d of o.olgunlukTanimlari ?? []) parcalar.push([`düzey ${d.duzey}`, d.metin]);
      for (const k of o.ornekKanitlar ?? []) parcalar.push(["örnek kanıt", k]);
      for (const [ad, metin] of parcalar) {
        sayac++;
        if (!sayfadaGecer(dosya, o.kaynakSayfa ?? 0, metin)) eksik.push(`${o.kod} ${ad}`);
      }
    }
    for (const b of c.raporSablonu)
      if (b.baslikDurumu === "resmi") {
        sayac++;
        if (!sayfadaGecer(ana, b.kaynakSayfa ?? 0, b.baslik)) eksik.push(`rapor ${b.kod}`);
      }
    expect(eksik).toEqual([]);
    // 18 ölçüt/başlık × 2 + 46 alt ölçüt × (başlık + metin) en az; düzey ve kanıtlarla 300'ü aşar.
    expect(sayac).toBeGreaterThan(300);
  });

  it("YÖKAK yapısı: 4 başlık, 14 ölçüt, 46 alt ölçüt (KİDR kılavuzu 4. sayfa)", () => {
    expect(c.olcutler.map((o) => o.kod)).toEqual(["A", "B", "C", "D"]);
    expect(hepsi.filter((o) => o.kod.split(".").length === 2)).toHaveLength(14);
    expect(hepsi.filter((o) => o.kod.split(".").length === 3)).toHaveLength(46);
    expect(sayfadaGecer(YOKAK_KIDR_3_2_1.kaynak?.dosya ?? "", 4, "toplam 14 ölçüt ve 46 alt ölçüt")).toBe(true);
  });

  it("bütün başlık ve metinler resmî; ayrıştırılamayan düzeyler yok sayılmaz, uyarıda", () => {
    expect(hepsi.every((o) => o.baslikDurumu === "resmi" && o.metinDurumu === "resmi")).toBe(true);
    const duzeysiz = hepsi.filter((o) => o.kod.split(".").length === 3 && !o.olgunlukTanimlari).map((o) => o.kod);
    // Kılavuz 3.3'te bu iki alt ölçütün düzey sütunları ayrıştırılamadı (kırık sözcük / eksik nokta).
    expect(duzeysiz).toEqual(["A.4.1", "B.2.2"]);
    for (const k of duzeysiz) expect(YOKAK_ANAHTAR_3_3_UYARILAR.some((u) => u.startsWith(k))).toBe(true);
    expect(c.olgunlukDuzeyleri.every((d) => d.ad === "DOĞRULANMADI")).toBe(true);
    expect(c.dogrulandi).toBe(false);
  });
});
