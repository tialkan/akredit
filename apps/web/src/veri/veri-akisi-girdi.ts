// Envanterin kod tabanından okunan girdisi (sunucu tarafı): sağlayıcı kataloğu, bağlayıcılar ve şema tabloları.
import { sema } from "@akredit/vt";
import { SAGLAYICI_KATALOGU } from "@akredit/yz";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { BAGLAYICILAR, EK_TABLOLAR, type EnvanterSatiri, veriAkisEnvanteri } from "./veri-akisi.ts";

/** Şemadaki bütün tablo adları ve göçle eklenenler. */
export function semaTablolari(): string[] {
  const adlar = Object.values(sema)
    .filter((t) => is(t, PgTable))
    .map((t) => getTableName(t as PgTable));
  return [...new Set([...adlar, ...EK_TABLOLAR])].sort();
}

export function guncelEnvanter(): EnvanterSatiri[] {
  return veriAkisEnvanteri({
    saglayicilar: SAGLAYICI_KATALOGU,
    baglayicilar: Object.keys(BAGLAYICILAR),
    tablolar: semaTablolari(),
  });
}
