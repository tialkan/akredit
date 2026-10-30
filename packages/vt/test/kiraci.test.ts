// Kiracı yalıtımı: tablo listesi şemadan okunur (kurum_id taşıyan her tablo), elle liste tutulmaz.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import {
  gocluVt,
  hataKodu,
  KURUM_A,
  KURUM_B,
  kiraciTablolari,
  kurumVerisiEkle,
  reddedilir,
  sorgu,
} from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;
let tablolar: string[];

beforeAll(async () => {
  b = await gocluVt();
  await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
  tablolar = await kiraciTablolari(b.db);
});
afterAll(async () => {
  await b.kapat();
});

describe("kiracı yalıtımı", () => {
  it("şemada en az 35 kiracı tablosu var ve her birinde satır güvenliği açık ve zorunlu", async () => {
    expect(tablolar.length).toBeGreaterThanOrEqual(35);
    const r = await sorgu<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean; politika: number }>(
      b.db,
      sql`select c.relname, c.relrowsecurity, c.relforcerowsecurity,
                 (select count(*)::int from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as politika
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = any(${sql.raw(`array[${tablolar.map((t) => `'${t}'`).join(",")}]`)})`,
    );
    expect(r).toHaveLength(tablolar.length);
    for (const t of r)
      expect(t, t.relname).toMatchObject({ relrowsecurity: true, relforcerowsecurity: true, politika: 1 });
  });

  it("örnek veri her kiracı tablosunu iki kurum için de dolduruyor (testlerin boş geçmemesi için)", async () => {
    for (const t of tablolar) {
      const r = await sorgu<{ a: number; b: number }>(
        b.db,
        sql.raw(`select count(*) filter (where kurum_id = '${KURUM_A}')::int as a,
                        count(*) filter (where kurum_id = '${KURUM_B}')::int as b from ${t}`),
      );
      expect(r[0]?.a, t).toBeGreaterThan(0);
      expect(r[0]?.b, t).toBeGreaterThan(0);
    }
  });

  it("A bağlamında yalnız A satırları görünür, B'nin satırları görünmez", async () => {
    for (const t of [...tablolar, "kurum"]) {
      const sutun = t === "kurum" ? "id" : "kurum_id";
      const r = await kiraciIslemi(b.db, KURUM_A, (tx) =>
        sorgu<{ kurum: string; adet: number }>(
          tx,
          sql.raw(`select ${sutun}::text as kurum, count(*)::int as adet from ${t} group by 1`),
        ),
      );
      expect(
        r.map((x) => x.kurum),
        t,
      ).toEqual([KURUM_A]);
      // B'ye kimliğiyle doğrudan erişim de boş döner.
      const bdeki = await kiraciIslemi(b.db, KURUM_A, (tx) =>
        sorgu<{ adet: number }>(tx, sql.raw(`select count(*)::int as adet from ${t} where ${sutun} = '${KURUM_B}'`)),
      );
      expect(bdeki[0]?.adet, t).toBe(0);
    }
  });

  it("app.kurum_id ayarlanmadan hiçbir satır görünmez", async () => {
    for (const t of [...tablolar, "kurum"]) {
      const r = await b.db.transaction(async (tx) => {
        await tx.execute(sql.raw("set local role akredit_uygulama"));
        return sorgu<{ adet: number }>(tx, sql.raw(`select count(*)::int as adet from ${t}`));
      });
      expect(r[0]?.adet, t).toBe(0);
    }
  });

  it("A bağlamında B'ye ait kurum_id ile ekleme reddedilir", async () => {
    for (const t of tablolar) {
      // Sahip rolüyle B'nin bir satırını oku, aynı satırı (yeni kimlikle) A bağlamında eklemeyi dene.
      const [satir] = await sorgu<{ j: Record<string, unknown> }>(
        b.db,
        sql.raw(`select to_jsonb(x) as j from ${t} x where kurum_id = '${KURUM_B}' limit 1`),
      );
      const j = { ...satir?.j, id: "01900000-0000-7000-8000-0000000000ff" };
      const hata = await reddedilir(() =>
        kiraciIslemi(b.db, KURUM_A, (tx) =>
          tx.execute(
            sql`insert into ${sql.identifier(t)} select * from jsonb_populate_record(null::${sql.identifier(t)}, ${JSON.stringify(j)}::jsonb)`,
          ),
        ),
      );
      // 42501: satır güvenliği ihlali. Karar ve günlük tetikleyicileri satır güvenliğinden önce çalışır ve
      // B'nin önerisini/kanonik metnini göremedikleri için 23514 ile reddeder.
      // Sınav hücre kararı tetikleyicisi (İP-43) de B'nin hücresini göremez.
      const beklenen = t === "karar" || t === "gunluk" || t === "sinav_hucre_karari" ? ["42501", "23514"] : ["42501"];
      expect(beklenen, `${t}: ${String(hataKodu(hata))}`).toContain(hataKodu(hata));
    }
  });

  it("uygulama rolü kurum ve çerçeve tablolarına ekleme yapamaz", async () => {
    const h1 = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql`insert into kurum (id, ad) values (${KURUM_A}, 'x')`)),
    );
    expect(hataKodu(h1)).toBe("42501");
    const h2 = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql`insert into cerceve (kod, ad, surum) values ('x', 'x', '1')`)),
    );
    expect(hataKodu(h2)).toBe("42501");
  });

  it("kiraciIslemi geçersiz kurum kimliğini reddeder", async () => {
    await expect(kiraciIslemi(b.db, "x'; drop table kurum; --", async () => 1)).rejects.toThrow(/UUID/u);
  });
});
