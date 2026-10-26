// Göç çalıştırıcı. `src/gocler/meta/_journal.json` sırasıyla SQL dosyalarını uygular; uygulananları
// `akredit_goc` tablosunda adı ve özetiyle tutar. Tekrar çalıştırmak bir şey değiştirmez; uygulanmış bir
// göçün dosyası sonradan değişmişse durur (göçler de yalnız eklenir).

import { readFileSync } from "node:fs";
import { ozetHesapla } from "@akredit/cekirdek";
import { sql } from "drizzle-orm";
import type { Vt } from "./baglanti.ts";
import { type SorguSonucu, satirlar } from "./gunluk.ts";

const GOC_DIZINI = new URL("./gocler/", import.meta.url);

interface Gunce {
  entries: { idx: number; tag: string }[];
}

export interface Goc {
  ad: string;
  metin: string;
  ozet: string;
}

/** Depodaki göçleri sırasıyla okur. */
export function gocleriOku(): Goc[] {
  const gunce = JSON.parse(readFileSync(new URL("meta/_journal.json", GOC_DIZINI), "utf8")) as Gunce;
  return [...gunce.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((e) => {
      const metin = readFileSync(new URL(`${e.tag}.sql`, GOC_DIZINI), "utf8");
      return { ad: e.tag, metin, ozet: ozetHesapla(metin) };
    });
}

/** Göç metnini drizzle-kit ayraçlarından ifadelere böler. */
export function ifadelereBol(metin: string): string[] {
  return metin
    .split("--> statement-breakpoint")
    .map((x) => x.trim())
    .filter((x) => x.replace(/--.*$/gmu, "").trim().length > 0);
}

/** Uygulanmamış göçleri uygular, uygulananların adlarını döndürür. Sahip rolüyle çalıştırılır. */
export async function gocleriUygula(db: Vt, goceler: Goc[] = gocleriOku()): Promise<string[]> {
  await db.execute(
    sql.raw(
      "create table if not exists akredit_goc (ad text primary key, ozet text not null, uygulanma timestamptz not null default now())",
    ),
  );
  const uygulanan: string[] = [];
  for (const goc of goceler) {
    const sonuc = await db.transaction(async (tx) => {
      // Aynı anda çalışan iki göç süreci birbirini beklesin.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('akredit.goc', 0))`);
      const sonuc = (await tx.execute(
        sql`select ozet from akredit_goc where ad = ${goc.ad}`,
      )) as unknown as SorguSonucu<{
        ozet: string;
      }>;
      const onceki = satirlar(sonuc)[0];
      if (onceki) {
        if (onceki.ozet !== goc.ozet) {
          throw new Error(`Uygulanmış göç değiştirilmiş: ${goc.ad}. Değişiklik için yeni bir göç yazın.`);
        }
        return false;
      }
      for (const ifade of ifadelereBol(goc.metin)) await tx.execute(sql.raw(ifade));
      await tx.execute(sql`insert into akredit_goc (ad, ozet) values (${goc.ad}, ${goc.ozet})`);
      return true;
    });
    if (sonuc) uygulanan.push(goc.ad);
  }
  return uygulanan;
}
