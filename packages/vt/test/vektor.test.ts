import { cosineDistance, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import * as s from "../src/sema/index.ts";
import { gocluVt, KURUM_A, KURUM_B, kurumVerisiEkle, type OrnekKimlikler, sorgu, vektor } from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;
let a: OrnekKimlikler;

beforeAll(async () => {
  b = await gocluVt();
  a = await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

describe("vektör benzerliği", () => {
  it("gömme sütunu vector(1024)", async () => {
    const [r] = await sorgu<{ tur: string }>(
      b.db,
      sql`select format_type(atttypid, atttypmod) as tur from pg_attribute
          where attrelid = 'kanit_parcasi'::regclass and attname = 'gomme'`,
    );
    expect(r?.tur).toBe("vector(1024)");
  });

  it("<=> ile en yakın parçalar sıralanır, yalnız etkin kurumun parçaları döner", async () => {
    await kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx.insert(s.kanitParcasi).values([
        { kurumId: KURUM_A, kanitId: a.kanit, sira: 2, capa: { sayfa: 2 }, metin: "iki", gomme: vektor(0, 1, 0) },
        { kurumId: KURUM_A, kanitId: a.kanit, sira: 3, capa: { sayfa: 3 }, metin: "üç", gomme: vektor(1, 1, 0) },
      ]),
    );
    const sorguVektoru = vektor(0.9, 0.1, 0);
    const r = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      sorgu<{ metin: string; uzaklik: number }>(
        tx,
        sql`select metin, (gomme <=> ${JSON.stringify(sorguVektoru)}::vector)::float8 as uzaklik
            from kanit_parcasi order by gomme <=> ${JSON.stringify(sorguVektoru)}::vector`,
      ),
    );
    // Kosinüs uzaklığı: (1,0,0) ile (0.9,0.1) arasındaki açı en küçük, sonra (1,1), en son (0,1).
    expect(r.map((x) => x.metin)).toEqual(["Örnek metin", "üç", "iki"]);
    // 1 - 0.9/sqrt(0.82) = 0.006116...
    expect(r[0]?.uzaklik).toBeCloseTo(1 - 0.9 / Math.sqrt(0.82), 5);

    // Drizzle yardımcısıyla da aynı sıra.
    const d = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx
        .select({ metin: s.kanitParcasi.metin })
        .from(s.kanitParcasi)
        .orderBy(cosineDistance(s.kanitParcasi.gomme, sorguVektoru))
        .limit(1),
    );
    expect(d[0]?.metin).toBe("Örnek metin");
  });
});
