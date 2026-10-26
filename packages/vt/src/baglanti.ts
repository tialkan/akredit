// Bağlantı yardımcıları: üretimde `postgres` sürücüsü, test ve geliştirmede PGlite (pgvector ile).
// Kiracı işlemleri `kiraciIslemi` ile açılır: etkin kurum ve uygulama rolü yalnız o işlem için ayarlanır.

import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as sema from "./sema/index.ts";

export type Sema = typeof sema;
/** Sürücüden bağımsız Drizzle veritabanı. */
export type Vt = PgDatabase<PgQueryResultHKT, Sema>;
/** `Vt.transaction` içinde verilen işlem nesnesi. */
export type Islem = Parameters<Parameters<Vt["transaction"]>[0]>[0];

/** Bellek içi (ya da `veriDizini` verilirse dosyada) PGlite veritabanı. */
export async function pgliteBaglantisi(veriDizini?: string) {
  const istemci = await PGlite.create(veriDizini, { extensions: { vector } });
  const db = drizzlePglite(istemci, { schema: sema });
  return { istemci, db: db as unknown as Vt, kapat: () => istemci.close() };
}

/** Üretim bağlantısı. Bağlantı kullanıcısı göçlerde `akredit_sahip`, uygulamada `akredit_uygulama` üyesi olmalı. */
export function postgresBaglantisi(adres: string, secenekler: postgres.Options<Record<string, never>> = {}) {
  const istemci = postgres(adres, secenekler);
  const db = drizzlePostgres(istemci, { schema: sema });
  return { istemci, db: db as unknown as Vt, kapat: () => istemci.end() };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Kiracı işlemi: işlemi açar, `app.kurum_id` ve `akredit_uygulama` rolünü yalnız bu işlem için ayarlar.
 * Satır güvenliği bu rolde atlanamaz; işlem içindeki her sorgu yalnız verilen kurumun satırlarını görür.
 */
export async function kiraciIslemi<T>(db: Vt, kurumId: string, is: (tx: Islem) => Promise<T>): Promise<T> {
  if (!UUID.test(kurumId)) throw new TypeError("Kurum kimliği geçerli bir UUID değil.");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    await tx.execute(sql.raw("set local role akredit_uygulama"));
    return is(tx);
  });
}
