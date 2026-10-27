// YÖKAK resmî belgelerinden `src/veri-yokak.ts` üretir. Çalıştırma (paket kökünde):
//   node scripts/yokak-uret.ts
// Metin yalnız kaynaklar/resmi/yokak altındaki PDF'lerden çıkarılır (@akredit/belge).

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { metinCikar } from "@akredit/belge";
import type { BelgeSayfasi } from "../src/ice-aktarma.ts";
import { anahtariCozumle, olcutleriCozumle } from "../src/yokak-anahtar.ts";

const KOK = new URL("../../../kaynaklar/resmi/yokak/", import.meta.url);
export const OLCUTLER_DOSYA = "yokak-degerlendirme-olcutleri-3.1-2026-10-27.pdf";
export const KILAVUZ_DOSYA = "yokak-degerlendirme-programlari-kilavuzu-3.3-2026-10-27.pdf";

async function sayfalar(dosya: string): Promise<{ sha256: string; sayfalar: BelgeSayfasi[] }> {
  const veri = new Uint8Array(readFileSync(new URL(dosya, KOK)));
  const sha256 = createHash("sha256").update(veri).digest("hex");
  const m = await metinCikar(veri, undefined, { enBuyukBoyut: 50 * 1024 * 1024 });
  return { sha256, sayfalar: m.bolumler.map((b) => ({ sayfa: b.capa.sayfa ?? 0, metin: b.metin })) };
}

const olc = await sayfalar(OLCUTLER_DOSYA);
const kil = await sayfalar(KILAVUZ_DOSYA);
const ust = olcutleriCozumle(olc.sayfalar);
const { altOlcutler, uyarilar } = anahtariCozumle(kil.sayfalar);
for (const u of uyarilar) console.warn(u);

const govde = `// ÜRETİLDİ: scripts/yokak-uret.ts. Elle değiştirmeyin.
// Metinler aşağıdaki resmî belgelerden çıkarılmıştır (CLAUDE.md ilke 6).
// ${OLCUTLER_DOSYA} sha256 ${olc.sha256}
// ${KILAVUZ_DOSYA} sha256 ${kil.sha256}

import type { AltOlcutHam, UstOlcutHam } from "./yokak-anahtar.ts";

export const YOKAK_OLCUTLER_3_1_HAM: readonly UstOlcutHam[] = ${JSON.stringify(ust, null, 2)};

export const YOKAK_ANAHTAR_3_3_HAM: readonly AltOlcutHam[] = ${JSON.stringify(altOlcutler, null, 2)};

/** Ayrıştırıcının bu belgede verdiği uyarılar (ilgili alanlar DOĞRULANMADI işaretlenir). */
export const YOKAK_ANAHTAR_3_3_UYARILAR: readonly string[] = ${JSON.stringify(uyarilar)};
`;
writeFileSync(new URL("../src/veri-yokak.ts", import.meta.url), govde);
