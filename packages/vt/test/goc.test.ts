import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pgliteBaglantisi, type Vt } from "../src/baglanti.ts";
import { gocleriOku, gocleriUygula, ifadelereBol } from "../src/goc.ts";
import { ORNEK_KURUM_ID, tohumla } from "../src/tohum.ts";
import { sorgu } from "./yardimci.ts";

async function parmakIzi(db: Vt) {
  const [r] = await sorgu<{ sutun: number; politika: number; tetikleyici: number; kisit: number; yetki: number }>(
    db,
    sql`select
      (select count(*)::int from information_schema.columns where table_schema = 'public') as sutun,
      (select count(*)::int from pg_policies where schemaname = 'public') as politika,
      (select count(*)::int from pg_trigger where not tgisinternal) as tetikleyici,
      (select count(*)::int from pg_constraint c join pg_namespace n on n.oid = c.connamespace where n.nspname = 'public') as kisit,
      (select count(*)::int from information_schema.role_table_grants where grantee = 'akredit_uygulama') as yetki`,
  );
  return r;
}

describe("göçler", () => {
  let b: Awaited<ReturnType<typeof pgliteBaglantisi>>;
  beforeAll(async () => {
    b = await pgliteBaglantisi();
  });
  afterAll(async () => {
    await b.kapat();
  });

  it("boş veritabanına hatasız uygulanır, ikinci kez uygulamak bir şey değiştirmez", async () => {
    const ilk = await gocleriUygula(b.db);
    expect(ilk).toEqual(gocleriOku().map((g) => g.ad));
    expect(ilk.length).toBeGreaterThanOrEqual(3);
    const once = await parmakIzi(b.db);
    expect(once?.politika).toBeGreaterThan(30);

    const ikinci = await gocleriUygula(b.db);
    expect(ikinci).toEqual([]);
    expect(await parmakIzi(b.db)).toEqual(once);
  });

  it("uygulanmış bir göçün metni değişmişse durur", async () => {
    const goceler = gocleriOku().map((g, i) => (i === 0 ? { ...g, ozet: "0".repeat(64) } : g));
    await expect(gocleriUygula(b.db, goceler)).rejects.toThrow(/değiştirilmiş/u);
  });

  it("vector eklentisi ve üç rol kurulur; hiçbiri satır güvenliğini atlayamaz", async () => {
    const r = await sorgu<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }>(
      b.db,
      sql`select rolname, rolbypassrls, rolsuper from pg_roles where rolname like 'akredit_%' order by rolname`,
    );
    expect(r).toEqual([
      // İP-27: web ve işçinin giriş kullanıcıları bu role üye olur (0008_oturum_rolu).
      { rolname: "akredit_oturum", rolbypassrls: false, rolsuper: false },
      { rolname: "akredit_sahip", rolbypassrls: false, rolsuper: false },
      { rolname: "akredit_uygulama", rolbypassrls: false, rolsuper: false },
    ]);
    const e = await sorgu<{ extname: string }>(b.db, sql`select extname from pg_extension where extname = 'vector'`);
    expect(e).toHaveLength(1);
  });

  it("tohum verisi eklenir ve tekrar çalıştırmak çoğaltmaz", async () => {
    await tohumla(b.db);
    await tohumla(b.db);
    const [r] = await sorgu<{ ders: number; program: number; cikti: number; gunluk: number }>(
      b.db,
      sql`select (select count(*)::int from ders where kurum_id = ${ORNEK_KURUM_ID}) as ders,
                 (select count(*)::int from program where kurum_id = ${ORNEK_KURUM_ID}) as program,
                 (select count(*)::int from cikti where kurum_id = ${ORNEK_KURUM_ID}) as cikti,
                 (select count(*)::int from gunluk where kurum_id = ${ORNEK_KURUM_ID}) as gunluk`,
    );
    // 6 ders; 4 program çıktısı + 6 ders × 2 ders çıktısı = 16 çıktı; 1 günlük kaydı.
    expect(r).toEqual({ ders: 6, program: 1, cikti: 16, gunluk: 1 });
  });
});

describe("ifadelereBol", () => {
  it("drizzle-kit ayraçlarından böler, yalnız yorumdan oluşan parçaları atar", () => {
    expect(ifadelereBol("select 1;\n--> statement-breakpoint\n-- yorum\n--> statement-breakpoint\nselect 2;")).toEqual([
      "select 1;",
      "select 2;",
    ]);
  });
});
