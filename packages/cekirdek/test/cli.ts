// Eşdeğerlik testleri için apps/cli modüllerini yükler (yalnız okuma). Tipler bu dosyada elle verilir.
import { readFileSync } from "node:fs";
import type { BolognaTaslagi, BolognaVerisi } from "../src/index.ts";

export interface CliBulgu {
  duzey: string;
  ders: string;
  kural: string;
  aciklama: string;
}

interface CliBologna {
  denetle: (veri: unknown, secenek?: { aktsSaat?: [number, number]; guncellikAy?: number }) => CliBulgu[];
  dersSayfasiCoz: (html: string) => Record<string, unknown>;
}

interface CliTaslak {
  taslakDenetle: (
    t: unknown,
    secenek?: { bolen?: number },
  ) => { hatalar: string[]; uyarilar: string[]; isToplam: number; hedef: number };
}

const yol = (ad: string) => new URL(`../../../apps/cli/${ad}`, import.meta.url);

export const cliBologna = (await import(yol("lib/bologna.mjs").href)) as CliBologna;
export const cliTaslak = (await import(yol("lib/bologna-taslak.mjs").href)) as CliTaslak;

export const ornekTaslak = (): BolognaTaslagi =>
  JSON.parse(readFileSync(yol("bilgi/bologna-taslak-ornek.json"), "utf8")) as BolognaTaslagi;

export type { BolognaVerisi };
