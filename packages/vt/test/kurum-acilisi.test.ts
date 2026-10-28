// İP-35: kurum yalnız doğrulanmış açılış talebiyle, `kurum_olustur` işleviyle açılır.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi } from "../src/index.ts";

let b: Awaited<ReturnType<typeof pgliteBaglantisi>>;
beforeAll(async () => {
  b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
});
afterAll(async () => {
  await b.kapat();
});

const ozet = (n: number) => n.toString(16).padStart(64, "0");

async function talep(alan: string, n: number, dogrulanmis: boolean, kurumId: string | null) {
  await b.db.execute(sql`insert into kurum_acilis_talebi
      (kurum_adi, alan_adi, yonetici_adi, eposta, belirtec_ozeti, son_gecerlilik, dogrulama, acilan_kurum_id)
      values ('Uydurma Üniversitesi', ${alan}, 'Deneme Yönetici', ${`yonetici@${alan}`}, ${ozet(n)},
              now() + interval '30 minutes', ${dogrulanmis ? sql`now()` : null}, ${kurumId})`);
}

describe("kurum_olustur", () => {
  it("doğrulanmış talep olmadan kurum açılmaz", async () => {
    const id = randomUUID();
    await expect(b.db.execute(sql`select kurum_olustur(${id}::uuid, 'Uydurma', 'uydurma.edu.tr')`)).rejects.toThrow();
    await talep("bekleyen.edu.tr", 1, false, null);
    await expect(b.db.execute(sql`select kurum_olustur(${id}::uuid, 'Uydurma', 'bekleyen.edu.tr')`)).rejects.toThrow();
  });

  it("doğrulanmış talep kurumu açar; aynı alan adına ikinci kurum açılamaz", async () => {
    const id = randomUUID();
    await b.db.transaction(async (tx) => {
      await tx.execute(sql`insert into kurum_acilis_talebi
        (kurum_adi, alan_adi, yonetici_adi, eposta, belirtec_ozeti, son_gecerlilik, dogrulama, acilan_kurum_id)
        values ('Uydurma', 'acik.edu.tr', 'Y', 'y@acik.edu.tr', ${ozet(2)}, now() + interval '1 hour', now(), ${id})`);
      await tx.execute(sql`select kurum_olustur(${id}::uuid, 'Uydurma Üniversitesi', 'acik.edu.tr')`);
    });
    const ad = await kiraciIslemi(b.db, id, (tx) => tx.execute(sql`select ad from kurum`));
    expect(JSON.stringify(ad)).toContain("Uydurma Üniversitesi");
    const id2 = randomUUID();
    await expect(
      b.db.transaction(async (tx) => {
        await tx.execute(sql`insert into kurum_acilis_talebi
          (kurum_adi, alan_adi, yonetici_adi, eposta, belirtec_ozeti, son_gecerlilik, dogrulama, acilan_kurum_id)
          values ('İkinci', 'acik.edu.tr', 'Y', 'z@acik.edu.tr', ${ozet(3)}, now() + interval '1 hour', now(), ${id2})`);
        await tx.execute(sql`select kurum_olustur(${id2}::uuid, 'İkinci', 'acik.edu.tr')`);
      }),
    ).rejects.toThrow();
  });

  it("uygulama rolü işlevi çağıramaz ve talep tablosunu okuyamaz", async () => {
    const id = randomUUID();
    await expect(
      kiraciIslemi(b.db, id, (tx) => tx.execute(sql`select kurum_olustur(${id}::uuid, 'X', 'x.edu.tr')`)),
    ).rejects.toThrow();
    await expect(
      kiraciIslemi(b.db, id, (tx) => tx.execute(sql`select count(*) from kurum_acilis_talebi`)),
    ).rejects.toThrow();
  });
});
