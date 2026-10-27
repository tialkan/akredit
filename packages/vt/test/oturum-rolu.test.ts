// Oturum rolü (İP-27, inceleme dalga 3 #1): web ve işçinin giriş kullanıcısı bu role üye olur.
// Süper kullanıcı bağlantısının verdiği yetkilerin hiçbiri bu rolde yoktur.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Islem } from "../src/baglanti.ts";
import { gocluVt, hataKodu, KURUM_A, KURUM_B, kurumVerisiEkle, reddedilir, sorgu } from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;

beforeAll(async () => {
  b = await gocluVt();
  await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

/** Giriş kullanıcısı `akredit_oturum` üyesiymiş gibi çalışır; işlem sonunda geri alınır. */
async function oturumla<T>(is: (tx: Islem) => Promise<T>): Promise<T> {
  return b.db.transaction(async (tx) => {
    await tx.execute(sql.raw("set local role akredit_oturum"));
    return is(tx);
  });
}

describe("akredit_oturum rolü", () => {
  it("süper kullanıcı değil, satır güvenliğini atlayamaz, giriş yapamaz (giriş kullanıcısı ayrı)", async () => {
    const [r] = await sorgu<{ rolsuper: boolean; rolbypassrls: boolean; rolcanlogin: boolean; rolcreaterole: boolean }>(
      b.db,
      sql`select rolsuper, rolbypassrls, rolcanlogin, rolcreaterole from pg_roles where rolname = 'akredit_oturum'`,
    );
    expect(r).toEqual({ rolsuper: false, rolbypassrls: false, rolcanlogin: false, rolcreaterole: false });
  });

  it("işlem dışında (kurum ayarlanmadan) hiçbir kurumun satırını görmez", async () => {
    const n = await oturumla(async (tx) => sorgu<{ n: number }>(tx, sql`select count(*)::int as n from kurum`));
    expect(n[0]?.n).toBe(0);
  });

  it("kiracı işlemine geçebilir ve yalnız kendi kurumunu görür", async () => {
    const r = await oturumla(async (tx) => {
      await tx.execute(sql`select set_config('app.kurum_id', ${KURUM_A}, true)`);
      await tx.execute(sql.raw("set local role akredit_uygulama"));
      return sorgu<{ id: string }>(tx, sql`select id from kurum`);
    });
    expect(r.map((x) => x.id)).toEqual([KURUM_A]);
  });

  it("yalnız-ekleme tetikleyicilerini kapatamaz, günlüğü silemez", async () => {
    const e1 = await reddedilir(() => oturumla((tx) => tx.execute(sql.raw("alter table gunluk disable trigger all"))));
    expect(hataKodu(e1)).toBe("42501");
    const e2 = await reddedilir(() => oturumla((tx) => tx.execute(sql.raw("delete from gunluk"))));
    expect(hataKodu(e2)).toBe("42501");
  });

  it("kimlik katmanı tablolarını okuyabilir (Better Auth, API anahtarı arama)", async () => {
    const r = await oturumla((tx) =>
      sorgu<{ n: number }>(
        tx,
        sql`select (select count(*) from kimlik_kullanici) + (select count(*) from kimlik_api_anahtari)
                   + (select count(*) from istek_tekrari) as n`,
      ),
    );
    expect(Number(r[0]?.n)).toBeGreaterThanOrEqual(0);
  });

  it("uygulama rolü kimlik tablolarına hâlâ erişemez", async () => {
    const e = await reddedilir(() =>
      oturumla(async (tx) => {
        await tx.execute(sql`select set_config('app.kurum_id', ${KURUM_A}, true)`);
        await tx.execute(sql.raw("set local role akredit_uygulama"));
        return tx.execute(sql.raw("select * from kimlik_api_anahtari"));
      }),
    );
    expect(hataKodu(e)).toBe("42501");
  });
});
