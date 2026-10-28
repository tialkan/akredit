// Kurum hukuk paketi (İP-40): docs/hukuk/kurum-paketi ve ilgili İP-28 taslaklarını tek .zip'te toplar.
// Belirlenimci: aynı belgeler aynı baytları verir (zipPaketle sabit zaman damgası kullanır).
import { readdirSync, readFileSync } from "node:fs";
import { type PaketDosyasi, zipPaketle } from "@akredit/belge";

export const PAKET_YOLU = "indir/akredit-kurum-hukuk-paketi.zip";

/** İP-28 taslaklarından pakete girenler (docs/hukuk/ altında). */
export const EK_BELGELER = [
  "kaynaklar.md",
  "aydinlatma-metinleri.md",
  "saklama-imha-politikasi.md",
  "veri-akis-envanteri.md",
  "veri-akis-envanteri.csv",
];

/** `hukukDizini`: docs/hukuk/ adresi. */
export function hukukPaketiDosyalari(hukukDizini: URL): PaketDosyasi[] {
  const paket = new URL("kurum-paketi/", hukukDizini);
  const adlar = readdirSync(paket)
    .filter((a) => a.endsWith(".md"))
    .sort();
  return [
    ...adlar.map((ad) => ({ ad, veri: readFileSync(new URL(ad, paket)) })),
    ...EK_BELGELER.map((ad) => ({ ad, veri: readFileSync(new URL(ad, hukukDizini)) })),
  ];
}

export function hukukPaketi(hukukDizini: URL): Uint8Array {
  return zipPaketle(hukukPaketiDosyalari(hukukDizini));
}
